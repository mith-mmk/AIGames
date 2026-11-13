import { MechanicalSling, MechanicalTarget } from "./components/sling-target.mjs";
import { LOWER_LAYOUT, TARGET_BANKS } from "./layout.mjs";
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
      for(let i=0;i<spec.count;i++) {
        const part=new MechanicalTarget({materials:a.materials,width:length/spec.count*.84,height:.30,depth:.085});
        part.root.position.x=((i+.5)/spec.count-.5)*length;part.root.userData.targetId=`${spec.key}:${i}`;
        bank.add(part.root);a.mechanical.targets.set(`${spec.key}:${i}`,part);
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
    // Flush rollover strip is registered to the scoring sensor in each inlane.
    a.box(g,.25,.012,.08,side*1.60,.055,2.85,"insert");
    a.text(g,"IN",side*1.60,.065,2.66,.25,.12,"#f5e546");
    // Mark the actual playable lanes, not the archived decorative straight bands.
    a.text(g,"IN",side*1.65,.065,2.10,.28,.16,"#d9d447");
    for(const [x,z] of [[1.55,2.80],[1.13,3.20]]) a.text(g,"▼",side*x,.065,z,.18,.18,"#f5e546");
    const outerX=side<0?-2.30:2.10;
    a.text(g,"OUT",outerX,.065,2.60,.28,.16,"#f5e546");
    a.text(g,"▼",outerX,.065,2.94,.18,.18,"#f5e546");
  }
  sling(side) {
    const a=this.a,center=[side*LOWER_LAYOUT.slingCenter[0],LOWER_LAYOUT.slingCenter[1]];
    const points=LOWER_LAYOUT.slingVertices.map(([x,z])=>[side*x-center[0],z-center[1]]);
    const part=new MechanicalSling({materials:a.materials,points,rubberHeight:.22,coverHeight:.43});
    part.root.position.set(center[0],0,center[1]);part.root.userData.hitKey=`s${side}`;
    a.root.add(part.root);a.mechanical.slings.set(`s${side}`,part);
  }
}
