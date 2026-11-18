import assert from 'node:assert/strict';
import * as T from '../web/js/vendor/three-0.180.0/three.module.min.js';
import {MechanicalSling} from '../web/js/pinball/components/sling-target.mjs';
import {LOWER_LAYOUT,lowerSlingVertices} from '../web/js/pinball/layout.mjs';
import {sampleRamp,rampWireRails,WIRE_START_FRACTION,WIRE_RADIUS} from '../web/js/pinball/ramp-geometry.mjs';
// The widened lower layout intentionally allows an elevated return over the
// sling footprint. Certify actual 3D clearance, not disjoint XZ projections.
// Every actual mesh triangle and every physical wire capsule is included.
const parts=[],triangles=[];let slingTop=-Infinity;
for(const side of[-1,1]){
 const center=[side*LOWER_LAYOUT.slingCenter[0],LOWER_LAYOUT.slingCenter[1]];
 const part=new MechanicalSling({points:lowerSlingVertices(side).map(([x,z])=>[x-center[0],z-center[1]]),rubberHeight:.22,coverHeight:LOWER_LAYOUT.slingCoverHeight});
 part.root.position.set(center[0],0,center[1]);part.root.updateMatrixWorld(true);parts.push(part);
 part.root.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position,index=o.geometry.index;
  for(let i=0;i<(index?index.count:p.count);i+=3){
   const vertices=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(p,index?index.getX(i+k):i+k).applyMatrix4(o.matrixWorld));
   const triangle=new T.Triangle(...vertices),box=new T.Box3().setFromPoints(vertices);
   slingTop=Math.max(slingTop,box.max.y);triangles.push({triangle,box,center:box.getCenter(new T.Vector3()),name:o.name});
  }
 });
}
// BVH only prunes by a conservative AABB distance bound. Leaf queries measure
// exact Euclidean point-to-triangle distance, including edges and corners.
function build(items){const box=new T.Box3();for(const item of items)box.union(item.box);if(items.length<=12)return{box,items};
 const size=box.getSize(new T.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';items.sort((a,b)=>a.center[axis]-b.center[axis]);const mid=items.length>>1;return{box,left:build(items.slice(0,mid)),right:build(items.slice(mid))};}
const tree=build(triangles),closest=new T.Vector3();
function nearest(point){let best=Infinity,hit=null;
 function visit(node){if(node.box.distanceToPoint(point)>=best)return;if(node.items){for(const item of node.items){if(item.box.distanceToPoint(point)>=best)continue;item.triangle.closestPointToPoint(point,closest);const d=closest.distanceTo(point);if(d<best){best=d;hit={part:item.name,surface:closest.toArray()};}}}else{const dl=node.left.box.distanceToPoint(point),dr=node.right.box.distanceToPoint(point);if(dl<dr){visit(node.left);visit(node.right);}else{visit(node.right);visit(node.left);}}}
 visit(tree);return{distance:best,...hit};
}
const rows=sampleRamp(),rails=rampWireRails(rows.slice(Math.round((rows.length-1)*WIRE_START_FRACTION)));
let continuousLowerBound=Infinity,certifiedSegments=0,samples=0,critical=null,minCenterY=Infinity;
for(const [railIndex,rail] of rails.entries())for(let i=1;i<rail.length;i++){
 const a=rail[i-1],b=rail[i],length=a.distanceTo(b),steps=Math.max(1,Math.ceil(length/.003));let local=Infinity,localCritical=null;
 for(let k=0;k<=steps;k++){const p=a.clone().lerp(b,k/steps),result=nearest(p),gap=result.distance-WIRE_RADIUS;samples++;minCenterY=Math.min(minCenterY,p.y);if(gap<local){local=gap;localCritical={rail:railIndex,segment:i-1,point:p.toArray(),...result};}}
 // Distance to a closed set is 1-Lipschitz. Subtract half the local sample
 // interval and capsule radius to bound ALL points, not just sampled points.
 const bound=local-length/steps/2;if(bound<continuousLowerBound){continuousLowerBound=bound;critical=localCritical;}certifiedSegments++;
}
try{
// Retain the earlier supplementary hardware-overhead probe. The rigorous
// capsule certificate above does not replace this different assembly check.
const roots=parts.map(p=>p.root),ray=new T.Raycaster();
const {MechanicalRamp}=await import('../web/js/pinball/components/ramp-wire.mjs');const ramp=new MechanicalRamp();ramp.root.updateMatrixWorld(true);let all={gap:Infinity},meshChecks=0,meshSamples=0;const minima=new Map();
ramp.root.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position,idx=o.geometry.index;const points=[];for(let i=0;i<a.count;i++)points.push(new T.Vector3().fromBufferAttribute(a,i));for(let i=0;i<(idx?idx.count:a.count);i+=3){const ids=[0,1,2].map(k=>idx?idx.getX(i+k):i+k);if(ids.every(k=>k<a.count))points.push(ids.map(k=>new T.Vector3().fromBufferAttribute(a,k)).reduce((s,p)=>s.add(p),new T.Vector3()).multiplyScalar(1/3));}for(const local of points){const p=local.applyMatrix4(o.matrixWorld);if(p.z<.8||p.z>3.4||p.x>-.9||p.x< -2.7)continue;meshSamples++;ray.set(new T.Vector3(p.x,2,p.z),new T.Vector3(0,-1,0));const hits=ray.intersectObjects(roots,true);if(hits.length){meshChecks++;const h=hits[0],gap=p.y-h.point.y;if(!minima.has(o.name)||gap<minima.get(o.name))minima.set(o.name,gap);if(gap<all.gap)all={gap,rampPart:o.name,slingPart:h.object.name,point:p.toArray(),surface:h.point.toArray()};}}});console.log(JSON.stringify({meshChecks,allParts:all,lowest:[...minima].sort((a,b)=>a[1]-b[1]).slice(0,12)},null,2));


assert.ok(meshSamples>1000);assert.ok(all.gap>=.025,JSON.stringify(all));ramp.dispose();
 assert.ok(triangles.length>1000);assert.ok(samples>1000);
 assert.equal(certifiedSegments,rails.length*(rows.length-1-Math.round((rows.length-1)*WIRE_START_FRACTION)));
 // All centerlines are above every sling mesh: no centerline can be enclosed
 // inside a mesh while the unsigned surface distance appears positive.
 assert.ok(minCenterY>slingTop);
 console.log(JSON.stringify({contract:'continuous 3D capsule-to-visible-sling clearance',triangles:triangles.length,samples,certifiedSegments,minCenterY,slingTop,continuousLowerBound,critical},null,2));
 assert.ok(Number.isFinite(continuousLowerBound)&&continuousLowerBound>=.025);
}finally{parts.forEach(p=>p.dispose());}
