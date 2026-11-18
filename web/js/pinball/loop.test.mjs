import test from 'node:test';
import assert from 'node:assert/strict';
import {LOOP,LOOP_THROAT,LOOP_EXIT,loopPath,loopWallGeometry,loopPocketBackings,loopRearBackingGeometry,loopHousingProfile,LoopTraversal,MechanicalLoop} from './loop.mjs';
import {PinballPhysics} from './physics.mjs';
import {PinballGameState} from './game-state.mjs';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {cabinetBoundaryBoxes,CABINET_BOUNDARY} from './cabinet-boundary.mjs';
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

test('every loop contact is finite outward closed stock without collapsed triangles',()=>{
 const geometries=[loopWallGeometry(-1),loopWallGeometry(1),loopRearBackingGeometry(),...loopPocketBackings().map(p=>p.geometry)];
 try{for(const [part,g] of geometries.entries()){
  const p=g.attributes.position,indices=g.index?.array??Array.from({length:p.count},(_,i)=>i),edges=new Map();let volume=0;
  assert.ok([...p.array].every(Number.isFinite));
  const key=v=>v.toArray().map(n=>Math.round(n*1e6)).join(',');
  for(let i=0;i<indices.length;i+=3){
   const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,indices[i+j]));
   assert.ok(v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).lengthSq()>1e-18,`part ${part} triangle ${i/3} has area`);
   volume+=v[0].dot(v[1].clone().cross(v[2]))/6;
   for(let j=0;j<3;j++){const k=[key(v[j]),key(v[(j+1)%3])].sort().join('|');edges.set(k,(edges.get(k)??0)+1);}
  }
  assert.ok(volume>0,`part ${part} outward`);
  for(const [edge,count] of edges)assert.equal(count,2,`part ${part} closed at ${edge}`);
 }}finally{geometries.forEach(g=>g.dispose());}
});

test('rear housing has an elliptical outside silhouette and stays below the shared cabinet top',()=>{
 const h=loopHousingProfile(),rear=cabinetBoundaryBoxes().find(b=>b.name==='rear'),g=loopRearBackingGeometry();
 try{
  const rearFace=rear.center[2]+rear.size[2]/2;
  assert.ok(Math.abs(LOOP.turnZ-h.rz-h.hem-rearFace)<1e-9);
  g.computeBoundingBox();assert.ok(g.boundingBox.max.y<CABINET_BOUNDARY.top);
  assert.ok(g.boundingBox.min.z>=rearFace-1e-5);
  for(let i=0;i<g.attributes.position.count;i++){
   const x=g.attributes.position.getX(i)-LOOP.turnX,z=g.attributes.position.getZ(i)-LOOP.turnZ;
   assert.ok((x/(h.rx+h.hem))**2+(z/(h.rz+h.hem))**2<1.025,'no rectangular rear corners');
  }
  assert.equal(g.groups.length,3,'fixed steel / rolled chrome / fastener-head groups');
 }finally{g.dispose();}
});

test('removed bank and independent scoop leave no legacy loop backings',()=>{assert.deepEqual(loopPocketBackings(),[]);});

test('ordered loop switches reject reverse, airborne, shortcut and repeated exit',()=>{
 const p=(x,z,y=.175)=>({x,z,y});
 const enter=t=>t.update(p(LOOP_THROAT.x,LOOP_THROAT.z+.06),p(LOOP_THROAT.x,LOOP_THROAT.z-.06),0);
 const turn=t=>t.update(p(LOOP.turnX-.02,LOOP.turnZ-LOOP.radius),p(LOOP.turnX+.02,LOOP.turnZ-LOOP.radius),1);
 const exit=t=>t.update(p(LOOP_EXIT.x,-4.5),p(LOOP_EXIT.x,-4.4),2);
 const t=new LoopTraversal();t.update(p(-1.20,1.46),p(-1.27,1.34),0);assert.equal(t.stage,0,'wide mouth alone is not the traversal gate');assert.ok(t.contains(p(-2.1,0)),'shared outer funnel is a real route');assert.equal(t.contains(p(-2.6,0)),false);assert.equal(t.contains(p(-1,.5)),false);assert.equal(exit(t),false);enter(t);turn(t);assert.equal(exit(t),true);assert.equal(exit(t),false);
 enter(t);t.update(p(-2.2,-2),p(-2.2,-2,.5),.5);turn(t);assert.equal(exit(t),false);
 enter(t);t.update(p(-2.2,-2),p(-1.4,-2),.5);turn(t);assert.equal(exit(t),false);
 enter(t);t.update(p(LOOP_THROAT.x,LOOP_THROAT.z-.06),p(LOOP_THROAT.x,LOOP_THROAT.z+.06),.1);turn(t);assert.equal(exit(t),false);
 enter(t);turn(t);t.update(p(LOOP.turnX+.02,LOOP.turnZ-LOOP.radius),p(LOOP.turnX-.02,LOOP.turnZ-LOOP.radius),1.1);assert.equal(exit(t),false);
 enter(t);turn(t);assert.equal(t.update(p(0,-4.5),p(0,-4.4),2),false);
 enter(t);turn(t);assert.equal(t.update(p(LOOP_EXIT.x,-4.5),p(LOOP_EXIT.x,-4.4),LOOP.timeout+1),false);
});

