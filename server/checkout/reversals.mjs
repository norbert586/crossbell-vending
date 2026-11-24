import {fail} from './core.mjs';
import {reversalMatches} from '../admin/orders.mjs';

// Only called for a verified extra payment or a payment without reserved stock.
// Persist the intent BEFORE the financial request. Never blindly repeat a refund.
export async function reverseUnfulfillable(order, transactionId, store, callGateway) {
  const existing=await store.reversal(transactionId);
  if(!existing || existing.status==='confirmed')return;
  const {transaction:t}=await callGateway('getTransactionDetailsRequest',{transId:transactionId});
  if(String(t?.transId)!==transactionId || t?.order?.invoiceNumber!==order.id)fail('Reversal transaction mismatch.',409);
  if(t.transactionStatus==='voided') {
    await store.finishReversal(transactionId,'confirmed',transactionId);return;
  }
  if(existing.reversal_id) {
    const {transaction:r}=await callGateway('getTransactionDetailsRequest',{transId:existing.reversal_id});
    if(reversalMatches({...order,transactionId},r,existing.reversal_id)) {
      await store.finishReversal(transactionId,'confirmed',existing.reversal_id);return;
    }
  }
  // A process crash or lost response must not produce a second financial action.
  if(existing.status!=='pending')fail('Reversal requires payment-provider reconciliation.',503);
  let transactionRequest;
  if(t.transactionStatus==='capturedPendingSettlement') {
    transactionRequest={transactionType:'voidTransaction',refTransId:transactionId};
  } else if(t.transactionStatus==='settledSuccessfully') {
    const last4=t.payment?.creditCard?.cardNumber?.slice(-4);
    if(!/^\d{4}$/.test(last4||'')) {
      await store.finishReversal(transactionId,'review');fail('Refund requires manual review.',503);
    }
    transactionRequest={transactionType:'refundTransaction',amount:(order.quote.totalCents/100).toFixed(2),payment:{creditCard:{cardNumber:last4,expirationDate:'XXXX'}},refTransId:transactionId};
  } else { fail('Payment is not ready for reversal.',503); }
  if(!await store.claimReversal(transactionId))return;
  try {
    const result=await callGateway('createTransactionRequest',{transactionRequest});
    const response=result.transactionResponse;
    if(String(response?.responseCode)!=='1' || !/^[1-9]\d{0,29}$/.test(String(response?.transId||''))) {
      await store.finishReversal(transactionId,'review');fail('Reversal requires manual review.',503);
    }
    const reversalId=String(response.transId);
    await store.finishReversal(transactionId,'uncertain',reversalId);
    const {transaction:r}=await callGateway('getTransactionDetailsRequest',{transId:reversalId});
    if(!reversalMatches({...order,transactionId},r,reversalId))fail('Reversal is awaiting verification.',503);
    await store.finishReversal(transactionId,'confirmed',reversalId);
  } catch {
    // Leave the durable record and any returned ID for read-only reconciliation.
    const latest=await store.reversal(transactionId);
    if(latest?.status==='submitting')await store.finishReversal(transactionId,'uncertain');
    fail('Reversal is awaiting verification. Do not repeat the payment.',503);
  }
}
