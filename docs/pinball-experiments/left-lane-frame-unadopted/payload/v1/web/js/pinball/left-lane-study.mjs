import * as T from '../vendor/three-0.180.0/three.module.min.js';
// Frozen shared proposal in table-local units. No new actuator or force law.
export const FLIPPER_DATUM=Object.freeze({pivot:[1.25,.27,4.45],center:.54,halfLength:.60,halfWidth:.14});
export const SAVE=Object.freeze({x:-2.515,bodyZ:2.75,trigger:{x:[-2.575,-2.455],z:[2.42,2.69],maxY:.5},output:{vx:0,vz:-12,vy:'unchanged'},legacyImpulse:true,physicalHousing:false});
const oldGuide=[[1.90,.22,3.00],[1.90,.22,3.47],[1.88,.22,3.50],[1.80,.22,3.75],[1.185,.22,4.05],[1.285,.22,4.22],[1.285,.22,4.45],[1.285,.22,4.85]];
function bend(path){const out=[path[0]];for(let i=1;i<path.length-1;i++){const a=path[i-1],p=path[i],b=path[i+1],la=Math.hypot(...a.map((v,k)=>v-p[k])),lb=Math.hypot(...b.map((v,k)=>v-p[k])),trim=Math.min(p[2]<3.5?.16:.08,la*.25,lb*.25),u=p.map((v,k)=>v+(a[k]-v)*trim/la),w=p.map((v,k)=>v+(b[k]-v)*trim/lb);out.push(u);for(let j=1;j<=6;j++){const t=j/6;out.push(p.map((v,k)=>(1-t)**2*u[k]+2*(1-t)*t*v+t*t*w[k]));}}out.push(path.at(-1));return out.map(([x,y,z])=>[-x,y,z]);}
const old=bend(oldGuide),join=old[21],t=new T.Vector3(...old[22]).sub(new T.Vector3(...join)).normalize(),angle=Math.atan2(t.x,t.z),radius=(2.30+join[0])/(1-Math.cos(angle)),z0=join[2]-radius*Math.sin(angle),cx=-2.30+radius;
const arc=(r,a,n)=>Array.from({length:n+1},(_,i)=>[cx-r*Math.cos(a*i/n),.22,z0+r*Math.sin(a*i/n)]);
const divider=[[-2.30,.22,1.35],...arc(radius,angle,40),...old.slice(22)];
// Force exact old splice coordinate rather than a merely numerically equal recomputation.
divider[41]=[...join];
const theta=42*Math.PI/180,start=arc(radius+.43,theta,28).at(-1),end=[-2.33+(4.3-3.35)*.28/1.53,.22,4.3],t0=[Math.sin(theta),Math.cos(theta)],t1=[.28/Math.hypot(.28,1.53),1.53/Math.hypot(.28,1.53)],dx=end[0]-start[0],dz=end[2]-start[2],den=t0[0]*t1[1]-t0[1]*t1[0],a=(dx*t1[1]-dz*t1[0])/den,control=[start[0]+a*t0[0],.22,start[2]+a*t0[1]];
const quad=Array.from({length:17},(_,i)=>{const u=i/16;return start.map((v,k)=>(1-u)**2*v+2*u*(1-u)*control[k]+u*u*end[k]);});
const outer=[[-2.73,.22,1.35],...arc(radius+.43,theta,28),...quad.slice(1),[-2.05,.22,4.88]];
export const LEFT_LANE=Object.freeze({paths:[divider,[[-1.35,.22,2.75],[-1.35,.22,3.35]],outer],oldTail:old.slice(21),join,radius,startZ:z0,angle,outerControl:control,normalOffset:.43,staticOnlyUntilQualified:true});
const box=(name,lo,hi,material='dark')=>({name,type:'box',size:lo.map((v,i)=>hi[i]-v),center:lo.map((v,i)=>(hi[i]+v)/2),material});
const cyl=(name,r,a,b,material='steel')=>{const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p);return{name,type:'cylinder',radius:r,height:v.length(),center:p.add(q).multiplyScalar(.5).toArray(),rotation:new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),v.normalize()).toArray(),material};};
const frame=[box('outer-frame-plate',[-2.935,.12,2.94],[-2.91,.425,3.06]),box('frame-top-strap',[-2.935,.400,2.94],[-2.71,.425,3.06]),box('frame-inner-clamp',[-2.75,.346,2.94],[-2.71,.425,3.06]),cyl('extended-crosshead',.034,[-2.73,.38,3],[-1.72,.38,3],'dark')];
for(const y of [.18,.25]){frame.push(cyl('frame-anchor-shank-'+y,.012,[-2.938,y,3],[-2.865,y,3],'chrome'));frame.push(cyl('frame-anchor-head-'+y,.022,[-2.943,y,3],[-2.935,y,3],'brass'));}
const mounts=[];const station=(name,p)=>{const[x,,z]=p;mounts.push(cyl(name+'-socket',.040,[x,.20,z],[x,.24,z],'brass'),cyl(name+'-through-shaft',.015,[x,-.18,z],[x,.22,z],'steel'),cyl(name+'-board-seat',.040,[x,.04,z],[x,.06,z],'chrome'),cyl(name+'-underside-retainer',.028,[x,-.17,z],[x,-.145,z],'brass'));};
for(const[i,p]of [[-2.30,.22,1.35],[-2.30,.22,2.30],[-2.30,.22,z0],arc(radius,angle/2,1).at(-1),join].entries())station('divider-'+i,p);
for(const[i,p]of [arc(radius+.43,theta/2,1).at(-1),start,end,outer.at(-1)].entries())station('outer-'+i,p);
for(const z of [1.35,2.30])mounts.push(box('wall-rail-seat-'+z,[-2.76,.20,z-.04],[-2.71,.24,z+.04],'chrome'));
export const FRAME_PARTS=Object.freeze(frame);export const LANE_PARTS=Object.freeze(mounts);
export function partGeometry(p){if(p.type==='box')return new T.BoxGeometry(...p.size);return new T.CylinderGeometry(p.radius,p.radius,p.height,24);}
export function drawLeftParts(a,parent,isFrame){for(const p of isFrame?frame:mounts){const m=a.mesh(partGeometry(p),p.material,parent);m.name='left-study-'+p.name;m.position.set(...p.center);if(p.rotation)m.quaternion.fromArray(p.rotation);}}
export function appendLeftParts(world,R,isFrame){return (isFrame?frame:mounts).map(p=>{const d=p.type==='box'?R.ColliderDesc.cuboid(...p.size.map(v=>v/2)):R.ColliderDesc.cylinder(p.height/2,p.radius);d.setTranslation(...p.center).setFriction(.025).setRestitution(.02);if(p.rotation){const[x,y,z,w]=p.rotation;d.setRotation({x,y,z,w});}return world.createCollider(d);});}
