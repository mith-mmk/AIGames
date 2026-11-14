import fs from 'node:fs';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
import R from '../../../web/js/vendor/rapier3d-0.17.3/rapier.mjs';
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
const mode=process.env.MODE, results=[];
// Original family (overridden by fixed coarse loop below): left/right OUT speed .5 uncharged; left OUT same start with one fixture charge; left/right IN speed3 held. No offset search.
for(const delay of [45])for(const f of [{side:-1,lane:'out',charge:0},{side:1,lane:'out',charge:0},{side:-1,lane:'out',charge:1}]){
 const g=await PinballPhysics.create();try{
 const coils=[];const strike=g.strikeFlipper.bind(g);g.strikeFlipper=(side)=>{const before=g.coilImpulses[side],p={...g.ballPosition},v={...g.ball.linvel()};strike(side);if(g.coilImpulses[side]>before)coils.push({time:g.time,side,p,v,afterV:{...g.ball.linvel()},shot:structuredClone(g.lastFlipperShot),pose:{...g.flippers[side].rotation()},angularSpeed:g.flipperAngularSpeeds[side]});};g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=f.charge;
 const start=mode==='candidate'?{x:f.side*(f.lane==='in'?1.695:2.115),y:.18,z:3}:{x:f.side*(f.lane==='in'?1.72:2.12),y:.18,z:f.lane==='in'?2.8:2.6};
 const velocity={x:0,y:0,z:f.lane==='in'?3:.5};let nearest={gap:Infinity};
 g.world.forEachCollider(c=>{if(c.isSensor()||c.handle===g.ballCollider.handle)return;const q=c.projectPoint(start,c.shape.type!==R.ShapeType.TriMesh);const d=Math.hypot(start.x-q.point.x,start.y-q.point.y,start.z-q.point.z)-.135;const gap=q.isInside&&c.shape.type!==R.ShapeType.TriMesh?-Math.abs(d)-.27:d;if(gap<nearest.gap)nearest={gap,handle:c.handle,center:c.translation(),type:c.shape.type};});
 const r={delay,...f,coils,start,velocity,nearest,trace:[],events:[]};results.push(r);if(nearest.gap<-.000001){r.outcome='invalid-start';continue;}
 g.ball.setTranslation(start,true);g.ball.setLinvel(velocity,true);g.ball.setAngvel({x:0,y:0,z:0},true);
 const ev=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const ok=ev(e);if(ok)r.events.push({...e,time:g.time,p:{...g.ballPosition}});return ok;};
 let quiet=0,capture=null,release=null,repress=null,refire=false,resets=0;const set=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...a)=>{if(g.state.phase==='playing')resets++;return set(...a);};
 for(let tick=0;tick<1800&&g.state.phase==='playing';tick++){
 let held=f.lane==='in';if(release!==null&&tick<release+delay)held=false;if(release!==null&&tick===release+delay)repress=tick;
 g.step(1/120,{left:held&&f.side<0,right:held&&f.side>0});const p={...g.ballPosition},v={...g.ball.linvel()},contacts=[];
 g.world.contactPairsWith(g.ballCollider,c=>g.world.contactPair(g.ballCollider,c,(m,flipped)=>{if(!m.numContacts())return;contacts.push({handle:c.handle,center:c.translation(),type:c.shape.type,cam:c.handle===g.cMechanics?.cam?.handle,bat:g.flipperHandles.has(c.handle),normal:{...m.normal()},flipped,points:Array.from({length:m.numContacts()},(_,i)=>({dist:m.contactDist(i),impulse:m.contactImpulse(i)}))});}));
 quiet=Math.hypot(v.x,v.y,v.z)<.05&&p.z>3.5&&p.z<4.6&&Math.sign(p.x)===f.side?quiet+1:0;
 if(f.lane==='in'&&capture===null&&quiet>=30&&g.metrics.flipperContacts[f.side<0?0:1]>0){capture=tick;release=tick+1;}
 if(repress!==null&&p.z< -1)refire=true;
 const bat=g.flippers[f.side<0?0:1],pose={...bat.rotation()},center={...bat.translation()},local=new T.Vector3(p.x-center.x,p.y-center.y,p.z-center.z).applyQuaternion(new T.Quaternion(pose.x,pose.y,pose.z,pose.w).invert());r.trace.push({tick,p,v,spin:{...g.ball.angvel()},bat:{pose,center,local:local.toArray(),angularSpeed:g.flipperAngularSpeeds[f.side<0?0:1],angle:g.flipperAngles[f.side<0?0:1]},lastFlipperShot:g.lastFlipperShot?structuredClone(g.lastFlipperShot):null,contacts,phase:g.state.phase,ball:g.state.ballNumber,charge:g.state.sideSaveCharges,firings:g.cMechanics?.firings??null});
 if(repress!==null&&tick>repress+1200)break;
 }
 Object.assign(r,{phase:g.state.phase,ball:g.state.ballNumber,final:{...g.ballPosition},capture,release,repress,refire,charge:g.state.sideSaveCharges,firings:g.cMechanics?.firings??null,contactTicks:g.cMechanics?.contactTicks??null,metrics:g.metrics,resets});
 }finally{g.dispose();}
}
fs.writeFileSync(new URL(mode+'-out.json',import.meta.url),JSON.stringify({method:'Explicit layout-relative legal starts, not natural earned charge/reachability. Prescribed capture observation30 quiet ticks is descriptive; existing tests unchanged. Fixed ascending delays30,35,40,45,50,55,60,65,70, left then right per delay. Only after capture release delay ticks then repress. Coarse diagnostic not continuous aim qualification. No force/solver variation.',results}));console.log(JSON.stringify(results.map(({trace,...r})=>r),null,2));
