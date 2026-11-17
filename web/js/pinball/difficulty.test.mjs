import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballGameState} from './game-state.mjs';
import {PinballPhysics} from './physics.mjs';

const relaxed = () => new PinballGameState({difficulty:'relaxed'});
test('standard remains default, consumes three balls and does not refill center save',()=>{
 const s=new PinballGameState();assert.equal(s.difficulty,'standard');
 s.kickbackCharges=0;
 for(let ball=1;ball<=3;ball++){assert.equal(s.ballNumber,ball);s.launch();assert.equal(s.ballSaveActive,false);s.advanceTime(1);s.drain();assert.equal(s.kickbackCharges,0);}
 assert.equal(s.phase,'gameover');assert.equal(s.ballSaveUses,0);
 assert.throws(()=>new PinballGameState({difficulty:'unknown'}),TypeError);
});
test('relaxed replay is once per numbered ball with a finite three-save limit',()=>{
 const s=relaxed();let drains=0;
 for(let ball=1;ball<=3;ball++){
  assert.equal(s.ballNumber,ball);assert.equal(s.kickbackCharges,1);
  assert.equal(s.ballSaveRemaining,0);assert.equal(s.ballSaveActive,false);
  s.advanceTime(50);s.launch();assert.equal(s.ballSaveRemaining,10);
  s.kickbackCharges=0;s.advanceTime(2);s.award(100,'test');
  s.drain();drains++;assert.equal(s.ballNumber,ball);assert.equal(s.phase,'ready');assert.equal(s.ballSaved,true);
  assert.equal(s.ballSaveAvailable,false);assert.equal(s.kickbackCharges,0);
  s.advanceTime(50);s.launch();assert.equal(s.ballSaved,false);assert.equal(s.ballSaveRemaining,0);
  s.drain();drains++;
 }
 assert.equal(drains,6);assert.equal(s.phase,'gameover');assert.equal(s.ballSaveUses,3);assert.equal(s.score,300);
});
test('save deadline is playing time only, excludes exact expiry and never renews on shooter return',()=>{
 const s=relaxed();s.launch();s.advanceTime(4);s.kickbackCharges=0;
 s.setPaused(true);s.advanceTime(100);assert.equal(s.ballSaveRemaining,6);
 s.setPaused(false);s.returnToShooter();s.advanceTime(100);assert.equal(s.ballSaveRemaining,6);
 s.launch();assert.equal(s.ballSaveRemaining,6);assert.equal(s.kickbackCharges,0);
 s.advanceTime(6);assert.equal(s.ballSaveActive,false);s.drain();assert.equal(s.ballNumber,2);assert.equal(s.ballSaveUses,0);
 const before=relaxed();before.launch();before.advanceTime(9.999);before.drain();assert.equal(before.ballNumber,1);
 const ticks=relaxed();ticks.launch();for(let i=0;i<1200;i++)ticks.advanceTime(1/120);
 assert.equal(ticks.ballSaveRemaining,0);assert.equal(ticks.ballSaveActive,false);
});
test('TILT and escaped balls bypass replay; saved drains reset multiplier but retain mission progress',()=>{
 for(const reason of ['tilt','out-of-bounds']){const s=relaxed();s.launch();s.drain({reason});assert.equal(s.ballNumber,2);assert.equal(s.ballSaveUses,0);}
 const tilted=relaxed();tilted.launch();tilted.tilted=true;tilted.drain();assert.equal(tilted.ballNumber,2);
 const s=relaxed();s.launch();for(let i=0;i<5;i++)s.onEvent({type:'bumper',id:'b'+i});
 assert.equal(s.multiplier,2);const score=s.score,mission=s.mission.progress;
 s.drain();assert.equal(s.multiplier,1);assert.equal(s.score,score);assert.equal(s.mission.progress,mission);
 s.restart();assert.equal(s.difficulty,'relaxed');assert.equal(s.ballSaveUses,0);assert.equal(s.ballSaved,false);assert.equal(s.kickbackCharges,1);
});
test('physics saves only normal bottom drains after loss, never repositions a live ball',async()=>{
 for(const [position,saved] of [[{x:1,y:.18,z:5.15},true],[{x:1,y:-1.2,z:5.15},false],[{x:3.5,y:.18,z:5.15},false],[{x:0,y:.18,z:-7},false],[{x:0,y:.18,z:7},false]]){
  const g=await PinballPhysics.create({difficulty:'relaxed'});
  try{
   g.launch();g.state.kickbackCharges=0;g.ball.setTranslation(position,true);g.ball.setLinvel({x:0,y:0,z:0},true);
   let liveResets=0;const original=g.ball.setTranslation.bind(g.ball);
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return original(...args);};
   g.step(1/120);
   assert.equal(g.state.phase,'ready');assert.equal(g.state.ballNumber,saved?1:2);assert.equal(g.state.ballSaved,saved);assert.equal(liveResets,0);
  }finally{g.dispose();}
 }
});
test('physical countdown stops during pause and ready; restart preserves selected difficulty',async()=>{
 const g=await PinballPhysics.create({difficulty:'relaxed'});
 try{
  g.step(.1);assert.equal(g.state.ballSaveRemaining,0);g.launch();g.step(.1);
  const remaining=g.state.ballSaveRemaining;assert.ok(remaining<10&&remaining>=9.9-1e-9);
  g.setPaused(true);g.step(.1);assert.equal(g.state.ballSaveRemaining,remaining);g.setPaused(false);
  g.state.returnToShooter();g.step(.1);assert.equal(g.state.ballSaveRemaining,remaining);
  g.restart();assert.equal(g.state.difficulty,'relaxed');assert.equal(g.state.ballSaveRemaining,0);
 }finally{g.dispose();}
});
test('explicit standard and relaxed preserve default trajectories before any drain or save',async()=>{
 const traces=[];
 for(const options of [undefined,{difficulty:'standard'},{difficulty:'relaxed'}]){
  const g=await PinballPhysics.create(options);
  try{
   g.launch(.75);const trace=[];
   for(let tick=0;tick<180;tick++){
    g.step(1/120,{left:tick>=60&&tick<90,right:tick>=100&&tick<150});
    assert.equal(g.state.ballNumber,1);assert.equal(g.state.phase,'playing');assert.equal(g.state.ballSaveUses,0);
    trace.push({p:{...g.ballPosition},v:{...g.ball.linvel()},angles:[...g.flipperAngles],score:g.state.score,metrics:g.metrics});
   }
   traces.push(trace);
  }finally{g.dispose();}
 }
 assert.deepEqual(traces[1],traces[0]);assert.deepEqual(traces[2],traces[0]);
});
