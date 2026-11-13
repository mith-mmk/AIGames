// Closed-loop legal-input QA: state observation selects flipper presses only.
// No incoming-ball fixture, score injection, position reset or trajectory edit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {PinballPhysics} from '../web/js/pinball/physics.mjs';
const results=[];
const holdUntil={left:0,right:0};
for(const power of [.65,.85,1]) {
 const g=await PinballPhysics.create(); const shots=[];
 let actions=0, settleTicks=0, stage='catch', activeSide='left', releaseTicks=0, until=0, lastLaunch=-1, stuckTicks=0;
 holdUntil.left=0;holdUntil.right=0;
 const startedAt=Date.now();let lastProgress={score:0,z:0};
 try {
  const rawSet=g.ball.setTranslation.bind(g.ball);let liveResets=0;
  g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return rawSet(...args);};
  for(let tick=0;tick<120*240&&g.state.phase!=='gameover';tick++) {
   if(g.state.phase==='ready' && lastLaunch!==g.state.ballNumber) {g.launch(power);lastLaunch=g.state.ballNumber;stage='catch';settleTicks=0;}
   const p=g.ballPosition,v=g.ball.linvel();
   const side=p.x<0?'left':'right';
   if(stage==='catch'&&p.z>3.35&&p.z<4.3&&v.z>0&&Math.abs(p.x)>.10&&Math.abs(p.x)<1.4)holdUntil[side]=tick+240;
   let input={left:tick<holdUntil.left,right:tick<holdUntil.right};
   if(stage==='catch') {
    const cradle=p.z>3.4&&p.z<4.1&&Math.abs(p.x)>.65&&Math.abs(p.x)<1.4&&Math.hypot(v.x,v.z)<.03;
    settleTicks=cradle?settleTicks+1:0;
    if(settleTicks>=48){activeSide=p.x<0?'left':'right';releaseTicks=actions%2===0?44:82;until=tick+releaseTicks;stage='release';actions++;shots.push({tick,side:activeSide,releaseTicks,scoreBefore:g.state.score});}
   }
   if(stage==='release') {input[activeSide]=false;if(tick>=until){input[activeSide]=true;holdUntil[activeSide]=tick+240;stage='refire';until=tick+36;}}
   else if(stage==='refire'&&tick>=until){stage='catch';settleTicks=0;}
   g.step(1/120,input);
   if(g.state.phase==='playing'&&stage==='catch'&&Math.hypot(v.x,v.z)<.01&&Math.abs(p.z-lastProgress.z)<.005)stuckTicks++;else stuckTicks=0;
   if(stuckTicks>120*5){break;}
   lastProgress={score:g.state.score,z:p.z};
  }
  results.push({power,phase:g.state.phase,score:g.state.score,ball:g.state.ballNumber,seconds:g.time,metrics:g.metrics,actions,shots,liveResets,position:g.ballPosition,stuckTicks,elapsedMs:Date.now()-startedAt});
  assert.equal(liveResets,0);
  assert.equal(g.state.phase,'gameover',`natural game at ${power} did not finish`);
  assert.equal(g.state.ballNumber,3);
  assert.equal(stuckTicks,0);
  assert.ok(Number.isFinite(g.state.score)&&g.state.score>0);
 }finally{g.dispose();}
}
fs.mkdirSync('artifacts/pinball',{recursive:true});fs.writeFileSync('artifacts/pinball/closed-loop-reactive-session-evidence.json',JSON.stringify({method:'Natural shooter launch followed only by observed, legal left/right input. Automated controller is not a human difficulty assessment.',results},null,2));
console.log(JSON.stringify(results,null,2));
