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
    async availability() {
      await initialize();
      const {rows}=await db.pool.query('SELECT sku,remaining FROM checkout_stock WHERE scope=$1',[scope]);
      return Object.fromEntries(rows.map(row=>[row.sku,row.remaining]));
    },
    async get(orderKey) { return (await this.getWithMetadata(orderKey))?.data ?? null; },
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
