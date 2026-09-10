import assert from 'node:assert/strict';
import { CivilizationEngine } from './engine.mjs';
import { UNITS } from './data.mjs';

const config = (maxRounds = 120) => ({ presetId: 'custom', width: 48, height: 32, civilizationCount: 2, speed: 1, maxRounds, mapType: 'continents', seed: 77, humanCivId: 'a', civilizationIds: ['a', 'b'] });
const engineWith = (prepare, maxRounds = 120) => {
  const engine = new CivilizationEngine(); assert.equal(engine.init(config(maxRounds)).ok, true); const state = engine.serialize();
  state.units = []; state.cities = []; state.relations = []; state.treaties = []; state.tradeRoutes = []; state.chronicle = [];
  state.world.tiles.forEach((tile) => { tile.terrainId = 'grassland'; tile.resourceId = null; tile.river = false; tile.routeId = null; tile.landUseId = null; });
  state.civilizations.forEach((civ) => { civ.capitalCityId = null; civ.eliminated = false; civ.knownTechIds = []; civ.treasury = 100; civ.insolvent = false; civ.research = { activeTechId: null, progressByTech: [], overflow: 0 }; });
  state.intelligence.forEach((intel) => { intel.exploredTileIds = state.world.tiles.map((tile) => tile.id); intel.lastSeenCities = []; });
  state.spacePrograms.forEach((program) => { program.components = { structure: 0, propulsion: 0, support: 0 }; program.launchedRound = null; program.arrivalRound = null; });
  const addUnit = (id, ownerId, typeId, x, y, extra = {}) => state.units.push({ id, ownerId, typeId, x, y, hp: UNITS[typeId].hp, movementLeft: UNITS[typeId].movement, experience: 0, homeCityId: null, transportedByUnitId: null, stance: 'active', order: null, ...extra });
  const addCity = (id, ownerId, x, y, population = 1, extra = {}) => { const city = { id, ownerId, name: id, x, y, population, foodStock: 0, buildingIds: [], focus: 'balanced', workedTileIds: [y * 48 + x + 1], lockedTileIds: [], specialists: { scientist: population - 1, taxCollector: 0, entertainer: 0 }, productionQueue: [], cultureByCiv: [{ civId: ownerId, amount: 0 }], greatWorkCivIds: [], disorder: false, ...extra }; state.cities.push(city); if (!state.civilizations.find((civ) => civ.id === ownerId).capitalCityId) state.civilizations.find((civ) => civ.id === ownerId).capitalCityId = id; return city; };
  const relation = (atWar = false) => state.relations.push({ civAId: 'a', civBId: 'b', value: 0, atWar, contacted: true });
  prepare({ state, addUnit, addCity, relation }); assert.equal(engine.load(state).ok, true); return engine;
};
const state = (engine) => engine.serialize();
const endRound = (engine) => { assert.equal(engine.dispatch({ type: 'civ.endTurn', civId: 'a' }).ok, true); assert.equal(engine.dispatch({ type: 'civ.endTurn', civId: 'b' }).ok, true); };

