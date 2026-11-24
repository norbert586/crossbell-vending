import { getDatabase } from '@netlify/database';
import buildContext from '../../server/checkout/build-context.mjs';
import { validateDatabase } from '../../server/checkout/database-validation.mjs';
// Fixed, bounded, once-per-deploy validation. No payment requests or emails are sent.
export default async request=>{
  if(buildContext.CONTEXT!=='deploy-preview'||!buildContext.DEPLOY_ID) return new Response(null,{status:404});
  if(request.method!=='POST'||request.headers.get('Origin')!==new URL(buildContext.DEPLOY_PRIME_URL).origin) return new Response(null,{status:403});
  try {
    const db=getDatabase();
    const claimed=await db.pool.query('INSERT INTO checkout_validation_runs(deploy_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING deploy_id',[buildContext.DEPLOY_ID]);
    if(!claimed.rowCount){
      const {rows}=await db.pool.query('SELECT result FROM checkout_validation_runs WHERE deploy_id=$1',[buildContext.DEPLOY_ID]);
      return Response.json(rows[0]?.result??{status:'running-or-interrupted'}, {headers:{'Cache-Control':'no-store'}});
    }
    let result;
    try { result=await validateDatabase(db); }
    catch { result={passed:false,status:'failed',message:'Database validation failed. Payments remain disabled.'}; }
    await db.pool.query('UPDATE checkout_validation_runs SET result=$2::jsonb WHERE deploy_id=$1',[buildContext.DEPLOY_ID,JSON.stringify(result)]);
    return Response.json(result,{headers:{'Cache-Control':'no-store'}});
  } catch {return Response.json({status:'unavailable',message:'Database or migrations are not ready. Payments remain disabled.'},{status:503});}
};
export const config={path:'/api/checkout-validation'};
