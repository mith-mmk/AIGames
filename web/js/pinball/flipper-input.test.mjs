import test from 'node:test';
import assert from 'node:assert/strict';
import {FlipperInputTimeline} from './flipper-input.mjs';
import {PinballPhysics} from './physics.mjs';

test('short tap between frames retains duration and release, not a whole-frame hold',()=>{
 const q=new FlipperInputTimeline();q.set('left',true,1020);q.set('left',false,1050);
 assert.deepEqual(q.consume(1000,1100),[
  {dt:.02,input:{left:false,right:false}},
  {dt:.03,input:{left:true,right:false}},
  {dt:.05,input:{left:false,right:false}},
 ]);
 assert.deepEqual(q.consume(1100,1200),[{dt:.1,input:{left:false,right:false}}]);
});
test('both sides, duplicate downs and future releases preserve ordered state',()=>{
 const q=new FlipperInputTimeline();q.set('left',true,1010);q.set('left',true,1020);
 q.set('right',true,1030);q.set('left',false,1060);q.set('right',false,1120);
 const segments=q.consume(1000,1100);
 assert.equal(segments.length,4);assert.deepEqual(segments.at(-1).input,{left:false,right:true});
 assert.deepEqual(q.consume(1100,1200),[{dt:.02,input:{left:false,right:true}},{dt:.08,input:{left:false,right:false}}]);
});
test('stall window drops expired taps, keeps held state; lifecycle reset discards pending kicks',()=>{
 const q=new FlipperInputTimeline();q.set('left',true,1010);q.set('left',false,1040);
 q.set('right',true,1050);
 assert.deepEqual(q.consume(1900,2000),[{dt:.1,input:{left:false,right:true}}]);
 q.set('left',true,2010);q.reset();
 assert.deepEqual(q.consume(2000,2100),[{dt:.1,input:{left:false,right:false}}]);
 q.reset({left:true});assert.deepEqual(q.consume(2100,2200),[{dt:.1,input:{left:true,right:false}}]);
});
test('invalid times do not queue input or advance timeline',()=>{
 const q=new FlipperInputTimeline();q.set('left',true,NaN);q.set('unknown',true,10);
 assert.deepEqual(q.consume(10,0),[]);assert.deepEqual(q.consume(NaN,20),[]);
 assert.deepEqual(q.consume(0,20),[{dt:.02,input:{left:false,right:false}}]);
});
test('30 ms tap causes physical motion even when down and up precede one frame',async()=>{
 const g=await PinballPhysics.create();const q=new FlipperInputTimeline();
 try{
  const resting=g.flipperAngles[0];q.set('left',true,1020);q.set('left',false,1050);
  const motions=[];
  for(const segment of q.consume(1000,1100)){g.step(segment.dt,segment.input);motions.push(g.flipperAngles[0]);}
  assert.ok(motions[1]>resting+.2,'short tap must move the real flipper');
  assert.ok(motions[1]<.48,'30 ms is not a full raised hold');
  assert.ok(motions[2]<motions[1],'release lowers the flipper in the same frame');
  assert.ok(Math.abs(g.time-.1)<1/120+1e-8);
 }finally{g.dispose();}
});
test('unchanged held input is one original frame delta with no subdivision',()=>{
 const q=new FlipperInputTimeline();q.reset({left:true});let previous=1000;
 for(const gap of [16.67,33.33,50,66.66,100]){
  const now=previous+gap;
  assert.deepEqual(q.consume(previous,now),[{dt:(now-previous)/1000,input:{left:true,right:false}}]);previous=now;
 }
});
test('residual accumulator retains a short tap and release exactly at frame end',async()=>{
 const g=await PinballPhysics.create();const q=new FlipperInputTimeline();
 try{
  g.step(.004,{left:false,right:false});const resting=g.flipperAngles[0];
  q.set('left',true,1010);q.set('left',false,1040);
  for(const segment of q.consume(1000,1040))g.step(segment.dt,segment.input);
  assert.ok(g.flipperAngles[0]>resting+.2);
  const next=[...q.consume(1040,1100),...q.consume(1100,1160)];assert.ok(next.every(s=>s.input.left===false));
  for(const segment of next)g.step(segment.dt,segment.input);
  assert.ok(Math.abs(g.time-.164)<1/120+1e-8);
  assert.ok(Math.abs(g.flipperAngles[0]-resting)<1e-9);
 }finally{g.dispose();}
});
