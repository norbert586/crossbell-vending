import {createSign} from 'node:crypto';
import {fail} from '../checkout/core.mjs';
export const spreadsheetId='1bbibthmPEUoyjhhfUZSKr0uBjMEzbnbbkIXMuHZ5Vrs';
export const headers=['Order ID','Placed UTC','Payment status','Fulfillment status','Fulfillment method','Items subtotal USD','Shipping USD','Tax USD','Total USD','Carrier','Tracking','Reversal ID'];
export function exportRow(o){return [o.id,new Date(o.createdAt).toISOString(),o.paymentStatus,o.fulfillmentStatus,o.quote.fulfillment,o.quote.subtotalCents/100,o.quote.shippingCents/100,o.quote.taxCents/100,o.quote.totalCents/100,o.carrier||'',o.tracking||'',o.reversalId||''];}
export function csv(rows){return rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
export async function syncInventory(db,scope,env){
 const client=await db.pool.connect();let locked=false;
 try {
 const result=await client.query("SELECT pg_try_advisory_lock(11232026) AS locked");locked=result.rows[0].locked;if(!locked)fail("Inventory sync already running.",409);
 return await performSync({pool:client},scope,env);
 } finally {if(locked)await client.query("SELECT pg_advisory_unlock(11232026)");client.release();}
}
async function performSync(db,scope,env){
 // Never send preview orders to the real inventory workbook.
 if(scope!=='production'||env.INVENTORY_SYNC_ENABLED!=='true')fail('Inventory sync is disabled in this environment.',409);
 let creds;try{creds=JSON.parse(env.INVENTORY_SERVICE_ACCOUNT_JSON||'');}catch{fail('Inventory connection setup pending.',503);}
 if(!creds.client_email||!creds.private_key)fail('Inventory connection setup pending.',503);
 const now=Math.floor(Date.now()/1000),b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const assertion=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:creds.client_email,scope:'https://www.googleapis.com/auth/spreadsheets',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const signature=createSign('RSA-SHA256').update(assertion).sign(creds.private_key,'base64url');
 const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:assertion+'.'+signature}),signal:AbortSignal.timeout(8000)});
 if(!tokenResponse.ok)fail('Inventory connection failed.',503);const token=(await tokenResponse.json()).access_token;
 // All orders, not the dashboard's 200-row window. Stable upsert of a dedicated projection only.
 const {rows}=await db.pool.query('SELECT o.data,p.fulfillment_status,p.carrier,p.tracking,p.reversal_id FROM checkout_orders o LEFT JOIN checkout_operations p ON p.scope=o.scope AND p.order_key=o.order_key WHERE o.scope=$1 ORDER BY o.data->>\'createdAt\',o.order_key',[scope]);
 const values=[headers,...rows.map(r=>exportRow({...r.data,paymentStatus:r.data.status,fulfillmentStatus:r.fulfillment_status||'new',carrier:r.carrier,tracking:r.tracking,reversalId:r.reversal_id}))];
 const result=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'Online Orders'!A1:L"+values.length)}?valueInputOption=RAW`,{method:'PUT',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({values}),signal:AbortSignal.timeout(10000)});
 if(!result.ok)fail('Inventory sync failed. Check the Online Orders tab and sharing.',503);
 return {orders:values.length-1};
}
