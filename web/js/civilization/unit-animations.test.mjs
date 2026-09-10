import assert from 'node:assert/strict';
import { buildUnitClips, sampleUnitClip, UnitAnimations } from './unit-animations.mjs';
import { CivilizationEngine } from './engine.mjs';
import { CivilizationGame } from './game.mjs';

const unit = (id, x, y, typeId = 'warrior') => ({ id, x, y, typeId, ownerId: id === 'a' ? 'civ-0' : 'civ-1', hp: 10, movementLeft: 1, stance: 'active', transportedByUnitId: null });
const view = (units, visible = null) => ({ units, world: { width: 8, height: 4,
  tiles: Array.from({ length: 32 }, (_, id) => ({ id, visibility: !visible || visible.includes(id) ? 'visible' : 'unexplored' })) } });
const moved = (id, x, y) => ({ type: 'unit.moved', entityId: id, data: { to: { x, y } } });
const battle = { type: 'combat.resolved', data: { attackerId: 'a', defenderId: 'd', attackerDamage: 3, defenderDamage: 10, attackerDestroyed: false, defenderDestroyed: true } };

{
  const before = view([unit('a', 7, 1)]); const after = view([unit('a', 1, 1)]);
  const originals = JSON.stringify([before, after]);
  const clips = buildUnitClips(before, after, [moved('a', 0, 1), moved('a', 1, 1)]);
  assert.equal(clips.length, 2);
  assert.equal(sampleUnitClip(clips[0], .5).actors[0].x, 7.5, 'wrap follows the adjacent edge, not the entire map');
  assert.equal(sampleUnitClip(clips[1], 1).actors[0].x, 1);
  assert.equal(JSON.stringify([before, after]), originals, 'sampling does not alter views');
}

{
  const before = view([unit('a', 1, 1)], [9]);
  const after = view([unit('a', 3, 1)], [11]);
  assert.deepEqual(buildUnitClips(before, after, [moved('a', 2, 1), moved('a', 3, 1)]), [], 'do not animate through unobserved intermediate positions');
  assert.deepEqual(buildUnitClips(view([]), view([unit('d', 2, 1)]), [moved('d', 2, 1)]), [], 'newly discovered enemy does not disclose its former position');
  assert.deepEqual(buildUnitClips(view([unit('d', 1, 1)]), view([]), [moved('d', 2, 1)]), [], 'enemy leaving visibility does not leave a ghost');
}

{
  const before = view([unit('a', 1, 1), unit('d', 2, 1)]);
  const after = view([unit('a', 2, 1)]);
  const clips = buildUnitClips(before, after, [battle, moved('a', 2, 1)]);
  assert.equal(clips[0].kind, 'combat');
  const impact = sampleUnitClip(clips[0], .5);
  assert.equal(impact.actors.length, 2, 'a defeated visible defender remains for the short hit animation');
  assert.deepEqual(impact.effects.map(effect => effect.text), ['−3', '−10']);
  assert.equal(sampleUnitClip(clips[0], 1).actors[1].alpha, 0);
  assert.equal(clips[1].kind, 'move');
  assert.deepEqual(buildUnitClips(view([unit('a', 1, 1)]), after, [battle]), [], 'raw battle IDs do not reveal unseen defenders');
  assert.deepEqual(buildUnitClips(before, view([{ ...unit('a', 1, 1), transportedByUnitId: 'ship' }]), []), [], 'boarding is not destruction');
}

function clockHarness() {
  let time = 0; let next = 0; let idle = 0; const frames = new Map();
  const animations = new UnitAnimations({ now: () => time, requestFrame: callback => { frames.set(++next, callback); return next; },
    cancelFrame: id => frames.delete(id), onIdle: () => { idle++; } });
  return { animations, frames, idle: () => idle,
    advance(delta) { time += delta; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); } };
}

{
  const clock = clockHarness();
  const clips = buildUnitClips(view([unit('a', 1, 1)]), view([unit('a', 2, 1)]), [moved('a', 2, 1)]);
  const complete = clock.animations.play(clips);
  assert.equal(clock.animations.playing, true);
  clock.advance(90); assert.equal(clock.animations.sample().actors[0].x, 1.5);
  clock.advance(90); await complete;
  assert.equal(clock.animations.playing, false); assert.equal(clock.frames.size, 0); assert.equal(clock.idle(), 1);
  const cancelled = clock.animations.play(clips); clock.animations.cancel(); await cancelled;
  assert.equal(clock.frames.size, 0, 'load/reset cancels the scheduled frame');
  clock.animations.select('a'); assert.equal(clock.animations.playing, false, 'selection pulse does not block commands');
  clock.advance(360); assert.equal(clock.frames.size, 0, 'selection is finite, not a permanent render loop');
  clock.animations.setEnabled(false); await clock.animations.play(clips); assert.equal(clock.frames.size, 0);
  clock.animations.setEnabled(true); clock.animations.select('a'); clock.animations.dispose(); assert.equal(clock.frames.size, 0);
}

{
  const a = new CivilizationEngine(); const b = new CivilizationEngine();
  const config = { presetId: 'small', seed: 482731 };
  assert.equal(a.init(config).ok, true); assert.equal(b.init(config).ok, true);
  const observer = a.serialize().config.humanCivId;
  const moving = a.getView(observer).units.find(value => value.typeId === 'scout');
  const destination = a.getView(observer).world.tiles.find(tile => Math.max(Math.abs(tile.x-moving.x),Math.abs(tile.y-moving.y))===1 && a.getPathPreview(observer, moving.id, tile).ok);
  assert.ok(destination);
  const before = a.getView(observer);
  const command = { type: 'unit.move', civId: observer, unitId: moving.id, to: { x: destination.x, y: destination.y } };
  const resultA = a.dispatch(command); const resultB = b.dispatch(command);
  assert.equal(resultA.ok, true);assert.deepEqual(resultA, resultB);
  const clips = buildUnitClips(before, a.getView(observer), resultA.events);
  assert.ok(clips.length > 0);
  for (const clip of clips) for (const progress of [0, .5, 1]) sampleUnitClip(clip, progress);
  assert.deepEqual(a.serialize(), b.serialize(), 'art and effects do not change rule state or RNG');
}

{
  let dispatched = 0;
  const game = Object.create(CivilizationGame.prototype);
  game.busy = false; game.animations = { playing: true };
  game.updateNotice = () => {}; game.engine = { dispatch: () => { dispatched++; } };
  assert.equal(game.command({ type: 'unit.move' }).reason, 'PRESENTATION_BUSY');
  assert.equal(dispatched, 0, 'duplicate commands during an animation never reach the engine');
}

console.log('unit animation timing, cancellation, visibility, input gating and rule parity passed');
