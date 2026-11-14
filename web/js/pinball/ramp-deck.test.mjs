import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {rampDeckGeometry,RAMP_DECK_REPAIR} from './ramp-deck.mjs';
import {sampleRamp} from './ramp-geometry.mjs';
import {PinballPhysics} from './physics.mjs';
import {RAMP_HARDWARE_DIMENSIONS} from './ramp-hardware.mjs';

const triangleKey=points=>points.map(p=>p.map(Math.fround).join(',')).sort().join(';');
function triangleSet(geometry){
 const p=geometry.attributes.position.array,ix=geometry.index.array,result=new Set();
 for(let i=0;i<ix.length;i+=3)result.add(triangleKey([...ix.slice(i,i+3)].map(j=>[...p.slice(j*3,j*3+3)])));
 return result;
}
test('right deck repair preserves every unrelated original triangle and generic rows',()=>{
 const rows=sampleRamp(),g=rampDeckGeometry(rows,'top'),triangles=triangleSet(g);let checked=0;
 assert.throws(()=>rampDeckGeometry(rows,'typo'),RangeError);
 try{
  assert.deepEqual(g.userData.repairStrips,[77,78,79]);
  for(let i=0;i<240;i++){
   if(i>=76&&i<=80)continue; // These two neighbors only receive conforming splits.
   const p=[rows[i].left,rows[i].right,rows[i+1].left,rows[i+1].right].map(v=>v.toArray());
   for(const t of [[0,1,2],[1,3,2]]){assert.ok(triangles.has(triangleKey(t.map(j=>p[j]))),`strip ${i}`);checked++;}
  }
  assert.equal(checked,470);
  const generic=rampDeckGeometry(rows.map(({p,left,right})=>({p,left,right})),'top');
  try{assert.deepEqual(generic.userData.repairStrips,[]);assert.equal(generic.index.count,1440);}finally{generic.dispose();}
 }finally{g.dispose();}
});

test('repair follows route parameters at alternate sample counts and keeps a closed constant-thickness sheet',()=>{
 for(const count of [240,300,480]){
  const rows=sampleRamp(count),g=rampDeckGeometry(rows.slice(0,Math.floor(count*124/240)+1),'solid');
  try{
   assert.ok(g.userData.repairStrips.length>0);
   for(const i of g.userData.repairStrips){assert.ok(rows[i].parameter>=RAMP_DECK_REPAIR.start-1e-10);assert.ok(rows[i+1].parameter<=RAMP_DECK_REPAIR.end+1e-10);}
   const p=g.attributes.position,ix=g.index.array,edges=new Map();
   for(let i=0;i<p.count/2;i++)assert.ok(Math.abs(p.getY(i)-p.getY(i+p.count/2)-RAMP_HARDWARE_DIMENSIONS.sheet)<1e-7);
   for(let i=0;i<ix.length;i+=3)for(let j=0;j<3;j++){
    const a=ix[i+j],b=ix[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(','),e=edges.get(key)||{count:0,sum:0};e.count++;e.sum+=a<b?1:-1;edges.set(key,e);
   }
   for(const e of edges.values()){assert.equal(e.count,2);assert.equal(e.sum,0);}
  }finally{g.dispose();}
 }
});

// Measured sphere-tangent support-cone pockets in the original right quads.
// Starts are displaced up and inward, then independently checked against every
// installed solid; this is not a penetrating-position or forced-velocity rescue.
const rightPocketStarts=[
 [1.7724353459021527,1.0128972980757254,-2.710157120175091],
 [1.7990344738239152,1.0100366496388096,-2.7661899131871164],
 [1.8233294193027259,1.0070878838316457,-2.824961391826367]
];
test('three legal zero-speed starts exit the repaired right deck pockets without rescue',async()=>{
 for(const site of rightPocketStarts){
  const g=await PinballPhysics.create();
  try{
   g.launch(.925);g.state.kickbackCharges=g.state.sideSaveCharges=0;
   const p=new T.Vector3(...site);g.ball.setTranslation(p,true);g.ball.setLinvel({x:0,y:0,z:0},true);g.ball.setAngvel({x:0,y:0,z:0},true);g.world.propagateModifiedBodyPositionsToColliders();
   let minGap=Infinity,rescues=0;const onEvent=g.state.onEvent.bind(g.state);
   g.state.onEvent=e=>{const accepted=onEvent(e);if(accepted&&['kickback','side-save'].includes(e.type))rescues++;return accepted;};
   g.world.forEachCollider(c=>{if(c===g.ballCollider||c.handle===g.ballCollider.handle||c.isSensor())return;const q=c.projectPoint(p,true).point;minGap=Math.min(minGap,p.distanceTo(new T.Vector3(q.x,q.y,q.z))-.135);});
   assert.ok(minGap>.0049,`initial gap ${minGap}`);
   let maxDisplacement=0;
   for(let tick=0;tick<2400&&g.state.phase==='playing';tick++){g.step(1/120,{});maxDisplacement=Math.max(maxDisplacement,p.distanceTo(new T.Vector3(...Object.values(g.ballPosition))));}
   assert.ok(maxDisplacement>.5);assert.equal(g.state.phase,'ready');assert.equal(rescues,0);
  }finally{g.dispose();}
 }
});
