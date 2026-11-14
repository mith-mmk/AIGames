import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {MechanicalRamp,RAMP_WIRE_DIMENSIONS} from './components/ramp-wire.mjs';
import {PinballPhysics} from './physics.mjs';
import {RAMP_HARDWARE_DIMENSIONS} from './ramp-hardware.mjs';

test('exposed ramp hardware shares exact visible triangle geometry and dimensions',async()=>{
 const g=await PinballPhysics.create(),assembly=new MechanicalRamp();
 try{
  assembly.root.updateMatrixWorld(true);
  for(const [key,value] of Object.entries(RAMP_HARDWARE_DIMENSIONS))assert.equal(RAMP_WIRE_DIMENSIONS[key],value);
  assert.equal(g.ramp.hardwareContacts.length,20);
  for(const {name,collider,vertexOffset,vertexCount,indexOffset,indexCount} of g.ramp.hardwareContacts){
   const mesh=assembly.root.getObjectByName(name);assert.ok(mesh,name);
   const positions=mesh.geometry.attributes.position,actual=collider.shape.vertices;
   assert.equal(vertexCount,positions.count,name);
   for(let i=0;i<positions.count;i++){
    const p=new T.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
    for(const [axis,value] of p.toArray().entries())assert.ok(Math.abs(value-actual[(i+vertexOffset)*3+axis])<2e-7,name);
   }
   assert.deepEqual(Array.from(collider.shape.indices.slice(indexOffset,indexOffset+indexCount),i=>i-vertexOffset),Array.from(mesh.geometry.index.array),name);
  }
  assert.deepEqual(g.ramp.colliders.slice(-1),[...new Set(g.ramp.hardwareContacts.map(x=>x.collider))],'append contacts without reordering existing route');
 }finally{assembly.dispose();g.dispose();}
});

const airborne=[
 {name:'left-outward-folded-lip',start:[1.0152502361312512,.49312637503941853,.8438528816256249],normal:[-.8990152810576374,0,-.4379172575097462]},
 {name:'right-outward-folded-lip',start:[2.0019637488385413,.4991263772646586,1.3208121021944685],normal:[.8989668842766757,0,.43801659897073053]},
 {name:'left-joint-strap-16',start:[1.358848869052717,.41084952410062153,.1346352592351577],normal:[-.9852759648803101,0,-.17097155619919327]},
 {name:'left-joint-bolt-16',start:[1.758171514070241,.7119999998708565,.18601533194056624],normal:[1,0,0]},
 {name:'sheet-to-wire-right-fixing',start:[.42703205376606557,.5941100359332275,-5.015353431645335],normal:[.5000000095043496,0,-.8660253982970998]}
];
test('legal airborne approaches contact exposed lips straps and bolts rather than pass through',async()=>{
 for(const f of airborne){
  const outcomes=[];
  for(const enabled of [true,false]){
   const g=await PinballPhysics.create(),assembly=new MechanicalRamp();assembly.root.updateMatrixWorld(true);
   try{
    if(!enabled)for(const collider of new Set(g.ramp.hardwareContacts.map(x=>x.collider)))g.world.removeCollider(collider,true);
    const p=new T.Vector3(...f.start);
    g.world.forEachCollider(c=>{
     if(c.handle===g.ballCollider.handle||c.isSensor())return;
     const q=c.projectPoint(p,true);
     assert.ok(p.distanceTo(new T.Vector3(q.point.x,q.point.y,q.point.z))>=.135-1e-4,'nonpenetrating airborne start: '+f.name);
    });
    g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
    g.ball.setTranslation(p,true);g.ball.setLinvel({x:-2*f.normal[0],y:.8,z:-2*f.normal[2]},true);
    let contact=false;
    for(let tick=0;tick<8;tick++){
     g.step(1/120);
     if(enabled)g.world.contactPair(g.ballCollider,g.ramp.hardwareContacts.find(x=>x.name===f.name).collider,m=>{
      if(m.numContacts()===0)return;
      const mesh=assembly.root.getObjectByName(f.name),a=mesh.geometry.attributes.position,idx=mesh.geometry.index;
      const p=new T.Vector3(g.ballPosition.x,g.ballPosition.y,g.ballPosition.z);
      let distance=Infinity;
      for(let k=0;k<idx.count;k+=3){
       const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,idx.getX(k+j)).applyMatrix4(mesh.matrixWorld));
       distance=Math.min(distance,new T.Triangle(...v).closestPointToPoint(p,new T.Vector3()).distanceTo(p));
      }
      if(distance<.14)contact=true;
     });
    }
    if(enabled)assert.ok(contact,'real named contact: '+f.name);
    outcomes.push(new T.Vector3(g.ballPosition.x,g.ballPosition.y,g.ballPosition.z));
   }finally{assembly.dispose();g.dispose();}
  }
  assert.ok(outcomes[0].distanceTo(outcomes[1])>.002,'hardware must change the physical trajectory: '+f.name);
 }
});