test('bat-side and OUT-save-side recognizer paths share the same throat-to-U-to-A 300-point contract',()=>{
 // Detector/rule fixture, not a claim that a real kickback always has enough
 // energy to reach the U. Actual weak saved balls must return without points.
 for(const approach of [[[-1.20,1.46],[-1.27,1.34]],[[-2.10,1.46],[-2.10,1.34]]]){
  const t=new LoopTraversal(),state=new PinballGameState();state.launch();
  const p=([x,z])=>({x,y:.175,z});
  assert.equal(t.update(p(approach[0]),p(approach[1]),0),false);assert.equal(t.stage,0);
  assert.equal(t.update(p([LOOP_THROAT.x,LOOP_THROAT.z+.06]),p([LOOP_THROAT.x,LOOP_THROAT.z-.06]),.5),false);
  assert.equal(t.stage,1);assert.equal(state.score,0);
  assert.equal(t.update(p([LOOP.turnX-.02,LOOP.turnZ-LOOP.radius]),p([LOOP.turnX+.02,LOOP.turnZ-LOOP.radius]),1.5),false);
  assert.equal(t.update(p([LOOP_EXIT.x,-4.50]),p([LOOP_EXIT.x,-4.40]),2),true);
  assert.equal(state.onEvent({type:'loop',id:'real-ordered-passage'}),true);assert.equal(state.score,300);
 }
});

test('positioned mouth shots either complete or return to a normal drain without assistance',async()=>{
 for(const speed of[12,18,24])for(const offset of[-.025,0,.025]){
  const g=await PinballPhysics.create();try{
   g.launch();g.state.kickbackCharges=0;
   const tangent=loopPath()[1].clone().sub(loopPath()[0]).normalize(),tx=tangent.x,tz=tangent.z;
   g.ball.setTranslation({x:LOOP.entryX-tx*.1-tz*offset,y:.175,z:LOOP.entryZ-tz*.1+tx*offset},true);
   g.ball.setLinvel({x:tx*speed,y:0,z:tz*speed},true);
   let completed=0,resets=0;const drains=[],original=g.state.onEvent.bind(g.state),drain=g.state.drain.bind(g.state),set=g.ball.setTranslation.bind(g.ball);
   g.state.onEvent=e=>{if(e.type==='loop')completed++;return original(e);};
   g.state.drain=info=>{drains.push({info,p:{...g.ballPosition}});return drain(info);};
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')resets++;return set(...args);};
   for(let i=0;i<7200&&g.state.phase==='playing'&&!completed;i++)g.step(1/120);
   const expected=speed>=18?1:0;
   assert.equal(completed,expected,JSON.stringify({speed,offset,p:g.ballPosition}));
   assert.equal(resets,0);
   if(!expected){
    assert.equal(g.state.phase,'ready','a failed angled shot cannot remain in a local oscillation');
    assert.equal(drains.length,1);assert.equal(drains[0].info.reason,'normal');assert.ok(drains[0].p.z>4.6);
   }
  }finally{g.dispose();}
 }
});

test('five adjacent real right-flipper timings complete after a positioned cradle setup',async()=>{
 for(const release of[76,77,78,79,80]){
  const g=await PinballPhysics.create();try{
   g.launch();g.state.kickbackCharges=0;
   for(let i=0;i<30;i++)g.step(1/120,{right:true});
   g.ball.setTranslation({x:1.81,y:.18,z:3.05},true);g.ball.setLinvel({x:0,y:0,z:2},true);
   let completed=0,resets=0;const original=g.state.onEvent.bind(g.state),set=g.ball.setTranslation.bind(g.ball);
   g.state.onEvent=e=>{if(e.type==='loop')completed++;return original(e);};
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')resets++;return set(...args);};
   for(let i=0;i<600;i++)g.step(1/120,{right:true});
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
