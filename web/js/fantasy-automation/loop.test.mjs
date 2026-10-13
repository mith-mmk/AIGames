import test from 'node:test';
import assert from 'node:assert/strict';
import { FixedStepLoop } from './loop.mjs';

function makeClock(options = {}) {
  const ticks = [];
  const frames = [];
  const clock = new FixedStepLoop({ step: delta => ticks.push(delta), render: alpha => frames.push(alpha), ...options });
  return { clock, ticks, frames };
}

test('default simulation runs at 20 Hz and renders each advance', () => {
  const { clock, ticks, frames } = makeClock();
  clock.advance(0.025);
  assert.equal(ticks.length, 0);
  assert.equal(frames[0], 0.5);
  clock.advance(0.025);
  assert.deepEqual(ticks, [0.05]);
  assert.equal(frames.length, 2);
  assert.equal(frames[1], 0);
});

test('frame partitioning yields the same simulation time', () => {
  const slow = makeClock();
  const fast = makeClock();
  for (let index = 0; index < 30; index += 1) slow.clock.advance(1 / 30);
  for (let index = 0; index < 144; index += 1) fast.clock.advance(1 / 144);
  assert.equal(slow.ticks.length, 20);
  assert.deepEqual(slow.ticks, fast.ticks);
  assert.ok(slow.frames.every(alpha => alpha >= 0 && alpha < 1));
  assert.ok(fast.frames.every(alpha => alpha >= 0 && alpha < 1));
});

test('a long stall is clamped without leaving catch-up ticks', () => {
  const { clock, ticks } = makeClock({ stepSeconds: 0.1, maxSteps: 3 });
  clock.advance(0.04);
  const result = clock.advance(60);
  assert.equal(result.steps, 3);
  assert.equal(ticks.length, 3);
  assert.ok(Math.abs(result.alpha - 0.4) < 1e-12);
  assert.equal(clock.advance(0).steps, 0);
  assert.equal(clock.advance(0.06).steps, 1);
});

test('invalid deltas do not affect pending simulation time', () => {
  const { clock, ticks, frames } = makeClock();
  clock.advance(0.025);
  for (const delta of [NaN, Infinity, -Infinity, -1, undefined, '1', null]) {
    assert.deepEqual(clock.advance(delta), { steps: 0, alpha: 0.5 });
  }
  assert.equal(ticks.length, 0);
  assert.equal(frames.length, 8);
  assert.equal(clock.advance(0.025).steps, 1);
});

test('reset clears fractional time before resuming or loading a save', () => {
  const { clock, ticks } = makeClock();
  clock.advance(0.04);
  clock.reset();
  const result = clock.advance(0.01);
  assert.equal(result.steps, 0);
  assert.ok(Math.abs(result.alpha - 0.2) < 1e-12);
  assert.equal(ticks.length, 0);
  assert.equal(clock.advance(0.04).steps, 1);
});

test('simulation ticks happen before a single interpolated render', () => {
  const events = [];
  const clock = new FixedStepLoop({ stepSeconds: 0.1, step: delta => events.push(['step', delta]), render: alpha => events.push(['render', alpha]) });
  clock.advance(0.25);
  assert.equal(events.length, 3);
  assert.deepEqual(events.slice(0, 2), [['step', 0.1], ['step', 0.1]]);
  assert.equal(events[2][0], 'render');
  assert.ok(Math.abs(events[2][1] - 0.5) < 1e-12);
});

test('invalid loop configuration fails at construction', () => {
  for (const stepSeconds of [0, -1, NaN, Infinity]) {
    assert.throws(() => makeClock({ stepSeconds }), RangeError);
  }
  for (const maxSteps of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => makeClock({ maxSteps }), RangeError);
  }
  assert.throws(() => makeClock({ stepSeconds: Number.MAX_VALUE, maxSteps: 2 }), RangeError);
  assert.throws(() => makeClock({ step: null }), TypeError);
  assert.throws(() => makeClock({ render: null }), TypeError);
});
