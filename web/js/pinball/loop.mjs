import * as T from '../vendor/three-0.180.0/three.module.min.js';
import { TABLE } from './layout.mjs';
import {cabinetBoundaryBoxes,CABINET_BOUNDARY} from './cabinet-boundary.mjs';

// Ground-level U loop. The upper half-circle returns to existing top lane A.
// Every visible wall face is also used for contact: no magnetic guide or boost.
export const LOOP = Object.freeze({width:.36,wall:.018,floor:.04,height:.24,entryZ:1.40,turnZ:-4.90,turnX:-1.675,radius:.425,timeout:8});
// Existing top lane A rails are at -1.875 and -.625, each radius .035.
export const LOOP_THROAT = Object.freeze({x:-2.10,z:-.70,halfWidth:LOOP.width/2-TABLE.ballRadius+.012});
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
function loopWallSection(path,side,startIndex=0,flared=true) {
  const vertices=[],indices=[];
  for(let i=0;i<path.length;i++) {
    const tangent=i===0?path[1].clone().sub(path[0]).normalize():i===path.length-1?path[i].clone().sub(path[i-1]).normalize():path[i+1].clone().sub(path[i-1]).normalize();
    const normal=new T.Vector3(-tangent.z,0,tangent.x);
    // Small outward flare opens the first 45 cm of the mouth.
    const flare=flared?Math.max(0,1-(i+startIndex)/20)*.14:0;
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
function wallPath(side) {
  const path=loopPath();
  // A shallow outer flare accepts the left OUT kickback without a head-on cap.
  if(side<0)for(let i=0;i<20;i++){
    const t=i/20;path[i].set(-2.115+.015*t*t*(3-2*t),LOOP.floor,1.4-2.1*t);
  }
  return path;
}
export function loopWallGeometry(side) {
  return loopWallSection(wallPath(side),side,0,side>0);
}
export function loopCorridor() {
  return [-1,1].flatMap(side=>{
    const g=loopWallGeometry(side),p=g.attributes.position,points=[];
    for(let i=0;i<p.count;i+=6)points.push([p.getX(i),p.getZ(i)]);
    g.dispose();return side<0?points:points.reverse();
  });
}

function backingGeometry(points) {
  const shape=new T.Shape();points.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:LOOP.height,bevelEnabled:false,curveSegments:1,steps:1});g.rotateX(-Math.PI/2);g.translate(0,LOOP.floor,0);return g;
}
function upperBackingGeometry() {
  // A thin continuous rear case hides the rail/guide re-entrant corner. Its
  // right edge ends at the measured rail end, clear of the central bumper.
  const geometry=backingGeometry([[-1.90,-2.45],[-.72,-2.31],[-.72,-2.22],[-1.90,-2.04]]);
  const positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++)if(positions.getY(i)>.05){
    const t=Math.max(0,Math.min(1,(positions.getX(i)+1.90)/1.18));
    positions.setY(i,.28-.11*t);
  }
  geometry.computeVertexNormals();return geometry;
}
export function loopPocketBackings() {
  const path=loopPath(),scoop=[];
  for(let i=5;i<=13;i++){
    const t=path[i+1].clone().sub(path[i-1]).normalize(),normal=new T.Vector3(-t.z,0,t.x);
    const p=path[i].clone().addScaledVector(normal,LOOP.width/2+.01+Math.max(0,1-i/20)*.14);scoop.push([p.x,p.z]);
  }
  scoop.push([-.52,.065],[-1.28,.065],[-1.28,.805]);
  return [
    {name:'scoop-common-support',geometry:backingGeometry(scoop)},
    {name:'upper-bank-common-support',geometry:upperBackingGeometry()},
  ];
}
export function loopHousingProfile() {
  const rear=cabinetBoundaryBoxes().find(b=>b.name==='rear');
  const inner=LOOP.radius+LOOP.width/2+LOOP.wall,hem=.009;
  return {inner,rx:inner+.017,rz:LOOP.turnZ-(rear.center[2]+rear.size[2]/2)-hem,hem,
    rise:Math.min(.09,CABINET_BOUNDARY.top-(LOOP.floor+LOOP.height)-.015)};
}
function housingPoint(angle,t) {
  const h=loopHousingProfile(),rx=h.inner+(h.rx-h.inner)*t,rz=h.inner+(h.rz-h.inner)*t;
  return new T.Vector3(LOOP.turnX-rx*Math.cos(angle),LOOP.floor+LOOP.height+h.rise*Math.sin(t*Math.PI/2)*(.6+.4*Math.sin(angle)),LOOP.turnZ-rz*Math.sin(angle));
}
function closedRolledStock(arc,radius) {
  const roll=new T.TubeGeometry(new T.CatmullRomCurve3(arc),40,radius,8,false);
  const rp=[...roll.attributes.position.array],ri=[...roll.index.array];
  for(const [row,point,reverse] of [[0,arc[0],true],[40,arc.at(-1),false]]){
    const center=rp.length/3;rp.push(point.x,point.y,point.z);
    for(let k=0;k<8;k++)ri.push(center,row*9+(reverse?k+1:k),row*9+(reverse?k:k+1));
  }
  roll.setAttribute('position',new T.Float32BufferAttribute(rp,3));roll.setIndex(ri);
  roll.deleteAttribute('normal');roll.deleteAttribute('uv');roll.computeVertexNormals();return roll;
}
export function loopRearBackingGeometry() {
  // A real horseshoe footprint: neither a straight back nor parallel side
  // walls remain. The convex outer ellipse sheds balls toward either opening.
  const profile=loopHousingProfile(),columns=40,rows=8;
  const positions=[],indices=[],stride=columns+1;
  for(let layer=0;layer<2;layer++)for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
    const point=housingPoint(i/columns*Math.PI,j/rows);
    if(layer)point.y=LOOP.floor;
    positions.push(...point.toArray());
  }
  const count=(rows+1)*stride;
  for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
    const a=j*stride+i,b=a+1,c=a+stride,d=c+1;
    indices.push(a,b,c,b,d,c,a+count,c+count,b+count,b+count,c+count,d+count);
  }
  const edge=[];
  for(let i=0;i<=columns;i++)edge.push(i);
  for(let j=1;j<=rows;j++)edge.push(j*stride+columns);
  for(let i=columns-1;i>=0;i--)edge.push(rows*stride+i);
  for(let j=rows-1;j>0;j--)edge.push(j*stride);
  for(let i=0;i<edge.length;i++){
    const a=edge[i],b=edge[(i+1)%edge.length];indices.push(a,a+count,b,b,a+count,b+count);
  }
  const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(positions,3));shell.setIndex(indices);shell.computeVertexNormals();
  const innerArc=Array.from({length:41},(_,i)=>housingPoint(i/40*Math.PI,0));
  const outerArc=Array.from({length:41},(_,i)=>housingPoint(i/40*Math.PI,1));
  const parts=[{geometry:shell,material:0},
    {geometry:closedRolledStock(innerArc,.007),material:1},
    {geometry:closedRolledStock(outerArc,profile.hem),material:1}];
  // Low countersunk fixing seats follow the crown. Their complete geometry
  // joins this same collision mesh, rather than decorative floating hardware.
  for(const i of[12,28]){
    const {x,y,z}=housingPoint(i/40*Math.PI,.55);
    const seat=new T.CylinderGeometry(.025,.042,.012,16);seat.translate(x,y+.002,z);parts.push({geometry:seat,material:1});
    const head=new T.CylinderGeometry(.018,.018,.006,12);head.translate(x,y+.009,z);parts.push({geometry:head,material:2});
  }
  const result=new T.BufferGeometry(),p=[],n=[],uv=[];
  for(const part of parts.sort((a,b)=>a.material-b.material)){
    const g=part.geometry.index?part.geometry.toNonIndexed():part.geometry,start=p.length/3;
    p.push(...g.attributes.position.array);n.push(...g.attributes.normal.array);
    if(g.attributes.uv)uv.push(...g.attributes.uv.array);else uv.push(...Array(g.attributes.position.count*2).fill(0));
    const group=result.groups.at(-1);
    if(group?.materialIndex===part.material)group.count+=g.attributes.position.count;
    else result.addGroup(start,g.attributes.position.count,part.material);
    if(g!==part.geometry)g.dispose();part.geometry.dispose();
  }
  result.setAttribute('position',new T.Float32BufferAttribute(p,3));result.setAttribute('normal',new T.Float32BufferAttribute(n,3));result.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return result;
}
export function appendLoopContacts(world,R) {
  return [loopWallGeometry(-1),loopWallGeometry(1),loopRearBackingGeometry(),...loopPocketBackings().map(p=>p.geometry)].map(geometry=>{
    const collider=world.createCollider(R.ColliderDesc.trimesh(new Float32Array(geometry.attributes.position.array),geometry.index?new Uint32Array(geometry.index.array):Uint32Array.from({length:geometry.attributes.position.count},(_,i)=>i)).setRestitution(.15).setFriction(.04));
    geometry.dispose();return collider;
  });
}
export class LoopTraversal {
  constructor(){this.corridor=loopCorridor();this.reset();}
  reset(){this.stage=0;this.started=0;}
  contains(p) {
    let inside=false,distance=Infinity;
    for(let i=0,j=this.corridor.length-1;i<this.corridor.length;j=i++){
      const [ax,az]=this.corridor[j],[bx,bz]=this.corridor[i];
      if((az>p.z)!==(bz>p.z)&&p.x<(bx-ax)*(p.z-az)/(bz-az)+ax)inside=!inside;
      const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.z-az)*dz)/(dx*dx+dz*dz)));
      distance=Math.min(distance,Math.hypot(p.x-ax-t*dx,p.z-az-t*dz));
    }
    return inside||distance<.012||(this.stage===2&&p.z>=-4.9&&p.z<=-4.1&&Math.abs(p.x-LOOP_EXIT.x)<=LOOP_EXIT.halfWidth);
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
    // Every real funnel entry, including a left OUT save, earns the same
    // traversal only after reaching the shared narrow throat.
    const mouth=this.crossing(before,p,[LOOP_THROAT.x,LOOP_THROAT.z],[0,-1],LOOP_THROAT.halfWidth);
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
    assets.mesh(loopRearBackingGeometry(),[assets.materials.steel,assets.materials.chrome,assets.materials.dark],this.root).name='loop-formed-rear-housing';
    for(const part of loopPocketBackings())assets.mesh(part.geometry,'steel',this.root).name=part.name;
    // Flush inserts communicate downhill return without tiny text or a
    // raised guide. Wide chevrons remain readable through the elevated wire.
    const route=[[-1.33,-4.42],[-1.50,-4.13],[-1.64,-3.86],[-1.50,-3.20]];
    for(let i=0;i<route.length-1;i++){
      const [x,z]=route[i],[nextX,nextZ]=route[i+1];
      const shape=new T.Shape();[[-.27,-.12],[0,.06],[.27,-.12],[.27,-.01],[0,.17],[-.27,-.01]].forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
      const geometry=new T.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);geometry.rotateY(Math.PI+Math.atan2(nextX-x,nextZ-z));
      assets.mesh(geometry,'brass',this.root,x,.049,z).name='loop-return-chevron-insert';
    }
    const insert=assets.mesh(new T.CircleGeometry(.31,40),'dark',this.root,-1.50,.048,-3.20);insert.rotation.x=-Math.PI/2;insert.name='loop-A-return-insert';
    // A single-letter insert needs a square texture. The generic 512x128
    // label helper leaves nearly all of a one-letter texture transparent.
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#ffdf86';ctx.font='900 116px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('A',64,68);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const letter=assets.mesh(new T.PlaneGeometry(.80,.80),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}),this.root,-1.50,.051,-3.20);
    letter.rotation.x=-Math.PI/2;letter.name='loop-A-return-large-letter';
    const curve=new T.QuadraticBezierCurve3(new T.Vector3(-1.60,0,-3.68),new T.Vector3(-1.61,0,-3.56),new T.Vector3(-1.50,0,-3.51));
    const sides=[[],[]];for(let i=0;i<=8;i++){const t=i/8,p=curve.getPoint(t),v=curve.getTangent(t),n=new T.Vector3(-v.z,0,v.x);for(let side=0;side<2;side++)sides[side].push(p.clone().addScaledVector(n,(side?1:-1)*.035));}
    const lead=new T.Shape();[...sides[0],...sides[1].reverse()].forEach((p,i)=>i?lead.lineTo(p.x,-p.z):lead.moveTo(p.x,-p.z));lead.closePath();
    const leadGeometry=new T.ShapeGeometry(lead);leadGeometry.rotateX(-Math.PI/2);assets.mesh(leadGeometry,'brass',this.root,0,.049,0).name='loop-A-return-leader';
    assets.text(this.root,'LOOP',-1.10,.052,1.75,.34,.11,'#e8bf61');
    assets.batchStaticAssembly(this.root);
  }
}
