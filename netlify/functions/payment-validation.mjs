import {getDatabase} from '@netlify/database';
import buildContext from '../../server/checkout/build-context.mjs';
import {policyFromEnv} from '../../server/checkout/core.mjs';
import {databaseStore} from '../../server/checkout/database.mjs';
import {gateway} from '../../server/checkout/gateway.mjs';
import {createOrder,reconcile} from '../../server/checkout/service.mjs';
import {updateOrder} from '../../server/admin/orders.mjs';
import {randomUUID} from 'node:crypto';

// Fixed official test card, fixed catalogue item, sandbox only, once per deploy.
// No user-supplied amounts, card data, recipients, destinations or credentials.
export default async request=>{
 const env={...process.env,...buildContext};
 if(env.CONTEXT!=='deploy-preview'||env.CHECKOUT_MODE!=='sandbox'||!env.DEPLOY_ID)return new Response(null,{status:404});
 const origin=new URL(env.DEPLOY_PRIME_URL).origin;
 if(request.method!=='POST'||request.headers.get('Origin')!==origin)return new Response(null,{status:403});
 const db=getDatabase(),run=`payment-${env.DEPLOY_ID}`;
 const claimed=await db.pool.query('INSERT INTO checkout_validation_runs(deploy_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING deploy_id',[run]);
 if(!claimed.rowCount){const {rows}=await db.pool.query('SELECT result FROM checkout_validation_runs WHERE deploy_id=$1',[run]);return Response.json(rows[0]?.result??{status:'running-or-interrupted'});}
 const result={checks:[],status:'running',failedStep:null};let step='authentication';
 const call=(name,payload)=>gateway(name,payload,env);
 try {
  await call('authenticateTestRequest',{});result.checks.push('sandbox authentication passed');
  step='webhook registration';
  const hookUrl='https://apitest.authorize.net/rest/v1/webhooks';
  const headers={Authorization:`Basic ${Buffer.from(`${env.AUTHNET_API_LOGIN_ID}:${env.AUTHNET_TRANSACTION_KEY}`).toString('base64')}`,'Content-Type':'application/json'};
  const response=await fetch(hookUrl,{headers,signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('webhook lookup');
  const hooks=await response.json();
  const target=`${origin}/api/payment-webhook`;
  if(!Array.isArray(hooks))throw Error('webhook response');
  const existing=hooks.find(h=>h.url===target);
  if(!existing || existing.status!=='active'||!existing.eventTypes?.includes('net.authorize.payment.authcapture.created')){
   const updated=await fetch(existing?`${hookUrl}/${encodeURIComponent(existing.webhookId)}`:hookUrl,{method:existing?'PUT':'POST',headers,body:JSON.stringify({name:'Crossbell sandbox preview',url:target,eventTypes:['net.authorize.payment.authcapture.created'],status:'active'}),signal:AbortSignal.timeout(12000)});
   if(!updated.ok)throw Error('webhook registration');
  }
  result.checks.push('sandbox webhook registered for preview');
  step='hosted checkout';
  const policy=policyFromEnv(env),scope=`sandbox-${env.REVIEW_ID||env.DEPLOY_ID}`,store=databaseStore(db,policy,scope);
  const input={items:[{sku:'celebration-pack',quantity:1}],fulfillment:'pickup',pickupLocation:'christopher',name:'Sandbox payment validation',email:'payment-test@example.invalid'};
  const key=randomUUID();
  const session=await createOrder(input,key,policy,store,call,origin);
  const repeated=await createOrder(input,key,policy,store,call,origin);
  if(session.orderId!==repeated.orderId||session.token!==repeated.token)throw Error('session duplicate');
  result.orderId=session.orderId;result.checks.push('hosted session created; duplicate request reused the same session');
  const order=await store.get(`orders/${session.orderId}`);
  const payment={creditCard:{cardNumber:'4111111111111111',expirationDate:`${new Date().getUTCFullYear()+2}-12`,cardCode:'900'}};
  const charge={transactionRequest:{transactionType:'authCaptureTransaction',amount:(order.quote.totalCents/100).toFixed(2),payment,order:{invoiceNumber:order.id},billTo:{firstName:'Sandbox',lastName:'Test',address:'123 Test Street',city:'Test City',state:'MI',zip:'48094',country:'USA'},transactionSettings:{setting:[{settingName:'duplicateWindow',settingValue:'120'}]}}};
  step='approved sandbox payment';
  const paid=await call('createTransactionRequest',charge);
  const tx=paid.transactionResponse;
  if(String(tx?.responseCode)!=='1'||! /^[1-9]\d+$/.test(String(tx?.transId||'')))throw Error('approval');
  result.transactionId=String(tx.transId);result.checks.push('sandbox payment approved');
  // Save recovery identifiers before any further request, never the hosted token/card.
  await db.pool.query('UPDATE checkout_validation_runs SET result=$2::jsonb WHERE deploy_id=$1',[run,JSON.stringify(result)]);
  step='duplicate provider charge';
  try {const duplicate=await call('createTransactionRequest',charge);if(!duplicate.transactionResponse?.errors?.some(e=>String(e.errorCode)==='11'))throw Error('duplicate not rejected');}
  catch(error){if(!error.duplicate)throw error;}
  result.checks.push('provider rejected duplicate charge');
  step='payment reconciliation';
  await reconcile(result.transactionId,store,call);await reconcile(result.transactionId,store,call);
  if((await store.get(`orders/${order.id}`)).status!=='paid')throw Error('not paid');
  result.checks.push('verified payment stored once in real Netlify Database');
  for(let attempt=0;attempt<15;attempt++) {
   if((await store.get(`orders/${order.id}`)).verifiedWebhookAt){result.webhookDeliveryVerified=true;break;}
   await new Promise(resolve=>setTimeout(resolve,1000));
  }
  if(!result.webhookDeliveryVerified)result.webhookDeliveryVerified=false;
  step='void';
  const voided=await call('createTransactionRequest',{transactionRequest:{transactionType:'voidTransaction',refTransId:result.transactionId}});
  if(String(voided.transactionResponse?.responseCode)!=='1')throw Error('void response');
  await updateOrder(db,scope,'sandbox-validation',{id:order.id,version:'0',action:'reconcile_reversal',transactionId:result.transactionId},call);
  result.checks.push('sandbox void verified; stock restored');
  step='declined payment';
  const declinedCharge=structuredClone(charge);declinedCharge.transactionRequest.order.invoiceNumber=randomUUID().replaceAll('-','').slice(0,20);declinedCharge.transactionRequest.billTo.zip='46282';
  try {const declined=await call('createTransactionRequest',declinedCharge);if(String(declined.transactionResponse?.responseCode)!=='2')throw Error('decline not returned');}
  catch(error){if(error.responseCode!=='2')throw error;}
  result.checks.push('official sandbox decline trigger returned declined');
  result.status='passed';
 }catch{result.status='failed';result.failedStep=step;}
 await db.pool.query('UPDATE checkout_validation_runs SET result=$2::jsonb WHERE deploy_id=$1',[run,JSON.stringify(result)]);
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
};
export const config={path:'/api/payment-validation'};
