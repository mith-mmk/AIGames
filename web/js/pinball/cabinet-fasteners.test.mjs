import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {MechanicalCabinet} from './components/cabinet.mjs';
import {PinballPhysics} from './physics.mjs';
import {appendBoardEdgeFasteners,boardEdgeFasteners} from './cabinet-fasteners.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<2e-6,`${a} != ${b}`);
function contactsFor(g){assert.equal(g.boardFastenerContacts.length,20);return g.boardFastenerContacts;}

test('installed board fasteners retain exact original mesh topology, positions and open washer contacts',async()=>{
 await R.init();const world=new R.World({x:0,y:0,z:0}),cabinet=new MechanicalCabinet();
 try{
  cabinet.root.position.z=.20;cabinet.root.updateMatrixWorld(true);
  const contacts=appendBoardEdgeFasteners(world,R);assert.equal(contacts.length,20);
  const positions=boardEdgeFasteners();assert.equal(positions.length,10);
  for(const side of[-1,1])for(const localZ of[-5.55,-2.975,0,2.975,5.55]){
   const name=`board-edge-${side}-${localZ}`,x=side*2.66,z=localZ+.20;
   const washer=cabinet.root.getObjectByName(name+'-washer'),head=cabinet.root.getObjectByName(name+'-hex-head'),shaft=cabinet.root.getObjectByName(name+'-shank');
   const originalWasher=new T.TorusGeometry(.040,.008,6,16),originalHead=new T.CylinderGeometry(.026,.026,.022,6),originalShaft=new T.CylinderGeometry(.014,.014,.26,12);
   for(const [mesh,original]of[[washer,originalWasher],[head,originalHead],[shaft,originalShaft]]){
    assert.deepEqual(mesh.geometry.attributes.position.array,original.attributes.position.array);
    assert.deepEqual(mesh.geometry.index.array,original.index.array);original.dispose();
   }
   close(head.position.x,x);close(head.position.z,localZ);close(head.position.y,.060);
   const bounds=new T.Box3().setFromObject(head);close(bounds.max.y,.071);
   const wc=contacts.find(c=>c.name===washer.name).collider,hc=contacts.find(c=>c.name===head.name).collider;
   for(const dx of[0,.028,.040]){
    const origin=new T.Vector3(x+dx,.20,z),direction=new T.Vector3(0,-1,0);
    const hits=new T.Raycaster(origin,direction).intersectObject(washer),distance=wc.castRay(new R.Ray(origin,direction),1,true);
    if(dx<.032){assert.equal(hits.length,0);assert.equal(distance,-1);}else{assert.ok(hits.length>0);close(hits[0].distance,distance);}
   }
   close(.2-hc.castRay(new R.Ray({x,y:.2,z},{x:0,y:-1,z:0}),1,true),.071);
  }
 }finally{cabinet.dispose();world.free();}
});

test('four accessible left board mounts physically contact clear incoming balls without resets',async()=>{
 const fixtures=[[-1,-5.35,-1,.45],[-1,-2.775,1,.45],[-1,.20,1,.20],[-1,3.175,-1,.45]];
 for(const[side,z,direction,approach]of fixtures){
  const g=await PinballPhysics.create();
  try{
   const contacts=contactsFor(g),names=new Map(contacts.map(c=>[c.collider.handle,c.name]));
   g.launch();const start={x:side*2.58,y:.18,z:z-direction*approach};
   let initial=Infinity;g.world.forEachCollider(c=>{if(c.handle===g.ballCollider.handle||c.isSensor())return;const q=c.projectPoint(start,true);initial=Math.min(initial,Math.hypot(start.x-q.point.x,start.y-q.point.y,start.z-q.point.z)-.135);});
   assert.ok(initial>.0049,JSON.stringify({start,initial}));
   g.ball.setTranslation(start,true);g.ball.setLinvel({x:0,y:0,z:direction*3},true);
   let resets=0;const set=g.ball.setTranslation.bind(g.ball);g.ball.setTranslation=(...args)=>{resets++;return set(...args);};
   const touched=new Set();for(let tick=0;tick<50&&g.state.phase==='playing';tick++){
    g.step(1/120);g.world.contactPairsWith(g.ballCollider,c=>{if(!names.has(c.handle))return;g.world.contactPair(g.ballCollider,c,m=>{if(m.numContacts()>0)touched.add(names.get(c.handle));});});
   }
   assert.ok([...touched].some(n=>n.endsWith('-washer')),JSON.stringify({start,touched:[...touched]}));
   assert.ok([...touched].some(n=>n.endsWith('-hex-head')),JSON.stringify({start,touched:[...touched]}));assert.equal(resets,0);
  }finally{g.dispose();}
 }
});

// These starts exposed three missing right fasteners before the outer rail was
// physical. They are now inside that real rail's ball exclusion volume, and
// cannot be reused as evidence of valid incoming contact in the combined table.
test('physical shooter rail excludes the three historical right fastener starts',async()=>{
 const g=await PinballPhysics.create();
 try{
  assert.ok(g.shooterOuterRailContact);assert.equal(contactsFor(g).length,20);
  for(const z of[-2.775,.20,3.175]){
   const start={x:2.58,y:.18,z:z-.45},q=g.shooterOuterRailContact.projectPoint(start,true);
   const margin=Math.hypot(start.x-q.point.x,start.y-q.point.y,start.z-q.point.z)-.135;
   assert.ok(margin<-.04,JSON.stringify({start,margin}));
  }
 }finally{g.dispose();}
});
