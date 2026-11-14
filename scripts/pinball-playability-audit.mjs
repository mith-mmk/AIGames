// Comparative legal-input audit. No ball/velocity/score/trajectory fixtures.
// This controller is not a human player or a measure of human difficulty.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PinballPhysics} from '../web/js/pinball/physics.mjs';
import {LOWER_LAYOUT} from '../web/js/pinball/layout.mjs';
const results=[];
const powers=[.55,.65,.75,.85,.925,1];
const delays=[44,49,60,66,68,69,80,82,84];
for(const power of powers)for(const delay of delays){
 const g=await PinballPhysics.create(),hold={left:0,right:0};
 let stage='catch',settled=0,until=0,side='left',shots=0,launches=0,liveResets=0;
 let lanes=0,bumpers=0,lastScore=0,lastMotionTick=0,stalled=false;
 let hardwareContactTicks=0,hardwareContactEvents=0,wasHardwareContact=false;
 // This shared collider includes acrylic exterior faces when available.
 const hardware=g.ramp.hardwareContacts?.[0]?.collider;
 const set=g.ball.setTranslation.bind(g.ball),event=g.state.onEvent.bind(g.state);
 g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return set(...args);};
 g.state.onEvent=e=>{const accepted=event(e);if(accepted&&e.type==='rollover')lanes++;if(accepted&&e.type==='bumper')bumpers++;return accepted;};
 try{
  for(let tick=0;tick<120*180&&g.state.phase!=='gameover';tick++){
   if(g.state.phase==='ready'){g.launch(power);launches++;stage='catch';settled=0;hold.left=hold.right=0;}
   const p=g.ballPosition,v=g.ball.linvel(),which=p.x<0?'left':'right',z=LOWER_LAYOUT.flipperPivot[2];
   if(stage==='catch'&&p.z>z-.70&&p.z<z+.25&&v.z>0&&Math.abs(p.x)>.10&&Math.abs(p.x)<1.4)hold[which]=tick+240;
   const input={left:tick<hold.left,right:tick<hold.right};
   if(stage==='catch'){
    const cradle=p.z>z-.65&&p.z<z+.05&&Math.abs(p.x)>.65&&Math.abs(p.x)<1.4&&Math.hypot(v.x,v.z)<.03;
    settled=cradle?settled+1:0;
    if(settled>=48){side=which;until=tick+delay;stage='release';shots++;}
   }
   if(stage==='release'){input[side]=false;if(tick>=until){input[side]=true;hold[side]=tick+240;stage='refire';until=tick+36;}}
   else if(stage==='refire'&&tick>=until){stage='catch';settled=0;}
   g.step(1/120,input);
   let touchingHardware=false;
   if(hardware)g.world.contactPair(g.ballCollider,hardware,m=>{if(m.numContacts()>0)touchingHardware=true;});
   if(touchingHardware){hardwareContactTicks++;if(!wasHardwareContact)hardwareContactEvents++;}
   wasHardwareContact=touchingHardware;
   if(Math.hypot(v.x,v.z)>.03||g.state.score!==lastScore||stage!=='catch')lastMotionTick=tick;
   lastScore=g.state.score;
   if(g.state.phase==='playing'&&tick-lastMotionTick>120*8){stalled=true;break;}
  }
  const r={power,delay,phase:g.state.phase,ball:g.state.ballNumber,seconds:g.time,score:g.state.score,lanes,bumpers,ramps:g.rampTraversals,shots,launches,liveResets,stalled,hardwareContactTicks,hardwareContactEvents,physicsMetrics:g.metrics,kickbackUses:g.state.kickbackUses,sideSaveUses:g.state.sideSaveUses};results.push(r);
  assert.equal(liveResets,0,'no live position rescue');
  assert.ok(Number.isFinite(r.score)&&Number.isFinite(r.seconds));
 }finally{g.dispose();}
}
const sum=k=>results.reduce((n,r)=>n+r[k],0),summary={games:results.length,finished:results.filter(r=>r.phase==='gameover').length,stalled:results.filter(r=>r.stalled).length,zeroScore:results.filter(r=>!r.score).length,score:sum('score'),ramps:sum('ramps'),lanes:sum('lanes'),bumpers:sum('bumpers'),shots:sum('shots'),seconds:sum('seconds'),liveResets:sum('liveResets'),hardwareContactEvents:sum('hardwareContactEvents'),hardwareContactTicks:sum('hardwareContactTicks')};
const result={method:'54 fixed-input three-ball sessions (repeatability depends on world creation order): six natural launch powers by nine fixed release delays; only legal launch/flipper input; catch regions relative to each layout. 180-second cap. hardwareContact fields count the shared metal/acrylic exterior collider, not individual material contacts. shots counts controller release-stage entries, not physical flipper contacts; physicsMetrics separately records actual contact/coil events. Existing target-earned saves are counted separately from prohibited live position resets. Not physical-phone or human difficulty evidence.',summary,results};
const output=process.argv[2]||'artifacts/pinball/playability-audit.json';fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(summary));
