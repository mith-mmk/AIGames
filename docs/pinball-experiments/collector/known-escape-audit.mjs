// Two known input schedules, not a broad playability or human-difficulty audit.
import fs from 'node:fs';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const archived=JSON.parse(fs.readFileSync(new URL('../difficulty/standard-final.json',import.meta.url)));
const baseline=archived.rows.filter(r=>r.offset===0&&r.drains.some(d=>d.reason==='out-of-bounds'))
 .map(({mode,power,offset,drains})=>({mode,power,offset,drains:drains.filter(d=>d.reason==='out-of-bounds')}));
const fixed=[];
for(const [mode,power] of [['pulse',.55],['reactive',.925]]) {
 const g=await PinballPhysics.create();const drains=[];const raw=g.state.drain.bind(g.state);
 try {
  g.state.drain=o=>{drains.push({at:g.time,reason:o.reason,position:g.ballPosition});return raw(o);};
  for(let tick=0;tick<21600&&g.state.phase!=='gameover';tick++) {
   if(g.state.phase==='ready')g.launch(power);
   const p=g.ballPosition,v=g.ball.linvel();
   const left=mode==='pulse'?tick%72<24:p.x<0&&p.z>3.3&&v.z>0;
   const right=mode==='pulse'?left:p.x>=0&&p.z>3.3&&v.z>0;
   g.step(1/120,{left,right});
  }
  fixed.push({mode,power,offset:0,phase:g.state.phase,seconds:g.time,drains});
 } finally {g.dispose();}
}
const result={method:'Standard mode, two legal-input three-ball sessions; 120 Hz fixed step, 180-second cap. No position/velocity injection or reset interception. Baseline is archived standard-final.json, not a new matched run. Integrated scoop and guard both change trajectories; world creation order also matters.',baseline,fixed};
fs.writeFileSync(new URL('./known-escape-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(fixed));
