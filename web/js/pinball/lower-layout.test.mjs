import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {LOWER_LAYOUT,TABLE,lowerLanePaths} from './layout.mjs';
import {PinballPhysics} from './physics.mjs';
import {slingContactPoints} from './mechanical-contact.mjs';
import {sampleRamp} from './ramp-geometry.mjs';

test('sling rubber clears the root-to-center shot corridor on both sides',()=>{
  for(const side of [-1,1]) {
    const a=new T.Vector3(side*(LOWER_LAYOUT.flipperPivot[0]-.3),.22,3.7),b=new T.Vector3(0,.22,-4.55),d=b.clone().sub(a);
    const outline=new T.CatmullRomCurve3([...LOWER_LAYOUT.slingVertices,LOWER_LAYOUT.slingVertices[0]].map(([x,z])=>new T.Vector3(side*x,.22,z))).getPoints(128);
    for(const p of outline) {
      const t=Math.max(0,Math.min(1,p.clone().sub(a).dot(d)/d.lengthSq()));
      assert.ok(p.distanceTo(a.clone().addScaledVector(d,t))>TABLE.ballRadius+.07+.02);
    }
  }
});
// Former z2.1 fixture intersects the outward sling; actual IN begins below it at z2.8.
test('both inlanes feed the flippers at three speeds rather than bypass their pivots',async()=>{
  for(const side of [-1,1])for(const x of [1.72,1.75])for(const speed of [1,3,6]) {
    const g=await PinballPhysics.create();
    try {
      g.launch();g.state.kickbackCharges=0;
      g.ball.setTranslation({x:side*x,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:speed},true);
      for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:side<0,right:side>0});
      assert.ok(g.metrics.flipperContacts[side<0?0:1]>0,`side ${side}, x ${x}, speed ${speed}`);
    }finally{g.dispose();}
  }
});
test('genuine outside lanes still drain without a flipper or invisible rescue',async()=>{
  for(const side of [-1,1]) {
    const g=await PinballPhysics.create();
    try {
      g.launch();g.state.kickbackCharges=0;
      const start={x:side*2.12,y:.18,z:2.6};
      assert.ok(sphereClearance(g,start)>=-1e-4,'OUT fixture must not overlap a rail');
      g.ball.setTranslation(start,true);g.ball.setLinvel({x:0,y:0,z:3},true);
      for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:true,right:true});
      assert.equal(g.state.phase,'ready');assert.deepEqual(g.metrics.flipperContacts,[0,0]);
    }finally{g.dispose();}
  }
});

test('inside heel approach cannot leak sideways past the root cheek',async()=>{
 for(const side of [-1,1]) {
  const g=await PinballPhysics.create();
  try {
   g.launch();g.state.kickbackCharges=0;
   g.ball.setTranslation({x:side*.7410067,y:.16575,z:3.1797516},true);
   g.ball.setLinvel({x:side*2.621058,y:-.167,z:7.381197},true);
   for(let tick=336;tick<936&&g.state.phase==='playing';tick++) {
    const p=g.ballPosition,on=(tick+11*3)%45<15&&p.z>3.2;
    g.step(1/120,{left:on&&p.x<0,right:on&&p.x>=0});
    const q=g.ballPosition;
    // End the heel approach once it has physically returned upfield. Later
    // legitimate shooter returns and outlanes are separate tested behaviors.
    if(g.metrics.upfieldReturns>0) break;
    if(g.state.phase==='playing'&&q.z>3.4&&q.z<4.3) assert.ok(Math.abs(q.x)<1.3,'escaped beside flipper heel '+JSON.stringify({tick,side,q,metrics:g.metrics}));
   }
   assert.ok(g.metrics.upfieldReturns>0,'must produce an actual return, not trap the ball');
  }finally{g.dispose();}
 }
});


