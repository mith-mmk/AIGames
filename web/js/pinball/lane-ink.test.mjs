import test from 'node:test';
import assert from 'node:assert/strict';
import {laneInkStrip} from './playfield-parts.mjs';
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
