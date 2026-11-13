import * as T from "../vendor/three-0.180.0/three.module.min.js";

/** Static scenery, in room coordinates. Art estimates, never physics bodies.
 * Each material is merged into one draw call; no external materials are owned.
 * Source geometry is released during batching. dispose() is idempotent.
 */
export class WorkshopScenery {
  constructor() {
    this.root = new T.Group(); this.root.name = "assembled-workshop-scenery";
    this.parts = new Map(); this.materials = new Map(); this.disposed = false;
    for (const [key, color, metalness, roughness] of [
      ["wood",0x533727,.05,.85],["endgrain",0x775235,.03,.82],
      ["enamel",0x24463e,.55,.45],["iron",0x253032,.8,.55],
      ["metal",0xa4a69a,.85,.33],["brass",0xa27b3e,.8,.4],
      ["brick",0x47352b,.05,.91],["stone",0x655644,.05,.86],
      ["dark",0x12191a,.25,.8],["glass",0x3c5855,.2,.46],
      ["paper",0xa4936c,0,.96],
    ]) this.materials.set(key,new T.MeshStandardMaterial({color,metalness,roughness}));
    this.materials.set("light",new T.MeshBasicMaterial({color:0xbd8b47}));
    this.architecture();
    for (const side of [-1,1]) this.bench(side);
    this.toolWall(); this.shelves(); this.batch();
    // Semantic camera targets survive batching without adding rendering work.
    for(const [name,position] of [["left-repair-bench",[-4.85,-1.0,-.6]],["right-repair-bench",[4.85,-1.0,-.6]],["arched-window-masonry",[-6.4,1.3,-12.1]],["shaped-tool-board",[5.5,.65,-8.7]],["labeled-parts-shelves",[10,.9,-11.7]]]) {
      const anchor=new T.Group();anchor.name=name;anchor.position.set(...position);anchor.userData.cameraTarget=true;this.root.add(anchor);
    }
    this.root.userData.scenery = {static:true,physics:false,assemblies:["arched-window-masonry","riveted-beams","drawer-cabinets","screw-vises","spring-task-lamps","shaped-tools","parts-jars"]};
  }
  add(geometry, material, position=[0,0,0], rotation=[0,0,0]) {
    const matrix=new T.Matrix4().compose(new T.Vector3(...position),new T.Quaternion().setFromEuler(new T.Euler(...rotation)),new T.Vector3(1,1,1));
    const flat=geometry.index?geometry.toNonIndexed():geometry;
    flat.applyMatrix4(matrix);
    if(flat!==geometry)geometry.dispose();
    if(!this.parts.has(material))this.parts.set(material,[]);
    this.parts.get(material).push(flat);
  }
  box(w,h,d,x,y,z,m="iron",rotation=[0,0,0]) {this.add(new T.BoxGeometry(w,h,d),m,[x,y,z],rotation);}
  rod(a,b,r,m="metal",segments=10) {
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
    const g=new T.CylinderGeometry(r,r,delta.length(),segments);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize()));
    this.add(g,m,start.add(end).multiplyScalar(.5).toArray());
  }
  disc(r,h,x,y,z,m="metal",rotation=[0,0,0]) {this.add(new T.CylinderGeometry(r,r,h,16),m,[x,y,z],rotation);}
  tube(points,r,m="metal") {
    this.add(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),Math.max(12,points.length*4),r,6,false),m);
  }
  ring(r,t,x,y,z,m="metal",rotation=[0,0,0],arc=Math.PI*2) {this.add(new T.TorusGeometry(r,t,6,24,arc),m,[x,y,z],rotation);}
  outline(points,depth,x,y,z,m="metal",rotation=[0,0,0]) {
    const s=new T.Shape();points.forEach(([u,v],i)=>i?s.lineTo(u,v):s.moveTo(u,v));s.closePath();
    this.add(new T.ExtrudeGeometry(s,{depth,bevelEnabled:false,curveSegments:8}),m,[x,y,z],rotation);
  }
  architecture() {
    this.box(32,8,.35,0,1.55,-13,"brick");
    // Mortared courses are shallow individually offset solids, not a flat texture.
    for(let row=0;row<11;row++)for(let col=0;col<22;col++) {
      const x=-15.5+col*1.45+(row%2)*.72,y=-2.1+row*.65;
      if(x>-9.1&&x<-3.8&&y>-.7&&y<4.3)continue;
      this.box(1.39,.59,.10,x,y,-12.78,(row+col)%7===0?"stone":"brick");
    }
    for(const x of [-11,-3,3,10]) {
      this.box(.28,7.8,.38,x,1.5,-12.5,"wood");
      for(const y of [-1,2.7,4.6]) {
        this.box(.48,.30,.06,x,y,-12.27,"iron");
        for(const dx of [-.16,.16])this.disc(.035,.04,x+dx,y,-12.22,"brass",[Math.PI/2,0,0]);
      }
      this.rod([x,3.1,-12.45],[x+.95,4.4,-12.45],.12,"wood",4);
    }
    for(const y of [-1.4,4.5])this.box(30,.3,.34,0,y,-12.48,"wood");
    for(const x of [-7.7,-5.15])this.window(x);
    // A service pipe follows the rear wall; flange collars articulate its joints.
    this.tube([[8,-2,-12.35],[8,3.6,-12.35],[7.8,4,-12.35],[4,4,-12.35]],.095,"brass");
    for(const y of [-1,1,3]) {
      this.disc(.15,.08,8,y,-12.35,"iron");
      this.box(.4,.10,.06,8,y,-12.6,"metal");
    }
  }
  window(x) {
    const z=-12.35,bottom=-.65,spring=2.7,r=1.02;
    const shape=new T.Shape();shape.moveTo(-r,bottom);shape.lineTo(r,bottom);shape.lineTo(r,spring);
    shape.absarc(0,spring,r,0,Math.PI,false);shape.closePath();
    this.add(new T.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:false,curveSegments:18}),"glass",[x,0,z]);
    this.box(2.55,.22,.55,x,bottom-.1,z+.02,"stone");
    for(const side of [-1,1]) {
      this.box(.16,3.5,.28,x+side*1.08,1.03,z+.04,"iron");
      for(let i=0;i<6;i++)this.box(.29,.53,.30,x+side*1.25,-.36+i*.59,z,"stone");
    }
    for(let i=0;i<15;i++) {
      const t=(i+.5)*Math.PI/15;
      this.box(.24,.32,.32,x+Math.cos(t)*1.23,spring+Math.sin(t)*1.23,z,"stone",[0,0,t-Math.PI/2]);
    }
    this.ring(1.07,.07,x,spring,z+.17,"iron",[0,0,0],Math.PI);
    for(const dx of [-.5,0,.5]) {
      const top=spring+Math.sqrt(r*r-dx*dx);
      this.box(.045,top-bottom,.08,x+dx,(top+bottom)/2,z+.15,"iron");
    }
    for(const y of [.2,1.05,1.9,2.7])this.box(2.03,.055,.08,x,y,z+.15,"iron");
    for(const side of [-1,1])this.rod([x,spring,z+.15],[x+side*.74,spring+.74,z+.15],.025,"iron");
  }
  bench(side) {
    const x=side*4.85;
    // Planked top, end-grain breadboards, steel corner guards and four feet.
    for(let i=0;i<5;i++)this.box(.44,.18,4.6,x-.90+i*.45,-1.45,-.6,"wood");
    for(const z of [-2.82,1.62])this.box(2.27,.19,.13,x,-1.45,z,"endgrain");
    for(const dx of [-.99,.99])for(const z of [-2.6,1.4]) {
      this.box(.15,.75,.16,x+dx,-1.94,z,"iron");this.disc(.12,.06,x+dx,-2.29,z,"dark");
      this.box(.19,.08,.3,x+dx,-1.35,z,"metal");
    }
    // Two banks facing the playable table. Narrow reveal gaps surround drawers.
    for(const z of [-1.65,.55]) {
      this.box(1.96,.69,1.91,x,-1.96,z,"dark");
      for(const dz of [-.99,.99])this.box(2,.76,.07,x,-1.94,z+dz,"enamel");
      for(let i=0;i<3;i++) {
        const y=-1.68-i*.23,front=x-side*1.025,open=i===1&&z>.0?.13:0;
        this.box(.085,.205,1.82,front-side*open,y,z,"enamel");
        for(const dz of [-.84,.84])this.box(1.8,.035,.04,x-side*open,y-.08,z+dz,"metal");
        const hx=front-side*(.10+open);
        this.tube([[hx+side*.06,y,z-.24],[hx,y,z-.24],[hx,y,z+.24],[hx+side*.06,y,z+.24]],.025,"brass");
        this.box(.012,.065,.19,front-side*(.045+open),y,z+.56,"brass");
      }
    }
    this.vise(x+side*.64,.92);this.lamp(x+side*.65,-1.95,side);
    // Low repair tray with loose fasteners and a shaped wrench.
    this.box(.72,.025,.50,x,-1.34,.95,"iron");
    for(const dz of [-.25,.25])this.box(.72,.07,.025,x,-1.31,.95+dz,"metal");
    for(let i=0;i<5;i++) {
      const bx=x-.24+i*.11;
      this.rod([bx,-1.30,.89],[bx+.035,-1.30,1.05],.018,"metal");
      this.disc(.035,.03,bx,-1.30,.89,"brass");
    }
    this.wrench(x+.15,-1.325,-.75,.65,[Math.PI/2,0,.35]);
    if(side===1)this.motor(x-.1,-1.29,-.08);
  }
  vise(x,z) {
    this.disc(.25,.08,x,-1.29,z,"iron");
    this.box(.35,.18,.40,x,-1.17,z,"enamel");
    this.box(.20,.11,.73,x,-1.15,z+.15,"metal");
    for(const dz of [-.13,.20]) {
      this.box(.47,.19,.13,x,-1.03,z+dz,"enamel");
      this.box(.49,.065,.035,x,-.95,z+dz+(dz<0?.07:-.07),"metal");
      for(const dx of [-.17,.17])this.disc(.025,.025,x+dx,-.96,z+dz,"brass");
    }
    this.rod([x,-1.13,z-.28],[x,-1.13,z+.66],.045,"metal");
    for(let i=0;i<12;i++)this.ring(.047,.009,x,-1.13,z+.28+i*.027,"dark");
    this.disc(.08,.10,x,-1.13,z+.68,"brass",[Math.PI/2,0,0]);
    this.rod([x-.23,-1.22,z+.73],[x+.23,-1.04,z+.73],.025,"metal");
    for(const s of [-1,1])this.disc(.043,.05,x+s*.23,-1.13+s*.09,z+.73,"brass");
  }
  lamp(x,z,side) {
    this.disc(.24,.055,x,-1.31,z,"iron");this.disc(.15,.06,x,-1.26,z,"enamel");
    const p=[x,-1.22,z],elbow=[x+side*.28,-.38,z],head=[x-side*.26,.14,z];
    for(const dz of [-.065,.065]) {
      this.rod([p[0],p[1],z+dz],[elbow[0],elbow[1],z+dz],.027,"enamel");
      this.rod([elbow[0],elbow[1],z+dz],[head[0],head[1],z+dz],.027,"enamel");
    }
    for(const v of [p,elbow,head])this.disc(.09,.19,...v,"brass",[Math.PI/2,0,0]);
    const coil=[];for(let i=0;i<=70;i++){const t=i/70;coil.push([x+side*(.04+.16*t)+.035*Math.cos(t*Math.PI*20),-1.1+.5*t,z+.10+.035*Math.sin(t*Math.PI*20)]);}this.tube(coil,.009,"metal");
    // Hollow spun reflector, rolled lip and recessed illuminated bulb.
    this.add(new T.CylinderGeometry(.09,.28,.24,20,1,true),"enamel",[head[0],.04,z]);
    this.ring(.28,.018,head[0],-.08,z,"brass",[Math.PI/2,0,0]);
    this.disc(.20,.012,head[0],-.066,z,"light");
    this.tube([[x,-1.28,z],[x+.2,-1.32,z+.2],[x+.35,-1.32,z+.4]],.012,"dark");
  }
  wrench(x,y,z,size=1,rotation=[0,0,0]) {
    // Forked open jaw is an actual concave outline, not a ring on a stick.
    const p=[[-.045,-.4],[.045,-.4],[.045,.15],[.14,.22],[.15,.36],[.08,.40],[.075,.28],[-.045,.25],[-.10,.34],[-.16,.30],[-.13,.17],[-.045,.12]];
    this.outline(p.map(([u,v])=>[u*size,v*size]),.035,x,y,z,"metal",rotation);
  }
  motor(x,y,z) {
    this.box(.63,.05,.45,x,y,z,"iron");
    this.disc(.20,.45,x,y+.23,z,"enamel",[0,0,Math.PI/2]);
    for(const dx of [-.24,.24])this.disc(.22,.045,x+dx,y+.23,z,"metal",[0,0,Math.PI/2]);
    this.rod([x-.4,y+.23,z],[x+.4,y+.23,z],.055,"brass");
    for(let i=0;i<8;i++) {const t=i*Math.PI/4;this.rod([x-.18,y+.23+Math.cos(t)*.20,z+Math.sin(t)*.20],[x+.18,y+.23+Math.cos(t)*.20,z+Math.sin(t)*.20],.018,"iron");}
    this.box(.16,.10,.14,x,y+.46,z,"dark");
  }
  toolWall() {
    const z=-8.9;
    // This is a freestanding tool rack, forward of the masonry. Continuous
    // uprights carry its board and tray down to broad floor-contact feet.
    for(const x of [3.2,7.8]) {
      this.box(.12,4.29,.12,x,-.195,z,"iron");
      this.box(.32,.10,1.10,x,-2.29,z+.12,"iron");
      for(const dz of [-.36,.60])this.box(.34,.04,.20,x,-2.32,z+dz,"dark");
      this.rod([x,-2.22,z+.58],[x,-1.16,z],.04,"iron");
      this.rod([x,-2.22,z-.36],[x,-1.43,z],.04,"iron");
      for(const y of [-.65,1.8])this.disc(.035,.035,x,y,z+.10,"brass",[Math.PI/2,0,0]);
    }
    this.box(4.6,.10,.10,5.5,-2.12,z,"iron");
    this.rod([3.2,-2.10,z-.08],[7.8,-.82,z-.08],.032,"iron");
    this.box(4.6,2.6,.12,5.5,.65,z,"wood");
    for(const x of [3.2,7.8])this.box(.09,2.7,.16,x,.65,z+.04,"iron");
    for(const y of [-.65,1.95])this.box(4.7,.09,.16,5.5,y,z+.04,"iron");
    for(let i=0;i<4;i++) {
      const x=3.65+i*.48;
      this.wrench(x,.85,z+.12,.9+i*.14);
      this.rod([x,1.25,z+.1],[x,1.25,z+.23],.025,"brass");
    }
    // Hammer with a forged claw profile and separate grip.
    this.rod([6.05,.05,z+.16],[6.05,1.2,z+.16],.035,"wood");
    this.outline([[-.25,-.08],[.12,-.08],[.28,-.18],[.34,-.13],[.25,.06],[.05,.10],[-.25,.10]],.10,6.05,1.16,z+.11,"metal");
    // Pliers: overlapping pivoted jaws, opposed curved handles and central pin.
    for(const side of [-1,1]) {
      this.tube([[6.8+side*.18,.12,z+.15],[6.8+side*.13,.48,z+.15],[6.8,.78,z+.15],[6.8+side*.14,1.12,z+.15]],.035,"metal");
      this.tube([[6.8+side*.18,.12,z+.16],[6.8+side*.14,.40,z+.16]],.055,"enamel");
    }
    this.disc(.075,.05,6.8,.78,z+.20,"brass",[Math.PI/2,0,0]);
    this.rod([7.4,.38,z+.16],[7.4,1.25,z+.16],.025,"metal");
    this.disc(.08,.4,7.4,.20,z+.16,"endgrain");
    this.box(4.75,.09,.42,5.5,-.75,z+.15,"wood");
  }
  shelves() {
    for(const y of [-.6,.65,1.9]) {
      this.box(3,.12,.65,10,y,-11.9,"wood");
      for(const x of [8.8,11.2]) {
        this.rod([x,y-.5,-12.45],[x,y-.08,-11.65],.045,"iron");
        this.box(.10,.5,.06,x,y-.25,-12.48,"iron");
      }
      for(let i=0;i<5;i++) {
        const x=8.95+i*.52,h=.36+(i%3)*.10;
        this.disc(.17,h,x,y+.07+h/2,-11.9,i%2?"glass":"enamel");
        this.disc(.18,.055,x,y+.09+h,-11.9,"brass");
        this.box(.18,.12,.015,x,y+.12+h/2,-11.725,"paper");
        for(let j=0;j<3;j++)this.box(.11,.008,.018,x,y+.10+h/2+j*.03,-11.715,"dark");
      }
    }
  }
  batch() {
    let sourceParts=0,triangles=0;
    for(const [key,parts] of this.parts) {
      const count=parts.reduce((n,g)=>n+g.attributes.position.count,0),merged=new T.BufferGeometry();
      for(const name of ["position","normal","uv"]) {
        const size=name==="uv"?2:3,array=new Float32Array(count*size);let offset=0;
        for(const g of parts){array.set(g.attributes[name].array,offset);offset+=g.attributes[name].array.length;}
        merged.setAttribute(name,new T.BufferAttribute(array,size));
      }
      merged.computeBoundingSphere();const mesh=new T.Mesh(merged,this.materials.get(key));
      mesh.name=`workshop-static-${key}`;mesh.castShadow=true;mesh.receiveShadow=true;this.root.add(mesh);
      sourceParts+=parts.length;triangles+=count/3;for(const g of parts)g.dispose();
    }
    this.parts.clear();this.root.userData.budget={sourceParts,drawCalls:this.root.children.length,triangles};
  }
  dispose() {
    if(this.disposed)return;
    this.root.traverse(o=>o.geometry?.dispose());for(const material of this.materials.values())material.dispose();
    this.root.clear();this.root.removeFromParent();this.materials.clear();this.disposed=true;
  }
}
