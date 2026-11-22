import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export class CheckoutError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const fail = (message, status) => { throw new CheckoutError(message, status); };
export const digest = value => createHash('sha256').update(value).digest('hex');
export function policyFromEnv(env) {
  // No production switch exists in this first release.
  if (env.CONTEXT !== 'deploy-preview' || env.CHECKOUT_MODE !== 'sandbox') fail('Checkout is awaiting sandbox activation.', 503);
  let p;
  try { p = JSON.parse(env.CHECKOUT_POLICY_JSON); } catch { fail('Checkout pricing is not configured.', 503); }
  if (!p || !p.products || !Number.isInteger(p.shippingCents) || p.shippingCents < 0 || !Number.isInteger(p.taxBps) || p.taxBps < 0 || p.taxBps > 10000 || typeof p.shippingTaxable !== 'boolean') fail('Checkout policy is incomplete.', 503);
  return p;
}
export function quote(input, policy) {
  if (!input || !Array.isArray(input.items) || !input.items.length || input.items.length > 20) fail('Choose at least one item.');
  if (!['pickup', 'shipping'].includes(input.fulfillment)) fail('Choose pickup or shipping.');
  const seen = new Set();
  const items = input.items.map(item => {
    if (!item || typeof item.sku !== 'string' || seen.has(item.sku)) fail('Invalid or duplicate product.');
    seen.add(item.sku);
    const product = Object.hasOwn(policy.products, item.sku) && policy.products[item.sku];
    if (!product || !Number.isSafeInteger(product.priceCents) || product.priceCents < 1 || !Number.isInteger(product.maxQuantity) || product.maxQuantity < 1) fail('This product is unavailable.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > Math.min(product.maxQuantity, 20)) fail('Please check the item quantity.');
    return { sku: item.sku, name: product.name, quantity: item.quantity, unitCents: product.priceCents, totalCents: product.priceCents * item.quantity };
  });
  const subtotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  const shippingCents = input.fulfillment === 'shipping' ? policy.shippingCents : 0;
  const taxCents = Math.round((subtotalCents + (policy.shippingTaxable ? shippingCents : 0)) * policy.taxBps / 10000);
  const totalCents = subtotalCents + shippingCents + taxCents;
  if (!Number.isSafeInteger(totalCents) || totalCents > 100000) fail('This order exceeds the checkout limit.');
  return { items, fulfillment: input.fulfillment, subtotalCents, shippingCents, taxCents, totalCents, currency: 'USD' };
}
export function customer(input) {
  const text = (value, max) => typeof value === 'string' && value.trim().length <= max ? value.trim() : '';
  const email = text(input?.email, 254);
  const name = text(input?.name, 100);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter your name and a valid email.');
  let address;
  if (input.fulfillment === 'shipping') {
    const a = input.address || {};
    address = { line1: text(a.line1, 60), city: text(a.city, 40), state: text(a.state, 2).toUpperCase(), zip: text(a.zip, 10) };
    // This initial sandbox release supports Michigan addresses only. Expand only with an approved tax policy.
    if (!address.line1 || !address.city || address.state !== 'MI' || !/^\d{5}(-\d{4})?$/.test(address.zip)) fail('For this sandbox, use a complete Michigan shipping address.');
  }
  return { name, email, ...(address ? { address } : {}) };
}
export function validSignature(body, header, key) {
  if (!/^[a-f\d]{128}$/i.test(key || '') || !/^sha512=[a-f\d]{128}$/i.test(header || '')) return false;
  const expected = createHmac('sha512', key).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(header.slice(7), 'hex'));
}
export function verifyTransaction(order, transaction) {
  return transaction?.order?.invoiceNumber === order.id
    && transaction.transactionType === 'authCaptureTransaction'
    && ['capturedPendingSettlement', 'settledSuccessfully'].includes(transaction.transactionStatus)
    && Math.round(Number(transaction.authAmount) * 100) === order.quote.totalCents;
}
