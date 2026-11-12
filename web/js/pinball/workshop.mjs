import { TABLE } from "./layout.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Static hangar scenery, outside/below the cabinet; never physical game objects. */
export class WorkshopRoom {
  constructor(assets) {
    this.a = assets;
    this.root = new T.Group();
    this.root.name = "workshop-scenery";
  }
  floorPrint() {
    const c=document.createElement("canvas");c.width=c.height=1024;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#07101c";ctx.fillRect(0,0,1024,1024);
    // A broad service-pad composition, not a noisy full-screen repeating grid.
    ctx.strokeStyle="#142738";ctx.lineWidth=2;
    for(let i=0;i<=8;i++) {
      const v=i*128;ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,1024);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,v);ctx.lineTo(1024,v);ctx.stroke();
    }
    ctx.fillStyle="#0b1826";ctx.fillRect(232,100,560,824);
    ctx.strokeStyle="#294152";ctx.lineWidth=3;ctx.strokeRect(232,100,560,824);
    // Interrupted amber rail lines and corner indices sit well outside the board.
    ctx.strokeStyle="#675436";ctx.lineWidth=4;
    for(const x of [210,814]) for(const [a,b] of [[100,300],[355,669],[724,924]]) {
      ctx.beginPath();ctx.moveTo(x,a);ctx.lineTo(x,b);ctx.stroke();
    }
    ctx.strokeStyle="#586574";ctx.lineWidth=3;
    for(const x of [232,792]) for(const y of [100,924]) {
      const dx=x===232?1:-1,dy=y===100?1:-1;
      ctx.beginPath();ctx.moveTo(x,y+dy*42);ctx.lineTo(x,y);ctx.lineTo(x+dx*42,y);ctx.stroke();
    }
    for(const x of [172,844]) for(let i=0;i<6;i++) {
      const y=760+i*14;ctx.fillStyle=i%2?"#142635":"#52462e";
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+16,y-9);ctx.lineTo(x+16,y-1);ctx.lineTo(x,y+8);ctx.fill();
    }
    ctx.fillStyle="#526475";ctx.textAlign="center";ctx.font="600 17px monospace";
    ctx.save();ctx.translate(169,465);ctx.rotate(-Math.PI/2);ctx.fillText("ORBIT / SERVICE BAY 01",0,0);ctx.restore();
    ctx.fillStyle="#394e60";ctx.font="12px monospace";ctx.fillText("CHAPPY INDUSTRIES  /  PINBALL DIVISION",512,958);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
    return tex;
  }
  build() {
    const a=this.a,g=this.root;
    const steel=new T.MeshStandardMaterial({color:0x0d1a29,roughness:.76,metalness:.35});
    const frame=new T.MeshStandardMaterial({color:0x1b2c3c,roughness:.48,metalness:.65});
    const dark=new T.MeshStandardMaterial({color:0x060c14,roughness:.88});
    const amber=new T.MeshBasicMaterial({color:0x8a6234});
    const cool=new T.MeshBasicMaterial({color:0x2c5065});
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
    return g;
  }
}
