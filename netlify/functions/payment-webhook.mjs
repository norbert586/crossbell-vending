import { getStore } from '@netlify/blobs';
import { CheckoutError, policyFromEnv, validSignature } from '../../server/checkout/core.mjs';
import { gateway } from '../../server/checkout/gateway.mjs';
import { reconcile } from '../../server/checkout/service.mjs';
export default async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  try {
    const env = process.env;
    policyFromEnv(env);
    const raw = await request.text();
    if (raw.length > 64000) return new Response(null, { status: 413 });
    if (!validSignature(raw, request.headers.get('X-ANET-Signature'), env.AUTHNET_SIGNATURE_KEY)) return new Response(null, { status: 401 });
    let event; try { event = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
    if (event.eventType !== 'net.authorize.payment.authcapture.created') return new Response(null, { status: 204 });
    const store = getStore({ name: `checkout-sandbox-${env.REVIEW_ID || env.DEPLOY_ID}`, consistency: 'strong' });
    await reconcile(event.payload?.id, store, (name, payload) => gateway(name, payload, env));
    return new Response(null, { status: 204 });
  } catch (error) {
    return new Response('Notification could not be reconciled.', { status: error instanceof CheckoutError ? error.status : 503 });
  }
};
export const config = { path: '/api/payment-webhook' };
