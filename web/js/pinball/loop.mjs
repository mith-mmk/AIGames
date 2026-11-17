import * as T from '../vendor/three-0.180.0/three.module.min.js';
import { TABLE } from './layout.mjs';

// Ground-level U loop. The upper half-circle returns to existing top lane A.
// Every visible wall face is also used for contact: no magnetic guide or boost.
export const LOOP = Object.freeze({width:.36,wall:.018,floor:.04,height:.24,entryZ:1.40,turnZ:-4.90,turnX:-1.70,radius:.40,timeout:8});
// Existing top lane A rails are at -1.875 and -.625, each radius .035.
export const LOOP_EXIT = Object.freeze({x:(-1.875-.625)/2,z:-4.45,halfWidth:(1.875-.625)/2-.035-TABLE.ballRadius-.01});
export function loopPath() {
  const points=[];
  for(let i=0;i<20;i++){
    const t=i/20,u=1-t;
    points.push(new T.Vector3(u*u*u*(-1.235)+3*u*u*t*(-1.72)+3*u*t*t*(-2.10)+t*t*t*(-2.10),LOOP.floor,u*u*u*1.4+3*u*u*t*.66+3*u*t*t*(-.1)+t*t*t*(-.7)));
  }
  for(let i=0;i<=40;i++) {
    const z=-.7+(-4.9+.7)*i/40;
    const x=-2.10;
    points.push(new T.Vector3(x,LOOP.floor,z));
  }
  for(let i=1;i<=40;i++){
    const t=i/40*Math.PI;
    points.push(new T.Vector3(LOOP.turnX-LOOP.radius*Math.cos(t),LOOP.floor,LOOP.turnZ-LOOP.radius*Math.sin(t)));
  }
  return points;
}
function loopWallSection(path,side,startIndex=0) {
  const vertices=[],indices=[];
  for(let i=0;i<path.length;i++) {
    const tangent=i===0?path[1].clone().sub(path[0]).normalize():i===path.length-1?path[i].clone().sub(path[i-1]).normalize():path[i+1].clone().sub(path[i-1]).normalize();
    const normal=new T.Vector3(-tangent.z,0,tangent.x);
    // Small outward flare opens the first 45 cm of the mouth.
    const flare=Math.max(0,1-(i+startIndex)/20)*.14;
    for(const [distance,height] of [[LOOP.width/2+flare,0],[LOOP.width/2+flare,LOOP.height],[LOOP.width/2+LOOP.wall+flare,LOOP.height],[LOOP.width/2+LOOP.wall+flare,.018],[LOOP.width/2+LOOP.wall+.04+flare,.018],[LOOP.width/2+LOOP.wall+.04+flare,0]]){
      const p=path[i].clone().addScaledVector(normal,side*distance);p.y+=height;vertices.push(...p.toArray());
    }
  }
  for(let i=0;i<path.length-1;i++)for(let j=0;j<6;j++){
    const a=i*6+j,b=i*6+(j+1)%6,c=a+6,d=b+6;
    indices.push(a,b,c,b,d,c);
  }
  for(let j=1;j<5;j++)indices.push(0,j+1,j);const k=(path.length-1)*6;for(let j=1;j<5;j++)indices.push(k,k+j,k+j+1);
  if(side<0)for(let i=0;i<indices.length;i+=3)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function loopWallGeometry(side) {
  return loopWallSection(loopPath(),side);
}

function backingGeometry(points) {
  const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:LOOP.height,bevelEnabled:false,curveSegments:1,steps:1});g.rotateX(-Math.PI/2);g.translate(0,LOOP.floor,0);return g;
}
function upperBackingGeometry() {
  // A single tapered service backing seals the whole rear rail, not a short
  // square-ended tab which creates a new concave ball pocket at its end.
  const geometry=backingGeometry([[-1.90,-2.72],[-.64,-2.49],[-.64,-2.22],[-1.90,-2.04]]);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++)if(positions.getY(i)>.05){
    const x=positions.getX(i),z=positions.getZ(i);
    const front=-2.04-(x+1.90)*.18/1.26;
    const rear=-2.72+(x+1.90)*.23/1.26;
    positions.setY(i,.04+.24*Math.max(0,Math.min(1,(z-rear)/(front-rear))));
  }
  geometry.computeVertexNormals();return geometry;
}
export function loopPocketBackings() {
  const path=loopPath(),scoop=[];
  for(let i=4;i<=13;i++){
    const t=path[i+1].clone().sub(path[i-1]).normalize(),normal=new T.Vector3(-t.z,0,t.x);
    const p=path[i].clone().addScaledVector(normal,LOOP.width/2+.01+Math.max(0,1-i/20)*.14);scoop.push([p.x,p.z]);
  }
  scoop.push([-.52,.065],[-1.28,.065],[-1.28,.805]);
  return [
    {name:'scoop-common-support',geometry:backingGeometry(scoop)},
    {name:'upper-bank-common-support',geometry:upperBackingGeometry()},
  ];
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
  return [loopWallGeometry(-1),loopWallGeometry(1),loopRearBackingGeometry(),...loopPocketBackings().map(p=>p.geometry)].map(geometry=>{
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
    return distance<(p.z>-.7?.32:.23)||(this.stage===2&&p.z>=-4.9&&p.z<=-4.1&&Math.abs(p.x-LOOP_EXIT.x)<=LOOP_EXIT.halfWidth);
  }
  crossing(before,p,center,tangent,halfWidth) {
    const a=(before.x-center[0])*tangent[0]+(before.z-center[1])*tangent[1];
    const b=(p.x-center[0])*tangent[0]+(p.z-center[1])*tangent[1];
    if(!((a<0&&b>=0)||(a>0&&b<=0)))return 0;
    const t=-a/(b-a),x=before.x+(p.x-before.x)*t,z=before.z+(p.z-before.z)*t,y=before.y+(p.y-before.y)*t;
    if(y<.10||y>.34||Math.abs((x-center[0])*(-tangent[1])+(z-center[1])*tangent[0])>halfWidth)return 0;
    return b>a?1:-1;
  }
  update(before,p,time) {
    if(this.stage&&(!this.contains(p)||time-this.started>LOOP.timeout||p.y<.10||p.y>.34||p.x< -2.56||p.x>-.80||p.z< -5.56||p.z>1.75))this.reset();
    if(p.y<.10||p.y>.34)return false;
    const length=Math.hypot(-.485,-.74),mouth=this.crossing(before,p,[-1.235,1.40],[-.485/length,-.74/length],.32);
    const turn=this.crossing(before,p,[LOOP.turnX,LOOP.turnZ-LOOP.radius],[1,0],.18);
    const exit=this.crossing(before,p,[LOOP_EXIT.x,LOOP_EXIT.z],[0,1],LOOP_EXIT.halfWidth);
    if(mouth===1){this.stage=1;this.started=time;}
    if(this.stage===1&&turn===1)this.stage=2;
    if(this.stage===2&&turn===-1)this.reset();
    if(this.stage===2&&exit===1){this.reset();return true;}
    if(this.stage&&mouth===-1)this.reset();
    return false;
  }
}
export class MechanicalLoop {
  constructor(assets){
    this.root=new T.Group();this.root.name='left-return-loop';
    for(const side of [-1,1])assets.mesh(loopWallGeometry(side),'chrome',this.root).name='loop-folded-guide-'+side;
    assets.mesh(loopRearBackingGeometry(),'steel',this.root).name='loop-solid-rear-pocket-backing';
    for(const part of loopPocketBackings())assets.mesh(part.geometry,'steel',this.root).name=part.name;
    assets.text(this.root,'LOOP',-1.10,.052,1.75,.34,.11,'#e8bf61');
    assets.batchStaticAssembly(this.root);
  }
}
