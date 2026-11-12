import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { WorkshopMechanisms } from "./mechanisms.mjs";
import { BUMPERS, RAMP, flipperAngle } from "./layout.mjs";
export class WorkshopAssets {
  constructor() {
    this.root = new T.Group();
    this.root.name = "workshop-table";
    this.materials = {
      jade: new T.MeshStandardMaterial({
        color: 0x36534b,
        roughness: 0.3,
        metalness: 0.35,
      }),
      bronze: new T.MeshStandardMaterial({ color: 0x655541, roughness: 0.6, metalness: 0.5 }),
      steel: new T.MeshStandardMaterial({ color: 0x4c5158, roughness: 0.46, metalness: 0.65 }),
      ball: new T.MeshStandardMaterial({ color: 0xf3f5f7, roughness: 0.16, metalness: 0.68, emissive: 0x111318, emissiveIntensity: 0.15 }),
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
      rubber: new T.MeshStandardMaterial({ color: 0x191a1c, roughness: 0.85 }),
      cream: new T.MeshStandardMaterial({ color: 0xf0dfb5, roughness: 0.34 }),
      dark: new T.MeshStandardMaterial({ color: 0x24262a, roughness: 0.45 }),
      light: new T.MeshStandardMaterial({
        color: 0xffdfa3,
        emissive: 0xe9ac55,
        emissiveIntensity: 0.8,
      }),
      amber: new T.MeshStandardMaterial({ color: 0xffce75, emissive: 0xff8e22, emissiveIntensity: 1.3, roughness: 0.25, metalness: 0.15 }),
      red: new T.MeshStandardMaterial({ color: 0xd67954, roughness: 0.4 }),
    };
    this.applyPatina();
  }
  applyPatina() {
    // Deterministic enamel wear and brushed brass, authored locally, not a photo overlay.
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#b4b7a7"; ctx.fillRect(0, 0, 256, 256);
    let seed = 113;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let i = 0; i < 2800; i++) {
      const v = 100 + Math.floor(rand() * 125);
      ctx.fillStyle = `rgba(${v},${v},${v},0.24)`;
      ctx.fillRect(rand() * 256, rand() * 256, 0.5 + rand() * 5, 0.5 + rand());
    }
    const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    for (const name of ["jade", "brass", "steel"]) {
      this.materials[name].map = texture;
      this.materials[name].roughness = name === "brass" ? 0.33 : 0.42;
    }
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
  roundedBox(parent, w, h, d, x, y, z, material, radius = 0.06) {
    const r = Math.min(radius, w / 3, h / 3, d / 3);
    const s = new T.Shape(), left = -w / 2 + r, right = w / 2 - r, bottom = -h / 2 + r, top = h / 2 - r;
    s.moveTo(left, -h / 2); s.lineTo(right, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, bottom);
    s.lineTo(w / 2, top); s.quadraticCurveTo(w / 2, h / 2, right, h / 2);
    s.lineTo(left, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, top);
    s.lineTo(-w / 2, bottom); s.quadraticCurveTo(-w / 2, -h / 2, left, -h / 2);
    const geo = new T.ExtrudeGeometry(s, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r * 0.45, bevelThickness: r, bevelSegments: 3, curveSegments: 6, steps: 1 });
    geo.translate(0, 0, -d / 2 + r);
    return this.mesh(geo, material, parent, x, y, z);
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
    ctx.fillStyle = "#30343a";
    ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 7000; i++) {
      const x = (i * 131.79) % 1024, y = (i * 313.37) % 2048;
      ctx.fillStyle = i % 3 ? "rgba(181,148,84,0.09)" : "rgba(9,18,17,0.18)";
      ctx.fillRect(x, y, 2 + i % 7, 1);
    }
    // Quiet stencil art; graphic detail stays below the contrast of ball and shot marks.
    ctx.strokeStyle = "#77756b"; ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, 952, 1976);
    for (const x of [105, 919]) {
      ctx.strokeStyle = "#555b60"; ctx.lineWidth = 2;
      ctx.strokeRect(x - 22, 210, 44, 1380);
    }
    // Low-contrast maker crest behind the restored metal insert assembly.
    ctx.strokeStyle = "#555958"; ctx.lineWidth = 2;
    for (const r of [165, 185]) {
      ctx.beginPath(); ctx.arc(512, 1250, r, 0, Math.PI * 2); ctx.stroke();
    }
    // Three stable, non-flashing shot marks. These are labels, not active mission states.
    const shot = (x, y, label) => {
      ctx.fillStyle = "#c2a468"; ctx.strokeStyle = "#e3c58a"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y - 35); ctx.lineTo(x - 25, y + 13); ctx.lineTo(x + 25, y + 13); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#22262b"; ctx.fillRect(x - 94, y + 30, 188, 54); ctx.strokeRect(x - 94, y + 30, 188, 54);
      ctx.font = "bold 23px sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = "#d3bf92"; ctx.fillText(label, x, y + 65);
    };
    shot(330, 920, "LEFT BANK");
    shot(512, 795, "ENERGY");
    shot(694, 920, "RIGHT BANK");
    ctx.textAlign = "center"; ctx.fillStyle = "#91928d"; ctx.font = "20px monospace";
    ctx.fillText("WORKSHOP / No. 01", 512, 1770);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    const surface = this.mesh(new T.PlaneGeometry(5.5, 11.5), new T.MeshStandardMaterial({ map: texture, roughness: 0.42, metalness: 0.1 }), this.root, 0, 0.038, 0);
    surface.rotation.x = -Math.PI / 2;
  }
  build() {
    const g = this.root;
    this.box(g, 5.85, 0.55, 11.9, 0, -0.32, 0, "dark");
    this.box(g, 5.5, 0.08, 11.5, 0, -0.005, 0, "steel");
    this.printedPlayfield();
    // Restore the workshop's layered wiring; dark bronze stays below shot-mark contrast.
    for (let i = 0; i < 11; i++) {
      const x = -2.4 + i * 0.48;
      this.tube(g, [[x, 0.052, 4.1], [x, 0.052, 2.1], [x * 0.5, 0.052, 1.4], [x * 0.5, 0.052, -3.8]], 0.006, "bronze");
    }
    for (const [x, z] of [[0, 1.45], [-0.7, 0.65], [0.7, 0.65], [0, -0.2]]) {
      this.ring(g, 0.31, 0.018, x, 0.055, z, "brass");
      this.cylinder(g, 0.27, 0.012, x, 0.05, z, "dark");
      this.ring(g, 0.2, 0.009, x, 0.06, z, "chrome");
      this.cylinder(g, 0.08, 0.014, x, 0.06, z, "cream");
      for (const side of [-1, 1]) this.screw(g, x + side * 0.255, 0.063, z);
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
      this.box(g, 0.055, 0.25, 10.9, x, -0.28, 0, "steel");
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
    new WorkshopMechanisms(this).build(g);
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
    this.text(pivot, "CHAPPY", 0.48, 0.17, 0, 0.65, 0.11, "#34373c");
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
    this.cylinder(g, 0.42, 0.09, 0, 0.48, 0, "brass", 0.36);
    this.mesh(new T.SphereGeometry(0.29, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), "amber", g, 0, 0.52, 0);
    this.cylinder(g, 0.2, 0.23, 0, 0.29, 0, "amber");
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      this.cylinder(g, 0.022, 0.29, Math.cos(angle) * 0.25, 0.29, Math.sin(angle) * 0.25, "brass");
    }
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
    const mat = this.materials.chrome.clone();
    mat.roughness = 0.32;
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
    // Rail stanchions: thin enough to keep the moving ball readable.
    for (const edge of edges) for (let i = 0; i < edge.length; i += 6) {
      const p = edge[i];
      this.cylinder(g, 0.016, 0.13, p[0], p[1] - 0.05, p[2], "brass");
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
    this.roundedBox(g, 0.75, 0.68, 0.52, 0, 0.65, 0, "jade");
    this.box(g, 0.57, 0.48, 0.04, 0, 0.65, 0.29, "cream");
    this.ring(g, 0.15, 0.025, 0, 0.66, 0.33, "brass").rotation.x = 0;
    this.mesh(new T.SphereGeometry(0.11, 20, 12), "light", g, 0, 0.66, 0.34);
    this.cylinder(g, 0.14, 0.15, 0, 1.06, 0, "brass");
    const head = this.roundedBox(g, 0.98, 0.6, 0.65, 0, 1.43, 0, "brass", 0.1);
    head.rotation.z = -0.08;
    this.roundedBox(g, 0.8, 0.36, 0.06, 0, 1.43, 0.35, "jade", 0.015);
    for (const x of [-0.23, 0.23])
      this.mesh(new T.SphereGeometry(0.08, 16, 12), "amber", g, x, 1.46, 0.39);
    for (const x of [-0.23, 0.23]) this.ring(g, 0.115, 0.02, x, 1.46, 0.39, "brass").rotation.x = 0;
    for (const x of [-0.54, 0.54]) {
      const ear = this.cylinder(g, 0.15, 0.13, x, 1.43, 0, "chrome"); ear.rotation.z = Math.PI / 2;
      for (let i = 0; i < 3; i++) {
        const rib = this.ring(g, 0.15, 0.016, x + (i - 1) * 0.038, 1.43, 0, "brass"); rib.rotation.z = Math.PI / 2;
      }
    }
    this.box(g, 0.24, 0.025, 0.04, 0, 1.31, 0.38, "brass");
    this.cylinder(g, 0.035, 0.26, 0.27, 1.86, 0, "brass");
    this.mesh(new T.SphereGeometry(0.075, 16, 12), "red", g, 0.27, 2.02, 0);
    // A gripped wrench and ribbed elbow sleeves give the mascot an actual workshop role.
    const tool = new T.Group(); tool.position.set(-0.77, 0.55, 0.1); tool.rotation.z = -0.3; g.add(tool);
    this.box(tool, 0.055, 0.55, 0.04, 0, 0.24, 0, "chrome");
    this.ring(tool, 0.1, 0.035, 0, 0.56, 0, "chrome").rotation.x = 0;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) this.ring(g, 0.115, 0.015, side * 0.68, 0.56 + i * 0.06, 0.03, "brass");
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
