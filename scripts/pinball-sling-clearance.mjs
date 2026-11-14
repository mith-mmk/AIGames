import assert from 'node:assert/strict';
// Sampled geometric regression: all sling solids vs overhead left-return hardware.
// Includes rail tube envelope, mesh vertices and triangle centroids. Not a CAD proof.
import * as T from '../web/js/vendor/three-0.180.0/three.module.min.js';import{MechanicalSling}from '../web/js/pinball/components/sling-target.mjs';import{LOWER_LAYOUT}from '../web/js/pinball/layout.mjs';import{sampleRamp,rampWireRails,WIRE_START_FRACTION,WIRE_RADIUS}from '../web/js/pinball/ramp-geometry.mjs';
const roots=[];for(const side of [-1,1]){const center=[side*LOWER_LAYOUT.slingCenter[0],LOWER_LAYOUT.slingCenter[1]];let s=new MechanicalSling({points:LOWER_LAYOUT.slingVertices.map(([x,z])=>[side*x-center[0],z-center[1]]),rubberHeight:.22,coverHeight:LOWER_LAYOUT.slingCoverHeight});s.root.position.set(center[0],0,center[1]);s.root.updateMatrixWorld(true);roots.push(s.root);}
const rows=sampleRamp(2400),rails=rampWireRails(rows.slice(Math.round(2400*WIRE_START_FRACTION)));let best={gap:Infinity};let checks=0,railSamples=0;const ray=new T.Raycaster();
for(const rail of rails)for(const p of rail)if(p.z>.8&&p.z<2.9)for(let j=-4;j<=4;j++){railSamples++;const xoffset=WIRE_RADIUS*j/4;ray.set(new T.Vector3(p.x+xoffset,2,p.z),new T.Vector3(0,-1,0));let hits=ray.intersectObjects(roots,true);if(hits.length){checks++;const h=hits[0],gap=p.y-Math.sqrt(WIRE_RADIUS**2-xoffset**2)-h.point.y;if(gap<best.gap)best={gap,part:h.object.name,wire:p.toArray(),surface:h.point.toArray()};}}
console.log(JSON.stringify({checks,best},null,2));
const {MechanicalRamp}=await import('../web/js/pinball/components/ramp-wire.mjs');const ramp=new MechanicalRamp();ramp.root.updateMatrixWorld(true);let all={gap:Infinity},meshChecks=0,meshSamples=0;const minima=new Map();
ramp.root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,idx=o.geometry.index;const points=[];for(let i=0;i<a.count;i++)points.push(new T.Vector3().fromBufferAttribute(a,i));for(let i=0;i<(idx?idx.count:a.count);i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);if(ids.every(k=>k<a.count))points.push(ids.map(k=>new T.Vector3().fromBufferAttribute(a,k)).reduce((s,p)=>s.add(p),new T.Vector3()).multiplyScalar(1/3));}for(const local of points){const p=local.applyMatrix4(o.matrixWorld);if(p.z<.8||p.z>3.4||p.x>-.9||p.x< -2.7)continue;meshSamples++;ray.set(new T.Vector3(p.x,2,p.z),new T.Vector3(0,-1,0));const hits=ray.intersectObjects(roots,true);if(hits.length){meshChecks++;const h=hits[0],gap=p.y-h.point.y;if(!minima.has(o.name)||gap<minima.get(o.name))minima.set(o.name,gap);if(gap<all.gap)all={gap,rampPart:o.name,slingPart:h.object.name,point:p.toArray(),surface:h.point.toArray()};}}});console.log(JSON.stringify({meshChecks,allParts:all,lowest:[...minima].sort((a,b)=>a[1]-b[1]).slice(0,12)},null,2));

