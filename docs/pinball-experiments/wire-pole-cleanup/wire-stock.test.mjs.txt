import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {MechanicalRamp} from './components/ramp-wire.mjs';
import {PinballPhysics} from './physics.mjs';
import {railCapsules,capsuleStockGeometry} from './wire-stock.mjs';
import {sampleRamp,rampWireRails} from './ramp-geometry.mjs';
test('all visible wire capsule axes ends and nominal radii match installed contacts in four meshes',async()=>{
const g=await PinballPhysics.create(),assembly=new MechanicalRamp(),rails=rampWireRails(sampleRamp().slice(124));
// Facet inset is sampled at triangle centroids, not a global surface bound.
try{
assembly.root.updateMatrixWorld(true);let primitiveCount=0,maxVertexError=0,maxFacetCentroidInset=0,maxAxisError=0,maxEndError=0,triangles=0;
for(let rail=0;rail<4;rail++){
 const mesh=assembly.root.getObjectByName(`${rail%2?'containment':'running'}-rail-${rail}`),geometry=mesh.geometry,a=geometry.attributes.position,ix=geometry.index.array;
 assert.equal(geometry.userData.primitiveRanges.length,116);triangles+=ix.length/3;
 for(let i=0;i<116;i++){
  const c=g.ramp.colliders[3+rail*116+i],shape=c.shape,center=c.translation(),rotation=c.rotation(),q=new T.Quaternion(rotation.x,rotation.y,rotation.z,rotation.w);
  const start=new T.Vector3(0,-shape.halfHeight,0).applyQuaternion(q).add(new T.Vector3(center.x,center.y,center.z));
  const end=new T.Vector3(0,shape.halfHeight,0).applyQuaternion(q).add(new T.Vector3(center.x,center.y,center.z));
  maxAxisError=Math.max(maxAxisError,start.distanceTo(rails[rail][i]),end.distanceTo(rails[rail][i+1]));assert.ok(Math.abs(shape.radius-.018)<1e-8);
  const line=new T.Line3(start,end),range=geometry.userData.primitiveRanges[i],axis=end.clone().sub(start).normalize();let min=Infinity,max=-Infinity;
  for(let j=range.vertexStart;j<range.vertexStart+range.vertexCount;j++){
   const p=new T.Vector3().fromBufferAttribute(a,j).applyMatrix4(mesh.matrixWorld),distance=line.closestPointToPoint(p,true,new T.Vector3()).distanceTo(p);
   maxVertexError=Math.max(maxVertexError,Math.abs(distance-shape.radius));const z=p.clone().sub(start).dot(axis);min=Math.min(min,z);max=Math.max(max,z);
  }
  maxEndError=Math.max(maxEndError,Math.abs(min+shape.radius),Math.abs(max-(2*shape.halfHeight+shape.radius)));
  for(let j=range.indexStart;j<range.indexStart+range.indexCount;j+=3){
   const p=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(a,ix[j+k]).applyMatrix4(mesh.matrixWorld)).reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/3);
   maxFacetCentroidInset=Math.max(maxFacetCentroidInset,shape.radius-line.closestPointToPoint(p,true,new T.Vector3()).distanceTo(p));
  }
  primitiveCount++;
 }
}
assert.equal(primitiveCount,464);assert.ok(maxAxisError<1e-6);assert.ok(maxVertexError<1e-6);assert.ok(maxEndError<1e-6);
assert.ok(maxFacetCentroidInset<.000948);// Old 100224 included 464 * 24 exactly coincident pole faces.
assert.equal(triangles,89088);}finally{assembly.dispose();g.dispose();}
});

test('compatibility ramp drawing uses the same four capsule-stock rail geometries',async()=>{
 const {buildVisualRamp}=await import('./ramp-geometry.mjs');
 const {WorkshopAssets}=await import('./assets.mjs');
 const assets=new WorkshopAssets(),root=buildVisualRamp(assets),rails=[];
 try{
 root.traverse(o=>{if(o.geometry?.userData.primitiveRanges)rails.push(o);});
 assert.equal(rails.length,4);
 for(const rail of rails)assert.equal(rail.geometry.userData.primitiveRanges.length,116);
 }finally{
 root.traverse(o=>o.geometry?.dispose());
 for(const m of Object.values(assets.materials))m.dispose();
 }
});

const stockPart=(center=new T.Vector3(),halfHeight=.5,radius=.02,rotation=new T.Quaternion())=>({center,halfHeight,radius,rotation});
function rawStock(part) {
 const g=new T.CapsuleGeometry(part.radius,part.halfHeight*2,4,12);
 g.applyQuaternion(part.rotation);g.translate(...part.center.toArray());return g;
}
function faceArea(g,k) {
 const p=[0,1,2].map(n=>new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.array[k+n]));
 return p[1].sub(p[0]).cross(p[2].sub(p[0])).lengthSq();
}
function verifyRetained(part) {
 const raw=rawStock(part),g=capsuleStockGeometry([part]);
 assert.deepEqual(g.attributes.position.array,raw.attributes.position.array);
 assert.deepEqual(g.attributes.normal.array,raw.attributes.normal.array);
 let next=0,removed=0;
 for(let k=0;k<raw.index.count;k+=3) {
  const face=Array.from(raw.index.array.slice(k,k+3));
  if(face.every((v,i)=>g.index.array[next+i]===v)){next+=3;continue;}
  removed++;
  assert.equal(faceArea(raw,k),0,'a removed face must be exactly zero area');
  const row=face.map(i=>Math.floor(i/13));
  assert.ok(row.every(r=>r<=1)||row.every(r=>r>=8),'only a pole band may change');
 }
 assert.equal(next,g.index.count,'retained faces stay in order with no additions');
 return {raw,g,removed};
}

