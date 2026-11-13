import { WorkshopFriend } from "./components/workshop-friend.mjs";
import { TABLE } from "./layout.mjs";
import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Robobuddy city service terrace: scenery only, never physical game objects. */
export class WorkshopRoom {
  constructor(assets) {
    this.a = assets;
    this.root = new T.Group();
    this.root.name = "workshop-scenery";
  }
  floorPrint() {
    const c=document.createElement("canvas");c.width=c.height=1024;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#10162b";ctx.fillRect(0,0,1024,1024);
    // A broad service-pad composition, not a noisy full-screen repeating grid.
    ctx.strokeStyle="#27344e";ctx.lineWidth=2;
    for(let i=0;i<=16;i++) {
      const v=i*64;ctx.beginPath();ctx.moveTo(v,0);ctx.lineTo(v,1024);ctx.stroke();
      for(let j=0;j<4;j++) {const y=j*256+(i%2)*128;ctx.beginPath();ctx.moveTo(v,y);ctx.lineTo(v+64,y);ctx.stroke();}
    }
    ctx.fillStyle="#14243a";ctx.fillRect(232,100,560,824);
    ctx.strokeStyle="#354f6e";ctx.lineWidth=3;ctx.strokeRect(232,100,560,824);
    // Interrupted amber rail lines and corner indices sit well outside the board.
    ctx.strokeStyle="#355c74";ctx.lineWidth=4;
    for(const x of [210,814]) for(const [a,b] of [[100,300],[355,669],[724,924]]) {
      ctx.beginPath();ctx.moveTo(x,a);ctx.lineTo(x,b);ctx.stroke();
    }
    ctx.strokeStyle="#92834c";ctx.lineWidth=3;
    for(const x of [232,792]) for(const y of [100,924]) {
      const dx=x===232?1:-1,dy=y===100?1:-1;
      ctx.beginPath();ctx.moveTo(x,y+dy*42);ctx.lineTo(x,y);ctx.lineTo(x+dx*42,y);ctx.stroke();
    }
    for(const x of [172,844]) for(let i=0;i<6;i++) {
      const y=760+i*14;ctx.fillStyle=i%2?"#182e46":"#5c5275";
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+16,y-9);ctx.lineTo(x+16,y-1);ctx.lineTo(x,y+8);ctx.fill();
    }
    ctx.fillStyle="#609eaf";ctx.textAlign="center";ctx.font="600 17px monospace";
    ctx.save();ctx.translate(169,465);ctx.rotate(-Math.PI/2);ctx.fillText("ROBOBUDDY / CITY SERVICE DECK",0,0);ctx.restore();
    ctx.fillStyle="#607fa1";ctx.font="12px monospace";ctx.fillText("REPAIR • INVENT • PLAY  /  EST. 01",512,958);
    const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
    return tex;
  }
  build() {
    const a=this.a,g=this.root;
    const frame=new T.MeshStandardMaterial({color:0x30405b,roughness:.48,metalness:.65});
    const dark=new T.MeshStandardMaterial({color:0x101422,roughness:.88});
    const amber=new T.MeshBasicMaterial({color:0xbfa24b});
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
    this.cityTerrace(g);
    this.friend = new WorkshopFriend(this.a);
    this.friend.build(g);
    this.buildFriendStand(g);

  }
  update(dt, events=[], state={}) { this.friend?.update(dt,events,state); }
  resetAnimation() { this.friend?.resetAnimation(); }
  reset() { this.resetAnimation(); }

  buildFriendStand(parent) {
    const a=this.a,g=new T.Group();g.name="chappy-city-balcony";g.position.set(-3.25,-2.34,-5.15);
    g.userData.sceneryOnly=true;this.friendStand=g;parent.add(g);
    // Flanged pedestal and triangulated cantilever support the mascot's landing.
    a.cylinder(g,.38,.12,0,.06,0,"steel");
    a.cylinder(g,.14,2.95,0,1.53,0,"chrome");
    a.cylinder(g,.52,.12,0,3.08,0,"steel");
    a.cylinder(g,.47,.025,0,3.151,0,"rubber");
    for(const side of [-1,1]){
      a.tube(g,[[0,2.35,0],[side*.40,3.04,0]],.045,"brass");
      a.cylinder(g,.04,.025,side*.34,3.18,0,"chrome");
    }
    a.batchStaticAssembly(g);
  }

  cityTerrace(parent) {
    const a=this.a,g=new T.Group();g.name="robobuddy-city-architecture";parent.add(g);
    const blue=new T.MeshStandardMaterial({color:0x14243b,metalness:.55,roughness:.5});
    const purple=new T.MeshStandardMaterial({color:0x29213f,metalness:.45,roughness:.52});
    const silver=new T.MeshStandardMaterial({color:0x5e7893,metalness:.8,roughness:.4});
    const glass=new T.MeshStandardMaterial({color:0x142c43,metalness:.5,roughness:.2});
    const cyan=new T.MeshStandardMaterial({color:0x43b7ce,emissive:0x187a94,emissiveIntensity:.45});
    // Elevated terrace perimeter: paired structural posts, cross braces, cap rail,
    // recessed glass panels. Kept distant from the live table and lower contrast.
    for(const side of [-1,1]){
      for(let i=0;i<7;i++){
        const z=-10+i*2.5;
        a.cylinder(g,.09,1.55,side*7,-1.53,z,silver);
        a.cylinder(g,.19,.08,side*7,-2.27,z,"steel");
        if(i<6){
          a.box(g,.055,.80,2.24,side*7,-1.63,z+1.25,glass);
          a.tube(g,[[side*7,-.76,z],[side*7,-.76,z+2.5]],.045,silver);
          a.tube(g,[[side*7,-2.20,z],[side*7,-1.0,z+2.5]],.025,silver);
        }
      }
    }
    // Purpose-designed skyline: stepped extruded building envelopes with podiums,
    // buttresses, curtain-wall mullions, roof services and bridge connections.
    const sites=[[-8,-12,4.6,1.7],[-5.5,-14,6.0,1.6],[-2.8,-15,4.8,1.4],[.2,-16,7.3,1.8],[3.3,-14.5,5.3,1.5],[6,-13,6.5,1.8],[9,-11,4.8,1.5]];
    for(const [index,[x,z,h,w]] of sites.entries()){
      const group=new T.Group();group.name=`city-tower-assembly-${index}`;group.position.set(x,-2.34,z);g.add(group);
      const shape=new T.Shape();shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,h*.72);shape.lineTo(w*.34,h*.72);shape.lineTo(w*.34,h*.90);shape.lineTo(w*.16,h);shape.lineTo(-w*.28,h);shape.lineTo(-w*.28,h*.84);shape.lineTo(-w/2,h*.84);shape.closePath();
      const geometry=new T.ExtrudeGeometry(shape,{depth:1.25,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2});
      a.mesh(geometry,index%2?purple:blue,group,0,0,-.65);
      a.box(group,w+.25,.22,1.55,0,.11,0,silver);
      for(const sx of [-1,1])a.tube(group,[[sx*(w/2+.08),.22,.63],[sx*w*.42,h*.65,.63]],.065,silver);
      for(let row=0;row<Math.floor(h/.48)-1;row++){
        const y=.5+row*.48;
        a.box(group,w*.73,.025,.035,0,y,.64,silver);
        for(let col=0;col<3;col++)a.box(group,.09,.18,.04,(col-1)*w*.24,y+.15,.66,(row+col+index)%4===0?cyan:glass);
      }
      a.cylinder(group,.07,.42,0,h+.20,0,silver);
      a.cylinder(group,.09,.035,0,h+.42,0,cyan);
      a.box(group,w*.4,.18,.55,0,h+.08,-.1,"steel");
    }
    // Engineered skybridge spanning the two rear districts, not floating blocks.
    a.box(g,11,.14,.65,0,.20,-13.1,blue);
    for(const x of [-5.3,5.3]){
      a.box(g,.18,2.54,.24,x,-1.07,-13.1,silver);
      a.box(g,.52,.12,.55,x,-2.28,-13.1,blue);
      a.tube(g,[[x,-.85,-13.1],[x-Math.sign(x)*.75,.13,-13.1]],.055,silver);
    }
    for(const side of [-1,1]){
      a.tube(g,[[-5.5,.65,-13.1+side*.3],[5.5,.65,-13.1+side*.3]],.04,silver);
      for(let i=0;i<11;i++)a.tube(g,[[-5.5+i,.23,-13.1+side*.3],[-5+i,.65,-13.1+side*.3]],.025,silver);
    }
    g.userData.sceneryOnly=true;g.userData.architecture=['stepped-towers','buttresses','mullions','braced-terrace','skybridge'];
    a.batchStaticAssembly(g);
  }
}
