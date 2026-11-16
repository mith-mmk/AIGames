import test from 'node:test';
import assert from 'node:assert/strict';
import { pinballFrameDelta } from './frame-time.mjs';
import { PinballPhysics } from './physics.mjs';

test('ordinary frame time is retained down to 10 fps',()=>{
  for(const fps of [120,60,30,20,15,10]) {
    let elapsed=0,last=1000;
    for(let i=1;i<=fps*2;i++) {const now=1000+i*1000/fps;elapsed+=pinballFrameDelta(now,last);last=now;}
    assert.ok(Math.abs(elapsed-2)<1e-10,`${fps} fps: ${elapsed}`);
  }
});
test('reset, clock reversal, invalid timestamp and long stall are bounded',()=>{
  assert.equal(pinballFrameDelta(30000,0),0);
  assert.equal(pinballFrameDelta(1000,2000),0);
  assert.equal(pinballFrameDelta(NaN,1000),0);
  assert.equal(pinballFrameDelta(1000,Infinity),0);
  assert.equal(pinballFrameDelta(31000,1000),.1);
});
test('10 fps timing advances fixed-step physics rather than half-speed',async()=>{
  for(const fps of [60,20,15,10]) {
    const g=await PinballPhysics.create();
    try {
      g.launch(.75);
      let last=1000;
      for(let i=1;i<=fps*2;i++){const now=1000+i*1000/fps;g.step(pinballFrameDelta(now,last),{});last=now;}
      assert.ok(Math.abs(g.time-2)<1/120+1e-8,`${fps} fps physics time ${g.time}`);
      assert.equal(g.state.ballNumber,1);
      assert.ok(Number.isFinite(g.ballPosition.x));
    } finally {g.dispose();}
  }
});
test('20 fps and faster frame deltas are exactly unchanged, including jitter',()=>{
  let last=1000;
  for(const gap of [8.33,16.67,49.99,33.33,50,0,12,41,17]) {
    const now=last+gap;
    assert.equal(pinballFrameDelta(now,last),Math.min((now-last)/1000,.05));
    last=now;
  }
  assert.equal(pinballFrameDelta(1200,1000),.1); // 5 fps stays bounded, not real time.
});
