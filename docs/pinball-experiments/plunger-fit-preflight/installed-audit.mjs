import fs from 'node:fs';
const output=new URL('../../../artifacts/pinball/plunger-fit-replay/',import.meta.url);fs.mkdirSync(output,{recursive:true});
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
import {MechanicalCabinet} from '../../../web/js/pinball/components/cabinet.mjs';
import {MechanicalPlunger} from './plunger-prototype.mjs';
const p=new MechanicalPlunger(),c=new MechanicalCabinet();p.root.position.set(2.53,.175,4.6);c.root.position.z=.2;
const box=o=>{o.updateWorldMatrix(true,true);return new T.Box3().setFromObject(o);};
const over=(a,b)=>['x','y','z'].every(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k])>1e-6);
const overlaps=new Map(),stop=new T.Box3(new T.Vector3(2.26,-.1,5.82),new T.Vector3(2.80,.7,5.98));let stopSamples=0;
for(let i=0;i<=100;i++){p.setPull(i/100);const b=box(p.knob);if(over(b,stop))stopSamples++;c.root.traverse(o=>{if(o.isMesh&&over(b,box(o))){const entry=overlaps.get(o.name)??{name:o.name,firstPull:i/100,lastPull:i/100,bounds:{min:box(o).min.toArray(),max:box(o).max.toArray()}};entry.lastPull=i/100;overlaps.set(o.name,entry);}});}
const result={status:'BLOCKED: not accepted for integration',samples:101,cabinetBroadPhaseCandidates:[...overlaps.values()],physicsFrontStop:{bounds:{min:stop.min.toArray(),max:stop.max.toArray()},overlappingSamples:stopSamples},interpretation:'Cabinet candidates are positive AABB overlaps, not all confirmed mesh intersections. The existing box physics stop is a real contact-model conflict. Initial board/rails/timber checks omit apron and cross-rail solids and are NOT whole-installation clearance evidence.',requiredNextStep:'Reconcile knob/rod profile, real apron/cross-rail solids, and shooter front-stop contact before integration. Do not remove obstacles merely to clear the prototype.'};
fs.writeFileSync(new URL('installed-audit.json',output),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));p.dispose();c.dispose();
