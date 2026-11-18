import test from 'node:test';
import assert from 'node:assert/strict';
import {UpperShotChallenge} from './upper-shots.mjs';
import {PinballGameState} from './game-state.mjs';
test('UPGRADE and DEEP B require distinct physical triggers and bounded runs',()=>{
 const s=new UpperShotChallenge(),spin={type:'spinner',forward:true},pop={type:'bumper',part:'b2',front:true,forward:true},B={type:'rollover',lane:1,forward:true};
 s.onEvent(spin);s.advanceTime(.1);assert.equal(s.onEvent(B),false,'a launcher/spinner alone cannot arm deep B');
 s.onEvent(spin);s.advanceTime(.05);assert.equal(s.onEvent(pop),'upgrade');assert.equal(s.onEvent(pop),false);
 s.armBat();s.advanceTime(.2);s.onEvent({type:'bumper',part:'b0',forward:true});s.onEvent({type:'rollover',lane:0,forward:true});s.advanceTime(.5);assert.equal(s.onEvent(B),'drive');assert.equal(s.onEvent(B),false);
 for(const block of ['sling','bank','ramp','loop','scoop','inlane','kickback','side-save','easy-out-save']){s.armBat();s.advanceTime(.1);s.onEvent({type:block});assert.equal(s.onEvent(B),false,block);}
 s.armBat();s.advanceTime(.2);s.onEvent({...B,forward:false});assert.equal(s.onEvent(B),false,'reverse B cancels');
 s.armBat();s.advanceTime(3.01);assert.equal(s.onEvent(B),false,'expired bat run');
 s.armBat();s.onEvent(spin);s.advanceTime(.1);assert.equal(s.onEvent(pop),'upgrade');assert.equal(s.onEvent(B),false,'upgrade consumes the bat run too');
 assert.equal(s.completions,3);
});

test('upper routes award target-specific outcomes and drains clear the armed run',()=>{
 const s=new PinballGameState();s.launch();let i=0;const hit=e=>s.onEvent({...e,id:''+(++i)});
 hit({type:'spinner',forward:true});s.advanceTime(.06);hit({type:'bumper',part:'b2',front:true,forward:true});assert.equal(s.score,600);assert.equal(s.lastAward.label,'UPGRADE SHOT');
 s.upperShots.armBat();s.advanceTime(.3);hit({type:'rollover',lane:1,forward:true});assert.equal(s.score,1050);assert.equal(s.lastAward.label,'DEEP B');
 hit({type:'loop'});assert.equal(s.lastContactAward.basePoints,300);hit({type:'ramp'});assert.equal(s.lastContactAward.basePoints,600);
 s.upperShots.armBat();s.drain();s.launch();s.advanceTime(.4);hit({type:'rollover',lane:1,forward:true});assert.equal(s.upperShots.completions,2);
});

test('the center target preserves the pop position and distinguishes weak rollback from UPGRADE',async()=>{
 const {PinballPhysics}=await import('./physics.mjs');
 for(const [difficulty,speeds] of [['standard',[7,10,16,22]],['relaxed',[7,8,12,16]]]){
  const g=await PinballPhysics.create({difficulty});
  try {for(const speed of speeds) {
   g.restart();g.launch();g.state.kickbackCharges=0;g.state.easyOutSaveAvailable=false;g.state.ballSaveAvailable=false;
   g.ball.setTranslation({x:0,y:.175,z:2},true);g.ball.setLinvel({x:0,y:0,z:-speed},true);
   let award=null,minZ=2;
   for(let i=0;i<720&&g.state.phase==='playing';i++){
    g.step(1/120);minZ=Math.min(minZ,g.ballPosition.z);
    if(g.state.upperShots.completions){award=g.state.lastAward.label;break;}
    if(i>30&&g.ballPosition.z>2&&g.ball.linvel().z>0)break;
   }
   assert.equal(award,speed===7?null:'UPGRADE SHOT',difficulty+' speed '+speed);
   assert.ok(speed===7?minZ>-1.3:minZ<-1.55,'expected that strong shots reach the installed front pop');
  }}finally{g.dispose();}
 }
});

