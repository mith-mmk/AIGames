import assert from 'node:assert/strict';
import { Workshop } from './karakuri-core.mjs';
import { STAGES } from './karakuri-levels.mjs';

export function assemble(g, solution = g.stage.solution) {
  g.configure('radius', solution.radius); g.configure('beltMode', solution.beltMode); g.configure('delay', solution.delay);
  if (g.stage.idler) g.configure('idler', solution.idler);
  for (const p of g.parts) {
    if (p.enabled === false) continue;
    const target = g.targets()[p.id]; g.move(p.id, target.x, target.z);
    for (let i = 0; i < 4 && Math.cos(p.angle) < .99; i++) g.rotate(p.id);
  }
}
const finish = g => { g.start(); for (let i = 0; i < 240; i++) g.step(.05); return g.state; };
let configurations = 0;
const campaign = new Workshop();
for (let index = 0; index < STAGES.length; index++) {
  assert.equal(campaign.stageIndex, index);
  assemble(campaign); assert.equal(finish(campaign), 'success', `${index + 1}: ${campaign.message}`);
  assert(campaign.completed.has(index));
  const parts = JSON.stringify(campaign.parts), settings = [campaign.beltMode, campaign.delay];
  campaign.reset(); assert.equal(JSON.stringify(campaign.parts), parts); assert.deepEqual([campaign.beltMode, campaign.delay], settings);
  assert.equal(campaign.lift, 0); assert.equal(campaign.travel, 0);
  assert.equal(finish(campaign), 'success');
  campaign.reset(); campaign.rotate('rail'); assert.equal(finish(campaign), 'failed'); assert.match(campaign.message, /レール/);
  assert.equal(campaign.next(), false); assert.equal(campaign.stageIndex, index);
  campaign.reset(); assemble(campaign); campaign.move('small', -5, 2, false); assert.equal(finish(campaign), 'failed');
  campaign.reset(); assemble(campaign); campaign.rotate('belt'); assert.equal(finish(campaign), 'failed'); assert.match(campaign.message, /ベルト/);
  campaign.reset(); assemble(campaign); campaign.start();
  const snapshot = JSON.stringify(campaign.parts); assert.equal(campaign.configure('radius', .6), false); campaign.rotate('rail'); campaign.move('small', 3, 3); assert.equal(JSON.stringify(campaign.parts), snapshot);
  campaign.reset(); assemble(campaign); assert.equal(finish(campaign), 'success');
  if (index < 9) assert.equal(campaign.next(), true); else assert.equal(campaign.next(), false);
  // Enumerate every allowed discrete mechanism setting with a correctly assembled chain.
  const stage = STAGES[index];
  for (const radius of stage.radii) for (const beltMode of stage.beltModes) for (const delay of stage.delays) for (const idler of stage.idler ? [false, true] : [false]) {
    const g = new Workshop(index); assemble(g, { radius, beltMode, delay, idler });
    const sign = (idler ? -1 : 1) * (beltMode === 'cross' ? -1 : 1);
    const arrival = 3 * radius + delay + g.gateFraction * 3;
    const expected = sign === stage.screwDirection && (!stage.window || (arrival >= stage.window[0] && arrival <= stage.window[1]));
    assert.equal(finish(g), expected ? 'success' : 'failed', `stage ${index + 1}, ${JSON.stringify({ radius, beltMode, delay, idler })}`);
    if (g.gateBlocked) { assert.equal(g.travel, g.gateFraction); assert.match(g.message, /門に着いた/); }
    configurations++;
  }
}
assert.equal(campaign.completed.size, 10);
assert.match(campaign.message, /全10面クリア/);
campaign.init(0); assert.equal(campaign.stageIndex, 0); assert.equal(campaign.completed.size, 10);
assert.equal(campaign.next(), false); campaign.init(9); campaign.init(0); assert.equal(campaign.stageIndex, 0);
const jam = new Workshop(3); assemble(jam); jam.move('idler', -4.8, .8, false);
assert.equal(jam.connections().jam, true); assert.equal(finish(jam), 'failed'); assert.match(jam.message, /輪/);
const directFinal = new Workshop(9); assemble(directFinal); assert.equal(finish(directFinal), 'success'); assert.equal(directFinal.completed.size, 1); assert.doesNotMatch(directFinal.message, /全10面クリア/);
console.log(`10-stage campaign passed: solutions, failures, resets, next/back, edit lock, progress, odd-cycle stall; ${configurations} discrete configurations checked.`);
