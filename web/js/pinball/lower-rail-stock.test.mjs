import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {PlayfieldParts} from './playfield-parts.mjs';
import {WorkshopAssets} from './assets.mjs';
import {PinballPhysics} from './physics.mjs';
import {LOWER_LAYOUT,lowerLanePaths,lowerLaneMounts} from './layout.mjs';

function assembly(){
 const a=new WorkshopAssets(),p=new PlayfieldParts(a);
 // Canvas labels are tested independently; all actual rails/supports are built.
 p.laneInsert=()=>{};for(const side of [-1,1])p.inlane(side);
 a.root.updateMatrixWorld(true);return a;
}
function dispose(a){a.root.traverse(o=>o.geometry?.dispose());for(const m of Object.values(a.materials))m.dispose();}

test('lower rails merge all six new paths and retain each shared mount',()=>{
 const a=assembly();try{
 const rails=a.root.children.filter(o=>o.name==='shared-lower-lane-contact-rail');
 assert.equal(rails.length,6);
 assert.deepEqual(rails.map(o=>o.geometry.userData.primitiveRanges.length),[-1,1].flatMap(side=>lowerLanePaths(side).map(p=>p.length-1)));
 const segments=[-1,1].flatMap(lowerLanePaths).reduce((n,path)=>n+path.length-1,0);
 assert.equal(rails.reduce((n,o)=>n+o.geometry.userData.primitiveRanges.length,0),segments);
 assert.equal(rails.reduce((n,o)=>n+o.geometry.index.count/3,0),segments*192);
 // Each original mount remains a separate base, stem and collar.
 const mounts=[-1,1].flatMap(lowerLaneMounts);
 for(const [x,y,z] of mounts)for(const cy of [.062,(y+.07)/2,y])assert.ok(a.root.children.some(o=>Math.abs(o.position.x-x)<1e-9&&Math.abs(o.position.y-cy)<1e-9&&Math.abs(o.position.z-z)<1e-9));
 }finally{dispose(a);}
});

test('each lower stock primitive is closed and matches its actual installed collider',async()=>{
 const a=assembly(),g=await PinballPhysics.create();try{
 const colliders=[];g.world.forEachCollider(c=>{if(c.shape.type===0)return;const s=c.shape;if(s.radius!==undefined&&s.halfHeight!==undefined)colliders.push(c);});
 const rails=a.root.children.filter(o=>o.name==='shared-lower-lane-contact-rail');
 const paths=[-1,1].flatMap(lowerLanePaths);let checked=0;
 for(const [ri,mesh]of rails.entries()){
 const geom=mesh.geometry,pos=geom.attributes.position,ix=geom.index.array;
 for(const [i,r]of geom.userData.primitiveRanges.entries()){
 const start=new T.Vector3(...paths[ri][i]),end=new T.Vector3(...paths[ri][i+1]),center=start.clone().add(end).multiplyScalar(.5),line=new T.Line3(start,end),axis=end.clone().sub(start).normalize();
 const collider=colliders.find(c=>{const p=c.translation();return center.distanceTo(new T.Vector3(p.x,p.y,p.z))<1e-6&&Math.abs(c.shape.halfHeight-start.distanceTo(end)/2)<1e-6&&Math.abs(c.shape.radius-LOWER_LAYOUT.guideRadius)<1e-8;});assert.ok(collider,'actual contact for each stock segment');
 const q=collider.rotation(),ca=new T.Vector3(0,1,0).applyQuaternion(new T.Quaternion(q.x,q.y,q.z,q.w));assert.ok(Math.abs(ca.dot(axis))>1-1e-6);
 let low=Infinity,high=-Infinity;const ids=new Map(),edges=new Map();
 const weld=p=>{const k=p.toArray().map(n=>n.toFixed(6)).join(',');if(!ids.has(k))ids.set(k,ids.size);return ids.get(k);};
 for(let j=r.vertexStart;j<r.vertexStart+r.vertexCount;j++){
 const p=new T.Vector3().fromBufferAttribute(pos,j);assert.ok(Math.abs(p.distanceTo(line.closestPointToPoint(p,true,new T.Vector3()))-LOWER_LAYOUT.guideRadius)<1e-6);const t=p.clone().sub(start).dot(axis);low=Math.min(low,t);high=Math.max(high,t);
 }
 assert.ok(Math.abs(low+LOWER_LAYOUT.guideRadius)<1e-6);assert.ok(Math.abs(high-start.distanceTo(end)-LOWER_LAYOUT.guideRadius)<1e-6);
 for(let j=r.indexStart;j<r.indexStart+r.indexCount;j+=3){
 const ps=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(pos,ix[j+k])),c=ps[0].clone().add(ps[1]).add(ps[2]).multiplyScalar(1/3),normal=ps[1].clone().sub(ps[0]).cross(ps[2].clone().sub(ps[0]));assert.ok(normal.dot(c.clone().sub(line.closestPointToPoint(c,true,new T.Vector3())))>0);
 // Centroid inset is a sample, not a universal surface-distance bound.
 assert.ok(LOWER_LAYOUT.guideRadius-c.distanceTo(line.closestPointToPoint(c,true,new T.Vector3()))<.00106);
 const v=ps.map(weld);for(let k=0;k<3;k++){const x=v[k],y=v[(k+1)%3],key=[Math.min(x,y),Math.max(x,y)].join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(x<y?1:-1);}
 }
 assert.equal(ids.size-edges.size+r.indexCount/3,2);for(const values of edges.values()){assert.equal(values.length,2);assert.equal(values[0]+values[1],0);}checked++;
 }
 }
 assert.equal(checked,paths.reduce((n,path)=>n+path.length-1,0));
 }finally{dispose(a);g.dispose();}
});
