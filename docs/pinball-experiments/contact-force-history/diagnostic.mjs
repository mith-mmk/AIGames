import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const results=[];
for(const release of [80,81,82,83,84]) {
 const g=await PinballPhysics.create();g.launch();g.state.kickbackCharges=0;
 const events=[],frames=[];let tick=0,stage='initial';
 const vec=v=>[v.x,v.y,v.z];
 const snapshot=()=>({p:vec(g.ballPosition),v:vec(g.ball.linvel()),w:vec(g.ball.angvel()),ball:g.state.ballNumber,phase:g.state.phase,ramps:g.rampTraversals});
 const ids=new Map();g.world.forEachCollider(c=>ids.set(c.handle,ids.size));
 const contact=(c)=>{const out=[];g.world.contactPair(g.ballCollider,c,(m,flipped)=>out.push({normal:vec(m.normal()),flipped,points:Array.from({length:m.numContacts()},(_,i)=>({distance:m.contactDist(i),impulse:m.contactImpulse(i)}))}));return out;};
 const hit=g.hit.bind(g);g.hit=h=>{const o=g.hitObjects.get(h),pre=snapshot(),manifolds=contact(g.world.getCollider(h));hit(h);if(o?.type==='bumper')events.push({tick,stage,t:g.time,key:o.key,center:[o.x,o.z],pre,post:snapshot(),manifolds});};
 const step=g.step.bind(g);g.step=(...a)=>{const pre=snapshot();step(...a);const contacts=[];g.world.contactPairsWith(g.ballCollider,c=>{const m=contact(c);if(m.some(x=>x.points.length))contacts.push({id:ids.get(c.handle),hit:g.hitObjects.get(c.handle),flipper:g.flipperHandles.get(c.handle),p:vec(c.translation()),manifolds:m});});frames.push({tick:tick++,stage,pre,post:snapshot(),contacts});};

 g.ball.setTranslation({x:-1.6,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);
 for(let i=0;i<500;i++)g.step(1/120,{left:true});
 for(let i=0;i<release;i++)g.step(1/120);
 for(let i=0;i<1200&&g.state.phase==='playing';i++)g.step(1/120,{left:true});
 const capture={ball:g.state.ballNumber,phase:g.state.phase,ramps:g.rampTraversals,speed:Math.hypot(g.ball.linvel().x,g.ball.linvel().z)};
 stage='release-refire';for(let i=0;i<45;i++)g.step(1/120);
 stage='refire';for(let i=0;i<300&&g.state.phase==='playing';i++)g.step(1/120,{left:true});
 results.push({release,capture,final:{ball:g.state.ballNumber,phase:g.state.phase,score:g.state.score,p:{...g.ballPosition}},events,frames,orderAudit:g.bumperOrderAudit??[]});g.dispose();
}
fs.writeFileSync(new URL(process.env.DIAG_OUT||'refire-candidate.json.gz',import.meta.url),gzipSync(JSON.stringify(results,null,2)));
console.log(JSON.stringify(results.map(({release,capture,final})=>({release,capture,final}))));
