import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {PinballPhysics} from './physics.mjs';
import {shooterOuterRailGeometry} from './shooter-outer-rail.mjs';

// Independent historical dimensions catch accidental movement during sharing.
test('solid shooter rail preserves every old side vertex and adds only outward flat caps',()=>{
 const old=new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(2.72,.23,4.95),new T.Vector3(2.72,.23,-4.15)]),1,.06,8,false),geometry=shooterOuterRailGeometry();
 try {
  assert.deepEqual(geometry.attributes.position.array.slice(0,old.attributes.position.array.length),old.attributes.position.array);
  assert.deepEqual(Array.from(geometry.index.array.slice(0,old.index.count)),Array.from(old.index.array));
  assert.equal(geometry.index.count-old.index.count,36);
  for(let i=old.index.count;i<geometry.index.count;i+=3){
   const points=[0,1,2].map(k=>new T.Vector3().fromBufferAttribute(geometry.attributes.position,geometry.index.array[i+k]));
   const z=points[0].z;assert.ok(Math.abs(z-4.95)<1e-6||Math.abs(z+4.15)<1e-6);
   assert.ok(points.every(p=>Math.abs(p.z-z)<1e-7));
   const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
   assert.ok(normal.z*(z>0?1:-1)>0,'cap winding faces out of solid stock');
  }
 }finally{old.dispose();geometry.dispose();}
});

test('actual octagonal rail hull matches visible side and flat-end rays without capsule inflation',async()=>{
 const g=await PinballPhysics.create(),geometry=shooterOuterRailGeometry(),material=new T.MeshBasicMaterial(),mesh=new T.Mesh(geometry,material),hullGeometry=new T.BufferGeometry();
 try {
  mesh.updateMatrixWorld(true);const c=g.shooterOuterRailContact;
  assert.deepEqual({...c.translation()},{x:0,y:0,z:0});
  assert.deepEqual({...c.rotation()},{x:0,y:0,z:0,w:1});
  // Compare the actual collider's stored faces, not a second shared factory.
  // Rapier's support-map convex ray query is approximate on this long thin
  // octagon (measured side-query error .002017); its mesh itself is exact.
  hullGeometry.setAttribute('position',new T.Float32BufferAttribute(c.vertices(),3));
  hullGeometry.setIndex(Array.from(c.indices()));
  const hullMesh=new T.Mesh(hullGeometry,material);hullMesh.updateMatrixWorld(true);
  const rays=[];
  for(const z of[-3,0,3])for(let i=0;i<16;i++){
   const n=new T.Vector3(Math.cos(i*Math.PI/8),Math.sin(i*Math.PI/8),0);
   rays.push([new T.Vector3(2.72,.23,z).addScaledVector(n,.3),n.clone().negate()]);
  }
  rays.push([new T.Vector3(2.72,.23,5.25),new T.Vector3(0,0,-1)],[new T.Vector3(2.72,.23,-4.45),new T.Vector3(0,0,1)]);
  for(const [origin,direction] of rays){
   const hit=new T.Raycaster(origin,direction,0,1).intersectObject(mesh)[0],distance=c.castRay(new R.Ray(origin,direction),1,true);
   const hullHit=new T.Raycaster(origin,direction,0,1).intersectObject(hullMesh)[0];
   assert.ok(hit&&hullHit&&distance>=0);
   assert.ok(Math.abs(hit.distance-hullHit.distance)<2e-6,'actual physical face must match visible face');
   if(direction.z)assert.ok(Math.abs(hit.distance-distance)<2e-6,'flat end physical ray distance');
  }
  assert.equal(rays.length,50);
  const rest={x:2.53,y:.175,z:4.425},q=c.projectPoint(rest,true).point;
  assert.ok(Math.hypot(rest.x-q.x,rest.y-q.y,rest.z-q.z)-.135>0,'natural serve does not overlap rail');
 }finally{g.dispose();geometry.dispose();hullGeometry.dispose();material.dispose();}
});

test('six nonoverlapping ground lateral approaches contact the real external shooter rail',async()=>{
 for(const z of[-3,0,3])for(const speed of[.5,2]){
  const g=await PinballPhysics.create();try{
   g.launch();g.state.kickbackCharges=g.state.sideSaveCharges=0;
   const start={x:2.53,y:.175,z};let clearance=Infinity;
   g.world.forEachCollider(c=>{if(c.handle===g.ballCollider.handle||c.isSensor())return;const q=c.projectPoint(start,true).point;clearance=Math.min(clearance,Math.hypot(start.x-q.x,start.y-q.y,start.z-q.z)-.135);});
   assert.ok(clearance>=-1e-4,'fixture must clear every solid');
   g.ball.setTranslation(start,true);g.ball.setLinvel({x:speed,y:0,z:0},true);
   let contacts=0,maxX=-Infinity;
   for(let tick=0;tick<45;tick++){
    g.world.step();maxX=Math.max(maxX,g.ballPosition.x);
    g.world.contactPair(g.ballCollider,g.shooterOuterRailContact,m=>{for(let i=0;i<m.numContacts();i++)if(m.contactDist(i)<.001){contacts++;break;}});
   }
   assert.ok(contacts>0);assert.ok(maxX<2.55,'rail stops the approach before the cabinet boundary');
  }finally{g.dispose();}
 }
});
