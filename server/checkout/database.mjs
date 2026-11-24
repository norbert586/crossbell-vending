import { fail } from './core.mjs';
import { orderEmail } from './email-config.mjs';

// All reservation and order mutations use one Postgres transaction/connection.
// Never log connection strings, SQL parameter values, or customer records.
export function databaseStore(db, catalogue, scope) {
  if (!/^(production|sandbox-[a-zA-Z0-9-]+|validation-[a-f0-9-]+)$/.test(scope)) fail('Invalid stock scope.',503);
  let ready;
  async function transaction(work) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout = '10s'");
      const value = await work(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK').catch(()=>{});
      throw error;
    } finally { client.release(); }
  }
  async function initialize() {
    if (!ready) ready=transaction(async client => {
      const inserted=await client.query('INSERT INTO checkout_scopes(scope) VALUES($1) ON CONFLICT DO NOTHING RETURNING scope',[scope]);
      if (!inserted.rowCount) return;
      for (const [sku,p] of Object.entries(catalogue.products)) {
        if (!Number.isInteger(p.initialStock) || p.initialStock<0) fail('Invalid initial stock.',503);
        await client.query('INSERT INTO checkout_stock(scope,sku,remaining) VALUES($1,$2,$3)',[scope,sku,p.initialStock]);
      }
    }).catch(error=>{ready=undefined;throw error;});
    await ready;
  }
  return {
    async expireReservations(now=Date.now()) {
      await initialize();
      return transaction(async client=>{
        const {rows}=await client.query("SELECT order_key,data FROM checkout_orders WHERE scope=$1 AND data->>'status' IN ('creating','awaiting_payment','payment_review') AND NOT COALESCE((data->>'stockReleased')::boolean,false) AND (data->>'createdAt')::bigint<$2 ORDER BY order_key FOR UPDATE SKIP LOCKED LIMIT 50",[scope,now-30*60*1000]);
        for(const row of rows){
          for(const item of [...row.data.quote.items].sort((a,b)=>a.sku.localeCompare(b.sku)))await client.query('UPDATE checkout_stock SET remaining=remaining+$3 WHERE scope=$1 AND sku=$2',[scope,item.sku,item.quantity]);
          const {hostedToken,...safe}=row.data;
          await client.query('UPDATE checkout_orders SET data=$3::jsonb,version=version+1,updated_at=now() WHERE scope=$1 AND order_key=$2',[scope,row.order_key,JSON.stringify({...safe,status:'expired',stockReleased:true,expiredAt:now})]);
        }
        return rows.length;
      });
    },
    async recordPayment(orderKey, transactionId) {
      await initialize();
      return transaction(async client => {
        const {rows}=await client.query('SELECT data FROM checkout_orders WHERE scope=$1 AND order_key=$2 FOR UPDATE',[scope,orderKey]);
        const order=rows[0]?.data;
        if(!order) return {ignored:true};
        if(order.transactionId===transactionId) return {duplicate:true};
        if(order.stockReleased || order.transactionId) {
          const reason=order.stockReleased?'reservation_released':'additional_payment';
          await client.query('INSERT INTO checkout_payment_reversals(scope,transaction_id,order_key,reason) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',[scope,transactionId,orderKey,reason]);
          return {reverse:true};
        }
        const {hostedToken,...safe}=order;
        await client.query('UPDATE checkout_orders SET data=$3::jsonb,version=version+1,updated_at=now() WHERE scope=$1 AND order_key=$2',[scope,orderKey,JSON.stringify({...safe,status:'paid',transactionId,paidAt:Date.now()})]);
        for(const [audience,recipient] of [['customer',order.customer.email],['internal',orderEmail.internalTo]]) {
          await client.query('INSERT INTO checkout_email_outbox(scope,order_key,audience,sender,recipient) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[scope,orderKey,audience,orderEmail.from,recipient]);
        }
        return {paid:true};
      });
    },
    async reversal(transactionId) {
      const {rows}=await db.pool.query('SELECT status,reversal_id FROM checkout_payment_reversals WHERE scope=$1 AND transaction_id=$2',[scope,transactionId]);
      return rows[0];
    },
    async claimReversal(transactionId) {
      const result=await db.pool.query("UPDATE checkout_payment_reversals SET status='submitting',updated_at=now() WHERE scope=$1 AND transaction_id=$2 AND status='pending' RETURNING transaction_id",[scope,transactionId]);
      return result.rowCount===1;
    },
    async finishReversal(transactionId,status,reversalId=null) {
      await db.pool.query('UPDATE checkout_payment_reversals SET status=$3,reversal_id=COALESCE($4,reversal_id),updated_at=now() WHERE scope=$1 AND transaction_id=$2',[scope,transactionId,status,reversalId]);
    },
    async availability() {
      await initialize();
      const {rows}=await db.pool.query('SELECT sku,remaining FROM checkout_stock WHERE scope=$1',[scope]);
      return Object.fromEntries(rows.map(row=>[row.sku,row.remaining]));
    },
    async markVerifiedWebhook(orderKey) {
      await db.pool.query("UPDATE checkout_orders SET data=jsonb_set(data,'{verifiedWebhookAt}',to_jsonb(now()::text)),version=version+1 WHERE scope=$1 AND order_key=$2",[scope,orderKey]);
    },
    async get(orderKey) { return (await this.getWithMetadata(orderKey))?.data ?? null; },
    async releaseReservation(orderKey, version) {
      await initialize();
      return transaction(async client => {
        const { rows } = await client.query('SELECT data,version::text AS etag FROM checkout_orders WHERE scope=$1 AND order_key=$2 FOR UPDATE', [scope,orderKey]);
        const entry=rows[0];
        if (!entry || entry.etag!==version || entry.data.status!=='creating' || entry.data.stockReleased) return {modified:false};
        for(const item of [...entry.data.quote.items].sort((a,b)=>a.sku.localeCompare(b.sku))) {
          await client.query('UPDATE checkout_stock SET remaining=remaining+$3 WHERE scope=$1 AND sku=$2',[scope,item.sku,item.quantity]);
        }
        const {hostedToken,...safe}=entry.data;
        await client.query('UPDATE checkout_orders SET data=$3::jsonb,version=version+1,updated_at=now() WHERE scope=$1 AND order_key=$2',[scope,orderKey,JSON.stringify({...safe,status:'session_rejected',stockReleased:true})]);
        return {modified:true};
      });
    },
    async getWithMetadata(orderKey) {
      await initialize();
      const {rows}=await db.pool.query('SELECT data,version::text AS etag FROM checkout_orders WHERE scope=$1 AND order_key=$2',[scope,orderKey]);
      return rows[0] ?? null;
    },
    async setJSON(orderKey,order,options={}) {
      await initialize();
      return transaction(async client=>{
        if(options.onlyIfNew) {
          const created=await client.query('INSERT INTO checkout_orders(scope,order_key,data) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING RETURNING version::text AS etag',[scope,orderKey,JSON.stringify(order)]);
          if (!created.rowCount) return {modified:false};
          // A stable SKU order avoids cross-cart deadlocks. A failure rolls back EVERY decrement and the order insert.
          for(const item of [...order.quote.items].sort((a,b)=>a.sku.localeCompare(b.sku))) {
            if(!Number.isInteger(item.quantity)||item.quantity<1) fail('Invalid stock quantity.');
            const reserved=await client.query('UPDATE checkout_stock SET remaining=remaining-$3 WHERE scope=$1 AND sku=$2 AND remaining >= $3 RETURNING remaining',[scope,item.sku,item.quantity]);
            if(!reserved.rowCount) fail('An item is no longer available in that quantity. Please update your cart.',409);
          }
          return {modified:true,etag:created.rows[0].etag};
        }
        if(!options.onlyIfMatch) fail('Order update requires a version.',503);
        const updated=await client.query('UPDATE checkout_orders SET data=$4::jsonb,version=version+1,updated_at=now() WHERE scope=$1 AND order_key=$2 AND version=$3::bigint RETURNING version::text AS etag',[scope,orderKey,options.onlyIfMatch,JSON.stringify(order)]);
        if(!updated.rowCount) return {modified:false};
        if(order.status==='paid') {
          for(const [audience,recipient] of [['customer',order.customer.email],['internal',orderEmail.internalTo]]) {
            await client.query('INSERT INTO checkout_email_outbox(scope,order_key,audience,sender,recipient) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[scope,orderKey,audience,orderEmail.from,recipient]);
          }
        }
        return {modified:true,etag:updated.rows[0].etag};
      });
    }
  };
}
