import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {MechanicalBumper} from './components/bumper.mjs';
const bounds=o=>new T.Box3().setFromObject(o);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} ~= ${b}`);
const plateHit=(plate,x,z)=>new T.Raycaster(new T.Vector3(x,0,z),new T.Vector3(0,-1,0),0,.3).intersectObject(plate,false).length>0;
function withPart(run){const p=new MechanicalBumper();try{p.root.updateMatrixWorld(true);run(p);}finally{p.dispose();}}
test('bumper common mounting plate is below the full-size board and connects the coil bracket',()=>withPart(p=>{
 const plate=p.root.getObjectByName('underboard-continuous-mount-plate'),b=bounds(plate),bracket=bounds(p.root.getObjectByName('folded-solenoid-bracket'));
 near(b.max.y,-.14);near(b.min.y,-.156);near(b.min.x,-.30);near(b.max.x,.30);
 near(bracket.max.y,b.min.y);assert.equal(p.root.getObjectByName('underboard-mount-feet'),undefined);
 for(const x of [-.235,0,.235])assert.ok(plateHit(plate,x,.11),'continuous transverse material reaches both screw pads and central bracket');
}));
test('bumper plate has real through holes and separate bearing washers and seated screw heads',()=>withPart(p=>{
 const plate=p.root.getObjectByName('underboard-continuous-mount-plate');
 for(const x of [-.254,.254]){assert.equal(plateHit(plate,x,0),false);assert.equal(plateHit(plate,x+.014,0),false);assert.equal(plateHit(plate,x+.023,0),true);}
 for(const x of [-.235,.235])assert.equal(plateHit(plate,x,.14),false);
 const washers=[];p.root.traverse(o=>{if(o.name==='underboard-mount-washer')washers.push(o);});assert.equal(washers.length,2);
 for(const w of washers){const b=bounds(w);near(b.max.y,-.156);near(b.min.y,-.164);}
 const heads=bounds(p.root.getObjectByName('underboard-mount-screws')),shafts=bounds(p.root.getObjectByName('underboard-mount-screw-shanks'));
 near(heads.max.y,-.164);assert.ok(shafts.min.y<heads.max.y&&shafts.max.y>-.14&&shafts.max.y<.04);
}));
test('bumper switch stem and leaf clear the mounting slot throughout directional skirt motion',()=>withPart(p=>{
 const plate=p.root.getObjectByName('underboard-continuous-mount-plate'),stem=p.root.getObjectByName('central-skirt-switch-stem'),leaf=p.root.getObjectByName('central-leaf-switch');
 for(let angle=0;angle<16;angle++)for(let step=0;step<=40;step++){
  p.hit({x:Math.cos(angle*Math.PI/8),z:Math.sin(angle*Math.PI/8)});p.update(step*.19/40);p.root.updateMatrixWorld(true);
  for(const o of [stem,leaf]){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){const v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);assert.equal(plateHit(plate,v.x,v.z),false,'conservative full stem/leaf projection remains within relief');}}
 }
}));
test('bumper moving yokes stay separated from plate and fixed mounts through full stroke',()=>withPart(p=>{
 const plate=p.root.getObjectByName('underboard-continuous-mount-plate');const initial=plate.matrixWorld.toArray();
 for(let step=0;step<=40;step++){p.hit();p.update(step*.19/40);p.root.updateMatrixWorld(true);
  for(const name of ['moving-metal-yoke','moving-fibre-yoke','pull-rod-locknuts','plunger-yoke-retainer'])assert.ok(bounds(p.root.getObjectByName(name)).max.y<-.29,name+' below fixed plate');
  assert.deepEqual(plate.matrixWorld.toArray(),initial);near(p.striker.position.x,0);near(p.striker.position.z,0);
 }
}));

test('bumper bracket fillet welds intersect both fixed plate and bracket',()=>withPart(p=>{
 const welds=p.root.getObjectByName('bracket-to-plate-fillet-welds'),matrix=new T.Matrix4();
 const plate=bounds(p.root.getObjectByName('underboard-continuous-mount-plate')),bracket=bounds(p.root.getObjectByName('folded-solenoid-bracket'));
 welds.geometry.computeBoundingBox();
 for(let i=0;i<welds.count;i++){welds.getMatrixAt(i,matrix);matrix.premultiply(welds.matrixWorld);const b=welds.geometry.boundingBox.clone().applyMatrix4(matrix);assert.ok(b.intersectsBox(plate)&&b.intersectsBox(bracket));assert.ok(b.max.y<-.14);}
}));
