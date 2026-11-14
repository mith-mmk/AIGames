import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {railCapsules,capsuleStockGeometry} from './wire-stock.mjs';
// Table-local estimates. Endpoint geometry, not a force/trajectory correction.
export const INLET_CONNECTOR=Object.freeze({shift:.40,run:1.60,radius:1.70,angle:2*Math.atan(.25),start:[2.93,.23,-2.30],end:[2.53,.23,-3.90],innerOffset:-.18,outerOffset:.19,innerRadius:.045,outerRadius:.06,stepsPerArc:32,caseOuterX:3.13,caseBottom:-.04,caseTop:.55,boardBottom:-.14});
export function inletPose(t){
 const d=INLET_CONNECTOR,q=Math.max(0,Math.min(1,t))*2,R=d.radius,A=d.angle;
 let x,z,a;
 if(q<=1){a=q*A;x=d.start[0]-R*(1-Math.cos(a));z=d.start[2]-R*Math.sin(a);}
 else{a=(2-q)*A;x=d.start[0]-R*(1-Math.cos(A))-R*(Math.cos(a)-Math.cos(A));z=d.start[2]-R*Math.sin(A)-R*(Math.sin(A)-Math.sin(a));}
 return {p:new T.Vector3(x,.23,z),tangent:new T.Vector3(-Math.sin(a),0,-Math.cos(a)),outward:new T.Vector3(Math.cos(a),0,-Math.sin(a))};
}
export function inletRailPoints(kind){
 const d=INLET_CONNECTOR,offset=kind==='inner'?d.innerOffset:d.outerOffset;
 return Array.from({length:d.stepsPerArc*2+1},(_,i)=>{const p=inletPose(i/(d.stepsPerArc*2));return p.p.addScaledVector(p.outward,offset);});
}
export function inletInnerPoints(frontZ){return [new T.Vector3(2.75,.23,frontZ),...inletRailPoints('inner')];}
export function inletOuterPoints(){return [...inletRailPoints('outer'),new T.Vector3(2.72,.23,-4.15)];}
export function inletInnerX(z){
 const p=inletRailPoints('inner');
 if(z>=p[0].z)return p[0].x;if(z<=p.at(-1).z)return p.at(-1).x;
 for(let i=1;i<p.length;i++)if(z<=p[i-1].z&&z>=p[i].z){const t=(z-p[i-1].z)/(p[i].z-p[i-1].z);return p[i-1].x+(p[i].x-p[i-1].x)*t;}
 throw new Error('Uncovered inlet support datum');
}
export function inletCaseOutline(){
 const d=INLET_CONNECTOR,raw=Array.from({length:d.stepsPerArc*2+1},(_,i)=>{const r=inletPose(i/(d.stepsPerArc*2));return r.p.addScaledVector(r.outward,d.outerOffset+d.outerRadius);}),edge=[];
 for(let i=1;i<raw.length;i++){
  const a=raw[i-1],b=raw[i];
  if(a.x>=d.caseOuterX&&b.x<d.caseOuterX){const t=(d.caseOuterX-a.x)/(b.x-a.x);edge.push([d.caseOuterX,a.z+(b.z-a.z)*t]);}
  if(b.x<d.caseOuterX)edge.push([b.x,b.z]);
 }
 if(edge.length<3)throw new Error('Inlet case has no clipped side boundary');
 edge.push([2.78,-4.15],[d.caseOuterX,-4.15]);return edge;
}
export function inletCaseGeometry(){
 const d=INLET_CONNECTOR,s=new T.Shape();inletCaseOutline().forEach(([x,z],i)=>i?s.lineTo(x,-z):s.moveTo(x,-z));s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:d.caseTop-d.caseBottom,steps:1,bevelEnabled:false});
 g.rotateX(-Math.PI/2);g.translate(0,d.caseBottom,0);return g;
}
export function inletMountParts(){
 return [0,.5,1].flatMap((t,i)=>{
  const r=inletPose(t),p=r.p.addScaledVector(r.outward,INLET_CONNECTOR.innerOffset);
  return [
   {name:'inlet-throughboard-shaft-'+i,center:[p.x,.025,p.z],radius:.018,height:.410,material:'steel'},
   {name:'inlet-underside-washer-'+i,center:[p.x,-.146,p.z],radius:.050,height:.012,material:'chrome'},
   {name:'inlet-underside-retaining-nut-'+i,center:[p.x,-.163,p.z],radius:.032,height:.022,material:'brass'}
  ];
 });
}
export function drawInlet(a,frontZ){
 for(const [name,p,r] of [['inner',inletInnerPoints(frontZ),.045],['outer',inletOuterPoints(),.06]]){
  const mesh=a.mesh(capsuleStockGeometry(railCapsules(p,r)),'chrome',a.root);mesh.name='inlet-'+name+'-shared-capsule-stock';
 }
 const c=a.mesh(inletCaseGeometry(),'steel',a.root);c.name='inlet-outboard-closed-cabinet-insert';
 for(const p of inletMountParts()){const m=a.cylinder(a.root,p.radius,p.height,...p.center,p.material);m.name=p.name;}
}
export function installInletOuter(game,R){
 const contacts=[];
 for(const part of railCapsules(inletOuterPoints(),.06)){
  contacts.push({name:'inlet-outer-stock',collider:game.world.createCollider(R.ColliderDesc.capsule(part.halfHeight,part.radius).setTranslation(...part.center.toArray()).setRotation(part.rotation).setRestitution(.45).setFriction(.05))});
 }
 const g=inletCaseGeometry(),a=g.attributes.position,indices=g.index?new Uint32Array(g.index.array):Uint32Array.from({length:a.count},(_,i)=>i);
 contacts.push({name:'inlet-outboard-closed-cabinet-insert',collider:game.world.createCollider(R.ColliderDesc.trimesh(a.array,indices,R.TriMeshFlags.FIX_INTERNAL_EDGES).setRestitution(.35).setFriction(.05))});g.dispose();
 for(const p of inletMountParts())contacts.push({...p,collider:game.world.createCollider(R.ColliderDesc.cylinder(p.height/2,p.radius).setTranslation(...p.center).setRestitution(.35).setFriction(.05))});
 return contacts;
}
