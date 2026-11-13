import * as T from '../../vendor/three-0.180.0/three.module.min.js';

/** Reference-inspired cabinet dressing. Dimensions are art estimates.
 * Tower hardware is supported on an elevated exterior shoulder; it is not a collider. */
export class ReferenceCabinetDress {
  constructor(cabinet) {
    this.cabinet=cabinet;
    this.root=new T.Group();this.root.name='robobuddy-reference-cabinet';cabinet.root.add(this.root);
    this.textures=new Set();this.lastDisplay='';
    const material=(name,opts)=>{const m=new T.MeshStandardMaterial(opts);cabinet.materials[name]=m;cabinet.ownedMaterials.add(m);return m;};
    material('ref-black',{color:0x101723,roughness:.36,metalness:.5});
    material('ref-silver',{color:0xa7b7ca,roughness:.3,metalness:.86});
    material('ref-blue',{color:0x172e4c,roughness:.4,metalness:.5});
    material('ref-yellow',{color:0xffcb22,roughness:.32,metalness:.22});
    material('ref-cyan',{color:0x69efff,emissive:0x09cfee,emissiveIntensity:1.4,roughness:.25});
    material('ref-amber',{color:0xffbd24,emissive:0xff7100,emissiveIntensity:1.5});
    material('ref-red',{color:0xf44628,emissive:0xf02200,emissiveIntensity:1.1,transparent:true,opacity:.85});
    this.buildBackglass();this.buildApron();this.buildTower();
  }
  rounded(name,w,h,d,x,y,z,key,r=.06,parent=this.root) {
    const s=new T.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    const g=new T.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2,curveSegments:8});g.translate(0,0,-d/2);
    const m=this.cabinet.mesh(name,g,key,parent);m.position.set(x,y,z);return m;
  }
  tube(name,pts,r,key,parent=this.root) {
    return this.cabinet.mesh(name,new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(...p))),32,r,8,false),key,parent);
  }
  frontBolt(name,x,y,z,parent=this.root) {
    const m=this.cabinet.mesh(name,new T.CylinderGeometry(.025,.025,.025,6),'ref-silver',parent);m.rotation.x=Math.PI/2;m.position.set(x,y,z);
  }
  canvas(w,h) {if(typeof document==='undefined')return null;const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
  panel(name,c,w,h,x,y,z,parent=this.root) {
    const texture=c?new T.CanvasTexture(c):null;if(texture){texture.colorSpace=T.SRGBColorSpace;this.textures.add(texture);}
    const mat=new T.MeshBasicMaterial({color:texture?0xffffff:0x12283a,map:texture,toneMapped:false});this.cabinet.ownedMaterials.add(mat);
    const geo=new T.PlaneGeometry(w,h);this.cabinet.geometries.add(geo);const mesh=new T.Mesh(geo,mat);mesh.name=name;mesh.position.set(x,y,z);parent.add(mesh);return {mesh,texture};
  }
  buildBackglass() {
    const W=this.cabinet.parameters.width,L=this.cabinet.parameters.length/2;
    const frame=new T.Group();frame.name='reference-backglass-frame';frame.position.set(0,1.9,-L-.43);this.root.add(frame);
    // Rounded case, distinct steel bezel, dark insert and a separately framed display.
    this.rounded('backglass-steel-case',W+.35,2.05,.34,0,0,0,'ref-silver',.12,frame);
    this.rounded('backglass-black-bezel',W+.15,1.88,.09,0,0,.20,'ref-black',.09,frame);
    this.rounded('backglass-inset',W-1.15,1.66,.04,0,.02,.26,'ref-blue',.06,frame);
    const art=this.canvas(1200,500);
    if(art){const c=art.getContext('2d');const grad=c.createLinearGradient(0,0,1200,500);grad.addColorStop(0,'#10192d');grad.addColorStop(.6,'#11465b');grad.addColorStop(1,'#08151f');c.fillStyle=grad;c.fillRect(0,0,1200,500);
      for(let i=0;i<24;i++){const x=i*53,h=40+(i*73)%160;c.fillStyle=i%2?'#0c2639':'#102f49';c.fillRect(x,450-h,42,h);c.fillStyle='#22bacd';for(let j=0;j<3;j++)c.fillRect(x+8,460-h+j*24,5,9);}
      c.textAlign='center';c.fillStyle='#eef8ff';c.font='bold 100px sans-serif';c.fillText('ROBOBUDDY',600,120);c.fillStyle='#45eaff';c.font='bold 38px sans-serif';c.fillText('P I N B A L L',600,175);
      c.fillStyle='#ffcf24';for(let i=-60;i<1200;i+=140){c.beginPath();c.moveTo(i,450);c.lineTo(i+70,450);c.lineTo(i+20,500);c.lineTo(i-50,500);c.closePath();c.fill();}}
    this.panel('backglass-city-title',art,W-1.22,1.62,0,.02,.32,frame);
    this.rounded('score-display-metal-rim',3.34,.63,.06,0,-.35,.33,'ref-silver',.045,frame);
    this.rounded('score-display-recess',3.23,.52,.035,0,-.35,.37,'ref-black',.025,frame);
    this.scoreCanvas=this.canvas(960,168);const screen=this.panel('live-score-display',this.scoreCanvas,3.16,.49,0,-.35,.425,frame);this.scoreTexture=screen.texture;
    for(const side of [-1,1]){
      const x=side*(W/2-.30);
      this.rounded(`speaker-housing-${side}`,.62,1.56,.13,x,0,.31,'ref-silver',.09,frame);
      this.rounded(`speaker-inset-${side}`,.53,1.44,.04,x,0,.40,'ref-black',.07,frame);
      const surround=this.cabinet.mesh(`speaker-rubber-surround-${side}`,new T.TorusGeometry(.235,.035,10,40),'dark',frame);surround.position.set(x,.22,.46);
      const cone=this.cabinet.mesh(`speaker-concave-cone-${side}`,new T.LatheGeometry([new T.Vector2(.02,-.055),new T.Vector2(.075,-.03),new T.Vector2(.12,-.04),new T.Vector2(.20,0),new T.Vector2(.22,.012)],40),'ref-black',frame);cone.rotation.x=Math.PI/2;cone.position.set(x,.22,.45);
      for(let j=0;j<9;j++){const yy=-.19+j*.047;const half=Math.sqrt(Math.max(0,.20*.20-yy*yy));this.tube(`speaker-grille-${side}-${j}`,[[x-half,.22+yy,.49],[x+half,.22+yy,.49]],.006,'ref-silver',frame);}
      for(let j=0;j<3;j++)this.rounded(`speaker-cyan-vent-${side}-${j}`,.36,.035,.018,x,-.28-j*.09,.46,'ref-cyan',.012,frame);
      for(const dx of [-.22,.22])for(const yy of [-.64,.64])this.frontBolt(`speaker-fastener-${side}-${dx}-${yy}`,x+dx,yy,.46,frame);
      this.rounded(`backglass-amber-strip-${side}`,.035,1.61,.025,side*(W/2+.06),0,.31,'ref-amber',.01,frame);
      // Columns attach the raised case to the rear cabinet, rather than floating.
      this.rounded(`backbox-support-column-${side}`,.18,1.25,.25,side*(W/2-.19),-1.28,-.07,'ref-black',.025,frame);
      this.rounded(`backbox-support-foot-${side}`,.38,.09,.40,side*(W/2-.19),-1.85,-.02,'ref-silver',.025,frame);
      this.rounded(`backbox-rear-bracket-${side}`,.28,.10,.78,side*(W/2-.19),-1.84,.15,'ref-silver',.02,frame);
      this.tube(`backbox-bracket-brace-${side}`,[[side*(W/2-.19),-2.55,.36],[side*(W/2-.19),-1.88,-.18]],.045,'ref-black',frame);
    }
    for(const x of [-W/2+.08,0,W/2-.08])for(const y of [-.89,.89])this.frontBolt(`case-fastener-${x}-${y}`,x,y,.27,frame);
    this.updateSnapshot({score:0,ballNumber:1});
  }
  buildApron(){
    const W=this.cabinet.parameters.width/2,L=this.cabinet.parameters.length/2;
    // Formed service apron covers the collection well only AFTER the gameplay drain.
    // The two outer outlets (x ±2.1) and tapered centre throat remain visibly open.
    const assembly=new T.Group();assembly.name='formed-collection-apron';
    // Local apron geometry uses the default 11.5-unit cabinet datum. Translate
    // with the front edge so every supported length retains the drain offsets.
    assembly.position.z=L-5.75;this.root.add(assembly);
    for(const side of [-1,1]){
      const points=[[.58,5.05],[1.83,4.78],[1.83,5.46],[.34,5.46],[.34,5.24]];
      const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(side*x,-z):shape.moveTo(side*x,-z));shape.closePath();
      const geo=new T.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:true,bevelSize:.012,bevelThickness:.008,bevelSegments:2});geo.rotateX(-Math.PI/2);
      const pos=geo.attributes.position;for(let i=0;i<pos.count;i++)pos.setY(i,pos.getY(i)+.055+(pos.getZ(i)-4.90)*.17);geo.computeVertexNormals();
      this.cabinet.mesh(`formed-apron-wing-${side}`,geo,'ref-silver',assembly);
      // Folded front flange, stamped service access panel, ventilation slots and fasteners.
      this.rounded(`apron-folded-front-${side}`,1.48,.16,.035,side*1.085,.07,5.45,'ref-blue',.018,assembly);
      // Wide uninterrupted brushed panel with a dark inset, not a small vent patch.
      const inset=this.rounded(`apron-service-panel-${side}`,1.03,.27,.018,side*1.15,.135,5.22,'ref-blue',.035,assembly);inset.rotation.x=-Math.PI/2+.17;
      this.tube(`apron-bright-leading-fold-${side}`,[[side*.58,.125,5.05],[side*1.20,.08,4.92],[side*1.82,.04,4.79]],.028,'ref-silver',assembly);
      for(const x of [.79,1.70])for(const z of [4.98,5.36]){
        const y=.102+(z-4.90)*.17;this.cabinet.screw(`collection-apron-bolt-${side}-${x}-${z}`,side*x,y,z,assembly);
        this.rounded(`collection-apron-standoff-${side}-${x}-${z}`,.07,.27,.07,side*x,-.06,z,'ref-black',.01,assembly);
      }
      this.tube(`drain-throat-rolled-edge-${side}`,[[side*1.82,.065,4.80],[side*.58,.13,5.05],[side*.38,.16,5.25],[side*.34,.18,5.45]],.024,'ref-yellow',assembly);
    }
    // Recessed collection basket below the deck, AFTER the gameplay drain.
    // Its visible gold grille is lower than the open throat, never a deck bridge.
    const grille=new T.Group();grille.name='recessed-arched-drain-grille';assembly.add(grille);
    const ring=this.cabinet.mesh('drain-gold-arched-rim',new T.TorusGeometry(.30,.028,8,48),'brass',grille);ring.rotation.x=-Math.PI/2;ring.position.set(0,-.18,5.06);
    for(let i=-3;i<=3;i++){
      const x=i*.075,reach=Math.sqrt(.28*.28-x*x);
      this.tube(`drain-gold-grille-bar-${i}`,[[x,-.22,5.06-reach],[x,-.22,5.06+reach]],.016,'ref-amber',grille);
    }
    for(const side of [-1,1])this.rounded(`drain-basket-mount-${side}`,.09,.18,.12,side*.30,-.30,5.06,'ref-silver',.015,grille);
    assembly.userData.visualOnly=true;
    assembly.userData.openThroats={center:[[0,4.90],[0,5.45]],outlaneX:[-2.1,2.1]};
    const apron=this.rounded('front-hazard-apron',W*2-.38,.34,.06,-.12,.09,L-.15,'ref-silver',.04);apron.rotation.x=-Math.PI/2;
    const c=this.canvas(1200,100);if(c){const ctx=c.getContext('2d');ctx.fillStyle='#111c29';ctx.fillRect(0,0,1200,100);ctx.fillStyle='#f6bf20';for(let x=-100;x<1300;x+=160){ctx.beginPath();ctx.moveTo(x,100);ctx.lineTo(x+90,100);ctx.lineTo(x+160,0);ctx.lineTo(x+70,0);ctx.closePath();ctx.fill();}}
    const p=this.panel('apron-yellow-black-safety-stripe',c,W*2-.52,.22,-.12,.145,L-.15);p.mesh.rotation.x=-Math.PI/2;
    for(const x of [-W+.10,W-.40])this.cabinet.screw(`apron-mount-${x}`,x,.13,L-.15,this.root);
  }
  buildTower(){
    const L=this.cabinet.parameters.length/2,W=this.cabinet.parameters.width/2,x=W+.15,z=-L+.40;
    const group=new T.Group();group.name='rear-right-power-tower';group.position.set(x,.72,z);this.root.add(group);
    this.rounded('tower-mounted-base',.82,.10,.64,0,0,0,'ref-black',.06,group);
    // Cantilevered above the shooter, braced to the OUTSIDE face of the cabinet.
    // Lowest overhanging shelf surface is > .60, above the active ball top (~.4).
    this.rounded('tower-rear-support-shelf',.84,.09,.72,0,-.065,0,'ref-silver',.03,group);
    for(const side of [-1,1]){
      this.rounded(`tower-wall-mount-${side}`,.055,.92,.16,-.045,-.45,side*.24,'ref-black',.01,group);
      this.tube(`tower-shelf-brace-${side}`,[[0,-.85,side*.24],[.32,-.12,side*.24]],.035,'ref-black',group);
    }
    const profile=[new T.Vector2(.30,.05),new T.Vector2(.34,.10),new T.Vector2(.34,.15),new T.Vector2(.30,.19),new T.Vector2(.30,1.04),new T.Vector2(.34,1.08),new T.Vector2(.34,1.14),new T.Vector2(.24,1.20),new T.Vector2(.04,1.20)];
    this.cabinet.mesh('tower-spun-metal-housing',new T.LatheGeometry(profile,48),'ref-silver',group);
    for(const y of [.15,1.08]){const ring=this.cabinet.mesh(`tower-clamp-${y}`,new T.TorusGeometry(.345,.025,8,48),'ref-black',group);ring.rotation.x=Math.PI/2;ring.position.y=y;}
    for(const side of [-1,1]){
      this.rounded(`tower-strap-${side}`,.045,.86,.055,side*.245,.61,.245,'ref-black',.012,group);
      for(const y of [.22,1])this.frontBolt(`tower-strap-bolt-${side}-${y}`,side*.245,y,.28,group);
    }
    this.tube('tower-red-service-pipe',[[.32,1.08,0],[.44,1.08,0],[.45,.72,.08],[.42,.44,.30],[.25,.28,.36]],.035,'ref-red',group);
    for(const y of [.55,.90])this.rounded(`pipe-clamp-${y}`,.12,.045,.10,.43,y,.08,'ref-black',.01,group);
    const lightBase=this.cabinet.mesh('beacon-threaded-base',new T.CylinderGeometry(.10,.13,.07,24),'ref-black',group);lightBase.position.y=1.23;
    const beacon=this.cabinet.mesh('beacon-red-lens',new T.LatheGeometry([new T.Vector2(.08,0),new T.Vector2(.08,.12),new T.Vector2(.06,.15),new T.Vector2(0,.15)],24),'ref-red',group);beacon.position.y=1.265;
    for(const xx of [-.29,.29])for(const zz of [-.21,.21])this.cabinet.screw(`tower-foot-${xx}-${zz}`,xx,.07,zz,group);
    group.userData.visualOnly=true;group.userData.outsidePlayableBoundary=true;
  }
  updateSnapshot(state={}) {
    if(!this.scoreCanvas)return;
    const score=Math.max(0,Math.floor(Number(state.score)||0)),ball=Math.max(1,Math.floor(Number(state.ballNumber)||1));
    const key=`${score}:${ball}`;if(key===this.lastDisplay)return;this.lastDisplay=key;
    const ctx=this.scoreCanvas.getContext('2d');ctx.fillStyle='#03080d';ctx.fillRect(0,0,960,168);ctx.fillStyle='#ffbd2c';ctx.textAlign='center';ctx.font='bold 96px monospace';ctx.fillText(score.toLocaleString('en-US'),480,100);ctx.font='bold 29px monospace';ctx.fillText(`BALL ${ball}         FREE PLAY`,480,146);this.scoreTexture.needsUpdate=true;
  }
  dispose(){for(const t of this.textures)t.dispose();this.textures.clear();}
}
