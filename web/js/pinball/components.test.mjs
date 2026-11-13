import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import { MechanicalFlipper } from './components/flipper.mjs';
import { MechanicalBumper } from './components/bumper.mjs';
import { MechanicalPlunger } from './components/plunger.mjs';
import { MechanicalSling, MechanicalTarget } from './components/sling-target.mjs';
import { MechanicalRamp, MechanicalWireform } from './components/ramp-wire.mjs';
import { MechanicalCabinet } from './components/cabinet.mjs';
for(const Model of [MechanicalFlipper,MechanicalBumper,MechanicalPlunger,MechanicalSling,MechanicalTarget,MechanicalRamp,MechanicalWireform,MechanicalCabinet]) {
 test(`${Model.name}: finite standalone geometry, motion and owned-resource cleanup`,()=>{
  const parent=new T.Group(),part=new Model();parent.add(part.root);
  let vertices=0;part.root.traverse(o=>{if(o.geometry){const a=o.geometry.attributes.position.array;vertices+=a.length/3;for(const v of a)assert.ok(Number.isFinite(v));}});assert.ok(vertices>100);
  part.setAngle?.(.5);part.hit?.();part.setPull?.(.8);part.update?.(.03);part.release?.();for(let i=0;i<120;i++)part.update?.(1/60);
  part.root.updateMatrixWorld(true);part.root.traverse(o=>assert.ok(o.matrixWorld.elements.every(Number.isFinite)));
  assert.equal(typeof part.dispose,'function');part.dispose();part.dispose();assert.equal(part.root.parent,null);
 });
}
test('mechanical model invalid scalar dimensions are rejected',()=>{
 assert.throws(()=>new MechanicalBumper({radius:NaN}));
 assert.throws(()=>new MechanicalTarget({width:-1}));
});

test('cabinet inspection visibility survives production static batching',async()=>{
 const {WorkshopAssets}=await import('./assets.mjs');
 const cabinet=new MechanicalCabinet(),assets=new WorkshopAssets();
 assets.batchStaticAssembly(cabinet.root,new Set(),cabinet.geometries);
 for(const mode of ['assembled','cutaway','underside','assembled']) {
  cabinet.setInspectionMode(mode);
  for(const name of ['removable-bottom-panel','front-lockbar-timber','cabinet-side-1']) {
   const panel=cabinet.root.getObjectByName(name);
   assert.ok(panel,`${name} remains an independent inspection panel`);
   assert.equal(panel.visible,name==='removable-bottom-panel'?mode==='assembled':mode!=='cutaway');
  }
 }
 cabinet.dispose();for(const material of Object.values(assets.materials))material.dispose();
});
