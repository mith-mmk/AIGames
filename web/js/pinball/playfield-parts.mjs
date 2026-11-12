import { UPPER_RAMP, SLING_VERTICES } from "./layout.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Visual gameplay hardware. No collision/rule implementation is implied. */
export class PlayfieldParts {
  constructor(assets) { this.a = assets; }
  build() {
    const a = this.a, g = a.root;
    for (const side of [-1, 1]) this.sling(side);
    // Upper ramp deferred while the base game is validated.
    // Two raised, bracket-mounted three-target banks, upstream of existing banks.
    for (const side of [-1, 1]) {
      const bank = new T.Group(); bank.position.set(side * 1.275, 0, -1.45); bank.rotation.y=side*Math.atan2(.4,.75); g.add(bank);
      a.roundedBox(bank, 0.85, 0.14, 0.14, 0, 0.22, 0, "rubber", 0.025);
      for (let i = -1; i <= 1; i++) {
        a.cylinder(bank, 0.035, 0.24, i * 0.24, 0.24, 0, "chrome");
        a.roundedBox(bank, 0.19, 0.34, 0.1, i * 0.24, 0.4, 0, "brass", 0.022);
        a.box(bank, 0.12, 0.22, 0.02, i * 0.24, 0.4, 0.065, "dark");
        a.box(bank, 0.065, 0.08, 0.025, i * 0.24, 0.4, 0.08, "cream");
      }
    }
    // Spinner gate in the central shot opening, deliberately raised above a ball.
    for (const x of [-0.44, 0.44]) {
      a.cylinder(g, 0.035, 0.8, x, 0.4, -1.35, "chrome");
      a.cylinder(g, 0.095, 0.04, x, 0.065, -1.35, "brass");
    }
    a.tube(g, [[-0.44, 0.8, -1.35], [0.44, 0.8, -1.35]], 0.028, "chrome");
    a.roundedBox(g, 0.34, 0.3, 0.07, 0, 0.62, -1.35, "brass", 0.02);
    a.box(g, 0.23, 0.17, 0.025, 0, 0.62, -1.3, "dark");
    a.ring(g, 0.055, 0.012, 0, 0.62, -1.28, "cream").rotation.x = 0;
  }
  sling(side) {
    const a = this.a, g = new T.Group(); a.root.add(g);
    const vertices = SLING_VERTICES.map(([x, z]) => [side * x, z]);
    const shape = new T.Shape();
    vertices.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)); shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2, steps: 1 }); geo.rotateX(-Math.PI / 2);
    a.mesh(geo, "steel", g, 0, 0.43, 0);
    const ring = [...vertices, vertices[0]].map(([x, z]) => [x, 0.34, z]);
    a.tube(g, ring, 0.055, "rubber");
    a.tube(g, ring.map(([x, , z]) => [x, 0.48, z]), 0.022, "brass");
    for (const [x, z] of vertices) {
      a.cylinder(g, 0.075, 0.35, x, 0.24, z, "brass");
      a.cylinder(g, 0.03, 0.2, x, 0.22, z, "chrome");
      a.screw(g, x, 0.55, z);
    }
    a.cylinder(g, 0.14, 0.3, side * 1.3, 0.24, 2.65, "amber");
    a.ring(g, 0.16, 0.025, side * 1.3, 0.52, 2.65, "brass");
    // Exposed kicker linkage under the plate, not across the central lane.
    a.box(g, 0.28, 0.07, 0.08, side * 1.42, 0.16, 2.7, "chrome");
  }
  upperRamp() {
    const a = this.a, g = a.root;
    const curve = new T.CatmullRomCurve3(UPPER_RAMP.map(p => new T.Vector3(...p)));
    const positions = [], indices = [], edges = [[], []];
    for (let i = 0; i <= 100; i++) {
      const p = curve.getPoint(i / 100), t = curve.getTangent(i / 100);
      const n = new T.Vector3(-t.z, 0, t.x).normalize();
      for (const [j, side] of [-1, 1].entries()) {
        const v = p.clone().addScaledVector(n, side * 0.19); positions.push(v.x, v.y, v.z); edges[j].push([v.x, v.y + 0.16, v.z]);
      }
      if (i < 100) { const k = i * 2; indices.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const geometry = new T.BufferGeometry(); geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals();
    const mat = a.materials.steel.clone(); mat.side = T.DoubleSide;
    a.mesh(geometry, mat, g);
    for (const edge of edges) {
      a.tube(g, edge, 0.024, "chrome");
      for (let i = 0; i < edge.length; i += 10) {
        const [x, y, z] = edge[i]; a.cylinder(g, 0.018, 0.17, x, y - 0.07, z, "brass");
      }
    }
    // Outer support pylons avoid the lower ramp and the central shooting corridor.
    for (const [x, y, z] of [[-2.4, 1.0, -1.6], [-2.35, 1.9, -3.05]]) {
      a.cylinder(g, 0.055, y, x, y / 2, z, "chrome");
      a.cylinder(g, 0.15, 0.06, x, 0.06, z, "brass");
    }
    // Raised catch tower receiving the second ramp.
    const x = 2.08, z = -4.2;
    a.cylinder(g, 0.25, 2.38, x, 1.28, z, "dark");
    for (const y of [0.16, 0.8, 1.5, 2.45]) a.ring(g, 0.26, 0.028, x, y, z, "brass");
    a.ring(g, 0.28, 0.04, x, 2.58, z, "chrome");
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      a.cylinder(g, 0.024, 2.25, x + Math.cos(angle) * 0.26, 1.3, z + Math.sin(angle) * 0.26, "chrome");
    }
  }
}
