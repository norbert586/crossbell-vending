import {getDatabase} from '@netlify/database';
import context from '../../server/checkout/build-context.mjs';
import catalogue from '../../server/checkout/production-catalogue.json' with {type:'json'};
import {CheckoutError,fail} from '../../server/checkout/core.mjs';
import {databaseStore} from '../../server/checkout/database.mjs';
import {gateway} from '../../server/checkout/gateway.mjs';
import {staff,environment,assertMutation} from '../../server/admin/auth.mjs';
import {listOrders,updateOrder,stockAdjustment,reminders} from '../../server/admin/orders.mjs';
import {headers as exportHeaders,exportRow,csv,syncInventory} from '../../server/admin/export.mjs';
const json=(v,status=200)=>new Response(JSON.stringify(v),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export default async request=>{
 try{
 const env={...process.env,...context};const session=staff(request,env);const {scope}=environment(env);const db=getDatabase();
 if(request.method==='GET'){
  const orders=await listOrders(db,scope);
  if(new URL(request.url).searchParams.get('export')==='csv')return new Response(csv([exportHeaders,...orders.map(exportRow)]),{headers:{'Content-Type':'text/csv','Content-Disposition':'attachment; filename="recent-online-orders.csv"','Cache-Control':'no-store'}});
  const available=await databaseStore(db,catalogue,scope).availability();
  const {rows:events}=await db.pool.query('SELECT kind,audience,status,count(*)::int AS count FROM checkout_admin_events WHERE scope=$1 GROUP BY kind,audience,status',[scope]);
  const {rows:audit}=await db.pool.query('SELECT actor,action,subject,detail,created_at FROM checkout_admin_audit WHERE scope=$1 ORDER BY id DESC LIMIT 50',[scope]);
  return json({email:session.email,csrf:session.csrf,scope,orders,available,products:catalogue.products,events,audit,emailDelivery:'Pending sender connection; queued notifications are not sent.',inventorySync:scope==='production'&&env.INVENTORY_SYNC_ENABLED==='true'});
 }
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 assertMutation(request,env,session);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))fail('JSON required.');const raw=await request.text();if(raw.length>4000)fail('Request too large.',413);let input;try{input=JSON.parse(raw);}catch{fail('Invalid JSON.');}
 if(input.action==='stock')await stockAdjustment(db,scope,session.email,input);
 else if(input.action==='reminders')await reminders(db,scope);
 else if(input.action==='sync')return json(await syncInventory(db,scope,env));
 else await updateOrder(db,scope,session.email,input,(name,payload)=>gateway(name,payload,env));
 return json({ok:true});
 }catch(e){return json({error:e instanceof CheckoutError?e.message:'Order management is temporarily unavailable.'},e instanceof CheckoutError?e.status:503);}
};
export const config={path:'/api/admin/orders'};
