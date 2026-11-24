import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { updateOrder, stockAdjustment, reminders } from '../admin/orders.mjs';
import { databaseStore } from './database.mjs';
// Executes against the real deployed database driver. No in-memory storage.
export async function validateDatabase(db) {
  const scope=`validation-${randomUUID()}`;
  const policy={products:{'last-unit':{initialStock:1},'other':{initialStock:2}}};
  const stores=Array.from({length:12},()=>databaseStore(db,policy,scope));
  const order=items=>({status:'creating',customer:{email:'checkout-test@example.invalid'},quote:{items}});
  const results=[];
  try {
    const races=await Promise.allSettled(stores.map((store,i)=>store.setJSON(`orders/race-${i}`,order([{sku:'last-unit',quantity:1}]),{onlyIfNew:true})));
    assert.equal(races.filter(r=>r.status==='fulfilled'&&r.value.modified).length,1);
    assert.equal((await stores[0].availability())['last-unit'],0);
    results.push('12 concurrent purchases of the last unit: exactly 1 reservation');
    const winner=races.findIndex(r=>r.status==='fulfilled'&&r.value.modified);
    const repeated=await stores[1].setJSON(`orders/race-${winner}`,order([{sku:'last-unit',quantity:1}]),{onlyIfNew:true});
    assert.equal(repeated.modified,false);
    results.push('Duplicate order does not decrement stock again');
    await assert.rejects(()=>stores[0].setJSON('orders/multi',order([{sku:'other',quantity:1},{sku:'last-unit',quantity:1}]),{onlyIfNew:true}));
    assert.equal((await stores[0].availability()).other,2);
    assert.equal(await stores[0].get('orders/multi'),null);
    results.push('Multi-product stock failure rolls back the whole order');
    const record=await stores[0].getWithMetadata(`orders/race-${winner}`);
    const updates=await Promise.all(stores.slice(0,2).map(store=>store.setJSON(`orders/race-${winner}`,{...record.data,status:'paid'},{onlyIfMatch:record.etag})));
    assert.equal(updates.filter(r=>r.modified).length,1);
    const {rows}=await db.pool.query('SELECT audience,sender,recipient FROM checkout_email_outbox WHERE scope=$1',[scope]);
    assert.equal(rows.length,2);
    assert.ok(rows.every(row=>row.sender==='contact@crossbellvending.com'));
    assert.equal(rows.find(row=>row.audience==='internal').recipient,'contact@crossbellvending.com');
    results.push('Concurrent payment update creates exactly 2 email jobs with approved addresses');
    const id='a'.repeat(20),key=`orders/${id}`;
    const adminOrder={id,status:'paid',transactionId:'123',paidAt:Date.now()-15*86400000,customer:{email:'checkout-test@example.invalid'},quote:{fulfillment:'pickup',items:[{sku:'other',quantity:1}],totalCents:100}};
    await stores[0].setJSON(key,adminOrder,{onlyIfNew:true});
    const ready=await Promise.allSettled([1,2].map(()=>updateOrder(db,scope,'test@example.invalid',{id,version:'0',action:'ready'},()=>{throw Error('Unexpected gateway call');})));
    assert.equal(ready.filter(r=>r.status==='fulfilled').length,1);
    await reminders(db,scope);await reminders(db,scope);
    const events=await db.pool.query('SELECT kind FROM checkout_admin_events WHERE scope=$1 AND order_key=$2',[scope,key]);
    assert.equal(events.rows.filter(r=>r.kind==='ready_for_pickup').length,1);
    assert.equal(events.rows.filter(r=>r.kind==='pickup_overdue').length,1);
    results.push('Concurrent admin ready actions and repeated reminders queue each event once');
    const adjust=await Promise.allSettled([1,2].map(()=>stockAdjustment(db,scope,'test@example.invalid',{sku:'other',delta:-1,expected:1,reason:'validation transfer'})));
    assert.equal(adjust.filter(r=>r.status==='fulfilled').length,1);
    results.push('Concurrent online-stock transfers cannot overdraw or use stale availability');
    const refunds=await Promise.allSettled([1,2].map(()=>updateOrder(db,scope,'test@example.invalid',{id,version:'2',action:'reconcile_reversal',transactionId:'123'},async()=>({transaction:{transId:'123',transactionStatus:'voided'}}))));
    assert.equal(refunds.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await stores[0].availability()).other,1);
    results.push('Duplicate verified void reconciliation restores stock exactly once');
    const releasedId='b'.repeat(20),releasedKey=`orders/${releasedId}`;
    const pending={id:releasedId,...order([{sku:'other',quantity:1}])};
    const inserted=await stores[0].setJSON(releasedKey,pending,{onlyIfNew:true});
    const releases=await Promise.all(stores.map(s=>s.releaseReservation(releasedKey,inserted.etag)));
    assert.equal(releases.filter(r=>r.modified).length,1);
    assert.equal((await stores[0].availability()).other,1);
    results.push('Concurrent definitive session rejection releases reserved stock exactly once');
    const late=await stores[0].recordPayment(releasedKey,'987');
    assert.equal(late.reverse,true);
    assert.notEqual((await stores[0].get(releasedKey)).status,'paid');
    const claims=await Promise.all(stores.map(s=>s.claimReversal('987')));
    assert.equal(claims.filter(Boolean).length,1);
    results.push('Late payment after stock release queues one reversal; concurrent workers claim it once');
    const paidKey=`orders/${'c'.repeat(20)}`;
    await stores[0].setJSON(paidKey,order([{sku:'other',quantity:1}]),{onlyIfNew:true});
    const captures=await Promise.all(stores.slice(0,2).map((s,i)=>s.recordPayment(paidKey,String(888+i))));
    assert.equal(captures.filter(r=>r.paid).length,1);assert.equal(captures.filter(r=>r.reverse).length,1);
    results.push('Concurrent distinct captures accept one payment and queue the extra payment for reversal');
    // Expiry and provider capture contend for the same order row. Either outcome is safe.
    await stockAdjustment(db,scope,'test@example.invalid',{sku:'other',delta:1,expected:0,reason:'expiry race fixture'});
    const expiryKey=`orders/${'d'.repeat(20)}`;
    await stores[0].setJSON(expiryKey,{...order([{sku:'other',quantity:1}]),createdAt:Date.now()-31*60000},{onlyIfNew:true});
    await Promise.all([stores[0].expireReservations(),stores[1].recordPayment(expiryKey,'777')]);
    const final=await stores[0].get(expiryKey),balance=(await stores[0].availability()).other;
    if(final.status==='paid'){assert.equal(balance,0);assert.equal(await stores[0].reversal('777'),undefined);}
    else{assert.equal(final.status,'expired');assert.equal(balance,1);assert.ok(await stores[0].reversal('777'));}
    await stores[0].expireReservations();assert.equal((await stores[0].availability()).other,balance);
    results.push('Reservation expiry racing payment either preserves paid stock or queues reversal, without double restock');
    return {passed:results.length,failed:0,checks:results};
  } finally {
    // Only this random validation namespace is touched, never sandbox inventory or production.
    const client=await db.pool.connect();
    try {
      await client.query('BEGIN');
      for(const table of ['checkout_payment_reversals','checkout_admin_events','checkout_admin_audit','checkout_operations','checkout_email_outbox','checkout_orders','checkout_stock','checkout_scopes']) await client.query(`DELETE FROM ${table} WHERE scope=$1`,[scope]);
      await client.query('COMMIT');
    } catch(error) {await client.query('ROLLBACK').catch(()=>{});throw error;}
    finally {client.release();}
  }
}
