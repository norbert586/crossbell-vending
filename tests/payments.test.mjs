import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {gateway,GatewayRejection,verifyMerchant} from '../server/checkout/gateway.mjs';
import {amountCents,verifyTransaction} from '../server/checkout/core.mjs';
import {createOrder} from '../server/checkout/service.mjs';
import {reverseUnfulfillable} from '../server/checkout/reversals.mjs';

const env={CONTEXT:'deploy-preview',AUTHNET_API_LOGIN_ID:'fixture',AUTHNET_TRANSACTION_KEY:'fixture'};
test('USD merchant verification rejects unsupported currency and provider test mode',async()=>{
 for(const [i,data] of [{currencies:['CAD'],isTestMode:false},{currencies:['USD'],isTestMode:true},{currencies:['USD'],isTestMode:false}].entries()){
  const check=()=>verifyMerchant({...env,AUTHNET_API_LOGIN_ID:`currency-fixture-${i}`},async()=>Response.json({...data,messages:{resultCode:'Ok'}}));
  if(i<2)await assert.rejects(check);else assert.equal(await check(),'USD');
 }
});
test('money matching rejects fractional cents, malformed amounts and wrong currency',()=>{
 assert.equal(amountCents('10.99'),1099);assert.equal(amountCents(10),1000);
 for(const value of ['1.001','NaN','1e2',null,Infinity,-1])assert.equal(amountCents(value),null);
 const order={id:'invoice',quote:{totalCents:100,currency:'USD'}};
 const t={order:{invoiceNumber:'invoice'},transactionType:'authCaptureTransaction',transactionStatus:'capturedPendingSettlement',authAmount:'1.00',verifiedCurrency:'USD'};
 assert.equal(verifyTransaction(order,t),true);
 for(const override of [{currencyCode:'CAD'},{authAmount:'1.001'},{responseCode:'2'},{verifiedCurrency:undefined},{transactionStatus:'settledSuccessfully',settleAmount:'0.99'}])assert.equal(verifyTransaction(order,{...t,...override}),false);
});
test('network and malformed responses are ambiguous and never expose provider data',async()=>{
 for(const fetcher of [async()=>{throw Error('sensitive transport detail')},async()=>new Response('sensitive non-json')]) {
  await assert.rejects(()=>gateway('getHostedPaymentPageRequest',{},env,fetcher),e=>!(e instanceof GatewayRejection)&&e.status===503&&!e.message.includes('sensitive'));
 }
});
test('only a definite session rejection releases stock; timeout remains held for review',async()=>{
 const policy={products:{pack:{name:'Pack',priceCents:100,maxQuantity:1}},shippingCents:0,taxBps:0,shippingTaxable:false};
 const input={items:[{sku:'pack',quantity:1}],fulfillment:'pickup',name:'Test',email:'test@example.invalid'};
 for(const error of [new GatewayRejection(),new Error('timeout')]) {
  let released=0,updated;
  const store={setJSON:async(_k,data)=>{updated=data;return {modified:true,etag:'1'}},releaseReservation:async()=>{released++}};
  await assert.rejects(()=>createOrder(input,randomUUID(),policy,store,async()=>{throw error},'https://preview.example'));
  assert.equal(released,error instanceof GatewayRejection?1:0);
  if(!released)assert.equal(updated.status,'payment_review');
 }
});
const order={id:'a'.repeat(20),quote:{totalCents:100}};
function reversalStore(){let record={status:'pending',reversal_id:null};return {
 reversal:async()=>structuredClone(record),
 claimReversal:async()=>{if(record.status!=='pending')return false;record.status='submitting';return true},
 finishReversal:async(_id,status,rid)=>{record={status,reversal_id:rid||record.reversal_id}}
};}
for(const settled of [false,true])test(`${settled?'settled refund':'unsettled void'} is verified before completion`,async()=>{
 const store=reversalStore();let mutations=0;
 const call=async(name,payload)=>{
  if(name==='createTransactionRequest'){
   mutations++;assert.equal(payload.transactionRequest.transactionType,settled?'refundTransaction':'voidTransaction');
   if(settled){assert.equal(payload.transactionRequest.amount,'1.00');assert.equal(payload.transactionRequest.payment.creditCard.cardNumber,'1111');}
   return {transactionResponse:{responseCode:'1',transId:settled?'456':'123'}};
  }
  if(mutations)return {transaction:settled?{transId:'456',refTransId:'123',transactionType:'refundTransaction',transactionStatus:'refundPendingSettlement',settleAmount:'1.00'}:{transId:'123',transactionStatus:'voided'}};
  return {transaction:{transId:'123',verifiedCurrency:'USD',authAmount:'1.00',transactionType:'authCaptureTransaction',order:{invoiceNumber:order.id},transactionStatus:settled?'settledSuccessfully':'capturedPendingSettlement',payment:{creditCard:{cardNumber:'XXXX1111'}}}};
 };
 await reverseUnfulfillable(order,'123',store,call);await reverseUnfulfillable(order,'123',store,call);
 assert.equal(mutations,1);assert.equal((await store.reversal()).status,'confirmed');
});
test('lost refund response is recorded and never blindly retried',async()=>{
 const store=reversalStore();let mutations=0;
 const call=async name=>{
  if(name==='createTransactionRequest'){mutations++;throw Error('timeout')}
  return {transaction:{transId:'123',verifiedCurrency:'USD',authAmount:'1.00',transactionType:'authCaptureTransaction',order:{invoiceNumber:order.id},transactionStatus:'settledSuccessfully',payment:{creditCard:{cardNumber:'XXXX1111'}}}};
 };
 await assert.rejects(()=>reverseUnfulfillable(order,'123',store,call));
 await assert.rejects(()=>reverseUnfulfillable(order,'123',store,call));
 assert.equal(mutations,1);assert.equal((await store.reversal()).status,'uncertain');
});
test('concurrent reversal workers submit one financial request',async()=>{
 const store=reversalStore();let mutations=0;
 const call=async name=>{
  if(name==='createTransactionRequest'){mutations++;return {transactionResponse:{responseCode:'1',transId:'123'}}}
  return {transaction:{transId:'123',verifiedCurrency:'USD',authAmount:'1.00',transactionType:'authCaptureTransaction',order:{invoiceNumber:order.id},transactionStatus:mutations?'voided':'capturedPendingSettlement'}};
 };
 await Promise.allSettled(Array.from({length:12},()=>reverseUnfulfillable(order,'123',store,call)));
 assert.equal(mutations,1);assert.equal((await store.reversal()).status,'confirmed');
});
