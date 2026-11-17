// Legal input only. Diagnostic simulation, not human-play difficulty scoring.
import fs from 'node:fs';
import {PinballPhysics} from '../web/js/pinball/physics.mjs';
const rows=[];
for(const mode of (process.env.PINBALL_MODES||'none,hold,pulse,alternate,reactive').split(','))for(const power of [.55,.65,.75,.85,.925,1])for(const offset of [0,17,41]){
 const g=await PinballPhysics.create({difficulty:process.env.PINBALL_DIFFICULTY || "standard"});let launchTime=0,launches=0,returns=0,lastLane='center',lastLaneTime=0;
 const drains=[];const raw=g.state.drain.bind(g.state);
 g.state.drain=(options)=>{const p=g.ballPosition;const record={at:g.time,age:g.time-launchTime,x:p.x,z:p.z,y:p.y,lane:g.time-lastLaneTime<2?lastLane:'center',score:g.state.score,reason:options?.reason??'normal'};const result=raw(options);record.saved=Boolean(g.state.ballSaved);drains.push(record);return result;};
 for(let tick=0;tick<120*180&&g.state.phase!=='gameover';tick++){
  if(g.state.phase==='ready'){if(g.state.returnedShooter)returns++;else launchTime=g.time;g.launch(power);launches++;}
  const p=g.ballPosition,v=g.ball.linvel();if(p.z>3.5&&Math.abs(p.x)>1.4){lastLane=p.x<0?'left':'right';lastLaneTime=g.time;}
  const t=tick+offset;let left=false,right=false;
  if(mode==='hold')left=right=true;
  if(mode==='pulse')left=right=t%72<24;
  if(mode==='alternate'){left=t%96<30;right=(t+48)%96<30;}
  if(mode==='reactive'){left=p.x<0&&p.z>3.3&&v.z>0;right=p.x>=0&&p.z>3.3&&v.z>0;}
  g.step(1/120,{left,right});
 }
 rows.push({mode,power,offset,seconds:g.time,score:g.state.score,ramps:g.rampTraversals,saves:g.state.ballSaveUses??0,phase:g.state.phase,launches,returns,drains});g.dispose();
}
const summary={};for(const mode of [...new Set(rows.map(r=>r.mode))]){const r=rows.filter(r=>r.mode===mode),d=r.flatMap(r=>r.drains),a=d.map(x=>x.age).sort((a,b)=>a-b);summary[mode]={games:r.length,finished:r.filter(x=>x.phase==='gameover').length,medianBall:a[Math.floor(a.length/2)],under10:d.filter(x=>x.age<10).length,drains:d.length,saved:d.filter(x=>x.saved).length,lost:d.filter(x=>!x.saved).length,left:d.filter(x=>x.lane==='left').length,right:d.filter(x=>x.lane==='right').length,center:d.filter(x=>x.lane==='center').length,ramps:r.reduce((a,x)=>a+x.ramps,0)};}const result={summary,rows};fs.writeFileSync(process.argv[2]||'artifacts/pinball/difficulty/baseline.json',JSON.stringify(result,null,2));console.log(JSON.stringify(summary,null,2));
