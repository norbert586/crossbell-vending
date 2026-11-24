import productionCatalogue from './production-catalogue.json' with { type: 'json' };
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export class CheckoutError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const fail = (message, status) => { throw new CheckoutError(message, status); };
export const digest = value => createHash('sha256').update(value).digest('hex');
export function policyFromEnv(env) {
  if (env.CONTEXT === 'production' && env.CHECKOUT_MODE === 'production') {
    if (!env.AUTHNET_API_LOGIN_ID || !env.AUTHNET_TRANSACTION_KEY || !/^[a-f\d]{128}$/i.test(env.AUTHNET_SIGNATURE_KEY || '')) fail('Payment configuration is incomplete.', 503);
    return { ...productionCatalogue, mode: 'production' };
  }
  if (env.CONTEXT !== 'deploy-preview' || env.CHECKOUT_MODE !== 'sandbox') fail('Checkout is awaiting sandbox activation.', 503);
  let p;
  try { p = JSON.parse(env.CHECKOUT_POLICY_JSON); } catch { fail('Checkout pricing is not configured.', 503); }
  if (!p || !p.products || !Number.isInteger(p.shippingCents) || p.shippingCents < 0 || !Number.isInteger(p.taxBps) || p.taxBps < 0 || p.taxBps > 10000 || typeof p.shippingTaxable !== 'boolean') fail('Checkout policy is incomplete.', 503);
  return { ...p, ...productionCatalogue, mode: 'sandbox' };
}
export function quote(input, policy) {
  if (!input || !Array.isArray(input.items) || !input.items.length || input.items.length > 20) fail('Choose at least one item.');
  if (!['pickup', 'shipping'].includes(input.fulfillment)) fail('Choose pickup or shipping.');
  if (policy.shippingEnabled === false && input.fulfillment !== 'pickup') fail('UPS shipping is coming soon. Choose free pickup.');
  if (policy.pickupLocations && !Object.hasOwn(policy.pickupLocations, input.pickupLocation || '')) fail('Choose a pickup location.');
  const seen = new Set();
  const items = input.items.map(item => {
    if (!item || typeof item.sku !== 'string' || seen.has(item.sku)) fail('Invalid or duplicate product.');
    seen.add(item.sku);
    const product = Object.hasOwn(policy.products, item.sku) && policy.products[item.sku];
    if (!product || product.saleEnabled === false || !Number.isSafeInteger(product.priceCents) || product.priceCents < 1 || !Number.isInteger(product.maxQuantity) || product.maxQuantity < 1) fail('This product is unavailable.');
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > Math.min(product.maxQuantity, 20)) fail('Please check the item quantity.');
    return { sku: item.sku, name: product.name, quantity: item.quantity, unitCents: product.priceCents, totalCents: product.priceCents * item.quantity };
  });
  const subtotalCents = items.reduce((sum, item) => sum + item.totalCents, 0);
  const shippingCents = input.fulfillment === 'shipping' ? policy.shippingCents : 0;
  const taxCents = Math.round((subtotalCents + (policy.shippingTaxable ? shippingCents : 0)) * policy.taxBps / 10000);
  const totalCents = subtotalCents + shippingCents + taxCents;
  if (!Number.isSafeInteger(totalCents) || totalCents > 100000) fail('This order exceeds the checkout limit.');
  return { items, ...(policy.pickupLocations ? { pickupLocation: input.pickupLocation, pickupDetails: policy.pickupLocations[input.pickupLocation] } : {}), fulfillment: input.fulfillment, subtotalCents, shippingCents, taxCents, totalCents, currency: 'USD' };
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
export function amountCents(amount){
  const match=/^(\d{1,10})(?:\.(\d{1,2}))?$/.exec(String(amount));
  if(!match)return null;
  const cents=Number(match[1])*100+Number((match[2]||'').padEnd(2,'0'));
  return Number.isSafeInteger(cents)?cents:null;
}
export function verifyTransaction(order, transaction) {
  return transaction?.order?.invoiceNumber === order.id
    && (order.quote.currency||'USD')==='USD'
    && (transaction.currencyCode??transaction.verifiedCurrency)==='USD'
    && (transaction.responseCode===undefined||String(transaction.responseCode)==='1')
    && transaction.transactionType === 'authCaptureTransaction'
    && ['capturedPendingSettlement', 'settledSuccessfully'].includes(transaction.transactionStatus)
    && amountCents(transaction.authAmount) === order.quote.totalCents
    && (transaction.transactionStatus!=='settledSuccessfully'||transaction.settleAmount===undefined||amountCents(transaction.settleAmount)===order.quote.totalCents);
}
