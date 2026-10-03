import assert from 'node:assert/strict';
import * as THREE from './vendor/three-0.180.0/three.module.min.js';
import { Workshop } from './karakuri-core.mjs';
import { MECHANISM as G } from './karakuri-contact.mjs';
import { STAGES } from './karakuri-levels.mjs';

const solve = g => {
  const s = g.stage.solution;
  for (const key of ['radius', 'beltMode', 'delay', 'idler']) g.configure(key, s[key]);
  for (const p of g.parts.filter(p => p.enabled !== false)) { g.move(p.id, g.targets()[p.id].x, 0); for (let i = 0; i < 4 && Math.cos(p.angle) < .99; i++) g.rotate(p.id); }
  assert(g.attachBelt('large', 'lift'));
};
const box = (w, h, d) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
function distance(mesh, ball) {
  mesh.updateWorldMatrix(true, false);
  const local = mesh.worldToLocal(new THREE.Vector3(ball.x, ball.y, ball.z)), p = mesh.geometry.parameters;
  const q = new THREE.Vector3(THREE.MathUtils.clamp(local.x, -p.width / 2, p.width / 2), THREE.MathUtils.clamp(local.y, -p.height / 2, p.height / 2), THREE.MathUtils.clamp(local.z, -p.depth / 2, p.depth / 2));
  return local.distanceTo(q) - G.radius;
}
let samples = 0, minimum = Infinity;
for (let index = 0; index < STAGES.length; index++) {
  for (const scenario of ['solution', 'reversed-rail', 'power-failure', ...(STAGES[index].window ? ['closed-gate'] : [])]) {
    const g = new Workshop(index); solve(g);
    if (scenario === 'reversed-rail') g.rotate('rail');
    if (scenario === 'power-failure') g.move('small', -5, 2, false);
    if (scenario === 'closed-gate') g.stage = { ...g.stage, window: [99, 100] }; // Isolate the closed shutter's contact, regardless of gear direction.
    const plate = box(G.plateWidth, G.plateThickness, G.plateDepth), floor = box(G.railLength, G.railThickness, G.railWidth);
    const root = new THREE.Group(), slope = new THREE.Group();
    root.position.set(g.part('rail').x, G.railY, g.part('rail').z); root.rotation.y = -g.part('rail').angle;
    slope.rotation.z = -G.railTilt; root.add(slope); slope.add(floor);
    const latch = box(.07, .24, .7), gate = box(G.gateThickness, G.gateHeight, 1.15);
    let previous = null; g.start();
    for (let i = 0; i < 2400 && g.state === 'running'; i++) {
      g.step(.005); const pose = g.pose(); plate.position.copy(pose.platform);
      latch.position.set(pose.platform.x + G.plateWidth / 2 - .025, pose.platform.y + G.plateThickness / 2 + .16, g.travel > 0 ? .85 : 0);
      gate.position.set(G.gateX, g.gateOpen() ? G.gateOpenY : G.gateClosedY, 0);
      for (const mesh of [plate, floor, latch, ...(g.stage.window ? [gate] : [])]) {
        const gap = distance(mesh, pose.marble); minimum = Math.min(minimum, gap);
        assert(gap >= -1e-6, `stage ${index + 1} ${scenario} ${g.time}: sphere penetration ${gap}`);
      }
      plate.updateMatrixWorld(); root.updateMatrixWorld(true);
      assert(new THREE.Box3().setFromObject(plate).max.x < new THREE.Box3().setFromObject(floor).min.x);
      assert(pose.platform.y - G.plateThickness / 2 > G.beltY + .09);
      assert(pose.marble.y - G.radius >= G.deskTop);
      const point = new THREE.Vector3(pose.marble.x, pose.marble.y, pose.marble.z);
      if (previous) assert(point.distanceTo(previous) < .06, `stage ${index + 1}: discontinuous motion`);
      previous = point; samples++;
    }
    assert.equal(g.state, scenario === 'solution' ? 'success' : 'failed');
    g.reset(); const pose = g.pose(); assert.equal(pose.platform.y, G.liftBottom);
    assert(Math.abs(pose.marble.y - pose.platform.y - G.plateThickness / 2 - G.radius - G.clearance) < 1e-10);
  }
}
console.log(`Campaign contact regression: 10 stages × success/rail/power failure + 6 closed gates; ${samples} finite 5ms samples, minimum gap ${minimum.toFixed(6)}.`);
