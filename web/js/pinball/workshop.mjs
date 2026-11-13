import { WorkshopScenery } from "./scenery-components.mjs";
import { WorkshopMechanisms } from "./mechanisms.mjs";
import { WorkshopFriend } from "./components/workshop-friend.mjs";
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
    const frame=new T.MeshStandardMaterial({color:0x283a31,roughness:.48,metalness:.65});
    const dark=new T.MeshStandardMaterial({color:0x100d0b,roughness:.88});
    const amber=new T.MeshBasicMaterial({color:0x8a6234});
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
    this.inventorBenches(g);
    return g;
  }
  inventorBenches(g) {
    this.scenery = new WorkshopScenery();
    g.add(this.scenery.root);
    new WorkshopFriend(this.a).build(g);
    this.wallMachine(g);
  }
  wallMachine(parent) {
    const a=this.a,machine=new WorkshopMechanisms(a).build(parent);
    machine.name="workshop-wall-machine";
    machine.position.z=-6.5;
    // The cabinet's separate front hatch does not belong to a wall-mounted
    // display. Release only its geometry: all palette materials are borrowed.
    const hatch=machine.getObjectByName("front-service-hatch");
    if(hatch) {
      hatch.traverse(object=>object.geometry?.dispose());
      hatch.removeFromParent();hatch.clear();
    }
    const mounting=new T.Group();mounting.name="wall-machine-mounting-brackets";
    parent.add(mounting);
    // Stand-off channels physically bridge masonry (z=-12.7) to the rear
    // plate (z=-12.1). All lie between the left windows and right tool board.
    for(const x of [-2.3,2.3]) {
      a.box(mounting,.14,2.75,.12,x,1.4,-12.58,"steel");
      for(const y of [.28,2.52]) {
        a.box(mounting,.42,.30,.07,x,y,-12.65,"steel");
        a.box(mounting,.12,.12,.65,x,y,-12.34,"steel");
        for(const dx of [-.14,.14]) {
          const bolt=a.cylinder(mounting,.033,.04,x+dx,y,-12.59,"chrome");
          bolt.rotation.x=Math.PI/2;
        }
      }
    }
    a.batchStaticAssembly(mounting);
    machine.userData.cameraTarget=[0,1.4,-11.8];
    machine.userData.sceneryOnly=true;
  }

}
