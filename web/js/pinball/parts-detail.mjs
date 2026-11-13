import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { BUMPERS, MINI_BUMPERS, LOWER_LAYOUT, TARGET_BANKS } from "./layout.mjs";

/** Manufactured surface detail only. No collision or scoring data. */
export class WorkshopPartsDetail {
  constructor(assets) {
    this.a = assets;
    this.batches = new Map();
    this.transform = new T.Object3D();
  }
  // Bake small fittings into one mesh per material/parent. Moving parts retain
  // their original pivots; static hardware shares the table's local frame.
  add(parent, material, geometry, x = 0, y = 0, z = 0, rotation = [0,0,0]) {
    this.transform.position.set(x,y,z);
    this.transform.rotation.set(...rotation);
    this.transform.updateMatrix();
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    flat.applyMatrix4(this.transform.matrix);
    let materials = this.batches.get(parent);
    if (!materials) { materials = new Map(); this.batches.set(parent,materials); }
    let pieces = materials.get(material);
    if (!pieces) { pieces = []; materials.set(material,pieces); }
    pieces.push(flat);
    if (flat !== geometry) geometry.dispose();
  }
  cylinder(parent, material, r, h, x, y, z, bottom = r, segments = 24) {
    this.add(parent,material,new T.CylinderGeometry(r,bottom,h,segments),x,y,z);
  }
  ring(parent, material, radius, tube, x, y, z, vertical = false) {
    this.add(parent,material,new T.TorusGeometry(radius,tube,6,32),x,y,z,[vertical ? 0 : Math.PI/2,0,0]);
  }
  box(parent, material, w, h, d, x, y, z, rotation = [0,0,0]) {
    this.add(parent,material,new T.BoxGeometry(w,h,d),x,y,z,rotation);
  }
  bolt(parent,x,y,z,radius = .023) {
    this.cylinder(parent,"chrome",radius,.012,x,y,z,radius,6);
    this.box(parent,"dark",radius*1.15,.003,radius*.22,x,y+.007,z);
  }
  plate(parent,material,points,y,depth = .012,bevel = .008) {
    const shape = new T.Shape();
    points.forEach(([x,z],i) => i ? shape.lineTo(x,-z) : shape.moveTo(x,-z));
    shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape,{
      depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,
      bevelSegments:2,steps:1,curveSegments:8,
    });
    geometry.rotateX(-Math.PI/2);
    this.add(parent,material,geometry,0,y,0);
  }
  bumpers() {
    const root = this.a.root;
    for (const [i,p] of BUMPERS.entries()) {
      const group = root.getObjectByName(`bumper-${i}`);
      // A low enamel lens reveals the original cap fittings previously hidden
      // by the hemisphere. Radius, rubber contact and coil position stay put.
      for (const child of group.children) {
        if (child.geometry?.type === "SphereGeometry") child.scale.y = .15;
      }
      this.ring(root,"chrome",.395,.014,p.x,.526,p.z);
      this.ring(root,"dark",.267,.012,p.x,.565,p.z);
      this.ring(root,"brass",.221,.014,p.x,.569,p.z);
      this.cylinder(root,"dark",.155,.012,p.x,.568,p.z);
      this.ring(root,"chrome",.394,.01,p.x,.132,p.z);
      for (let k = 0; k < 12; k++) {
        const angle = k*Math.PI/6;
        this.box(root,"brass",.035,.014,.026,p.x+Math.cos(angle)*.34,.532,p.z+Math.sin(angle)*.34,[0,-angle,0]);
        if (k%3 === 0) this.bolt(root,p.x+Math.cos(angle)*.39,.14,p.z+Math.sin(angle)*.39,.021);
      }
      for (let k = 0; k < 8; k++) {
        const angle = k*Math.PI/4;
        this.box(root,"dark",.023,.17,.023,p.x+Math.cos(angle)*.253,.30,p.z+Math.sin(angle)*.253);
      }
    }
    for (const p of MINI_BUMPERS) {
      this.cylinder(root,"brass",.112,.09,p.x,.235,p.z);
      this.ring(root,"brass",.148,.009,p.x,.342,p.z);
      this.ring(root,"dark",.079,.008,p.x,.373,p.z);
      for (let k = 0; k < 3; k++) {
        const angle = k*Math.PI*2/3;
        this.bolt(root,p.x+Math.cos(angle)*.132,.35,p.z+Math.sin(angle)*.132,.012);
      }
    }
  }
  flippers() {
    for (const pivot of this.a.flippers) {
      // Keep the original identity label readable above the new shell, using
      // its existing canvas/texture rather than allocating another decal.
      const label = pivot.children.find(child => child.geometry?.type === "PlaneGeometry");
      if (label) {
        label.position.y = .255;
        const canvas = label.material.map.image, ctx = canvas.getContext("2d");
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "#ffefda";
        ctx.fillText("CHAPPY",256,64);
        label.material.map.needsUpdate = true;
      }
      this.plate(pivot,"brass",[[.14,-.086],[.76,-.055],[.90,0],[.76,.055],[.14,.086]],.206);
      this.plate(pivot,"jade",[[.19,-.059],[.74,-.037],[.83,0],[.74,.037],[.19,.059]],.224,.007,.004);
      this.ring(pivot,"dark",.117,.013,0,.204,0);
      this.ring(pivot,"brass",.092,.014,0,.219,0);
      this.cylinder(pivot,"steel",.064,.02,0,.225,0,.072);
      this.bolt(pivot,0,.241,0,.025);
      this.bolt(pivot,.80,.238,0,.018);
      for (let k = 0; k < 3; k++) this.box(pivot,"brass",.024,.008,.075,.25+k*.07,.239,0,[0,.35,0]);
    }
  }
  banksAndSlings() {
    const root = this.a.root;
    for (const spec of TARGET_BANKS) {
      const dx = spec.b[0]-spec.a[0], dz = spec.b[2]-spec.a[2];
      const length = Math.hypot(dx,dz), angle = -Math.atan2(dz,dx);
      const middleX = (spec.a[0]+spec.b[0])/2, middleZ = (spec.a[2]+spec.b[2])/2;
      // Brackets remain inside the standing targets' existing .12 depth.
      this.box(root,"brass",length*.96,.022,.095,middleX,.15,middleZ,[0,angle,0]);
      for (let i = 0; i < spec.count; i++) {
        const t = (i+.5)/spec.count, x = spec.a[0]+dx*t, z = spec.a[2]+dz*t;
        this.box(root,"brass",length/spec.count*.80,.024,.11,x,.451,z,[0,angle,0]);
        this.bolt(root,x,.47,z,.016);
      }
    }
    for (const side of [-1,1]) {
      const vertices = LOWER_LAYOUT.slingVertices.map(([x,z]) => [side*x,z]);
      const cx = vertices.reduce((sum,p) => sum+p[0],0)/3;
      const cz = vertices.reduce((sum,p) => sum+p[1],0)/3;
      const inset = scale => vertices.map(([x,z]) => [cx+(x-cx)*scale,cz+(z-cz)*scale]);
      this.plate(root,"brass",inset(.79),.514,.008,.006);
      this.plate(root,"jade",inset(.59),.532,.006,.004);
      for (const [x,z] of inset(.72)) this.bolt(root,x,.548,z,.015);
      for (const [x,z] of vertices) this.ring(root,"dark",.066,.009,x,.34,z);
    }
  }
  plunger() {
    const root = this.a.root;
    // Fixed ferrules behind contact head, never across the ball rest.
    for (const z of [4.245,4.98]) this.ring(root,"brass",.105,.016,2.53,.175,z,true);
    // Knob already rotates onto Z; use its local cylinder frame.
    const knob = this.a.plungerKnob;
    for (const y of [-.055,.055]) this.ring(knob,"brass",.148,.009,0,y,0);
    for (let k = 0; k < 16; k++) {
      const angle = k*Math.PI/8;
      this.box(knob,"dark",.012,.09,.01,Math.cos(angle)*.153,0,Math.sin(angle)*.153,[0,-angle,0]);
    }
    this.cylinder(knob,"brass",.112,.012,0,.076,0);
    this.cylinder(knob,"dark",.074,.014,0,.085,0);
  }
  flush() {
    let triangles = 0, meshes = 0;
    for (const [parent,materials] of this.batches) {
      for (const [material,pieces] of materials) {
        const geometry = new T.BufferGeometry();
        for (const key of ["position","normal","uv"]) {
          const arrays = pieces.map(piece => piece.getAttribute(key).array);
          const joined = new Float32Array(arrays.reduce((n,array) => n+array.length,0));
          let offset = 0;
          for (const array of arrays) { joined.set(array,offset); offset += array.length; }
          geometry.setAttribute(key,new T.BufferAttribute(joined,key === "uv" ? 2 : 3));
        }
        geometry.computeBoundingSphere();
        const mesh = new T.Mesh(geometry,this.a.materials[material]);
        mesh.name = `machined-detail-${material}`;
        mesh.receiveShadow = true;
        // Fine fittings do not warrant an additional shadow-map draw pass.
        parent.add(mesh);
        triangles += geometry.getAttribute("position").count/3;
        meshes++;
        for (const piece of pieces) piece.dispose();
      }
    }
    this.a.root.userData.partsDetail = { meshes,triangles };
    this.batches.clear();
  }
  build() {
    this.bumpers();
    this.flippers();
    this.banksAndSlings();
    this.plunger();
    this.flush();
  }
}
