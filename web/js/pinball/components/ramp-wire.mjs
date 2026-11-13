import * as T from '../../vendor/three-0.180.0/three.module.min.js';
import { sampleRamp } from '../ramp-geometry.mjs';
import { TABLE } from '../layout.mjs';

// Construction vocabulary: Stern Jaws manual pp. 66–67 (not measured CAD).
// Styling: mechanical-reference.png. All scene dimensions are estimates.
export const RAMP_WIRE_DIMENSIONS = Object.freeze({ sheet: .018, wall: .31,
  lip: .025, wireRadius: .018, runningHalfSpacing: .09,
  guardHalfSpacing: .175, guardHeight: .16, realBallDiameterMm: 26.9875 });
const UP = new T.Vector3(0, 1, 0);
const vec = p => p?.isVector3 ? p.clone() : new T.Vector3(...p);
function checkedRows(rows) {
  if (!Array.isArray(rows) || rows.length < 2) throw new RangeError('At least two route rows required');
  return rows.map((r, i) => {
    const p = vec(r.p), left = vec(r.left), right = vec(r.right);
    if (![...p.toArray(), ...left.toArray(), ...right.toArray()].every(Number.isFinite)) throw new RangeError(`Non-finite route row ${i}`);
    const n = right.clone().sub(left); n.y = 0;
    if (n.length() < .01) throw new RangeError('Route width must be positive');
    return { p, left, right, n: n.normalize() };
  });
}
// Closed cross-section loft: real thickness, underside and capped ends.
function loft(rows, profile) {
  const positions = [], indices = [], size = profile(rows[0]).length;
  for (const row of rows) {
    const section = profile(row);
    const area = section.reduce((sum, p, i) => {
      const q = section[(i + 1) % section.length];
      return sum + p.dot(row.n) * q.y - q.dot(row.n) * p.y;
    }, 0);
    if (area > 0) section.reverse();
    for (const p of section) positions.push(...p.toArray());
  }
  for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < size; j++) {
    const a = i * size + j, b = i * size + (j + 1) % size;
    indices.push(a, b, a + size, b, b + size, a + size);
  }
  for (let j = 1; j < size - 1; j++) {
    indices.push(0, j + 1, j);
    const k = (rows.length - 1) * size; indices.push(k, k + j, k + j + 1);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices); g.computeVertexNormals(); return g;
}
function point(row, side, across = 0, height = 0) {
  return row[side].clone().addScaledVector(row.n, across).addScaledVector(UP, height);
}
class Assembly {
  constructor(name, materials) {
    this.root = new T.Group(); this.root.name = name;
    this.root.userData = { prototype: true, dimensionsAreEstimates: true,
      clearance: 'pending-installed-review', collisionIntegrated: false,
      reviewRequired: ['top', '45-degree', 'side', 'installed-ball-traversal'],
      source: 'Stern Jaws manual pp. 66–67: construction only; mechanical-reference.png: styling' };
    this.geometries = new Set(); this.ownedMaterials = new Set(); this.materials = {};
    for (const [key, color, roughness] of [['chrome', 0xb7bec1, .29], ['brass', 0xb08a4b, .36], ['dark', 0x283432, .48]]) {
      this.materials[key] = materials[key] || new T.MeshStandardMaterial({ color, metalness: .8, roughness });
      if (!materials[key]) this.ownedMaterials.add(this.materials[key]);
    }
  }
  group(name) {
    const g = new T.Group(); g.name = name; g.userData.subassembly = name;
    this.root.add(g); return g;
  }
  mesh(name, geometry, material, parent) {
    this.geometries.add(geometry);
    const m = new T.Mesh(geometry, this.materials[material]); m.name = name;
    m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  tube(name, points, radius, material, parent) {
    const path = new T.CurvePath();
    for (let i = 1; i < points.length; i++) path.add(new T.LineCurve3(points[i - 1], points[i]));
    return this.mesh(name, new T.TubeGeometry(path, Math.max(2, points.length * 2), radius, 8, false), material, parent);
  }
  bolt(name, p, parent) {
    const m = this.mesh(name, new T.CylinderGeometry(.026, .026, .018, 6), 'brass', parent);
    m.position.copy(p); return m;
  }
  dispose() {
    for (const g of this.geometries) g.dispose();
    for (const m of this.ownedMaterials) m.dispose();
    this.root.removeFromParent();
  }
}
/** Full continuous sheet chute, table-local. Replaces rather than overlays the
 * old visual ramp when integrated. No physics or gameplay changes here. */
export class MechanicalRamp extends Assembly {
  constructor({ materials = {}, rows = sampleRamp() } = {}) {
    super('mechanical-sheet-ramp-prototype', materials);
    this.rows = checkedRows(rows); this.build();
  }
  build() {
    const rows = this.rows, d = RAMP_WIRE_DIMENSIONS;
    const sheet = this.group('formed-sheet-chute'), hardware = this.group('seams-and-fasteners');
    this.mesh('continuous-floor-with-underside', loft(rows, r => [point(r, 'left'), point(r, 'right'), point(r, 'right', 0, -d.sheet), point(r, 'left', 0, -d.sheet)]), 'dark', sheet);
    for (const [side, sign] of [['left', -1], ['right', 1]]) {
      this.mesh(`${side}-folded-wall`, loft(rows, r => [point(r, side), point(r, side, 0, d.wall), point(r, side, sign * d.sheet, d.wall), point(r, side, sign * d.sheet, -d.sheet)]), 'chrome', sheet);
      this.mesh(`${side}-outward-folded-lip`, loft(rows, r => [point(r, side, 0, d.wall), point(r, side, sign * d.lip, d.wall), point(r, side, sign * d.lip, d.wall - d.sheet), point(r, side, 0, d.wall - d.sheet)]), 'brass', sheet);
      for (let i = 16; i < rows.length - 1; i += 32) {
        const section = rows.slice(i, Math.min(rows.length, i + 3));
        this.mesh(`${side}-joint-strap-${i}`, loft(section, r => [point(r, side, sign * d.sheet, .025), point(r, side, sign * d.sheet, d.wall - .035), point(r, side, sign * (d.sheet + .012), d.wall - .035), point(r, side, sign * (d.sheet + .012), .025)]), 'brass', hardware);
        this.bolt(`${side}-joint-bolt-${i}`, point(rows[i], side, sign * .014, d.wall + .008), hardware);
      }
    }
    const flaps = this.group('entry-and-exit-transition-flaps');
    for (const [name, i] of [['entry', 0], ['exit', rows.length - 1]]) {
      const r = rows[i], next = rows[i === 0 ? 1 : i - 1];
      const tangent = r.p.clone().sub(next.p).normalize();
      const end = { ...r, left: r.left.clone().addScaledVector(tangent, .13), right: r.right.clone().addScaledVector(tangent, .13) };
      end.left.y -= .012; end.right.y -= .012;
      this.mesh(`${name}-spring-steel-flap`, loft(i === 0 ? [end, r] : [r, end], row => [row.left.clone(), row.right.clone(), row.right.clone().addScaledVector(UP, -.006), row.left.clone().addScaledVector(UP, -.006)]), 'chrome', flaps);
      for (const side of ['left', 'right']) this.bolt(`${name}-${side}-fixing`, point(r, side, side === 'left' ? -.015 : .015, .012), flaps);
    }
    this.buildSupports();
  }
  buildSupports() {
    const g = this.group('perimeter-posts-and-continuous-underframe');
    // Continuous bearers carry every part of the chute, including the long
    // return. Posts stand at the perimeter/divider rather than being dropped
    // into the central playfield. Brackets and diagonals form load paths from
    // each saddle to its foot. These are candidate fixtures, not cleared lanes.
    const elevated = this.rows.filter(r => r.p.y > .13);
    for (const side of ['left', 'right']) this.tube(`${side}-continuous-underfloor-bearer`, elevated.map(r => point(r, side, side === 'left' ? .045 : -.045, -.065)), .028, 'dark', g);
    let count = 0;
    const stations = [];
    for (let i = 14; i < this.rows.length; i += 24) stations.push(i);
    if (stations.at(-1) !== this.rows.length - 1) stations.push(this.rows.length - 1);
    for (const i of stations) {
      const r = this.rows[i];
      if (r.p.y < .17) continue;
      // Left return is carried from the left cabinet rail, rear sweep from
      // the back rail, entry climb from the shooter divider side.
      const x = r.p.x < -.45 ? -2.68 : r.p.z < -3.7 ? r.p.x : 2.24;
      const z = r.p.x >= -.45 && r.p.z < -3.7 ? -5.35 : r.p.z;
      const y = r.p.y - .065;
      const base = new T.Vector3(x, .055, z), top = new T.Vector3(x, y, z);
      const saddle = r.p.clone().addScaledVector(UP, -.065);
      const knee = new T.Vector3(x, Math.max(.09, y * .42), z);
      this.tube(`support-post-${count}`, [base, top], .037, 'brass', g);
      this.tube(`cantilever-crosshead-${count}`, [top, saddle], .034, 'dark', g);
      this.tube(`diagonal-knee-brace-${count}`, [knee, saddle], .025, 'chrome', g);
      this.tube(`underfloor-cross-saddle-${count}`, [point(r, 'left', .045, -.065), point(r, 'right', -.045, -.065)], .03, 'dark', g);
      // Short vertical seat pads touch the floor underside, not the ball path.
      for (const side of ['left', 'right']) this.tube(`${side}-floor-seat-${count}`, [point(r, side, side === 'left' ? .045 : -.045, -.065), point(r, side, side === 'left' ? .045 : -.045, -.025)], .034, 'brass', g);
      const foot = this.mesh(`mounting-foot-${count}`, new T.CylinderGeometry(.085, .085, .025, 16), 'dark', g);
      foot.position.copy(base);
      for (const sign of [-1, 1]) this.bolt(`foot-bolt-${count}-${sign}`, base.clone().add(new T.Vector3(0, .022, sign * .05)), g);
      const collar = this.mesh(`post-head-collar-${count}`, new T.CylinderGeometry(.057, .057, .045, 12), 'chrome', g);
      collar.position.copy(top);
      count++;
    }
    g.userData = { subassembly: g.name, postCount: count, continuousBearers: 2,
      clearance: 'pending installed review: perimeter orbit, shooter divider, under-ramp lanes and knee braces',
      structuralStatus: 'continuous load-path prototype; not strength-certified' };
  }
}
/** Open wire track. points specify running-wire centerline height, NOT a floor
 * or ball-center path. Requires separate rail collision before game integration. */
export class MechanicalWireform extends Assembly {
  constructor({ materials = {}, points = [[0, .8, 0], [0, .79, -.5], [.08, .7, -1.1], [.35, .55, -1.7], [.6, .42, -2.2]] } = {}) {
    super('mechanical-open-wireform-prototype', materials);
    if (!Array.isArray(points) || points.length < 2) throw new RangeError('At least two wireform points required');
    const input = points.map(vec);
    if (!input.every(p => p.toArray().every(Number.isFinite))) throw new RangeError('Non-finite wireform point');
    if (input.some((p, i) => i && p.distanceTo(input[i - 1]) < .001)) throw new RangeError('Duplicate wireform points');
    const curve = new T.CatmullRomCurve3(input, false, 'centripetal');
    const rows = Array.from({ length: 121 }, (_, i) => {
      const p = curve.getPoint(i / 120), t = curve.getTangent(i / 120), n = new T.Vector3(-t.z, 0, t.x);
      if (n.length() < .001) throw new RangeError('Wireform cannot have a vertical tangent');
      return { p, n: n.normalize() };
    });
    const d = RAMP_WIRE_DIMENSIONS;
    this.root.userData.hiddenFloor = false;
    this.root.userData.runningWireCenterSpacing = d.runningHalfSpacing * 2;
    this.root.userData.ballRadius = TABLE.ballRadius;
    this.root.userData.ballCenterAboveRunningWires = Math.sqrt((TABLE.ballRadius + d.wireRadius) ** 2 - d.runningHalfSpacing ** 2);
    const running = this.group('two-load-bearing-running-wires'), guards = this.group('lateral-containment-wires');
    const ties = this.group('underslung-cross-ties-and-mountings');
    for (const sign of [-1, 1]) {
      this.tube(`running-wire-${sign}`, rows.map(r => r.p.clone().addScaledVector(r.n, sign * d.runningHalfSpacing)), d.wireRadius, 'chrome', running);
      this.tube(`guard-wire-${sign}`, rows.map(r => r.p.clone().addScaledVector(r.n, sign * d.guardHalfSpacing).addScaledVector(UP, d.guardHeight)), d.wireRadius, 'chrome', guards);
    }
    for (let i = 0; i < rows.length; i += 12) {
      const r = rows[i], at = (x, y) => r.p.clone().addScaledVector(r.n, x).addScaledVector(UP, y);
      // U-tie below ball and running wires: no ladder rung across the ball path.
      this.tube(`u-cross-tie-${i}`, [at(-d.guardHalfSpacing, d.guardHeight), at(-d.guardHalfSpacing, -.045), at(d.guardHalfSpacing, -.045), at(d.guardHalfSpacing, d.guardHeight)], .012, 'brass', ties);
      for (const sign of [-1, 1]) this.tube(`rail-weld-saddle-${i}-${sign}`, [at(sign * d.runningHalfSpacing, -.045), at(sign * d.runningHalfSpacing, -.012)], .022, 'chrome', ties);
      if (i % 36 === 0) for (const sign of [-1, 1]) {
        const p = at(sign * .205, -.045);
        const plate = this.mesh(`mounting-tab-${i}-${sign}`, new T.BoxGeometry(.095, .016, .09), 'dark', ties);
        plate.position.copy(p); plate.rotation.y = -Math.atan2(r.n.z, r.n.x);
        this.bolt(`mounting-tab-bolt-${i}-${sign}`, p.clone().addScaledVector(UP, .018), ties);
      }
    }
  }
}
