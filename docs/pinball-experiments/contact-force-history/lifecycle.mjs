import assert from 'node:assert/strict';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const g=await PinballPhysics.create();
try{
 g.launch();const [handle,h]=[...g.hitObjects].find(([,h])=>h.key==='b0');
 const arm=()=>{g.cooldowns.clear();g.hit(handle);assert.equal(g.pendingBumperContacts.size,1);};
 arm();g.resetBall();assert.equal(g.pendingBumperContacts.size,0);
 g.launch();arm();g.restart();assert.equal(g.pendingBumperContacts.size,0);
 g.launch();arm();g.state.tilted=true;g.tiltUntil=g.time+1;g.step(1/120);assert.equal(g.pendingBumperContacts.size,0);g.state.tilted=false;
 arm();g.setPaused(true);g.step(1/120);assert.equal(g.pendingBumperContacts.size,1);g.setPaused(false);g.pendingBumperContacts.clear();
 // Fresh collision without any solver force must not cause a stale later kick.
 g.cooldowns.clear();g.ball.setTranslation({x:h.x,y:.175,z:h.z+.565},true);g.ball.setLinvel({x:0,y:0,z:-6},true);
 g.world.gravity={x:0,y:0,z:0};g.step(1/120);
 const before=g.bumperOrderAudit.length;g.ball.setTranslation({x:0,y:.2,z:0},true);g.ball.setLinvel({x:0,y:0,z:0},true);g.step(1/120);
 assert.equal(g.pendingBumperContacts.size,0);assert.equal(g.bumperOrderAudit.length,before);
 console.log('reset/restart/tilt/paused and no-force separation lifecycle passed');
}finally{g.dispose();}
