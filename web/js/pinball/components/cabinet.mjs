import * as T from "../../vendor/three-0.180.0/three.module.min.js";
import { TABLE } from "../layout.mjs";

/** Standalone structural study; NOT production hardware, collider or gameplay.
 * X across, +Z toward player, Y up, board top .04. All dimensions except TABLE
 * bounds are ART ESTIMATES in arbitrary world units, never manufacturer mm.
 * References: supplied mechanical/neon artwork and Stern JAWS manual p47
 * (folded trough, mounting flanges and fastenings, not measured dimensions).
 * Glass/ramp clearance, drain capture and powered shooter transfer UNVERIFIED.
 * Supplied materials are borrowed unchanged and never disposed.
 */
export class MechanicalCabinet {
  constructor({ materials = {}, width = TABLE.width, length = TABLE.length,
    boardThickness = .18, wallThickness = .16, glassFront = 3.20,
    glassRear = 3.20, showGlass = false } = {}) {
    for (const [key,value] of Object.entries({width,length,boardThickness,wallThickness,glassFront,glassRear}))
      if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${key} must be positive and finite`);
    if(width < 4 || length < 8 || boardThickness > .35 || wallThickness > .35 || glassFront < .5 || glassRear < glassFront)
      throw new RangeError('Dimensions outside supported prototype proportions');
    this.parameters = Object.freeze({width,length,boardThickness,wallThickness,glassFront,glassRear,
      estimated:true, units:'table-local world units', boardTop:.04, troughSlope:.08});
    this.root = new T.Group(); this.root.name = 'mechanical-cabinet-prototype';
    this.geometries = new Set(); this.ownedMaterials = new Set(); this.disposed = false;
    this.materials = {};
    for(const [key,alias,settings] of [
      ['wood','wood',{color:0x775033,roughness:.79}],
      ['edge','edge',{color:0xb68c58,roughness:.75}],
      ['enamel','jade',{color:0x234e46,roughness:.42,metalness:.25}],
      ['metal','chrome',{color:0xbac3c1,roughness:.32,metalness:.88}],
      ['brass','brass',{color:0xb68e4e,roughness:.4,metalness:.78}],
      ['dark','dark',{color:0x202824,roughness:.8}],
      ['glass','glass',{color:0xd9e9e3,roughness:.06,transparent:true,opacity:.10,depthWrite:false}]
    ]) {
      const supplied = materials[key] || materials[alias];
      if(supplied && !supplied.isMaterial) throw new TypeError(`materials.${key} must be a Three material`);
      this.materials[key] = supplied || new T.MeshStandardMaterial(settings);
      if(!supplied) this.ownedMaterials.add(this.materials[key]);
    }
    this.build(); this.setGlassVisible(showGlass); this.setInspectionMode('assembled');
    this.root.userData.mechanicalCabinet = {...this.parameters,prototype:true,
      unverified:['glass/ramp clearance','ball capture and drain edges','powered shooter transfer','mount interference']};
  }
  shape(points, Type = T.Shape) {
    const s = new Type(); points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;
  }
  mesh(name,g,material,parent=this.root) {
    this.geometries.add(g); const m = new T.Mesh(g,this.materials[material]);
    m.name=name; m.castShadow=material!=='glass';m.receiveShadow=true;parent.add(m);return m;
  }
  // X/Y profile extruded along +Z, including real L/U sheet sections.
  profile(name,points,depth,material,x=0,y=0,z=0,parent=this.root) {
    const g = new T.ExtrudeGeometry(this.shape(points),{depth,bevelEnabled:false,steps:1});
    const m=this.mesh(name,g,material,parent);m.position.set(x,y,z);return m;
  }
  // World X/Z polygon extruded upward; holes remain open through thickness.
  plate(name,points,y,thickness,material,holes=[],parent=this.root) {
    const s=this.shape(points.map(([x,z])=>[x,-z]));
    for(const hole of holes) s.holes.push(this.shape(hole.map(([x,z])=>[x,-z]),T.Path));
    const g=new T.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:false});
    g.rotateX(-Math.PI/2);g.translate(0,y,0);return this.mesh(name,g,material,parent);
  }
  circle(x,z,r) {return Array.from({length:24},(_,i)=>[x+r*Math.cos(i*Math.PI/12),z+r*Math.sin(i*Math.PI/12)]);}
  screw(name,x,y,z,parent=this.root,shankLength=.10) {
    const washer=this.mesh(`${name}-washer`,new T.TorusGeometry(.040,.008,6,16),'brass',parent);
    washer.rotation.x=Math.PI/2;washer.position.set(x,y,z);
    const head=this.mesh(`${name}-hex-head`,new T.CylinderGeometry(.026,.026,.022,6),'metal',parent);
    head.position.set(x,y+.012,z);
    const shaft=this.mesh(`${name}-shank`,new T.CylinderGeometry(.014,.014,shankLength,12),'metal',parent);
    shaft.position.set(x,y-shankLength/2+.012,z);
  }
  build() {
    const {width:w,length:l,boardThickness:t,wallThickness:wt,glassFront:gf,glassRear:gr}=this.parameters;
    const W=w/2,L=l/2,top=.04,bottom=top-t;
    const rect=(a,b,c,d)=>[[a,b],[c,b],[c,d],[a,d]];
    // Wide drain cutout retains right shooter tongue and narrow front web.
    const drain=rect(-W+.12,L-1.13,W-.45,L-.22);
    this.plate('laminated-playfield-board',rect(-W,-L,W,L),bottom,t,'wood',[drain]);
    this.plate('matte-green-playfield-skin',rect(-W,-L,W,L),top,.004,'enamel',[drain]);
    for(const dy of [.035,.075,.115]) if(dy<t) for(const side of [-1,1])
      this.profile(`ply-edge-${side}-${dy}`,[[0,0],[.003,0],[.003,.009],[0,.009]],l,'edge',side*W,bottom+dy,-L);
    const glassY=z=>gf+(gr-gf)*(L-z)/l;
    const rim=.28; // Body belongs BELOW the playfield, not around the ramps.
    for(const side of [-1,1]) {
      // Profile X maps to world Z, extruded Z maps to -X.
      const panel=this.profile(`cabinet-side-${side}`,[[ -L,-1.40],[L,-1.40],[L,rim],[-L,rim]],wt,'wood');
      panel.rotation.y=-Math.PI/2;panel.position.x=side<0?-W:W+wt;
      const rail=this.profile(`folded-glass-channel-${side}`,[[0,0],[.22,0],[.22,.08],[.20,.08],[.20,.022],[.022,.022],[.022,.105],[0,.105]],l,'metal');
      rail.position.set(side<0?-W-.20:W-.02,rim,-L);
      // Shallow constant-height side rail leaves the playfield visible.
      // Support angles: horizontal leg is UNDER board, upright OUTSIDE board.
      const section=side<0?[[0,0],[.20,0],[.20,.025],[.025,.025],[.025,.22],[0,.22]]:
        [[0,0],[.20,0],[.20,.22],[.175,.22],[.175,.025],[0,.025]];
      this.profile(`board-support-angle-${side}`,section,l-.40,'metal',side<0?-W-.025:W-.175,bottom-.025,-L+.20);
      for(const z of [-L+.40,-L/2,0,L/2,L-.40]) {
        this.screw(`glass-rail-${side}-${z}`,side*(W+.10),rim+.027,z);
        this.screw(`board-edge-${side}-${z}`,side*(W-.09),top+.008,z,this.root,t+.08);
      }
    }
    this.profile('front-lockbar-timber',[[-W-wt,-1.40],[W+wt,-1.40],[W+wt,rim],[-W-wt,rim]],wt,'wood',0,0,L);
    this.profile('rear-bulkhead',[[-W-wt,-1.40],[W+wt,-1.40],[W+wt,rim],[-W-wt,rim]],wt,'wood',0,0,-L-wt);
    // Folded cross rails have a top return and downturned front skirt.
    for(const [name,z,h] of [['front',L+.03,rim],['rear',-L-.12,rim]]) {
      const rail=this.profile(`${name}-folded-cross-rail`,[[0,0],[.15,0],[.15,.045],[.025,.045],[.025,-.11],[0,-.11]],w+.40,'brass');
      rail.rotation.y=Math.PI/2;rail.position.set(-W-.20,h,z+.075);
    }
    this.plate('removable-bottom-panel',rect(-W,-L,W,L),-1.40,.09,'wood');
    for(const x of [-W+.12,W-.12])for(const z of [-L+.20,L-.20]) {
      this.plate(`corner-mount-${x}-${z}`,rect(x-.10,z-.12,x+.10,z+.12),bottom-.07,.045,'metal',[this.circle(x,z,.018)]);
      this.screw(`corner-bolt-${x}-${z}`,x,bottom-.02,z);
      this.profile(`corner-cleat-${x}-${z}`,[[0,0],[.12,0],[.12,.95],[.09,1.05],[0,1.05]],.14,'wood',x-.06,-1.25,z-.07);
    }
    // Formed trough floor + sides + outturned flanges. DOWN toward +X at 8%.
    const trough = new T.Group();trough.name='under-board-sloped-return-trough';this.root.add(trough);
    const start=-W+.08,end=W-.38,run=end-start,z0=L-.66;
    const section=[[-.53,.23],[-.44,.23],[-.44,0],[.44,0],[.44,.23],[.53,.23],[.53,.205],[.465,.205],[.465,-.025],[-.465,-.025],[-.465,.205],[-.53,.205]];
    const tray=this.profile('bent-sheet-trough-with-flanges',section,run,'metal',start,-.55,z0,trough);
    tray.rotation.y=Math.PI/2;this.shear(tray.geometry,(x,y,z)=>y-.08*z);
    // Upstream plate closes the channel; downstream stays open for future kicker.
    const stop=this.profile('trough-upstream-stop',[[-.44,0],[.44,0],[.44,.23],[-.44,.23]],.025,'metal',start,-.55,z0,trough);
    stop.rotation.y=Math.PI/2;
    for(const x of [start+.30,end-.30])for(const dz of [-.49,.49]) {
      const floor=-.55-.08*(x-start),z=z0+dz;
      this.plate(`trough-hanger-foot-${x}-${dz}`,rect(x-.10,z-.08,x+.10,z+.08),floor+.20,.025,'metal',[this.circle(x,z,.018)],trough);
      this.screw(`trough-hanger-bolt-${x}-${dz}`,x,floor+.23,z,trough);
      this.profile(`trough-hanger-web-${x}-${dz}`,[[0,0],[.025,0],[.025,bottom-floor-.20],[0,bottom-floor-.20]],.12,'metal',x-.08,floor+.20,z-.06,trough);
      this.plate(`trough-hanger-top-${x}-${dz}`,rect(x-.10,z-.08,x+.10,z+.08),bottom-.025,.025,'metal',[],trough);
    }
    // Perforated optical strip inspired by p47; no pretend working detector.
    const strip=this.shape(rect(start+.15,-.31,end-.15,-.20));
    for(let x=start+.30;x<end-.20;x+=.40)strip.holes.push(this.shape(this.circle(x,-.255,.025),T.Path));
    const optical=this.mesh('trough-optical-strip-perforated',new T.ExtrudeGeometry(strip,{depth:.025,bevelEnabled:false}),'dark',trough);
    optical.position.z=z0+.48;
    this.shear(optical.geometry,(x,y)=>y-.08*(x-start));
    this.glass=this.plate('removable-protective-glass',rect(-W-.01,-L,W+.01,L),0,.018,'glass');
    this.shear(this.glass.geometry,(x,y,z)=>y+glassY(z)+.025);
    // Separate open-frame cover supports, not opaque cabinet walls. Hidden with
    // the optional glass. Their height clears the existing elevated ramp study;
    // it is an estimated cover assembly, not a claimed real-machine dimension.
    this.coverSupports=new T.Group();this.coverSupports.name='optional-open-cover-supports';this.root.add(this.coverSupports);
    for(const x of [-W-.10,W+.10])for(const z of [-L+.18,L-.18]) {
      const height=glassY(z)-rim;
      const post=this.mesh(`cover-post-${x}-${z}`,new T.CylinderGeometry(.025,.025,height,12),'metal',this.coverSupports);
      post.position.set(x,rim+height/2,z);
      this.plate(`cover-post-foot-${x}-${z}`,rect(x-.065,z-.08,x+.065,z+.08),rim+.025,.025,'brass',[],this.coverSupports);
      this.plate(`cover-glass-rest-${x}-${z}`,rect(x-.12,z-.06,x+.12,z+.06),glassY(z)+.005,.02,'dark',[],this.coverSupports);
    }
    this.root.userData.troughOutlet={x:end,y:-.55-.08*run,z:z0,width:.88,poweredTransferInstalled:false};
    this.root.userData.drainPolygon=drain;
  }
  shear(geometry,height) {
    const p=geometry.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,height(p.getX(i),p.getY(i),p.getZ(i)));
    p.needsUpdate=true;geometry.computeVertexNormals();
  }
  setGlassVisible(visible) {
    if(this.disposed)throw new Error('Cabinet has been disposed');
    this.glass.visible=Boolean(visible);this.coverSupports.visible=Boolean(visible);return this;
  }
  /** Inspection only. Cutaway removes front/right timber and bottom panel.
   * Underside removes bottom panel only; aim the review camera from below.
   * No physical state or other components are modified by these modes. */
  setInspectionMode(mode='assembled') {
    if(this.disposed)throw new Error('Cabinet has been disposed');
    if(!['assembled','cutaway','underside'].includes(mode))throw new RangeError('Unknown inspection mode');
    for(const name of ['removable-bottom-panel','front-lockbar-timber','cabinet-side-1']) {
      const panel=this.root.getObjectByName(name);
      // This visibility boundary must survive rigid geometry batching.
      panel.userData.independentVisibility=true;
      panel.visible=name==='removable-bottom-panel'?mode==='assembled':mode!=='cutaway';
    }
    this.root.userData.inspectionMode=mode;return this;
  }
  dispose() {
    if(this.disposed)return;for(const g of this.geometries)g.dispose();for(const m of this.ownedMaterials)m.dispose();
    this.root.removeFromParent();this.root.clear();this.geometries.clear();this.ownedMaterials.clear();this.disposed=true;
  }
}
