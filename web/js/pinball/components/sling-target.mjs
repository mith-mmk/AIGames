import * as T from '../../vendor/three-0.180.0/three.module.min.js';

/** Structural prototypes; Y up, target front +Z, points are local [x,z].
 * All sizes are game-unit visual estimates, NOT measured physical specifications.
 * Reference: supplied neon/mechanical images; Stern Jaws LE manual p47 assembly
 * topology (bracket, coil, sleeve, arm/tip, plunger/link and two leaf switches).
 * Standups are NOT drop targets; p51 drop assembly is not their mechanism.
 * Public API: .root, .hit(strength=1), .update(dtSeconds), .parameters.
 * Visual animation only. Collision ownership remains with the existing physics.
 */
function mat(m,key,color,extra={}) { return m[key]?.clone()||new T.MeshStandardMaterial({color,roughness:.35,...extra}); }
function add(parent,geometry,material,name,x=0,y=0,z=0){const a=new T.Mesh(geometry,material);a.name=name;a.position.set(x,y,z);a.castShadow=true;a.receiveShadow=true;parent.add(a);return a;}
function shape(points){const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return s;}
function extrude(s,depth,bevel=.003){return new T.ExtrudeGeometry(s,{depth,steps:1,bevelEnabled:bevel>0,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:10});}
function plate(g,points,depth,y,m,name,holes=[]){const s=shape(points.map(([x,z])=>[x,-z]));for(const [x,z,r] of holes){const h=new T.Path();h.absarc(x,-z,r,0,Math.PI*2,true);s.holes.push(h);}const geo=extrude(s,depth);geo.rotateX(-Math.PI/2);return add(g,geo,m,name,0,y,0);}
function turn(g,profile,m,name,x=0,y=0,z=0){return add(g,new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),24),m,name,x,y,z);}
function pipeGeometry(points,r,closed=false){return new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)),closed,'centripetal'),Math.min(128,Math.max(48,points.length*2)),r,6,closed);}
function pipe(g,points,r,m,name,closed=false){return add(g,pipeGeometry(points,r,closed),m,name);}
function face(w,h,r){const s=new T.Shape(),x=-w/2;s.moveTo(x+r,0);s.lineTo(x+w-r,0);s.quadraticCurveTo(x+w,0,x+w,r);s.lineTo(x+w,h-r);s.quadraticCurveTo(x+w,h,x+w-r,h);s.lineTo(x+r,h);s.quadraticCurveTo(x,h,x,h-r);s.lineTo(x,r);s.quadraticCurveTo(x,0,x+r,0);return s;}
function bolt(g,x,y,z,m,dark){turn(g,[[0,0],[.019,0],[.019,.007],[.014,.013],[0,.013]],m,'slotted-bolt-head',x,y,z);add(g,new T.BoxGeometry(.024,.002,.003),dark,'bolt-slot',x,y+.013,z);}
function coilPoints(start,end,r=.018,turns=7){const a=new T.Vector3(...start),v=new T.Vector3(...end).sub(a),n=new T.Vector3(1,0,0),b=v.clone().normalize().cross(n),out=[];for(let i=0;i<=96;i++){const t=i/96,q=(i===0||i===96)?0:r;out.push(a.clone().addScaledVector(v,t).addScaledVector(n,Math.cos(t*Math.PI*2*turns)*q).addScaledVector(b,Math.sin(t*Math.PI*2*turns)*q).toArray());}return out;}
class Mechanism {
  constructor(){this.time=10;this.strength=0;this.root=new T.Group();this.wasMoving=false;}
  hit(strength=1){if(this.disposed)return;this.time=0;this.strength=T.MathUtils.clamp(Number.isFinite(strength)?strength:1,0,1.5);}
  dispose(){if(this.disposed)return;this.disposed=true;const geometries=new Set(),materials=new Set();this.root.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const m of(Array.isArray(o.material)?o.material:[o.material]))materials.add(m);});for(const g of geometries)g.dispose();for(const m of materials)m.dispose();this.root.removeFromParent();this.root.clear();}
  pulse(dt){this.time+=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.1));return this.strength*Math.exp(-this.time*8)*Math.sin(Math.min(this.time/.22,1)*Math.PI);}
}
export class MechanicalSling extends Mechanism {
  constructor({materials={},points=[[-.11,-.36],[.11,.24],[-.11,.44]],rubberHeight=.22,coverHeight=.43}={}){
    super();this.root.name='mechanical-sling-prototype';
    if(points.length!==3||points.some(p=>p.length!==2||p.some(v=>!Number.isFinite(v))))throw new Error('Sling needs three finite [x,z] post centres');
    const p=points.map(q=>[...q]);const area=p.reduce((s,a,i)=>{const b=p[(i+1)%3];return s+a[0]*b[1]-b[0]*a[1];},0);if(Math.abs(area)<.0001)throw new Error('Collinear sling posts');if(area<0)p.reverse();
    this.parameters={points:p.map(a=>[...a]),rubberHeight,coverHeight,dimensionStatus:'visual estimates, not measured dimensions'};
    const g=this.root,m=materials,metal=mat(m,'chrome',0xc5d4d8,{metalness:.85}),steel=mat(m,'steel',0x344653,{metalness:.7}),rubber=mat(m,'rubber',0x181c20),plastic=mat(m,'jade',0x227b83),brass=mat(m,'brass',0xc69a45,{metalness:.7}),dark=mat(m,'dark',0x12202c);
    const cx=p.reduce((s,a)=>s+a[0],0)/3,cz=p.reduce((s,a)=>s+a[1],0)/3;
    this.lampMaterial=mat(m,'amber',0xffc252,{emissive:0xffa324,emissiveIntensity:.6});this.lampBase=this.lampMaterial.emissiveIntensity;
    for(let i=0;i<3;i++){
      const a=p[i],b=p[(i+1)%3],v=new T.Vector2(b[0]-a[0],b[1]-a[1]).normalize(),n=[-v.y*.022,v.x*.022];
      plate(g,[[a[0]+n[0],a[1]+n[1]],[b[0]+n[0],b[1]+n[1]],[b[0]-n[0],b[1]-n[1]],[a[0]-n[0],a[1]-n[1]]],.018,.025,steel,'skeletal-mounting-rail');
    }
    for(const [x,z] of p){
      turn(g,[[0,0],[.06,0],[.06,.017],[.04,.026],[.029,.05],[.029,rubberHeight-.04],[.046,rubberHeight-.025],[.046,rubberHeight-.015],[.031,rubberHeight-.01],[.031,rubberHeight+.01],[.046,rubberHeight+.015],[.046,rubberHeight+.025],[.029,rubberHeight+.04],[.029,coverHeight-.03],[.048,coverHeight-.014],[.048,coverHeight],[0,coverHeight]],metal,'turned-grooved-post',x,0,z);
      bolt(g,x,coverHeight+.033,z,metal,dark);
    }
    // Straight tension runs between round post arcs, unlike an overshooting spline triangle.
    const loop=[];for(let i=0;i<3;i++){
      const a=p[(i+2)%3],b=p[i],c=p[(i+1)%3];let start=Math.atan2(-(b[0]-a[0]),b[1]-a[1]),end=Math.atan2(-(c[0]-b[0]),c[1]-b[1]);while(end<start)end+=Math.PI*2;
      for(let j=0;j<=10;j++){const angle=start+(end-start)*j/10;loop.push([b[0]+.047*Math.cos(angle),rubberHeight,b[1]+.047*Math.sin(angle)]);}
      loop.push([(b[0]+c[0])/2+.047*Math.cos(end),rubberHeight,(b[1]+c[1])/2+.047*Math.sin(end)]);
    }
    this.restLoop=loop;this.rubber=pipe(g,loop,.025,rubber,'tensioned-rubber',true);
    const outer=p.map(([x,z])=>[cx+(x-cx)*1.04,cz+(z-cz)*1.04]);const coverShape=shape(outer.map(([x,z])=>[x,-z])),opening=new T.Path();
    p.forEach(([x,z],i)=>{const a=cx+(x-cx)*.45,b=-(cz+(z-cz)*.45);i?opening.lineTo(a,b):opening.moveTo(a,b);});opening.closePath();coverShape.holes.push(opening);
    const cover=extrude(coverShape,.026,.008);cover.rotateX(-Math.PI/2);add(g,cover,plastic,'moulded-cover-with-service-window',0,coverHeight,0);
    const trimPath=new T.CurvePath();outer.forEach(([x,z],i)=>{const q=outer[(i+1)%3];trimPath.add(new T.LineCurve3(new T.Vector3(x,coverHeight+.029,z),new T.Vector3(q[0],coverHeight+.029,q[1])));});
    add(g,new T.TubeGeometry(trimPath,72,.008,6,true),brass,"cover-edge-trim");
    turn(g,[[0,0],[.037,0],[.037,.014],[.018,.025],[.018,.23],[.039,.23],[.039,.252],[0,.252]],steel,"lamp-socket-and-support",cx,.028,cz);
    turn(g,[[0,0],[.033,0],[.033,.055],[.024,.075],[0,.075]],this.lampMaterial,'under-cover-lamp',cx,.28,cz);
    const lengths=p.map((a,i)=>Math.hypot(a[0]-p[(i+1)%3][0],a[1]-p[(i+1)%3][1]));this.edge=lengths.indexOf(Math.max(...lengths));
    const a=p[this.edge],b=p[(this.edge+1)%3],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);this.normal=new T.Vector3(dz/len,0,-dx/len);
    const mechanism=new T.Group();mechanism.position.set((a[0]+b[0])/2,0,(a[1]+b[1])/2);mechanism.rotation.y=-Math.atan2(dz,dx);g.add(mechanism);
    // Bent sheet-metal U bracket below the playfield, guided plunger and horizontal pivot.
    add(mechanism,extrude(shape([[-.09,-.24],[.09,-.24],[.09,.09],[.06,.11],[-.06,.11],[-.09,.09]]),.014),steel,'folded-solenoid-bracket',0,0,-.065);
    plate(mechanism,[[-.09,-.065],[.09,-.065],[.09,.06],[-.09,.06]],.016,-.24,steel,'coil-bracket-foot',[[0,.025,.017]]);
    turn(mechanism,[[0,0],[.047,0],[.047,.018],[.035,.018],[.035,.14],[.047,.14],[.047,.155],[0,.155]],brass,'coil-and-bobbin',0,-.225,0);
    this.plunger=turn(mechanism,[[0,0],[.012,0],[.012,.17],[.02,.17],[.02,.185],[0,.185]],metal,'guided-solenoid-plunger',0,-.12,0);
    this.kicker=new T.Group();this.kicker.position.y=.08;mechanism.add(this.kicker);
    const axle=turn(mechanism,[[0,0],[.018,0],[.018,.18],[0,.18]],metal,'horizontal-kicker-axle',-.09,.08,0);axle.rotation.z=-Math.PI/2;
    add(this.kicker,extrude(shape([[-.027,-.08],[.027,-.08],[.028,.12],[.02,.16],[-.02,.16],[-.028,.12]]),.018),metal,'pivoted-kicker-arm',0,0,-.009);
    add(this.kicker,extrude(face(Math.min(len*.36,.22),.075,.012),.028),rubber,'rubber-kicker-tip',0,.12,-.020);
    // Separate spring steel leaf/contact pairs flanking the kicker.
    for(const side of [-1,1])for(const offset of [0,.009]){const leaf=add(mechanism,extrude(shape([[-.011,0],[.011,0],[.011,.2],[-.011,.2]]),.003,0),metal,'paired-leaf-switch',side*.075,-.02,-.033+offset);leaf.rotation.x=-.08;}
    pipe(mechanism,coilPoints([0,-.09,0],[0,.005,0],.022,5),.004,metal,'plunger-return-spring');
  }
  update(dt){if(this.disposed)return;const pulse=this.pulse(dt);this.kicker.rotation.x=-pulse*.25;this.plunger.position.y=-.12-pulse*.025;
    const pts=this.restLoop.map(p=>[...p]),mid=this.edge*12+11;pts[mid][0]+=this.normal.x*pulse*.035;pts[mid][2]+=this.normal.z*pulse*.035;
    if(pulse>1e-5||this.wasMoving){const geo=pipeGeometry(pts,.025,true);this.rubber.geometry.dispose();this.rubber.geometry=geo;}this.wasMoving=pulse>1e-5;this.lampMaterial.emissiveIntensity=this.lampBase+pulse*2;
  }
}
export class MechanicalTarget extends Mechanism {
  constructor({materials={},width=.16,height=.32,depth=.085}={}){
    super();if([width,height,depth].some(v=>!Number.isFinite(v)||v<=0))throw new Error('Target dimensions must be positive');
    this.root.name='mechanical-standup-target-prototype';this.parameters={width,height,depth,type:'standup',dimensionStatus:'visual estimates, not measured dimensions'};
    const g=this.root,m=materials,chrome=mat(m,'chrome',0xb8cad0,{metalness:.85}),steel=mat(m,'steel',0x3c4a54,{metalness:.7}),body=mat(m,'red',0xad3f40),cream=mat(m,'cream',0xffdf98),dark=mat(m,'dark',0x15212c);
    this.lampMaterial=mat(m,'amber',0xffc66d,{emissive:0xffad31,emissiveIntensity:.4});this.lampBase=this.lampMaterial.emissiveIntensity;
    plate(g,[[-width*.62,-depth*1.1],[width*.62,-depth*1.1],[width*.62,depth*.7],[-width*.62,depth*.7]],.018,.025,steel,'folded-mounting-shoe',[[0,-depth*.72,.014]]);
    for(const x of [-width*.47,width*.47]){
      const ear=face(.065,.11,.022),hole=new T.Path();hole.absarc(0,.075,.015,0,Math.PI*2,true);ear.holes.push(hole);
      const e=add(g,extrude(ear,.018,.002),chrome,'pierced-hinge-ear',x,.04,0);e.rotation.y=Math.PI/2;bolt(g,x,.046,depth*.4,chrome,dark);
    }
    const pin=turn(g,[[0,0],[.012,0],[.012,width*1.22],[0,width*1.22]],chrome,'through-hinge-pin',-width*.61,.115,0);pin.rotation.z=-Math.PI/2;
    this.pivot=new T.Group();this.pivot.position.y=.115;g.add(this.pivot);
    add(this.pivot,extrude(shape([[-width*.22,-.03],[width*.22,-.03],[width*.24,.09],[-width*.24,.09]]),.018,.003),chrome,'spring-steel-target-stem',0,0,-.015);
    add(this.pivot,extrude(face(width,height,.025),depth,.006),body,'thick-moulded-target-body',0,.055,-depth*.65);
    add(this.pivot,extrude(face(width*.87,height*.87,.018),.012,.003),chrome,'raised-metal-face-bezel',0,.055+height*.065,depth*.35);
    add(this.pivot,extrude(face(width*.73,height*.76,.012),.008,.002),cream,'replaceable-strike-plate',0,.055+height*.12,depth*.35+.014);
    add(this.pivot,extrude(shape([[-width*.22,0],[width*.03,height*.19],[-width*.02,height*.10],[width*.22,height*.10],[-width*.03,-height*.12],[width*.02,0]]),.002,0),dark,'strike-face-lightning',0,height*.63,depth*.35+.025);
    add(this.pivot,extrude(face(width*.38,.025,.009),.009,.002),this.lampMaterial,'status-light-lens',0,.07,depth*.35+.024);
    this.spring=pipe(g,this.springPoints(0),.004,chrome,'rear-return-coil');
    pipe(g,[[0,.04,-depth],[0,.07,-depth*1.5],[0,.14,-depth*1.5]],.011,steel,'rear-spring-anchor');
    for(const x of [-width*.3,width*.3]){const screw=turn(this.pivot,[[0,0],[.009,0],[.009,.005],[0,.005]],chrome,'face-rivet',x,height*.94,depth*.35+.025);screw.rotation.x=Math.PI/2;}
  }
  springPoints(angle){const d=this.parameters.depth,end=new T.Vector3(0,.19,-d*.65).applyAxisAngle(new T.Vector3(1,0,0),angle).add(new T.Vector3(0,.115,0));return coilPoints([0,.14,-d*1.5],end.toArray());}
  update(dt){if(this.disposed)return;const pulse=this.pulse(dt),angle=-pulse*.14;this.pivot.rotation.x=angle;this.lampMaterial.emissiveIntensity=this.lampBase+pulse*3;
    if(pulse>1e-5||this.wasMoving){const geo=pipeGeometry(this.springPoints(angle),.004);this.spring.geometry.dispose();this.spring.geometry=geo;}this.wasMoving=pulse>1e-5;
  }
}
