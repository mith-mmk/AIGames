import { RULES_VERSION, SAVE_VERSION, TERRAIN } from './data.mjs';
import { chooseStarts, generateWorld } from './world.mjs';
import { isRecord, makeId } from './rules.mjs';

const SIZES = new Set(['48x32', '64x40', '96x60']);
const colors = ['#d84b4b', '#4387d4', '#4baf69', '#d6a537', '#9259c7', '#4baeb4', '#e07843', '#8a6e52'];
const configError = (config) => !isRecord(config) || !['small', 'standard', 'large', 'custom'].includes(config.presetId) || !SIZES.has(`${config.width}x${config.height}`) || !Number.isInteger(config.civilizationCount) || config.civilizationCount < 2 || config.civilizationCount > 8 || ![0.6, 1, 1.5].includes(config.speed) || !Number.isInteger(config.maxRounds) || config.maxRounds < 120 || config.maxRounds > 1000 || !['continents', 'archipelago'].includes(config.mapType) || !Number.isInteger(config.seed) || config.seed < 0 || config.seed > 0xffffffff || !Array.isArray(config.civilizationIds) || config.civilizationIds.length !== config.civilizationCount || new Set(config.civilizationIds).size !== config.civilizationCount || !config.civilizationIds.every((id) => typeof id === 'string' && id) || !config.civilizationIds.includes(config.humanCivId);
export const normalizeConfig = (input, catalog) => {
  const preset = catalog.PRESETS[input?.presetId] || catalog.PRESETS.standard;
  const config = { presetId: input?.presetId || 'standard', width: input?.width ?? preset.width, height: input?.height ?? preset.height, civilizationCount: input?.civilizationCount ?? preset.civCount, speed: input?.speed ?? preset.speed, maxRounds: input?.maxRounds ?? preset.maxTurns, mapType: input?.mapType || 'continents', seed: input?.seed ?? 1, humanCivId: input?.humanCivId || 'civ-1', civilizationIds: input?.civilizationIds || Array.from({ length: input?.civilizationCount ?? preset.civCount }, (_, index) => `civ-${index + 1}`) };
  return configError(config) ? null : config;
};
export const createInitialState = (configInput, catalog) => {
  const config = normalizeConfig(configInput, catalog); if (!config) return null;
  const state = { schemaVersion: SAVE_VERSION, rulesVersion: RULES_VERSION, gameId: `game-${config.seed}`, config, nextId: 1, rng: { algorithm: 'mulberry32', state: config.seed >>> 0 }, turn: { round: 1, activeCivId: config.civilizationIds[0], activeCivIndex: 0, phase: 'orders', status: 'running', winnerCivIds: [], victoryType: null }, world: null, civilizations: [], cities: [], units: [], relations: [], treaties: [], tradeRoutes: [], intelligence: [], spacePrograms: [], chronicle: [] };
  state.world = generateWorld({ width: config.width, height: config.height, mapType: config.mapType, rng: state.rng });
  const starts = chooseStarts(state.world, config.civilizationCount, catalog.TERRAIN || TERRAIN);
  config.civilizationIds.forEach((id, index) => {
    state.civilizations.push({ id, name: `王国 ${index + 1}`, color: colors[index], isHuman: id === config.humanCivId, eliminated: false, capitalCityId: null, treasury: 20, rates: { tax: 40, science: 40, luxury: 20 }, government: { currentId: 'despotism', pendingId: null, transitionRoundsLeft: 0 }, knownTechIds: [], research: { activeTechId: null, progressByTech: [] }, warWeariness: 0 });
    state.intelligence.push({ observerCivId: id, exploredTileIds: [], lastSeenCities: [] }); state.spacePrograms.push({ civId: id, components: { structure: 0, propulsion: 0, support: 0 }, launchedRound: null, arrivalRound: null });
    for (const typeId of ['settler', 'warrior', 'scout']) state.units.push({ id: makeId(state, 'unit'), ownerId: id, typeId, x: starts[index].x, y: starts[index].y, hp: catalog.UNITS[typeId].hp, movementLeft: catalog.UNITS[typeId].movement, experience: 0, homeCityId: null, transportedByUnitId: null, stance: 'active', order: null });
  });
  return state;
};
const idsUnique = (rows) => Array.isArray(rows) && new Set(rows.map((row) => row?.id)).size === rows.length && rows.every((row) => typeof row?.id === 'string');
const validateStructure = (snapshot, catalog) => {
  if (!isRecord(snapshot) || snapshot.schemaVersion !== SAVE_VERSION || snapshot.rulesVersion !== RULES_VERSION || !normalizeConfig(snapshot.config, catalog) || !isRecord(snapshot.world) || !Array.isArray(snapshot.world.tiles) || snapshot.world.tiles.length !== snapshot.world.width * snapshot.world.height || snapshot.world.width !== snapshot.config.width || snapshot.world.height !== snapshot.config.height || !idsUnique(snapshot.civilizations) || !idsUnique(snapshot.cities) || !idsUnique(snapshot.units) || !idsUnique(snapshot.treaties) || !idsUnique(snapshot.tradeRoutes) || !isRecord(snapshot.turn) || !isRecord(snapshot.rng) || snapshot.rng.algorithm !== 'mulberry32' || !Number.isInteger(snapshot.rng.state)) return false;
  const civs = new Set(snapshot.civilizations.map((civ) => civ.id)); const cityIds = new Set(snapshot.cities.map((city) => city.id)); const unitIds = new Set(snapshot.units.map((unit) => unit.id));
  if (civs.size !== snapshot.config.civilizationCount || !snapshot.config.civilizationIds.every((id) => civs.has(id)) || !civs.has(snapshot.turn.activeCivId) || !Number.isInteger(snapshot.nextId) || snapshot.nextId < 1) return false;
  if (!snapshot.world.tiles.every((tile, index) => isRecord(tile) && tile.id === index && tile.x === index % snapshot.world.width && tile.y === Math.floor(index / snapshot.world.width) && catalog.TERRAIN[tile.terrainId] && typeof tile.river === 'boolean' && (tile.resourceId === null || catalog.RESOURCES[tile.resourceId]) && (tile.routeId === null || ['road', 'railroad'].includes(tile.routeId)) && (tile.landUseId === null || ['irrigation', 'mine'].includes(tile.landUseId)))) return false;
  if (!snapshot.civilizations.every((civ) => isRecord(civ) && civs.has(civ.id) && isRecord(civ.rates) && [civ.rates.tax, civ.rates.science, civ.rates.luxury].every((rate) => Number.isInteger(rate) && rate >= 0 && rate <= 100 && rate % 10 === 0) && civ.rates.tax + civ.rates.science + civ.rates.luxury === 100 && catalog.GOVERNMENTS[civ.government?.currentId] && (civ.capitalCityId === null || cityIds.has(civ.capitalCityId)) && Array.isArray(civ.knownTechIds) && civ.knownTechIds.every((id) => catalog.TECHS[id]))) return false;
  if (!snapshot.cities.every((city) => isRecord(city) && civs.has(city.ownerId) && Number.isInteger(city.x) && Number.isInteger(city.y) && city.x >= 0 && city.x < snapshot.world.width && city.y >= 0 && city.y < snapshot.world.height && Number.isInteger(city.population) && city.population >= 1 && Array.isArray(city.buildingIds) && city.buildingIds.every((id) => catalog.BUILDINGS[id]) && ['balanced', 'growth', 'production', 'research'].includes(city.focus) && Array.isArray(city.workedTileIds) && Array.isArray(city.lockedTileIds) && city.lockedTileIds.every((id) => city.workedTileIds.includes(id)) && isRecord(city.specialists) && city.workedTileIds.length + city.specialists.scientist + city.specialists.taxCollector + city.specialists.entertainer === city.population && Array.isArray(city.productionQueue) && city.productionQueue.length <= 5 && city.productionQueue.every((item) => isRecord(item) && typeof item.id === 'string' && ['unit', 'building', 'project'].includes(item.kind) && (item.kind === 'unit' ? catalog.UNITS[item.definitionId] : item.kind === 'building' ? catalog.BUILDINGS[item.definitionId] : catalog.PROJECTS[item.definitionId])))) return false;
  if (!snapshot.units.every((unit) => isRecord(unit) && civs.has(unit.ownerId) && catalog.UNITS[unit.typeId] && Number.isInteger(unit.x) && Number.isInteger(unit.y) && unit.x >= 0 && unit.x < snapshot.world.width && unit.y >= 0 && unit.y < snapshot.world.height && (unit.homeCityId === null || cityIds.has(unit.homeCityId)) && (unit.transportedByUnitId === null || unitIds.has(unit.transportedByUnitId)) && ['active', 'waiting', 'fortified', 'sleeping'].includes(unit.stance))) return false;
  if (!Array.isArray(snapshot.relations) || !snapshot.relations.every((relation) => civs.has(relation.civAId) && civs.has(relation.civBId) && relation.civAId !== relation.civBId && Number.isInteger(relation.value) && relation.value >= -100 && relation.value <= 100 && typeof relation.atWar === 'boolean' && typeof relation.contacted === 'boolean')) return false;
  if (new Set(snapshot.relations.map((relation) => [relation.civAId, relation.civBId].sort().join('|'))).size !== snapshot.relations.length) return false;
  if (!snapshot.cities.every((city) => { const inRadius = (tileId) => { const tile = snapshot.world.tiles[tileId]; if (!tile || tile.x === city.x && tile.y === city.y) return false; const dx = Math.min(Math.abs(tile.x - city.x), snapshot.world.width - Math.abs(tile.x - city.x)); const dy = Math.abs(tile.y - city.y); return dx <= 2 && dy <= 2 && !(dx === 2 && dy === 2); }; return new Set(city.workedTileIds).size === city.workedTileIds.length && city.workedTileIds.every(inRadius); })) return false;
  if (!snapshot.units.every((unit) => unit.transportedByUnitId === null || (() => { const transport = snapshot.units.find((candidate) => candidate.id === unit.transportedByUnitId); return transport && transport.ownerId === unit.ownerId && catalog.UNITS[transport.typeId].capacity > 0 && transport.transportedByUnitId === null && transport.x === unit.x && transport.y === unit.y; })()) || !snapshot.units.every((unit) => stateUnitCargoCount(snapshot.units, catalog, unit) <= catalog.UNITS[unit.typeId].capacity)) return false;
  if (!Array.isArray(snapshot.treaties) || !snapshot.treaties.every((treaty) => civs.has(treaty.civAId) && civs.has(treaty.civBId) && treaty.civAId !== treaty.civBId && ['peace', 'openBorders', 'tradeAgreement', 'alliance', 'exchange'].includes(treaty.kind) && ['proposed', 'active', 'rejected', 'expired'].includes(treaty.status) && civs.has(treaty.proposedByCivId) && isRecord(treaty.terms))) return false;
  if (!Array.isArray(snapshot.tradeRoutes) || !snapshot.tradeRoutes.every((route) => civs.has(route.ownerCivId) && cityIds.has(route.originCityId) && cityIds.has(route.destinationCityId) && Array.isArray(route.pathTileIds) && route.pathTileIds.every((id) => Number.isInteger(id) && id >= 0 && id < snapshot.world.tiles.length) && ['active', 'suspended'].includes(route.status)) || snapshot.tradeRoutes.some((route) => snapshot.tradeRoutes.filter((candidate) => candidate.ownerCivId === route.ownerCivId && candidate.originCityId === route.originCityId && candidate.status === 'active').length > 3)) return false;
  if (!Array.isArray(snapshot.intelligence) || snapshot.intelligence.length !== civs.size || !snapshot.intelligence.every((intel) => civs.has(intel.observerCivId) && Array.isArray(intel.exploredTileIds) && intel.exploredTileIds.every((id) => Number.isInteger(id) && id >= 0 && id < snapshot.world.tiles.length))) return false;
  if (!Array.isArray(snapshot.spacePrograms) || snapshot.spacePrograms.length !== civs.size || !snapshot.spacePrograms.every((program) => civs.has(program.civId) && isRecord(program.components) && ['structure', 'propulsion', 'support'].every((key) => Number.isInteger(program.components[key]) && program.components[key] >= 0))) return false;
  return validateValues(snapshot, catalog);
};
const stateUnitCargoCount = (units, catalog, unit) => catalog.UNITS[unit.typeId].capacity ? units.filter((candidate) => candidate.transportedByUnitId === unit.id).length : 0;