test('real flipper input windows reach DEEP B and UPGRADE around the three pops',async()=>{
 const {PinballPhysics}=await import('./physics.mjs');
 for(const [difficulty,releases,goal] of [['standard',[53,54],'DEEP B'],['standard',[42],'UPGRADE SHOT'],['relaxed',[51,52],'UPGRADE SHOT']]){
  let reached=false;const observed=[];
  for(const release of releases){
   const g=await PinballPhysics.create({difficulty}),held={right:true};
   try{
    g.restart();g.launch();g.state.kickbackCharges=0;g.state.easyOutSaveAvailable=false;g.state.ballSaveAvailable=false;
    for(let i=0;i<30;i++)g.step(1/120,held);
    g.ball.setTranslation({x:1.81,y:.18,z:3.05},true);g.ball.setLinvel({x:0,y:0,z:2},true);
    for(let i=0;i<600;i++)g.step(1/120,held);
    assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.025);
    for(let i=0;i<release;i++)g.step(1/120);
    for(let i=0;i<700&&g.state.phase==='playing'&&!g.state.upperShots.completions;i++)g.step(1/120,held);
    assert.ok(g.metrics.coilImpulses[1]>0);
    observed.push([release,g.state.lastAward?.label]);
    if(g.state.lastAward?.label===goal){reached=true;assert.equal(g.state.ballNumber,1);break;}
   }finally{g.dispose();}
  }
  assert.ok(reached,`${difficulty} ${goal}: ${JSON.stringify(observed)}`);
 }
});
test('relaxed left-bat distinct release timings complete the elevated ramp and recapture',async()=>{
 const {PinballPhysics}=await import('./physics.mjs');
 const g=await PinballPhysics.create({difficulty:'relaxed'});
 const successes=[];
 try{for(const release of [93,94,95,96,97,98,99,100,101,102]){
  g.restart();g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;g.state.ballSaveAvailable=false;g.state.easyOutSaveAvailable=false;
  g.ball.setTranslation({x:-1.81,y:.18,z:3.05},true);g.ball.setLinvel({x:0,y:0,z:2},true);
  for(let i=0;i<550;i++)g.step(1/120,{left:true});
  assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.01,'incoming ball settles at the raised flipper');
  for(let i=0;i<release;i++)g.step(1/120);
  let heldSteps=0;
  for(let i=0;i<2000&&g.state.phase==='playing';i++){
   g.step(1/120,{left:true});const p=g.ballPosition,v=g.ball.linvel();
   heldSteps=g.rampTraversals===1&&Math.hypot(v.x,v.z)<.02&&Math.abs(p.x+1.055)<.03&&Math.abs(p.z-4.058)<.03?heldSteps+1:0;
   if(heldSteps>20)break;
  }
  if(heldSteps>20){assert.equal(g.state.phase,'playing');assert.equal(g.state.ballNumber,1);successes.push(release);}
 }
 assert.ok(successes.length>=3,`expected three same-ball ramp returns, got ${successes}`);
 }finally{g.dispose();}
});

test('the restored center pop does not lock a near-axis return into a repeated cycle',async()=>{
 const {PinballPhysics}=await import('./physics.mjs');
 for(const x of [-.1,0,.1])for(const zSpeed of [0,2,8]){
  const g=await PinballPhysics.create();
  try {
   g.launch();g.state.kickbackCharges=0;
   // With an unrelieved center pop, all three exact-axis starts repeated
   // for 30 seconds. Leave the art and contact positions intact.
   g.ball.setTranslation({x,y:.175,z:-2.9},true);
   g.ball.setLinvel({x:0,y:0,z:zSpeed},true);
   const ceiling=x===0?7:12;
   let escaped=false;
   for(let i=0;i<120*ceiling&&g.state.phase==='playing';i++){
    g.step(1/120);
    const p=g.ballPosition;
    if(p.z>-.8&&p.x<2.3){escaped=true;break;}
   }
   assert.ok(escaped,`x ${x}, speed ${zSpeed} did not exit the upper zone: ${JSON.stringify(g.ballPosition)}`);
   assert.equal(g.state.phase,'playing');
  }finally{g.dispose();}
 }
});
