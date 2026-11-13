import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Fixed scenic machinery only: nothing here participates in ball physics. */
export class WorkshopMechanisms {
  constructor(assets) { this.a = assets; }
  cylinder(parent, radius, height, x, y, z, material, face = false, sides = 16) {
    const mesh = this.a.mesh(new T.CylinderGeometry(radius, radius, height, sides), material, parent, x, y, z);
    if (face) mesh.rotation.x = Math.PI / 2;
    return mesh;
  }
  rim(parent, radius, tube, x, y, z, material, face = true) {
    const mesh = this.a.mesh(new T.TorusGeometry(radius, tube, 6, 32), material, parent, x, y, z);
    if (!face) mesh.rotation.x = Math.PI / 2;
    return mesh;
  }
  bolt(parent, x, y, z, radius = .035) {
    this.cylinder(parent, radius, .035, x, y, z, "chrome", true, 6);
    this.a.box(parent, radius * 1.1, .009, .008, x, y, z + .02, "dark");
  }
  link(parent, start, end, width, material = "chrome") {
    const from = new T.Vector3(...start), to = new T.Vector3(...end), delta = to.clone().sub(from);
    const mesh = this.a.box(parent, width, delta.length(), .07, ...from.add(to).multiplyScalar(.5).toArray(), material);
    mesh.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
    return mesh;
  }
  gear(parent, radius, teeth, x, y, z) {
    const a = this.a, g = new T.Group();
    g.name = "machined-spur-gear"; g.position.set(x, y, z); parent.add(g);
    const shape = new T.Shape();
    for (let i = 0; i < teeth * 4; i++) {
      const angle = i / (teeth * 4) * Math.PI * 2;
      const r = radius * ([0, 3].includes(i % 4) ? .88 : 1);
      if (!i) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    shape.closePath();
    // Six relieved sectors leave tapered, integral spokes and a solid hub.
    for (let i = 0; i < 6; i++) {
      const start = i * Math.PI / 3 + .15, end = (i + 1) * Math.PI / 3 - .15;
      const hole = new T.Path();
      hole.absarc(0, 0, radius * .72, start, end, false);
      hole.absarc(0, 0, radius * .28, end - .08, start + .08, true);
      hole.closePath(); shape.holes.push(hole);
    }
    a.mesh(new T.ExtrudeGeometry(shape, { depth: .09, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 1, steps: 1, curveSegments: 8 }), "brass", g);
    this.rim(g, radius * .82, .014, 0, 0, .1, "bronze");
    this.cylinder(g, radius * .2, .15, 0, 0, .07, "bronze", true);
    this.cylinder(g, radius * .14, .19, 0, 0, .09, "chrome", true);
    this.bolt(g, 0, 0, .2, radius * .075);
    a.batchStaticAssembly(g);
    return g;
  }
  bearing(parent, x, y, z) {
    const a = this.a;
    a.roundedBox(parent, .38, .42, .14, x, y, z, "steel", .04);
    this.cylinder(parent, .14, .3, x, y, z + .09, "bronze", true);
    for (const dx of [-.13, .13]) this.bolt(parent, x + dx, y - .13, z + .09, .025);
  }
  vessel(parent, x, height) {
    const a = this.a, g = new T.Group(); g.name = "pressure-vessel";
    g.position.set(x, .2, -5.1); parent.add(g);
    // Narrow warm sight tube sits inside a solid blue pressure shell and tie cage.
    this.cylinder(g, .18, height - .25, 0, height / 2, 0, "steel");
    this.cylinder(g, .065, height - .28, 0, height / 2, .18, "amber");
    for (const y of [.05, height - .05]) {
      this.cylinder(g, .29, .1, 0, y, 0, "brass");
      this.rim(g, .26, .018, 0, y, 0, "chrome", false);
      const dome = a.mesh(new T.SphereGeometry(.19, 16, 8), "bronze", g, 0, y, 0); dome.scale.y = .6;
      for (let i = 0; i < 6; i++) {
        const angle = i * Math.PI / 3;
        this.cylinder(g, .035, .14, Math.cos(angle) * .24, y, Math.sin(angle) * .24, "chrome", false, 6);
      }
    }
    for (const dx of [-.22, .22]) {
      this.cylinder(g, .023, height, dx, height / 2, .1, "chrome");
      a.box(g, .12, .14, .32, dx, -.02, 0, "steel");
    }
    this.cylinder(g, .06, .2, 0, height + .05, 0, "brass");
    const curve = new T.CatmullRomCurve3([[0,height+.14,0],[.2,height+.22,0],[.35,height+.1,0],[.35,.2,0],[.15,.12,0]].map(p=>new T.Vector3(...p)));
    a.mesh(new T.TubeGeometry(curve, 24, .03, 6, false), "brass", g);
    this.cylinder(g, .12, .09, .08, height - .28, .26, "brass", true);
    this.cylinder(g, .096, .015, .08, height - .28, .315, "cream", true);
    this.link(g, [.08,height-.28,.33], [.115,height-.22,.33], .014, "dark");
    this.rim(g, .085, .014, .35, .35, .07, "red");
    this.link(g, [.27,.35,.07], [.43,.35,.07], .018, "red");
    a.batchStaticAssembly(g);
  }
  build(parent) {
    const a = this.a, g = new T.Group(); g.name = "rear-mechanical-bank"; parent.add(g);
    a.roundedBox(g, 5.35, 2.55, .22, 0, 1.4, -5.6, "dark", .08);
    for (const x of [-2.6, 0, 2.6]) {
      a.box(g, .09, 2.5, .12, x, 1.4, -5.43, "steel");
      for (const y of [.25, 1.4, 2.55]) this.bolt(g, x, y, -5.34);
    }
    for (const y of [.18, 2.64]) a.box(g, 5.35, .075, .13, 0, y, -5.42, "brass");
    for (const [radius, teeth, x, y] of [[.95,32,-1.42,1.5],[.48,20,-.04,2.03],[.38,18,-.24,.87]]) {
      this.bearing(g, x, y, -5.37);
      this.gear(g, radius, teeth, x, y, -5.25);
    }
    const engine = new T.Group(); engine.name = "fixed-crank-piston-assembly"; g.add(engine);
    a.roundedBox(engine, .62, .47, .43, -1.85, .34, -5.08, "jade", .08);
    a.box(engine, .75, .09, .5, -1.85, .13, -5.08, "steel");
    for (let y = .22; y < .5; y += .065) a.box(engine, .43, .025, .06, -1.85, y, -4.84, "chrome");
    for (const dx of [-.24,.24]) this.bolt(engine, -1.85 + dx, .39, -4.84, .027);
    this.cylinder(engine, .12, .15, -1.85, .62, -5.04, "brass");
    this.cylinder(engine, .048, .3, -1.85, .78, -5.04, "chrome");
    this.link(engine, [-1.85,.91,-5.02], [-1.13,1.24,-5.02], .085);
    for (const [x,y] of [[-1.85,.91],[-1.13,1.24]]) {
      this.cylinder(engine, .1, .1, x, y, -5.01, "bronze", true);
      this.bolt(engine, x, y, -4.94, .045);
    }
    a.batchStaticAssembly(engine);
    this.vessel(g, 1.1, 1.9); this.vessel(g, 2.05, 1.35);
    // The inset service hatch retains its original front-face envelope.
    const panel = new T.Group(); panel.name = "front-service-hatch";
    panel.position.set(0, -.4, 5.97); panel.scale.setScalar(.42); g.add(panel);
    a.roundedBox(panel, 7, 1.8, .2, 0, 0, 0, "dark", .12);
    for (const [radius,x,y] of [[.72,-1.8,0],[.5,-.6,.2],[.7,1.25,0]]) {
      this.bearing(panel, x, y, .1); this.gear(panel, radius, 24, x, y, .13);
    }
    this.link(panel, [-1.6,.23,.37],[-.45,.37,.37], .09, "bronze");
    this.link(panel, [-.45,.37,.37],[1.4,.17,.37], .09, "bronze");
    for (const [x,y] of [[-1.6,.23],[-.45,.37],[1.4,.17]]) this.bolt(panel,x,y,.42,.07);
    for (const y of [-.9,.9]) a.box(panel, 7.2, .11, .22, 0, y, .1, "brass");
    for (const x of [-3.55,3.55]) a.box(panel,.11,1.8,.22,x,0,.1,"brass");
    for (const x of [-2.95,2.95]) {
      a.roundedBox(panel,.65,1.4,.12,x,0,.16,"steel",.06);
      for(let y=-.45;y<=.45;y+=.225) {
        a.box(panel,.42,.065,.035,x,y,.24,"dark");
        a.box(panel,.4,.035,.04,x,y-.04,.25,"chrome");
      }
    }
    for (const x of [-3.4,-2.4,2.4,3.4]) for(const y of [-.75,.75]) this.bolt(panel,x,y,.23,.045);
    a.batchStaticAssembly(panel); a.batchStaticAssembly(g);
    return g;
  }
}
