import fs from 'node:fs';import {gzipSync} from 'node:zlib';import crypto from 'node:crypto';
import R from '../../../web/js/vendor/rapier3d-0.17.3/rapier.mjs';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const results=[];
for(const entry of [{x:-1.72,z:2.8,name:'old-capture-start'},{x:-2.12,z:1.1,name:'new-in-mouth'}])for(const speed of [.2,2,4,8]){
 const g=await PinballPhysics.create();try{
  g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;const start={x:entry.x,y:.18,z:entry.z};
  let nearest={gap:Infinity};g.world.forEachCollider(c=>{if(c.isSensor()||c.handle===g.ballCollider.handle)return;const q=c.projectPoint(start,c.shape.type!==R.ShapeType.TriMesh);const gap=Math.hypot(start.x-q.point.x,start.y-q.point.y,start.z-q.point.z)-.135;if(gap<nearest.gap)nearest={gap,p:c.translation(),shape:c.shape.type};});
  const rows=[],shots=[];const vec=v=>[v.x,v.y,v.z],snap=()=>({p:vec(g.ball.translation()),v:vec(g.ball.linvel()),w:vec(g.ball.angvel()),phase:g.state.phase,coil:[...g.metrics.coilImpulses],angles:[...g.flipperAngles],ramp:g.rampTraversals});const originalStrike=g.strikeFlipper.bind(g);g.strikeFlipper=side=>{const before=snap(),ret=originalStrike(side);if(g.metrics.coilImpulses[side]>before.coil[side])shots.push({tick:rows.length,before,after:snap(),shot:structuredClone(g.lastFlipperShot)});return ret;}; const result={entry,speed,start,nearest,initialLegal:nearest.gap>=-1e-4,events:[],trace:[]};results.push(result);if(!result.initialLegal){result.outcome='invalid-start';continue;}
  g.ball.setTranslation(start,true);g.ball.setLinvel({x:0,y:0,z:speed},true);g.ball.setAngvel({x:0,y:0,z:0},true);
  const ev=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const ok=ev(e);if(ok)result.events.push({...e,time:g.time,p:{...g.ballPosition}});return ok;};let resets=0,quiet=0,capture=null,coilsAtCapture=null,minZAfterRepress=Infinity;
  const set=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...a)=>{if(g.state.phase==='playing')resets++;return set(...a);};
  for(let tick=0;tick<1800&&g.state.phase==='playing';tick++){
   const held=capture===null||tick>capture+45,before=snap();g.step(1/120,{left:held});const contacts=[];g.world.contactPairsWith(g.ballCollider,c=>g.world.contactPair(g.ballCollider,c,(m,flipped)=>{if(m.numContacts())contacts.push({shape:c.shapeType(),center:c.translation(),sensor:c.isSensor(),normal:vec(m.normal()),impulses:Array.from({length:m.numContacts()},(_,i)=>m.contactImpulse(i))});}));rows.push({tick,held,before,after:snap(),contacts});const p={...g.ballPosition},v={...g.ball.linvel()};
   if(capture===null){quiet=Math.hypot(v.x,v.y,v.z)<.05&&p.z>3.5&&p.z<4.6&&p.x<0?quiet+1:0;if(quiet>=30&&g.metrics.flipperContacts[0]>0){capture=tick;coilsAtCapture=g.metrics.coilImpulses[0];}}
   if(capture!==null&&tick>capture+45)minZAfterRepress=Math.min(minZAfterRepress,p.z);
   if(tick%12===0)result.trace.push({tick,p,v,held,phase:g.state.phase});
   if(capture!==null&&tick>capture+345)break;
  }
  const file=`${process.env.MODE}-in-${entry.name}-${speed}.json.gz`,bytes=gzipSync(JSON.stringify({rows,shots,entry,speed}));fs.writeFileSync(new URL(file,import.meta.url),bytes);Object.assign(result,{rawTrace:file,rawSHA256:crypto.createHash('sha256').update(bytes).digest('hex'),shots,capture,coilsAtCapture,coilsAfter:g.metrics.coilImpulses[0],minZAfterRepress:Number.isFinite(minZAfterRepress)?minZAfterRepress:null,phase:g.state.phase,ball:g.state.ballNumber,resets,metrics:g.metrics});
 }finally{g.dispose();}
}
fs.writeFileSync(new URL(`./${process.env.MODE||'baseline'}-in-arrival.json`,import.meta.url),JSON.stringify({method:'No rescue, identical old capture and proposed long-IN mouth starts; held left until quiet30 with bat contact, release45 and repress300. Fixture not natural play. Invalid starts retained, no relocation to obtain pass.',results},null,2));console.log(results.map(({trace,events,...r})=>({...r,eventTypes:events.map(e=>e.type)})));
