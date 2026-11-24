import {getDatabase} from '@netlify/database';
import buildContext from '../../server/checkout/build-context.mjs';
import {policyFromEnv,verifyTransaction} from '../../server/checkout/core.mjs';
import {databaseStore} from '../../server/checkout/database.mjs';
import {gateway} from '../../server/checkout/gateway.mjs';
import {reverseUnfulfillable} from '../../server/checkout/reversals.mjs';
import {reversalMatches,updateOrder} from '../../server/admin/orders.mjs';

// A single, already-authorized synthetic purchase. No supplied order, amount,
// credentials or recipient is accepted. This endpoint cannot run in production.
const orderId='a46fd1253009c5eb143d',transactionId='120094501472';
const origin='https://deploy-preview-17--inspiring-kitsune-85ad70.netlify.app';
const json=data=>Response.json(data,{headers:{'Cache-Control':'no-store'}});
export default async request=>{
 const env={...process.env,...buildContext};
 if(env.CONTEXT!=='deploy-preview'||env.CHECKOUT_MODE!=='sandbox'||String(env.REVIEW_ID)!=='17'||env.DEPLOY_PRIME_URL!==origin)return new Response(null,{status:404});
 if(!['GET','POST'].includes(request.method))return new Response(null,{status:405});
 if(request.method==='POST'&&request.headers.get('Origin')!==origin)return new Response(null,{status:403});
 try{
  const db=getDatabase(),scope='sandbox-17',key=`orders/${orderId}`;
  const store=databaseStore(db,policyFromEnv(env),scope),call=(name,payload)=>gateway(name,payload,env);
  const order=await store.get(key);
  if(order?.id!==orderId||order.mode!=='sandbox'||order.status!=='paid'||order.transactionId!==transactionId||order.customer?.email!=='payment-test@example.invalid'||order.quote?.totalCents!==1165)return json({status:'blocked',reason:'fixture-mismatch'});
  const {transaction:t}=await call('getTransactionDetailsRequest',{transId:transactionId});
  if(String(t?.transId)!==transactionId||!verifyTransaction(order,t))return json({status:'blocked',reason:'provider-mismatch'});
  let reversal=await store.reversal(transactionId);
  const result={orderId,originalTransactionId:transactionId,originalStatus:t.transactionStatus,refundStatus:reversal?.status||'not-submitted',reversalId:reversal?.reversal_id||null};
  if(request.method==='GET')return json(result);
  if(t.transactionStatus!=='settledSuccessfully')return json({...result,status:'waiting-for-settlement'});
  await db.pool.query("INSERT INTO checkout_payment_reversals(scope,transaction_id,order_key,reason) VALUES($1,$2,$3,'authorized-sandbox-refund-test') ON CONFLICT DO NOTHING",[scope,transactionId,key]);
  await reverseUnfulfillable(order,transactionId,store,call);
  reversal=await store.reversal(transactionId);
  if(reversal?.status!=='confirmed'||!reversal.reversal_id)return json({...result,status:'requires-review'});
  const {transaction:refund}=await call('getTransactionDetailsRequest',{transId:reversal.reversal_id});
  if(!reversalMatches(order,refund,reversal.reversal_id))return json({...result,status:'refund-verification-failed'});
  let {rows}=await db.pool.query('SELECT version,reversal_id FROM checkout_operations WHERE scope=$1 AND order_key=$2',[scope,key]);
  if(!rows[0]?.reversal_id){
   try{await updateOrder(db,scope,'sandbox-refund-validation',{id:orderId,version:String(rows[0]?.version||0),action:'reconcile_reversal',transactionId:reversal.reversal_id},call);}
   catch{const check=await db.pool.query('SELECT reversal_id FROM checkout_operations WHERE scope=$1 AND order_key=$2',[scope,key]);if(check.rows[0]?.reversal_id!==reversal.reversal_id)throw Error('reconciliation');}
  }
  const op=await db.pool.query('SELECT reversal_id,fulfillment_status FROM checkout_operations WHERE scope=$1 AND order_key=$2',[scope,key]);
  if(op.rows[0]?.reversal_id!==reversal.reversal_id||op.rows[0]?.fulfillment_status!=='cancelled')throw Error('order verification');
  return json({...result,status:'passed',refundStatus:refund.transactionStatus,reversalId:reversal.reversal_id,fullLinkedRefundVerified:true,orderCancelled:true,stock:await store.availability()});
 }catch{return json({status:'requires-review',message:'Check provider and durable reversal record before retrying. No blind refund retry is permitted.'});}
};
export const config={path:'/api/refund-validation'};
