import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { quote, customer, validSignature, policyFromEnv, verifyTransaction } from '../server/checkout/core.mjs';
import { createOrder, reconcile } from '../server/checkout/service.mjs';
import { gateway, hostedRequest } from '../server/checkout/gateway.mjs';
const policy = { products: { 'celebration-pack': { name:'30th Celebration',priceCents:1199,maxQuantity:10 } },shippingCents:500,taxBps:600,shippingTaxable:true };
const input = { items:[{sku:'celebration-pack',quantity:2}],fulfillment:'pickup',name:'Test Buyer',email:'test@example.com' };
function memoryStore() {
  const records = new Map(); let version = 0;
  return {
    async setJSON(key,data,options={}) {
      const current = records.get(key);
      if ((options.onlyIfNew && current) || (options.onlyIfMatch && current?.etag !== options.onlyIfMatch)) return {modified:false};
      const etag = String(++version); records.set(key,{data:structuredClone(data),etag}); return {modified:true,etag};
    },
    async get(key) { return structuredClone(records.get(key)?.data ?? null); },
    async getWithMetadata(key) { return structuredClone(records.get(key) ?? null); }
  };
}
test('server prices ignore browser totals and calculate integer-cent tax',()=>{
  const q=quote({...input,totalCents:1,items:[{sku:'celebration-pack',quantity:2,priceCents:1}]},policy);
  assert.equal(q.subtotalCents,2398); assert.equal(q.taxCents,144); assert.equal(q.totalCents,2542);
});
test('shipping and taxable delivery calculated on server',()=>assert.equal(quote({...input,fulfillment:'shipping'},policy).totalCents,3072));
test('invalid SKUs, duplicate SKUs, fractional, negative and excessive quantities rejected',()=>{
  for(const items of [[],[{sku:'unknown',quantity:1}],[...input.items,...input.items],...[0,-1,1.5,11,NaN].map(quantity=>[{sku:'celebration-pack',quantity}])]) assert.throws(()=>quote({...input,items},policy));
});
test('shipping requires validated Michigan address',()=>{
  assert.throws(()=>customer({...input,fulfillment:'shipping'}));
  assert.throws(()=>customer({...input,email:'bad'}));
  assert.throws(()=>customer({...input,fulfillment:'shipping',address:{line1:'123 Main',city:'City',zip:'48000',state:'CA'}}));
  assert.equal(customer({...input,fulfillment:'shipping',address:{line1:'123 Main',city:'City',zip:'48000',state:'MI'}}).address.state,'MI');
});
test('missing config and production deployments fail closed',()=>{
  assert.throws(()=>policyFromEnv({}));
  assert.throws(()=>policyFromEnv({CONTEXT:'production',CHECKOUT_MODE:'sandbox',CHECKOUT_POLICY_JSON:JSON.stringify(policy)}));
  assert.deepEqual(policyFromEnv({CONTEXT:'deploy-preview',CHECKOUT_MODE:'sandbox',CHECKOUT_POLICY_JSON:JSON.stringify(policy)}),policy);
});
test('signature verification covers original bytes and rejects tampering',()=>{
  const key='ab'.repeat(64),body='{"hello":1}';
  const sig='sha512='+createHmac('sha512',Buffer.from(key,'hex')).update(body).digest('hex');
  assert.ok(validSignature(body,sig,key)); assert.ok(!validSignature(body+' ',sig,key)); assert.ok(!validSignature(body,'bad',key)); assert.ok(!validSignature(body,sig,''));
});
test('duplicate checkout submissions reuse one provider session',async()=>{
  const store=memoryStore(),key=randomUUID(); let calls=0;
  const call=async()=>{calls++;return {token:'test-token'}};
  const a=await createOrder(input,key,policy,store,call,'https://preview.example');
  const b=await createOrder(input,key,policy,store,call,'https://preview.example');
  assert.deepEqual(a,b);assert.equal(calls,1);
  await assert.rejects(()=>createOrder({...input,name:'Changed'},key,policy,store,call,'https://preview.example'));
});
test('concurrent checkout requests create only one session',async()=>{
  const store=memoryStore(),key=randomUUID();let calls=0;
  const call=async()=>{calls++;await new Promise(r=>setTimeout(r,10));return {token:'test'}};
  const outcomes=await Promise.allSettled([createOrder(input,key,policy,store,call,'https://preview.example'),createOrder(input,key,policy,store,call,'https://preview.example')]);
  assert.equal(calls,1);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
});
test('provider failures never produce a paid order or automatically retry',async()=>{
  const store=memoryStore(),key=randomUUID();let calls=0;
  const call=async()=>{calls++;throw Error('timeout')};
  await assert.rejects(()=>createOrder(input,key,policy,store,call,'https://preview.example'));
  await assert.rejects(()=>createOrder(input,key,policy,store,call,'https://preview.example'));
  assert.equal(calls,1);
});
test('verified callbacks mark paid and repeated notifications are idempotent',async()=>{
  const store=memoryStore(); const session=await createOrder(input,randomUUID(),policy,store,async()=>({token:'test'}),'https://preview.example');
  const transaction={order:{invoiceNumber:session.orderId},authAmount:'25.42',transactionType:'authCaptureTransaction',transactionStatus:'capturedPendingSettlement'};
  await reconcile('123',store,async()=>({transaction})); await reconcile('123',store,async()=>({transaction}));
  const order=await store.get(`orders/${session.orderId}`);assert.equal(order.status,'paid');assert.equal(order.transactionId,'123');assert.equal(order.hostedToken,undefined);
  await assert.rejects(()=>reconcile('456',store,async()=>({transaction})));
});
test('amount mismatch or authorization-only never confirms payment',()=>{
  const order={id:'order',quote:{totalCents:100}};
  const transaction={order:{invoiceNumber:'order'},authAmount:'1.00',transactionType:'authCaptureTransaction',transactionStatus:'capturedPendingSettlement'};
  assert.ok(verifyTransaction(order,transaction));
  assert.ok(!verifyTransaction(order,{...transaction,authAmount:'0.01'}));
  assert.ok(!verifyTransaction(order,{...transaction,transactionStatus:'authorizedPendingCapture'}));
  assert.ok(!verifyTransaction(order,{...transaction,order:{invoiceNumber:'other'}}));
});
test('provider adapter uses sandbox endpoint and redacts provider errors',async()=>{
  const env={AUTHNET_API_LOGIN_ID:'fixture',AUTHNET_TRANSACTION_KEY:'fixture'};
  const value=await gateway('authenticateTestRequest',{},env,async(url,options)=>{
    assert.equal(url,'https://apitest.authorize.net/xml/v1/request.api');assert.equal(options.method,'POST');
    return new Response('\uFEFF'+JSON.stringify({messages:{resultCode:'Ok'}}));
  });assert.equal(value.messages.resultCode,'Ok');
  await assert.rejects(()=>gateway('x',{},env,async()=>new Response(JSON.stringify({messages:{resultCode:'Error',secret:'no-leak'}}))),/Payment provider could not/);
});
test('hosted payment request uses server total, invoice and card-only settings',()=>{
 const request=hostedRequest({id:'123',quote:{totalCents:1199},customer:{email:'test@example.com'}},'https://preview.example');
 assert.equal(request.transactionRequest.amount,'11.99');
 assert.equal(request.transactionRequest.order.invoiceNumber,'123');
 const options=JSON.parse(request.hostedPaymentSettings.setting.find(x=>x.settingName==='hostedPaymentPaymentOptions').settingValue);
 assert.equal(options.showBankAccount,false);
});
