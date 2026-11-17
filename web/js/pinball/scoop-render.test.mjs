import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkshopAssets } from './assets.mjs';
import { MechanicalScoop, SCOOP, scoopContactBoxes } from './scoop.mjs';

test('scoop panels leave a ball-sized mouth and use shared installed dimensions',()=>{
  const panels=scoopContactBoxes();
  assert.equal(panels.length,4);
  assert.ok(SCOOP.width>2*.135);
  const roof=panels.find(p=>p.name==='chamber-roof');
  assert.ok(roof.center[1]-roof.size[1]/2>.445);
  for(const p of panels)for(const n of [...p.center,...p.size])assert.ok(Number.isFinite(n));
  assert.equal(panels.some(p=>p.name==='front'),false);
});

test('scoop renderer has finite geometry and distinct target/collection feedback',()=>{
  const saved=Object.getOwnPropertyDescriptor(globalThis,'document');
  const ctx=new Proxy({}, {get:(_,k)=>k==='measureText'?()=>({width:10}):k.startsWith('create')?()=>({addColorStop(){}}):()=>{}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>ctx})}});
  const a=new WorkshopAssets();let scoop;
  try {
    scoop=new MechanicalScoop(a);let vertices=0;
    scoop.root.traverse(o=>{if(o.geometry){vertices+=o.geometry.attributes.position.count;assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});
    assert.ok(vertices>500&&vertices<20000);
    scoop.update({targets:[true,false,true],lit:false});
    assert.deepEqual(scoop.lamps.map(m=>m.material.emissiveIntensity),[1.2,.02,1.2]);
    assert.equal(scoop.arrow.material.emissiveIntensity,.02);
    scoop.update({targets:[true,true,true],lit:true});
    assert.equal(scoop.arrow.material.emissiveIntensity,1.5);
    scoop.update({targets:[false,false,false],lit:false});
    assert.deepEqual(scoop.lamps.map(m=>m.material.emissiveIntensity),[.02,.02,.02]);
  } finally {
    scoop?.root.traverse(o=>o.geometry?.dispose());
    for(const m of scoop?.lamps??[])m.material.dispose();scoop?.arrow.material.dispose();
    for(const material of Object.values(a.materials))material.dispose();
    if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;
  }
});
