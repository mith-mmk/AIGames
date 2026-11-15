import test from 'node:test';
import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const target='five adjacent real flipper timings traverse the forward S and award once without teleport';
let current='',done=false,world=0,release=80;
const results=[],order=[],prefix=`${process.env.VARIANT}-${process.env.FLOOR}${process.env.CONTINUE83?"-continue83":""}`;
const save=()=>fs.writeFileSync(new URL(`${prefix}.json`,import.meta.url),JSON.stringify({order,results},null,2));
export function observedTest(name,fn){if(done)return;if(name===target)done=true;return test(name,async t=>{current=name;try{await fn(t);}finally{save();}});}
const original=PinballPhysics.create.bind(PinballPhysics);
PinballPhysics.create=async(...a)=>{const g=await original(...a);order.push({world:world++,test:current});if(current!==target)return g;
 const delay=release++,rows=[],vec=v=>[v.x,v.y,v.z];let tick=0;
 const ids=new Map(),shapes=[];g.world.forEachCollider(c=>{ids.set(c.handle,shapes.length);shapes.push({p:vec(c.translation()),type:c.shapeType(),half:c.halfExtents?.()});});
 const snap=()=>({p:vec(g.ball.translation()),v:vec(g.ball.linvel()),w:vec(g.ball.angvel()),phase:g.state.phase,stage:g.rampStage,ramps:g.rampTraversals});
 const step=g.step.bind(g);g.step=(dt,input)=>{const before=snap();const r=step(dt,input),contacts=[];g.world.contactPairsWith(g.ballCollider,c=>g.world.contactPair(g.ballCollider,c,(m,flip)=>{contacts.push({id:ids.get(c.handle),flip,n:vec(m.normal()),points:Array.from({length:m.numContacts()},(_,i)=>({d:m.contactDist(i),impulse:m.contactImpulse(i)}))});}));rows.push({tick:tick++,before,after:snap(),contacts});return r;};
 let saved=false;const finish=()=>{if(saved)return;saved=true;fs.writeFileSync(new URL(`${prefix}-${delay}.json.gz`,import.meta.url),gzipSync(JSON.stringify({delay,shapes,rows})));results.push({delay,ticks:tick,last:snap()});save();};
 const dispose=g.dispose.bind(g);g.dispose=()=>{finish();return dispose();};process.once('exit',finish);return g;};
