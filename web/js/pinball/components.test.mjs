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

test('sling silver cover, gold skirt and corner lamps retain functional rubber/kicker assembly',async()=>{
 const {LOWER_LAYOUT}=await import('./layout.mjs');
 const points=LOWER_LAYOUT.slingVertices.map(([x,z])=>[x-LOWER_LAYOUT.slingCenter[0],z-LOWER_LAYOUT.slingCenter[1]]);
 const part=new MechanicalSling({points});
 try {
  for(const name of ['moulded-cover-with-service-window','formed-gold-perimeter-skirt','recessed-plastic-cover-insert','corner-lens-chrome-bezel','corner-indicator-lens','tensioned-rubber','guided-solenoid-plunger','pivoted-kicker-arm','plunger-return-spring'])assert.ok(part.root.getObjectByName(name),name);
  const skirt=part.root.getObjectByName('formed-gold-perimeter-skirt');skirt.geometry.computeBoundingBox();
  assert.ok(skirt.geometry.boundingBox.max.y-skirt.geometry.boundingBox.min.y>.10,'formed sidewall has real vertical depth');
  let lamps=0;part.root.traverse(o=>{if(o.name==='corner-indicator-lens')lamps++;});assert.equal(lamps,3);
  part.hit();part.update(.035);assert.ok(Math.abs(part.kicker.rotation.x)>.001);
 }finally{part.dispose();}
});

test('bumper lens and bounded internal lamp provide warm light without extra shadows',()=>{
 const p=new MechanicalBumper();
 try{
  const lamp=p.root.getObjectByName('bumper-internal-warm-lamp');
  assert.ok(lamp.isPointLight);assert.equal(lamp.castShadow,false);
  assert.equal(lamp.color.getHex(),0xffb51e);assert.equal(lamp.distance,1.65);
  assert.equal(lamp.intensity,1.25);assert.equal(lamp.decay,2);
  assert.equal(p.materials.lens.emissiveIntensity,1.1);
 }finally{p.dispose();}
});
