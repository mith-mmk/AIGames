import test from 'node:test';
import assert from 'node:assert/strict';
import {laneInkStrip} from './playfield-parts.mjs';
import {LOWER_LAYOUT} from './layout.mjs';

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
