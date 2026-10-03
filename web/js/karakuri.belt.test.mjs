import assert from 'node:assert/strict';
import * as THREE from './vendor/three-0.180.0/three.module.min.js';
import { Workshop } from './karakuri-core.mjs';
import { nearestBeltPair } from './karakuri-belt.mjs';
import { STAGES } from './karakuri-levels.mjs';

const assemble = g => {
  const s = g.stage.solution;
  for (const key of ['radius', 'beltMode', 'delay', 'idler']) g.configure(key, s[key]);
  for (const p of g.parts.filter(p => p.id !== 'belt' && p.enabled !== false)) { const t = g.targets()[p.id]; g.move(p.id, t.x, t.z); for (let i = 0; i < 4 && Math.cos(p.angle) < .99; i++) g.rotate(p.id); }
};
let projections = 0;
for (let index = 0; index < STAGES.length; index++) {
  const g = new Workshop(index); assemble(g);
  const pair = g.beltPair('large', 'lift'); assert(pair.valid, `${index + 1}: ${pair.reason}`);
  assert.equal(g.attachBelt('lift', 'large'), true); assert.equal(g.connections().belt, true);
  const b = g.part('belt');
  for (const [sign, axis] of [[-1, pair.a], [1, pair.b]]) {
    assert(Math.hypot(b.x + sign * b.length / 2 * Math.cos(b.angle) - axis.x, b.z + sign * b.length / 2 * Math.sin(b.angle) - axis.z) < 1e-10);
  }
  const attached = JSON.stringify(b); g.reset(); assert.equal(JSON.stringify(g.part('belt')), attached);
  g.start(); assert.equal(g.attachBelt('small', 'large'), false); assert.equal(g.dropFreeBelt(pair.pose), false);
  for (let i = 0; i < 240; i++) g.step(.05); assert.equal(g.state, 'success');
  g.reset(); assert.equal(g.attachBelt('small', g.stage.idler ? 'idler' : 'large'), true); assert.equal(g.connections().belt, false);
  g.start(); for (let i = 0; i < 100; i++) g.step(.05); assert.equal(g.state, 'failed');
  g.reset(); assert.equal(g.attachBelt('large', 'lift'), true); g.rotate('belt'); assert.equal(g.connections().belt, false);
  g.reset(); g.attachBelt('large', 'lift'); const mode = g.beltMode;
  if (g.stage.beltModes.length > 1) { g.configure('beltMode', mode === 'open' ? 'cross' : 'open'); assert.deepEqual(g.part('belt').anchors, ['large', 'lift']); assert.equal(g.connections().belt, true); }
  // Camera-independent screen tolerance with a deliberately rotated, slightly offset free belt.
  for (const [yaw, pitch, distance] of [[.18, .85, 18], [-.8, .45, 24], [.9, 1.25, 12]]) {
    const camera = new THREE.PerspectiveCamera(42, 1.3, .1, 100);
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance); camera.lookAt(0, .4, 0); camera.updateMatrixWorld();
    const project = p => { const v = new THREE.Vector3(p.x, .15, p.z).project(camera); return { x: (v.x + 1) * 560, y: (1 - v.y) * 430, visible: Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && Math.abs(v.z) <= 1 }; };
    const preview = nearestBeltPair({ ...pair.pose, x: pair.pose.x + .3, z: .2, angle: Math.PI / 2 }, g.beltPairs(), project);
    assert(preview?.valid, `${index + 1} camera ${yaw}`); assert.deepEqual(preview.ids, ['large', 'lift']); projections++;
  }
  g.init(index); assert.equal(g.part('belt').anchors, undefined);
}
const g = new Workshop(); assemble(g);
for (const ids of [['large', 'large'], ['rail', 'lift'], ['handle', 'lift'], ['idler', 'lift']]) {
  const before = JSON.stringify(g.part('belt')); assert.equal(g.attachBelt(...ids), false); assert.equal(JSON.stringify(g.part('belt')), before);
}
g.move('large', -6, -3.4, false); assert.equal(g.beltPair('large', 'lift').valid, false);
g.move('large', -2, 2, false); assert.match(g.beltPair('large', 'lift').reason, /支柱/);
g.move('large', -1.8, 0); g.move('small', -.6, 0, false); assert.match(g.beltPair('large', 'lift').reason, /別の軸/);
g.init(); assemble(g); g.attachBelt('large', 'lift'); g.move('large', -2, 2, false); assert.equal(g.part('belt').anchors, undefined); assert.equal(g.connections().belt, false);
g.init(); assemble(g); const pair = g.beltPair('large', 'lift'); g.dropFreeBelt(pair.pose); assert.equal(g.connections().belt, false); g.attachBelt('large', 'lift'); assert.equal(g.connections().belt, true);
const identical = [pair, { ...pair, ids: ['other', 'pair'] }];
assert.equal(nearestBeltPair(pair.pose, identical, p => ({ x: p.x * 20, y: p.z * 20, visible: true })), null);
assert.equal(nearestBeltPair(pair.pose, [pair], () => ({ x: 0, y: 0, visible: false })), null);
console.log(`Belt regression: all 10 two-axis solutions, wrong pairs, distance/obstacles, detach, rotation/cross, reset/edit lock, ${projections} camera projections, ambiguity and offscreen guards passed.`);
