import fs from 'node:fs';
import R from '../../../web/js/vendor/rapier3d-0.17.3/rapier.mjs';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const cases=[];
for(const x of [-2.12,-2.515])for(const speed of [.2,2,4,8])for(const charged of [false,true])cases.push({name:`mouth-${x}-${speed}-${charged}`,x,z:1.1,speed,charged,tilted:false});
for(const x of [-2.12,-2.515])for(const speed of [-2,2])cases.push({name:`tilt-${x}-${speed}`,x,z:1.1,speed,charged:true,tilted:true});
const results=[];
for(const spec of cases){
 const g=await PinballPhysics.create();try{
  g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=Number(spec.charged);g.state.tilted=spec.tilted;
  const start={x:spec.x,y:.175,z:spec.z};g.ball.setTranslation(start,true);g.ball.setLinvel({x:0,y:0,z:spec.speed},true);g.ball.setAngvel({x:0,y:0,z:0},true);
  const nearest=[];g.world.forEachCollider(c=>{if(c.isSensor()||c.handle===g.ballCollider.handle)return;const hit=c.projectPoint(start,c.shape.type!==R.ShapeType.TriMesh),gap=Math.hypot(start.x-hit.point.x,start.y-hit.point.y,start.z-hit.point.z)-.135;nearest.push({gap,inside:hit.isInside,type:c.shape.type,p:c.translation()});});nearest.sort((a,b)=>a.gap-b.gap);
  const events=[],trace=[];let resets=0,firstSave=null,minZAfterSave=Infinity,lastMotion=0,stalled=false,maxY=start.y;
  const event=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const accepted=event(e);if(accepted){events.push({...e,t:g.time,p:{...g.ballPosition}});if(e.type==='side-save'&&!firstSave)firstSave={t:g.time,p:{...g.ballPosition}};}return accepted;};
  const set=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')resets++;return set(...args);};
  for(let tick=0;tick<2400&&g.state.phase==='playing';tick++){
   g.step(1/120);const p={...g.ballPosition},v={...g.ball.linvel()};maxY=Math.max(maxY,p.y);
   if(firstSave&&g.state.phase==='playing')minZAfterSave=Math.min(minZAfterSave,p.z);
   if(Math.hypot(v.x,v.y,v.z)>.03)lastMotion=tick;
   if(tick-lastMotion>960){stalled=true;break;}
   if(tick%12===0||tick>2360)trace.push({tick,p,v,phase:g.state.phase});
  }
  results.push({spec,initialNearest:nearest.slice(0,4),initialLegal:nearest[0].gap>=-1e-4,phase:g.state.phase,returnedShooter:g.state.returnedShooter,ball:g.state.ballNumber,seconds:g.time,firstSave,minZAfterSave:Number.isFinite(minZAfterSave)?minZAfterSave:null,upstreamOfSaveByHalf:firstSave&&minZAfterSave<firstSave.p.z-.5,sideSaveUses:g.state.sideSaveUses,remainingCharge:g.state.sideSaveCharges,resets,stalled,maxY,metrics:g.metrics,events,trace});
 }finally{g.dispose();}
}
const summary={cases:results.length,validStarts:results.filter(r=>r.initialLegal).length,saves:results.filter(r=>r.firstSave).length,returnsHalf:results.filter(r=>r.upstreamOfSaveByHalf).length,liveResets:results.reduce((n,r)=>n+r.resets,0),stalled:results.filter(r=>r.stalled).length};
const output={method:'Paired old-coordinate and proposed-coordinate mouth fixtures in identical world creation order. Synthetic earned charge is a local mechanism fixture, NOT natural earning. Invalid initial solids are retained and excluded from success interpretation. Inputs/bat keys unused, 20 second cap. Upstream .5 is descriptive, not an adoption threshold. Full trace sampled every .1 second. Actual-phone/human play untested.',summary,results};
fs.writeFileSync(new URL(`./${process.env.MODE||'baseline'}-out.json`,import.meta.url),JSON.stringify(output,null,2));console.log(JSON.stringify(summary));
