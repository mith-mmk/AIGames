import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballPhysics} from './physics.mjs';
import {SCOOP} from './scoop.mjs';
async function fixture(t,x=SCOOP.x,z=SCOOP.z+.55,y=.175,vz=-4) {
 const g=await PinballPhysics.create();t.after(()=>g.dispose());g.launch();
 g.ball.setTranslation({x,y,z},true);g.ball.setLinvel({x:0,y:0,z:vz},true);return g;
}
test('scoop captures a physical mouth traversal, holds, pauses, ejects and can be played again',async t=>{
 const g=await fixture(t);
 for(let i=0;i<60&&!g.scoopHeld;i++)g.step(1/120);
 assert.equal(g.scoopHeld,true);assert.equal(g.state.scoop.captures,1);
 const held={...g.ballPosition};g.setPaused(true);g.step(2);assert.deepEqual({...g.ballPosition},held);
 g.setPaused(false);for(let i=0;i<110;i++)g.step(1/120);
 assert.equal(g.scoopHeld,false);assert.ok(g.ballPosition.z>SCOOP.z+.3);assert.equal(g.state.scoop.captures,1);
 assert.equal(g.state.phase,'playing');
});
test('scoop side hit does not capture',async t=>{
 const g=await fixture(t,SCOOP.x+.65,SCOOP.z,.175,0);g.ball.setLinvel({x:-4,y:0,z:0},true);
 for(let i=0;i<40;i++)g.step(1/120);
 assert.equal(g.state.scoop.captures,0);
});
test('restart while held clears capture and launches normal dynamic ball',async t=>{
 const g=await fixture(t);for(let i=0;i<60&&!g.scoopHeld;i++)g.step(1/120);assert.equal(g.scoopHeld,true);
 g.restart();assert.equal(g.scoopHeld,false);assert.equal(g.state.scoop.captures,0);g.launch();
 g.step(.1);assert.ok(g.ball.linvel().z<0);
});
