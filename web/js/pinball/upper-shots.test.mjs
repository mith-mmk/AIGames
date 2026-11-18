import test from 'node:test';
import assert from 'node:assert/strict';
import {UpperShotChallenge} from './upper-shots.mjs';
import {PinballGameState} from './game-state.mjs';
test('UPGRADE and B-drive require the forward spinner and different physical destinations',()=>{
 const s=new UpperShotChallenge();
 const spin={type:'spinner',forward:true};
 const upgrade={type:'bumper',part:'b2',front:true,forward:true};
 const bDrive={type:'rollover',lane:1,forward:true};
 assert.equal(s.onEvent(bDrive),false);
 s.onEvent(spin);s.advanceTime(.05);assert.equal(s.onEvent(upgrade),'upgrade');
 assert.equal(s.onEvent(upgrade),false,'same armed shot cannot score twice');
 s.onEvent(spin);s.advanceTime(.4);assert.equal(s.onEvent(bDrive),'drive');
 for(const block of [{type:'sling'},{type:'bank'},{type:'ramp'},{type:'loop'},{type:'bumper',part:'b1'}]){
  s.onEvent(spin);s.advanceTime(.03);s.onEvent(block);
  assert.equal(s.onEvent(upgrade),false);
 }
 s.onEvent(spin);s.advanceTime(.06);assert.equal(s.onEvent({...upgrade,front:false}),false);
 s.onEvent(spin);s.advanceTime(.3);assert.equal(s.onEvent({...bDrive,forward:false}),false);
 s.onEvent({...spin,forward:false});s.advanceTime(.3);assert.equal(s.onEvent(upgrade),false);
 s.onEvent(spin);s.advanceTime(3);assert.equal(s.onEvent(bDrive),false);
 assert.equal(s.completions,2);
});

test('upper routes award their target-specific outcomes and reset the combo on drain',()=>{
 const s=new PinballGameState();s.launch();let i=0;
 const hit=e=>s.onEvent({...e,id:''+(++i)});
 const spin={type:'spinner',forward:true};
 const upgrade={type:'bumper',part:'b2',front:true,forward:true};
 const bDrive={type:'rollover',lane:1,forward:true};
 hit(spin);s.advanceTime(.06);hit(upgrade);
 assert.equal(s.score,600);assert.equal(s.lastAward.label,'UPGRADE SHOT');
 hit(spin);s.advanceTime(.3);hit(bDrive);
 assert.equal(s.score,1200);assert.equal(s.lastAward.label,'CENTER DRIVE');
 hit({type:'loop'});assert.equal(s.lastContactAward.basePoints,300);
 hit({type:'ramp'});assert.equal(s.lastContactAward.basePoints,600);
 hit(spin);s.drain();s.launch();s.advanceTime(.4);hit(bDrive);assert.equal(s.upperShots.completions,2);
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

test('real flipper releases reach the separate B and UPGRADE routes around the three pops',async()=>{
 const {PinballPhysics}=await import('./physics.mjs');
 for(const [difficulty,release,goal] of [['standard',49,'CENTER DRIVE'],['relaxed',51,'UPGRADE SHOT']]){
  const g=await PinballPhysics.create({difficulty});const held={right:true};
  try{
   g.launch();g.state.kickbackCharges=0;g.state.easyOutSaveAvailable=false;g.state.ballSaveAvailable=false;
   for(let i=0;i<30;i++)g.step(1/120,held);
   g.ball.setTranslation({x:1.81,y:.18,z:3.05},true);g.ball.setLinvel({x:0,y:0,z:2},true);
   for(let i=0;i<600;i++)g.step(1/120,held);
   assert.ok(Math.hypot(g.ball.linvel().x,g.ball.linvel().z)<.025);
   for(let i=0;i<release;i++)g.step(1/120);
   for(let i=0;i<700&&g.state.phase==='playing'&&!g.state.upperShots.completions;i++)g.step(1/120,held);
   assert.ok(g.metrics.coilImpulses[1]>0);
   assert.equal(g.state.lastAward?.label,goal);
   assert.equal(g.state.rollovers[1],goal==='CENTER DRIVE');
   assert.equal(g.state.ballNumber,1);
  }finally{g.dispose();}
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
