import test from 'node:test';
import assert from 'node:assert/strict';
import {LOOP,loopPath,loopWallGeometry,LoopTraversal,MechanicalLoop} from './loop.mjs';
import {PinballPhysics} from './physics.mjs';
import {WorkshopAssets} from './assets.mjs';

test('loop sheet geometry is finite, closed, thin stock and stays below the elevated wire',()=>{
  assert.equal(loopPath().length,81);
  for(const side of[-1,1]){
    const g=loopWallGeometry(side),a=g.attributes.position;assert.ok([...a.array].every(Number.isFinite));
    g.computeBoundingBox();assert.ok(g.boundingBox.max.y<.30);assert.ok(g.boundingBox.min.y>=.03999);
    assert.equal(g.index.count/3,644);
    const edges=new Map();for(let i=0;i<g.index.count;i+=3){const ids=[0,1,2].map(j=>g.index.getX(i+j));for(let j=0;j<3;j++){const k=[ids[j],ids[(j+1)%3]].sort((a,b)=>a-b).join(',');edges.set(k,(edges.get(k)??0)+1);}}
    for(const count of edges.values())assert.equal(count,2);g.dispose();
  }
});

test('ordered loop switches reject reverse, airborne, shortcut and repeated exit',()=>{
 const p=(x,z,y=.175)=>({x,z,y});
 const enter=t=>t.update(p(-2.22,.3),p(-2.22,.2),0);
 const turn=t=>t.update(p(-1.72,-5.35),p(-1.68,-5.35),1);
 const exit=t=>t.update(p(-1.25,-4.5),p(-1.25,-4.4),2);
 const t=new LoopTraversal();assert.equal(exit(t),false);enter(t);turn(t);assert.equal(exit(t),true);assert.equal(exit(t),false);
 enter(t);t.update(p(-2.2,-2),p(-2.2,-2,.5),.5);turn(t);assert.equal(exit(t),false);
 enter(t);t.update(p(-2.2,-2),p(-1.4,-2),.5);turn(t);assert.equal(exit(t),false);
 enter(t);turn(t);t.update(p(-1.68,-5.35),p(-1.72,-5.35),1.1);assert.equal(exit(t),false);
 enter(t);turn(t);assert.equal(t.update(p(-1.25,-4.5),p(-1.25,-4.4),LOOP.timeout+1),false);
});

test('positioned ground-entry loop fixtures complete strong shots and return weak shots without assistance',async()=>{
 for(const speed of[10,14,18,22,26])for(const offset of[-.025,0,.025]){
  const g=await PinballPhysics.create();try{
   g.launch();g.state.kickbackCharges=0;
   g.ball.setTranslation({x:-2.22+offset,y:.175,z:.35},true);g.ball.setLinvel({x:0,y:0,z:-speed},true);
   let completed=0;const original=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{if(e.type==='loop')completed++;return original(e);};
   for(let i=0;i<1600&&g.state.phase==='playing'&&!completed;i++)g.step(1/120);
   assert.equal(completed,speed===10?0:1,JSON.stringify({speed,offset,p:g.ballPosition}));
   if(speed===10)assert.equal(g.state.phase,'ready','weak shot must return and drain');
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
