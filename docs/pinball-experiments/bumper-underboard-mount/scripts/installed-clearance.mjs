import fs from 'node:fs';
import assert from 'node:assert/strict';
import * as T from '../../../../web/js/vendor/three-0.180.0/three.module.min.js';
import {MechanicalBumper} from '../../../../web/js/pinball/components/bumper.mjs';
import {MechanicalCabinet} from '../../../../web/js/pinball/components/cabinet.mjs';
import {BUMPERS,TABLE} from '../../../../web/js/pinball/layout.mjs';
const cabinet=new MechanicalCabinet();cabinet.root.position.z=TABLE.centerZ;cabinet.root.updateMatrixWorld(true);
const rows=[];
for(const p of BUMPERS){const bumper=new MechanicalBumper();bumper.root.position.set(p.x,0,p.z);bumper.root.updateMatrixWorld(true);
 for(const name of ['underboard-continuous-mount-plate','bracket-to-plate-fillet-welds']){
  const object=bumper.root.getObjectByName(name);object.computeBoundingBox?.();const box=new T.Box3().setFromObject(object);const overlaps=[];
  cabinet.root.traverse(o=>{if(!o.isMesh)return;o.computeBoundingBox?.();const b=new T.Box3().setFromObject(o);const depth=['x','y','z'].map(k=>Math.min(box.max[k],b.max[k])-Math.max(box.min[k],b.min[k]));if(depth.every(x=>x>1e-6))overlaps.push({name:o.name,depth});});
  rows.push({position:p,name,bounds:[box.min.toArray(),box.max.toArray()],overlaps});assert.deepEqual(overlaps,[]);
 }bumper.dispose();
}
cabinet.dispose();
fs.mkdirSync(new URL('../../../../artifacts/pinball/bumper-underboard-replay/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('../../../../artifacts/pinball/bumper-underboard-replay/installed-clearance.json',import.meta.url),JSON.stringify({method:'All installed three full-size plate/weld bounding boxes against every cabinet mesh; positive overlaps over1e-6 rejected. Touching board face allowed. Conservative AABB screen, not all game components or swept triangle certification.',rows},null,2));
console.log('PASS all three plate/weld assemblies clear cabinet solid bounds, allowing intended board contact');
