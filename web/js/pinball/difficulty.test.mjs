import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballGameState,EASY_REPLAY_SECONDS} from './game-state.mjs';
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
  s.advanceTime(50);s.launch();assert.equal(s.ballSaveRemaining,EASY_REPLAY_SECONDS);
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
 s.setPaused(true);s.advanceTime(100);assert.equal(s.ballSaveRemaining,EASY_REPLAY_SECONDS-4);
 s.setPaused(false);s.returnToShooter();s.advanceTime(100);assert.equal(s.ballSaveRemaining,EASY_REPLAY_SECONDS-4);
 s.launch();assert.equal(s.ballSaveRemaining,EASY_REPLAY_SECONDS-4);assert.equal(s.kickbackCharges,0);
 s.advanceTime(EASY_REPLAY_SECONDS-4);assert.equal(s.ballSaveActive,false);s.drain();assert.equal(s.ballNumber,2);assert.equal(s.ballSaveUses,0);
 const before=relaxed();before.launch();before.advanceTime(EASY_REPLAY_SECONDS-.001);before.drain();assert.equal(before.ballNumber,1);
 const ticks=relaxed();ticks.launch();for(let i=0;i<120*EASY_REPLAY_SECONDS;i++)ticks.advanceTime(1/120);
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
  const remaining=g.state.ballSaveRemaining;assert.ok(remaining<EASY_REPLAY_SECONDS&&remaining>=EASY_REPLAY_SECONDS-.1-1e-9);
  g.setPaused(true);g.step(.1);assert.equal(g.state.ballSaveRemaining,remaining);g.setPaused(false);
  g.state.returnToShooter();g.step(.1);assert.equal(g.state.ballSaveRemaining,remaining);
  g.restart();assert.equal(g.state.difficulty,'relaxed');assert.equal(g.state.ballSaveRemaining,0);
 }finally{g.dispose();}
});
test('standard preserves default trajectory and Easy changes only the designed handling before saves',async()=>{
 const traces=[];
 for(const options of [undefined,{difficulty:'standard'},{difficulty:'relaxed'}]){
  const g=await PinballPhysics.create(options);
  try{
   g.launch(.75);const trace=[];
   for(let tick=0;tick<45;tick++){
    g.step(1/120,{left:tick>=15&&tick<22,right:tick>=27&&tick<38});
    assert.equal(g.state.ballNumber,1);assert.equal(g.state.phase,'playing');assert.equal(g.state.ballSaveUses,0);
    trace.push({p:{...g.ballPosition},v:{...g.ball.linvel()},angles:[...g.flipperAngles],score:g.state.score,metrics:g.metrics});
   }
   traces.push(trace);
  }finally{g.dispose();}
 }
 for(const [i,a] of traces[0].entries()) {
  const b=traces[1][i];
  assert.deepEqual(a.angles,b.angles);
  assert.deepEqual(a.metrics,b.metrics);
  assert.equal(a.score,b.score);
  for(const axis of ["x","y","z"]) {
   assert.ok(Math.abs(a.p[axis]-b.p[axis])<.001);
   assert.ok(Math.abs(a.v[axis]-b.v[axis])<.001);
  }
 }
 assert.notDeepEqual(traces[2],traces[0]);
 assert.ok(Math.abs(traces[2][0].angles[0]) < Math.abs(traces[0][0].angles[0]),'shallower rest angle');
 const g=await PinballPhysics.create();
 try {
  const standardGravity={...g.world.gravity};
  g.state.difficulty='relaxed';g.restart();
  assert.equal(g.world.gravity.y,standardGravity.y);
  assert.equal(g.world.gravity.z,standardGravity.z*.78);
  g.state.difficulty='standard';g.restart();
  assert.deepEqual({...g.world.gravity},standardGravity);
 } finally {g.dispose();}
});

test('Easy narrows the resting catch gap but leaves a full ball-width drain',async()=>{
 const {LOWER_LAYOUT,TABLE,flipperAngle}=await import('./layout.mjs');
 const {flipperProfile}=await import('./mechanical-contact.mjs');
 const gap=angle=>2*(LOWER_LAYOUT.flipperPivot[0]-
  Math.max(...flipperProfile().map(([x,z])=>x*Math.cos(angle)+z*Math.sin(angle))));
 const normal=gap(flipperAngle(false,false,'standard'));
 const easy=gap(flipperAngle(false,false,'relaxed'));
 assert.ok(easy<normal-.14,'the mode alters catch geometry');
 assert.ok(easy>2*TABLE.ballRadius+.12,'the ball can still fall between the resting bats');
 assert.ok(gap(flipperAngle(false,true,'relaxed'))>2*TABLE.ballRadius+.15);
});
