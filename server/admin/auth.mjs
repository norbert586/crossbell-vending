import {OAuth2Client} from 'google-auth-library';
import {createHmac, timingSafeEqual, randomBytes, createHash} from 'node:crypto';
import {fail} from '../checkout/core.mjs';
export const approvedEmails=new Set(['crossbellvending@gmail.com','naratiu@mtu.edu','alexma93ama@gmail.com']);
export function environment(env){
 if(env.CONTEXT==='production')return {origin:'https://crossbellvending.com',scope:'production'};
 if(env.CONTEXT==='deploy-preview'&&/^https:\/\/deploy-preview-\d+--inspiring-kitsune-85ad70\.netlify\.app$/.test(env.DEPLOY_PRIME_URL||''))return {origin:env.DEPLOY_PRIME_URL,scope:`sandbox-${env.REVIEW_ID||env.DEPLOY_ID}`};
 fail('Admin environment unavailable.',503);
}
function key(env){if((env.ADMIN_SESSION_SECRET||'').length<32)fail('Google sign-in setup pending.',503);return env.ADMIN_SESSION_SECRET;}
export function sign(value,env){const data=Buffer.from(JSON.stringify(value)).toString('base64url');return data+'.'+createHmac('sha256',key(env)).update(data).digest('base64url');}
export function decode(token,env,purpose){
 try{const [body,sig,...rest]=(token||'').split('.');if(rest.length||!body||!sig)return null;
 const expected=createHmac('sha256',key(env)).update(body).digest();const got=Buffer.from(sig,'base64url');if(got.length!==expected.length||!timingSafeEqual(got,expected))return null;
 const p=JSON.parse(Buffer.from(body,'base64url'));if(p.purpose!==purpose||p.origin!==environment(env).origin||!Number.isFinite(p.exp)||p.exp<=Date.now())return null;return p;
 }catch{return null;}
}
export const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
export function cookies(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(x=>x.trim().split('=')));}
export function staff(request,env){const s=decode(cookies(request)['__Host-cb-admin'],env,'session');if(!s||!approvedEmails.has(s.email))fail('Sign in with an approved Google account.',401);return s;}
export function assertMutation(request,env,session){if(request.headers.get('origin')!==environment(env).origin||request.headers.get('x-csrf-token')!==session.csrf)fail('Request verification failed.',403);}
export function identity(payload,nonce){if(!payload||payload.nonce!==nonce||payload.email_verified!==true||!approvedEmails.has(payload.email)||!payload.sub)fail('This Google account is not approved.',403);return payload.email;}
// Google's library validates signature, issuer, audience and expiry. No tokens logged.
export async function verifyGoogle(token,audience){
 try {const ticket=await new OAuth2Client(audience).verifyIdToken({idToken:token,audience});return ticket.getPayload();}
 catch {fail('Invalid Google response.',403);}
}
export function start(env){const {origin}=environment(env);if(!env.GOOGLE_CLIENT_ID||!env.GOOGLE_CLIENT_SECRET)fail('Google sign-in setup pending.',503);
 const state=randomBytes(24).toString('hex'),nonce=randomBytes(24).toString('hex'),verifier=randomBytes(32).toString('base64url');
 const value=sign({purpose:'oauth',origin,state,nonce,verifier,exp:Date.now()+600000},env);
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:origin+'/api/admin-auth/callback',response_type:'code',scope:'openid email',state,nonce,prompt:'select_account',code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString();return {url:String(url),value};
}
