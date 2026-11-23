import {randomBytes} from 'node:crypto';
import context from '../../server/checkout/build-context.mjs';
import {CheckoutError,fail} from '../../server/checkout/core.mjs';
import {start,environment,cookie,cookies,decode,sign,identity,verifyGoogle,staff,assertMutation} from '../../server/admin/auth.mjs';
export default async request=>{
 const env={...process.env,...context},path=new URL(request.url).pathname;
 const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
 try{
 if(path.endsWith('/start')&&request.method==='GET'){const s=start(env);return new Response(null,{status:302,headers:{...headers,Location:s.url,'Set-Cookie':cookie('__Host-cb-oauth',s.value,600)}});}
 if(path.endsWith('/callback')&&request.method==='GET'){
  const q=new URL(request.url).searchParams,s=decode(cookies(request)['__Host-cb-oauth'],env,'oauth');
  if(!s||q.get('state')!==s.state||!q.get('code'))fail('Google sign-in expired. Try again.',403);
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,client_secret:env.GOOGLE_CLIENT_SECRET,redirect_uri:s.origin+'/api/admin-auth/callback',grant_type:'authorization_code',code:q.get('code'),code_verifier:s.verifier}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)fail('Google sign-in failed.',403);const tokens=await response.json();const p=await verifyGoogle(tokens.id_token,env.GOOGLE_CLIENT_ID);const email=identity(p,s.nonce);
  const session=sign({purpose:'session',origin:environment(env).origin,email,sub:p.sub,csrf:randomBytes(24).toString('hex'),exp:Date.now()+8*3600000},env);
  const h=new Headers({...headers,Location:'/admin/orders/'});h.append('Set-Cookie',cookie('__Host-cb-admin',session,28800));h.append('Set-Cookie',cookie('__Host-cb-oauth','',0));return new Response(null,{status:302,headers:h});
 }
 if(path.endsWith('/logout')&&request.method==='POST'){assertMutation(request,env,staff(request,env));return new Response(null,{status:204,headers:{...headers,'Set-Cookie':cookie('__Host-cb-admin','',0)}});}
 return new Response('Not found',{status:404,headers});
 }catch(e){return new Response(e instanceof CheckoutError?e.message:'Sign-in temporarily unavailable.',{status:e instanceof CheckoutError?e.status:503,headers});}
};
export const config={path:'/api/admin-auth/*'};