test('wire pole cleanup preserves every installed vertex normal and nondegenerate face',()=>{
 let removed=0;
 for(const rail of rampWireRails(sampleRamp().slice(124)))for(const part of railCapsules(rail,.018)){
  const {raw,g,removed:n}=verifyRetained(part);removed+=n;
  assert.equal(n,24);assert.equal(g.index.count/3,192);
  for(let k=0;k<g.index.count;k+=3)assert.ok(faceArea(g,k)>0);
  raw.dispose();g.dispose();
 }
 assert.equal(removed,11136);
});

test('wire retained installed capsule shells stay outward and closed',()=>{
 for(const rail of rampWireRails(sampleRamp().slice(124)))for(const part of railCapsules(rail,.018)){
  const g=capsuleStockGeometry([part]),ids=new Map(),edges=new Map();
  const axis=new T.Vector3(0,1,0).applyQuaternion(part.rotation);
  const line=new T.Line3(part.center.clone().addScaledVector(axis,-part.halfHeight),part.center.clone().addScaledVector(axis,part.halfHeight));
  // Weld only for topology inspection; production arrays are not mutated.
  const weld=p=>{const k=p.toArray().map(n=>n.toFixed(7)).join(',');if(!ids.has(k))ids.set(k,ids.size);return ids.get(k);};
  for(let k=0;k<g.index.count;k+=3){
   const ps=[0,1,2].map(n=>new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.array[k+n]));
   const normal=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0]));
   const c=ps[0].clone().add(ps[1]).add(ps[2]).multiplyScalar(1/3),out=c.clone().sub(line.closestPointToPoint(c,true,new T.Vector3()));
   assert.ok(normal.dot(out)>0);
   const q=ps.map(weld);for(let i=0;i<3;i++){const a=q[i],b=q[(i+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(a<b?1:-1);}
  }
  assert.equal(ids.size-edges.size+g.index.count/3,2);
  for(const e of edges.values()){assert.equal(e.length,2);assert.equal(e[0]+e[1],0);}
  g.dispose();
 }
});

test('wire pole cleanup preserves distinct pole fallback and rounded nonpole faces',()=>{
 const cases=[stockPart(),stockPart(new T.Vector3(),0),stockPart(new T.Vector3(),1e-6,1e-10),stockPart(new T.Vector3(1.234,.234,-2.678),.03,.018,new T.Quaternion().setFromAxisAngle(new T.Vector3(1,2,3).normalize(),.789))];
 for(const [i,part]of cases.entries()){const {raw,g,removed}=verifyRetained(part);assert.equal(removed,i===3?24:12);raw.dispose();g.dispose();}
 const {raw,g,removed}=verifyRetained(stockPart(new T.Vector3(1e8,1e8,1e8),.1));
 assert.equal(removed,24);assert.equal(g.index.count/3,192);
 for(let k=0;k<g.index.count;k+=3)assert.equal(faceArea(g,k),0,'rounded nonpole faces are intentionally preserved');
 raw.dispose();g.dispose();
});

test('wire primitive ranges cover empty and mixed concatenated geometry exactly',()=>{
 const empty=capsuleStockGeometry([]);assert.equal(empty.index.count,0);assert.deepEqual(empty.userData.primitiveRanges,[]);empty.dispose();
 const parts=[stockPart(),stockPart(new T.Vector3(1,2,3),.1),stockPart(new T.Vector3(),1e-6,1e-10)],g=capsuleStockGeometry(parts);
 let vertex=0,index=0;
 for(const [i,r]of g.userData.primitiveRanges.entries()){
  const single=capsuleStockGeometry([parts[i]]);assert.equal(r.vertexStart,vertex);assert.equal(r.indexStart,index);assert.equal(r.indexCount,single.index.count);assert.equal(r.vertexCount,single.attributes.position.count);
  assert.deepEqual(Array.from(g.index.array.slice(index,index+r.indexCount),n=>n-vertex),Array.from(single.index.array));
  for(let k=index;k<index+r.indexCount;k++)assert.ok(g.index.array[k]>=vertex&&g.index.array[k]<vertex+r.vertexCount);
  vertex+=r.vertexCount;index+=r.indexCount;single.dispose();
 }
 assert.equal(vertex,g.attributes.position.count);assert.equal(index,g.index.count);g.dispose();
});
