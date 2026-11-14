import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {MechanicalCabinet} from './components/cabinet.mjs';
import {PinballPhysics} from './physics.mjs';
import {TABLE} from './layout.mjs';

const close=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b}`);

test('play-facing solid cabinet backing and cap match actual collider bounds',async()=>{
 const g=await PinballPhysics.create(),c=new MechanicalCabinet();
 try {
  c.root.position.z=TABLE.centerZ;c.root.updateMatrixWorld(true);
  assert.equal(g.cabinetBoundaryContacts.length,3);
  for(const {name,collider} of g.cabinetBoundaryContacts){
   const group=c.root.getObjectByName(`cabinet-boundary-${name}`),b=new T.Box3().setFromObject(group);
   const p=collider.translation(),h=collider.halfExtents();
   for(const axis of ['x','y','z']){close(b.min[axis],p[axis]-h[axis]);close(b.max[axis],p[axis]+h[axis]);}
   close(b.min.y,-.05);close(b.max.y,.385);
   const backing=new T.Box3().setFromObject(group.getObjectByName(`cabinet-boundary-${name}-backing`));
   const cap=new T.Box3().setFromObject(group.getObjectByName(`cabinet-boundary-${name}-cap`));
   close(backing.max.y,cap.min.y);close(cap.max.y-cap.min.y,.022);
   if(name==='left')close(b.max.x,-2.73);
   else if(name==='right')close(b.min.x,2.73);
   else close(b.max.z,-5.73);
  }
  assert.equal(c.root.getObjectByName('folded-glass-channel--1'),undefined);
  assert.equal(c.root.getObjectByName('folded-glass-channel-1'),undefined);
 }finally{c.dispose();g.dispose();}
});

test('visible side and rear faces and cap agree with solid rays without an invisible upper wall',async()=>{
 const g=await PinballPhysics.create(),c=new MechanicalCabinet();
 try {
  c.root.position.z=TABLE.centerZ;c.root.updateMatrixWorld(true);
  let rays=0;
  for(const {name,collider} of g.cabinetBoundaryContacts){
   const group=c.root.getObjectByName(`cabinet-boundary-${name}`);
   for(const u of [-.8,0,.8])for(const y of [.10,.30,.374,.60]){
    const side=name==='left'?-1:1;
    const origin=name==='rear'?new T.Vector3(u*2,y,-5):new T.Vector3(side*2,y,u*5);
    const direction=name==='rear'?new T.Vector3(0,0,-1):new T.Vector3(side,0,0);
    const hits=new T.Raycaster(origin,direction,0,2).intersectObject(group,true);
    const distance=collider.castRay(new R.Ray(origin,direction),2,true);
    if(y>.385){assert.equal(hits.length,0);assert.equal(distance,-1);}
    else {assert.ok(hits.length>0);assert.ok(distance>=0);close(hits[0].distance,distance);}
    rays++;
   }
   const p=collider.translation(),origin=new T.Vector3(p.x,1,p.z),direction=new T.Vector3(0,-1,0);
   const hit=new T.Raycaster(origin,direction).intersectObject(group,true)[0];
   close(hit.point.y,.385);close(hit.distance,collider.castRay(new R.Ray(origin,direction),2,true));
  }
  assert.equal(rays,36);
 }finally{c.dispose();g.dispose();}
});

test('cabinet cap retains flush seats, hex heads and enclosed shanks',()=>{
 const c=new MechanicalCabinet();
 try {
  c.root.updateMatrixWorld(true);let heads=0,seats=0,shafts=0;
  c.root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.name.includes('cap-fastener-'))return;
   const b=new T.Box3().setFromObject(mesh);
   if(mesh.name.endsWith('-hex-head')){heads++;close(b.min.y,.385);close(b.max.y,.385);}
   if(mesh.name.endsWith('-seat')){seats++;close(b.min.y,.385);close(b.max.y,.385);}
   if(mesh.name.endsWith('-shank')){shafts++;assert.ok(b.min.y>.28);close(b.max.y,.385);}
  });
  assert.equal(heads,13);assert.equal(seats,13);assert.equal(shafts,13);
 }finally{c.dispose();}
});
