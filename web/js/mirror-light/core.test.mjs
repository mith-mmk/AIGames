import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS } from './levels.mjs';
import { traceLight, solveLevel, initialOrientations, MirrorSession, validateLevel } from './core.mjs';
import { GardenProgress } from './storage.mjs';

const simple = extra => ({ width: 5, height: 5, source: { x: 0, y: 1, direction: 0 }, goal: { x: 4, y: 1 }, mirrors: [], walls: [], checkpoints: [], ...extra });

test('all eight incoming reflection cases match geometric reflection', () => {
  const directions = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (let orientation = 0; orientation < 2; orientation++) for (let direction = 0; direction < 4; direction++) {
    const [dx, dy] = directions[direction];
    // Reflection across y=-x or y=x, independent of the implementation's lookup table.
    const reflected = orientation === 0 ? [-dy, -dx] : [dy, dx];
    const level = simple({ source: { x: 2 - dx, y: 2 - dy, direction }, goal: { x: 2 + reflected[0], y: 2 + reflected[1] }, mirrors: [{ id: 'A', x: 2, y: 2, orientation }] });
    assert.equal(traceLight(level).won, true); assert.equal(traceLight(level).bends, 1);
  }
});

test('walls, board exit and missing checkpoints terminate with explicit outcomes', () => {
  assert.equal(traceLight(simple({ walls: [{ x: 2, y: 1 }] })).status, 'blocked');
  assert.equal(traceLight(simple({ goal: { x: 4, y: 4 } })).status, 'escaped');
  assert.equal(traceLight(simple({ checkpoints: [{ x: 2, y: 2 }] })).status, 'incomplete');
  assert.equal(traceLight(simple({ checkpoints: [{ x: 2, y: 1 }] })).status, 'won');
});

test('a closed optical cycle stops by cell AND direction; crossing a cell is legal', () => {
  const loop = simple({ source: { x: 2, y: 1, direction: 0 }, goal: { x: 4, y: 4 }, mirrors: [
    { id: 'A', x: 3, y: 1, orientation: 1 }, { id: 'B', x: 3, y: 3, orientation: 0 },
    { id: 'C', x: 1, y: 3, orientation: 1 }, { id: 'D', x: 1, y: 1, orientation: 0 },
  ] });
  const trace = traceLight(loop); assert.equal(trace.status, 'loop'); assert.equal(trace.states, 8);
  const level = LEVELS[8], crossing = traceLight(level, solveLevel(level).best.orientations);
  const visits = crossing.points.filter(p => p.x === 2 && p.y === 2);
  assert.equal(crossing.won, true); assert.equal(visits.length, 2); assert.notEqual(visits[0].direction, visits[1].direction);
});

test('10 authored boards: every configuration terminates; minima also match independent BFS', () => {
  const expectedCounts = [1, 1, 1, 2, 2, 2, 6, 4, 2, 8];
  for (const [levelIndex, level] of LEVELS.entries()) {
    validateLevel(level);
    const solution = solveLevel(level);
    assert.equal(traceLight(level).won, false);
    assert.equal(solution.minimum, level.expectedMinimum, `Stage ${level.id}`);
    assert.equal(solution.solutions.length, expectedCounts[levelIndex]);
    assert.equal(solution.distinctRoutes, level.id === 7 ? 2 : 1); assert.equal(solution.optimalConfigurations, level.id === 7 ? 2 : 1);
    const rotatable = level.mirrors.map((m, i) => m.fixed ? -1 : i).filter(i => i >= 0);
    for (let mask = 0; mask < solution.configurations; mask++) {
      const orientations = initialOrientations(level); rotatable.forEach((i, bit) => { orientations[i] = (mask >> bit) & 1; });
      const trace = traceLight(level, orientations); assert(trace.states <= level.width * level.height * 4);
    }
    const start = initialOrientations(level), queue = [[start, 0]], seen = new Set([start.join('')]);
    let bfsMinimum;
    for (let head = 0; head < queue.length; head++) {
      const [orientations, distance] = queue[head];
      if (traceLight(level, orientations).won) { bfsMinimum = distance; break; }
      for (const index of rotatable) {
        const next = [...orientations]; next[index] ^= 1;
        if (!seen.has(next.join(''))) { seen.add(next.join('')); queue.push([next, distance + 1]); }
      }
    }
    assert.equal(bfsMinimum, solution.minimum);
    const session = new MirrorSession(level);
    for (const index of solution.best.actions) assert(session.rotate(index));
    assert(session.trace.won); assert.equal(session.moves, solution.minimum);
    assert.equal(session.rotate(solution.best.actions[0]), false);
    assert(session.undo()); assert.equal(session.trace.won, false);
    session.reset(); assert.equal(session.moves, 0); assert.deepEqual(session.orientations, start);
    assert.equal(session.undo(), false);
  }
});

