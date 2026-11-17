import test from 'node:test';
import assert from 'node:assert/strict';
import {LOOP,LOOP_EXIT,loopPath,loopWallGeometry,loopPocketBackings,LoopTraversal,MechanicalLoop} from './loop.mjs';
import {PinballPhysics} from './physics.mjs';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {WorkshopAssets} from './assets.mjs';

test('loop sheet geometry is finite, closed, thin stock and stays below the elevated wire',()=>{
  assert.equal(loopPath().length,101);
  assert.ok(Math.abs(LOOP_EXIT.halfWidth-.445)<1e-12);
  for(const side of[-1,1]){
    const g=loopWallGeometry(side),a=g.attributes.position;assert.ok([...a.array].every(Number.isFinite));
    g.computeBoundingBox();assert.ok(g.boundingBox.max.y<.30);assert.ok(g.boundingBox.min.y>=.03999);
    assert.equal(g.index.count/3,1208);
    let volume=0;for(let i=0;i<g.index.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(g.attributes.position,g.index.getX(i+j)));volume+=a.dot(b.cross(c))/6;}assert.ok(volume>0,'closed shell normals point outward');
    const edges=new Map();for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(j=>g.index.getX(i+j));for(let j=0;j<3;j++){const k=[ids[j],ids[(j+1)%3]].sort((a,b)=>a-b).join(',');edges.set(k,(edges.get(k)??0)+1);}}
    for(const count of edges.values())assert.equal(count,2);g.dispose();
  }
});

test('upper backing remains outside the live channel and sheds its top toward the rear',()=>{
 const parts=loopPocketBackings();try{
  const upper=parts.find(p=>p.name==='upper-bank-common-support').geometry;
  upper.computeBoundingBox();
  assert.ok(upper.boundingBox.min.x>=-1.90001,'backing does not coincide with the -1.92 inner contact face');
  const positions=upper.attributes.position;let lowRear=0,highFront=0;
  for(let i=0;i<positions.count;i++){
   const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
   if(x< -1.89&&z< -2.7&&y<.041)lowRear++;
   if(x< -1.89&&z> -2.05&&y>.27)highFront++;
  }
  assert.ok(lowRear>0&&highFront>0,'no flat elevated shelf behind the bank');
 }finally{for(const p of parts)p.geometry.dispose();}
});

test('ordered loop switches reject reverse, airborne, shortcut and repeated exit',()=>{
 const p=(x,z,y=.175)=>({x,z,y});
 const enter=t=>t.update(p(-1.20,1.46),p(-1.27,1.34),0);
 const turn=t=>t.update(p(-1.72,-5.35),p(-1.68,-5.35),1);
 const exit=t=>t.update(p(-1.25,-4.5),p(-1.25,-4.4),2);
 const t=new LoopTraversal();assert.equal(exit(t),false);enter(t);turn(t);assert.equal(exit(t),true);assert.equal(exit(t),false);
 enter(t);t.update(p(-2.2,-2),p(-2.2,-2,.5),.5);turn(t);assert.equal(exit(t),false);
 enter(t);t.update(p(-2.2,-2),p(-1.4,-2),.5);turn(t);assert.equal(exit(t),false);
 enter(t);turn(t);t.update(p(-1.68,-5.35),p(-1.72,-5.35),1.1);assert.equal(exit(t),false);
 enter(t);turn(t);assert.equal(t.update(p(0,-4.5),p(0,-4.4),2),false);
 enter(t);turn(t);assert.equal(t.update(p(-1.25,-4.5),p(-1.25,-4.4),LOOP.timeout+1),false);
});

test('positioned mouth fixtures traverse from the angled entrance without assistance',async()=>{
 for(const speed of[18,22,26])for(const offset of[-.025,0,.025]){
  const g=await PinballPhysics.create();try{
   g.launch();g.state.kickbackCharges=0;
   const norm=Math.hypot(.485,.74),tx=-.485/norm,tz=-.74/norm;
   g.ball.setTranslation({x:-1.235-tx*.1-tz*offset,y:.175,z:1.4-tz*.1+tx*offset},true);
   g.ball.setLinvel({x:tx*speed,y:0,z:tz*speed},true);
   let completed=0;const original=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{if(e.type==='loop')completed++;return original(e);};
   for(let i=0;i<1600&&g.state.phase==='playing'&&!completed;i++)g.step(1/120);
   assert.equal(completed,1,JSON.stringify({speed,offset,p:g.ballPosition}));
  }finally{g.dispose();}
 }
});

test('five adjacent real right-flipper timings complete after a positioned cradle setup',async()=>{
 for(const release of[76,77,78,79,80]){
  const g=await PinballPhysics.create();try{
   g.launch();g.state.kickbackCharges=0;
   for(let i=0;i<30;i++)g.step(1/120,{right:true});
   g.ball.setTranslation({x:1.6,y:.18,z:2.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);
   let completed=0,resets=0;const original=g.state.onEvent.bind(g.state),set=g.ball.setTranslation.bind(g.ball);
   g.state.onEvent=e=>{if(e.type==='loop')completed++;return original(e);};
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')resets++;return set(...args);};
   for(let i=0;i<360;i++)g.step(1/120,{right:true});
   for(let i=0;i<release;i++)g.step(1/120);
   for(let i=0;i<1200&&g.state.phase==='playing'&&!completed;i++)g.step(1/120,{right:true});
   assert.equal(completed,1,'release '+release);assert.equal(resets,0);assert.equal(g.state.ballNumber,1);
  }finally{g.dispose();}
 }
});

test('loop assembly adds less than six thousand triangles',()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'document');
 const ctx=new Proxy({}, {get:(_,k)=>k==='measureText'?()=>({width:10}):()=>{}});
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({getContext:()=>ctx})}});
 const a=new WorkshopAssets();let loop;
 try{loop=new MechanicalLoop(a);let triangles=0;loop.root.traverse(o=>{if(o.geometry)triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;});assert.ok(triangles<6000);}
 finally{loop?.root.traverse(o=>o.geometry?.dispose());for(const m of Object.values(a.materials))m.dispose();if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;}
});
