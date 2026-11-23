import { fail } from './core.mjs';
export function paymentEnvironment(context) {
  if (context === 'production') return 'production';
  if (['deploy-preview', 'branch-deploy', 'dev'].includes(context)) return 'sandbox';
  fail('Unknown deploy context. Payments are disabled.', 503);
}
export async function gateway(name, payload, env, fetcher = fetch) {
  if (!env.AUTHNET_API_LOGIN_ID || !env.AUTHNET_TRANSACTION_KEY) fail('Payment credentials are missing.', 503);
  const production = paymentEnvironment(env.CONTEXT) === 'production';
  const response = await fetcher(production ? 'https://api.authorize.net/xml/v1/request.api' : 'https://apitest.authorize.net/xml/v1/request.api', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(12000),
    body: JSON.stringify({ [name]: { merchantAuthentication: { name: env.AUTHNET_API_LOGIN_ID, transactionKey: env.AUTHNET_TRANSACTION_KEY }, ...payload } })
  });
  if (!response.ok) fail('Payment provider is unavailable. Please try again.', 502);
  const data = JSON.parse((await response.text()).replace(/^\uFEFF/, ''));
  if (data.messages?.resultCode !== 'Ok') fail('Payment provider could not complete this request.', 502);
  return data;
}
export function hostedRequest(order, origin) {
  const settings = {
    hostedPaymentReturnOptions: { showReceipt: true, url: `${origin}/checkout/?returned=1`, urlText: 'Return to Crossbell', cancelUrl: `${origin}/checkout/?cancelled=1`, cancelUrlText: 'Return to checkout' },
    hostedPaymentButtonOptions: { text: order.mode === 'production' ? 'Pay order' : 'Pay sandbox order' },
    hostedPaymentStyleOptions: { bgColor: '#BCA16A' },
    hostedPaymentPaymentOptions: { cardCodeRequired: true, showCreditCard: true, showBankAccount: false },
    hostedPaymentBillingAddressOptions: { show: true, required: true },
    hostedPaymentCustomerOptions: { showEmail: true, requiredEmail: true, addPaymentProfile: false }
  };
  const transactionRequest = {
    transactionType: 'authCaptureTransaction', amount: (order.quote.totalCents / 100).toFixed(2),
    order: { invoiceNumber: order.id, description: order.mode === 'production' ? `Crossbell pickup: ${order.quote.pickupLocation}` : 'Crossbell sandbox checkout' },
    customer: { email: order.customer.email }
  };
  if (order.customer.address) {
    const a = order.customer.address;
    transactionRequest.shipTo = { firstName: order.customer.name.slice(0, 50), address: a.line1, city: a.city, state: a.state, zip: a.zip, country: 'USA' };
  }
  return { transactionRequest, hostedPaymentSettings: { setting: Object.entries(settings).map(([settingName, value]) => ({ settingName, settingValue: JSON.stringify(value) })) } };
}
