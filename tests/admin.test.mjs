import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sign,decode,staff,assertMutation,identity,environment,verifyGoogle} from '../server/admin/auth.mjs';
import {transition,reversalMatches,reminder} from '../server/admin/orders.mjs';
import {csv} from '../server/admin/export.mjs';
const env={CONTEXT:'deploy-preview',DEPLOY_PRIME_URL:'https://deploy-preview-17--inspiring-kitsune-85ad70.netlify.app',REVIEW_ID:'17',ADMIN_SESSION_SECRET:'x'.repeat(40)};
const origin=env.DEPLOY_PRIME_URL;
const session={purpose:'session',origin,email:'naratiu@mtu.edu',sub:'test',csrf:'nonce',exp:Date.now()+100000};
test('staff authentication rejects forged, expired, cross-context and unapproved sessions',()=>{
 const token=sign(session,env);assert.equal(decode(token,env,'session').email,session.email);
 const request=token=>new Request(origin,{headers:{cookie:'__Host-cb-admin='+token}});
 assert.equal(staff(request(token),env).email,session.email);
 for(const bad of [token+'x',sign({...session,exp:1},env),sign({...session,email:'attacker@example.com'},env),sign({...session,origin:'https://crossbellvending.com'},env)])assert.throws(()=>staff(request(bad),env));
 assert.throws(()=>environment({...env,CONTEXT:'unknown'}));
});
test('mutations require both matching origin and session CSRF token',()=>{
 assert.doesNotThrow(()=>assertMutation(new Request(origin,{headers:{Origin:origin,'X-CSRF-Token':'nonce'}}),env,session));
 assert.throws(()=>assertMutation(new Request(origin,{headers:{Origin:'https://evil.example','X-CSRF-Token':'nonce'}}),env,session));
 assert.throws(()=>assertMutation(new Request(origin,{headers:{Origin:origin}}),env,session));
});
test('Google identity requires approved exact verified email and nonce',async()=>{
 const p={email:'crossbellvending@gmail.com',email_verified:true,sub:'123',nonce:'abc'};
 assert.equal(identity(p,'abc'),p.email);
 for(const x of [{...p,email_verified:false},{...p,email:'crossbellvending@gmail.com.evil.test'},{...p,nonce:'wrong'}])assert.throws(()=>identity(x,'abc'));
 await assert.rejects(()=>verifyGoogle('forged.token.signature','client'));
});
const order={id:'a'.repeat(20),status:'paid',transactionId:'123',paidAt:0,quote:{fulfillment:'pickup',totalCents:10600}};
test('pickup requires payment and ready state but no customer confirmation',()=>{
 assert.equal(transition(order,{},'ready',{}).fulfillment_status,'ready');
 assert.equal(transition(order,{fulfillment_status:'ready'},'collected',{}).fulfillment_status,'collected');
 assert.throws(()=>transition({...order,status:'awaiting_payment'},{},'ready',{}));
 assert.throws(()=>transition(order,{},'collected',{}));
 assert.throws(()=>transition(order,{fulfillment_status:'cancelled'},'ready',{}));
});
test('tracking does not ship; handoff requires carrier and tracking',()=>{
 const o={...order,quote:{...order.quote,fulfillment:'shipping'}};
 assert.equal(transition(o,{},'tracking',{carrier:'UPS',tracking:'1Z12345678'}).fulfillment_status,undefined);
 assert.throws(()=>transition(o,{},'shipped',{}));
 assert.equal(transition(o,{carrier:'UPS',tracking:'1Z12345678'},'shipped',{}).fulfillment_status,'shipped');
 assert.throws(()=>transition(o,{fulfillment_status:'shipped'},'tracking',{carrier:'UPS',tracking:'12345'}));
});
test('manual reversal verification rejects unrelated or partial refunds',()=>{
 assert.equal(reversalMatches(order,{transId:'123',transactionStatus:'voided'},'123'),true);
 const t={transId:'456',refTransId:'123',transactionType:'refundTransaction',transactionStatus:'refundPendingSettlement',authAmount:'106.00'};
 assert.equal(reversalMatches(order,t,'456'),true);
 assert.equal(reversalMatches(order,{...t,refTransId:'999'},'456'),false);
 assert.equal(reversalMatches(order,{...t,authAmount:'1.00'},'456'),false);
 assert.equal(reversalMatches(order,{...t,transactionStatus:'declined'},'456'),false);
});
test('pickup reminders at 12 days and internal overdue alert at 14, no automatic cancellation',()=>{
 assert.equal(reminder(order,{},11*86400000),null);
 assert.equal(reminder(order,{},12*86400000).audience,'customer');
 assert.equal(reminder(order,{},14*86400000).audience,'internal');
 assert.equal(reminder(order,{fulfillment_status:'collected'},14*86400000),null);
});
test('CSV protects spreadsheet formula inputs',()=>{assert.ok(csv([['=HYPERLINK("bad")']]).startsWith('"\'=HYPERLINK'));});
