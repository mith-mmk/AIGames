import * as T from '../vendor/three-0.180.0/three.module.min.js';

// Ground-level U loop. The upper half-circle returns to existing top lane A.
// Every visible wall face is also used for contact: no magnetic guide or boost.
export const LOOP = Object.freeze({width:.36,wall:.018,floor:.04,height:.24,entryZ:-2.60,turnZ:-4.90,turnX:-1.70,radius:.45,timeout:8});
export function loopPath() {
  const points=[];
  for(let i=0;i<=40;i++) {
    const z=LOOP.entryZ+(-4.9-LOOP.entryZ)*i/40;
    const u=Math.max(0,Math.min(1,(-z-3)/1.9));
    const x=-2.22+.07*u*u*(3-2*u);
    points.push(new T.Vector3(x,LOOP.floor,z));
  }
  for(let i=1;i<=40;i++){
    const t=i/40*Math.PI;
    points.push(new T.Vector3(LOOP.turnX-LOOP.radius*Math.cos(t),LOOP.floor,LOOP.turnZ-LOOP.radius*Math.sin(t)));
  }
  return points;
}
export function loopWallGeometry(side) {
  const path=side<0?loopPath().slice(40):loopPath(),vertices=[],indices=[];
  for(let i=0;i<path.length;i++) {
    const tangent=i===0?path[1].clone().sub(path[0]).normalize():i===path.length-1?new T.Vector3(0,0,1):path[i+1].clone().sub(path[i-1]).normalize();
    const normal=new T.Vector3(-tangent.z,0,tangent.x);
    // Small outward flare opens the first 45 cm of the mouth.
    const flare=side>0?Math.max(0,1-i/4)*.025:0;
    for(const [distance,height] of [[LOOP.width/2+flare,0],[LOOP.width/2+flare,LOOP.height],[LOOP.width/2+LOOP.wall+flare,LOOP.height],[LOOP.width/2+LOOP.wall+flare,.018],[LOOP.width/2+LOOP.wall+.04+flare,.018],[LOOP.width/2+LOOP.wall+.04+flare,0]]){
      const p=path[i].clone().addScaledVector(normal,side*distance);p.y+=height;vertices.push(...p.toArray());
    }
  }
  for(let i=0;i<path.length-1;i++)for(let j=0;j<6;j++){
    const a=i*6+j,b=i*6+(j+1)%6,c=a+6,d=b+6;
    indices.push(a,b,c,b,d,c);
  }
  for(let j=1;j<5;j++)indices.push(0,j+1,j);const k=(path.length-1)*6;for(let j=1;j<5;j++)indices.push(k,k+j,k+j+1);
  if(side>0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function loopRearBackingGeometry() {
  const radius=LOOP.radius+LOOP.width/2+LOOP.wall,shape=new T.Shape();
  for(let i=0;i<=40;i++){
    const t=i/40*Math.PI,x=LOOP.turnX-radius*Math.cos(t),z=LOOP.turnZ-radius*Math.sin(t);
    if(!i)shape.moveTo(x,-z);else shape.lineTo(x,-z);
  }
  shape.lineTo(LOOP.turnX+radius,5.73);shape.lineTo(LOOP.turnX-radius,5.73);shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:LOOP.height,bevelEnabled:false,curveSegments:1,steps:1});
  g.rotateX(-Math.PI/2);g.translate(0,LOOP.floor,0);return g;
}
export function appendLoopContacts(world,R) {
  return [loopWallGeometry(-1),loopWallGeometry(1),loopRearBackingGeometry()].map(geometry=>{
    const collider=world.createCollider(R.ColliderDesc.trimesh(new Float32Array(geometry.attributes.position.array),geometry.index?new Uint32Array(geometry.index.array):Uint32Array.from({length:geometry.attributes.position.count},(_,i)=>i)).setRestitution(.15).setFriction(.04));
    geometry.dispose();return collider;
  });
}
export class LoopTraversal {
  constructor(){this.path=loopPath().map(p=>[p.x,p.z]);this.path.push([-1.25,-4.1]);this.reset();}
  reset(){this.stage=0;this.started=0;}
  contains(p) {
    let distance=Infinity;
    for(let i=1;i<this.path.length;i++){
      const [ax,az]=this.path[i-1],[bx,bz]=this.path[i],dx=bx-ax,dz=bz-az;
      const t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.z-az)*dz)/(dx*dx+dz*dz)));
      distance=Math.min(distance,Math.hypot(p.x-ax-t*dx,p.z-az-t*dz));
    }
    return distance<.23||(p.z< -2.6&&p.z> -4.9&&p.x> -2.55&&p.x< -2.02);
  }
  update(before,p,time) {
    if(this.stage&&(!this.contains(p)||time-this.started>LOOP.timeout||p.y<.10||p.y>.34||p.x< -2.56||p.x>-.96||p.z< -5.56||p.z> -2.45))this.reset();
    if(p.y<.10||p.y>.34)return false;
    if(before.z>-2.75&&p.z<=-2.75&&p.x>-2.55&&p.x<-2.02){this.stage=1;this.started=time;}
    if(this.stage===1&&before.x<-1.70&&p.x>=-1.70&&p.z< -5.15)this.stage=2;
    if(this.stage===2&&before.x> -1.70&&p.x<=-1.70)this.reset();
    if(this.stage===2&&before.z< -4.45&&p.z>=-4.45&&p.x>-1.43&&p.x<-1.07){this.reset();return true;}
    // Rolling back out of the entry is a failed shot, not a second traversal.
    if(this.stage&&before.z<-2.75&&p.z>=-2.75)this.reset();
    return false;
  }
}
export class MechanicalLoop {
  constructor(assets){
    this.root=new T.Group();this.root.name='left-return-loop';
    for(const side of [-1,1])assets.mesh(loopWallGeometry(side),'chrome',this.root).name='loop-folded-guide-'+side;
    assets.mesh(loopRearBackingGeometry(),'steel',this.root).name='loop-solid-rear-pocket-backing';
    assets.text(this.root,'LOOP',-2.22,.052,-2.35,.34,.11,'#e8bf61');
    assets.batchStaticAssembly(this.root);
  }
}
