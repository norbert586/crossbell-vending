import { databaseStore } from '../../server/checkout/database.mjs';
import buildContext from '../../server/checkout/build-context.mjs';
import { getDatabase } from '@netlify/database';
import { CheckoutError, fail, policyFromEnv, quote } from '../../server/checkout/core.mjs';
import { createOrder } from '../../server/checkout/service.mjs';
import { gateway } from '../../server/checkout/gateway.mjs';
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export default async request => {
  try {
    const env = { ...process.env, ...buildContext };
    const policy = policyFromEnv(env);
    const origin = policy.mode === 'production' ? 'https://crossbellvending.com' : new URL(env.DEPLOY_PRIME_URL).origin;
    const store = databaseStore(getDatabase(), policy, policy.mode === 'production' ? 'production' : `sandbox-${env.REVIEW_ID || env.DEPLOY_ID}`);
    const url = new URL(request.url);
    if (request.method === 'GET' && url.searchParams.get('action') === 'config') {
      return json({ mode: policy.mode || 'sandbox', policy, available: await store.availability() });
    }
    if (request.method === 'GET' && url.searchParams.get('action') === 'status') {
      const id = url.searchParams.get('id');
      if (!/^[a-f\d]{20}$/.test(id || '')) fail('Order not found.', 404);
      const order = await store.get(`orders/${id}`, { type: 'json' });
      if (!order || request.headers.get('Authorization') !== `Bearer ${order.accessToken}`) fail('Order not found.', 404);
      return json({ orderId: id, status: order.status, fulfillment: order.quote.fulfillment, pickupDetails: order.quote.pickupDetails, pickupInstructions: policy.pickupInstructions });
    }
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
    if (request.headers.get('Origin') !== origin) fail('Invalid checkout origin.', 403);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) fail('JSON is required.', 415);
    const raw = await request.text();
    if (raw.length > 12000) fail('Request too large.', 413);
    let input; try { input = JSON.parse(raw); } catch { fail('Invalid JSON.'); }
    if (input.action === 'quote') return json(quote(input, policy));
    if (input.action !== 'create') fail('Unknown checkout action.');
    // Staging gate: complete real-database validation, reversal handling and email delivery before enabling payments.
    fail('Checkout payments are paused while the stock database and order emails are connected.', 503);
    const session = await createOrder(input, request.headers.get('Idempotency-Key'), policy, store, (name, payload) => gateway(name, payload, env), origin);
    return json(session);
  } catch (error) {
    return json({ error: error instanceof CheckoutError ? error.message : 'Checkout is temporarily unavailable.' }, error instanceof CheckoutError ? error.status : 503);
  }
};
export const config = { path: '/api/checkout' };
