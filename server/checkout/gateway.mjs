import { CheckoutError, fail } from './core.mjs';
export class GatewayRejection extends CheckoutError {
  constructor(data={}) {
    super('Payment provider could not complete this request.', 502);
    this.responseCode=['1','2','3','4'].includes(String(data.transactionResponse?.responseCode))?String(data.transactionResponse.responseCode):null;
    this.duplicate=Array.isArray(data.transactionResponse?.errors)&&data.transactionResponse.errors.some(e=>String(e.errorCode)==='11');
  }
}
export function paymentEnvironment(context) {
  if (context === 'production') return 'production';
  if (['deploy-preview', 'branch-deploy', 'dev'].includes(context)) return 'sandbox';
  fail('Unknown deploy context. Payments are disabled.', 503);
}
export async function gateway(name, payload, env, fetcher = fetch) {
  if (!env.AUTHNET_API_LOGIN_ID || !env.AUTHNET_TRANSACTION_KEY) fail('Payment credentials are missing.', 503);
  const production = paymentEnvironment(env.CONTEXT) === 'production';
  let response;
  try { response = await fetcher(production ? 'https://api.authorize.net/xml/v1/request.api' : 'https://apitest.authorize.net/xml/v1/request.api', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(12000),
    body: JSON.stringify({ [name]: { merchantAuthentication: { name: env.AUTHNET_API_LOGIN_ID, transactionKey: env.AUTHNET_TRANSACTION_KEY }, ...payload } })
  }); } catch { fail('Payment provider response is uncertain. Do not submit another payment.', 503); }
  if (!response.ok) fail('Payment provider is unavailable. Please try again.', 502);
  let data;
  try { data = JSON.parse((await response.text()).replace(/^\uFEFF/, '')); }
  catch { fail('Payment provider response is uncertain. Do not submit another payment.', 503); }
  if (data.messages?.resultCode === 'Error') throw new GatewayRejection(data);
  if (data.messages?.resultCode !== 'Ok') fail('Payment provider response is uncertain. Do not submit another payment.', 503);
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
    customer: { email: order.customer.email },
    transactionSettings: { setting: [{ settingName: 'duplicateWindow', settingValue: '120' }] }
  };
  if (order.customer.address) {
    const a = order.customer.address;
    transactionRequest.shipTo = { firstName: order.customer.name.slice(0, 50), address: a.line1, city: a.city, state: a.state, zip: a.zip, country: 'USA' };
  }
  return { transactionRequest, hostedPaymentSettings: { setting: Object.entries(settings).map(([settingName, value]) => ({ settingName, settingValue: JSON.stringify(value) })) } };
}
