// Test-only ideal geometry. Never imported by gameplay; .test. excludes builds.
import * as T from '../vendor/three-0.180.0/three.module.min.js';

function vector(value, name) {
  const a = Array.isArray(value) ? value : [value?.x, value?.y, value?.z];
  if (a.length !== 3 || !a.every(Number.isFinite)) throw new Error(`Invalid ${name}`);
  return new T.Vector3(...a);
}
function positive(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid ${name}`);
  return value;
}
function triangleDistance(triangle, p) {
  const q = new T.Vector3();
  if (triangle.getArea() > 1e-14) return triangle.closestPointToPoint(p, q).distanceTo(p);
  // Zero-area input still represents finite edges/points, not a filled volume.
  return Math.min(...[[triangle.a, triangle.b], [triangle.b, triangle.c], [triangle.c, triangle.a]].map(([a, b]) => {
    if (a.equals(b)) return a.distanceTo(p);
    return new T.Line3(a, b).closestPointToPoint(p, true, q).distanceTo(p);
  }));
}

export class SphereClearanceQuery {
  constructor(shape, { translation = [0, 0, 0], rotation = [0, 0, 0, 1], meshMode = 'unknown' } = {}) {
    this.shape = { ...shape };
    this.origin = vector(translation, 'translation');
    if (rotation.length !== 4 || !rotation.every(Number.isFinite)) throw new Error('Invalid rotation');
    this.inverse = new T.Quaternion(...rotation);
    if (Math.abs(this.inverse.lengthSq() - 1) > 1e-6) throw new Error('Rotation must be unit length');
    this.inverse.invert();
    if (!['surface', 'closed-solid', 'unknown'].includes(meshMode)) throw new Error('Invalid mesh mode');
    this.meshMode = meshMode;
    const { type } = shape;
    if (['ball', 'capsule', 'cylinder'].includes(type)) positive(shape.radius, 'shape radius');
    if (['capsule', 'cylinder'].includes(type)) positive(shape.halfHeight, 'half height');
    if (type === 'cuboid') {
      this.half = vector(shape.halfExtents, 'half extents');
      this.half.toArray().forEach(n => positive(n, 'half extent'));
    } else if (type === 'mesh' || type === 'convex') {
      const { vertices, indices } = shape;
      if (!vertices?.length || vertices.length % 3 || !Array.from(vertices).every(Number.isFinite)) throw new Error('Invalid mesh vertices');
      if (!indices?.length || indices.length % 3 || !Array.from(indices).every(i => Number.isInteger(i) && i >= 0 && i < vertices.length / 3)) throw new Error('Invalid mesh indices');
      const points = Array.from({ length: vertices.length / 3 }, (_, i) => new T.Vector3().fromArray(vertices, i * 3));
      this.triangles = Array.from({ length: indices.length / 3 }, (_, i) => new T.Triangle(...[0, 1, 2].map(j => points[indices[i * 3 + j]].clone())));
      if (type === 'convex') this.meshMode = 'closed-solid';
      if (this.meshMode === 'closed-solid') this.validateClosed(type === 'convex');
    } else if (!['ball', 'capsule', 'cylinder'].includes(type)) throw new Error(`Unsupported shape: ${type}`);
  }

  validateClosed(convex) {
    // Exact coordinate welding only: never seal a real positive-width crack.
    const edges = new Map(), faces = new Set(), key = p => p.toArray().join(',');
    let sixVolume = 0;
    const origin = this.triangles[0].a;
    for (const t of this.triangles) {
      if (t.getArea() <= 1e-14) throw new Error('Degenerate closed-solid face');
      const face = [t.a, t.b, t.c].map(key).sort().join('|');
      if (faces.has(face)) throw new Error('Duplicate closed-solid face');
      faces.add(face);
      sixVolume += t.a.clone().sub(origin).dot(t.b.clone().sub(origin).cross(t.c.clone().sub(origin)));
      for (const [a, b] of [[t.a, t.b], [t.b, t.c], [t.c, t.a]]) {
        const x = key(a), y = key(b), id = x < y ? `${x}|${y}` : `${y}|${x}`;
        const e = edges.get(id) ?? { count: 0, orientation: 0, faces: [] };
        e.faces.push(face); e.count++; e.orientation += x < y ? 1 : -1; edges.set(id, e);
      }
    }
    if ([...edges.values()].some(e => e.count !== 2 || e.orientation !== 0)) throw new Error('Closed-solid mesh must have paired oriented edges');
    // Deliberately limited to one connected boundary. Multi-shell solids and
    // nested cavity semantics need a separate contract, not signed-volume cancellation.
    const adjacency = new Map([...faces].map(f => [f, []]));
    for (const e of edges.values()) {
      adjacency.get(e.faces[0]).push(e.faces[1]);
      adjacency.get(e.faces[1]).push(e.faces[0]);
    }
    const visited = new Set(), pending = [[...faces][0]];
    while (pending.length) {
      const face = pending.pop();
      if (visited.has(face)) continue;
      visited.add(face); pending.push(...adjacency.get(face));
    }
    if (visited.size !== faces.size) throw new Error('Multiple closed components are unsupported');
    if (!Number.isFinite(sixVolume) || Math.abs(sixVolume) <= 1e-14) throw new Error('Closed solid must enclose nonzero volume');
    if (convex) {
      for (const t of this.triangles) {
        const n = t.getNormal(new T.Vector3());
        const distances = this.triangles.flatMap(f => [f.a, f.b, f.c].map(p => n.dot(p.clone().sub(t.a))));
        if (Math.min(...distances) < -1e-9 && Math.max(...distances) > 1e-9) throw new Error('Convex face is not supporting');
      }
    }
    // Caller declares a simple, non-self-intersecting boundary. Edge pairing
    // alone cannot prove that assumption or infer material/enclosure policy.
  }

  query(center, radius) {
    positive(radius, 'sphere radius');
    const p = vector(center, 'sphere center').sub(this.origin).applyQuaternion(this.inverse);
    const s = this.shape;
    let signed, boundaryDistance, containment;
    if (s.type === 'ball') signed = p.length() - s.radius;
    else if (s.type === 'capsule') signed = Math.hypot(p.x, p.z, Math.max(Math.abs(p.y) - s.halfHeight, 0)) - s.radius;
    else if (s.type === 'cylinder') {
      const a = Math.hypot(p.x, p.z) - s.radius, b = Math.abs(p.y) - s.halfHeight;
      signed = Math.hypot(Math.max(a, 0), Math.max(b, 0)) + Math.min(Math.max(a, b), 0);
    } else if (s.type === 'cuboid') {
      const q = p.clone().set(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)).sub(this.half);
      signed = Math.hypot(Math.max(q.x, 0), Math.max(q.y, 0), Math.max(q.z, 0)) + Math.min(Math.max(q.x, q.y, q.z), 0);
    } else {
      boundaryDistance = Math.min(...this.triangles.map(t => triangleDistance(t, p)));
      if (this.meshMode === 'closed-solid' && boundaryDistance > 1e-12) {
        let angle = 0;
        for (const t of this.triangles) {
          const [a, b, c] = [t.a, t.b, t.c].map(v => v.clone().sub(p));
          const numerator = a.dot(b.clone().cross(c));
          const denominator = a.length() * b.length() * c.length() + a.dot(b) * c.length() + b.dot(c) * a.length() + c.dot(a) * b.length();
          angle += 2 * Math.atan2(numerator, denominator);
        }
        containment = Math.abs(angle) > 2 * Math.PI ? 'inside' : 'outside';
      } else containment = this.meshMode === 'surface' ? 'not-applicable' : this.meshMode === 'unknown' ? 'unknown' : 'boundary';
      signed = containment === 'inside' ? -boundaryDistance : boundaryDistance;
    }
    if (boundaryDistance === undefined) {
      boundaryDistance = Math.abs(signed);
      containment = signed < 0 ? 'inside' : signed > 0 ? 'outside' : 'boundary';
    }
    const surfaceGap = boundaryDistance - radius;
    return {
      surfaceGap,
      surfaceOverlap: surfaceGap < 0,
      solidContainment: containment,
      materialOverlap: containment === 'inside' || surfaceGap < 0 ? true : containment === 'unknown' ? null : false,
      materialGap: containment === 'unknown' ? null : signed - radius,
      reachability: 'unverified',
      // Clear material is not permission to spawn in a sealed, unreachable cavity.
      legalStart: containment === 'inside' || surfaceGap < 0 ? false : null,
    };
  }
}
