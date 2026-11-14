import {shooterOuterRailGeometry} from './shooter-outer-rail.mjs';
import { MechanicalFlipper } from "./components/flipper.mjs";
import { MechanicalBumper } from "./components/bumper.mjs";
import { MechanicalPlunger } from "./components/plunger.mjs";
import { MechanicalCabinet } from "./components/cabinet.mjs";
import { MechanicalRamp } from "./components/ramp-wire.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { drawReferencePlayfield, REFERENCE_ART_LANDMARKS } from "./reference-playfield.mjs";
import { PlayfieldParts } from "./playfield-parts.mjs";
import { WorkshopMechanisms } from "./mechanisms.mjs";
import { TABLE, SHOOTER_LAYOUT, BUMPERS, MINI_BUMPERS, flipperAngle, LOWER_LAYOUT, SHOOTER_BACKING } from "./layout.mjs";
export class WorkshopAssets {
  constructor() {
    this.root = new T.Group();
    this.root.name = "workshop-table";
    this.mechanical = { flippers: [], bumpers: new Map(), slings: new Map(), targets: new Map() };
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
        roughness: 0.23,
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
    this.materials.flipperRubber = new T.MeshStandardMaterial({color:0xf8c625,roughness:.7});
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
    // A two-point rail is exactly straight: axial subdivisions add no
    // silhouette or normal detail. Preserve curved rails and radial resolution.
    const segments = points.length === 2 ? 1 : 100;
    return this.mesh(new T.TubeGeometry(curve, segments, r, 8, false), mat, parent);
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
    drawReferencePlayfield(ctx, {width:c.width, height:c.height});
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    // Match the structural board opening rather than sealing it with artwork.
    const outline=new T.Shape();
    outline.moveTo(-TABLE.width/2,-TABLE.frontZ);outline.lineTo(TABLE.width/2,-TABLE.frontZ);outline.lineTo(TABLE.width/2,-TABLE.rearZ);outline.lineTo(-TABLE.width/2,-TABLE.rearZ);outline.closePath();
    const hole=new T.Path();
    this.mechanical.cabinet.root.userData.drainPolygon.forEach(([x,z],i)=>i?hole.lineTo(x,-z-TABLE.centerZ):hole.moveTo(x,-z-TABLE.centerZ));
    hole.closePath();outline.holes.push(hole);
    const geometry=new T.ShapeGeometry(outline),pos=geometry.attributes.position,uv=geometry.attributes.uv;
    // Preserve original art registration; the added apron-edge strip clamps
    // to the existing border ink instead of stretching every gameplay landmark.
    for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+2.75)/5.5,(pos.getY(i)+5.75)/11.5);
    const surface=this.mesh(geometry,new T.MeshStandardMaterial({map:texture,roughness:.30,metalness:.1}),this.root,0,.045,0);
    surface.name="registered-playfield-print-with-open-drain";
    surface.rotation.x=-Math.PI/2;
  }
  build() {
    const g = this.root;
    this.mechanical.cabinet=new MechanicalCabinet({materials:this.materials});
    this.mechanical.cabinet.root.position.z=TABLE.centerZ;g.add(this.mechanical.cabinet.root);
    this.printedPlayfield();
    // Five flush mission indicators align with the lower printed M1–M5 bank.
    // The original raised rings would obscure the reference's large robot art.
    this.missionLamps=[];
    for(let i=0;i<5;i++) {
      const x=(i-2)*REFERENCE_ART_LANDMARKS.missionIndicatorSpacing,z=REFERENCE_ART_LANDMARKS.missionIndicatorsZ;
      this.roundedBox(g,.23,.004,.10,x,.046,z,"dark",.015);
      this.missionLamps.push(this.roundedBox(g,.17,.003,.055,x,.049,z,"insert",.014));
    }
    for(const mirror of [false,true]) {
      const component=new MechanicalFlipper({materials:{...this.materials,rubber:this.materials.flipperRubber,cream:this.materials.chrome},angle:flipperAngle(mirror,false)});
      component.root.position.set((mirror?1:-1)*LOWER_LAYOUT.flipperPivot[0],LOWER_LAYOUT.flipperPivot[1],LOWER_LAYOUT.flipperPivot[2]);
      component.moving.userData.mirror=mirror;g.add(component.root);this.mechanical.flippers.push(component);
    }
    this.flippers=this.mechanical.flippers.map(c=>c.moving);
    for(const [points,radius,prefix] of [[BUMPERS,.40,"b"],[MINI_BUMPERS,.16,"mini"]])for(const [i,p] of points.entries()) {
      const component=new MechanicalBumper({materials:{...this.materials,bumperEnamel:this.materials.chrome,bumperPlastic:this.materials.brass},radius});
      component.root.position.set(p.x,0,p.z);component.root.userData.hitKey=prefix+i;
      g.add(component.root);this.mechanical.bumpers.set(prefix+i,component);
    }
    this.text(g,"POWER",-1.75,.055,.40,.75,.12,"#edc34f");
    this.mechanical.ramp=new MechanicalRamp({materials:this.materials});
    g.add(this.mechanical.ramp.root);
    this.robot();
    new WorkshopMechanisms(this).build(g);
    // Shooter walls match the physical straight-segment guide layout.
    this.tube(g,[[2.35,.23,SHOOTER_LAYOUT.frontZ],[2.35,.23,-3.9]],.045,"chrome");
    const outerRail=this.mesh(shooterOuterRailGeometry(),"chrome",g);outerRail.name='shooter-outer-rail';
    const roof=[[2.72,.23,-4.15],[2.4,.23,-5.2],[1.25,.23,-5.55],[.95,.23,-5.3]];
    for(let i=0;i<roof.length-1;i++) this.tube(g,[roof[i],roof[i+1]],.06,"chrome");
    const backingShape=new T.Shape();
    SHOOTER_BACKING.forEach(([x,z],i)=>i?backingShape.lineTo(x,-z):backingShape.moveTo(x,-z));
    backingShape.closePath();
    const backingGeometry=new T.ExtrudeGeometry(backingShape,{depth:.59,bevelEnabled:false});
    backingGeometry.rotateX(-Math.PI/2); backingGeometry.translate(0,-.04,0);
    const backingMesh=new T.Mesh(backingGeometry,this.materials.rubber);
    backingMesh.name="shooter-corner-backing"; g.add(backingMesh);
    this.mechanical.plunger=new MechanicalPlunger({materials:this.materials});
    this.mechanical.plunger.root.position.set(SHOOTER_LAYOUT.x,.175,SHOOTER_LAYOUT.restZ);g.add(this.mechanical.plunger.root);
    this.plungerHead=this.mechanical.plunger.head;this.plungerRod=this.mechanical.plunger.moving;this.plungerKnob=this.mechanical.plunger.knob;
    new PlayfieldParts(this).build();
    this.batchStaticAssembly(this.mechanical.cabinet.root,new Set(),this.mechanical.cabinet.geometries);
    this.batchStaticAssembly(this.mechanical.ramp.root,new Set(),this.mechanical.ramp.geometries);
    for(const component of [...this.mechanical.flippers,...this.mechanical.bumpers.values(),
      ...this.mechanical.slings.values(),...this.mechanical.targets.values(),this.mechanical.plunger]) {
      // A controller-owned mesh is an identity boundary: its transform,
      // geometry or material may be updated. Groups remain independent frames.
      const excluded=new Set(Object.values(component).filter(value=>value?.isMesh));
      this.batchStaticAssembly(component.root,excluded,component.geometries);
    }

    return g;
  }
  updateMechanics(dt,hits=[],{flipperAngles,pullPower}={}) {
    const m=this.mechanical;
    if(flipperAngles)m.flippers.forEach((part,i)=>part.setAngle(flipperAngles[i]));
    if(Number.isFinite(pullPower))m.plunger.setPull(pullPower);
    for(const hit of hits) {
      const bumper=m.bumpers.get(hit.key);
      if(bumper&&(!hit.type||hit.type==="bumper"))bumper.hit(hit.direction);
      if(hit.type==="sling")m.slings.get(hit.key)?.hit();
      if(hit.type==="bank"||hit.type==="target")m.targets.get(hit.targetId??hit.key)?.hit();
    }
    for(const collection of [m.bumpers,m.slings,m.targets])for(const part of collection.values())part.update(dt);
    if(!Number.isFinite(pullPower))m.plunger.update(dt);
  }
  resetMechanics() {
    const m=this.mechanical;
    m.flippers.forEach((part,i)=>part.setAngle(flipperAngle(i===1,false)));
    for(const part of m.bumpers.values()){part.elapsed=Infinity;part.update(0);}
    for(const collection of [m.slings,m.targets])for(const part of collection.values()){part.time=10;part.strength=0;part.update(0);}
    m.plunger.setPull(0);
  }
  batchStaticAssembly(root,excluded=new Set(),ownedGeometries=null) {
    // Keep visibility/inspection boundaries and exclude moving assemblies.
    for(const child of [...root.children])if(child.isGroup)this.batchStaticAssembly(child,excluded,ownedGeometries);
    const batches=new Map();
    for(const child of root.children) {
      if(child.userData.independentVisibility||excluded.has(child)||child.children.length||!child.isMesh||child.isInstancedMesh||Array.isArray(child.material)||child.material.transparent)continue;
      const list=batches.get(child.material)??[];list.push(child);batches.set(child.material,list);
    }
    for(const [material,meshes] of batches) {
      if(meshes.length<2)continue;
      const positions=[],normals=[],uvs=[],names=[];
      for(const mesh of meshes) {
        mesh.updateMatrix();const g=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();g.applyMatrix4(mesh.matrix);
        const p=g.attributes.position,n=g.attributes.normal,u=g.attributes.uv;
        for(let i=0;i<p.count;i++){positions.push(p.getX(i),p.getY(i),p.getZ(i));normals.push(n?.getX(i)??0,n?.getY(i)??1,n?.getZ(i)??0);uvs.push(u?.getX(i)??0,u?.getY(i)??0);}
        g.dispose();names.push(mesh.name);root.remove(mesh);ownedGeometries?.delete(mesh.geometry);mesh.geometry.dispose();
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));geometry.setAttribute("normal",new T.Float32BufferAttribute(normals,3));geometry.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));
      ownedGeometries?.add(geometry);
      const mesh=new T.Mesh(geometry,material);mesh.name="rigid-assembly-batch";mesh.userData.sourceParts=names;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);
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
