import { randomBytes } from 'node:crypto';
import { customer, digest, fail, quote, verifyTransaction } from './core.mjs';
import { GatewayRejection, hostedRequest } from './gateway.mjs';
import { reverseUnfulfillable } from './reversals.mjs';

// Storage adapter uses strong reads and atomic conditional writes.
export async function createOrder(input, key, policy, store, callGateway, origin) {
  if (!/^[a-f\d-]{36}$/i.test(key || '')) fail('A checkout request ID is required.');
  const pricing = quote(input, policy);
  const buyer = customer(input);
  const fingerprint = digest(JSON.stringify({ pricing, buyer }));
  const id = digest(key).slice(0, 20); // Authorize.net invoiceNumber maximum: 20.
  const order = { mode: policy.mode || 'sandbox', id, fingerprint, quote: pricing, customer: buyer, status: 'creating', accessToken: randomBytes(32).toString('hex'), createdAt: Date.now() };
  const created = await store.setJSON(`orders/${id}`, order, { onlyIfNew: true });
  if (!created.modified) {
    const previous = await store.get(`orders/${id}`, { type: 'json' });
    if (previous.fingerprint !== fingerprint) fail('Cart changed. Start a new checkout.', 409);
    if (previous.status === 'awaiting_payment' && Date.now() < previous.tokenExpiresAt) return publicSession(previous);
    if (previous.status === 'creating') fail('Checkout is being prepared. Retry shortly.', 409);
    fail('This checkout has expired or already completed. Start a new checkout.', 409);
  }
  try {
    const result = await callGateway('getHostedPaymentPageRequest', hostedRequest(order, origin));
    if (typeof result.token !== 'string' || !result.token) fail('Payment session could not be created.', 502);
    order.status = 'awaiting_payment'; order.hostedToken = result.token; order.tokenExpiresAt = Date.now() + 14 * 60 * 1000;
    const saved = await store.setJSON(`orders/${id}`, order, { onlyIfMatch: created.etag });
    if (!saved.modified) fail('Payment session could not be saved safely.', 503);
    return publicSession(order);
  } catch (error) {
    // A definite token-creation rejection has never exposed a usable payment form.
    // Network timeouts and malformed responses are ambiguous: retain the reservation.
    if (error instanceof GatewayRejection && store.releaseReservation) {
      await store.releaseReservation(`orders/${id}`, created.etag);
    } else {
      await store.setJSON(`orders/${id}`, { ...order, status: 'payment_review', reviewReason: 'session_response_uncertain' }, { onlyIfMatch: created.etag });
    }
    throw error;
  }
}
const publicSession = order => ({ orderId: order.id, accessToken: order.accessToken, token: order.hostedToken, action: order.mode === 'production' ? 'https://accept.authorize.net/payment/payment' : 'https://test.authorize.net/payment/payment' });

export async function reconcile(transactionId, store, callGateway, verifiedWebhook=false) {
  if (!/^\d{1,30}$/.test(String(transactionId))) fail('Invalid transaction.');
  const result = await callGateway('getTransactionDetailsRequest', { transId: String(transactionId) });
  const transaction = result.transaction;
  if(String(transaction?.transId)!==String(transactionId))fail('Payment transaction ID mismatch.',409);
  const id = transaction?.order?.invoiceNumber;
  if (!/^[a-f\d]{20}$/.test(id || '')) return;
  for (let attempt = 0; attempt < 4; attempt++) {
    const entry = await store.getWithMetadata(`orders/${id}`, { type: 'json' });
    if (!entry) return;
    const order = entry.data;
    const pendingReversal=store.reversal && await store.reversal(String(transactionId));
    if(pendingReversal) {
      await reverseUnfulfillable(order,String(transactionId),store,callGateway);return;
    }
    // An auth-capture notification can arrive after a verified manual void.
    // Acknowledge the original payment without changing fulfillment or stock.
    if(order.status==='paid'&&order.transactionId===String(transactionId)&&String(transaction.transId)===String(transactionId)&&transaction.transactionStatus==='voided'){
      if(verifiedWebhook&&store.markVerifiedWebhook)await store.markVerifiedWebhook(`orders/${id}`);
      return;
    }
    if (!verifyTransaction(order, transaction)) fail('Payment does not match the order.', 409);
    if(store.recordPayment) {
      if(String(transaction.transId)!==String(transactionId))fail('Payment transaction ID mismatch.',409);
      const result=await store.recordPayment(`orders/${id}`,String(transactionId));
      if(result.reverse)await reverseUnfulfillable(order,String(transactionId),store,callGateway);
      if(verifiedWebhook && store.markVerifiedWebhook)await store.markVerifiedWebhook(`orders/${id}`);
      return;
    }
    if (order.status === 'paid') {
      if (order.transactionId !== String(transactionId)) fail('Additional payment requires manual review.', 409);
      return;
    }
    const { hostedToken, ...safeOrder } = order;
    const updated = await store.setJSON(`orders/${id}`, { ...safeOrder, status: 'paid', transactionId: String(transactionId), paidAt: Date.now() }, { onlyIfMatch: entry.etag });
    if (updated.modified) return;
  }
  fail('Payment update is busy. Retry notification.', 503);
}
