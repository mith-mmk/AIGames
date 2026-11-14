import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {RAMP_DESCENT,RAMP_HANDOFF} from './ramp-profile.mjs';
import {RAMP_POINTS,WIRE_TAIL,WIRE_START_FRACTION,WIRE_GUARD_SPACING,sampleRamp,sampleRampPose,rampWireRails} from './ramp-geometry.mjs';

test('wire tail preserves prefix, endpoint, position and unit-tangent continuity',()=>{
 const old=RAMP_POINTS.map(p=>[...p]);old[old.length-1]=[-1.55,.44,3.15];
 const curve=new T.CatmullRomCurve3(old.map(p=>new T.Vector3(...p)),false,'centripetal'),rows=sampleRamp();
 // The local rear descent/handoff intentionally changes Y before this tail.
 // Preserve every other prefix position/tangent exactly, and all prefix XZ.
 // Its endpoint C1 and material drop are independently checked in ramp-profile.
 for(let i=0;i<=192;i++){
  const u=i/240,p=curve.getPoint(u),t=curve.getTangent(u);
  assert.equal(rows[i].p.x,p.x);assert.equal(rows[i].p.z,p.z);
  const inProfile=u>Math.min(RAMP_DESCENT.start,RAMP_HANDOFF.start)&&u<Math.max(RAMP_DESCENT.end,RAMP_HANDOFF.end);
  if(!inProfile){
   assert.ok(rows[i].p.distanceTo(p)<1e-12);
   assert.ok(rows[i].t.distanceTo(t)<1e-10);
  }
 }
 const end=sampleRampPose(1),d=WIRE_TAIL;
 assert.ok(end.p.distanceTo(new T.Vector3(...RAMP_POINTS.at(-1)))<1e-12);
 assert.ok(Math.abs(end.t.x/end.t.z-.171)<1e-12);
 for(const q of[d.startFraction,d.bridgeEndFraction,(1+d.bridgeEndFraction)/2]){
  const a=sampleRampPose(q-1e-8),b=sampleRampPose(q),c=sampleRampPose(q+1e-8);
  assert.ok(a.p.distanceTo(b.p)<1e-6&&c.p.distanceTo(b.p)<1e-6);
  assert.ok(a.t.dot(b.t)>1-1e-10&&c.t.dot(b.t)>1-1e-10,'unit tangents, not parameter speed');
 }
});
test('wire tail curvature and every physical offset rail progress without folds',()=>{
 const rows=sampleRamp(24000);let minRadius=Infinity;
 for(let i=19201;i<rows.length-1;i++){
  const a=rows[i-1].p,b=rows[i].p,c=rows[i+1].p,ux=b.x-a.x,uz=b.z-a.z,vx=c.x-b.x,vz=c.z-b.z;
  const k=2*Math.abs(ux*vz-uz*vx)/(Math.hypot(ux,uz)*Math.hypot(vx,vz)*Math.hypot(c.x-a.x,c.z-a.z));
  if(k>0)minRadius=Math.min(minRadius,1/k);
 }
 assert.ok(minRadius>=.23);assert.ok(1-WIRE_GUARD_SPACING/minRadius>=.24);
 const tail=sampleRamp().slice(192);
 for(const rail of rampWireRails(tail))for(let i=1;i<tail.length;i++){
  const a=rail[i-1],b=rail[i],c=tail[i-1].p,d=tail[i].p;
  assert.ok((b.x-a.x)*(d.x-c.x)+(b.z-a.z)*(d.z-c.z)>0);
 }
});
test('sampled wire rails have no self or same-height pair crossing',()=>{
 const rows=sampleRamp().slice(Math.round(240*WIRE_START_FRACTION)),rails=rampWireRails(rows);
 const orient=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
 for(let j=0;j<rails.length;j++)for(let k=j;k<rails.length;k++){
  if(j!==k&&j%2!==k%2)continue; // guards and running rails have different heights
  for(let i=1;i<rows.length;i++)for(let n=1;n<rows.length;n++){
   if(j===k&&Math.abs(i-n)<=1)continue;
   const a=rails[j][i-1],b=rails[j][i],c=rails[k][n-1],d=rails[k][n];
   assert.ok(!(orient(a,b,c)*orient(a,b,d)<-1e-15&&orient(c,d,a)*orient(c,d,b)<-1e-15),JSON.stringify({j,k,i,n}));
  }
 }
});
test('every physical wire segment clears all visible sling solids by .025',async()=>{
 await import('../../../scripts/pinball-sling-clearance.mjs');
});
