// Diagnostic only. These are injected entry/cradle fixtures, NOT natural play.
// No coefficient changes, attractors, or post-launch position correction.
import {PinballPhysics} from '../web/js/pinball/physics.mjs';
const rows=[];
for(const speed of[10,14,20]){
 const g=await PinballPhysics.create();
 try{
  g.launch();g.ball.setTranslation({x:-2.22,y:.175,z:-2.65},true);g.ball.setLinvel({x:0,y:0,z:-speed},true);
  let count=0,maxStage=0;const original=g.state.onEvent.bind(g.state);
  g.state.onEvent=e=>{if(e.type==='loop')count++;return original(e);};
  for(let i=0;i<1200&&g.state.phase==='playing'&&!count;i++){g.step(1/120);maxStage=Math.max(maxStage,g.loopTraversal.stage);}
  const row={fixture:'positioned-upper-entry',speed,completions:count,maxStage,phase:g.state.phase,position:{...g.ballPosition}};
  rows.push(row);console.log(JSON.stringify(row));
 }finally{g.dispose();}
}
for(let release=72;release<=88;release++){
 const g=await PinballPhysics.create();
 try{
  g.launch();g.state.kickbackCharges=0;
  g.ball.setTranslation({x:1.6,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);
  let count=0,maxStage=0;const original=g.state.onEvent.bind(g.state);
  g.state.onEvent=e=>{if(e.type==='loop')count++;return original(e);};
  for(let i=0;i<500;i++)g.step(1/120,{right:true});
  for(let i=0;i<release;i++)g.step(1/120);
  for(let i=0;i<1200&&g.state.phase==='playing'&&!count;i++){g.step(1/120,{right:true});maxStage=Math.max(maxStage,g.loopTraversal.stage);}
  const row={fixture:'positioned-right-cradle',releaseTicks:release,completions:count,maxStage,phase:g.state.phase,position:{...g.ballPosition}};
  rows.push(row);console.log(JSON.stringify(row));
 }finally{g.dispose();}
}
console.log(JSON.stringify({accepted:false,method:'Positioned fixtures only. Natural launch completion remains unproved.',entryPasses:rows.filter(r=>r.fixture==='positioned-upper-entry'&&r.completions).length,cradlePasses:rows.filter(r=>r.fixture==='positioned-right-cradle'&&r.completions).length}));
// This is an explicit rejected-candidate audit, not a passing release gate.
process.exitCode=1;