// Count attempted samples, not hits: a return routed outside the sling should
// have zero overhead intersections. Preserve minimum clearance for any hits.
assert.ok(railSamples>10000);assert.ok(meshSamples>1000);
assert.ok(best.gap>=.025);assert.ok(all.gap>=.025,JSON.stringify(all));
// Also measure lateral clearance against the full projected sling footprint.
// Convex hull deliberately includes cover, rubber, posts and mount feet.
const points=[];roots[0].traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);points.push(new T.Vector2(p.x,p.z));}});
points.sort((a,b)=>a.x-b.x||a.y-b.y);
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const half=ps=>{const h=[];for(const p of ps){while(h.length>1&&cross(h.at(-2),h.at(-1),p)<=0)h.pop();h.push(p);}return h;};
const hull=[...half(points).slice(0,-1),...half([...points].reverse()).slice(0,-1)];
let lateral=Infinity,lateralSamples=0;
for(const rail of rails)for(const p of rail)if(p.x<0&&p.z>.8&&p.z<3.4){
 lateralSamples++;const q=new T.Vector2(p.x,p.z);let distance=Infinity,inside=true;
 for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length],d=b.clone().sub(a);if(cross(a,b,q)<0)inside=false;const t=Math.max(0,Math.min(1,q.clone().sub(a).dot(d)/d.lengthSq()));distance=Math.min(distance,q.distanceTo(a.clone().addScaledVector(d,t)));}
 lateral=Math.min(lateral,(inside?-distance:distance)-WIRE_RADIUS);
}
console.log(JSON.stringify({railSamples,meshSamples,lateralSamples,lateralClearance:lateral},null,2));
assert.ok(lateralSamples>1000);assert.ok(lateral>=.025,'outside return must clear full sling footprint');
// A point-distance bound also covers each actual 240-step physical capsule
// segment: distance to a closed set is 1-Lipschitz along the segment.
assert.ok(hull.length>=3&&hull.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
const area=hull.reduce((s,p,i)=>s+p.x*hull[(i+1)%hull.length].y-p.y*hull[(i+1)%hull.length].x,0)/2;
assert.ok(area>0);
const physicalRows=sampleRamp(),physicalRails=rampWireRails(physicalRows.slice(Math.round(240*WIRE_START_FRACTION)));
let physicalPointGap=Infinity,maxSegment=0;
for(const rail of physicalRails)for(let i=0;i<rail.length;i++){
 const q=new T.Vector2(rail[i].x,rail[i].z);let distance=Infinity,inside=true;
 for(let j=0;j<hull.length;j++){const a=hull[j],b=hull[(j+1)%hull.length],d=b.clone().sub(a);if(cross(a,b,q)<0)inside=false;const t=Math.max(0,Math.min(1,q.clone().sub(a).dot(d)/d.lengthSq()));distance=Math.min(distance,q.distanceTo(a.clone().addScaledVector(d,t)));}
 physicalPointGap=Math.min(physicalPointGap,(inside?-distance:distance)-WIRE_RADIUS);
 if(i)maxSegment=Math.max(maxSegment,Math.hypot(rail[i].x-rail[i-1].x,rail[i].z-rail[i-1].z));
}
// Keep the former coarse global bound in the report. Subtracting half the
// longest segment anywhere from the closest vertex can be needlessly negative.
// Instead certify EACH real segment: signed distance is 1-Lipschitz, so half
// its local sampling step bounds the unsampled interval. The .025 threshold
// is unchanged, and every segment remains included.
const coarseGlobalLowerBound=physicalPointGap-maxSegment/2;
const signedDistance=q=>{
 let distance=Infinity,inside=true;
 for(let j=0;j<hull.length;j++){
  const a=hull[j],b=hull[(j+1)%hull.length],d=b.clone().sub(a);
  if(cross(a,b,q)<0)inside=false;
  const t=Math.max(0,Math.min(1,q.clone().sub(a).dot(d)/d.lengthSq()));
  distance=Math.min(distance,q.distanceTo(a.clone().addScaledVector(d,t)));
 }
 return inside?-distance:distance;
};
let continuousLowerBound=Infinity,certifiedSegments=0;
for(const rail of physicalRails)for(let i=1;i<rail.length;i++){
 const a=rail[i-1],b=rail[i],length=Math.hypot(b.x-a.x,b.z-a.z);
 const steps=Math.max(1,Math.ceil(length/.002));let local=Infinity;
 for(let k=0;k<=steps;k++)local=Math.min(local,signedDistance(new T.Vector2(a.x+(b.x-a.x)*k/steps,a.z+(b.z-a.z)*k/steps))-WIRE_RADIUS);
 continuousLowerBound=Math.min(continuousLowerBound,local-length/steps/2);certifiedSegments++;
}
assert.equal(certifiedSegments,physicalRails.length*(physicalRows.length-1-Math.round(240*WIRE_START_FRACTION)));
console.log(JSON.stringify({physicalPointGap,maxSegment,coarseGlobalLowerBound,continuousLowerBound,certifiedSegments},null,2));
assert.ok(Number.isFinite(continuousLowerBound)&&continuousLowerBound>=.025);
