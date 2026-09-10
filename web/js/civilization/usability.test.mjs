import assert from 'node:assert/strict';
import { CivilizationEngine } from './engine.mjs';
import { CivilizationGame } from './game.mjs';
import { CivilizationRenderer } from './renderer.mjs';
import { handleGameKey, UNIT_STEP_KEYS } from './keyboard.mjs';

// A rename is owner-scoped, atomic on invalid input, and survives serialization.
const engine = new CivilizationEngine();
engine.init({ presetId: 'small', civilizationCount: 2, seed: 712 });
const civId = engine.getView('civ-1').self.id;
const settler = engine.getView(civId).units.find(unit => unit.typeId === 'settler');
assert.ok(engine.dispatch({ type: 'unit.foundCity', civId, unitId: settler.id, name: '旧都' }).ok);
const cityId = engine.getView(civId).cities[0].id;
assert.ok(engine.dispatch({ type: 'city.rename', civId, cityId, name: '  新しい都  ' }).ok);
assert.equal(engine.getView(civId).cities[0].name, '新しい都');
for (const name of ['', '   ', '禁\n止', 'x'.repeat(41), 42]) {
  const before = engine.serialize();
  assert.equal(engine.dispatch({ type: 'city.rename', civId, cityId, name }).ok, false);
  assert.deepEqual(engine.serialize(), before);
}
const reloaded = new CivilizationEngine();
assert.ok(reloaded.load(engine.serialize()).ok);
assert.equal(reloaded.getView(civId).cities[0].name, '新しい都');
assert.equal(engine.dispatch({ type: 'city.rename', civId: 'civ-2', cityId, name: '他文明' }).ok, false);

// UI plans never dispatch until confirmation; default movement has no future order.
function movementGame() {
  const game = Object.create(CivilizationGame.prototype);
  game.view = { self: { id: 'a' }, turn: { round: 7 }, world: { width: 10, height: 10,
    tiles: Array.from({ length: 100 }, (_, id) => ({ id, x: id % 10, y: Math.floor(id / 10), unitIds: [] })) },
  units: [{ id: 'u', ownerId: 'a', typeId: 'scout', x: 2, y: 2 }] };
  game.uiState = { selected: { unitId: 'u' }, inputMode: 'select' };
  game.animations = { playing: false }; game.epoch = 1;
  game.presentationPromise = Promise.resolve(); game.centerSelected = () => {};
  game.update = () => {}; game.updateNotice = () => {};
  game.engine = { getPathPreview: () => ({ ok: true, path: [
    { x: 3, y: 2, arrivalRound: 7 }, { x: 4, y: 2, arrivalRound: 8 },
  ] }) };
  game.commands = []; game.command = command => { game.commands.push(command); return { ok: true, events: [] }; };
  return game;
}
{
  const game = movementGame();
  game.moveSelectedTo({ x: 4, y: 2 });
  assert.equal(game.commands.length, 0);
  assert.deepEqual(game.uiState.movePlan.to, { x: 4, y: 2 });
  game.confirmMove();
  assert.deepEqual(game.commands[0].path, [{ x: 3, y: 2 }]);
  assert.equal(game.commands[0].continue, false, 'newly discovered expensive terrain must not leave an automatic order');
  assert.equal(game.uiState.inputMode, 'select');
  game.moveSelectedTo({ x: 4, y: 2 }); game.setContinueMove(true); game.confirmMove();
  assert.deepEqual(game.commands[1].path, [{ x: 3, y: 2 }, { x: 4, y: 2 }]);
  game.moveSelectedTo({ x: 4, y: 2 }); game.cancelSelection();
  assert.equal(game.uiState.movePlan, null); assert.equal(game.commands.length, 2);
  game.renderer = { unitFromPointer: () => ({ tileId: 22 }), tileFromPointer: () => ({ x: 4, y: 2, tileId: 24 }) };
  assert.equal(game.pointerTile({ button: 0 }).tileId, 22, 'selection uses the sprite');
  assert.equal(game.pointerTile({ button: 2 }).tileId, 24, 'right-click targets ground under the pointer');
  game.uiState.inputMode = 'move';
  assert.equal(game.pointerTile({ button: 0 }).tileId, 24, 'move mode and right-click use identical coordinates');
}

// Repeated DPR redraws cannot grow the CSS layout or shift click destinations.
{
  const noop = () => {};
  const context = new Proxy({}, { get: () => noop, set: () => true });
  const mini = { width: 220, height: 140, clientWidth: 220, clientHeight: 140, clientLeft: 2, clientTop: 2,
    getBoundingClientRect: () => ({ left: 40, top: 20 }), getContext: () => context };
  const renderer = Object.create(CivilizationRenderer.prototype);
  renderer.uiState = { camera: { x: 20, y: 12, zoom: 1 } }; renderer.cssWidth = 640; renderer.cssHeight = 480;
  const view = { world: { width: 64, height: 40, tiles: [] } };
  const oldRatio = globalThis.devicePixelRatio;
  globalThis.devicePixelRatio = 1.25;
  for (let index = 0; index < 12; index++) renderer.drawMiniMap(mini, view);
  assert.deepEqual([mini.width, mini.height], [275, 175]);
  assert.deepEqual(renderer.miniMapPoint(mini, 40 + 2 + 110, 20 + 2 + 70, view.world), { x: 32, y: 20 });
  assert.deepEqual(renderer.miniMapPoint(mini, 40, 20, view.world), { x: 0, y: 0 });
  mini.hidden = true; mini.clientWidth = 0; mini.clientHeight = 0; renderer.drawMiniMap(mini, view);
  assert.deepEqual([mini.width, mini.height], [275, 175]);
  if (oldRatio === undefined) delete globalThis.devicePixelRatio; else globalThis.devicePixelRatio = oldRatio;
}

// Typing, IME composition and held keys must not issue game orders.
{
  const calls = [];
  const game = { view: {}, uiState: { screen: 'game' }, root: { querySelector: () => ({ classList: { contains: () => true } }) },
    beginMove: () => calls.push('move'), moveSelectedBy: (...args) => calls.push(args), confirmMove: () => calls.push('confirm') };
  const event = (key, extra = {}) => ({ key, target: { closest: () => false }, preventDefault() {}, ...extra });
  handleGameKey(game, event('m', { isComposing: true }));
  handleGameKey(game, event('m', { repeat: true }));
  handleGameKey(game, event('m', { target: { closest: () => true } }));
  assert.equal(calls.length, 0);
  handleGameKey(game, event('m')); assert.deepEqual(calls, ['move']);
  game.uiState.movePlan = {};
  handleGameKey(game, event('Enter')); assert.equal(calls.at(-1), 'confirm');
  for (const [code, direction] of Object.entries(UNIT_STEP_KEYS)) {
    handleGameKey(game, event('1', { code })); assert.deepEqual(calls.at(-1), direction);
  }
}
console.log('rename, move confirmation, ground targeting, minimap DPR and keyboard regressions passed');
