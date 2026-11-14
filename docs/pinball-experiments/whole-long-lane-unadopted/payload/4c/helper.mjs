import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {LOWER_LAYOUT,LOWER_C,lowerCFrame,lowerLanePaths,lowerLaneMounts} from './layout.mjs';
import {railCapsules,capsuleStockGeometry} from './wire-stock.mjs';

export const C_SAVE=(()=>{
 // Fixed physical axis at the OUT centerline's Z3.60 station, not ball-relative aim.
 let lo=0,hi=1;
 for(let i=0;i<60;i++){const t=(lo+hi)/2,f=lowerCFrame(t);if(f.p[2]+.215*f.n[2]<3.60)lo=t;else hi=t;}
 const parameter=(lo+hi)/2,f=lowerCFrame(parameter);
 return Object.freeze({parameter,center:[-(f.p[0]+.215*f.n[0]),0,f.p[2]+.215*f.n[2]],down:[-f.t[0],0,f.t[2]],cross:[f.n[0],0,-f.n[2]],halfAcross:.19,halfAlong:.135,maxY:.5,horizontalSpeed:12,contactSkin:.001});
})();
const local=(x,y,z)=>new T.Vector3(C_SAVE.center[0]+C_SAVE.cross[0]*x+C_SAVE.down[0]*z,y,C_SAVE.center[2]+C_SAVE.cross[2]*x+C_SAVE.down[2]*z);
const axisRotation=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...C_SAVE.down));
export function cLaneMountParts(side){
 return lowerLaneMounts(side).flatMap(([x,y,z],i)=>[
  {name:'C-lane-throughboard-shaft-'+side+'-'+i,center:[x,.020,z],radius:.018,height:.400,material:'steel'},
  {name:'C-lane-underside-washer-'+side+'-'+i,center:[x,-.146,z],radius:.045,height:.012,material:'chrome'},
  {name:'C-lane-underside-nut-'+side+'-'+i,center:[x,-.163,z],radius:.028,height:.022,material:'brass'}
 ]);
}
export function cSaveCamGeometry(){
 // Low, solid, two-sided cam shoe. Top .060, board top .040.
 // It is not a permanent full-height wall; uncharged traversal remains a test.
 const profile=[[-.11,-.04],[.11,-.04],[.11,.04],[0,.06],[-.11,.04]],points=[];
 for(const x of[-.08,.08])for(const [z,y]of profile)points.push(local(x,y,z));
 const triangles=[],mid=points.reduce((p,q)=>p.add(q),new T.Vector3()).multiplyScalar(1/points.length);
 const add=(a,b,c)=>{const n=points[b].clone().sub(points[a]).cross(points[c].clone().sub(points[a]));const m=points[a].clone().add(points[b]).add(points[c]).multiplyScalar(1/3);if(n.dot(m.sub(mid))<0)[b,c]=[c,b];triangles.push(a,b,c);};
 for(const off of[0,5])for(let i=1;i<4;i++)add(off,off+i,off+i+1);
 for(let i=0;i<5;i++){const j=(i+1)%5;add(i,j,i+5);add(j,j+5,i+5);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));g.setIndex(triangles);g.computeVertexNormals();return g;
}
export function cSaveParts(){
 const parts=[
  {name:'C-save-cam-stem',center:local(0,-.095,0).toArray(),radius:.018,height:.170,material:'steel'},
  {name:'C-save-underboard-drive-rod',center:local(0,-.20,.20).toArray(),radius:.020,height:.40,rotation:axisRotation,material:'chrome'},
  {name:'C-save-underboard-coil',center:local(0,-.20,.30).toArray(),radius:.055,height:.22,rotation:axisRotation,material:'brass'}
 ];
 for(const side of[-1,1]){
  parts.push({name:'C-save-board-anchored-stud-'+side,center:local(side*.10,-.175,.30).toArray(),radius:.016,height:.27,material:'steel'});
  parts.push({name:'C-save-support-washer-'+side,center:local(side*.10,-.146,.30).toArray(),radius:.035,height:.012,material:'chrome'});
 }
 // A real underboard transverse pin connects cam stem to its drive datum.
 const a=local(0,-.18,0),b=local(0,-.20,.10),d=b.clone().sub(a);
 parts.push({name:'C-save-inclined-link',center:a.add(b).multiplyScalar(.5).toArray(),radius:.018,height:d.length(),rotation:new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.normalize()),material:'steel'});
 return parts;
}
function drawParts(a,parts){for(const p of parts){const m=a.cylinder(a.root,p.radius,p.height,...p.center,p.material);m.name=p.name;if(p.rotation)m.quaternion.copy(p.rotation);}}
export function drawCLanes(a,side){
 for(const [i,path]of lowerLanePaths(side).entries()){const mesh=a.mesh(capsuleStockGeometry(railCapsules(path.map(p=>new T.Vector3(...p)),LOWER_LAYOUT.guideRadius)),'chrome',a.root);mesh.name='C-shared-lane-stock-'+side+'-'+i;}
 drawParts(a,cLaneMountParts(side));
}
export function cLaneInkPath(kind){
 const offset=kind==='IN'?-.205:.215;
 return Array.from({length:33},(_,i)=>{const f=lowerCFrame(i/40);return [f.p[0]+offset*f.n[0],f.p[2]+offset*f.n[2],kind==='IN'?.13:.13];});
}
export function cLaneLabel(kind){
 const f=lowerCFrame(.27),offset=kind==='IN'?-.205:.215;
 return [f.p[0]+offset*f.n[0],f.p[2]+offset*f.n[2],Math.atan2(f.t[0],f.t[2]),kind==='IN'?.25:.24,.55];
}
export function drawCSave(a){
 const mesh=a.mesh(cSaveCamGeometry(),'brass',a.root);mesh.name='C-shared-earned-save-cam';
 drawParts(a,cSaveParts());
 const lamp=local(-.08,.055,-.30);a.sideSaveLamp=a.cylinder(a.root,.055,.012,...lamp.toArray(),'dark');
 const label=local(0,.06,-.45);a.text(a.root,'SAVE',label.x,label.y,label.z,.30,.12);
}
export function installCMechanics(game,R){
 const parts=[...[-1,1].flatMap(cLaneMountParts),...cSaveParts()];
 const contacts=parts.map(p=>{let d=R.ColliderDesc.cylinder(p.height/2,p.radius).setTranslation(...p.center).setRestitution(.35).setFriction(.05);if(p.rotation)d=d.setRotation(p.rotation);return {...p,collider:game.world.createCollider(d)};});
 const geometry=cSaveCamGeometry();const vertices=new Float32Array(geometry.attributes.position.array);
 const collider=game.world.createCollider(R.ColliderDesc.convexHull(vertices).setRestitution(.02).setFriction(.08));geometry.dispose();
 return {contacts,cam:collider,contactTicks:0,firings:0,lastContact:null,frame:C_SAVE};
}
export function cSaveCoordinates(p){
 const dx=p.x-C_SAVE.center[0],dz=p.z-C_SAVE.center[2];
 return {across:dx*C_SAVE.cross[0]+dz*C_SAVE.cross[2],along:dx*C_SAVE.down[0]+dz*C_SAVE.down[2]};
}
export function cSaveReady(game,p,v){
 const q=cSaveCoordinates(p),d=C_SAVE;
 if(Math.abs(q.across)>=d.halfAcross||Math.abs(q.along)>=d.halfAlong||p.y>=d.maxY||v.x*d.down[0]+v.z*d.down[2]<=0)return false;
 let actual=false,minimum=Infinity;
 game.world.contactPair(game.ballCollider,game.cMechanics.cam,m=>{
  for(let i=0;i<m.numContacts();i++){const distance=m.contactDist(i);minimum=Math.min(minimum,distance);if(distance<=d.contactSkin)actual=true;}
 });
 if(actual){game.cMechanics.contactTicks++;game.cMechanics.lastContact={time:game.time,p:{...p},local:q,minimum};}
 return actual;
}
export function applyCSave(game,v){
 // Exact rotation of the old finite horizontal speed-12 contract.
 // Same mass impulse and cancellation of transverse velocity; no direct state set.
 // Axis is fixed by the mounted mechanism, never selected from ball/target direction.
 const m=game.ball.mass(),d=C_SAVE.down;
 game.ball.applyImpulse({x:(-12*d[0]-v.x)*m,y:0,z:(-12*d[2]-v.z)*m},true);
 game.cMechanics.firings++;
}
