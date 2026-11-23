import { fail } from './core.mjs';
// One conditional write reserves every cart item and creates the order together.
// Production data is site-wide and survives deploys. Never reseed an existing ledger.
export function inventoryStore(blobs, catalogue) {
  const key = 'inventory-ledger-v1';
  const initial = () => ({ version: 0, remaining: Object.fromEntries(Object.entries(catalogue.products).map(([sku,p]) => [sku,p.initialStock])), orders: {} });
  const read = async () => await blobs.getWithMetadata(key,{type:'json'});
  return {
    async availability() { return (await read())?.data.remaining ?? initial().remaining; },
    async get(orderKey) { return (await this.getWithMetadata(orderKey))?.data ?? null; },
    async getWithMetadata(orderKey) { return (await read())?.data.orders[orderKey] ?? null; },
    async setJSON(orderKey, order, options = {}) {
      for(let attempt=0;attempt<12;attempt++) {
        const entry=await read();
        const state=entry?.data ?? initial();
        const current=state.orders[orderKey];
        if ((options.onlyIfNew && current) || (options.onlyIfMatch && current?.etag!==options.onlyIfMatch)) return {modified:false};
        if (!current) {
          for(const item of order.quote.items) if(!Object.hasOwn(state.remaining,item.sku) || state.remaining[item.sku]<item.quantity) fail('An item is no longer available in that quantity. Please update your cart.',409);
          for(const item of order.quote.items) state.remaining[item.sku]-=item.quantity;
        }
        const etag=String(++state.version);
        state.orders[orderKey]={data:order,etag};
        const saved=await blobs.setJSON(key,state,entry?{onlyIfMatch:entry.etag}:{onlyIfNew:true});
        if(saved.modified) return {modified:true,etag};
      }
      fail('Checkout is busy. Please retry shortly.',503);
    }
  };
}
