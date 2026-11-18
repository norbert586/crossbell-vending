import { fail } from './core.mjs';
export async function gateway(name, payload, env, fetcher = fetch) {
  if (!env.AUTHNET_API_LOGIN_ID || !env.AUTHNET_TRANSACTION_KEY) fail('Sandbox credentials are missing.', 503);
  const response = await fetcher('https://apitest.authorize.net/xml/v1/request.api', {
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
    hostedPaymentButtonOptions: { text: 'Pay sandbox order' },
    hostedPaymentStyleOptions: { bgColor: '#BCA16A' },
    hostedPaymentPaymentOptions: { cardCodeRequired: true, showCreditCard: true, showBankAccount: false },
    hostedPaymentBillingAddressOptions: { show: true, required: true },
    hostedPaymentCustomerOptions: { showEmail: true, requiredEmail: true, addPaymentProfile: false }
  };
  const transactionRequest = {
    transactionType: 'authCaptureTransaction', amount: (order.quote.totalCents / 100).toFixed(2),
    order: { invoiceNumber: order.id, description: 'Crossbell sandbox checkout' },
    customer: { email: order.customer.email }
  };
  if (order.customer.address) {
    const a = order.customer.address;
    transactionRequest.shipTo = { firstName: order.customer.name.slice(0, 50), address: a.line1, city: a.city, state: a.state, zip: a.zip, country: 'USA' };
  }
  return { transactionRequest, hostedPaymentSettings: { setting: Object.entries(settings).map(([settingName, value]) => ({ settingName, settingValue: JSON.stringify(value) })) } };
}
