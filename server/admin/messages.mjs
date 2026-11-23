export function notification(kind,order,operations={}){
 const id=order.id,contact='contact@crossbellvending.com';
 const texts={
 ready_for_pickup:`Order ${id} is ready for pickup at ${order.quote.pickupDetails?.name||'your selected location'}. Contact ${contact} to arrange a time.`,
 shipped:`Order ${id} has been handed to ${operations.carrier||'the carrier'}. Tracking: ${operations.tracking||'Contact us for tracking'}.`,
 cancelled:`Order ${id} has been cancelled.`,
 refunded:`The payment reversal for order ${id} has been verified. Your bank may take additional time to update your account.`,
 pickup_reminder:`Reminder: order ${id} is awaiting pickup. Please contact ${contact} to arrange collection. Pickup orders are held for 14 days.`,
 pickup_overdue:`Order ${id} has reached the 14-day pickup hold. Contact the customer before manually cancelling and refunding if still uncollected.`
 };
 return {subject:`Crossbell Vending · ${kind.replaceAll('_',' ')} · ${id}`,text:texts[kind]||`Order ${id} needs review.`};
}