{
  const engine = engineWith(({ addUnit, addCity, relation }) => { addCity('a-city', 'a', 4, 5); addCity('b-city', 'b', 6, 5); addUnit('a-tank', 'a', 'tank', 5, 5); addUnit('b-one', 'b', 'warrior', 6, 5, { hp: 1 }); addUnit('b-two', 'b', 'warrior', 6, 5); relation(true); });
  assert.equal(engine.dispatch({ type: 'unit.move', civId: 'a', unitId: 'a-tank', to: { x: 6, y: 5 } }).ok, true);
  const after = state(engine); assert.equal(after.units.some((unit) => unit.id === 'b-two'), true); assert.deepEqual(after.units.find((unit) => unit.id === 'a-tank') && [after.units.find((unit) => unit.id === 'a-tank').x, after.units.find((unit) => unit.id === 'a-tank').y], [5, 5], 'one combat must not enter a city with another military defender');
}
{
  const engine = engineWith(({ addUnit, relation }) => { addUnit('a-warrior', 'a', 'warrior', 5, 5); addUnit('b-worker', 'b', 'worker', 6, 5); relation(true); });
  assert.equal(engine.dispatch({ type: 'unit.attack', civId: 'a', unitId: 'a-warrior', targetUnitId: 'b-worker' }).ok, false, 'civilians are captured by movement, never resolved as combat');
  assert.equal(engine.dispatch({ type: 'unit.move', civId: 'a', unitId: 'a-warrior', to: { x: 6, y: 5 } }).ok, true); assert.equal(state(engine).units.find((unit) => unit.id === 'b-worker').ownerId, 'a', 'unguarded civilian is captured');
}
{
  const engine = engineWith(({ addUnit, addCity, relation }) => { addCity('b-wall', 'b', 6, 5); addUnit('attacker', 'a', 'warrior', 5, 5); addUnit('defender', 'b', 'warrior', 6, 5); relation(true); });
  const plain = engine.getCombatPreview('a', 'attacker', 'defender');
  const defended = state(engine); defended.cities[0].buildingIds = ['walls', 'barracks']; assert.equal(engine.load(defended).ok, true);
  const fortified = engine.getCombatPreview('a', 'attacker', 'defender');
  assert.ok(fortified.defenderPower > plain.defenderPower); assert.ok(fortified.winChance < plain.winChance);
}
{
  const engine = engineWith(({ state: snapshot, addUnit }) => { snapshot.world.tiles[5 * 48 + 6].terrainId = 'coast'; addUnit('a-warrior', 'a', 'warrior', 5, 5); });
  assert.equal(engine.dispatch({ type: 'unit.move', civId: 'a', unitId: 'a-warrior', to: { x: 6, y: 5 } }).reason, 'ILLEGAL_TARGET', 'land unit cannot enter sea');
}
{
  const engine = engineWith(({ state: snapshot, addUnit }) => { for (let y = 4; y <= 6; y += 1) for (let x = 4; x <= 6; x += 1) if (!(x === 5 && y === 5) && !(x === 6 && y === 5)) snapshot.world.tiles[y * 48 + x].terrainId = 'coast'; snapshot.world.tiles[5 * 48 + 6].terrainId = 'mountain'; addUnit('a-warrior', 'a', 'warrior', 5, 5); }); const preview = engine.getPathPreview('a', 'a-warrior', { x: 6, y: 5 }); assert.equal(preview.ok, true); assert.equal(preview.path[0].arrivalRound, 1, 'full movement enters a mountain in the current round'); assert.equal(engine.dispatch({ type: 'unit.move', civId: 'a', unitId: 'a-warrior', to: { x: 6, y: 5 } }).ok, true); assert.equal(state(engine).units.find((unit) => unit.id === 'a-warrior').movementLeft, 0, 'a terrain cost above maximum uses the full turn and enters the tile');
}
{
  const engine = engineWith(({ state: snapshot, addUnit }) => { addUnit('a-scout', 'a', 'scout', 5, 5); snapshot.intelligence.find((intel) => intel.observerCivId === 'a').exploredTileIds = [5 * 48 + 5]; }); const preview = engine.getPathPreview('a', 'a-scout', { x: 12, y: 5 }); assert.equal(preview.ok, true); assert.equal(preview.path.some((step) => step.certainty === 'estimated'), true, 'unknown paths remain an estimate without inspecting hidden terrain');
}
{
  const engine = engineWith(({ addUnit, addCity, relation }) => { addUnit('a-warrior', 'a', 'warrior', 5, 5); addCity('b-city', 'b', 7, 5); relation(false); }); assert.equal(engine.dispatch({ type: 'unit.move', civId: 'a', unitId: 'a-warrior', to: { x: 6, y: 5 } }).reason, 'DIPLOMACY_REQUIRED', 'foreign city territory requires open borders or alliance in peace');
}
{
  const engine = engineWith(({ state: snapshot, addUnit }) => { snapshot.world.tiles[5 * 48 + 6].terrainId = 'coast'; addUnit('cargo', 'a', 'warrior', 5, 5); addUnit('ship', 'a', 'galley', 6, 5); });
  assert.equal(engine.dispatch({ type: 'unit.board', civId: 'a', unitId: 'cargo', transportUnitId: 'ship' }).ok, true); assert.equal(state(engine).units.find((unit) => unit.id === 'cargo').transportedByUnitId, 'ship'); assert.equal(engine.dispatch({ type: 'unit.unload', civId: 'a', unitId: 'cargo', to: { x: 5, y: 6 } }).reason, 'ILLEGAL_TARGET', 'boarding consumes the transport action'); const refreshed = state(engine); refreshed.units.find((unit) => unit.id === 'ship').movementLeft = UNITS.galley.movement; assert.equal(engine.load(refreshed).ok, true); assert.equal(engine.dispatch({ type: 'unit.unload', civId: 'a', unitId: 'cargo', to: { x: 5, y: 6 } }).ok, true); assert.equal(state(engine).units.find((unit) => unit.id === 'cargo').transportedByUnitId, null, 'coastal boarding and a later unload are legal');
}
{
  const engine = engineWith(({ state: snapshot, addUnit, relation }) => { snapshot.world.tiles[5 * 48 + 6].terrainId = 'coast'; snapshot.world.tiles[5 * 48 + 7].terrainId = 'coast'; snapshot.rng.state = 1; addUnit('cargo', 'a', 'warrior', 5, 5); addUnit('ship', 'a', 'galley', 6, 5); addUnit('raider', 'b', 'battleship', 7, 5); relation(true); });
  assert.equal(engine.dispatch({ type: 'unit.board', civId: 'a', unitId: 'cargo', transportUnitId: 'ship' }).ok, true); const attackState = state(engine); attackState.turn.activeCivId = 'b'; attackState.turn.activeCivIndex = 1; assert.equal(engine.load(attackState).ok, true); assert.equal(engine.dispatch({ type: 'unit.attack', civId: 'b', unitId: 'raider', targetUnitId: 'ship' }).ok, true); const after = state(engine); assert.equal(after.units.some((unit) => unit.id === 'ship'), false); assert.equal(after.units.some((unit) => unit.id === 'cargo'), false, 'sinking a transport removes its cargo');
}
{
  const engine = engineWith(({ addUnit, relation }) => { addUnit('scout', 'a', 'scout', 5, 5); addUnit('enemy', 'b', 'warrior', 8, 5); relation(true); });
  assert.equal(engine.dispatch({ type: 'unit.path', civId: 'a', unitId: 'scout', path: [{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }] }).ok, true); const scout = state(engine).units.find((unit) => unit.id === 'scout'); assert.equal(scout.order, null, 'path stops when an enemy becomes visible instead of auto-attacking'); assert.notDeepEqual([scout.x, scout.y], [8, 5]);
}
{
  const engine = engineWith(({ state: snapshot, addCity, relation }) => { addCity('a-city', 'a', 5, 5); addCity('b-city', 'b', 7, 5); snapshot.world.tiles[5 * 48 + 6].routeId = 'road'; relation(false); snapshot.treaties.push({ id: 'trade-pact', civAId: 'a', civBId: 'b', kind: 'tradeAgreement', status: 'active', proposedByCivId: 'a', terms: { goldFromA: 0, goldFromB: 0, techIdsFromA: [], techIdsFromB: [] }, expiresRound: null }); });
  assert.equal(engine.dispatch({ type: 'trade.open', civId: 'a', originCityId: 'a-city', destinationCityId: 'b-city' }).ok, true); assert.equal(engine.dispatch({ type: 'diplomacy.declareWar', civId: 'a', targetCivId: 'b' }).ok, true); assert.equal(engine.dispatch({ type: 'civ.endTurn', civId: 'a' }).ok, true); assert.equal(state(engine).tradeRoutes[0].status, 'suspended'); assert.equal(state(engine).tradeRoutes[0].suspendedReason, 'WAR');
}
{
  const engine = engineWith(({ state: snapshot, addCity }) => { addCity('a-city', 'a', 5, 5); addCity('a-city-2', 'a', 7, 5); snapshot.tradeRoutes.push({ id: 'broken-road', ownerCivId: 'a', originCityId: 'a-city', destinationCityId: 'a-city-2', pathTileIds: [5 * 48 + 5, 5 * 48 + 6, 5 * 48 + 7], status: 'active', suspendedReason: null }); });
  assert.equal(engine.dispatch({ type: 'civ.endTurn', civId: 'a' }).ok, true); assert.equal(state(engine).tradeRoutes[0].status, 'suspended'); assert.equal(state(engine).tradeRoutes[0].suspendedReason, 'CONNECTION_BROKEN', 'a saved route becomes suspended when its road path is gone');
}
{
  const engine = engineWith(({ addUnit, relation }) => { addUnit('a-warrior', 'a', 'warrior', 5, 5); relation(false); }); const before = state(engine); assert.equal(engine.dispatch({ type: 'diplomacy.propose', civId: 'a', targetCivId: 'b', kind: 'exchange', terms: { goldFromA: -1, goldFromB: 0, techIdsFromA: [], techIdsFromB: [] } }).reason, 'INVALID_COMMAND'); assert.deepEqual(state(engine), before, 'invalid diplomatic terms are atomic');
}
const victoryFixture = (kind) => engineWith(({ state: snapshot, addCity }) => {
  addCity('a-city', 'a', 5, 5); addCity('b-city', 'b', 20, 5); snapshot.turn.round = kind === 'score' ? 120 : 1;
  if (kind === 'space') { const program = snapshot.spacePrograms.find((row) => row.civId === 'a'); program.components = { structure: 3, propulsion: 2, support: 1 }; program.launchedRound = 1; program.arrivalRound = 1; }
  if (kind === 'culture') for (const [id, x] of [['a-c1', 5], ['a-c2', 10], ['a-c3', 15]]) { const city = snapshot.cities.find((row) => row.id === id) || addCity(id, 'a', x, 12); city.greatWorkCivIds = ['a']; city.cultureByCiv = [{ civId: 'a', amount: 3000 }]; }
  if (kind === 'conquest') snapshot.civilizations.find((civ) => civ.id === 'b').eliminated = true;
});
for (const kind of ['conquest', 'space', 'culture', 'score']) { const engine = victoryFixture(kind); endRound(engine); const result = state(engine); assert.equal(result.turn.status, 'finished'); assert.equal(result.turn.victoryType, kind); const before = JSON.stringify(result); assert.equal(engine.dispatch({ type: 'civ.endTurn', civId: result.turn.activeCivId }).reason, 'GAME_OVER'); assert.equal(JSON.stringify(state(engine)), before, `${kind} at the round cap cannot settle twice`); }
{
  const engine = engineWith(({ addCity }) => { for (const [ownerId, offset, population] of [['a', 4, 1], ['b', 24, 4]]) for (let index = 0; index < 3; index += 1) { const city = addCity(`${ownerId}-culture-${index}`, ownerId, offset + index * 4, 10, population); city.greatWorkCivIds = [ownerId]; city.cultureByCiv = [{ civId: ownerId, amount: 3000 }]; } }); endRound(engine); const result = state(engine); assert.equal(result.turn.victoryType, 'culture'); assert.deepEqual(result.turn.winnerCivIds, ['b'], 'same-round cultural winners are resolved by total score');
}
{
  const engine = engineWith(({ state: snapshot, addUnit, addCity }) => {
    addCity('a-final', 'a', 5, 5); addCity('b-final', 'b', 20, 5);
    addUnit('a-path', 'a', 'warrior', 6, 5, { movementLeft: 0, order: { type: 'path', path: [{ x: 7, y: 5 }], progress: 0, improvementId: null } });
    snapshot.turn.round = 120;
  });
  endRound(engine);
  assert.equal(state(engine).units.find(unit => unit.id === 'a-path').x, 6, 'round-limit victory is checked before next-turn standing orders execute');
}
console.log('civilization engine boundary tests passed');

