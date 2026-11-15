import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {MechanicalFlipper} from './components/flipper.mjs';
import {MechanicalCabinet} from './components/cabinet.mjs';
import {WorkshopAssets} from './assets.mjs';
import {LOWER_LAYOUT,TABLE,flipperAngle} from './layout.mjs';
const box=o=>new T.Box3().setFromObject(o);
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-6,`${x} ~= ${y}`);
function fixture(run){for(const right of [false,true]){const p=new MechanicalFlipper({angle:flipperAngle(right,false)});p.root.position.set((right?1:-1)*LOWER_LAYOUT.flipperPivot[0],LOWER_LAYOUT.flipperPivot[1],LOWER_LAYOUT.flipperPivot[2]);p.root.updateMatrixWorld(true);try{run(p,right);}finally{p.dispose();}}}
const positiveOverlap=(a,b)=>['x','y','z'].every(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k])>1e-6);
test('flipper entire fixed actuator now clears the board and has four connected mounting stacks',()=>fixture(p=>{
 p.actuationFixed.traverse(o=>{if(o.isMesh&&!o.name.startsWith('board-mount-shank'))assert.ok(box(o).max.y<=-.14+1e-6,o.name+' below board');});
 const plate=box(p.root.getObjectByName('underboard-stamped-baseplate'));near(plate.max.y,-.427);near(plate.min.y,-.455);
 for(let i=0;i<4;i++){const spacer=box(p.root.getObjectByName('board-mount-spacer-'+i)),washer=box(p.root.getObjectByName('board-mount-washer-'+i)),head=box(p.root.getObjectByName('board-mount-hex-head-'+i)),shank=box(p.root.getObjectByName('board-mount-shank-'+i));near(spacer.max.y,-.14);near(spacer.min.y,plate.max.y);near(washer.max.y,plate.min.y);near(head.max.y,washer.min.y);assert.ok(shank.min.y<head.max.y&&shank.max.y>-.14&&shank.max.y<.04);}
}));
test('flipper spacers avoid fixed coil hardware and complete crank-link stroke',()=>fixture((p,right)=>{
 for(let step=0;step<=80;step++){p.setAngle(flipperAngle(right,false)+(flipperAngle(right,true)-flipperAngle(right,false))*step/80);p.root.updateMatrixWorld(true);
  for(let i=0;i<4;i++){const b=box(p.root.getObjectByName('board-mount-spacer-'+i));for(const frame of [p.actuationFixed,p.actuationMoving])frame.traverse(o=>{if(!o.isMesh||o.name.startsWith('board-mount-')||o.name==='underboard-stamped-baseplate')return;if(positiveOverlap(b,box(o))){
   // A rotated crank AABB can overlap a corner post while its complete radial
   // envelope remains clear. Prove that narrower bound, do not waive contact.
   const center=b.getCenter(new T.Vector3()),postRadius=.036*p.sz;let movingRadius=0;
   const positions=o.geometry.attributes.position;for(let v=0;v<positions.count;v++){const q=new T.Vector3().fromBufferAttribute(positions,v).applyMatrix4(o.matrixWorld);movingRadius=Math.max(movingRadius,Math.hypot(q.x-p.root.position.x,q.z-p.root.position.z));}
   const minPostRadius=Math.hypot(center.x-p.root.position.x,center.z-p.root.position.z)-postRadius;
   assert.ok(minPostRadius>movingRadius,`${i} versus ${o.name} at ${step}: radial ${minPostRadius} > ${movingRadius}`);
  }});}
  const shaft=box(p.root.getObjectByName('pivot-shaft')),clamp=box(p.root.getObjectByName('crank-shaft-clamp'));assert.ok(positiveOverlap(shaft,clamp));near(p.root.userData.actuation.measuredLinkLength,p.actuation.linkLength);
 }
}));
test('flipper board holes and mounting bolts are coaxial with real clearance',()=>fixture(p=>{
 const plate=p.root.getObjectByName('underboard-stamped-baseplate');
 for(const [x,z] of [[-.22,-.98],[.38,-.98],[-.22,.21],[.38,.21]]){const origin=p.actuationFixed.localToWorld(new T.Vector3(x*p.sx,0,z*p.sz));const ray=new T.Raycaster(origin,new T.Vector3(0,-1,0),0,1);assert.equal(ray.intersectObject(plate,false).length,0);origin.x+=.020;assert.ok(new T.Raycaster(origin,new T.Vector3(0,-1,0),0,1).intersectObject(plate,false).length>0);}
}));
test('flipper mounting frame clears installed cabinet solid bounds',()=>{
 const c=new MechanicalCabinet();c.root.position.z=TABLE.centerZ;c.root.updateMatrixWorld(true);
 try{fixture(p=>{for(const name of ['underboard-stamped-baseplate',...Array.from({length:4},(_,i)=>'board-mount-spacer-'+i)]){const b=box(p.root.getObjectByName(name));c.root.traverse(o=>{if(o.isMesh)assert.equal(positiveOverlap(b,box(o)),false,name+' versus '+o.name);});}});}finally{c.dispose();}
});
test('flipper lowered actuator keeps owned moving meshes live after production batching',()=>fixture((p,right)=>{
 const assets=new WorkshopAssets();try{assets.batchStaticAssembly(p.root,new Set(Object.values(p).filter(o=>o?.isMesh)),p.geometries);const before=p.sliderPin.position.clone();p.setAngle(flipperAngle(right,true));p.root.updateMatrixWorld(true);assert.ok(p.sliderRod.parent===p.actuationFixed&&p.actuatorLink.parent===p.actuationFixed);assert.ok(p.sliderPin.position.distanceTo(before)>.001);near(p.root.userData.actuation.measuredLinkLength,p.actuation.linkLength);near(p.actuationFixed.position.y,-.16);near(p.actuationMoving.position.y,-.16);}finally{for(const m of Object.values(assets.materials))m.dispose();}
}));
