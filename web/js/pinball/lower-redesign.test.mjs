import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {PinballPhysics} from './physics.mjs';
import {LOWER_LAYOUT} from './layout.mjs';

// These are explicit local physics fixtures, not natural-launch/human play.
function clearance(g,p){let gap=Infinity;g.world.forEachCollider(c=>{if(c.handle===g.ballCollider.handle||c.isSensor())return;const h=c.contactShape(new R.Ball(.135),p,{x:0,y:0,z:0,w:1},1);if(h)gap=Math.min(gap,h.distance);});return gap;}
function place(g,p,v){assert.ok(clearance(g,p)>=-.001,'initial fixture must be outside solid stock: '+JSON.stringify(p));g.ball.setTranslation(p,true);g.ball.setLinvel(v,true);g.ball.setAngvel({x:0,y:0,z:0},true);}
function watch(g){const result={resets:0,drains:[],maxStill:0};const reset=g.ball.setTranslation.bind(g.ball),drain=g.state.drain.bind(g.state);g.ball.setTranslation=(...a)=>{if(g.state.phase==='playing')result.resets++;return reset(...a);};g.state.drain=o=>{result.drains.push({reason:o.reason,p:{...g.ballPosition}});return drain(o);};return result;}
function finish(g,result){let still=0;for(let i=0;i<3600&&g.state.phase==='playing';i++){g.step(1/120);still=!g.scoopHeld&&Math.hypot(...Object.values(g.ball.linvel()))<.08?still+1:0;result.maxStill=Math.max(result.maxStill,still);}assert.equal(result.resets,0,'no live ball reposition');assert.ok(result.maxStill<360,'no 3-second stationary trap '+JSON.stringify(g.ballPosition));assert.equal(g.state.phase,'ready');assert.equal(result.drains.length,1);assert.equal(result.drains[0].reason,'normal');}

test('old left-sling pocket is now occupied by solid stock, not a valid ball fixture',async()=>{
 const g=await PinballPhysics.create();try{
  for(const z of [1.7,2.3])assert.ok(clearance(g,{x:-1.7,y:.175,z})<-.01,'old pocket must lie inside installed part');
 }finally{g.dispose();}
});
test('clear mirrored outer and central sling approaches leave through normal drain',async()=>{
 for(const side of [-1,1])for(const [x,y,z,vx,vz] of [[2.1,.175,1.7,-.6,0],[2.1,.175,1.7,0,.4],[1.9,.175,2.66,0,-.6],[1.93,.175,2.66,0,-.6],[1.96,.175,2.66,0,-.6],[.8,.175,1.3,0,-.6],[1.47,1,2.1,0,-.6]]){
  const g=await PinballPhysics.create();try{g.launch();g.state.kickbackCharges=0;place(g,{x:side*x,y,z},{x:side*vx,y:0,z:vz});const observed=watch(g);finish(g,observed);}finally{g.dispose();}
 }
});
test('archived elevated outside drop stays inside visible cabinet and eventually drains normally',async()=>{
 const g=await PinballPhysics.create();try{g.launch();g.state.kickbackCharges=0;place(g,{x:-2.57,y:1.7,z:-2.7},{x:0,y:-1,z:0});const observed=watch(g);finish(g,observed);}finally{g.dispose();}
});
test('easy OUT switch kicks either lane at slow, medium and fast physical crossing without teleport',async()=>{
 for(const side of [-1,1])for(const speed of [1,8,24]){const g=await PinballPhysics.create({difficulty:'relaxed'});try{
  g.launch();g.state.kickbackCharges=0;place(g,{x:side*2.1,y:.18,z:3.3},{x:0,y:0,z:speed});const observed=watch(g);
  for(let tick=0;tick<180&&!g.state.easyOutSaveUses;tick++)g.step(1/120);
  assert.equal(g.state.easyOutSaveUses,1);assert.equal(g.state.easyOutSaveAvailable,false);assert.ok(g.ball.linvel().z<-11.9);assert.ok(Math.abs(g.ball.linvel().x)<.01);assert.equal(g.state.ballNumber,1);assert.equal(g.state.phase,'playing');assert.equal(observed.resets,0);assert.equal(observed.drains.length,0);
 }finally{g.dispose();}}
});
test('easy OUT allowance is shared across both lanes and not restored by same-ball shooter return',async()=>{
 for(const firstSide of [-1,1]){const g=await PinballPhysics.create({difficulty:'relaxed'});try{g.launch();g.state.kickbackCharges=0;g.state.ballSaveAvailable=false;
  place(g,{x:firstSide*2.1,y:.18,z:3.3},{x:0,y:0,z:8});for(let i=0;i<120&&!g.state.easyOutSaveUses;i++)g.step(1/120);assert.equal(g.state.easyOutSaveUses,1);
  g.state.returnToShooter();g.launch();assert.equal(g.state.easyOutSaveAvailable,false);
  // Separate opposed-lane fixture, never counted as an automatic live rescue.
  place(g,{x:-firstSide*2.1,y:.18,z:3.3},{x:0,y:0,z:8});const observed=watch(g);finish(g,observed);assert.equal(g.state.easyOutSaveUses,1);assert.equal(g.state.ballNumber,2);assert.equal(g.state.easyOutSaveAvailable,true,'only next numbered ball reloads');
 }finally{g.dispose();}}
});
test('standard and tilted easy OUT descents are not rescued',async()=>{
 for(const difficulty of ['standard','relaxed'])for(const side of [-1,1]){const g=await PinballPhysics.create({difficulty});try{g.launch();g.state.kickbackCharges=0;g.state.ballSaveAvailable=false;if(difficulty==='relaxed'){g.state.tilted=true;g.tiltUntil=g.time+10;}
  place(g,{x:side*2.1,y:.18,z:3.3},{x:0,y:0,z:8});const observed=watch(g);finish(g,observed);assert.equal(g.state.easyOutSaveUses,0);assert.equal(g.state.ballNumber,2);
 }finally{g.dispose();}}
});
test('uncharged center remains an open physical drain in both difficulties',async()=>{
 for(const difficulty of ['standard','relaxed'])for(const speed of [1,8,24]){const g=await PinballPhysics.create({difficulty});try{g.launch();g.state.kickbackCharges=0;g.state.ballSaveAvailable=false;place(g,{x:0,y:.18,z:4.75},{x:0,y:0,z:speed});const observed=watch(g);finish(g,observed);assert.equal(g.state.kickbackUses,0);assert.ok(observed.drains[0].p.z>LOWER_LAYOUT.drainZ);assert.equal(g.state.ballNumber,2);}finally{g.dispose();}}
});
test('center swept switch catches a fast floor ball once, never an airborne flyover',async()=>{
 for(const height of [.18,.65])for(const speed of [8,24]){const g=await PinballPhysics.create();try{g.launch();place(g,{x:0,y:height,z:4.80},{x:0,y:0,z:speed});const observed=watch(g);for(let i=0;i<30&&g.state.phase==='playing'&&!g.state.kickbackUses;i++)g.step(1/120);
  if(height<.3){assert.equal(g.state.kickbackUses,1);assert.ok(g.ball.linvel().z<-7.9);assert.equal(g.state.kickbackCharges,0);assert.equal(g.state.phase,'playing');}else{assert.equal(g.state.kickbackUses,0);assert.equal(g.state.phase,'ready');}
  assert.equal(observed.resets,0);
 }finally{g.dispose();}}
});
