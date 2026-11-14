import test from 'node:test';
import assert from 'node:assert/strict';
import { Plunger } from './plunger.mjs';
import { PinballPhysics } from './physics.mjs';
import { SHOOTER_LAYOUT } from './layout.mjs';
test('hold charges continuously, repeat cannot reset, and release fires once', () => {
  const p = new Plunger(); assert.equal(p.begin('Space', 0), true);
  assert.equal(p.update(300), .25); assert.equal(p.begin('Space', 300), false);
  assert.equal(p.update(600), .5); assert.equal(p.release('other', 700), null);
  assert.equal(p.release('Space', 1800), 1); assert.equal(p.release('Space', 1800), null);
});
test('drag overrides time, can reduce power, and cancellation never fires', () => {
  const p = new Plunger(); p.begin('p1', 0); p.drag('p2', 100); assert.equal(p.power, 0);
  p.drag('p1', 75); assert.equal(p.update(4000), .75);
  p.drag('p1', 25); assert.equal(p.power, .25); p.cancel();
  assert.equal(p.release('p1', 5000), null); p.begin('Space', 6000); assert.equal(p.power, 0);
});
test('low medium high produce distinct physical speeds and weak ball naturally returns', async () => {
  const g = await PinballPhysics.create();
  try {
    for (const [power,speed] of [[0,3],[.5,13],[1,23]]) {
      g.restart(); assert.equal(g.launch(power), true); assert.ok(Math.abs(g.ball.linvel().z + speed) < .001);
    }
    g.restart(); g.launch(.1); let minZ = g.ballPosition.z;
    for (let i=0;i<120*20 && g.state.phase==='playing';i++) { g.step(1/120); minZ=Math.min(minZ,g.ballPosition.z); }
    assert.ok(SHOOTER_LAYOUT.ballZ - minZ > 1.025); assert.equal(g.state.phase,'ready'); assert.equal(g.state.returnedShooter,true);
    assert.equal(g.state.ballNumber,1); assert.equal(g.launch(1),true); assert.equal(g.state.ballNumber,1);
  } finally { g.dispose(); }
});
