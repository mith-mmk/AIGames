import fs from 'node:fs';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
const results=[];const vec=v=>[v.x,v.y,v.z];
for(const kind of ['bumper','sling','wall','flipper-held','flipper-rising'])for(const speed of [6,12,24]){
 const g=await PinballPhysics.create();g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
 let target,side=0;
 if(kind==='bumper')target=g.world.getCollider([...g.hitObjects].find(([,h])=>h.type==='bumper')[0]);
 if(kind==='sling'){
  const cs=[...g.hitObjects].filter(([,h])=>h.type==='sling'&&h.x<0).map(([h])=>g.world.getCollider(h));
  target=cs.sort((a,b)=>Math.abs(a.translation().z-1.95)-Math.abs(b.translation().z-1.95))[0];
 }
 if(kind==='wall')target=g.cabinetBoundaryContacts[0].collider;
 if(kind.startsWith('flipper')){
  if(kind==='flipper-held')for(let i=0;i<15;i++)g.step(1/120,{left:true});
  target=g.world.getCollider([...g.flipperHandles].find(([,s])=>s===side)[0]);
 }
 // Isolate the actual target and ball: no floor, gravity, adjacent objects or natural route.
 const keep=new Set([target.handle,g.ballCollider.handle]);const remove=[];g.world.forEachCollider(c=>{if(!keep.has(c.handle))remove.push(c);});for(const c of remove)g.world.removeCollider(c,true);
 g.world.gravity={x:0,y:0,z:0};
 let center=new T.Vector3().copy(target.translation()),normal;
 if(kind==='wall'){center.z=0;center.y=.175;normal=new T.Vector3(1,0,0);}
 else if(kind==='bumper'){center.y=.175;normal=new T.Vector3(0,0,1);}
 else if(kind==='sling'){normal=new T.Vector3(1,0,0);}
 else {const q=new T.Quaternion().copy(target.rotation());center.add(new T.Vector3(.54,0,0).applyQuaternion(q));normal=new T.Vector3(0,0,-1).applyQuaternion(q);}
 // Exact surface projection from a point outside the selected target.
 const far=center.clone().addScaledVector(normal,2);const surface=target.projectPoint(far,false).point;
 normal=far.clone().sub(new T.Vector3().copy(surface)).normalize();
 const start=new T.Vector3().copy(surface).addScaledVector(normal,.135+.03);
 g.ball.setTranslation(start,true);g.ball.setLinvel(normal.clone().multiplyScalar(-speed),true);g.ball.setAngvel({x:0,y:0,z:0},true);
 const initialGap=start.distanceTo(new T.Vector3().copy(target.projectPoint(start,false).point))-.135;
 const records=[],trajectory=[];let tick=0,solverState=null;
 const hit=g.hit.bind(g);g.hit=h=>{const before=vec(g.ball.linvel());hit(h);if(h===target.handle)records.push({tick,phase:'event-kick',before,after:vec(g.ball.linvel())});};
 const strike=g.strikeFlipper.bind(g);g.strikeFlipper=s=>{const before=vec(g.ball.linvel()),coils=g.coilImpulses[s];strike(s);if(g.coilImpulses[s]!==coils)records.push({tick,phase:'coil',before,after:vec(g.ball.linvel())});};
 const step=g.world.step.bind(g.world);g.world.step=(...a)=>{const before=vec(g.ball.linvel());step(...a);g.world.contactPair(g.ballCollider,target,m=>{if(m.numSolverContacts())records.push({tick,phase:'solver',before,after:vec(g.ball.linvel()),normal:vec(m.normal()),contacts:m.numSolverContacts()});});solverState=vec(g.ball.linvel());};
 for(tick=0;tick<60;tick++){g.step(1/120,kind.startsWith('flipper')?{left:true}:{});trajectory.push({tick,p:vec(g.ballPosition),v:vec(g.ball.linvel()),phase:g.state.phase});if(records.some(r=>r.phase==='solver')&&tick>8)break;}
 results.push({kind,speed,initialGap,start:vec(start),normal:vec(normal),target:vec(target.translation()),records,trajectory,final:vec(g.ball.linvel()),solverState,coil:g.coilImpulses,contactObserved:records.some(r=>r.phase==='solver')});g.dispose();
}
fs.writeFileSync(new URL(process.env.CONTACT_OUT??'results.json',import.meta.url),JSON.stringify({method:'Synthetic isolated real target fixture. Removed all other contacts; gravity zero; original materials/damping/input/hit and coil logic retained. Not ordinary play. Held flipper settled15ticks before placement; rising starts from down pose. Start .03 clear of target, no adjacent-solid claim.',results},null,2));
for(const r of results){const s=r.records.find(x=>x.phase==='solver'),kick=r.records.find(x=>x.phase==='event-kick');console.log(r.kind,r.speed,'contact',r.contactObserved,'solver',s?.after,'kick',kick?.after,'coils',r.coil);}