test('restored lane mouths pass descending balls without live position rescue',async()=>{
 for(const side of [-1,1])for(const lane of ['in','out'])for(const speed of [1,3,6]) {
  const g=await PinballPhysics.create();
  try {
   g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
   g.ball.setTranslation({x:side*(lane==='in'?1.75:2.12),y:.18,z:lane==='in'?2.80:2.60},true);
   g.ball.setLinvel({x:0,y:0,z:speed},true);
   let liveResets=0; const reset=g.ball.setTranslation.bind(g.ball);
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return reset(...args);};
   for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:side<0,right:side>0});
   assert.equal(liveResets,0,`${lane} lane uses only physical contacts`);
   if(lane==='in')assert.ok(g.metrics.flipperContacts[side<0?0:1]>0);
   else {assert.equal(g.state.phase,'ready');assert.deepEqual(g.metrics.flipperContacts,[0,0]);}
  }finally{g.dispose();}
 }
});

 test('actual outlane entrance has full ball clearance and mirrored shared paths',()=>{
  for(const side of [-1,1]) {
    const [divider,inner,outer]=lowerLanePaths(side);
    assert.ok(divider[0][2]>=outer[0][2]); // Split follows the wider sling, not the side-wall start.
    assert.ok(Math.abs(outer[0][0]-divider[0][0])-2*LOWER_LAYOUT.guideRadius>2*TABLE.ballRadius+.03);
    for(const path of [divider,inner,outer])for(const p of path)assert.ok(p[0]*side>0);
    divider[0][0]=999;
    assert.notEqual(lowerLanePaths(side)[0][0][0],999);
  }
});

test('side wire exit drops into the real IN guide and held flipper without rescue',async()=>{
 for(const speed of [1,2,3]) {
  const g=await PinballPhysics.create();
  try {
   g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
   // Existing deck outlet .44 above table, ball center at .575. This fixture
   // tests the drop only, not a claim of full-ramp traversal.
   g.ball.setTranslation({x:-1.55,y:.575,z:2.70},true);
   g.ball.setLinvel({x:0,y:0,z:speed},true);
   let resets=0;const setTranslation=g.ball.setTranslation.bind(g.ball);
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')resets++;return setTranslation(...args);};
   for(let tick=0;tick<600&&g.state.phase==='playing';tick++)g.step(1/120,{left:true});
   assert.equal(g.state.phase,'playing');assert.ok(g.metrics.flipperContacts[0]>0);
   assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.05);
   assert.equal(resets,0);
  }finally{g.dispose();}
 }
});

test('five adjacent redesigned bat shots traverse S, capture and refire the same ball',async()=>{for(const release of [80,81,82,83,84]){const g=await PinballPhysics.create();g.launch();g.state.kickbackCharges=0;g.ball.setTranslation({x:-1.6,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);let resets=0;const set=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...a)=>{if(g.state.phase==='playing')resets++;return set(...a);};for(let i=0;i<500;i++)g.step(1/120,{left:true});for(let i=0;i<release;i++)g.step(1/120);for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:true});assert.equal(g.rampTraversals,1);assert.equal(g.state.phase,'playing');assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.05);const count=g.metrics.coilImpulses[0];for(let i=0;i<45;i++)g.step(1/120);let z=9;for(let i=0;i<300&&g.state.phase==='playing';i++){g.step(1/120,{left:true});z=Math.min(z,g.ballPosition.z);}assert.ok(g.metrics.coilImpulses[0]>count);assert.ok(z<-1);assert.equal(resets,0);assert.equal(g.state.ballNumber,1);assert.equal(g.state.phase,'playing');g.dispose();}
});

