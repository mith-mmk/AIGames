import test from 'node:test';
import assert from 'node:assert/strict';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {PinballPhysics} from './physics.mjs';
import {lowerSlingVertices} from './layout.mjs';
import {slingStrikeFace,slingContactPoints,slingStrikeSegment} from './mechanical-contact.mjs';

test('only central strike rubber is powered and points away from both outlanes',()=>{
 for(const side of [-1,1]){
  const points=lowerSlingVertices(side),loop=slingContactPoints(points);
  const faces=loop.slice(1).map((b,i)=>slingStrikeSegment(points,loop[i],b));
  assert.ok(faces.some(Boolean));assert.ok(faces.some(face=>!face));
  for(const f of faces.filter(Boolean)){assert.ok(f.nx*side<0);assert.ok(f.nz<0);}
 }
});
test('clear approach to each actual strike face kicks inward and upfield in both modes',async()=>{
 for(const difficulty of ['standard','relaxed'])for(const side of [-1,1])for(const speed of [.3,3,9]){
  const g=await PinballPhysics.create({difficulty});
  try{
   g.launch();const face=slingStrikeFace(lowerSlingVertices(side));
   const center={x:(face.a[0]+face.b[0])/2,z:(face.a[1]+face.b[1])/2};
   const start={x:center.x+face.nx*.30,y:.175,z:center.z+face.nz*.30};
   let gap=Infinity;
   g.world.forEachCollider(c=>{
    if(c.handle===g.ballCollider.handle||c.isSensor())return;
    const contact=c.contactShape(new R.Ball(.135),start,{x:0,y:0,z:0,w:1},1);
    if(contact)gap=Math.min(gap,contact.distance);
   });
   assert.ok(gap>=-.001,'fixture begins outside all solid stock: '+gap);
   g.ball.setTranslation(start,true);g.ball.setLinvel({x:-face.nx*speed,y:0,z:-face.nz*speed},true);
   let reset=0;const translate=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')reset++;return translate(...args);};
   let hit=false;
   for(let tick=0;tick<240;tick++){
    g.step(1/120);
    if(g.takeVisualHits().some(h=>h.type==='sling')){hit=true;break;}
   }
   assert.ok(hit,JSON.stringify({side,difficulty,speed,start,p:g.ballPosition}));
   const v=g.ball.linvel();
   assert.ok(v.x*face.nx+v.z*face.nz>=5.99,JSON.stringify(v));
   assert.ok(v.x*side<0);
   for(let tick=0;tick<12;tick++)g.step(1/120);
   const exit=g.ball.linvel();assert.ok(exit.x*face.nx+exit.z*face.nz>4.8,'ball keeps outward motion 0.1 seconds after the strike');
   assert.equal(reset,0);assert.equal(g.state.ballNumber,1);
  } finally {g.dispose();}
 }
});
