import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballPhysics} from './physics.mjs';
import {MINI_BUMPERS} from './layout.mjs';
const run=(g,n)=>{for(let i=0;i<n;i++)g.step(1/120);};
test('mini bumper pocket is contact-driven and its ground entrances release',async()=>{
 for(const [x,z,vx,vz] of [[-.9,-.65,-2,0],[-1.95,.5,0,-3],[-2.55,-.9,3,0]]){
  const g=await PinballPhysics.create();try{g.launch();g.state.kickbackCharges=0;g.ball.setTranslation({x,y:.18,z},true);g.ball.setLinvel({x:vx,y:0,z:vz},true);run(g,120);assert.ok(g.state.score>=100,'real mini contact must score');run(g,3600);assert.equal(g.state.phase,'ready','pocket must not hold ball indefinitely');}finally{g.dispose();}
 }
});
test('mini pocket clearances retain a full ball diameter between posts',()=>{
 for(let a=0;a<MINI_BUMPERS.length;a++)for(let b=a+1;b<MINI_BUMPERS.length;b++)assert.ok(Math.hypot(MINI_BUMPERS[a].x-MINI_BUMPERS[b].x,MINI_BUMPERS[a].z-MINI_BUMPERS[b].z)-.32>.27);
});
test('earned side kickback reverses an outlane descent once, uncharged still drains',async()=>{
 for(const charged of [false,true]){const g=await PinballPhysics.create();try{g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=Number(charged);g.ball.setTranslation({x:-2.30,y:.18,z:3.40},true);g.ball.setLinvel({x:0,y:0,z:3},true);run(g,12);if(charged){assert.equal(g.state.sideSaveUses,1);assert.equal(g.state.sideSaveCharges,0);assert.ok(g.ball.linvel().z<0);}else{run(g,240);assert.equal(g.state.phase,'ready');}}finally{g.dispose();}}
});
test('out-of-order or ground ramp contacts never count a complete traversal',async()=>{
 const g=await PinballPhysics.create();try{g.launch();const gates=[...g.hitObjects].filter(([,h])=>h.type==='ramp-gate');g.hit(gates[2][0]);g.hit(gates[1][0]);assert.equal(g.state.score,0);g.rampStage=0;g.ball.setTranslation({x:.25,y:.18,z:-4.2},true);run(g,1);assert.equal(g.rampStage,0);}finally{g.dispose();}
});
test('complete physical ramp awards exactly once and only after its exit lip',async()=>{
 const {sampleRamp}=await import('./ramp-geometry.mjs');
 for(const speed of [26,28]){const g=await PinballPhysics.create();try{g.launch();const r=sampleRamp()[0];g.ball.setTranslation({x:r.p.x,y:r.p.y+.14,z:r.p.z},true);g.ball.setLinvel({x:r.t.x*speed,y:r.t.y*speed,z:r.t.z*speed},true);let awarded=false;for(let i=0;i<1200;i++){g.step(1/120,{left:true});if(g.rampTraversals){assert.ok(g.ballPosition.z>=3,'must leave lip before reward');awarded=true;break;}}assert.ok(awarded);run(g,120);assert.equal(g.rampTraversals,1);}finally{g.dispose();}}
});
test('inlane switch scores only a fresh real crossing, not sitting or pausing',async()=>{
 const g=await PinballPhysics.create();try{g.launch();g.state.kickbackCharges=0;g.ball.setTranslation({x:1.60,y:.18,z:2.65},true);g.ball.setLinvel({x:0,y:0,z:2},true);run(g,15);assert.ok(g.state.score>=100);assert.equal(g.state.lastAward.label,'INLANE');const score=g.state.score;g.setPaused(true);run(g,120);assert.equal(g.state.score,score);g.setPaused(false);}finally{g.dispose();}
});
test('side coils are bounded, horizontal and stronger than their former impulse',async()=>{
 const g=await PinballPhysics.create();try{g.launch();for(const type of ['sling','bumper']){const [h,spec]=[...g.hitObjects].find(([,v])=>v.type===type&&(type!=='bumper'||v.key==='mini0'));g.ball.setTranslation({x:spec.x+.3,y:.18,z:spec.z},true);g.ball.setLinvel({x:0,y:0,z:0},true);g.hit(h);const v=g.ball.linvel();assert.ok(v.x>(type==='sling'?2:5));assert.ok(v.x<7);assert.equal(v.y,0);}}finally{g.dispose();}
});
test('visual bumper notifications are accepted-contact-only, bounded and restart clears',async()=>{
 const g=await PinballPhysics.create();try{g.launch();const handle=[...g.hitObjects].find(([,h])=>h.key==='mini0')[0];g.hit(handle);const score=g.state.score;assert.deepEqual(g.takeVisualHits(),[{key:'mini0',points:100}]);assert.equal(g.state.score,score);assert.deepEqual(g.takeVisualHits(),[]);g.hit(handle);assert.deepEqual(g.takeVisualHits(),[]);g.time+=.2;g.hit(handle);assert.equal(g.visualHits.length,1);g.restart();assert.deepEqual(g.takeVisualHits(),[]);}finally{g.dispose();}
});

test('bumper notification uses earned contact multiplier, not mission bonus',async()=>{
 const g=await PinballPhysics.create();try{g.launch();const handle=[...g.hitObjects].find(([,h])=>h.key==='mini0')[0];for(let i=0;i<5;i++){g.time+=.2;g.hit(handle);}assert.equal(g.state.multiplier,2);assert.equal(g.takeVisualHits().at(-1).points,100);g.time+=.2;g.hit(handle);assert.equal(g.takeVisualHits()[0].points,200);g.state.onEvent({type:'bank',id:'mult-bank'});g.state.onEvent({type:'inlane',id:'mult-lane'});g.time+=.2;g.hit(handle);assert.equal(g.takeVisualHits()[0].points,300);}finally{g.dispose();}
});