test('undo restores a sequence exactly; fixed mirrors and invalid inputs are inert', () => {
  const level = LEVELS[9], original = initialOrientations(level), session = new MirrorSession(level);
  const fixed = level.mirrors.findIndex(m => m.fixed);
  assert.equal(session.rotate(fixed), false); assert.equal(session.rotate(-1), false); assert.equal(session.rotate(.5), false);
  const snapshots = [[...session.orientations]];
  for (const index of [0, 1, 0, 2]) { session.rotate(index); snapshots.push([...session.orientations]); }
  for (let step = 3; step >= 0; step--) { session.undo(); assert.deepEqual(session.orientations, snapshots[step]); }
  assert.deepEqual(initialOrientations(level), original);
  const alteredFixed = [...original]; alteredFixed[fixed] ^= 1;
  assert.throws(() => traceLight(level, alteredFixed));
});

test('the introduced checkpoint blocks a deceptive shortcut; later boards permit alternative routes', () => {
  const level = LEVELS[5], shortcut = initialOrientations(level); shortcut[0] ^= 1;
  assert.equal(traceLight(level, shortcut).status, 'incomplete');
  const alternatives = solveLevel(LEVELS[6]);
  assert.equal(alternatives.distinctRoutes, 2); assert.equal(alternatives.optimalConfigurations, 2);
});

test('progressive hints use the current state, reveal only one rotation, and reset after input', () => {
  const session = new MirrorSession(LEVELS[1]);
  assert.equal(session.hint().index, null);
  const second = session.hint(); assert(second.text.includes('2/3')); assert.equal(second.index, 0);
  assert(session.hint().text.includes('3/3'));
  session.rotate(second.index);
  assert.equal(session.hint().index, null); assert.equal(session.hint().index, 1);
  session.rotate(1); assert(session.hint().text.includes('届いています'));
  session.undo(); assert.equal(session.hintStep, 0);
  session.reset(); assert.equal(session.hintStep, 0);
});

test('bad level data rejected before search', () => {
  assert.throws(() => validateLevel(simple({ goal: { x: 0, y: 1 } })));
  assert.throws(() => validateLevel(simple({ mirrors: [{ id: 'A', x: 2, y: 1, orientation: 2 }] })));
  assert.throws(() => traceLight(LEVELS[0], [9]));
});

test('save data is validated, best moves retained, and denied storage does not block play', () => {
  let value = JSON.stringify({ best: { '1': 4, '2': -1, '3': '2', '999': 0 } });
  const storage = { getItem() { return value; }, setItem(_, text) { value = text; } };
  const progress = new GardenProgress(storage); assert.deepEqual(progress.best, { '1': 4 });
  progress.record(1, 2); progress.record(1, 5); assert.equal(new GardenProgress(storage).best[1], 2);
  const denied = new GardenProgress({ getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } });
  denied.record(10, 6); assert.equal(denied.available, false); assert.equal(denied.best[10], 6);
  assert.equal(new GardenProgress({ getItem() { return '{invalid'; } }).available, false);
});
