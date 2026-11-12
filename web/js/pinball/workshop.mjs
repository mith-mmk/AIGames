import { WorkshopMechanisms } from "./mechanisms.mjs";
import { TABLE } from "./layout.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Chappy's inventor workshop: scenery only, never physical game objects. */
export class WorkshopRoom {
  constructor(assets) {
    this.a = assets;
    this.root = new T.Group();
    this.root.name = "workshop-scenery";
  }
  floorPrint() {
    const c=document.createElement("canvas");c.width=c.height=1024;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#17120f";ctx.fillRect(0,0,1024,1024);
    // A broad service-pad composition, not a noisy full-screen repeating grid.
    ctx.strokeStyle="#30241b";ctx.lineWidth=2;
    for(let i=0;i<=16;i++) {
      const v=i*64;ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,1024);ctx.stroke();
      for(let j=0;j<4;j++) {const y=j*256+(i%2)*128;ctx.beginPath();ctx.moveTo(v,y);ctx.lineTo(v+64,y);ctx.stroke();}
    }
    ctx.fillStyle="#10201d";ctx.fillRect(232,100,560,824);
    ctx.strokeStyle="#4a4932";ctx.lineWidth=3;ctx.strokeRect(232,100,560,824);
    // Interrupted amber rail lines and corner indices sit well outside the board.
    ctx.strokeStyle="#675436";ctx.lineWidth=4;
    for(const x of [210,814]) for(const [a,b] of [[100,300],[355,669],[724,924]]) {
      ctx.beginPath();ctx.moveTo(x,a);ctx.lineTo(x,b);ctx.stroke();
    }
    ctx.strokeStyle="#746446";ctx.lineWidth=3;
    for(const x of [232,792]) for(const y of [100,924]) {
      const dx=x===232?1:-1,dy=y===100?1:-1;
      ctx.beginPath();ctx.moveTo(x,y+dy*42);ctx.lineTo(x,y);ctx.lineTo(x+dx*42,y);ctx.stroke();
    }
    for(const x of [172,844]) for(let i=0;i<6;i++) {
      const y=760+i*14;ctx.fillStyle=i%2?"#253327":"#52462e";
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+16,y-9);ctx.lineTo(x+16,y-1);ctx.lineTo(x,y+8);ctx.fill();
    }
    ctx.fillStyle="#8f7750";ctx.textAlign="center";ctx.font="600 17px monospace";
    ctx.save();ctx.translate(169,465);ctx.rotate(-Math.PI/2);ctx.fillText("CHAPPY’S / INVENTOR WORKSHOP",0,0);ctx.restore();
    ctx.fillStyle="#68563e";ctx.font="12px monospace";ctx.fillText("REPAIR • INVENT • PLAY  /  EST. 01",512,958);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
    return tex;
  }
  build() {
    const a=this.a,g=this.root;
    const steel=new T.MeshStandardMaterial({color:0x221d18,roughness:.76,metalness:.35});
    const frame=new T.MeshStandardMaterial({color:0x283a31,roughness:.48,metalness:.65});
    const dark=new T.MeshStandardMaterial({color:0x100d0b,roughness:.88});
    const amber=new T.MeshBasicMaterial({color:0x8a6234});
    const cool=new T.MeshBasicMaterial({color:0x765b35});
    // Table legs remain under the cabinet, with no poles beside the ball lanes.
    for(const x of [-2.1,2.1]) for(const z of [-4.7,4.7]) {
      const top=-.58*Math.cos(TABLE.tilt)-z*Math.sin(TABLE.tilt);
      const worldZ=z*Math.cos(TABLE.tilt)-.58*Math.sin(TABLE.tilt), bottom=-2.26;
      a.box(g,.16,top-bottom,.20,x,(top+bottom)/2,worldZ,frame);
      a.cylinder(g,.20,.08,x,-2.29,worldZ,dark);
    }
    const pad=a.mesh(new T.PlaneGeometry(18,22),new T.MeshStandardMaterial({map:this.floorPrint(),roughness:.92,metalness:.08}),g,0,-2.34,0);
    pad.rotation.x=-Math.PI/2;pad.castShadow=false;
    // Recessed service trenches give parallax at low viewing angles. Every
    // object near the table is lower than the cabinet, including these ribs.
    for(const side of [-1,1]) {
      a.box(g,.48,.035,13,side*5.15,-2.31,0,dark);
      for(let i=0;i<20;i++) a.box(g,.39,.025,.065,side*5.15,-2.285,-6.1+i*.64,frame);
      for(const z of [-5.5,0,5.5]) a.box(g,.035,.018,.85,side*4.57,-2.30,z,amber);
    }
    // Rear architecture stays beyond the playfield. Wide, low-contrast panels
    // supply depth without a luminous window or workshop tools hiding the ball.
    a.box(g,32,8,.35,0,1.55,-13,steel);
    for(const x of [-12,-8,-4,0,4,8,12]) {
      a.box(g,.15,7.5,.24,x,1.5,-12.73,frame);
      a.box(g,3.65,.06,.07,x+2,.2,-12.77,dark);
    }
    a.box(g,11,5.9,.1,0,.7,-12.72,dark);
    for(const x of [-5.5,5.5]) {
      a.box(g,.13,5.9,.12,x,.7,-12.58,frame);
      a.box(g,.035,2.8,.025,x,.7,-12.50,cool);
    }
    a.box(g,11,.12,.12,0,3.65,-12.58,frame);
    for(const x of [-8,8]) {
      a.box(g,2.4,.14,.18,x,3.6,-12.48,dark);
      a.box(g,1.7,.035,.03,x,3.58,-12.37,amber);
    }
    this.inventorBenches(g);
    return g;
  }
  inventorBenches(g) {
    const a=this.a;
    const wood=new T.MeshStandardMaterial({color:0x493022,roughness:.8});
    const green=new T.MeshStandardMaterial({color:0x123b31,roughness:.38,metalness:.35});
    const copper=new T.MeshStandardMaterial({color:0x93562d,roughness:.4,metalness:.65});
    const brass=new T.MeshStandardMaterial({color:0xb38b43,roughness:.35,metalness:.65});
    const glow=new T.MeshBasicMaterial({color:0xf1bd64});
    // Benches and mascot are beyond the cabinet's entire x extent at every view.
    // Their tops are below the playfield so only intentional side dressing shows.
    for(const side of [-1,1]) {
      const x=side*4.85;
      a.box(g,2.25,.18,4.6,x,-1.45,-.6,wood);
      a.box(g,2.1,.75,4.2,x,-1.94,-.6,green);
      for(let i=0;i<3;i++) {
        a.box(g,.02,.20,.95,x-side*1.06,-1.72-i*.22,-.4,wood);
        a.box(g,.06,.04,.34,x-side*1.09,-1.71-i*.22,-.4,brass);
      }
      // Workbench edges, vice and a warm task lamp, all outside ball sightlines.
      a.box(g,2.26,.045,.045,x,-1.34,1.68,brass);
      a.box(g,.36,.2,.38,x+side*.65,-1.23,.9,green);
      a.box(g,.48,.09,.13,x+side*.65,-1.08,.9,copper);
      a.cylinder(g,.21,.05,x+side*.65,-1.31,-1.7,brass);
      a.tube(g,[[x+side*.65,-1.28,-1.7],[x+side*.65,.5,-1.7],[x+side*.15,.75,-1.7]],.035,copper);
      a.cylinder(g,.24,.23,x+side*.15,.64,-1.7,green,.35);
      a.cylinder(g,.27,.018,x+side*.15,.51,-1.7,glow);
    }
    // The original reference has a worn pale shell and a cyan smiling screen,
    // rather than the later brass automaton's round mechanical eyes.
    this.screenFaceFriend(g);
    const mechanisms=new WorkshopMechanisms(a);
    // Disassembled gears and copper boiler: a recognisable tinkering story,
    // rather than extra game mechanisms implying new collision rules.
    for(const [x,z,r] of [[4.42,.12,.54],[5.18,.51,.34],[4.78,-.73,.42]]) {
      const gear=mechanisms.gear(g,r,16,x,-1.29,z);gear.rotation.x=-Math.PI/2;
      gear.traverse(o=>{if(o.material===a.materials.brass)o.material=brass;});
    }
    a.cylinder(g,.27,.75,5.5,-.94,-1.45,copper);
    for(const y of [-1.29,-.59]) a.ring(g,.29,.035,5.5,y,-1.45,brass);
    a.tube(g,[[5.5,-.57,-1.45],[5.5,-.30,-1.45],[5.15,-.30,-1.45],[5.15,-1.28,-1.45]],.045,copper);
    a.box(g,1.35,.025,.80,4.8,-1.32,1.15,green);
    a.text(g,"BUILD · HACK",4.8,-1.30,.99,1.15,.15,"#e6c370");
    a.text(g,"PLAY · REPEAT",4.8,-1.30,1.27,1.15,.15,"#a8d9d7");
    // A modest rear tool board and warm framed windows echo the source image.
    a.box(g,4.6,2.6,.12,5.5,.65,-8.9,wood);
    for(let i=0;i<6;i++) {
      const x=3.75+i*.68;
      a.box(g,.055,.60,.06,x,.65,-8.78,brass);
      a.ring(g,.105,.028,x,1.02,-8.76,"chrome").rotation.x=0;
      a.box(g,.12,.22,.07,x,.29,-8.77,green);
    }
    for(const x of [-7.8,-5.4]) {
      a.box(g,2.1,3.2,.12,x,1.1,-12.4,wood);
      a.box(g,1.85,2.95,.025,x,1.1,-12.31,new T.MeshBasicMaterial({color:0x4d625b}));
      for(const dx of [-.92,0,.92]) a.box(g,.07,3,.04,x+dx,1.1,-12.27,green);
      for(const y of [.15,1.1,2.05]) a.box(g,1.9,.06,.04,x,y,-12.27,green);
    }
  }
  screenFaceFriend(parent) {
    const a=this.a,g=new T.Group();g.name="chappy-workbench-friend";
    g.position.set(-4.70,-1.34,.05);g.rotation.x=-.35;g.rotation.y=.16;parent.add(g);
    const shell=new T.MeshStandardMaterial({color:0xb7bab3,roughness:.58,metalness:.35});
    const joint=new T.MeshStandardMaterial({color:0x29353c,roughness:.45,metalness:.6});
    const yellow=new T.MeshStandardMaterial({color:0xcaa139,roughness:.5,metalness:.25});
    const screen=(heart=false)=>{
      const c=document.createElement("canvas");c.width=256;c.height=128;const ctx=c.getContext("2d");
      ctx.fillStyle="#0c202b";ctx.fillRect(0,0,256,128);
      ctx.strokeStyle="#183741";ctx.lineWidth=1;
      for(let x=0;x<256;x+=8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,128);ctx.stroke();}
      for(let y=0;y<128;y+=8){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
      ctx.strokeStyle="#70e9ed";ctx.lineWidth=9;ctx.lineJoin="round";
      if(heart){ctx.fillStyle="#70e9ed";ctx.font="bold 96px sans-serif";ctx.textAlign="center";ctx.fillText("♥",128,99);}
      else {
        for(const x of [68,184]){ctx.beginPath();ctx.moveTo(x-23,55);ctx.lineTo(x,33);ctx.lineTo(x+23,55);ctx.stroke();}
        ctx.beginPath();ctx.moveTo(91,83);ctx.lineTo(128,99);ctx.lineTo(165,83);ctx.stroke();
      }
      const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;
      return new T.MeshBasicMaterial({map:tex});
    };
    for(const side of [-1,1]) {
      a.roundedBox(g,.24,.14,.38,side*.22,.08,.08,joint);
      a.cylinder(g,.075,.26,side*.22,.24,0,yellow);
    }
    a.roundedBox(g,.67,.57,.39,0,.59,0,shell,.05);
    a.mesh(new T.PlaneGeometry(.32,.25),screen(true),g,.08,.62,.205);
    a.box(g,.12,.035,.02,-.20,.77,.207,yellow);
    a.cylinder(g,.10,.17,0,.96,0,joint);
    a.roundedBox(g,1.03,.60,.47,0,1.30,0,shell,.07);
    a.box(g,.85,.43,.025,0,1.30,.253,joint);
    a.mesh(new T.PlaneGeometry(.77,.35),screen(),g,0,1.30,.27);
    for(const x of [-.52,.52]) {
      const ear=a.cylinder(g,.16,.13,x,1.30,0,yellow);ear.rotation.z=Math.PI/2;
      a.cylinder(g,.028,.36,x,1.72,0,joint);
      a.box(g,.07,.15,.07,x,1.94,0,yellow);
    }
    for(const side of [-1,1]) {
      const arm=new T.Group();arm.position.set(side*.42,.77,0);arm.rotation.z=side*.32;g.add(arm);
      a.mesh(new T.SphereGeometry(.12,12,8),joint,arm);
      a.box(arm,.16,.35,.17,side*.06,-.24,0,shell);
      a.mesh(new T.SphereGeometry(.105,12,8),yellow,arm,side*.1,-.44,0);
    }
    // Small wrench in one hand tells the DIY story without a tall silhouette.
    a.box(g,.045,.41,.05,-.61,.57,.08,joint);
    const wrench=a.ring(g,.09,.025,-.61,.81,.08,"chrome");wrench.rotation.x=0;
    // Sparse seams/scuffs make the shell read as a repaired friendly machine.
    a.box(g,.16,.012,.012,.28,1.54,.239,joint);
    a.box(g,.13,.012,.012,-.27,1.08,.239,joint);
  }

}
