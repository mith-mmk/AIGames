import assert from 'node:assert/strict';
import * as THREE from './vendor/three-0.180.0/three.module.min.js';
import { Workshop } from './karakuri-core.mjs';
import { MECHANISM as G, contactPose, clearsLift } from './karakuri-contact.mjs';

const rail = { id: 'rail', x: 2.8, z: 0, angle: 0 };
const floor = new THREE.Mesh(new THREE.BoxGeometry(G.railLength, G.railThickness, G.railWidth));
floor.position.set(rail.x, G.railY, 0); floor.rotation.z = -G.railTilt; floor.updateMatrixWorld();
const plate = new THREE.Mesh(new THREE.BoxGeometry(G.plateWidth, G.plateThickness, G.plateDepth));
function gap(mesh, ball) {
  mesh.updateMatrixWorld();
  const local = mesh.worldToLocal(new THREE.Vector3(ball.x, ball.y, ball.z));
  const p = mesh.geometry.parameters;
  const nearest = new THREE.Vector3(
    THREE.MathUtils.clamp(local.x, -p.width / 2, p.width / 2),
    THREE.MathUtils.clamp(local.y, -p.height / 2, p.height / 2),
    THREE.MathUtils.clamp(local.z, -p.depth / 2, p.depth / 2)
  );
  return local.distanceTo(nearest) - G.radius;
}
// Reproduce the old release bug independently of the corrected pose function.
const oldBall = { x: 1.9, y: 2.25 - .1 * .65, z: 0 };
plate.position.set(1.6, 2, 0);
assert(gap(plate, oldBall) < -.05, 'old marble intersects the plate');
const oldFloor = new THREE.Mesh(new THREE.BoxGeometry(2.5, .12, .65));
oldFloor.position.set(2.8, 1.8, 0); oldFloor.rotation.z = -.22;
assert(gap(oldFloor, oldBall) < -.05, 'old marble intersects the rail');

let minimumGap = Infinity;
for (const connected of [true, false]) {
  const r = connected ? rail : { ...rail, angle: Math.PI / 2 };
  floor.rotation.set(0, -r.angle, 0);
  const slope = new THREE.Group(); slope.rotation.z = -G.railTilt;
  // Keep the rail's true parent yaw when checking an invalid orientation.
  const parent = new THREE.Group(); parent.position.set(r.x, G.railY, r.z); parent.rotation.y = -r.angle;
  floor.position.set(0, 0, 0); floor.rotation.set(0, 0, 0); parent.add(slope); slope.add(floor); parent.updateMatrixWorld(true);
  let previous;
  for (let i = 0; i <= 6000; i++) {
    const time = i / 1000;
    const pose = contactPose(Math.min(1, time / 3), Math.max(0, (time - 3) / 3), r, connected);
    plate.position.copy(pose.platform); plate.updateMatrixWorld(); parent.updateMatrixWorld(true);
    for (const m of [plate, floor]) {
      const distance = gap(m, pose.marble); minimumGap = Math.min(minimumGap, distance);
      assert(distance >= -.000001, `penetration at ${time}, connected=${connected}, gap=${distance}`);
    }
    assert(pose.marble.y - G.radius >= G.deskTop);
    // Adjacent samples must not teleport through the platform/rail edge.
    if (previous) assert(new THREE.Vector3(pose.marble.x, pose.marble.y, pose.marble.z).distanceTo(previous) < .01);
    previous = new THREE.Vector3(pose.marble.x, pose.marble.y, pose.marble.z);
    // The lift's entire vertical sweep remains horizontally outside the rail.
    assert(new THREE.Box3().setFromObject(plate).max.x < new THREE.Box3().setFromObject(floor).min.x);
  }
}
const g = new Workshop();
const resetPose = g.pose(); g.start(); g.step(.05); g.reset(); assert.deepEqual(g.pose(), resetPose);
g.move('rail', G.liftX, 0, false); assert.equal(g.parts[3].x, 4);
assert.equal(clearsLift({ ...rail, x: G.liftX }), false);
assert.equal(clearsLift(rail), true);
for (let i = 0; i <= 100; i++) {
  const pose = contactPose(i / 100, 0, rail, true);
  assert(pose.platform.y - G.plateThickness / 2 > G.beltY + .09);
  assert(G.guideZ - G.screwRadius > G.plateDepth / 2);
  // Returning to any earlier height uses the same sphere-on-platform contact.
  assert(Math.abs(pose.marble.y - pose.platform.y - G.plateThickness / 2 - G.radius - G.clearance) < 1e-10);
}
console.log(`Contact regression passed: old bug reproduced; 12002 poses, lift sweep, release, rail/edge flight, failure, return/reset. Minimum gap ${minimumGap.toFixed(6)}.`);
