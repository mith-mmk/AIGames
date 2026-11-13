import * as T from "../../vendor/three-0.180.0/three.module.min.js";

/** Animated scenery, never a game mechanism. Dimensions are visual estimates from
 * the two supplied references. The original mascot's transform is preserved.
 * Small metal details are baked by material, so bolts do not cost draw calls. */
export class WorkshopFriend {
  constructor(assets) {
    this.a = assets;
    this.root = new T.Group();
    this.root.name = "chappy-workbench-friend";
    this.batches = new Map();
    this.parts = {};
    this.part("feet", [0,0,0], this.root);
    this.part("body", [0,.40,0], this.root);
    this.part("head", [0,.96,0], this.parts.body);
    this.part("leftArm", [-.40,.78,0], this.parts.body);
    this.part("rightArm", [.40,.78,0], this.parts.body);
    this.activePart = "feet";
    this.resetAnimation();
    this.materials = {
      shell: new T.MeshStandardMaterial({color:0xb7bab3, roughness:.58, metalness:.35}),
      joint: new T.MeshStandardMaterial({color:0x29353c, roughness:.45, metalness:.6}),
      yellow: new T.MeshStandardMaterial({color:0xcaa139, roughness:.5, metalness:.25}),
      metal: new T.MeshStandardMaterial({color:0xa0aeb0, roughness:.3, metalness:.86}),
      rubber: new T.MeshStandardMaterial({color:0x111e23, roughness:.8}),
      copper: new T.MeshStandardMaterial({color:0x986644, roughness:.43, metalness:.7}),
      smile: this.screen(false), heart: this.screen(true),
      lens: new T.MeshStandardMaterial({color:0x98d6d9, transparent:true,
        opacity:.075, roughness:.12, metalness:.15, depthWrite:false}),
    };
  }

  part(name, pivot, parent) {
    const group=new T.Group(); group.name=`chappy-pivot-${name}`;
    group.userData.pivot=pivot;
    const origin=parent.userData.pivot || [0,0,0];
    group.position.set(pivot[0]-origin[0],pivot[1]-origin[1],pivot[2]-origin[2]);
    parent.add(group); this.parts[name]=group;
  }

  outline(w, h, r) {
    const s = new T.Shape(), x=w/2, y=h/2;
    s.moveTo(-x+r,-y); s.lineTo(x-r,-y);
    s.quadraticCurveTo(x,-y,x,-y+r); s.lineTo(x,y-r);
    s.quadraticCurveTo(x,y,x-r,y); s.lineTo(-x+r,y);
    s.quadraticCurveTo(-x,y,-x,y-r); s.lineTo(-x,-y+r);
    s.quadraticCurveTo(-x,-y,-x+r,-y);
    return s;
  }

  add(geo, material, xyz=[0,0,0], rotation=[0,0,0]) {
    const matrix = new T.Matrix4().compose(new T.Vector3(...xyz),
      new T.Quaternion().setFromEuler(new T.Euler(...(rotation || [0,0,0]))), new T.Vector3(1,1,1));
    const flat = geo.index ? geo.toNonIndexed() : geo;
    if (flat !== geo) geo.dispose();
    flat.applyMatrix4(matrix);
    const pivot=this.parts[this.activePart].userData.pivot;
    flat.translate(-pivot[0],-pivot[1],-pivot[2]);
    const key=`${this.activePart}:${material}`;
    if (!this.batches.has(key)) this.batches.set(key, []);
    this.batches.get(key).push(flat);
  }

  plate(w,h,d,r,material,xyz,rotation, opening=null) {
    const shape=this.outline(w,h,r);
    if(opening) shape.holes.push(this.outline(...opening));
    const geo=new T.ExtrudeGeometry(shape,{depth:d, steps:1, curveSegments:4,
      bevelEnabled:true, bevelSegments:2, bevelThickness:.008, bevelSize:.008});
    geo.translate(0,0,-d/2);
    this.add(geo,material,xyz,rotation);
  }

  box(w,h,d,material,xyz,rotation) {
    this.add(new T.BoxGeometry(w,h,d),material,xyz,rotation);
  }

  pin(r,h,material,xyz,axis="z",segments=12) {
    this.add(new T.CylinderGeometry(r,r,h,segments),material,xyz,
      axis === "x" ? [0,0,Math.PI/2] : axis === "z" ? [Math.PI/2,0,0] : [0,0,0]);
  }

