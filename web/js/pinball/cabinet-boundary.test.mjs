import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {MechanicalCabinet} from './components/cabinet.mjs';
import {PinballPhysics} from './physics.mjs';
import {TABLE} from './layout.mjs';
import {CABINET_BOUNDARY, cabinetBoundaryTop} from './cabinet-boundary.mjs';

const close=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b}`);

test('play-facing solid cabinet backing and cap match actual collider bounds',async()=>{
 const g=await PinballPhysics.create(),c=new MechanicalCabinet();
 try {
  c.root.position.z=TABLE.centerZ;c.root.updateMatrixWorld(true);
  assert.equal(g.cabinetBoundaryContacts.length,5);
  assert.deepEqual(g.cabinetBoundaryContacts.slice(0,3).map(p=>p.name),["left","right","rear"]);
  for(const {name,collider} of g.cabinetBoundaryContacts){
   const group=c.root.getObjectByName(`cabinet-boundary-${name}`),b=new T.Box3().setFromObject(group);
   const p=collider.translation(),h=collider.halfExtents();
   for(const axis of ['x','y','z']){close(b.min[axis],p[axis]-h[axis]);close(b.max[axis],p[axis]+h[axis]);}
   close(b.min.y,name.endsWith("extension")?CABINET_BOUNDARY.top:-.05);close(b.max.y,name.endsWith("extension")?CABINET_BOUNDARY.lowerTop:name==="rear"?CABINET_BOUNDARY.rearTop:CABINET_BOUNDARY.top);
   const backing=new T.Box3().setFromObject(group.getObjectByName(`cabinet-boundary-${name}-backing`));
   const cap=new T.Box3().setFromObject(group.getObjectByName(`cabinet-boundary-${name}-cap`));
   close(backing.max.y,cap.min.y);close(cap.max.y-cap.min.y,.022);
   if(name.startsWith('left'))close(b.max.x,-2.73);
   else if(name.startsWith('right'))close(b.min.x,2.73);
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
   const bounds=new T.Box3().setFromObject(group),top=bounds.max.y;
   for(const u of [-.8,0,.8])for(const y of [.10,.30,.60,.90]){
    const side=name.startsWith('left')?-1:1;
    const origin=name==='rear'?new T.Vector3(u*2,y,-5):new T.Vector3(side*2,y,(bounds.min.z+bounds.max.z)/2+u*(bounds.max.z-bounds.min.z)/2);
    const direction=name==='rear'?new T.Vector3(0,0,-1):new T.Vector3(side,0,0);
    const hits=new T.Raycaster(origin,direction,0,2).intersectObject(group,true);
    const distance=collider.castRay(new R.Ray(origin,direction),2,true);
    if(y>top||y<bounds.min.y){assert.equal(hits.length,0);assert.equal(distance,-1);}
    else {assert.ok(hits.length>0);assert.ok(distance>=0);close(hits[0].distance,distance);}
    rays++;
   }
   const p=collider.translation(),origin=new T.Vector3(p.x,top+1,p.z),direction=new T.Vector3(0,-1,0);
   const hit=new T.Raycaster(origin,direction).intersectObject(group,true)[0];
   close(hit.point.y,top);close(hit.distance,collider.castRay(new R.Ray(origin,direction),2,true));
  }
  assert.equal(rays,60);
 }finally{c.dispose();g.dispose();}
});

test('cabinet cap retains flush seats, hex heads and enclosed shanks',()=>{
 const c=new MechanicalCabinet();
 try {
  c.root.updateMatrixWorld(true);let heads=0,seats=0,shafts=0;
  c.root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.name.includes('cap-fastener-'))return;
   const b=new T.Box3().setFromObject(mesh);
   const top=cabinetBoundaryTop((b.min.z+b.max.z)/2+TABLE.centerZ);
   if(mesh.name.endsWith('-hex-head')){heads++;close(b.min.y,top);close(b.max.y,top);}
   if(mesh.name.endsWith('-seat')){seats++;close(b.min.y,top);close(b.max.y,top);}
   if(mesh.name.endsWith('-shank')){shafts++;assert.ok(b.min.y>.28);close(b.max.y,top);}
  });
  assert.equal(heads,13);assert.equal(seats,13);assert.equal(shafts,13);
 }finally{c.dispose();}
});

test('raised visible guard returns airborne lower-lane balls on both sides without rescue',async()=>{
 // Local contact fixtures reproduce the former cap-height escape envelope.
 // The whole-game legal-input audit is separate from these injected fixtures.
 for(const side of [-1,1])for(const height of [.53,.68]) {
  const g=await PinballPhysics.create();
  try {
   g.launch(.925);
   g.ball.setTranslation({x:side*2.50,y:height,z:3.2},true);
   g.ball.setLinvel({x:side*8,y:1,z:-3},true);
   const score=g.state.score;let returned=false,maxX=0;
   for(let tick=0;tick<20;tick++) {
    g.step(1/120,{});
    maxX=Math.max(maxX,Math.abs(g.ballPosition.x));
    if(g.ball.linvel().x*side<0)returned=true;
   }
   assert.ok(returned,'physical face must reverse outward velocity');
   assert.ok(maxX<2.73,`ball crossed inner guard face: ${maxX}`);
   assert.equal(g.state.ballNumber,1);assert.equal(g.state.phase,'playing');
   assert.equal(g.state.score,score,'containment does not award points');
   assert.equal(g.state.kickbackUses,0);assert.equal(g.state.sideSaveUses,0);
  }finally{g.dispose();}
 }
});
