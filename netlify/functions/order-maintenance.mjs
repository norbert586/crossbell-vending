import {getDatabase} from '@netlify/database';
import context from '../../server/checkout/build-context.mjs';
import {reminders} from '../../server/admin/orders.mjs';
import {syncInventory} from '../../server/admin/export.mjs';
export default async()=>{
 const env={...process.env,...context};
 if(env.CONTEXT!=='production'||env.ORDER_MAINTENANCE_ENABLED!=='true')return;
 const db=getDatabase();await reminders(db,'production');
 if(env.INVENTORY_SYNC_ENABLED==='true')await syncInventory(db,'production',env);
};
export const config={schedule:'0 * * * *'};
