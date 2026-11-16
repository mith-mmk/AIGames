// Comparative legal-input audit. No ball/velocity/score/trajectory fixtures.
// This controller is not a human player or a measure of human difficulty.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {PinballPhysics} from '../web/js/pinball/physics.mjs';
import {pinballFrameDelta} from '../web/js/pinball/frame-time.mjs';
import {LOWER_LAYOUT} from '../web/js/pinball/layout.mjs';
const results=[];
const powers=[.75,1];
const mode=process.argv[3] || 'candidate';
assert.ok(['candidate','legacy'].includes(mode));
const delays=[44,82];
for(const fps of [60,20,15,10])for(const power of powers)for(const delay of delays){
 const g=await PinballPhysics.create(),hold={left:0,right:0};
 let stage='catch',settled=0,until=0,side='left',shots=0,launches=0,liveResets=0;
 let lanes=0,bumpers=0,lastScore=0,lastMotionTick=0,stalled=false,wallSeconds=0,lastTick=0;
 let hardwareContactTicks=0,hardwareContactEvents=0,wasHardwareContact=false;
 // This shared collider includes acrylic exterior faces when available.
 const hardware=g.ramp.hardwareContacts?.[0]?.collider;
 const set=g.ball.setTranslation.bind(g.ball),event=g.state.onEvent.bind(g.state);
 g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return set(...args);};
 g.state.onEvent=e=>{const accepted=event(e);if(accepted&&e.type==='rollover')lanes++;if(accepted&&e.type==='bumper')bumpers++;return accepted;};
 try{
  for(let frame=0;frame<fps*180&&g.state.phase!=='gameover';frame++){
   const tick=g.time*120,elapsedTicks=tick-lastTick;lastTick=tick;
   wallSeconds=(frame+1)/fps;
   if(g.state.phase==='ready'){g.launch(power);launches++;stage='catch';settled=0;hold.left=hold.right=0;}
   const p=g.ballPosition,v=g.ball.linvel(),which=p.x<0?'left':'right',z=LOWER_LAYOUT.flipperPivot[2];
   if(stage==='catch'&&p.z>z-.70&&p.z<z+.25&&v.z>0&&Math.abs(p.x)>.10&&Math.abs(p.x)<1.4)hold[which]=tick+240;
   const input={left:tick<hold.left,right:tick<hold.right};
   if(stage==='catch'){
    const cradle=p.z>z-.65&&p.z<z+.05&&Math.abs(p.x)>.65&&Math.abs(p.x)<1.4&&Math.hypot(v.x,v.z)<.03;
    settled=cradle?settled+elapsedTicks:0;
    if(settled>=48){side=which;until=tick+delay;stage='release';shots++;}
   }
   if(stage==='release'){input[side]=false;if(tick>=until){input[side]=true;hold[side]=tick+240;stage='refire';until=tick+36;}}
   else if(stage==='refire'&&tick>=until){stage='catch';settled=0;}
   const previous=1000+frame*1000/fps,now=1000+(frame+1)*1000/fps;
   g.step(mode==='candidate'?pinballFrameDelta(now,previous):Math.min((now-previous)/1000,.05),input);
   let touchingHardware=false;
   if(hardware)g.world.contactPair(g.ballCollider,hardware,m=>{if(m.numContacts()>0)touchingHardware=true;});
   if(touchingHardware){hardwareContactTicks++;if(!wasHardwareContact)hardwareContactEvents++;}
   wasHardwareContact=touchingHardware;
   if(Math.hypot(v.x,v.z)>.03||g.state.score!==lastScore||stage!=='catch')lastMotionTick=tick;
   lastScore=g.state.score;
   if(g.state.phase==='playing'&&tick-lastMotionTick>120*8){stalled=true;break;}
  }
  const r={fps,mode,power,delay,phase:g.state.phase,ball:g.state.ballNumber,seconds:g.time,wallSeconds,score:g.state.score,lanes,bumpers,ramps:g.rampTraversals,shots,launches,liveResets,stalled,hardwareContactTicks,hardwareContactEvents,physicsMetrics:g.metrics,kickbackUses:g.state.kickbackUses,sideSaveUses:g.state.sideSaveUses};results.push(r);
  assert.equal(liveResets,0,'no live position rescue');
  assert.ok(Number.isFinite(r.score)&&Number.isFinite(r.seconds));
 }finally{g.dispose();}
}
const sum=k=>results.reduce((n,r)=>n+r[k],0),summary={games:results.length,finished:results.filter(r=>r.phase==='gameover').length,stalled:results.filter(r=>r.stalled).length,zeroScore:results.filter(r=>!r.score).length,score:sum('score'),ramps:sum('ramps'),lanes:sum('lanes'),bumpers:sum('bumpers'),shots:sum('shots'),seconds:sum('seconds'),liveResets:sum('liveResets'),hardwareContactEvents:sum('hardwareContactEvents'),hardwareContactTicks:sum('hardwareContactTicks')};
const result={method:'16 render-sampled three-ball sessions: 60/20/15/10 fps, powers .75/1, delays 44/82 simulation ticks; 180 wall-second cap. Controller observes state once per rendered frame, uses simulation-time catch/release durations, and only legal launch/flipper inputs. No browser rendering or device load, ball fixtures, score injection or live rescue. Hardware contact counts are per observation, not per physics step. Ordered worlds must match for comparisons. Not human difficulty or physical-phone evidence.',summary,results};
const output=process.argv[2]||'artifacts/pinball/low-fps-audit.json';fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2));console.log(JSON.stringify(summary));
