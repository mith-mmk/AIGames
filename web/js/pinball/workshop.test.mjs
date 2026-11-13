import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkshopAssets } from './assets.mjs';
import { WorkshopRoom } from './workshop.mjs';

test('workshop scenery has finite attached geometry and stays independent of physics',()=>{
 const prior=globalThis.document;
 const gradient={addColorStop(){}};
 const context=new Proxy({measureText:()=>({width:60}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{}});
 globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
 try {
  const assets=new WorkshopAssets(),room=new WorkshopRoom(assets),root=room.build();
  assert.equal(root.name,'workshop-scenery');
  assert.ok(root.getObjectByName('robobuddy-city-architecture'));
  assert.ok(root.getObjectByName('chappy-city-balcony'));
  assert.equal(root.getObjectByName('workshop-wall-machine'),undefined,'retired gearwall must not reappear');
  assert.ok(root.getObjectByName('chappy-workbench-friend'),'animated mascot retained');
  root.updateMatrixWorld(true);
  let vertices=0;const geometries=new Set(),materials=new Set(),textures=new Set();
  root.traverse(o=>{assert.ok(o.matrixWorld.elements.every(Number.isFinite));if(o.geometry){geometries.add(o.geometry);for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v));vertices+=o.geometry.attributes.position.count;}if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if(m.map)textures.add(m.map);}});
  assert.ok(vertices>1000,'constructed scenery is present');
  assert.equal(assets.mechanical.flippers.length,0,'scenery did not build playable hardware or physics');
  for(const g of geometries)g.dispose();for(const t of textures)t.dispose();for(const m of new Set([...materials,...Object.values(assets.materials)]))m.dispose();
 } finally {if(prior===undefined)delete globalThis.document;else globalThis.document=prior;}
});
