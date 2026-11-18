import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';

const root=process.env.PINBALL_WEB_ROOT||resolve('web');
const {PinballPhysics}=await import(pathToFileURL(join(root,'js/pinball/physics.mjs')));
const rows=[];
for (const difficulty of ['standard','relaxed']) for(const power of [.55,.65,.75,.85,.925,1]) {
 for(const offset of [0,17]) {
  const game=await PinballPhysics.create({difficulty});
  try {
   let quiet=0,stall=0,drains=[],liveResets=0;
   const drain=game.state.drain.bind(game.state),translate=game.ball.setTranslation.bind(game.ball);
   game.state.drain=info=>{drains.push({at:game.time,reason:info.reason,p:{...game.ballPosition}});return drain(info);};
   game.ball.setTranslation=(...args)=>{if(game.state.phase==='playing')liveResets++;return translate(...args);};
   // Only legal launch and timed inputs. Stop when the first numbered ball
   // is really lost, not on its one allowed replay or shooter return.
   for(let tick=0;tick<60*120&&game.state.ballNumber===1;tick++) {
    if(game.state.phase==='ready')game.launch(power);
    const on=(tick+offset)%72<24;
    game.step(1/120,{left:on,right:on});
    const v=game.ball.linvel(),p=game.ballPosition;
    quiet=game.state.phase==='playing'&&!game.scoopHeld&&p.z<3.9&&Math.hypot(v.x,v.y,v.z)<.06?quiet+1:0;
    stall=Math.max(quiet,stall);
   }
   rows.push({difficulty,power,offset,seconds:game.time,completed:game.state.ballNumber>1,score:game.state.score,
    returns:game.metrics.upfieldReturns,ramps:game.rampTraversals,loops:game.state.loopCompletions,
    drives:game.state.upperShots?.completions??0,centerSaves:game.state.kickbackUses,outSaves:game.state.easyOutSaveUses??0,
    replays:game.state.ballSaveUses,drains,liveResets,stall});
  } finally {game.dispose();}
 }
}
const summary={};
for(const difficulty of ['standard','relaxed']){
 const subset=rows.filter(r=>r.difficulty===difficulty),times=subset.map(r=>r.seconds).sort((a,b)=>a-b);
 summary[difficulty]={runs:subset.length,medianFirstBallSeconds:(times[5]+times[6])/2,
   earlyLosses:subset.filter(r=>r.completed&&r.seconds<10).length,capped:subset.filter(r=>!r.completed).length,
   returns:subset.reduce((n,r)=>n+r.returns,0),ramps:subset.reduce((n,r)=>n+r.ramps,0),
   loops:subset.reduce((n,r)=>n+r.loops,0),drives:subset.reduce((n,r)=>n+r.drives,0),
   liveResets:subset.reduce((n,r)=>n+r.liveResets,0),maxStill:Math.max(...subset.map(r=>r.stall)),
   escaped:subset.flatMap(r=>r.drains).filter(r=>r.reason==='out-of-bounds').length};
}
const report={summary,rows};writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(summary));