test('old IN approach strikes the outward sling then drains or permits a releasable cradle',async()=>{
 for(const side of [-1,1])for(const speed of [1,3,6]) {
  const g=await PinballPhysics.create();try {
   g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
   // z2.1 is now within the sling, so approach from its upstream side.
   g.ball.setTranslation({x:side*1.72,y:.18,z:Math.min(...LOWER_LAYOUT.slingVertices.map(p=>p[1]))-.35},true);g.ball.setLinvel({x:0,y:0,z:speed},true);
   for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:side<0,right:side>0});
   if(g.state.phase==='playing'){
    assert.ok(g.metrics.flipperContacts[side<0?0:1]>0);
    assert.ok(Math.abs(Math.abs(g.ballPosition.x)-(LOWER_LAYOUT.flipperPivot[0]-.195))<.03);
    assert.ok(Math.abs(g.ballPosition.z-(LOWER_LAYOUT.flipperPivot[2]-.392))<.03);
    for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120);
   }
   assert.equal(g.state.phase,'ready');
  }finally{g.dispose();}
 }
});

test('IN floor stripe stays clear of the real rails and sling rubber',()=>{
 const paths=lowerLanePaths(1).map(path=>path.map(([x,,z])=>new T.Vector2(x,z)));
 const sling=slingContactPoints(LOWER_LAYOUT.slingVertices).map(([x,,z])=>new T.Vector2(x,z));
 for(let i=0;i<LOWER_LAYOUT.inlaneInkPath.length-1;i++)for(let j=0;j<=20;j++){
  const a=LOWER_LAYOUT.inlaneInkPath[i],b=LOWER_LAYOUT.inlaneInkPath[i+1],t=j/20,p=new T.Vector2(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t),w=a[2]+(b[2]-a[2])*t;
  for(const [path,radius] of [...paths.map(path=>[path,LOWER_LAYOUT.guideRadius]),[sling,.025]])for(let k=0;k<path.length-1;k++){
   const u=path[k],v=path[k+1],d=v.clone().sub(u),q=Math.max(0,Math.min(1,p.clone().sub(u).dot(d)/d.lengthSq()));
   assert.ok(p.distanceTo(u.clone().addScaledVector(d,q))>w/2+radius+.01,'floor ink crosses a physical rail');
  }
 }
});

// The historical drop above remains separate coverage. Exercise the actual
// current outlet tangent too, so moving the wire cannot hide a bad handoff.
test('current outside wire outlet feeds the held left cradle at three speeds',async()=>{
 const r=sampleRamp().at(-1);
 for(const speed of [1,2,3]){
  const g=await PinballPhysics.create();
  try{
   g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
   g.ball.setTranslation({x:r.p.x,y:r.p.y+.135,z:r.p.z},true);
   g.ball.setLinvel({x:r.t.x*speed,y:r.t.y*speed,z:r.t.z*speed},true);
   let resets=0;const reset=g.ball.setTranslation.bind(g.ball);
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')resets++;return reset(...args);};
   for(let tick=0;tick<1200&&g.state.phase==='playing';tick++)g.step(1/120,{left:true});
   assert.equal(g.state.phase,'playing');assert.ok(g.metrics.flipperContacts[0]>0);
   assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.05);
   assert.ok(Math.abs(g.ballPosition.x+(LOWER_LAYOUT.flipperPivot[0]-.195))<.03);
   assert.ok(Math.abs(g.ballPosition.z-(LOWER_LAYOUT.flipperPivot[2]-.392))<.03);
   assert.equal(resets,0);
  }finally{g.dispose();}
 }
});

function sphereClearance(g,p) {
 let distance=Infinity;
 g.world.forEachCollider(c=>{
  if(c.handle===g.ballCollider.handle||c.isSensor())return;
  const q=c.projectPoint(p,true),d=Math.hypot(p.x-q.point.x,p.y-q.point.y,p.z-q.point.z);
  assert.ok(Number.isFinite(d),'finite initial collider distance');
  distance=Math.min(distance,d);
 });
 return distance-TABLE.ballRadius;
}

test('lane edge fixtures distinguish genuine mouths from initial rail penetration',async()=>{
 const g=await PinballPhysics.create();
 try {
  // These are intentionally invalid probes, never silently skipped game routes:
  // ±2.20/±2.24 penetrate the outer rail; +2.18 penetrates the shooter divider.
  const invalid=[-2.20,2.20,-2.24,2.24,2.18];
  for(const x of invalid)assert.ok(sphereClearance(g,{x,y:.18,z:2.6})<-.002,JSON.stringify({x}));
  assert.equal(invalid.length,5);
  assert.ok(sphereClearance(g,{x:-2.18,y:.18,z:2.6})>=-1e-4,'left edge remains a valid distinct boundary');
 }finally{g.dispose();}
});

