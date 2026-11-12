import { UPPER_RAMP, LOWER_LAYOUT, TARGET_BANKS } from "./layout.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Visual gameplay hardware. No collision/rule implementation is implied. */
export class PlayfieldParts {
  constructor(assets) { this.a = assets; }
  build() {
    const a = this.a, g = a.root;
    for (const side of [-1, 1]) { this.inlane(side); this.sling(side); }
    // Upper ramp deferred while the base game is validated.
    for (const spec of TARGET_BANKS) {
      const dx=spec.b[0]-spec.a[0], dz=spec.b[2]-spec.a[2], length=Math.hypot(dx,dz);
      const bank = new T.Group();
      bank.position.set((spec.a[0]+spec.b[0])/2,0,(spec.a[2]+spec.b[2])/2);
      bank.rotation.y=-Math.atan2(dz,dx); g.add(bank);
      a.tube(g,[spec.a,spec.b],.07,"rubber");
      for(let i=0;i<spec.count;i++) {
        const x=((i+.5)/spec.count-.5)*length;
        a.cylinder(bank,.035,.24,x,.24,0,"chrome");
        a.roundedBox(bank,length/spec.count*.84,.30,.12,x,.30,0,"brass",.02);
        a.box(bank,length/spec.count*.6,.18,.015,x,.32,.07,"dark");
        a.box(bank,.055,.09,.018,x,.32,.08,"cream");
      }
    }
    // Spinner gate in the central shot opening, deliberately raised above a ball.
    for (const x of [-0.44, 0.44]) {
      a.cylinder(g, 0.035, 0.8, x, 0.4, -1.35, "chrome");
      a.cylinder(g, 0.095, 0.04, x, 0.065, -1.35, "brass");
    }
    a.tube(g, [[-0.44, 0.8, -1.35], [0.44, 0.8, -1.35]], 0.028, "chrome");
    const spinner = new T.Group(); spinner.position.set(0,.36,-1.35); g.add(spinner); a.spinnerPivot=spinner;
    a.roundedBox(spinner, 0.34, 0.3, 0.07, 0, 0, 0, "brass", 0.02);
    a.box(spinner, 0.23, 0.17, 0.025, 0, 0, .045, "dark");
    a.ring(spinner, 0.055, 0.012, 0, 0, .065, "cream").rotation.x = 0;
    for (const x of [-1.875,-.625,.625,1.875]) {
      a.tube(g,[[x,.23,-5.0],[x,.23,-4.1]],.035,"chrome");
      for(const z of [-5.0,-4.1]) a.cylinder(g,.055,.23,x,.12,z,"brass");
    }
    a.laneLamps=[];
    for (const [i,x] of [-1.25,0,1.25].entries()) {
      a.text(g,["A","B","C"][i],x,.08,-4.95,.48,.32);
      a.ring(g,.23,.018,x,.065,-4.4,"brass");
      a.laneLamps.push(a.cylinder(g,.14,.018,x,.055,-4.4,"jade"));
    }
    // Left outlane hardware is visible even while uncharged; no blocking wall.
    a.box(g,.34,.10,.42,-2.30,.10,3.78,"steel");
    a.tube(g,[[-2.30,.13,3.80],[-2.30,.13,3.50]],.06,"chrome");
    a.sideSaveLamp=a.cylinder(g,.09,.018,-2.30,.055,3.32,"dark");
    a.text(g,"SAVE",-2.30,.06,3.08,.34,.13);
    a.text(g,"RAMP",1.45,.06,.85,.65,.22);
    const kicker=a.cylinder(g,.17,.1,0,.11,(LOWER_LAYOUT.centerSaveZ[0]+LOWER_LAYOUT.centerSaveZ[1])/2,"brass");
    kicker.name="center-save-kicker";
    a.text(g,"SAVE",0,.18,4.6,.6,.15);

  }
  inlane(side) {
    const a=this.a,g=a.root;
    const entry=LOWER_LAYOUT.guideEntry[side<0?"left":"right"];
    const points=[[side*entry[0],entry[1],entry[2]],...LOWER_LAYOUT.guide.map(([x,y,z])=>[side*x,y,z])];
    for(let i=0;i<points.length-1;i++) a.tube(g,[points[i],points[i+1]],LOWER_LAYOUT.guideRadius,"chrome");
    for(const [x,y,z] of points.slice(1)) a.cylinder(g,.055,y,x,y/2,z,"brass");
    // Mark the actual playable lanes, not the archived decorative straight bands.
    a.text(g,"IN",side*1.65,.065,2.10,.28,.16,"#a4c4b8");
    for(const [x,z] of [[1.55,2.80],[1.13,3.20]]) a.text(g,"▼",side*x,.065,z,.18,.18,"#91b6a7");
    const outerX=side<0?-2.30:2.10;
    a.text(g,"OUT",outerX,.065,2.60,.28,.16,"#c7ae74");
    a.text(g,"▼",outerX,.065,2.94,.18,.18,"#c7ae74");
  }
  sling(side) {
    const a = this.a, g = new T.Group(); a.root.add(g);
    const vertices = LOWER_LAYOUT.slingVertices.map(([x, z]) => [side * x, z]);
    const outline = new T.CatmullRomCurve3([...vertices, vertices[0]].map(([x,z]) => new T.Vector3(x,.22,z))).getPoints(16);
    const shape = new T.Shape();
    outline.forEach(({x,z}, i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z)); shape.closePath();
    const geo = new T.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2, steps: 1 }); geo.rotateX(-Math.PI / 2);
    a.mesh(geo, "steel", g, 0, 0.43, 0);
    // Match the physical 16-segment rubber perimeter, including its height.
    const ring = outline.map(p => p.toArray());
    a.tube(g, ring, 0.07, "rubber");
    a.tube(g, ring.map(([x, , z]) => [x, 0.48, z]), 0.022, "brass");
    for (const [x, z] of vertices) {
      a.cylinder(g, 0.075, 0.35, x, 0.24, z, "brass");
      a.cylinder(g, 0.03, 0.2, x, 0.22, z, "chrome");
      a.screw(g, x, 0.55, z);
    }
    a.cylinder(g, 0.14, 0.3, side * LOWER_LAYOUT.slingCenter[0], 0.24, LOWER_LAYOUT.slingCenter[1], "amber");
    a.ring(g, 0.16, 0.025, side * LOWER_LAYOUT.slingCenter[0], 0.52, LOWER_LAYOUT.slingCenter[1], "brass");
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
