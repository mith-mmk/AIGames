import * as T from "../vendor/three-0.180.0/three.module.min.js";
import {targetCarrierParts,targetFrontNormal,targetDimensions,targetContactBoxes} from "./mechanical-contact.mjs";
import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGET_BANKS,MINI_BUMPERS} from './layout.mjs';
import {MechanicalTarget} from './components/sling-target.mjs';
import {PinballPhysics} from './physics.mjs';
test('reference banks have three upper wrenches, two middle wrenches and three robots',()=>{
 assert.deepEqual(MINI_BUMPERS,[]);
 assert.deepEqual(TARGET_BANKS.map(b=>[b.key,b.count,b.glyph]),[['left-upper',3,'wrench'],['left-middle',2,'wrench'],['right-side',3,'robot']]);
 for(const glyph of ['wrench','robot']){
 const p=new MechanicalTarget({glyph,width:.31,height:.30});
 for(const name of ['through-hinge-pin','rear-return-coil','replaceable-strike-plate',`strike-face-${glyph}`])assert.ok(p.root.getObjectByName(name));
 p.hit();p.update(.035);assert.ok(p.pivot.rotation.x<0);p.dispose();
 }
});
test('every installed reference target scores from a real front contact and identifies its moving part',async()=>{
 for(const bank of TARGET_BANKS)for(let i=0;i<bank.count;i++){
 const g=await PinballPhysics.create();
 try{
 g.launch();g.state.kickbackCharges=0;
 const dx=bank.b[0]-bank.a[0],dz=bank.b[2]-bank.a[2],[nx,nz]=targetFrontNormal(bank),t=(i+.5)/bank.count;
 g.ball.setTranslation({x:bank.a[0]+dx*t+nx*.50,y:.23,z:bank.a[2]+dz*t+nz*.50},true);
 g.ball.setLinvel({x:-nx*5,y:0,z:-nz*5},true);
 let hit;
 for(let k=0;k<50&&!hit;k++){g.step(1/120);hit=g.takeVisualHits().find(h=>h.targetId===`${bank.key}:${i}`);}
 assert.ok(hit,`${bank.key}:${i} real contact`);assert.equal(hit.type,'bank');assert.ok(g.state.score>=75);
 const part=new MechanicalTarget({glyph:bank.glyph,...targetDimensions(bank)});part.hit();part.update(.035);assert.ok(part.pivot.rotation.x<0);part.dispose();
 }finally{g.dispose();}
 }
});

test('target strike boxes follow declared height without raising the ground contact edge',()=>{
 for(const bank of TARGET_BANKS){const d=targetDimensions(bank),boxes=targetContactBoxes(d);assert.equal(d.height,.50);assert.ok(Math.abs(boxes[0][3]-boxes[0][1]-.164)<1e-9);assert.ok(Math.abs(boxes[0][3]+boxes[0][1]-.676)<1e-9);}
});

test('derived contact bounds match the actual three extruded strike meshes',()=>{
 const names=['thick-moulded-target-body','raised-metal-face-bezel','replaceable-strike-plate'];
 for(const bank of TARGET_BANKS){const d=targetDimensions(bank),p=new MechanicalTarget(d);p.root.updateMatrixWorld(true);
 targetContactBoxes(d).forEach(([hx,hy,hz,cy,cz],i)=>{
 const b=new T.Box3().setFromObject(p.root.getObjectByName(names[i]));
 for(const [actual,expected] of [[b.min.x,-hx],[b.max.x,hx],[b.min.y,cy-hy],[b.max.y,cy+hy],[b.min.z,cz-hz],[b.max.z,cz+hz]])assert.ok(Math.abs(actual-expected)<1e-6,`${bank.key} ${names[i]}`);
 });p.dispose();}
});



test('carrier has formed rim, separate rear plate, fixed studs and a continuous rounded mount',()=>{
 for(const bank of TARGET_BANKS){const parts=targetCarrierParts(bank);if(bank.count!==3){assert.deepEqual(parts,[]);continue;}
 for(const name of ['formed-silver-aperture-carrier','black-inset-aperture-bezel','sealed-rear-service-plate','continuous-rounded-rear-mount-rail'])assert.ok(parts.some(p=>p.name===name));
 assert.equal(parts.filter(p=>p.name==='carrier-stud').length,3);
 for(const p of parts){assert.ok([...p.geometry.attributes.position.array].every(Number.isFinite));p.geometry.dispose();}
 }
});
test('both captured carrier pinch positions drain without rescue',async()=>{
 for(const p of [[.927833,.171267,-.598225],[1.43595,.17127,-.257999]]){const g=await PinballPhysics.create();try{g.launch(.55);g.ball.setTranslation({x:p[0],y:p[1],z:p[2]},true);g.ball.setLinvel({x:0,y:0,z:0},true);for(let i=0;i<14400&&g.state.phase==='playing';i++)g.step(1/120);assert.equal(g.state.phase,'ready',JSON.stringify(p));}finally{g.dispose();}}
});
