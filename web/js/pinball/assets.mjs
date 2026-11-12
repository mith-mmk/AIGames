import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { BUMPERS, RAMP, flipperAngle } from "./layout.mjs";
export class WorkshopAssets {
  constructor() {
    this.root = new T.Group();
    this.root.name = "workshop-table";
    this.materials = {
      jade: new T.MeshStandardMaterial({
        color: 0x176c68,
        roughness: 0.3,
        metalness: 0.35,
      }),
      brass: new T.MeshStandardMaterial({
        color: 0xc9a362,
        roughness: 0.26,
        metalness: 0.8,
      }),
      chrome: new T.MeshStandardMaterial({
        color: 0xc7d7dc,
        roughness: 0.17,
        metalness: 0.95,
      }),
      rubber: new T.MeshStandardMaterial({ color: 0x172124, roughness: 0.85 }),
      cream: new T.MeshStandardMaterial({ color: 0xf0dfb5, roughness: 0.34 }),
      dark: new T.MeshStandardMaterial({ color: 0x122b31, roughness: 0.45 }),
      light: new T.MeshStandardMaterial({
        color: 0x9af3dc,
        emissive: 0x50cbb6,
        emissiveIntensity: 0.8,
      }),
      red: new T.MeshStandardMaterial({ color: 0xd67954, roughness: 0.4 }),
    };
  }
  mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const m = new T.Mesh(geometry, this.materials[material] || material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  box(parent, w, h, d, x, y, z, mat) {
    return this.mesh(new T.BoxGeometry(w, h, d), mat, parent, x, y, z);
  }
  cylinder(parent, r, h, x, y, z, mat, r2 = r) {
    return this.mesh(
      new T.CylinderGeometry(r, r2, h, 32),
      mat,
      parent,
      x,
      y,
      z,
    );
  }
  screw(parent, x, y, z) {
    this.cylinder(parent, 0.038, 0.018, x, y, z, "chrome");
    this.box(parent, 0.048, 0.005, 0.008, x, y + 0.011, z, "dark");
  }
  tube(parent, points, r, mat) {
    const curve = new T.CatmullRomCurve3(
      points.map((p) => new T.Vector3(...p)),
    );
    return this.mesh(new T.TubeGeometry(curve, 100, r, 8, false), mat, parent);
  }
  ring(parent, r, t, x, y, z, mat) {
    const m = this.mesh(
      new T.TorusGeometry(r, t, 10, 48),
      mat,
      parent,
      x,
      y,
      z,
    );
    m.rotation.x = Math.PI / 2;
    return m;
  }
  text(parent, label, x, y, z, w = 1, h = 0.22, color = "#eed8a7") {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = color;
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 256, 64);
    const tex = new T.CanvasTexture(c);
    tex.colorSpace = T.SRGBColorSpace;
    const m = this.mesh(
      new T.PlaneGeometry(w, h),
      new T.MeshBasicMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
      }),
      parent,
      x,
      y,
      z,
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  printedPlayfield() {
    const c = document.createElement("canvas");
    c.width = 1024;
    c.height = 2048;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#124b4c";
    ctx.fillRect(0, 0, c.width, c.height);
    // Screen-printed, original workshop seal with quiet negative space for play.
    ctx.strokeStyle = "#b18b4e";
    ctx.lineWidth = 6;
    ctx.strokeRect(35, 35, 954, 1978);
    ctx.lineWidth = 2;
    ctx.strokeRect(49, 49, 926, 1950);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(512, 1220, 230 + i * 26, 0, Math.PI * 2);
      ctx.strokeStyle = i === 1 ? "#517568" : "#ad8c51";
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(512, 1220);
    for (let i = 0; i < 24; i++) {
      ctx.rotate(Math.PI / 12);
      ctx.fillStyle = "#9b804d";
      ctx.fillRect(274, -5, 18, 10);
    }
    ctx.restore();
    for (const x of [130, 894]) {
      ctx.fillStyle = "#193e40";
      ctx.fillRect(x - 42, 210, 84, 1420);
      ctx.strokeStyle = "#587167";
      ctx.strokeRect(x - 42, 210, 84, 1420);
      for (let y = 260; y < 1600; y += 115) {
        ctx.beginPath(); ctx.moveTo(x - 20, y + 16); ctx.lineTo(x, y); ctx.lineTo(x + 20, y + 16); ctx.stroke();
      }
    }
    ctx.fillStyle = "#bca46d";
    ctx.textAlign = "center";
    ctx.font = "22px monospace";
    ctx.fillText("AUTOMATON LAB / No. 01", 512, 1810);
    ctx.fillText("PRECISION • ENERGY • INVENTION", 512, 1848);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    const surface = this.mesh(new T.PlaneGeometry(5.5, 11.5), new T.MeshStandardMaterial({ map: texture, roughness: 0.42, metalness: 0.1 }), this.root, 0, 0.038, 0);
    surface.rotation.x = -Math.PI / 2;
  }
  build() {
    const g = this.root;
    this.box(g, 5.85, 0.55, 11.9, 0, -0.32, 0, "dark");
    this.box(g, 5.5, 0.08, 11.5, 0, -0.005, 0, "jade");
    this.printedPlayfield();
    // Original circuit-board illustration printed below the machinery.
    for (let i = 0; i < 11; i++) {
      const x = -2.4 + i * 0.48;
      this.tube(
        g,
        [
          [x, 0.045, 4.1],
          [x, 0.045, 2.1],
          [x * 0.5, 0.045, 1.4],
          [x * 0.5, 0.045, -3.8],
        ],
        0.008,
        "brass",
      );
    }
    for (const [x, z] of [
      [0, 1.25],
      [-0.7, 0.5],
      [0.7, 0.5],
      [0, -0.2],
    ]) {
      this.ring(g, 0.34, 0.018, x, 0.055, z, "brass");
      this.cylinder(g, 0.24, 0.012, x, 0.05, z, "dark");
      this.cylinder(g, 0.1, 0.018, x, 0.062, z, "light");
    }
    this.text(g, "CHAPPY", 0, 0.065, 2.2, 2.4, 0.55);
    this.text(g, "WORKSHOP", 0, 0.066, 2.65, 1.95, 0.27);
    this.text(g, "BUILD • CHARGE • LAUNCH", 0, 0.065, 3.05, 2.5, 0.16);
    for (const x of [-2.85, 2.85]) {
      this.box(g, 0.14, 0.52, 11.9, x, 0.17, 0, "dark");
      this.box(g, 0.16, 0.045, 11.9, x, 0.455, 0, "brass");
      for (let z = -5.2; z <= 5.2; z += 1.3) this.screw(g, x, 0.49, z);
    }
    this.box(g, 5.65, 0.52, 0.16, 0, 0.17, -5.85, "dark");
    this.box(g, 5.65, 0.05, 0.18, 0, 0.455, -5.85, "brass");
    // Layered enamel cabinet sides and corner protectors.
    for (const x of [-2.94, 2.94]) {
      this.box(g, 0.055, 0.25, 10.9, x, -0.28, 0, "jade");
      for (const z of [-5.55, 5.55]) this.box(g, 0.12, 0.6, 0.27, x, -0.2, z, "brass");
      for (let z = -2.6; z < 2.8; z += 0.35) this.box(g, 0.065, 0.11, 0.08, x, -0.29, z, "dark");
    }
    // Apron with inset score legends, coin-like workshop emblem and drain mouth.
    this.box(g, 5.45, 0.1, 1.1, 0, 0.13, 5.18, "dark");
    this.text(g, "01 / THE INVENTOR", -1.1, 0.19, 5.1, 2, 0.2);
    this.text(g, "DESIGN STUDY", 1.1, 0.19, 5.1, 1.5, 0.18);
    this.box(g, 0.8, 0.05, 0.35, 0, 0.02, 4.55, "rubber");
    this.flippers = [
      this.flipper(-1.05, 3.75, false),
      this.flipper(1.05, 3.75, true),
    ];
    for (const [i, p] of BUMPERS.entries()) this.bumper(p.x, p.z, i);
    this.ramp();
    this.robot();
    // Shooter lane and spring-loaded plunger assembly.
    this.tube(
      g,
      [
        [2.35, 0.23, 4.5],
        [2.35, 0.23, -3.9],
        [2.1, 0.23, -4.8],
        [1.45, 0.23, -5.12],
      ],
      0.045,
      "chrome",
    );
    this.tube(
      g,
      [
        [2.72, 0.23, 4.55],
        [2.72, 0.23, -4.15],
        [2.4, 0.23, -5.2],
        [1.65, 0.23, -5.45],
      ],
      0.045,
      "chrome",
    );
    for (let i = 0; i < 14; i++) {
      const r = this.ring(
        g,
        0.11,
        0.017,
        2.53,
        0.17,
        4.25 + i * 0.055,
        "chrome",
      );
      r.rotation.x = 0;
    }
    const rod = this.cylinder(g, 0.038, 0.95, 2.53, 0.17, 4.7, "brass");
    rod.rotation.x = Math.PI / 2;
    const knob = this.cylinder(g, 0.16, 0.14, 2.53, 0.17, 5.3, "red");
    knob.rotation.x = Math.PI / 2;
    // Lower lanes have raised metal guides and visible mounting posts.
    for (const side of [-1, 1]) {
      this.tube(
        g,
        [
          [side * 2.2, 0.22, 1.9],
          [side * 2.1, 0.22, 3.1],
          [side * 1.4, 0.22, 4.15],
        ],
        0.04,
        "chrome",
      );
      this.tube(
        g,
        [
          [side * 1.9, 0.22, 2.0],
          [side * 1.6, 0.22, 2.8],
          [side * 1.1, 0.22, 3.1],
        ],
        0.045,
        "brass",
      );
      for (const z of [2.0, 2.75]) {
        this.cylinder(g, 0.075, 0.27, side * 1.85, 0.14, z, "cream");
        this.screw(g, side * 1.85, 0.29, z);
      }
      for (let i = 0; i < 3; i++) {
        const x = side * (0.85 + i * 0.34);
        this.box(g, 0.22, 0.35, 0.12, x, 0.23, -0.7, "cream");
        this.box(g, 0.16, 0.22, 0.03, x, 0.25, -0.62, i === 1 ? "red" : "jade");
        this.text(g, `${i + 1}`, x, 0.07, -0.35, 0.2, 0.15);
      }
    }
    this.text(g, "CHARGE", -0.9, 0.08, -1.35, 1.2, 0.18);
    this.text(g, "SKY RAIL", -1.7, 0.075, 1.35, 1, 0.17);
    return g;
  }
  flipper(x, z, mirror) {
    const pivot = new T.Group();
    pivot.position.set(x, 0.18, z);
    this.root.add(pivot);
    pivot.userData.mirror = mirror;
    const shape = new T.Shape();
    shape.moveTo(0, -0.16);
    shape.bezierCurveTo(-0.23, -0.16, -0.23, 0.16, 0, 0.16);
    shape.lineTo(0.94, 0.1);
    shape.bezierCurveTo(1.1, 0.08, 1.1, -0.08, 0.94, -0.1);
    shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, {
      depth: 0.15,
      bevelEnabled: true,
      bevelSize: 0.025,
      bevelThickness: 0.025,
      bevelSegments: 3,
      steps: 1,
    });
    geo.rotateX(-Math.PI / 2);
    this.mesh(geo, "rubber", pivot);
    const top = this.mesh(geo, "cream", pivot, 0, 0.13, 0);
    top.scale.set(0.95, 0.45, 0.7);
    this.cylinder(pivot, 0.09, 0.025, 0, 0.17, 0, "brass");
    this.screw(pivot, 0, 0.195, 0);
    this.text(pivot, "CHAPPY", 0.48, 0.17, 0, 0.65, 0.11, "#235f5b");
    pivot.rotation.y = flipperAngle(mirror, false);
    return pivot;
  }
  bumper(x, z, index) {
    const g = new T.Group();
    g.name = `bumper-${index}`;
    g.position.set(x, 0, z);
    this.root.add(g);
    this.cylinder(g, 0.43, 0.08, 0, 0.09, 0, "brass");
    this.cylinder(g, 0.25, 0.31, 0, 0.28, 0, "chrome");
    this.ring(g, 0.35, 0.06, 0, 0.18, 0, "rubber");
    this.cylinder(g, 0.42, 0.09, 0, 0.48, 0, "cream", 0.36);
    this.cylinder(g, 0.32, 0.04, 0, 0.54, 0, "jade");
    this.ring(g, 0.31, 0.018, 0, 0.565, 0, "brass");
    this.cylinder(g, 0.12, 0.035, 0, 0.58, 0, "light");
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      this.screw(g, Math.cos(a) * 0.32, 0.55, Math.sin(a) * 0.32);
    }
    this.text(g, "ENERGY", 0, 0.565, 0.19, 0.42, 0.09);
  }
  ramp() {
    const g = this.root;
    this.curve = new T.CatmullRomCurve3(RAMP.map((p) => new T.Vector3(...p)));
    const points = this.curve.getPoints(96),
      positions = [],
      indices = [];
    const width = 0.48;
    const edges = [[], []];
    for (let i = 0; i < points.length; i++) {
      const t = this.curve.getTangent(i / 96);
      const n = new T.Vector3(-t.z, 0, t.x).normalize();
      for (const side of [-1, 1]) {
        const p = points[i].clone().addScaledVector(n, (side * width) / 2);
        positions.push(p.x, p.y, p.z);
        edges[side === -1 ? 0 : 1].push([p.x, p.y + 0.12, p.z]);
      }
      if (i < 96) {
        const a = i * 2;
        indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = this.materials.jade.clone();
    mat.side = T.DoubleSide;
    this.mesh(geo, mat, g);
    for (const edge of edges) {
      this.tube(g, edge, 0.025, "brass");
      this.tube(
        g,
        edge.map((p) => [p[0], p[1] - 0.08, p[2]]),
        0.018,
        "chrome",
      );
    }
    for (const t of [0.15, 0.32, 0.5, 0.68, 0.84]) {
      const p = this.curve.getPoint(t);
      this.cylinder(g, 0.048, p.y, p.x, p.y / 2, p.z, "chrome");
      this.cylinder(g, 0.13, 0.035, p.x, 0.045, p.z, "brass");
      this.screw(g, p.x + 0.06, 0.066, p.z);
    }
  }
  robot() {
    const g = new T.Group();
    g.name = "chappy-automaton";
    g.position.set(0.15, 0, -4.15);
    this.root.add(g);
    this.cylinder(g, 0.7, 0.13, 0, 0.1, 0, "brass");
    this.cylinder(g, 0.51, 0.12, 0, 0.21, 0, "dark");
    this.box(g, 0.75, 0.68, 0.52, 0, 0.65, 0, "jade");
    this.box(g, 0.57, 0.48, 0.04, 0, 0.65, 0.29, "cream");
    this.ring(g, 0.15, 0.025, 0, 0.66, 0.33, "brass").rotation.x = 0;
    this.mesh(new T.SphereGeometry(0.11, 20, 12), "light", g, 0, 0.66, 0.34);
    this.cylinder(g, 0.14, 0.15, 0, 1.06, 0, "brass");
    const head = this.box(g, 0.98, 0.6, 0.65, 0, 1.43, 0, "cream");
    head.rotation.z = -0.08;
    this.box(g, 0.8, 0.32, 0.04, 0, 1.43, 0.35, "dark");
    for (const x of [-0.23, 0.23])
      this.mesh(new T.SphereGeometry(0.08, 16, 12), "light", g, x, 1.46, 0.39);
    this.box(g, 0.24, 0.025, 0.04, 0, 1.31, 0.38, "brass");
    this.cylinder(g, 0.035, 0.26, 0.27, 1.86, 0, "brass");
    this.mesh(new T.SphereGeometry(0.075, 16, 12), "red", g, 0.27, 2.02, 0);
    for (const side of [-1, 1]) {
      this.mesh(
        new T.SphereGeometry(0.16, 20, 12),
        "brass",
        g,
        side * 0.54,
        0.87,
        0,
      );
      const arm = this.cylinder(g, 0.105, 0.5, side * 0.68, 0.66, 0.03, "jade");
      arm.rotation.z = side * 0.4;
      this.mesh(
        new T.SphereGeometry(0.14, 20, 12),
        "chrome",
        g,
        side * 0.77,
        0.43,
        0.05,
      );
      for (const x of [-0.23, 0.23])
        this.box(g, 0.25, 0.14, 0.36, x, 0.32, 0.1, "rubber");
    }
  }
  dispose() {
    const geometries = new Set(),
      materials = new Set(),
      textures = new Set();
    this.root.traverse((o) => {
      if (o.geometry) geometries.add(o.geometry);
      if (o.material)
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          materials.add(m);
          if (m.map) textures.add(m.map);
        }
    });
    for (const x of geometries) x.dispose();
    for (const x of materials) x.dispose();
    for (const x of textures) x.dispose();
  }
}
