import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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
    return {passed:results.length,failed:0,checks:results};
  } finally {
    // Only this random validation namespace is touched, never sandbox inventory or production.
    const client=await db.pool.connect();
    try {
      await client.query('BEGIN');
      for(const table of ['checkout_email_outbox','checkout_orders','checkout_stock','checkout_scopes']) await client.query(`DELETE FROM ${table} WHERE scope=$1`,[scope]);
      await client.query('COMMIT');
    } catch(error) {await client.query('ROLLBACK').catch(()=>{});throw error;}
    finally {client.release();}
  }
}
