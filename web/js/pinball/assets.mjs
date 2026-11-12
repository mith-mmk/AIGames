import { buildVisualRamp } from "./ramp-geometry.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { PlayfieldParts } from "./playfield-parts.mjs";
import { WorkshopMechanisms } from "./mechanisms.mjs";
import { BUMPERS, MINI_BUMPERS, RAMP, flipperAngle, LOWER_LAYOUT, SHOOTER_BACKING } from "./layout.mjs";
export class WorkshopAssets {
  constructor() {
    this.root = new T.Group();
    this.root.name = "workshop-table";
    this.materials = {
      jade: new T.MeshStandardMaterial({
        color: 0x226f9b,
        roughness: 0.3,
        metalness: 0.35,
      }),
      bronze: new T.MeshStandardMaterial({ color: 0x834c3b, roughness: 0.6, metalness: 0.5 }),
      steel: new T.MeshStandardMaterial({ color: 0x365b80, roughness: 0.46, metalness: 0.65 }),
      ball: new T.MeshStandardMaterial({ color: 0xf3f5f7, roughness: 0.16, metalness: 0.68, emissive: 0x111318, emissiveIntensity: 0.15 }),
      brass: new T.MeshStandardMaterial({
        color: 0xe7b650,
        roughness: 0.26,
        metalness: 0.8,
      }),
      chrome: new T.MeshStandardMaterial({
        color: 0xc7d7dc,
        roughness: 0.17,
        metalness: 0.95,
      }),
      rubber: new T.MeshStandardMaterial({ color: 0x191a1c, roughness: 0.85 }),
      cream: new T.MeshStandardMaterial({ color: 0xffefda, roughness: 0.34 }),
      dark: new T.MeshStandardMaterial({ color: 0x14243b, roughness: 0.45 }),
      light: new T.MeshStandardMaterial({
        color: 0xffdfa3,
        emissive: 0xe9ac55,
        emissiveIntensity: 0.8,
      }),
      amber: new T.MeshStandardMaterial({ color: 0xffce75, emissive: 0xff8e22, emissiveIntensity: 1.3, roughness: 0.25, metalness: 0.15 }),
      red: new T.MeshStandardMaterial({ color: 0xbf4146, roughness: 0.4 }),
    };
    this.materials.purple = new T.MeshStandardMaterial({ color: 0x9161d5, roughness: 0.34, metalness: 0.14 });
    this.materials.cabinet = new T.MeshStandardMaterial({ color: 0x682027, roughness: 0.36, metalness: 0.12 });
    this.materials.insert = new T.MeshStandardMaterial({ color: 0xffe439, emissive: 0xe6c320, emissiveIntensity: 0.35, roughness: 0.3 });
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
    // World-space print is registered to the live part footprints. It adds no
    // collision surfaces: yellow chevrons are shot directions, circles are inserts.
    ctx.fillStyle = "#091a30";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.scale(c.width / 5.5, c.height / 11.5);
    ctx.translate(2.75, 5.75);
    const line = (points, color, width = .025, close = false, fill = null) => {
      ctx.beginPath(); points.forEach(([x,z],i)=>i?ctx.lineTo(x,z):ctx.moveTo(x,z));
      if (close) ctx.closePath();
      if (fill) { ctx.fillStyle=fill; ctx.fill(); }
      ctx.strokeStyle=color; ctx.lineWidth=width; ctx.stroke();
    };
    const circle = (x,z,r,color,fill=null,width=.025) => {
      ctx.beginPath();ctx.arc(x,z,r,0,Math.PI*2);
      if(fill){ctx.fillStyle=fill;ctx.fill();}
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    };
    const arrow = (x,z,angle=0,size=.12) => {
      ctx.save();ctx.translate(x,z);ctx.rotate(angle);
      line([[0,-size],[-size*.65,size*.6],[size*.65,size*.6]],"#fff28a",.012,true,"#f2d62e");ctx.restore();
    };
    // Red lacquer perimeter and pale keyline echo the reference cabinet.
    line([[-2.63,5.5],[-2.63,-4.6],[-2.05,-5.42],[1.9,-5.42],[2.61,-4.5],[2.61,5.5]],"#973e49",.15);
    line([[-2.48,4.2],[-2.48,-4.5],[-1.99,-5.2],[1.8,-5.2],[2.40,-4.4]],"#6087a6",.035);
    // Illustrated circuit panels follow the upper bumper cluster, leaving gaps
    // between the actual posts and the central spinner approach.
    line([[-1.35,-3.75],[-.42,-4.03],[.34,-3.75],[1.27,-3.83],[1.49,-2.68],[.66,-2.55],[.59,-1.7],[-.58,-1.58],[-1.2,-2.36]],"#7294ac",.035,true,"#1c354c");
    for (const {x,z} of BUMPERS) {
      circle(x,z,.52,"#69b6c2","#123a56",.045);
      circle(x,z,.60,"#315f7a",null,.025);
      for(let i=0;i<8;i++) {const t=i*Math.PI/4;circle(x+Math.sin(t)*.54,z+Math.cos(t)*.54,.023,"#ddce78","#ddce78",.01);}
    }
    // Small printed service panels make the compact upper assembly legible.
    // These muted details sit under hardware rather than posing as targets.
    for(const [x,z,angle] of [[-.99,-3.98,-.30],[.20,-3.72,.18],[.95,-2.42,.25],[-.75,-2.20,-.22]]) {
      ctx.save();ctx.translate(x,z);ctx.rotate(angle);
      line([[-.19,-.25],[.19,-.25],[.19,.25],[-.19,.25]],"#5f7f91",.016,true,"#102538");
      for(let i=0;i<3;i++) line([[-.12,-.15+i*.12],[.09,-.15+i*.12]],i===1?"#ba9c49":"#38566c",.028);
      circle(.12,.18,.023,"#708a9d","#708a9d",.01);ctx.restore();
    }
    // Red orbital sectors reference the upper return loop without pretending
    // to change the real ramp geometry, which remains visible above this art.
    for(const side of [-1,1]) {
      for(let i=0;i<5;i++) {
        const z=-4.35+i*.38, x=side*(1.48+Math.sin(i*.55)*.25);
        line([[x-side*.12,z],[x+side*.12,z-.10],[x+side*.20,z+.13],[x-side*.05,z+.23]],"#794858",.018,true,"#68323f");
      }
      line([[side*.56,-1.40],[side*.78,-.99],[side*.71,-.54]],"#3b566d",.025);
      for(let i=0;i<4;i++) circle(side*(.40+i*.14),-.88+i*.23,.028,"#4a6880",null,.014);
    }
    // The distinctive left purple island wraps all three existing mini pops.
    line([[-2.48,-1.50],[-2.13,-1.8],[-1.48,-1.59],[-1.16,-1.06],[-1.18,-.35],[-1.48,.38],[-2.04,.48],[-2.48,.10]],"#c2a1ed",.045,true,"#5e3e8d");
    line([[-2.47,-1.55],[-2.28,-1.98],[-1.89,-2.16],[-1.42,-1.99],[-1.05,-1.54],[-.96,-1.15]],"#b4a0dc",.12);
    line([[-2.47,-1.55],[-2.28,-1.98],[-1.89,-2.16],[-1.42,-1.99],[-1.05,-1.54],[-.96,-1.15]],"#59427f",.052);
    for(const {x,z} of MINI_BUMPERS) circle(x,z,.24,"#d8b9ff","#412e73",.035);
    // Right ramp mouth is a clearly directional red panel, not an extra wall.
    line([[1.28,.65],[1.13,.12],[1.33,-.53],[1.72,-.99],[1.86,-.49],[1.59,.32]],"#e9948d",.025,true,"#a64352");
    for(const [x,z,t] of [[1.45,.17,.16],[1.60,-.32,.30],[-.98,-.75,-.35],[-1.10,-1.10,-.35],[-1.22,-1.43,-.35],[0,-.15,0],[0,-.55,0]]) arrow(x,z,t);
    // An open navy mission circle, not a central logo or raised mechanism.
    circle(0,1.2,1.04,"#3d5d8d","#172d4e",.055);
    circle(0,1.2,.94,"#7798c1",null,.018);
    circle(0,1.2,.64,"#254763",null,.018);
    for(let i=0;i<20;i++) {
      const t=i*Math.PI/10;
      line([[Math.sin(t)*.96,1.2+Math.cos(t)*.96],[Math.sin(t)*1.015,1.2+Math.cos(t)*1.015]],"#557194",.018);
    }
    // Chappy's original screen-face/heart identity, flat ink: no new collider
    // and no bright round eye that could be mistaken for the silver ball.
    ctx.save();ctx.translate(0,1.17);
    line([[-.37,-.50],[.35,-.50],[.45,-.37],[.45,.04],[.32,.16],[-.34,.16],[-.45,.03],[-.45,-.38]],"#9eacb2",.035,true,"#667a87");
    line([[-.35,-.39],[.34,-.39],[.34,.02],[-.35,.02]],"#3d697a",.025,true,"#071b29");
    for(const side of [-1,1]) {
      line([[side*.26,-.16],[side*.20,-.24],[side*.13,-.16]],"#64bed0",.045);
      line([[side*.47,-.39],[side*.55,-.39],[side*.55,-.06],[side*.47,-.06]],"#aa8c44",.025,true,"#bc994b");
      circle(side*.34,-.43,.025,"#bdac85","#7a6651",.01);
    }
    line([[-.13,-.035],[0,.005],[.13,-.035]],"#64bed0",.022);
    line([[-.25,.20],[.26,.20],[.32,.54],[-.31,.54]],"#91a1a7",.025,true,"#556977");
    line([[0,.44],[-.11,.33],[-.08,.27],[0,.30],[.08,.27],[.11,.33],[0,.44]],"#64bed0",.02,true,"#3a8ea4");
    line([[-.34,.28],[-.51,.36],[-.62,.18]],"#b69b56",.055);
    line([[.34,.28],[.50,.19],[.55,-.01]],"#b69b56",.055);
    line([[.50,-.03],[.49,-.17],[.55,-.12],[.62,-.18],[.61,-.03]],"#a3b0b1",.025);
    ctx.font="bold .115px sans-serif";ctx.textAlign="center";ctx.fillStyle="#9cbbc4";ctx.fillText("BUILD • HACK • PLAY",0,.75);
    ctx.restore();
    // Printed angular purple fan points from the flippers towards the ring.
    for(const side of [-1,1]) {
      line([[side*.12,3.73],[side*.47,2.45],[side*.69,2.25],[side*.34,3.60]],"#65558f",.02,true,"#493e72");
      line([[side*.42,3.70],[side*1.17,3.13],[side*.82,2.43],[side*.67,3.20]],"#3e5e88",.02,true,"#263d63");
      const sling=LOWER_LAYOUT.slingVertices.map(([x,z])=>[side*x,z]);
      line(sling,"#d77b81",.13,true,"#a1394c");
      for(const z of [1.72,2.14,2.58,3.00]) arrow(side*2.15,z,Math.PI,.10);
      for(const z of [-4.70,-4.22,-3.75,-3.27,-2.8]) arrow(side*2.36,z,side<0?0:Math.PI,.09);
    }
    // Small static guide inserts echo the rhythm of the reference without
    // duplicating active lamps or adding bright ball-like white decorations.
    for(const [x,z] of [[-.92,.32],[.93,.34],[-1.15,.63],[1.14,.65],[-1.18,1.17],[1.18,1.17],[-1.12,1.70],[1.12,1.70],[-.74,2.07],[.74,2.07],[-2.1,3.45],[2.1,3.45],[-.48,-4.65],[.48,-4.65]]) circle(x,z,.035,"#d8cf42","#d8cf42",.015);
    ctx.fillStyle="#8fb1c8";ctx.font="bold .115px sans-serif";ctx.textAlign="center";
    ctx.fillText("CHAPPY • ORBIT WORKSHOP",0,4.55);
    ctx.restore();
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
    // The reference's large central circle is flush printed/inset hardware,
    // leaving the actual shot fan open rather than adding a physical obstacle.
    this.ring(g,.83,.012,0,.055,1.20,"steel");
    this.ring(g,.92,.012,0,.055,1.20,"steel");
    this.missionLamps=[];
    for(let i=0;i<10;i++) {
      const angle=2*Math.PI*i/10, x=Math.sin(angle)*.76,z=1.20+Math.cos(angle)*.76;
      this.cylinder(g,.085,.012,x,.05,z,"dark");
      this.missionLamps.push(this.cylinder(g,.045,.016,x,.065,z,"insert"));
    }
    // Keep the reference's central circle open and the ball silhouette readable.
    for (const x of [-2.85, 2.85]) {
      this.box(g, 0.14, 0.52, 11.9, x, 0.17, 0, "cabinet");
      this.box(g, 0.16, 0.045, 11.9, x, 0.455, 0, "chrome");
      for (let z = -5.2; z <= 5.2; z += 1.3) this.screw(g, x, 0.49, z);
    }
    this.box(g, 5.65, 0.52, 0.16, 0, 0.17, -5.85, "cabinet");
    this.box(g, 5.65, 0.05, 0.18, 0, 0.455, -5.85, "chrome");
    // Layered enamel cabinet sides and corner protectors.
    for (const x of [-2.94, 2.94]) {
      this.box(g, 0.055, 0.25, 10.9, x, -0.28, 0, "steel");
      for (const z of [-5.55, 5.55]) this.box(g, 0.12, 0.6, 0.27, x, -0.2, z, "brass");
      for (let z = -2.6; z < 2.8; z += 0.35) this.box(g, 0.065, 0.11, 0.08, x, -0.29, z, "dark");
    }
    // Apron with inset score legends, coin-like workshop emblem and drain mouth.
    this.box(g, 5.45, 0.1, 1.1, 0, 0.13, 5.18, "cabinet");
    this.text(g, "CHAPPY / ORBIT", -1.1, 0.19, 5.1, 2, 0.2);
    this.text(g, "PINBALL WORKSHOP", 1.1, 0.19, 5.1, 1.5, 0.18);
    this.box(g, 0.8, 0.05, 0.35, 0, 0.02, 4.55, "rubber");
    this.flippers = [
      this.flipper(-LOWER_LAYOUT.flipperPivot[0], LOWER_LAYOUT.flipperPivot[2], false),
      this.flipper(LOWER_LAYOUT.flipperPivot[0], LOWER_LAYOUT.flipperPivot[2], true),
    ];
    for (const [i, p] of BUMPERS.entries()) this.bumper(p.x, p.z, i);
    for(const [i,p] of MINI_BUMPERS.entries()) {
      const pocket=new T.Group();pocket.position.set(p.x,0,p.z);pocket.name="mini-pop-"+i;g.add(pocket);
      this.cylinder(pocket,.18,.05,0,.065,0,"chrome");
      this.ring(pocket,.13,.035,0,.18,0,"rubber");
      this.cylinder(pocket,.16,.06,0,.31,0,"purple");
      this.cylinder(pocket,.10,.025,0,.355,0,"jade");
      this.ring(pocket,.11,.012,0,.375,0,"cream");
      this.text(pocket,"✦",0,.38,0,.14,.14,"#f9de63");
    }
    this.text(g,"REACTOR",-1.75,.055,.40,.75,.12,"#c4b4e7");
    buildVisualRamp(this); // Shared physical and rendered route.
    this.robot();
    new WorkshopMechanisms(this).build(g);
    // Shooter walls match the physical straight-segment guide layout.
    this.tube(g,[[2.35,.23,5.5],[2.35,.23,-3.9]],.045,"chrome");
    const roof=[[2.72,.23,4.55],[2.72,.23,-4.15],[2.4,.23,-5.2],[1.25,.23,-5.55],[.95,.23,-5.3]];
    for(let i=0;i<roof.length-1;i++) this.tube(g,[roof[i],roof[i+1]],.06,"chrome");
    const backingShape=new T.Shape();
    SHOOTER_BACKING.forEach(([x,z],i)=>i?backingShape.lineTo(x,-z):backingShape.moveTo(x,-z));
    backingShape.closePath();
    const backingGeometry=new T.ExtrudeGeometry(backingShape,{depth:.59,bevelEnabled:false});
    backingGeometry.rotateX(-Math.PI/2); backingGeometry.translate(0,-.04,0);
    const backingMesh=new T.Mesh(backingGeometry,this.materials.rubber);
    backingMesh.name="shooter-corner-backing"; g.add(backingMesh);
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
    // Fixed guide/stop face agrees with the physical stop at z=4.16.
    // Pull feedback moves only the existing rod and knob, not this collision face.
    this.plungerHead = this.cylinder(g, .12, .08, 2.53, .175, 4.20, "chrome");
    this.plungerHead.rotation.x = Math.PI / 2;
    this.plungerHead.name = "plunger-head";
    const rod = this.cylinder(g, 0.038, 0.95, 2.53, 0.175, 4.7, "brass");
    rod.rotation.x = Math.PI / 2;
    const knob = this.cylinder(g, 0.16, 0.14, 2.53, 0.175, 5.3, "red");
    knob.rotation.x = Math.PI / 2;
    this.plungerRod = rod; this.plungerKnob = knob;
    rod.name = "plunger-rod"; knob.name = "plunger-knob";
    new PlayfieldParts(this).build();

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
    geo.scale((LOWER_LAYOUT.flipperCenter+LOWER_LAYOUT.flipperHalfLength)/1.1, 1, 1);
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
    this.cylinder(g, 0.42, 0.09, 0, 0.48, 0, index === 2 ? "red" : "purple", 0.36);
    this.mesh(new T.SphereGeometry(0.29, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), "jade", g, 0, 0.52, 0);
    this.cylinder(g, 0.2, 0.23, 0, 0.29, 0, "amber");
    for (let i = 0; i < 6; i++) {
      const angle = i * Math.PI / 3;
      this.cylinder(g, 0.022, 0.29, Math.cos(angle) * 0.25, 0.29, Math.sin(angle) * 0.25, "brass");
    }
    this.ring(g, 0.31, 0.018, 0, 0.565, 0, "brass");
    this.cylinder(g, 0.12, 0.035, 0, 0.58, 0, "insert");
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
      for (const texture of o.userData.ownedTextures??[]) textures.add(texture);
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
