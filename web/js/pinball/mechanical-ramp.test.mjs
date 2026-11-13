import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import { MechanicalRamp, MechanicalWireform, RAMP_WIRE_DIMENSIONS } from './components/ramp-wire.mjs';
import { buildPhysicalRamp, sampleRamp, RAMP_WALL_HEIGHT, WIRE_START_FRACTION, WIRE_HEIGHT_OFFSET, WIRE_RADIUS, WIRE_HALF_SPACING, rampWireRails } from './ramp-geometry.mjs';

test('installed ramp has matched sheet walls, true paired rails and visible anti-trap base',()=>{
 const part=new MechanicalRamp();
 try {
  assert.equal(RAMP_WIRE_DIMENSIONS.wall,RAMP_WALL_HEIGHT);
  assert.ok(part.root.getObjectByName('chamfered-anti-trap-nose'));
  assert.ok(part.root.getObjectByName('left-low-base-skirt'));
  const wire=part.root.getObjectByName('true-paired-wire-return');
  assert.equal(wire.userData.hiddenFloor,false);
  assert.equal(wire.userData.runningRails,2);
  const floor=part.root.getObjectByName('continuous-floor-with-underside');
  assert.equal(floor.geometry.attributes.position.count,(Math.round(240*WIRE_START_FRACTION)+1)*4);
  assert.ok(floor.material.opacity>=.35,'acrylic must remain visible rather than disguise a floor');
  const expected=sampleRamp()[160];
  const rows=rampWireRails(sampleRamp().slice(160));
  assert.ok(Math.abs(rows[0][0].distanceTo(rows[2][0])-2*WIRE_HALF_SPACING)<1e-8);
  const ball=new T.Vector3(expected.p.x,expected.p.y+.135,expected.p.z);
  assert.ok(Math.abs(ball.distanceTo(rows[0][0])-(.135+WIRE_RADIUS))<1e-8);
  assert.ok(WIRE_HEIGHT_OFFSET>0);
 } finally {part.dispose();}
});

test('support columns are outside table and beams clear the ground ball envelope',()=>{
 const part=new MechanicalRamp();
 try {
  part.root.updateMatrixWorld(true);
  let posts=0, beams=0;
  part.root.traverse(o=>{
   if(!o.geometry)return;
   const b=new T.Box3().setFromObject(o);
   if(/^support-post-/.test(o.name)) {
    posts++;assert.ok(b.max.x< -2.75 || b.min.x>2.75 || b.max.z< -5.75,`${o.name} crosses table lane`);
   }
   if(/^cantilever-crosshead-/.test(o.name)) {beams++;assert.ok(b.min.y>.31,`${o.name} blocks ground ball at ${b.min.y}`);}
   assert.ok(!o.name.startsWith('diagonal-knee-brace'));
  });
  assert.ok(posts>4);assert.equal(posts,beams);
 } finally {part.dispose();}
});

test('production return has an actual open gap, not a hidden supporting floor',async()=>{
 await R.init(); const world=new R.World({x:0,y:-9.81,z:0});
 try {
  buildPhysicalRamp({world});world.step();
  const rows=sampleRamp();
  const rayAt=i=>{const p=rows[i].p;return world.castRay(new R.Ray({x:p.x,y:p.y+.5,z:p.z},{x:0,y:-1,z:0}),.7,true);};
  assert.ok(rayAt(140),'sheet rise must have a real deck');
  assert.equal(rayAt(190),null,'center gap between running wires must be physically open');
  assert.equal(rayAt(225),null,'wire exit must not retain a hidden deck');
 } finally {world.free();}
});

test('standalone paired rails support and roll a ball without any plane collider',async()=>{
 await R.init(); const world=new R.World({x:0,y:-9.81,z:1});world.timestep=1/120;
 const part=new MechanicalWireform({points:[[0,.8,0],[0,.8,2]]});
 try {
  const physical=part.createColliders(world);
  assert.equal(physical.colliders.length,480);
  assert.equal(physical.hiddenFloor,false);
  const height=part.root.userData.ballCenterAboveRunningWires;
  const ball=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,.8+height,.2).setCcdEnabled(true));
  world.createCollider(R.ColliderDesc.ball(.135).setFriction(.025),ball);
  for(let i=0;i<120;i++){world.step();assert.ok(Math.abs(ball.translation().x)<.03);assert.ok(Math.abs(ball.translation().y-(.8+height))<.02);}
  assert.ok(ball.translation().z>.4,'ball must physically roll along wires');
 } finally {part.dispose();world.free();}
});