  cable(points,r,material) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    this.add(new T.TubeGeometry(curve,16,r,6,false),material);
  }

  bolt(x,y,z,r=.016) {
    this.pin(r,.014,"metal",[x,y,z],"z",8);
    this.box(r*1.2,.004,.003,"joint",[x,y,z+.008],[0,0,.5]);
  }

  screen(heart) {
    const c=document.createElement("canvas"); c.width=256; c.height=128;
    const ctx=c.getContext("2d");
    ctx.fillStyle="#0c202b"; ctx.fillRect(0,0,256,128);
    ctx.strokeStyle="#183741";ctx.lineWidth=1;
    for(let x=0;x<256;x+=8){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,128);ctx.stroke();}
    for(let y=0;y<128;y+=8){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke();}
    ctx.strokeStyle="#70e9ed"; ctx.fillStyle="#70e9ed";
    ctx.lineWidth=9; ctx.lineJoin="round";ctx.lineCap="round";
    if(heart){
      // A drawn heart is independent of the platform's emoji/font rendering.
      ctx.beginPath();ctx.moveTo(128,104);ctx.bezierCurveTo(36,55,80,10,128,47);
      ctx.bezierCurveTo(176,10,220,55,128,104);ctx.fill();
    }else{
      for(const x of [68,184]){ctx.beginPath();ctx.moveTo(x-23,55);ctx.lineTo(x,33);ctx.lineTo(x+23,55);ctx.stroke();}
      ctx.beginPath();ctx.moveTo(91,83);ctx.quadraticCurveTo(128,112,165,83);ctx.stroke();
    }
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;
    return new T.MeshBasicMaterial({map});
  }

  display(w,h,x,y,z,material) {
    const screen=new T.PlaneGeometry(w,h,10,6);
    const position=screen.attributes.position;
    for(let i=0;i<position.count;i++) {
      const px=position.getX(i)/(w/2), py=position.getY(i)/(h/2);
      position.setZ(i,.009*(1-px*px)*(1-py*py));
    }
    screen.computeVertexNormals();
    this.add(screen.clone(),material,[x,y,z]);
    this.add(screen,"lens",[x,y,z+.004]);
  }

  build(parent) {
    if(this.built){parent.add(this.root);return this.root;}
    this.built=true;
    const g=this.root;
    g.position.set(-4.70,-1.34,.05);g.rotation.set(-.35,.16,0);
    // Boot soles, curved toe plates, ankle pivots and exposed link rods.
    for(const side of [-1,1]) {
      const x=side*.22;
      this.plate(.25,.10,.37,.035,"rubber",[x,.065,.08]);
      this.plate(.23,.095,.31,.035,"shell",[x,.12,.10]);
      this.pin(.073,.22,"yellow",[x,.26,0],"y");
      this.pin(.074,.26,"joint",[x,.20,0],"x");
      this.pin(.045,.272,"metal",[x,.20,0],"x");
      this.pin(.034,.14,"metal",[x,.36,0],"y");
      for(let i=0;i<3;i++)this.box(.18,.012,.008,"joint",[x,.12+i*.019,.265]);
    }
    this.activePart="body";
    this.plate(.64,.54,.35,.075,"shell",[0,.60,0]);
    this.plate(.58,.45,.025,.06,"joint",[0,.60,-.19]);
    for(let i=0;i<5;i++)this.box(.29,.014,.017,"rubber",[0,.51+i*.045,-.21]);
    this.plate(.38,.31,.02,.025,"yellow",[.075,.62,.191]);
    this.plate(.34,.27,.02,.02,"joint",[.075,.62,.212]);
    this.display(.30,.23,.075,.62,.227,"heart");
    this.plate(.15,.08,.014,.01,"joint",[-.20,.78,.192]);
    for(const x of [-.24,.24])for(const y of [.40,.82])this.bolt(x,y,.195);
    this.box(.09,.018,.012,"yellow",[-.20,.78,.208]);
    this.pin(.093,.18,"joint",[0,.96,0],"y");
    for(const y of [.91,.95,1])this.pin(.102,.014,"metal",[0,y,0],"y");
    this.cable([[-.15,.85,-.10],[-.19,.98,-.16],[-.15,1.09,-.12]],.018,"copper");
    this.activePart="head";
    // Rear can, equatorial gasket and hollow rounded face rim.
    this.plate(1.00,.57,.39,.10,"shell",[0,1.30,-.015]);
    this.plate(1.015,.58,.018,.10,"joint",[0,1.30,.157]);
    this.plate(1.03,.60,.065,.105,"shell",[0,1.30,.208],null,[.87,.44,.065]);
    this.plate(.88,.45,.016,.06,"rubber",[0,1.30,.203]);
    this.plate(.85,.42,.024,.055,"metal",[0,1.30,.230],null,[.79,.36,.035]);
    this.display(.775,.35,0,1.30,.240,"smile");
    for(const x of [-.46,.46])for(const y of [1.10,1.50])this.bolt(x,y,.251);
    for(let i=0;i<6;i++)this.plate(.45,.018,.012,.006,"joint",[0,1.19+i*.043,-.222]);
    // A riveted repair strip and isolated chips rather than random noise.
    this.plate(.20,.055,.014,.008,"yellow",[.24,1.555,.19],[0,0,-.12]);
    this.bolt(.17,1.56,.207,.010);this.bolt(.31,1.545,.207,.010);
    for(const [x,y,w] of [[-.29,1.05,.11],[.33,1.07,.07],[-.36,1.56,.08]])
      this.box(w,.008,.005,"joint",[x,y,.245],[0,0,.12]);
    for(const side of [-1,1]) {
      const x=side*.53;
      this.pin(.165,.09,"joint",[x,1.30,0],"x",20);
      this.pin(.145,.12,"yellow",[x+side*.035,1.30,0],"x",20);
      this.pin(.094,.135,"metal",[x+side*.04,1.30,0],"x",16);
      this.pin(.069,.14,"joint",[x+side*.045,1.30,0],"x");
      this.pin(.028,.36,"joint",[side*.52,1.72,0],"y");
      this.plate(.07,.15,.07,.018,"yellow",[side*.52,1.94,0]);
      this.pin(.05,.045,"metal",[side*.52,1.56,0],"y");

    }
    for(const side of [-1,1]) {
      this.activePart=side<0?"leftArm":"rightArm";
      this.arm(side);
      if(side<0)this.wrench();
    }
    this.bake();parent.add(g);return g;
  }

  arm(side) {
    const x=side*.40, elbow=side*.54, hand=side*.61;
    this.pin(.115,.15,"joint",[x,.78,0],"x",16);
    this.pin(.074,.17,"yellow",[x,.78,0],"x",16);
    this.plate(.16,.27,.16,.04,"shell",[side*.49,.63,0],[0,0,-side*.32]);
    this.pin(.085,.19,"joint",[elbow,.49,0],"z",16);
    this.pin(.045,.204,"metal",[elbow,.49,0],"z");
    this.plate(.12,.19,.12,.025,"yellow",[side*.58,.46,.08],[.55,0,-side*.3]);
    this.cable([[x,.80,-.08],[side*.56,.68,-.12],[side*.58,.5,-.06]],.018,"copper");
    this.plate(.12,.11,.09,.025,"joint",[hand,.45,.15]);
    // Two opposing articulated fingers genuinely enclose the wrench shaft.
    for(const dx of [-.066,.066]) {
      this.pin(.027,.065,"metal",[hand+dx,.48,.16],"z",8);
      this.plate(.035,.085,.045,.012,"shell",[hand+dx,.49,.20],[0,0,-Math.sign(dx)*.28]);
      this.plate(.06,.034,.045,.010,"metal",[hand+dx*.7,.53,.20]);
    }
  }

  wrench() {
    this.plate(.045,.39,.033,.018,"metal",[-.61,.61,.20]);
    // Open crescent jaws, not a ring: bevelled extruded steel spanner.
    const s=new T.Shape();
    s.moveTo(-.039,-.075);s.lineTo(-.092,-.015);s.lineTo(-.084,.064);
    s.lineTo(-.043,.091);s.lineTo(-.043,.008);s.lineTo(.035,-.003);
    s.lineTo(.051,.079);s.lineTo(.089,.042);s.lineTo(.086,-.026);
    s.lineTo(.035,-.075);s.closePath();
    const geo=new T.ExtrudeGeometry(s,{depth:.028,bevelEnabled:true,
      bevelThickness:.005,bevelSize:.005,bevelSegments:1,steps:1});
    this.add(geo,"metal",[-.61,.845,.183]);
    this.box(.013,.20,.004,"joint",[-.61,.63,.224]);
  }

  bake() {
    for(const [batch,geometries] of this.batches) {
      const [part,key]=batch.split(":");
      const merged=new T.BufferGeometry();
      for(const attr of ["position","normal","uv"]) {
        const size=attr==="uv"?2:3;
        const array=new Float32Array(geometries.reduce((n,g)=>n+g.attributes.position.count*size,0));
        let offset=0;
        for(const geo of geometries) {
          const source=geo.attributes[attr];
          if(source)array.set(source.array,offset);
          offset+=geo.attributes.position.count*size;
        }
        merged.setAttribute(attr,new T.BufferAttribute(array,size));
      }
      merged.computeBoundingSphere();
      const mesh=new T.Mesh(merged,this.materials[key]);mesh.name=`chappy-${part}-${key}`;
      mesh.castShadow=key!=="lens";mesh.receiveShadow=key!=="lens";
      this.parts[part].add(mesh);geometries.forEach(g=>g.dispose());
    }
    this.batches.clear();
  }

  resetAnimation() {
    this.clock=0; this.gesture=null; this.gestureTime=0;
    for(const part of Object.values(this.parts))part.rotation.set(0,0,0);
  }

  /** Seconds, one-shot event names, and presentation-only state. No physics.
   * Accepts either (dt, events[], state) or (dt, {event, playing, paused, ...}). */
  update(dt, events=[], state={}) {
    if(!Array.isArray(events)) {
      const options=events || {};
      state=options;
      events=options.event ? [options.event] : [];
    }
    if(state.reset){this.resetAnimation();return;}
    if(state.paused || state.phase==="paused")return;
    if(state.reducedMotion){this.resetAnimation();return;}
    const step=Number.isFinite(dt)?Math.max(0,Math.min(dt,.05)):0;
    const playing=state.playing ?? (state.phase===undefined || state.phase==="playing");
    if(playing)this.clock+=step;
    // A large celebration cannot be interrupted by a stream of bumper hits.
    const rank={flipper:0,hit:1,launch:2,multiplier:3,mission:4,drain:5,tilt:6,gameover:7};
    for(const event of events) {
      const name=typeof event==="string"?event:event?.type;
      if(rank[name]===undefined)continue;
      if(this.gesture && rank[name]<rank[this.gesture])continue;
      if(this.gesture===name && this.gestureTime<.22)continue;
      this.gesture=name;this.gestureTime=0;
    }
    const body=this.parts.body,head=this.parts.head;
    const left=this.parts.leftArm,right=this.parts.rightArm;
    for(const part of Object.values(this.parts))part.rotation.set(0,0,0);
    if(playing && !state.tilted) {
      head.rotation.y=.055*Math.sin(this.clock*.8);
      head.rotation.x=.018*Math.sin(this.clock*1.7);
      left.rotation.x=.025*Math.sin(this.clock*1.3);
      right.rotation.x=-left.rotation.x;
    }
    if(!this.gesture)return;
    this.gestureTime+=step;
    const duration=this.gesture==="mission"||this.gesture==="multiplier"?1.65:
      this.gesture==="gameover"?1.8:this.gesture==="flipper"?.30:
      this.gesture==="hit"?.50:1.15;
    const progress=Math.min(1,this.gestureTime/duration);
    // Smooth start/end keeps rigid joints continuous without mesh deformation.
    const envelope=Math.sin(Math.PI*progress)**2;
    switch(this.gesture) {
      case "mission": case "multiplier":
        left.rotation.z=-1.05*envelope;
        left.rotation.x=.28*envelope*Math.sin(progress*Math.PI*6);
        right.rotation.z=.4*envelope;
        head.rotation.x-=.18*envelope;
        head.rotation.y+=.16*envelope*Math.sin(progress*Math.PI*4);
        body.rotation.y=.08*envelope;break;
      case "launch":
        left.rotation.z=-.60*envelope;left.rotation.x=-.25*envelope;
        head.rotation.y+=.25*envelope;head.rotation.x+=.12*envelope;break;
      case "hit": case "flipper": {
        const strength=this.gesture==="hit"?1:.3;
        head.rotation.x+=.20*envelope*strength;
        right.rotation.z=.22*envelope*strength;break;
      }
      case "tilt":
        head.rotation.y+=.30*envelope*Math.sin(progress*Math.PI*6);
        right.rotation.z=.65*envelope;body.rotation.z=.06*envelope;break;
      case "drain": case "gameover":
        head.rotation.x+=.28*envelope;head.rotation.z=.08*envelope;
        body.rotation.x=.10*envelope;
        left.rotation.z=-.22*envelope;right.rotation.z=.25*envelope;break;
    }
    if(progress>=1){this.gesture=null;this.gestureTime=0;}
  }

  dispose() {
    this.root.traverse(o=>o.geometry?.dispose());
    for(const material of Object.values(this.materials)){material.map?.dispose();material.dispose();}
    this.root.removeFromParent();
  }
}
