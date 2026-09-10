import { cityForecast, civilizationUpkeep } from './economy.mjs';
import { clone, idOf, relationFor } from './rules.mjs';

export const visibleTileIds = (state, civId) => {
  const seen = new Set(); const reveal = (point, radius) => { for (let y = Math.max(0, point.y - radius); y <= Math.min(state.world.height - 1, point.y + radius); y += 1) for (let x = point.x - radius; x <= point.x + radius; x += 1) seen.add(y * state.world.width + ((x % state.world.width + state.world.width) % state.world.width)); };
  state.cities.filter((city) => city.ownerId === civId).forEach((city) => reveal(city, 2)); state.units.filter((unit) => unit.ownerId === civId && unit.transportedByUnitId === null).forEach((unit) => reveal(unit, catalogVision(unit)));
  return seen;
};
const catalogVision = (unit) => unit.typeId === 'scout' ? 2 : 1;
export const refreshIntelligence = (state, civId) => {
  const intelligence = state.intelligence.find((item) => item.observerCivId === civId); if (!intelligence) return;
  const visible = visibleTileIds(state, civId); for (const id of visible) if (!intelligence.exploredTileIds.includes(id)) intelligence.exploredTileIds.push(id);
  [...state.units, ...state.cities].filter((unit) => unit.ownerId !== civId && visible.has(unit.y * state.world.width + unit.x)).forEach((unit) => { let relation = state.relations.find((item) => (item.civAId === civId && item.civBId === unit.ownerId) || (item.civAId === unit.ownerId && item.civBId === civId)); if (!relation) { relation = { civAId: civId, civBId: unit.ownerId, value: 0, atWar: false, contacted: true }; state.relations.push(relation); } else relation.contacted = true; });
  state.cities.filter((city) => visible.has(city.y * state.world.width + city.x)).forEach((city) => { const prior = intelligence.lastSeenCities.find((item) => item.cityId === city.id); const current = { cityId: city.id, ownerId: city.ownerId, name: city.name, x: city.x, y: city.y, population: city.population, seenRound: state.turn.round }; if (prior) Object.assign(prior, current); else intelligence.lastSeenCities.push(current); });
};
const knownWorld = (state, civId) => {
  const intel = state.intelligence.find((item) => item.observerCivId === civId); const explored = new Set(intel?.exploredTileIds || []); const visible = visibleTileIds(state, civId); const liveCities = new Map(state.cities.map((city) => [city.y * state.world.width + city.x, city])); const remembered = new Map((intel?.lastSeenCities || []).map((city) => [city.y * state.world.width + city.x, city]));
  return state.world.tiles.map((tile) => {
    const visibility = visible.has(tile.id) ? 'visible' : explored.has(tile.id) ? 'remembered' : 'unexplored'; const city = visibility === 'visible' ? liveCities.get(tile.id) : remembered.get(tile.id);
    const unitIds = visibility === 'visible' ? state.units.filter((unit) => unit.transportedByUnitId === null && unit.x === tile.x && unit.y === tile.y && (unit.ownerId === civId || visible.has(tile.id))).map((unit) => unit.id) : [];
    if (visibility === 'unexplored') return { id: tile.id, x: tile.x, y: tile.y, visibility, terrainId: null, river: null, resourceId: null, routeId: null, landUseId: null, cityId: null, unitIds };
    return { id: tile.id, x: tile.x, y: tile.y, visibility, terrainId: tile.terrainId, river: tile.river, resourceId: tile.resourceId, routeId: tile.routeId, landUseId: tile.landUseId, cityId: city?.id || city?.cityId || null, unitIds };
  });
};
export const buildCivilizationView = (state, catalog, civId) => {
  const self = idOf(state.civilizations, civId); if (!self) return null;
  const visible = visibleTileIds(state, civId);
  const structuredForecast = (city) => {
    const flat = cityForecast(state, catalog, city);
    const owner = idOf(state.civilizations, city.ownerId);
    const ownCulture = city.cultureByCiv.find((row) => row.civId === city.ownerId)?.amount || 0;
    const queue = city.productionQueue[0];
    const populationBlocked = queue?.kind === 'unit' && catalog.UNITS[queue.definitionId].populationCost >= city.population;
    const reason = flat.disorder ? 'DISORDER' : owner.government.transitionRoundsLeft ? 'GOVERNMENT_TRANSITION' : owner.insolvent ? 'INSOLVENT' : !queue ? 'NO_QUEUE' : populationBlocked ? 'POPULATION_REQUIRED' : flat.production <= 0 ? 'NO_PRODUCTION' : null;
    return {
      food: { gross: flat.food, consumed: city.population * 2, net: flat.foodSurplus, current: city.foodStock, threshold: flat.growthNeeded, turns: flat.turnsToGrowth, reason: flat.foodSurplus <= 0 ? 'NO_SURPLUS' : null },
      production: { perRound: flat.production, current: queue?.progress || 0, required: flat.productionNeeded, turns: reason ? null : flat.turnsToProduction, reason },
      trade: { gross: flat.trade, tax: flat.gold, science: flat.research, luxury: flat.disorder ? 0 : flat.tradeAllocation.luxury },
      happiness: { happy: Math.max(0, flat.happiness), content: Math.max(0, city.population - Math.max(0, -flat.happiness)), unhappy: Math.max(0, -flat.happiness), reasons: flat.disorder ? ['DISORDER'] : [], population: city.population, entertainment: city.specialists.entertainer * 2 + flat.tradeAllocation.luxury, government: catalog.GOVERNMENTS[owner.government.currentId].happiness, warWeariness: Math.ceil(owner.warWeariness * catalog.GOVERNMENTS[owner.government.currentId].warWeariness) },
      upkeep: city.buildingIds.reduce((sum, id) => sum + catalog.BUILDINGS[id].upkeep, 1),
      culture: { perRound: flat.culture, selfTotal: ownCulture, threshold: scaledCulture(state), qualified: city.greatWorkCivIds.includes(city.ownerId) && ownCulture >= scaledCulture(state) }
    };
  };
  const knownCities = state.cities.filter((city) => city.ownerId === civId || visible.has(city.y * state.world.width + city.x)).map((city) => city.ownerId === civId ? ({ ...clone(city), forecast: structuredForecast(city) }) : ({ id: city.id, name: city.name, ownerId: city.ownerId, x: city.x, y: city.y, population: city.population, seenRound: state.turn.round }));
  const intel = state.intelligence.find((row) => row.observerCivId === civId);
  for (const memory of intel?.lastSeenCities || []) if (memory.ownerId !== civId && !knownCities.some((city) => city.id === memory.cityId) && !visible.has(memory.y * state.world.width + memory.x)) knownCities.push({ ...clone(memory), id: memory.cityId, remembered: true });
  const knownUnits = state.units.filter((unit) => unit.ownerId === civId || (unit.transportedByUnitId === null && visible.has(unit.y * state.world.width + unit.x))).map((unit) => ({ ...clone(unit), forecast: { movement: catalog.UNITS[unit.typeId].movement } }));
  const knownCivs = state.civilizations.filter((civ) => civ.id === civId || relationFor(state, civId, civ.id)?.contacted).map((civ) => civ.id === civId ? clone(civ) : ({ id: civ.id, name: civ.name, color: civ.color, eliminated: civ.eliminated }));
  const ownCities = state.cities.filter((city) => city.ownerId === civId);
  const ownUnits = state.units.filter((unit) => unit.ownerId === civId && unit.transportedByUnitId === null);
  const pending = { uncommandedUnitIds: ownUnits.filter((unit) => unit.movementLeft > 0 && unit.stance === 'active' && !unit.order).map((unit) => unit.id), cityIdsWithoutProduction: ownCities.filter((city) => city.productionQueue.length === 0).map((city) => city.id), needsResearch: !self.research.activeTechId && self.knownTechIds.length < Object.keys(catalog.TECHS).length };
  const selfCopy = clone(self); const forecasts = ownCities.map((city) => cityForecast(state, catalog, city));
  const sum = (key) => forecasts.reduce((total, forecast) => total + forecast[key], 0);
  const upkeep = civilizationUpkeep(state, catalog, civId);
  selfCopy.forecast = { grossTrade: sum('trade'), tax: sum('gold'), science: sum('research'), luxury: forecasts.reduce((total, f) => total + (f.disorder ? 0 : f.tradeAllocation.luxury), 0), upkeep: upkeep.total, upkeepBreakdown: upkeep, netGold: sum('gold') - upkeep.total, researchPerRound: sum('research') };
  selfCopy.forecast.researchSources = Object.fromEntries(['base', 'trade', 'specialists', 'buildings', 'technology'].map(key => [key, forecasts.reduce((total, forecast) => total + forecast.researchSources[key], 0)]));
  const program = state.spacePrograms.find((row) => row.civId === civId);
  const score = { population: ownCities.reduce((total, city) => total + city.population * 10, 0), technology: self.knownTechIds.length * 25, development: ownCities.reduce((total, city) => total + city.buildingIds.length * 8, 0), culture: ownCities.reduce((total, city) => total + (city.cultureByCiv.find((row) => row.civId === civId)?.amount || 0), 0), space: Object.values(program.components).reduce((total, count) => total + count * 20, 0) };
  selfCopy.score = { ...score, total: Object.values(score).reduce((a, b) => a + b, 0) };
  selfCopy.victory = { conquest: { remainingCivilizations: state.civilizations.filter((civ) => civ.id !== civId && !civ.eliminated).length }, culture: { qualifiedCities: ownCities.filter((city) => structuredForecast(city).culture.qualified).length, requiredCities: 3, threshold: scaledCulture(state) }, space: clone(program), score: selfCopy.score };
  return clone({ config: state.config, self: selfCopy, turn: state.turn, world: { width: state.world.width, height: state.world.height, wrapX: true, tiles: knownWorld(state, civId) }, civilizations: knownCivs, cities: knownCities, units: knownUnits, relations: state.relations.filter((relation) => relation.civAId === civId || relation.civBId === civId), treaties: state.treaties.filter((treaty) => treaty.civAId === civId || treaty.civBId === civId), tradeRoutes: state.tradeRoutes.filter((route) => route.ownerCivId === civId), spacePrograms: state.spacePrograms.filter((program) => program.civId === civId), chronicle: state.chronicle.filter((row) => row.civId === null || row.civId === civId), availableCommands: ['unit.move', 'unit.path', 'unit.attack', 'unit.wait', 'unit.fortify', 'unit.sleep', 'unit.wake', 'unit.foundCity', 'unit.improve', 'unit.board', 'unit.unload', 'city.allocate', 'city.setFocus', 'city.queue', 'civ.setRates', 'civ.selectResearch', 'civ.changeGovernment', 'diplomacy.propose', 'diplomacy.respond', 'diplomacy.declareWar', 'trade.open', 'trade.close', 'space.launch', 'civ.endTurn'], pending });
};
const scaledCulture = (state) => Math.max(1, Math.round(3000 * state.config.speed));
