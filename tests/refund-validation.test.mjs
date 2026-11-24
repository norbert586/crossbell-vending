import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/refund-validation.mjs';
test('refund fixture endpoint rejects production, other previews and foreign origins before database access',async()=>{
 const names=['CONTEXT','CHECKOUT_MODE','REVIEW_ID','DEPLOY_PRIME_URL'];
 const saved=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 const origin='https://deploy-preview-17--inspiring-kitsune-85ad70.netlify.app';
 try{
  const fixture={CONTEXT:'deploy-preview',CHECKOUT_MODE:'sandbox',REVIEW_ID:'17',DEPLOY_PRIME_URL:origin};
  for(const override of [{CONTEXT:'production'},{CHECKOUT_MODE:'production'},{REVIEW_ID:'18'},{DEPLOY_PRIME_URL:'https://other.example'}]){
   Object.assign(process.env,fixture,override);
   assert.equal((await handler(new Request(origin+'/api/refund-validation',{method:'POST',headers:{Origin:origin}}))).status,404);
  }
  Object.assign(process.env,fixture);
  assert.equal((await handler(new Request(origin+'/api/refund-validation',{method:'POST',headers:{Origin:'https://other.example'}}))).status,403);
  assert.equal((await handler(new Request(origin+'/api/refund-validation',{method:'DELETE'}))).status,405);
 }finally{for(const n of names)if(saved[n]===undefined)delete process.env[n];else process.env[n]=saved[n];}
});
