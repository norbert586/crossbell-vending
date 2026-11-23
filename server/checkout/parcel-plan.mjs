import research from './shipping-profiles.json' with { type:'json' };
import { fail } from './core.mjs';
// Proposed outer cartons and combined carton/cushioning/tape allowances, NOT measured packaging.
const cartons=[
 {dimensionsIn:[9,6,2],packagingOz:3},
 {dimensionsIn:[9,6,4],packagingOz:6},
 {dimensionsIn:[10,10,6],packagingOz:10},
 {dimensionsIn:[10,10,10],packagingOz:12},
 {dimensionsIn:[12,12,16],packagingOz:18}
];
export function estimateParcel(items) {
 if(!Array.isArray(items)||!items.length) fail('Choose items before estimating shipping.');
 let longest=0,widest=0,stack=0,productWeightOz=0,hasBox=false,total=0;
 const seen=new Set();
 for(const item of items){
  const p=research.profiles[item.sku];
  if(!p||p.identityConfirmed===false) fail('Product details must be confirmed before shipping can be calculated.',409);
  if(seen.has(item.sku)||!Number.isInteger(item.quantity)||item.quantity<1||item.quantity>20) fail('Invalid shipping quantity.');
  seen.add(item.sku);total+=item.quantity;
  // Loose packs fit within this intentionally conservative sleeved-pack envelope.
  const dims=p.kind==='pack'?[6.9,3.8,0.3]:[...p.dimensionsIn].sort((a,b)=>b-a);
  longest=Math.max(longest,dims[0]);widest=Math.max(widest,dims[1]);stack+=dims[2]*item.quantity;
  productWeightOz+=p.planningWeightOz*item.quantity;hasBox ||= p.kind==='box';
 }
 if(total>100) fail('This cart needs a custom shipping quote.',409);
 const padding=hasBox?2:1;
 // Subtract half an inch from outer dimensions as a provisional cardboard allowance.
 const carton=cartons.find(c=>c.dimensionsIn[0]-0.5>=longest+padding&&c.dimensionsIn[1]-0.5>=widest+padding&&c.dimensionsIn[2]-0.5>=stack+padding);
 if(!carton) fail('This cart needs a larger carton or multiple-parcel quote.',409);
 return {dimensionsIn:carton.dimensionsIn,weightOz:Math.ceil(productWeightOz+carton.packagingOz),productWeightOz,packagingOz:carton.packagingOz,measurementStatus:'estimated',readyForLiveRates:false};
}
