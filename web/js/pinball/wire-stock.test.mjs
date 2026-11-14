import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {MechanicalRamp} from './components/ramp-wire.mjs';
import {PinballPhysics} from './physics.mjs';
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
assert.ok(maxFacetCentroidInset<.000948);assert.equal(triangles,100224);}finally{assembly.dispose();g.dispose();}
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
