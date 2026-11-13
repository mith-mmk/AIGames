import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {MechanicalCabinet} from './components/cabinet.mjs';

test('reference cabinet includes supported backbox, speakers, apron and rear tower',()=>{
 const c=new MechanicalCabinet();
 for(const name of ['reference-backglass-frame','backbox-support-column--1','backbox-support-column-1','speaker-concave-cone--1','speaker-grille-1-4','live-score-display','front-hazard-apron','rear-right-power-tower','tower-red-service-pipe','tower-spun-metal-housing'])assert.ok(c.root.getObjectByName(name),name);
 const tower=c.root.getObjectByName('rear-right-power-tower');
 assert.equal(tower.userData.visualOnly,true);
 // Elevated shelf clears the ball; low braces stay outside the shooter.
 const box=new T.Box3().setFromObject(tower);
 assert.ok(box.max.x>c.parameters.width/2,'tower sits on exterior shoulder');
 const shelf=new T.Box3().setFromObject(tower.getObjectByName('tower-rear-support-shelf'));
 assert.ok(shelf.min.y>.59,'overhanging shelf clears active ball top');
 for(const side of [-1,1]){
   const brace=new T.Box3().setFromObject(tower.getObjectByName(`tower-shelf-brace-${side}`));
   assert.ok(brace.min.x>c.parameters.width/2,'brace stays outside active shooter');
 }
 assert.equal(c.materials.wood.color.getHex(),0x17283e);
 c.dispose();c.dispose();
});

test('score drawing is cached and uses live score plus ball number',()=>{
 const c=new MechanicalCabinet(),draw=[];
 const ctx={fillRect(){},fillText(...v){draw.push(v);}};
 c.referenceDress.scoreCanvas={getContext(){return ctx;}};
 c.referenceDress.scoreTexture={needsUpdate:false};
 c.updateSnapshot({score:12345,ballNumber:2});
 assert.equal(draw[0][0],'12,345');assert.match(draw[1][0],/BALL 2/);
 c.updateSnapshot({score:12345,ballNumber:2});assert.equal(draw.length,2);
 c.updateSnapshot({score:12346,ballNumber:2});assert.equal(draw.length,4);
 assert.equal(c.referenceDress.scoreTexture.needsUpdate,true);
 c.dispose();
});

test('formed collection apron preserves central and outlane throats after active drain',()=>{
 const c=new MechanicalCabinet(),a=c.root.getObjectByName('formed-collection-apron');
 c.root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(a);
 assert.ok(box.min.z>4.65,'no visible apron on active ball passage');
 for(const x of [0,-2.1,2.1]){
   const ray=new T.Raycaster(new T.Vector3(x,2,5.18),new T.Vector3(0,-1,0));
   assert.ok(ray.intersectObject(a,true).every(hit=>hit.point.y<-.1),`open deck throat at ${x}; only recessed basket permitted`);
 }
 for(const x of [-1.2,1.2]){
   const ray=new T.Raycaster(new T.Vector3(x,2,5.18),new T.Vector3(0,-1,0));
   assert.ok(ray.intersectObject(a,true).length>0,'formed service wing exists');
 }
 c.dispose();
});

 test('short supported cabinet keeps collection apron within its drain opening',()=>{
 const c=new MechanicalCabinet({length:8}),a=c.root.getObjectByName('formed-collection-apron');
 c.root.updateMatrixWorld(true);
 const box=new T.Box3().setFromObject(a),L=c.parameters.length/2;
 assert.ok(box.min.z>L-1.13);assert.ok(box.max.z<L-.04,'formed front edge stays inside cabinet');
 for(const x of [0,-2.1,2.1]){
   const ray=new T.Raycaster(new T.Vector3(x,2,L-.57),new T.Vector3(0,-1,0));
   assert.ok(ray.intersectObject(a,true).every(hit=>hit.point.y<-.1),'no basket at deck height');
 }
 c.dispose();
});

test('inner skyline is a rear-mounted relief outside live board',()=>{const c=new MechanicalCabinet();const p=c.root.getObjectByName('supported-inner-city-backplate');assert.ok(p);const b=new T.Box3().setFromObject(p);assert.ok(b.max.z < -c.parameters.length/2);assert.ok(p.getObjectByName('city-relief-building-14'));c.dispose();});
