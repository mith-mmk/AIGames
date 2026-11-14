import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import { PinballPhysics } from './physics.mjs';
import { SphereClearanceQuery } from './sphere-clearance.test.helper.mjs';

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} versus ${b}`);
const triangle = { type: 'mesh', vertices: [0, 0, 0, 1, 0, 0, 0, 0, 1], indices: [0, 1, 2] };
function cube(type = 'mesh') {
  const g = new T.BoxGeometry(2, 2, 2);
  try { return { type, vertices: Array.from(g.attributes.position.array), indices: Array.from(g.index.array) }; }
  finally { g.dispose(); }
}

test('finite surface distance distinguishes faces edges vertices and unresolved containment', () => {
  const q = new SphereClearanceQuery(triangle, { meshMode: 'surface' });
  close(q.query([.2, .3, .2], .1).surfaceGap, .2);
  close(q.query([.2, -.3, .2], .1).surfaceGap, .2);
  close(q.query([1, 0, 1], .1).surfaceGap, Math.SQRT1_2 - .1);
  close(q.query([-1, 0, 0], .1).surfaceGap, .9);
  assert.equal(q.query([.2, .05, .2], .1).surfaceOverlap, true);
  const clear = q.query([.2, .3, .2], .1);
  assert.equal(clear.materialOverlap, false);
  assert.equal(clear.solidContainment, 'not-applicable');
  assert.equal(clear.reachability, 'unverified');
  assert.equal(clear.legalStart, null);
  const unknown = new SphereClearanceQuery(triangle).query([.2, .3, .2], .1);
  assert.equal(unknown.materialOverlap, null);
  assert.equal(unknown.materialGap, null);
});

test('closed mesh convex and cuboid interior are invalid even without boundary overlap', () => {
  for (const shape of [cube(), cube('convex'), { type: 'cuboid', halfExtents: [1, 1, 1] }]) {
    const q = new SphereClearanceQuery(shape, { meshMode: 'closed-solid' });
    const inside = q.query([0, 0, 0], .1);
    close(inside.surfaceGap, .9);
    assert.equal(inside.surfaceOverlap, false);
    assert.equal(inside.solidContainment, 'inside');
    assert.equal(inside.materialOverlap, true);
    assert.equal(inside.legalStart, false);
    close(q.query([2, 2, 2], .1).surfaceGap, Math.sqrt(3) - .1);
  }
  const reversed = cube();
  for (let i = 0; i < reversed.indices.length; i += 3) [reversed.indices[i], reversed.indices[i + 1]] = [reversed.indices[i + 1], reversed.indices[i]];
  assert.equal(new SphereClearanceQuery(reversed, { meshMode: 'closed-solid' }).query([0, 0, 0], .1).solidContainment, 'inside');
  const boundaryOnly = new SphereClearanceQuery(cube(), { meshMode: 'surface' }).query([0, 0, 0], .1);
  assert.equal(boundaryOnly.materialOverlap, false);
  assert.equal(boundaryOnly.legalStart, null, 'an enclosed air cavity still has unverified reachability');
});

test('finite cylinder cap barrel rim and rigid transforms use independent analytic distances', () => {
  const shape = { type: 'cylinder', radius: 1, halfHeight: 2 };
  const q = new SphereClearanceQuery(shape);
  close(q.query([2, 0, 0], .2).materialGap, .8);
  close(q.query([0, 3, 0], .2).materialGap, .8);
  close(q.query([2, 3, 0], .2).materialGap, Math.SQRT2 - .2);
  assert.equal(q.query([0, 0, 0], .2).solidContainment, 'inside');
  const rotation = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), Math.PI / 2);
  const transformed = new SphereClearanceQuery(shape, { translation: [4, 5, 6], rotation: rotation.toArray() });
  close(transformed.query([1, 5, 6], .2).materialGap, .8);
  const mesh = new SphereClearanceQuery(triangle, { meshMode: 'surface', translation: [4, 5, 6], rotation: rotation.toArray() });
  close(mesh.query([3.7, 5.2, 6.2], .1).surfaceGap, .2);
});

test('capsule and ball solids reject deep interior and distinguish rounded ends', () => {
  const capsule = new SphereClearanceQuery({ type: 'capsule', radius: 1, halfHeight: 2 });
  close(capsule.query([0, 4, 0], .2).materialGap, .8);
  close(capsule.query([1, 3, 0], .2).materialGap, Math.SQRT2 - 1.2);
  assert.equal(capsule.query([0, 0, 0], .1).legalStart, false);
  const ball = new SphereClearanceQuery({ type: 'ball', radius: 1 });
  close(ball.query([2, 0, 0], .2).materialGap, .8);
  assert.equal(ball.query([0, 0, 0], .1).legalStart, false);
});

test('malformed closed boundaries and unknown shapes fail rather than certify starts', () => {
  assert.throws(() => new SphereClearanceQuery(triangle, { meshMode: 'closed-solid' }), /paired oriented edges/);
  assert.throws(() => new SphereClearanceQuery({ type: 'mesh', vertices: [], indices: [] }), /vertices/);
  assert.throws(() => new SphereClearanceQuery({ ...triangle, indices: [0, 1, 99] }), /indices/);
  assert.throws(() => new SphereClearanceQuery({ type: 'unsupported' }), /Unsupported/);
  for (const type of ['mesh', 'convex']) {
    assert.throws(() => new SphereClearanceQuery({ ...triangle, type, indices: [0, 1, 2, 0, 2, 1] }, { meshMode: 'closed-solid' }), /Duplicate/);
  }
  const misoriented = cube();
  [misoriented.indices[0], misoriented.indices[1]] = [misoriented.indices[1], misoriented.indices[0]];
  assert.throws(() => new SphereClearanceQuery(misoriented, { meshMode: 'closed-solid' }), /paired oriented/);
  const flattened = cube();
  flattened.vertices = flattened.vertices.map((v, i) => i % 3 === 1 ? 0 : v);
  assert.throws(() => new SphereClearanceQuery(flattened, { meshMode: 'closed-solid' }), /Degenerate|Duplicate|volume/);
  const multiple = cube(), second = cube();
  const offset = multiple.vertices.length / 3;
  multiple.vertices.push(...second.vertices.map((v, i) => i % 3 === 0 ? v + 4 : v));
  multiple.indices.push(...second.indices.map(i => i + offset));
  assert.throws(() => new SphereClearanceQuery(multiple, { meshMode: 'closed-solid' }), /Multiple closed components/);
  const concave = cube('convex');
  for (let i = 0; i < concave.vertices.length; i += 3) {
    if (concave.vertices.slice(i, i + 3).every(v => v === 1)) concave.vertices.splice(i, 3, 0, 0, 0);
  }
  assert.throws(() => new SphereClearanceQuery(concave), /Convex face/);
  assert.throws(() => new SphereClearanceQuery(triangle, { rotation: [0, 0, 0, 2] }), /unit/);
  const degenerate = new SphereClearanceQuery({ type: 'mesh', vertices: [0, 0, 0, 0, 0, 0, 1, 0, 0], indices: [0, 1, 2] }, { meshMode: 'surface' });
  close(degenerate.query([.5, .3, 0], .1).surfaceGap, .2);
  assert.throws(() => degenerate.query([NaN, 0, 0], .1), /center/);
  assert.throws(() => degenerate.query([0, 0, 0], 0), /radius/);
});

test('captured open strip reproduces solid-query false penetration without certifying reachability', async () => {
  // Frozen R1.5 strip517: degenerate low skirt/caps plus two real bottom faces.
  // Retained as a QA adversary; no dependency on unaccepted artifact loaders.
  const a = [.9789344072341919, .03500000014901161, .7996149659156799];
  const b = [.995977520942688, .03500000014901161, .7634274959564209];
  const c = [1.5941212177276611, .03500000014901161, 1.0893480777740479];
  const d = [1.6111643314361572, .03500000014901161, 1.053160548210144];
  const faces = [[c, c, d], [c, d, d], [a, a, b], [a, b, b], [a, b, c], [c, b, d], [a, a, c], [a, c, c]];
  const shape = { type: 'mesh', vertices: faces.flat(2), indices: Array.from({ length: 24 }, (_, i) => i) };
  const query = new SphereClearanceQuery(shape, { meshMode: 'surface' });
  const p = { x: 1.42, y: .18, z: 1.1 };
  close(query.query(p, .135).surfaceGap, .032486650919866494, 1e-8);
  assert.equal(query.query(p, .135).legalStart, null);
  await R.init(); const world = new R.World({ x: 0, y: 0, z: 0 });
  try {
    const c = world.createCollider(R.ColliderDesc.trimesh(new Float32Array(shape.vertices), new Uint32Array(shape.indices), R.TriMeshFlags.FIX_INTERNAL_EDGES));
    const raw = c.projectPoint(p, true).point;
    assert.ok(Math.hypot(raw.x - p.x, raw.y - p.y, raw.z - p.z) - .135 < -.13, 'known open-strip solid query misclassifies the outside point');
    const boundary = c.projectPoint(p, false).point;
    close(Math.hypot(boundary.x - p.x, boundary.y - p.y, boundary.z - p.z) - .135, .032486650919866494, 1e-6);
  } finally { world.free(); }
});

test('captured real pillar and wall overlaps remain rejected by independent geometry', () => {
  const cylinder = new SphereClearanceQuery({ type: 'cylinder', radius: .037, halfHeight: .1752285867544433 }, { translation: [-2.6500000953674316, .23022858798503876, -3.2623038291931152] });
  const overlap = cylinder.query([-2.58, .18, -3.225], .135);
  close(overlap.materialGap, -.09268046253337944, 1e-8);
  assert.equal(overlap.legalStart, false);
  const wall = new SphereClearanceQuery({ type: 'mesh', vertices: [0, 0, 0, 0, 1, 0, 0, 0, 1], indices: [0, 1, 2] }, { meshMode: 'surface' });
  close(wall.query([.02, .2, .2], .135).surfaceGap, -.115);
  assert.equal(wall.query([.02, .2, .2], .135).legalStart, false);
});

test('accepted c1 historical tangent overlap and corrected deck clearance remain distinguishable', async () => {
  const g = await PinballPhysics.create();
  try {
    const s = g.ramp.colliders[0].shape;
    const q = new SphereClearanceQuery({ type: 'mesh', vertices: s.vertices, indices: s.indices }, { meshMode: 'surface' });
    assert.ok(q.query([1.58, .18, 1.1], .135).surfaceGap < -.005);
    assert.ok(q.query([1.58, .1857142374, 1.1], .135).surfaceGap >= .0001 - 1e-7);
  } finally { g.dispose(); }
});