const nonnegative = (value) => Number.isFinite(value) && value >= 0;
const integer = (value) => Number.isSafeInteger(value) && value >= 0;
const list = (value, predicate) => Array.isArray(value) && value.every(predicate);
const unique = (values) => new Set(values).size === values.length;
const validateValues = (state, catalog) => {
  const civIds = new Set(state.civilizations.map((civ) => civ.id));
  const validCiv = (id) => civIds.has(id);
  const tileId = (id) => integer(id) && id < state.world.tiles.length;
  const point = (row) => row && integer(row.x) && integer(row.y) && row.x < state.world.width && row.y < state.world.height;
  const optional = (value, predicate) => value === undefined || predicate(value);
  const turn = state.turn;
  if (!integer(state.rng.state) || state.rng.state > 0xffffffff || !integer(turn.round) || turn.round < 1 || turn.round > state.config.maxRounds || !integer(turn.activeCivIndex) || state.civilizations[turn.activeCivIndex]?.id !== turn.activeCivId || turn.phase !== 'orders' || !['running', 'finished'].includes(turn.status) || !list(turn.winnerCivIds, validCiv) || !unique(turn.winnerCivIds) || ![null, 'conquest', 'space', 'culture', 'score'].includes(turn.victoryType)) return false;
  if (turn.status === 'running' && (turn.winnerCivIds.length || turn.victoryType !== null)) return false;
  if (typeof state.gameId !== 'string' || !list(state.chronicle, (row) => isRecord(row) && typeof row.id === 'string' && typeof row.type === 'string' && integer(row.round) && (row.civId === null || validCiv(row.civId)) && isRecord(row.data))) return false;
  if (!state.civilizations.every((civ) => typeof civ.name === 'string' && typeof civ.color === 'string' && typeof civ.isHuman === 'boolean' && typeof civ.eliminated === 'boolean' && nonnegative(civ.treasury) && nonnegative(civ.warWeariness) && optional(civ.insolvent, (v) => typeof v === 'boolean') && (civ.government.pendingId === null || catalog.GOVERNMENTS[civ.government.pendingId]) && integer(civ.government.transitionRoundsLeft) && civ.government.transitionRoundsLeft <= 2 && isRecord(civ.research) && (civ.research.activeTechId === null || catalog.TECHS[civ.research.activeTechId] && !civ.knownTechIds.includes(civ.research.activeTechId)) && list(civ.research.progressByTech, (row) => isRecord(row) && catalog.TECHS[row.techId] && nonnegative(row.points)) && unique(civ.research.progressByTech.map((row) => row.techId)) && optional(civ.research.overflow, nonnegative) && unique(civ.knownTechIds))) return false;
  const occupied = new Set(state.cities.map((city) => city.y * state.world.width + city.x));
  if (occupied.size !== state.cities.length) return false;
  for (const city of state.cities) {
    if (typeof city.name !== 'string' || !nonnegative(city.foodStock) || typeof city.disorder !== 'boolean' || !unique(city.buildingIds) || !unique(city.lockedTileIds) || !['scientist', 'taxCollector', 'entertainer'].every((key) => integer(city.specialists[key])) || !list(city.cultureByCiv, (row) => isRecord(row) && validCiv(row.civId) && nonnegative(row.amount)) || !unique(city.cultureByCiv.map((row) => row.civId)) || !list(city.greatWorkCivIds, validCiv) || !unique(city.greatWorkCivIds)) return false;
    for (const id of city.workedTileIds) { if (occupied.has(id)) return false; occupied.add(id); }
    if (!city.productionQueue.every((row) => nonnegative(row.progress) && typeof row.repeat === 'boolean') || !unique(city.productionQueue.map((row) => row.id))) return false;
  }
  for (const unit of state.units) {
    const definition = catalog.UNITS[unit.typeId];
    if (!nonnegative(unit.hp) || unit.hp === 0 || unit.hp > definition.hp || !nonnegative(unit.movementLeft) || unit.movementLeft > definition.movement || !nonnegative(unit.experience)) return false;
    if (unit.order !== null) {
      if (!isRecord(unit.order)) return false;
      if (unit.order.type === 'improve') { if (!catalog.IMPROVEMENTS[unit.order.improvementId] || !integer(unit.order.progress)) return false; }
      else if (unit.order.type === 'path') { if (!list(unit.order.path, point)) return false; }
      else return false;
    }
  }
  const validTerms = (terms) => integer(terms.goldFromA) && integer(terms.goldFromB) && list(terms.techIdsFromA, (id) => Boolean(catalog.TECHS[id])) && list(terms.techIdsFromB, (id) => Boolean(catalog.TECHS[id])) && unique(terms.techIdsFromA) && unique(terms.techIdsFromB);
  if (!state.treaties.every((row) => validTerms(row.terms) && [row.civAId, row.civBId].includes(row.proposedByCivId) && (row.expiresRound === null || integer(row.expiresRound)))) return false;
  if (!unique(state.intelligence.map((row) => row.observerCivId)) || !state.intelligence.every((row) => unique(row.exploredTileIds) && list(row.lastSeenCities, (city) => isRecord(city) && typeof city.cityId === 'string' && typeof city.name === 'string' && validCiv(city.ownerId) && point(city) && integer(city.population) && city.population > 0 && integer(city.seenRound)))) return false;
  if (!unique(state.spacePrograms.map((row) => row.civId)) || !state.spacePrograms.every((row) => (row.launchedRound === null || integer(row.launchedRound)) && (row.arrivalRound === null || integer(row.arrivalRound)) && (row.launchedRound === null) === (row.arrivalRound === null))) return false;
  if (!state.tradeRoutes.every((row) => row.pathTileIds.every(tileId) && (row.suspendedReason === null || typeof row.suspendedReason === 'string'))) return false;
  return true;
};

export const validateSnapshot = (snapshot, catalog) => {
  try { return validateStructure(snapshot, catalog); } catch { return false; }
};