test('offset slow and fast lane entries and lateral approaches remain physical and releasable',async()=>{
 const fixtures=[];
 for(const side of [-1,1])for(const held of [false,true]){
  for(const x of [1.60,1.72,1.82])for(const speed of [.25,12])
   fixtures.push({side,held,lane:'in',x,z:2.8,vx:0,vz:speed});
  for(const x of [2.02,2.12])for(const speed of [.25,12])
   fixtures.push({side,held,lane:'out',x,z:2.6,vx:0,vz:speed});
  for(const z of [2.85,3.2,3.6,4.0])for(const vx of [-3,3])
   fixtures.push({side,held,lane:'lateral',x:1.65,z,vx:side*vx,vz:.25});
 }
 assert.equal(fixtures.length,72);
 let executed=0;
 for(const f of fixtures){
  const g=await PinballPhysics.create();
  try {
   g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
   const p={x:f.side*f.x,y:.18,z:f.z},detail=JSON.stringify(f);
   assert.ok(sphereClearance(g,p)>=-1e-4,'invalid starting sphere: '+detail);
   executed++;
   g.ball.setTranslation(p,true);g.ball.setLinvel({x:f.vx,y:0,z:f.vz},true);
   let liveResets=0,quiet=0,maxQuiet=0,last={...p};
   const reset=g.ball.setTranslation.bind(g.ball);
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return reset(...args);};
   for(let tick=0;tick<2400&&g.state.phase==='playing';tick++){
    last={...g.ballPosition};g.step(1/120,f.held?{left:f.side<0,right:f.side>0}:{});
    const v=g.ball.linvel();quiet=Math.hypot(v.x,v.y,v.z)<.025?quiet+1:0;maxQuiet=Math.max(maxQuiet,quiet);
   }
   const end={...g.ballPosition},contacts=[...g.metrics.flipperContacts];
   const cradle=g.state.phase==='playing'&&f.held&&quiet>120&&
    Math.abs(end.x-f.side*(LOWER_LAYOUT.flipperPivot[0]-.195))<.03&&
    Math.abs(end.z-(LOWER_LAYOUT.flipperPivot[2]-.392))<.03;
   assert.ok(maxQuiet<=600||cradle,'persistent stop outside held cradle: '+detail+JSON.stringify(end));
   if(f.lane==='out'){
    assert.equal(g.state.phase,'ready','OUT must drain without input rescue: '+detail);
    assert.deepEqual(contacts,[0,0],'OUT must not cross a bat: '+detail);
   }
   if(f.lane==='in'&&f.held&&f.vz===.25){
    assert.ok(cradle,'slow IN must reach same-side cradle: '+detail);
    assert.ok(contacts[f.side<0?0:1]>0,detail);
   }
   // Fast IN may rebound across the bats and drain. Never manufacture capture.
   // Every surviving held cradle must release and finish a normal ball.
   for(let tick=0;tick<7200&&g.state.phase==='playing';tick++){
    last={...g.ballPosition};g.step(1/120);
   }
   assert.equal(g.state.phase,'ready','must release/drain: '+detail);
   assert.equal(g.state.ballNumber,2,detail);
   assert.ok(last.z>LOWER_LAYOUT.drainZ-.45,'must leave through the lower edge: '+detail+JSON.stringify(last));
   assert.equal(liveResets,0,'no live reposition: '+detail);
   assert.equal(g.state.kickbackUses,0,detail);assert.equal(g.state.sideSaveUses,0,detail);
  }finally{g.dispose();}
 }
 assert.equal(executed,72,'no invalid fixtures may be skipped');
});
