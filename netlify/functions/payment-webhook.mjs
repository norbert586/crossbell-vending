import { databaseStore } from '../../server/checkout/database.mjs';
import buildContext from '../../server/checkout/build-context.mjs';
import { getDatabase } from '@netlify/database';
import { CheckoutError, policyFromEnv, validSignature } from '../../server/checkout/core.mjs';
import { gateway } from '../../server/checkout/gateway.mjs';
import { reconcile } from '../../server/checkout/service.mjs';
export default async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  try {
    const env = { ...process.env, ...buildContext };
    const policy = policyFromEnv(env);
    const raw = await request.text();
    if (raw.length > 64000) return new Response(null, { status: 413 });
    const store = databaseStore(getDatabase(), policy, policy.mode === 'production' ? 'production' : `sandbox-${env.REVIEW_ID || env.DEPLOY_ID}`);
    const signature = request.headers.get('X-ANET-Signature') || '';
    if (!validSignature(raw, signature, env.AUTHNET_SIGNATURE_KEY)) return new Response(null, { status: 401 });
    let event; try { event = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
    if (event.eventType !== 'net.authorize.payment.authcapture.created') return new Response(null, { status: 200 });
    await reconcile(event.payload?.id, store, (name, payload) => gateway(name, payload, env));
    return new Response(null, { status: 200 });
  } catch (error) {
    return new Response('Notification could not be reconciled.', { status: error instanceof CheckoutError ? error.status : 503 });
  }
};
export const config = { path: '/api/payment-webhook' };
