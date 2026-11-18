import test from 'node:test';
import assert from 'node:assert/strict';
import {UpperShotChallenge} from './upper-shots.mjs';
import {PinballGameState} from './game-state.mjs';
test('center drive needs ordered spinner then B, not rebounds or repeated rollovers',()=>{
 const s=new UpperShotChallenge();assert.equal(s.onEvent({type:'rollover',lane:1}),false);
 s.onEvent({type:'spinner'});s.advanceTime(.4);assert.equal(s.onEvent({type:'rollover',lane:1}),true);
 assert.equal(s.onEvent({type:'rollover',lane:1}),false);
 for(const event of [{type:'bumper'},{type:'bank'},{type:'loop'},{type:'ramp'}]){s.onEvent({type:'spinner'});s.advanceTime(.3);s.onEvent(event);assert.equal(s.onEvent({type:'rollover',lane:1}),false);}
 s.onEvent({type:'spinner'});s.advanceTime(3);assert.equal(s.onEvent({type:'rollover',lane:1}),false);
 s.onEvent({type:'spinner'});s.advanceTime(.3);assert.equal(s.onEvent({type:'rollover',lane:0}),false);
 assert.equal(s.completions,1);
});
test('upper routes have distinct awarded outcomes and drive resets after drain',()=>{
 const s=new PinballGameState();s.launch();s.onEvent({type:'spinner',id:'s1'});s.advanceTime(.4);s.onEvent({type:'rollover',lane:1,id:'b1'});assert.equal(s.score,600);assert.match(s.lastEvent,/CENTER DRIVE/);
 s.onEvent({type:'loop',id:'l1'});assert.equal(s.lastContactAward.basePoints,300);
 s.onEvent({type:'ramp',id:'r1'});assert.equal(s.lastContactAward.basePoints,600);
 s.onEvent({type:'spinner',id:'s2'});s.drain();s.launch();s.advanceTime(.4);s.onEvent({type:'rollover',lane:1,id:'b2'});assert.equal(s.upperShots.completions,1);
});
test('physical center lane distinguishes weak rollback from strong B drive',async()=>{
 const {PinballPhysics}=await import('./physics.mjs');
 const g=await PinballPhysics.create();
 try{for(const speed of [8,12,16,22]){
  g.restart();g.launch();g.state.kickbackCharges=0;
  g.ball.setTranslation({x:0,y:.175,z:2},true);g.ball.setLinvel({x:0,y:0,z:-speed},true);
  let minZ=2;
  for(let i=0;i<720&&g.state.phase==='playing';i++){
   g.step(1/120);minZ=Math.min(minZ,g.ballPosition.z);
   if(i>30&&g.ballPosition.z>2&&g.ball.linvel().z>0)break;
  }
  assert.equal(g.state.upperShots.completions,speed===8?0:1,`speed ${speed}`);
  assert.ok(speed===8?minZ> -2:minZ< -4.5,`travel for ${speed}: ${minZ}`);
 }}finally{g.dispose();}
});
test('real right-bat release timing reaches center B in standard and relaxed modes',async()=>{
 const {PinballPhysics}=await import('./physics.mjs');
 for(const [difficulty,releases] of [['standard',[36,38,40]],['relaxed',[44,46,48]]]){
  const g=await PinballPhysics.create({difficulty});
  try{for(const release of releases){
   g.restart();g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;g.state.ballSaveAvailable=false;
   // Only fixture placement; every movement thereafter is physics + bat input.
   g.ball.setTranslation({x:1.6,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);
   for(let i=0;i<500;i++)g.step(1/120,{right:true});
   assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.01);
   const contacts=g.metrics.coilImpulses[1];
   for(let i=0;i<release;i++)g.step(1/120);
   for(let i=0;i<700&&g.state.phase==='playing'&&!g.state.upperShots.completions;i++)g.step(1/120,{right:true});
   assert.ok(g.metrics.coilImpulses[1]>contacts);
   assert.equal(g.state.upperShots.completions,1,`${difficulty} release ${release}`);
   assert.equal(g.state.ballNumber,1);
  }}finally{g.dispose();}
 }
});
test('relaxed left-bat adjacent release timings complete the elevated ramp and recapture',async()=>{
 const {PinballPhysics}=await import('./physics.mjs');
 const g=await PinballPhysics.create({difficulty:'relaxed'});
 try{for(const release of [97,98,99]){
  g.restart();g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;g.state.ballSaveAvailable=false;g.state.easyOutSaveAvailable=false;
  g.ball.setTranslation({x:-1.6,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);
  for(let i=0;i<500;i++)g.step(1/120,{left:true});
  for(let i=0;i<release;i++)g.step(1/120);
  for(let i=0;i<2400&&g.state.phase==='playing';i++)g.step(1/120,{left:true});
  assert.equal(g.rampTraversals,1,`release ${release}`);
  assert.equal(g.state.phase,'playing');assert.equal(g.state.ballNumber,1);
  assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.01);
  assert.ok(Math.abs(g.ballPosition.x+1.055)<.02);
 }}finally{g.dispose();}
});
