import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballPhysics} from './physics.mjs';
import {rampSupportStations} from './ramp-geometry.mjs';

test('short supports allow eighty nonpenetrating slow wall approaches',async()=>{
 const starts=[];
 for(const axis of ['left','rear']){
  const vals=rampSupportStations().filter(m=>axis==='left'?m.x===-2.65:m.z===-5.70).map(m=>axis==='left'?m.z:m.x).sort((a,b)=>a-b);
  assert.ok(vals.length>0);
  const positions=[...vals.flatMap(v=>[v-.25,v+.25]),...vals.slice(1).map((v,i)=>(v+vals[i])/2)];
  for(const a of positions)for(const dir of [-1,1])for(const edge of axis==='left'?[-2.53]:[-5.53,-5.25,-4.95])starts.push({axis,a,dir,edge,p:axis==='left'?{x:edge,y:.175,z:a}:{x:a,y:.175,z:edge},v:axis==='left'?{x:0,y:0,z:dir}:{x:dir,y:0,z:0}});
 }
 const valid={left:0,rear:0},skipped={left:0,rear:0};
 for(const f of starts){
  const g=await PinballPhysics.create();
  try{
   g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
   // Reject starts inside existing roof/backing, not failures during play.
   // Fixed counts below prevent a change from silently skipping more routes.
   let overlap=false;
   g.world.forEachCollider(c=>{
    if(c.handle===g.ballCollider.handle||c.isSensor())return;
    const q=c.projectPoint(f.p,true),d=Math.hypot(f.p.x-q.point.x,f.p.y-q.point.y,f.p.z-q.point.z);
    assert.ok(Number.isFinite(d));if(d<.1349)overlap=true;
   });
   if(overlap){skipped[f.axis]++;continue;}
   valid[f.axis]++;g.ball.setTranslation(f.p,true);g.ball.setLinvel(f.v,true);
   let liveResets=0;const reset=g.ball.setTranslation.bind(g.ball);
   g.ball.setTranslation=(...args)=>{if(g.state.phase==='playing')liveResets++;return reset(...args);};
   let quiet=0,maxQuiet=0,before={...g.ballPosition};
   for(let tick=0;tick<7200&&g.state.phase==='playing';tick++){
    before={...g.ballPosition};g.step(1/120);const v=g.ball.linvel();
    quiet=Math.hypot(v.x,v.y,v.z)<.025?quiet+1:0;maxQuiet=Math.max(maxQuiet,quiet);
   }
   const detail=JSON.stringify({fixture:f,phase:g.state.phase,before,end:g.ballPosition,maxQuiet,liveResets});
   assert.equal(g.state.phase,'ready',detail);assert.equal(g.state.ballNumber,2,detail);
   assert.ok(before.z>4.6,`must drain through lower edge: ${detail}`);
   assert.ok(maxQuiet<=600,`persistent stop: ${detail}`);assert.equal(liveResets,0,detail);
  }finally{g.dispose();}
 }
 assert.deepEqual(valid,{left:46,rear:34});assert.deepEqual(skipped,{left:0,rear:14});
});
