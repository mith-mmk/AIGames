import assert from 'node:assert/strict';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const expected=Number(process.argv[2]);
assert.ok(expected===1388||expected===1396);
const g=await PinballPhysics.create();
try{
 assert.equal(g.world.colliders.len(),expected);
 assert.equal(g.upperBarMountContacts.length,expected-1380);
 const lanes=[...g.hitObjects].filter(([,v])=>v.type==='rollover');assert.equal(lanes.length,3);
 for(const [handle,v] of lanes){const c=g.world.getCollider(handle),p=c.translation(),half=c.halfExtents();assert.equal(p.x,(v.lane-1)*1.25);assert.ok(Math.abs(p.z+4.55)<1e-6);assert.ok(Math.abs(p.y-half.y-.04)<1e-6);assert.ok(Math.abs(p.y+half.y-.36)<1e-6);}
 console.log(JSON.stringify({status:'assembled',steps:0,colliders:g.world.colliders.len(),mountContacts:g.upperBarMountContacts.length,lanes:3}));
}finally{g.dispose();}
