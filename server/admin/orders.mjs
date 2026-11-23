import {notification} from './messages.mjs';
import {fail} from '../checkout/core.mjs';
export function transition(order,op,action,input){
 if(order.status!=='paid')fail('Only verified paid orders can be fulfilled.',409);
 const state=op.fulfillment_status||'new';
 if(['cancelled','collected','shipped'].includes(state))fail('Order already completed or cancelled.',409);
 if(action==='ready'){
  if(order.quote.fulfillment!=='pickup'||state!=='new')fail('Pickup is not awaiting preparation.',409);
  return {fulfillment_status:'ready',ready_at:new Date(),event:'ready_for_pickup'};
 }
 if(action==='collected'){
  if(order.quote.fulfillment!=='pickup'||state!=='ready')fail('Mark the pickup ready first.',409);
  return {fulfillment_status:'collected',collected_at:new Date()};
 }
 if(action==='tracking'){
  if(order.quote.fulfillment!=='shipping'||!['UPS','FedEx'].includes(input.carrier)||! /^[A-Za-z0-9 -]{5,60}$/.test(input.tracking||''))fail('Choose UPS/FedEx and enter valid tracking.');
  return {carrier:input.carrier,tracking:input.tracking.trim()};
 }
 if(action==='shipped'){
  if(order.quote.fulfillment!=='shipping'||!op.tracking||!op.carrier)fail('Save carrier and tracking before confirming handoff.',409);
  return {fulfillment_status:'shipped',shipped_at:new Date(),event:'shipped'};
 }
 fail('Unsupported order action.');
}
export function reversalMatches(order,t,id){
 if(!t||String(t.transId)!==String(id))return false;
 const original=String(order.transactionId);
 if(String(id)===original)return t.transactionStatus==='voided';
 const amount=Number(t.settleAmount??t.authAmount);
 return t.transactionType==='refundTransaction'&&['refundPendingSettlement','refundSettledSuccessfully'].includes(t.transactionStatus)&&String(t.refTransId)===original&&Number.isFinite(amount)&&Math.round(amount*100)===order.quote.totalCents;
}
export function reminder(order,op,now=Date.now()){
 if(order.status!=='paid'||order.quote.fulfillment!=='pickup'||!['new','ready'].includes(op.fulfillment_status||'new'))return null;
 const since=order.paidAt;if(!Number.isFinite(since))return null;
 const days=(now-since)/86400000;
 return days>=14?{kind:'pickup_overdue',audience:'internal'}:days>=12?{kind:'pickup_reminder',audience:'customer'}:null;
}
export async function transaction(db,work){const c=await db.pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL statement_timeout='10s'");const result=await work(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
export async function queue(c,scope,key,kind,audience,order,operations={}){
 await c.query('INSERT INTO checkout_admin_events(scope,order_key,kind,audience,payload) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT DO NOTHING',[scope,key,kind,audience,JSON.stringify({orderId:order.id,recipient:audience==='internal'?'contact@crossbellvending.com':order.customer.email,sender:'contact@crossbellvending.com',...notification(kind,order,operations)})]);
}
export async function listOrders(db,scope){
 const {rows}=await db.pool.query('SELECT o.order_key,o.data,p.* FROM checkout_orders o LEFT JOIN checkout_operations p ON p.scope=o.scope AND p.order_key=o.order_key WHERE o.scope=$1 ORDER BY o.updated_at DESC LIMIT 200',[scope]);
 return rows.map(r=>({id:r.data.id,version:String(r.version||0),paymentStatus:r.data.status,customer:r.data.customer,quote:r.data.quote,createdAt:r.data.createdAt,paidAt:r.data.paidAt,transactionId:r.data.transactionId||null,fulfillmentStatus:r.fulfillment_status||'new',carrier:r.carrier,tracking:r.tracking,reversalId:r.reversal_id}));
}
export async function updateOrder(db,scope,actor,input,callGateway){
 if(!/^[a-f\d]{20}$/.test(input.id||''))fail('Invalid order.');
 return transaction(db,async c=>{
 const key=`orders/${input.id}`;
 const result=await c.query('SELECT data FROM checkout_orders WHERE scope=$1 AND order_key=$2 FOR UPDATE',[scope,key]);if(!result.rowCount)fail('Order not found.',404);const order=result.rows[0].data;
 await c.query('INSERT INTO checkout_operations(scope,order_key) VALUES($1,$2) ON CONFLICT DO NOTHING',[scope,key]);
 const {rows:[op]}=await c.query('SELECT * FROM checkout_operations WHERE scope=$1 AND order_key=$2 FOR UPDATE',[scope,key]);
 if(String(input.version)!==String(op.version)&&!(String(input.version)==='0'&&String(op.version)==='1'))fail('Order changed. Refresh and try again.',409);
 let change;
 if(input.action==='reconcile_reversal'){
  if(op.reversal_id)fail('Reversal already recorded.',409);
  if(order.status!=='paid'||!/^\d{1,30}$/.test(input.transactionId||''))fail('A paid order and reversal transaction ID are required.');
  const {transaction:t}=await callGateway('getTransactionDetailsRequest',{transId:input.transactionId});
  if(!reversalMatches(order,t,input.transactionId))fail('Provider has not confirmed a full linked refund or void.',409);
  change={reversal_id:input.transactionId};
  if(!['shipped','collected'].includes(op.fulfillment_status)){
   change.fulfillment_status='cancelled';change.cancelled_at=new Date();
   for(const item of order.quote.items)await c.query('UPDATE checkout_stock SET remaining=remaining+$3 WHERE scope=$1 AND sku=$2',[scope,item.sku,item.quantity]);
   await queue(c,scope,key,'cancelled','customer',order);
  }
  await queue(c,scope,key,'refunded','customer',order);
 }else change=transition(order,op,input.action,input);
 const {event,...fields}=change;const names=Object.keys(fields);
 await c.query(`UPDATE checkout_operations SET ${names.map((n,i)=>`${n}=$${i+3}`).join(',')},version=version+1 WHERE scope=$1 AND order_key=$2`,[scope,key,...Object.values(fields)]);
 if(event)await queue(c,scope,key,event,'customer',order,{...op,...fields});
 await c.query('INSERT INTO checkout_admin_audit(scope,actor,action,subject,detail) VALUES($1,$2,$3,$4,$5::jsonb)',[scope,actor,input.action,key,JSON.stringify(fields)]);
 });
}
export async function stockAdjustment(db,scope,actor,input){
 if(!/^[a-z0-9-]{1,80}$/.test(input.sku||'')||!Number.isSafeInteger(input.delta)||input.delta===0||Math.abs(input.delta)>10000||typeof input.reason!=='string'||input.reason.trim().length<3||input.reason.length>300)fail('Enter SKU, a whole-unit adjustment, and a reason.');
 return transaction(db,async c=>{
 const r=await c.query('UPDATE checkout_stock SET remaining=remaining+$3 WHERE scope=$1 AND sku=$2 AND remaining=$4 AND remaining+$3>=0 RETURNING remaining',[scope,input.sku,input.delta,input.expected]);
 if(!r.rowCount)fail('Stock changed or insufficient available stock. Refresh first.',409);
 await c.query('INSERT INTO checkout_admin_audit(scope,actor,action,subject,detail) VALUES($1,$2,$3,$4,$5::jsonb)',[scope,actor,'stock_adjustment',input.sku,JSON.stringify({delta:input.delta,reason:input.reason})]);return r.rows[0];
 });
}
export async function reminders(db,scope){
 const {rows}=await db.pool.query("SELECT o.order_key,o.data,p.fulfillment_status FROM checkout_orders o LEFT JOIN checkout_operations p ON p.scope=o.scope AND p.order_key=o.order_key WHERE o.scope=$1 AND o.data->>'status'='paid'",[scope]);let count=0;
 for(const r of rows){const due=reminder(r.data,r);if(due){await queue(db.pool,scope,r.order_key,due.kind,due.audience,r.data);count++;}}return count;
}
