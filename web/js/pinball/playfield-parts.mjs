import { MechanicalSling, MechanicalTarget } from "./components/sling-target.mjs";
import { LOWER_LAYOUT, TARGET_BANKS, lowerLanePaths } from "./layout.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Visual gameplay hardware. No collision/rule implementation is implied. */
export class PlayfieldParts {
  constructor(assets) { this.a = assets; }
  build() {
    const a = this.a, g = a.root;
    for (const side of [-1, 1]) { this.inlane(side); this.sling(side); }
    // Stand-up banks preserve existing hit IDs and mission rules.
    for (const spec of TARGET_BANKS) {
      const dx=spec.b[0]-spec.a[0], dz=spec.b[2]-spec.a[2], length=Math.hypot(dx,dz);
      const bank = new T.Group();
      bank.position.set((spec.a[0]+spec.b[0])/2,0,(spec.a[2]+spec.b[2])/2);
      bank.rotation.y=-Math.atan2(dz,dx); g.add(bank);
      for(let i=0;i<spec.count;i++) {
        const part=new MechanicalTarget({materials:spec.a[0]<0?{...a.materials,red:a.materials.flipperRubber}:a.materials,width:length/spec.count*.84,height:.30,depth:.085});
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
    a.roundedBox(g,.22,.10,.42,-2.10,.10,3.78,"steel",.035);
    a.tube(g,[[-2.10,.13,3.80],[-2.10,.13,3.50]],.06,"chrome");
    a.sideSaveLamp=a.cylinder(g,.09,.018,-2.10,.055,3.32,"dark");
    a.text(g,"SAVE",-2.10,.06,3.08,.34,.13);
    a.text(g,"RAMP",1.45,.06,.85,.65,.22);
    const kicker=a.cylinder(g,.17,.1,0,.11,(LOWER_LAYOUT.centerSaveZ[0]+LOWER_LAYOUT.centerSaveZ[1])/2,"brass");
    kicker.name="center-save-kicker";
    a.text(g,"SAVE",0,.18,4.6,.6,.15);

  }
  inlane(side) {
    const a=this.a,g=a.root;
    const paths=lowerLanePaths(side);
    for(const path of paths) {
      for(let i=0;i<path.length-1;i++) {
        const tube=a.tube(g,[path[i],path[i+1]],LOWER_LAYOUT.guideRadius,"chrome");
        tube.name="shared-lower-lane-contact-rail";
      }
      for(const [x,y,z] of path) {
        a.cylinder(g,.055,.025,x,.062,z,"chrome");
        a.cylinder(g,.027,y-.07,x,(y+.07)/2,z,"steel");
        a.cylinder(g,.065,.025,x,y,z,"brass");
      }
    }
    const [sx,,sz]=LOWER_LAYOUT.inlaneSensor;
    a.roundedBox(g,.25,.012,.08,side*sx,.055,sz,"insert",.02);
    this.laneInsert(side*1.64,2.43,"IN",0x72eaff);
    this.laneInsert(side*2.12,2.55,"OUT",0xffc93d);
  }
  laneInsert(x,z,label,color) {
    // Flat printed lane direction inset, not another obstacle or illuminated ball.
    const c=document.createElement("canvas");c.width=256;c.height=640;
    const ctx=c.getContext("2d"),ink=`#${color.toString(16).padStart(6,"0")}`;
    ctx.fillStyle="#07121d";ctx.fillRect(0,0,256,640);
    ctx.strokeStyle=ink;ctx.lineWidth=9;ctx.strokeRect(5,5,246,630);
    ctx.fillStyle=ink;ctx.textAlign="center";ctx.font="bold 100px sans-serif";
    ctx.fillText(label,128,325);ctx.font="bold 75px sans-serif";ctx.fillText("LANE",128,425);
    ctx.beginPath();ctx.moveTo(128,100);ctx.lineTo(55,195);ctx.lineTo(128,160);ctx.lineTo(201,195);ctx.closePath();ctx.fill();
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    const mesh=new T.Mesh(new T.PlaneGeometry(.29,.78),new T.MeshBasicMaterial({map:texture}));
    mesh.name=`${label.toLowerCase()}-lane-printed-insert`;mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.048,z);this.a.root.add(mesh);
  }
  sling(side) {
    const a=this.a,center=[side*LOWER_LAYOUT.slingCenter[0],LOWER_LAYOUT.slingCenter[1]];
    const points=LOWER_LAYOUT.slingVertices.map(([x,z])=>[side*x-center[0],z-center[1]]);
    const part=new MechanicalSling({materials:{...a.materials,jade:a.materials.chrome,rubber:a.materials.flipperRubber},points,rubberHeight:.22,coverHeight:.43});
    part.root.position.set(center[0],0,center[1]);part.root.userData.hitKey=`s${side}`;
    a.root.add(part.root);a.mechanical.slings.set(`s${side}`,part);
  }
}
