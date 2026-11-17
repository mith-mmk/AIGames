import * as T from '../vendor/three-0.180.0/three.module.min.js';

// Ground-level U loop. The upper half-circle returns to existing top lane A.
// Every visible wall face is also used for contact: no magnetic guide or boost.
export const LOOP = Object.freeze({width:.36,wall:.018,floor:.04,height:.24,entryZ:.80,turnZ:-4.90,turnX:-1.70,radius:.45,timeout:8});
export function loopPath() {
  const points=[];
  for(let i=0;i<16;i++){
    const t=i/16,u=1-t;
    points.push(new T.Vector3(u*u*u*(-1.82)+3*u*u*t*(-2.08)+3*u*t*t*(-2.22)+t*t*t*(-2.22),LOOP.floor,u*u*u*.8+3*u*u*t*.45+3*u*t*t*.05+t*t*t*(-.5)));
  }
  for(let i=0;i<=40;i++) {
    const z=-.5+(-4.9+.5)*i/40;
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
  const path=loopPath(),vertices=[],indices=[];
  for(let i=0;i<path.length;i++) {
    const tangent=i===0?path[1].clone().sub(path[0]).normalize():i===path.length-1?new T.Vector3(0,0,1):path[i+1].clone().sub(path[i-1]).normalize();
    const normal=new T.Vector3(-tangent.z,0,tangent.x);
    // Small outward flare opens the first 45 cm of the mouth.
    const flare=Math.max(0,1-i/4)*.025;
    for(const [distance,height] of [[LOOP.width/2+flare,0],[LOOP.width/2+flare,LOOP.height],[LOOP.width/2+LOOP.wall+flare,LOOP.height],[LOOP.width/2+LOOP.wall+flare,0]]){
      const p=path[i].clone().addScaledVector(normal,side*distance);p.y+=height;vertices.push(...p.toArray());
    }
  }
  for(let i=0;i<path.length-1;i++)for(let j=0;j<4;j++){
    const a=i*4+j,b=i*4+(j+1)%4,c=a+4,d=b+4;
    indices.push(a,b,c,b,d,c);
  }
  indices.push(0,2,1,0,3,2);const k=(path.length-1)*4;indices.push(k,k+1,k+2,k,k+2,k+3);
  if(side>0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function appendLoopContacts(world,R) {
  return [-1,1].map(side=>{
    const geometry=loopWallGeometry(side);
    const collider=world.createCollider(R.ColliderDesc.trimesh(new Float32Array(geometry.attributes.position.array),new Uint32Array(geometry.index.array)).setRestitution(.15).setFriction(.04));
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
    return distance<.23;
  }
  update(before,p,time) {
    if(this.stage&&(!this.contains(p)||time-this.started>LOOP.timeout||p.y<.10||p.y>.34||p.x< -2.48||p.x>-.96||p.z< -5.56||p.z>.95))this.reset();
    if(p.y<.10||p.y>.34)return false;
    if(before.z>.65&&p.z<=.65&&p.x>-2.12&&p.x<-1.77){this.stage=1;this.started=time;}
    if(this.stage===1&&before.x<-1.70&&p.x>=-1.70&&p.z< -5.15)this.stage=2;
    if(this.stage===2&&before.x> -1.70&&p.x<=-1.70)this.reset();
    if(this.stage===2&&before.z< -4.45&&p.z>=-4.45&&p.x>-1.43&&p.x<-1.07){this.reset();return true;}
    // Rolling back out of the entry is a failed shot, not a second traversal.
    if(this.stage&&before.z<.65&&p.z>=.65)this.reset();
    return false;
  }
}
export class MechanicalLoop {
  constructor(assets){
    this.root=new T.Group();this.root.name='left-return-loop';
    for(const side of [-1,1])assets.mesh(loopWallGeometry(side),'chrome',this.root).name='loop-folded-guide-'+side;
    const path=loopPath();
    for(const i of [2,12,22,32,43,53,63,73]){
      const p=path[i],t=path[i+1].clone().sub(path[i-1]).normalize(),n=new T.Vector3(-t.z,0,t.x);
      for(const side of [-1,1]){
        const c=p.clone().addScaledVector(n,side*(LOOP.width/2+LOOP.wall+.035));
        const mount=assets.box(this.root,.07,.014,.10,c.x,.047,c.z,'steel');mount.rotation.y=-Math.atan2(t.x,t.z);
        assets.screw(this.root,c.x,.06,c.z);
      }
    }
    assets.text(this.root,'LOOP',-1.70,.052,1.03,.34,.11,'#e8bf61');
    assets.batchStaticAssembly(this.root);
  }
}
