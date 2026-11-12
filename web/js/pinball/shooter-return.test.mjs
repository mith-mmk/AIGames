import test from 'node:test';
import assert from 'node:assert/strict';
import {PinballPhysics} from './physics.mjs';

test('returned shooter ball rolls to plunger and relaunches in place without consuming a ball',async()=>{
  const g=await PinballPhysics.create();
  try {
    g.launch();g.state.award(325,'fixture');
    g.ball.setTranslation({x:2.53,y:.18,z:3.8},true);g.ball.setLinvel({x:0,y:0,z:2},true);
    let previous={...g.ballPosition};
    for(let i=0;i<240;i++) {
      g.step(1/120);const p=g.ballPosition;
      assert.ok(Math.hypot(p.x-previous.x,p.y-previous.y,p.z-previous.z)<.08,'returned ball jumped');
      previous={...p};
    }
    assert.equal(g.state.phase,'ready');assert.equal(g.state.returnedShooter,true);
    assert.equal(g.state.ballNumber,1);assert.equal(g.state.score,325);
    assert.ok(Math.abs(g.ballPosition.z-4.025)<.015,'must physically roll down to the plunger');
    const rested={...g.ballPosition};
    g.setPaused(true);g.step(.1);assert.deepEqual({...g.ballPosition},rested);g.setPaused(false);
    assert.equal(g.state.returnedShooter,true);
    assert.equal(g.launch(),true);assert.equal(g.state.returnedShooter,false);
    assert.deepEqual({...g.ballPosition},rested,'launch must not reposition the ball');
    assert.equal(g.state.ballNumber,1);assert.equal(g.state.score,325);
    g.step(1/120);assert.equal(g.state.phase,'playing','upward ball in shooter is not a drain');
    let reached=false;for(let i=0;i<300&&g.state.phase==='playing';i++){g.step(1/120);if(g.ballPosition.z<0){reached=true;break;}}
    assert.ok(reached,'same ball should travel back up the shooter');
  }finally{g.dispose();}
});
test('normal drains still consume three balls and restart resets returned-shooter state',async()=>{
  const g=await PinballPhysics.create();
  try {
    for(let ball=1;ball<=3;ball++) {
      assert.equal(g.state.ballNumber,ball);assert.equal(g.launch(),true);
      g.ball.setTranslation({x:2.1,y:.18,z:4.7},true);g.ball.setLinvel({x:0,y:0,z:2},true);
      g.step(1/120);assert.equal(g.state.returnedShooter,false);
      assert.equal(g.state.phase,ball<3?'ready':'gameover');
    }
    g.restart();assert.equal(g.state.ballNumber,1);assert.equal(g.state.phase,'ready');
    assert.equal(g.state.returnedShooter,false);assert.equal(g.state.score,0);assert.equal(g.ballPosition.z,Math.fround(4.025));
  }finally{g.dispose();}
});

for (const vx of [-3, -1, 1, 3]) test(`returned shooter contains lateral speed ${vx}`, async () => {
  const g = await PinballPhysics.create();
  try {
    g.launch(); g.ball.setTranslation({x:2.53,y:.18,z:3.7},true);
    g.ball.setLinvel({x:vx,y:0,z:4},true);
    for(let i=0;i<600;i++) g.step(1/120);
    assert.equal(g.state.phase,'ready'); assert.equal(g.state.returnedShooter,true);
    assert.equal(g.state.ballNumber,1); assert.ok(g.ballPosition.y>0);
    assert.ok(g.ballPosition.x>2.45 && g.ballPosition.x<2.7);
    assert.ok(Math.abs(g.ballPosition.z-4.025)<.015);
    assert.equal(g.launch(),true);
  } finally {g.dispose();}
});
test('out-of-bounds returned ball cannot strand the game in ready',async()=>{
 const g=await PinballPhysics.create();
 try {g.launch();g.state.returnToShooter();g.ball.setTranslation({x:0,y:-2,z:6},true);
 g.step(1/120);assert.equal(g.state.ballNumber,2);assert.equal(g.state.returnedShooter,false);
 assert.equal(g.state.phase,'ready');assert.ok(g.ballPosition.y>0);
 }finally{g.dispose();}
});
