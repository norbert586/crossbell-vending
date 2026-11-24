import buildContext from '../../server/checkout/build-context.mjs';
import { gateway } from '../../server/checkout/gateway.mjs';
// Preview only, read-only provider calls. Never return credentials or raw responses.
export default async request => {
  const env = { ...process.env, ...buildContext };
  if (env.CONTEXT !== 'deploy-preview') return new Response(null, { status: 404 });
  if (request.method !== 'POST' || request.headers.get('Origin') !== new URL(env.DEPLOY_PRIME_URL).origin) return new Response(null, { status: 403 });
  const checks = {
    sandboxContext: true,
    sandboxMode: env.CHECKOUT_MODE === 'sandbox',
    credentialsPresent: Boolean(env.AUTHNET_API_LOGIN_ID && env.AUTHNET_TRANSACTION_KEY),
    signatureKeyConfigured: /^[a-f\d]{128}$/i.test(env.AUTHNET_SIGNATURE_KEY || ''),
    authentication: false,
    webhookRegistered: false
  };
  try {
    await gateway('authenticateTestRequest', {}, env);
    checks.authentication = true;
    const response = await fetch('https://apitest.authorize.net/rest/v1/webhooks', {
      headers: { Authorization: `Basic ${Buffer.from(`${env.AUTHNET_API_LOGIN_ID}:${env.AUTHNET_TRANSACTION_KEY}`).toString('base64')}` },
      signal: AbortSignal.timeout(12000)
    });
    if (response.ok) {
      const hooks = await response.json();
      const hook=Array.isArray(hooks)&&hooks.find(h=>h.url===`${new URL(env.DEPLOY_PRIME_URL).origin}/api/payment-webhook`);
      checks.webhookRegistered = Boolean(hook && hook.status==='active' && hook.eventTypes?.includes('net.authorize.payment.authcapture.created'));
      if(hook){
        const history=await fetch(`https://apitest.authorize.net/rest/v1/notifications?from_date=${new Date().toISOString().slice(0,10)}&limit=100`,{headers:{Authorization:`Basic ${Buffer.from(`${env.AUTHNET_API_LOGIN_ID}:${env.AUTHNET_TRANSACTION_KEY}`).toString('base64')}`},signal:AbortSignal.timeout(12000)});
        if(history.ok){
          const data=await history.json();
          checks.recentDeliveries=[];
          for(const notification of (data.notifications||[]).filter(n=>n.webhookId===hook.webhookId).slice(0,3)){
            const detail=await fetch(`https://apitest.authorize.net/rest/v1/notifications/${encodeURIComponent(notification.notificationId)}`,{headers:{Authorization:`Basic ${Buffer.from(`${env.AUTHNET_API_LOGIN_ID}:${env.AUTHNET_TRANSACTION_KEY}`).toString('base64')}`},signal:AbortSignal.timeout(12000)});
            const log=detail.ok?await detail.json():{};
            const entry=Array.isArray(log)?log[0]:log;
            checks.recentDeliveries.push({status:notification.deliveryStatus,event:notification.eventType,httpStatuses:(entry?.retryLog?.logs||[]).map(l=>l.statusCode)});
          }
        }
      }
    }
  } catch { /* Only fixed readiness booleans leave this endpoint. */ }
  return Response.json(checks, { headers: { 'Cache-Control': 'no-store' } });
};
export const config = { path: '/api/payment-readiness' };
