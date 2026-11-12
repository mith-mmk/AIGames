import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Decorative mechanisms sit behind the playfield, never in the ball lanes. */
export class WorkshopMechanisms {
  constructor(assets) { this.a = assets; }
  gear(parent, radius, teeth, x, y, z) {
    const a = this.a, g = new T.Group();
    g.position.set(x, y, z); parent.add(g);
    const s = new T.Shape();
    for (let i = 0; i <= teeth * 4; i++) {
      const angle = i / (teeth * 4) * Math.PI * 2;
      const r = radius * ([0, 3].includes(i % 4) ? 0.88 : 1);
      const px = Math.cos(angle) * r, py = Math.sin(angle) * r;
      if (!i) s.moveTo(px, py); else s.lineTo(px, py);
    }
    s.closePath();
    const hole = new T.Path(); hole.absarc(0, 0, radius * 0.63, 0, Math.PI * 2, true); s.holes.push(hole);
    a.mesh(new T.ExtrudeGeometry(s, { depth: 0.09, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 1, steps: 1, curveSegments: 24 }), "brass", g);
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      const spoke = a.box(g, radius * 0.63, 0.065, 0.08, Math.cos(angle) * radius * 0.32, Math.sin(angle) * radius * 0.32, 0.04, "brass");
      spoke.rotation.z = angle;
    }
    const hub = a.cylinder(g, radius * 0.19, 0.19, 0, 0, 0.06, "chrome"); hub.rotation.x = Math.PI / 2;
    const bolt = a.cylinder(g, radius * 0.09, 0.21, 0, 0, 0.07, "dark"); bolt.rotation.x = Math.PI / 2;
    return g;
  }
  build(parent) {
    const a = this.a, g = new T.Group(); g.name = "rear-mechanical-bank"; parent.add(g);
    // Backboard architecture: braces and axle plates instead of floating wheels.
    a.roundedBox(g, 5.35, 2.55, 0.22, 0, 1.4, -5.6, "dark", 0.08);
    for (const x of [-2.6, 0, 2.6]) a.box(g, 0.08, 2.5, 0.12, x, 1.4, -5.43, "brass");
    for (const y of [0.18, 2.64]) a.box(g, 5.35, 0.075, 0.13, 0, y, -5.42, "brass");
    this.gear(g, 0.95, 32, -1.42, 1.5, -5.25);
    this.gear(g, 0.48, 20, -0.04, 2.03, -5.24);
    this.gear(g, 0.38, 18, -0.24, 0.87, -5.23);
    // Large engine crank: bearings, connecting rod and anchored cylinder.
    const rod = a.box(g, 1.32, 0.11, 0.1, -1.05, 0.94, -5.04, "chrome"); rod.rotation.z = 0.45;
    a.roundedBox(g, 0.62, 0.47, 0.43, -1.85, 0.34, -5.08, "jade", 0.08);
    for (let y = 0.22; y < 0.5; y += 0.07) a.box(g, 0.4, 0.025, 0.03, -1.85, y, -4.84, "brass");
    for (const [x, h] of [[1.1, 1.9], [2.05, 1.35]]) {
      a.cylinder(g, 0.1, h, x, h / 2 + 0.2, -5.1, "chrome");
      a.cylinder(g, 0.13, h - 0.2, x, h / 2 + 0.2, -5.1, "amber");
      for (const y of [0.25, h + 0.15]) {
        a.cylinder(g, 0.3, 0.12, x, y, -5.1, "brass");
        a.ring(g, 0.26, 0.025, x, y + 0.07, -5.1, "chrome");
      }
      for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5])
        a.cylinder(g, 0.025, h, x + Math.cos(angle) * 0.22, h / 2 + 0.2, -5.1 + Math.sin(angle) * 0.22, "chrome");
      a.cylinder(g, 0.065, 0.27, x, h + 0.31, -5.1, "chrome");
      a.tube(g, [[x, h + 0.36, -5.1], [x + 0.2, h + 0.44, -5.1], [x + 0.35, h + 0.35, -5.1], [x + 0.35, 0.3, -5.1]], 0.035, "brass");
    }
    // Cabinet front service hatch is outside playable geometry.
    const panel = new T.Group(); panel.position.set(0, -0.4, 5.97); panel.scale.setScalar(0.42); g.add(panel);
    a.roundedBox(panel, 7, 1.8, 0.2, 0, 0, 0, "dark", 0.12);
    this.gear(panel, 0.72, 24, -1.8, 0, 0.13);
    this.gear(panel, 0.5, 20, -0.6, 0.2, 0.14);
    this.gear(panel, 0.7, 24, 1.25, 0, 0.13);
    for (const y of [-0.9, 0.9]) a.box(panel, 7.2, 0.11, 0.22, 0, y, 0.1, "brass");
    for (const x of [-3.55, 3.55]) a.box(panel, 0.11, 1.8, 0.22, x, 0, 0.1, "brass");
    return g;
  }
}
