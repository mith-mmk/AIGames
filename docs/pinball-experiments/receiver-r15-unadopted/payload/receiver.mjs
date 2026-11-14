import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
import R from '../../../web/js/vendor/rapier3d-0.17.3/rapier.mjs';
import {capsuleStockGeometry} from '../../../web/js/pinball/wire-stock.mjs';
import {MechanicalSling} from '../../../web/js/pinball/components/sling-target.mjs';
export const SLOPE=.73/1.55,ANGLE=Math.atan(SLOPE),N=new T.Vector3(Math.cos(ANGLE),0,Math.sin(ANGLE));
const SHIFT=.21326168051712768,X=z=>1.83+SLOPE*(1.1-z)-SHIFT;
export const A=new T.Vector3(X(1.1),.22,1.1),P=new T.Vector3(X(1.8),.22,1.8),C=new T.Vector3(X(2.75),.22,2.75);
// The given line is the exposed rail/band axis, not the post-center line.
export const MOUTH=A.clone().addScaledVector(N,-(.025+.34)).setY(.04);
function tube(a,b,r){return capsuleStockGeometry([{radius:r,halfHeight:a.distanceTo(b)/2,center:a.clone().add(b).multiplyScalar(.5),rotation:new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize())}]);}
function slab(points,y,thick){const shape=new T.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();let g=new T.ExtrudeGeometry(shape,{depth:thick,steps:1,bevelEnabled:false});g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;}
export function receiverParts(){const parts=[],add=(name,g,kind,contact)=>parts.push({name,geometry:g,kind,contact}),seg=(name,a,b,r,kind='metal',active=false)=>add(name,tube(a,b,r),kind,{a:a.toArray(),b:b.toArray(),r,active});
 seg('active-compliant-rubber',C,P,.025,'rubber',true);seg('fixed-upper-metal-return',P,A,.025);
 const inner=[A,P,C].map(p=>p.clone().addScaledVector(N,.072)),outer=[new T.Vector3(1.83,0,1.1),new T.Vector3(1.88,0,2.45)],poly=[inner[0],...outer,inner[2],inner[1]];
 add('receiver-case-cover',slab(poly,.33,.018),'chrome');add('receiver-case-bottom',slab(poly,.04,.018),'steel');
 for(let i=0;i<poly.length;i++){let a=poly[i],b=poly[(i+1)%poly.length],v=new Float32Array([a.x,.04,a.z,b.x,.04,b.z,a.x,.33,a.z,b.x,.33,b.z]);let g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(v,3));g.setIndex([0,2,1,2,3,1]);g.computeVertexNormals();add('receiver-case-wall-'+i,g,'steel');}
 for(const [i,q]of [P,C].entries()){const p=q.clone().addScaledVector(N,.047);seg('rubber-anchor-post-'+i,p.clone().setY(.055),p.clone().setY(.34),.047,'brass');}
 // Outside case return is fixed stock, not a fictional perimeter-wide kicker.
 for(let i=0;i<2;i++)seg('fixed-outer-case-stock-'+i,poly[i].clone().setY(.22),poly[i+1].clone().setY(.22),.025);
 return parts;}
export function installReceiver(game){game.receiverParts=new Map();const mid=P.clone().add(C).multiplyScalar(.5).addScaledVector(N,.12);for(const p of receiverParts()){let d;if(p.contact){let a=new T.Vector3(...p.contact.a),b=new T.Vector3(...p.contact.b),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),b.clone().sub(a).normalize()),m=a.clone().add(b).multiplyScalar(.5);d=R.ColliderDesc.capsule(a.distanceTo(b)/2,p.contact.r).setTranslation(m.x,m.y,m.z).setRotation(q).setRestitution(p.contact.active?.75:.45).setFriction(.05);}else d=R.ColliderDesc.trimesh(p.geometry.attributes.position.array,p.geometry.index?new Uint32Array(p.geometry.index.array):Uint32Array.from({length:p.geometry.attributes.position.count},(_,i)=>i),R.TriMeshFlags.FIX_INTERNAL_EDGES).setRestitution(.35).setFriction(.08);const c=game.world.createCollider(d);game.receiverParts.set(c.handle,p.name);if(p.contact?.active)game.hitObjects.set(c.handle,{type:'sling',x:mid.x,z:mid.z,points:25,label:'SLING',key:'s1'});p.geometry.dispose();}}
export function buildReceiver(materials){let root=new T.Group();root.name='integrated-right-sling-receiver';for(const p of receiverParts()){let mat=(p.kind==='rubber'?materials.flipperRubber:materials[p.kind])||materials.chrome||new T.MeshStandardMaterial({color:0x7b8790});let mesh=new T.Mesh(p.geometry,mat);mesh.name=p.name;root.add(mesh);}
 const mid=P.clone().add(C).multiplyScalar(.5),third=mid.clone().addScaledVector(N,.18),mechanism=new MechanicalSling({materials,points:[[P.x,P.z],[C.x,C.z],[third.x,third.z]],rubberHeight:.22,coverHeight:.33});
 let assembly=mechanism.root.children.find(g=>g.children.some(c=>c.name==='folded-solenoid-bracket'));if(!assembly)throw Error('kicker assembly not found');root.add(assembly);return{root,hit:s=>mechanism.hit(s),update:dt=>mechanism.update(dt),dispose:()=>{mechanism.dispose();root.traverse(o=>o.geometry?.dispose());}};
}
