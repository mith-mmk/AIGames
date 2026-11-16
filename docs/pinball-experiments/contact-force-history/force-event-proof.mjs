// Isolated real Rapier evidence. No gameplay fixture or production changes.
import assert from 'node:assert/strict';
import R from '../../../web/js/vendor/rapier3d-0.17.3/rapier.mjs';
await R.init();
const results=[];
for(const reversed of [false,true]){
  const world=new R.World({x:0,y:0,z:0});world.timestep=1/120;
  const queue=new R.EventQueue(true);let ball,bumper,body;
  const createBall=()=>{
    body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,0,.565).setLinvel(0,0,-6).setCcdEnabled(true));
    ball=world.createCollider(R.ColliderDesc.ball(.135).setMass(.08).setRestitution(.22)
      .setActiveEvents(R.ActiveEvents.COLLISION_EVENTS|R.ActiveEvents.CONTACT_FORCE_EVENTS)
      .setContactForceEventThreshold(0),body);
  };
  if(reversed)createBall();
  bumper=world.createCollider(R.ColliderDesc.cylinder(.32,.4).setRestitution(.9));
  if(!reversed)createBall();
  const collisions=[],forces=[];
  try{
    for(let tick=0;tick<6;tick++){
      world.step(queue);
      queue.drainCollisionEvents((a,b,started)=>collisions.push({tick,a,b,started}));
      queue.drainContactForceEvents(event=>{
        // Copy the temporary callback values before Rapier frees the wrapper.
        const a=event.collider1(),b=event.collider2(),raw=event.maxForceDirection();
        const sign=ball.handle===b?1:-1;
        forces.push({tick,a,b,totalForce:{...event.totalForce()},rawNormal:{...raw},
          ballNormal:{x:sign*raw.x,y:sign*raw.y,z:sign*raw.z},
          magnitude:event.totalForceMagnitude(),velocity:{...body.linvel()}});
      });
    }
    assert.equal(collisions.length,2);
    assert.equal(collisions[0].started,true);
    assert.equal(collisions[0].tick,0);
    assert.equal(collisions[1].started,false);
    assert.equal(collisions[1].tick,1);
    assert.equal(forces.length,1);
    const force=forces[0];
    assert.equal(force.tick,collisions[1].tick,'end and force coexist in one step');
    assert.ok(force.magnitude>0);
    assert.ok(force.ballNormal.z>.999,'signed force normal points outward in either handle order');
    assert.ok(force.velocity.z>3.35&&force.velocity.z<3.37,'passive bounce is below powered minimum 6');
    results.push({reversed,ballHandle:ball.handle,bumperHandle:bumper.handle,collisions,forces});
  }finally{queue.free();world.free();}
}
console.log(JSON.stringify({method:'Synthetic isolated 6-unit/s impact, zero gravity, no damping; both collider creation orders. Demonstrates force-event lifetime/sign only, not gameplay quality.',passed:2,results},null,2));
