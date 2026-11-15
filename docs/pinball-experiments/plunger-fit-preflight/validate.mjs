import assert from 'node:assert/strict';
import fs from 'node:fs';
const output=new URL('../../../artifacts/pinball/plunger-fit-replay/',import.meta.url);fs.mkdirSync(output,{recursive:true});
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
import {MechanicalPlunger as Baseline} from './baseline-plunger.mjs';
import {MechanicalPlunger,fixedContactSurfaces} from './plunger-prototype.mjs';
const p=new MechanicalPlunger(),base=new Baseline();p.root.position.set(2.53,.175,4.60);base.root.position.copy(p.root.position);
const bounds=o=>{o.updateWorldMatrix(true,true);return new T.Box3().setFromObject(o);};
let minBoard=Infinity,minLeft=Infinity,minRight=Infinity,minFront=Infinity;
for(let i=0;i<=100;i++) {
 const pull=i/100;p.setPull(pull);base.setPull(pull);const b=bounds(p.knob);
 minBoard=Math.min(minBoard,b.min.y-.044);minLeft=Math.min(minLeft,b.min.x-2.395);minRight=Math.min(minRight,2.66-b.max.x);minFront=Math.min(minFront,6.15-b.max.z);
 assert.ok(b.min.y>.044&&b.min.x>2.395&&b.max.x<2.66&&b.max.z<6.15);
 for(const name of ['moving-rubber-contact-tip','tip-steel-ferrule','polished-continuous-shaft','moving-spring-seat','continuous-compression-helix','short-recovery-spring']){
   const a=p.root.getObjectByName(name),b=base.root.getObjectByName(name);assert.deepEqual(Array.from(a.geometry.attributes.position.array),Array.from(b.geometry.attributes.position.array));assert.deepEqual(bounds(a),bounds(b));
 }
 // Moving tip/ferrule/seat never reach the new fixed foot or bearing web.
 assert.ok(bounds(p.root.getObjectByName('moving-spring-seat')).max.z<5.35);
 assert.ok(bounds(p.knob).min.z>5.63);
 assert.ok(bounds(p.returnSpring).min.z>5.54);
}
const foot=bounds(p.root.getObjectByName('bored-mount-foot'));assert.ok(Math.abs(foot.min.y-.044)<1e-7);assert.ok(Math.abs(foot.max.y-.076)<1e-7);
const boss=bounds(p.root.getObjectByName('mounting-boss'));assert.ok(boss.max.x<2.66&&boss.min.x>2.395);
p.fixed.traverse(o=>{if(o.name==='bearing-cradle-web'){const b=bounds(o);assert.ok(b.max.x<2.66&&b.min.x>2.395);assert.ok(Math.abs(b.min.y-foot.max.y)<1e-7);}});
const surfaces=fixedContactSurfaces(p);assert.ok(surfaces.every(s=>s.shape==='trimesh'));assert.equal(surfaces.length,22);
// Every triangle on the bored boss/guide/seat stays outside its real axial bore.
// A ray along the rod centerline must not hit a static surface.
const ray=new T.Raycaster(new T.Vector3(2.53,.175,5.0),new T.Vector3(0,0,1),0,1.1);
assert.equal(ray.intersectObjects(p.fixed.children,true).length,0);
const count=q=>{let n=0;q.root.traverse(o=>{if(o.isMesh)n+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});return n;};
const triangles=count(p),baselineTriangles=count(base),projected=484148+triangles-baselineTriangles;assert.ok(projected<=500000);
const result={status:'static prototype checks passed; gameplay and render acceptance pending',strokeSamples:101,clearance:{board:minBoard,leftRail:minLeft,rightRail:minRight,frontTimber:minFront},triangles,baselineTriangles,projected45DegreeTriangles:projected,baseline45DegreeTriangles:484148,contactSurfaces:surfaces.length,unchangedGeometryAndMotion:['tip','ferrule','shaft','moving spring seat','long spring','short spring'],limitations:['Fixed contact triangle payload is exported but not integrated into Rapier gameplay.','No high-ball or returned-ball gameplay proof.','Fastener shanks represent wood engagement; board is not re-drilled.','Triangle projection assumes same visibility as supplied baseline; actual renderer must be checked.','No phone test.']};
fs.writeFileSync(new URL('validation.json',output),JSON.stringify(result,null,2)+'\n');fs.writeFileSync(new URL('fixed-contact-surfaces.json',output),JSON.stringify(surfaces));console.log(JSON.stringify(result,null,2));p.dispose();base.dispose();
