import test from 'node:test';
import assert from 'node:assert/strict';
import {laneInkStrip,PlayfieldParts} from './playfield-parts.mjs';
import {LOWER_LAYOUT,lowerLanePaths} from './layout.mjs';
import {slingContactPoints} from './mechanical-contact.mjs';
import * as T from '../vendor/three-0.180.0/three.module.min.js';

test('printed IN bands mirror the verified centerline and add no raised route',()=>{
 const left=laneInkStrip(LOWER_LAYOUT.inlaneInkPath,-1),right=laneInkStrip(LOWER_LAYOUT.inlaneInkPath,1);
 try {
  const l=left.attributes.position,r=right.attributes.position;
  assert.equal(r.count,LOWER_LAYOUT.inlaneInkPath.length*2);
  assert.equal(right.index.count,(LOWER_LAYOUT.inlaneInkPath.length-1)*6);
  for(let i=0;i<LOWER_LAYOUT.inlaneInkPath.length;i++){
   const [x,z,w]=LOWER_LAYOUT.inlaneInkPath[i];
   for(let j=0;j<2;j++){
    const k=2*i+j;assert.ok(Math.abs(r.getY(k)-.046)<1e-8);
    assert.ok(Math.hypot(r.getX(k)-x,r.getZ(k)-z)<=w/2+1e-6);
    assert.ok(Math.abs(l.getX(2*i+1-j)+r.getX(k))<1e-6);
    assert.ok(Math.abs(l.getZ(2*i+1-j)-r.getZ(k))<1e-6);
   }
  }
 }finally{left.dispose();right.dispose();}
});

test('larger lane labels follow the open passages without printing over rails',()=>{
 const paths=lowerLanePaths(1).map(path=>[path.map(([x,,z])=>new T.Vector2(x,z)),LOWER_LAYOUT.guideRadius]);
 paths.push([slingContactPoints(LOWER_LAYOUT.slingVertices).map(([x,,z])=>new T.Vector2(x,z)),.025]);
 for(const [name,[x,z,angle,width,height]] of Object.entries(LOWER_LAYOUT.laneInserts)){
  for(let i=0;i<=12;i++)for(let j=0;j<=24;j++){
   const u=width*(i/12-.5),v=height*(j/24-.5),p=new T.Vector2(x+u*Math.cos(angle)-v*Math.sin(angle),z-u*Math.sin(angle)-v*Math.cos(angle));
   for(const [path,radius] of paths)for(let k=1;k<path.length;k++){
    const a=path[k-1],d=path[k].clone().sub(a),t=Math.max(0,Math.min(1,p.clone().sub(a).dot(d)/d.lengthSq()));
    assert.ok(p.distanceTo(a.clone().addScaledVector(d,t))>radius+.01,`${name} label crosses a rail at ${p.x},${p.y}`);
   }
  }
 }
});


for(const side of [-1,1])for(const label of ['IN','OUT'])test(`actual ${side<0?'left':'right'} ${label} canvas arrow maps to the intended table direction`,()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'document'),paths=[];let current=[];
 const ctx={fillRect(){},strokeRect(){},fillText(){},beginPath(){current=[];},moveTo(x,y){current.push([x,y]);},lineTo(x,y){current.push([x,y]);},closePath(){},fill(){paths.push(current);}};
 const canvas={width:0,height:0,getContext:()=>ctx};
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(name){assert.equal(name,'canvas');return canvas;}}});
 const root=new T.Group();
 try{
  const [x,z,angle,width,height]=LOWER_LAYOUT.laneInserts[label.toLowerCase()];
  new PlayfieldParts({root}).laneInsert(side*x,z,label,0xffffff,side*angle,width,height);
  const mesh=root.children[0];root.updateMatrixWorld(true);
  assert.equal(paths.length,1);const arrow=paths[0];assert.equal(arrow.length,4);
  assert.deepEqual(arrow.map(p=>p[0]),[128,55,128,201]);
  assert.equal(Math.min(...arrow.map(p=>p[1])),100);assert.equal(Math.max(...arrow.map(p=>p[1])),195);
  // Locate the actual drawn canvas points on actual mesh UV triangles, then
  // transform those interpolated vertices. Do not duplicate the production reflection.
  function point([cx,cy]){
   const uvPoint=new T.Vector3(cx/canvas.width,1-cy/canvas.height,0),g=mesh.geometry;
   for(let i=0;i<g.index.count;i+=3){
    const ids=[0,1,2].map(j=>g.index.getX(i+j));
    const uv=ids.map(j=>new T.Vector3(g.attributes.uv.getX(j),g.attributes.uv.getY(j),0));
    const weights=new T.Vector3();T.Triangle.getBarycoord(uvPoint,...uv,weights);
    if(Math.min(weights.x,weights.y,weights.z)<-1e-7)continue;
    const p=new T.Vector3();ids.forEach((j,k)=>p.addScaledVector(new T.Vector3().fromBufferAttribute(g.attributes.position,j),weights.getComponent(k)));
    return mesh.localToWorld(p);
   }
   assert.fail('drawn arrow point is outside actual mesh UVs');
  }
  const tip=point(arrow[0]),wings=point(arrow[1]).add(point(arrow[3])).multiplyScalar(.5),direction=tip.sub(wings);
  assert.ok(Math.abs(direction.y)<1e-7);
  assert.ok(label==='OUT'?direction.z>0:direction.z<0,`${label} table Z direction ${direction.z}`);
  assert.equal(mesh.name,`${label.toLowerCase()}-lane-printed-insert`);
 }finally{
  root.traverse(o=>{o.geometry?.dispose();o.material?.map?.dispose();o.material?.dispose();});
  if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;
 }
});