{
  const engine = engineWith(({ state, addUnit }) => {
    addUnit('a-scout', 'a', 'scout', 5, 5); addUnit('b-scout', 'b', 'scout', 30, 20);
    state.world.tiles[5 * 48 + 7].terrainId = 'ocean';
  });
  const partial = engine.dispatch({ type: 'unit.path', civId: 'a', unitId: 'a-scout', path: [{x:6,y:5},{x:7,y:5}] });
  assert.ok(partial.ok);
  assert.equal(state(engine).units.find(u => u.id === 'a-scout').x, 6);
  assert.equal(state(engine).units.find(u => u.id === 'a-scout').order, null);
  assert.equal(partial.events.find(e => e.type === 'unit.pathStopped').data.reason, 'ILLEGAL_TARGET');
  const before = state(engine);
  const blocked = engine.dispatch({ type: 'unit.path', civId: 'a', unitId: 'a-scout', path: [{x:7,y:5}] });
  assert.equal(blocked.ok, false, 'a fully blocked path must report failure instead of accepting a silent no-op');
  assert.deepEqual(state(engine), before);
}

{
  const engine = engineWith(({ state, addUnit }) => {
    addUnit('a-scout', 'a', 'scout', 5, 5); addUnit('b-scout', 'b', 'scout', 30, 20);
    addUnit('a-settler', 'a', 'settler', 4, 4); addUnit('b-settler', 'b', 'settler', 31, 21);
    state.world.tiles[5 * 48 + 7].terrainId = 'forest';
    state.world.tiles[5 * 48 + 8].terrainId = 'forest';
  });
  const result = engine.dispatch({ type: 'unit.path', civId: 'a', unitId: 'a-scout', path: [{x:6,y:5},{x:7,y:5},{x:8,y:5}], continue:false });
  assert.ok(result.ok);
  const arrived = state(engine).units.find(u => u.id === 'a-scout');
  assert.equal(arrived.x, 7); assert.equal(arrived.order, null);
  endRound(engine);
  assert.equal(state(engine).units.find(u => u.id === 'a-scout').x, 7, 'a current-turn-only order never resumes after movement runs out');
}
