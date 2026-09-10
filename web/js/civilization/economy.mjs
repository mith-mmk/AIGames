import { cityRadiusTiles, getTile } from './world.mjs';
import { idOf, makeId, scaled } from './rules.mjs';

export const CITY_BASE_RESEARCH = 1;

/** Preserve every trade point; equal remainders prioritize science, then tax. */
export function allocateTrade(trade, rates) {
  const parts = ['science', 'tax', 'luxury'].map((key, priority) => ({
    key, priority, value: Math.floor(trade * rates[key] / 100), remainder: trade * rates[key] % 100,
  }));
  const remaining = trade - parts.reduce((sum, part) => sum + part.value, 0);
  const ordered = [...parts].sort((a, b) => b.remainder - a.remainder || a.priority - b.priority);
  for (let index = 0; index < remaining; index++) ordered[index].value++;
  return Object.fromEntries(parts.map(part => [part.key, part.value]));
}

const resourceYield = (catalog, tile) => catalog.RESOURCES[tile.resourceId] || { food: 0, production: 0, trade: 0 };
export const tileYield = (catalog, tile) => {
  const terrain = catalog.TERRAIN[tile.terrainId]; const resource = resourceYield(catalog, tile);
  const improvement = catalog.IMPROVEMENTS[tile.landUseId] || { food: 0, production: 0, trade: 0 };
  return { food: terrain.food + resource.food + improvement.food, production: terrain.production + resource.production + improvement.production, trade: terrain.trade + resource.trade + improvement.trade + (tile.routeId === 'road' ? 1 : tile.routeId === 'railroad' ? 2 : 0) + (tile.river ? 1 : 0) };
};
const buildingYield = (catalog, city) => city.buildingIds.reduce((sum, id) => { const building = catalog.BUILDINGS[id]; for (const key of ['food', 'production', 'trade', 'research', 'culture', 'happiness', 'defense']) sum[key] += building[key] || 0; return sum; }, { food: 0, production: 0, trade: 0, research: 0, culture: 0, happiness: 0, defense: 0 });
const cityTiles = (state, city) => cityRadiusTiles(state.world, city);
export const assignCitizens = (state, catalog, city) => {
  if (!city.focus) city.focus = 'balanced';
  const occupied = new Set(state.cities.filter((other) => other.id !== city.id).flatMap((other) => [other.y * state.world.width + other.x, ...other.workedTileIds]));
  const candidates = cityTiles(state, city).filter((tile) => !(tile.x === city.x && tile.y === city.y) && !occupied.has(tile.id));
  const score = (tile) => { const yieldValue = tileYield(catalog, tile); if (city.focus === 'growth') return yieldValue.food * 5 + yieldValue.production + yieldValue.trade; if (city.focus === 'production') return yieldValue.production * 5 + yieldValue.food; if (city.focus === 'research') return yieldValue.trade * 5 + yieldValue.food; return yieldValue.food * 2 + yieldValue.production * 2 + yieldValue.trade; };
  const specialists = { ...city.specialists }; let available = city.population;
  for (const key of ['scientist', 'taxCollector', 'entertainer']) { specialists[key] = Math.min(available, specialists[key] || 0); available -= specialists[key]; }
  const locked = city.workedTileIds.filter((id) => city.lockedTileIds.includes(id) && !occupied.has(id)).map((id) => state.world.tiles[id]).filter(Boolean).slice(0, available);
  const chosen = [...locked];
  for (const tile of candidates.sort((a, b) => score(b) - score(a) || a.id - b.id)) if (chosen.length < available && !chosen.some((item) => item.id === tile.id)) chosen.push(tile);
  specialists.scientist += available - chosen.length;
  city.workedTileIds = chosen.map((tile) => tile.id); city.lockedTileIds = city.lockedTileIds.filter((id) => city.workedTileIds.includes(id)); city.specialists = specialists;
};
export const cityForecast = (state, catalog, city) => {
  const civ = idOf(state.civilizations, city.ownerId); const government = catalog.GOVERNMENTS[civ.government.currentId]; const base = { food: 0, production: 0, trade: 0 };
  const center = getTile(state.world, city.x, city.y); [center, ...city.workedTileIds.map((id) => state.world.tiles[id]).filter(Boolean)].forEach((tile) => { const yieldValue = tileYield(catalog, tile); base.food += yieldValue.food; base.production += yieldValue.production; base.trade += yieldValue.trade; });
  const techEffects = civ.knownTechIds.reduce((sum, id) => { const effects = catalog.TECHS[id]?.effects || {}; for (const key of ['food', 'production', 'trade', 'research']) sum[key] += effects[key] || 0; return sum; }, { food: 0, production: 0, trade: 0, research: 0 });
  const routeTrade = state.tradeRoutes.filter((route) => route.originCityId === city.id && route.status === 'active').length * 3;
  const bonus = buildingYield(catalog, city); base.food += bonus.food + techEffects.food; base.production += bonus.production + techEffects.production; base.trade = Math.floor((base.trade + bonus.trade + techEffects.trade + routeTrade) * government.tradeMultiplier);
  const tradeAllocation = allocateTrade(base.trade, civ.rates);
  const specialists = city.specialists; const foodSurplus = base.food - city.population * 2; const happiness = bonus.happiness + specialists.entertainer * 2 + tradeAllocation.luxury + government.happiness - city.population - Math.ceil(civ.warWeariness * government.warWeariness);
  const disorder = happiness < 0; const trade = disorder ? 0 : base.trade;
  const transitioning = civ.government.transitionRoundsLeft > 0;
  const researchSources = { base: CITY_BASE_RESEARCH, trade: tradeAllocation.science, specialists: specialists.scientist * 3, buildings: bonus.research, technology: techEffects.research };
  if (disorder || transitioning) for (const key of Object.keys(researchSources)) researchSources[key] = 0;
  const research = Object.values(researchSources).reduce((sum, value) => sum + value, 0);
  const production = disorder || transitioning || civ.insolvent ? 0 : base.production;
  const gold = disorder || transitioning ? 0 : tradeAllocation.tax + specialists.taxCollector * 3;
  const queue = city.productionQueue[0]; const target = queue ? (queue.kind === 'unit' ? catalog.UNITS[queue.definitionId] : queue.kind === 'building' ? catalog.BUILDINGS[queue.definitionId] : catalog.PROJECTS[queue.definitionId]) : null;
  return { food: base.food, foodSurplus, production, trade, tradeAllocation, researchSources, research, gold, happiness, disorder, culture: disorder ? 0 : bonus.culture, growthNeeded: scaled(20 + city.population * 10, state.config.speed), productionNeeded: target ? scaled(target.cost, state.config.speed) : null, turnsToGrowth: foodSurplus > 0 ? Math.ceil(Math.max(0, scaled(20 + city.population * 10, state.config.speed) - city.foodStock) / foodSurplus) : null, turnsToProduction: target && production > 0 ? Math.ceil(Math.max(0, scaled(target.cost, state.config.speed) - queue.progress) / production) : null };
};
const updateCulture = (city, civId, amount) => { const row = city.cultureByCiv.find((entry) => entry.civId === civId); if (row) row.amount += amount; else city.cultureByCiv.push({ civId, amount }); };
const completeQueue = (state, catalog, city, events) => {
  let queue = city.productionQueue[0]; let overflow = 0;
  while (queue) {
    const definition = queue.kind === 'unit' ? catalog.UNITS[queue.definitionId] : queue.kind === 'building' ? catalog.BUILDINGS[queue.definitionId] : catalog.PROJECTS[queue.definitionId]; const cost = scaled(definition.cost, state.config.speed);
    if (queue.progress < cost) break;
    overflow = queue.progress - cost;
    if (queue.kind === 'unit') {
      if (definition.populationCost && city.population <= definition.populationCost) break;
      const port = definition.domain === 'sea' ? cityTiles(state, city).find((tile) => Math.abs(tile.y - city.y) <= 1 && Math.min(Math.abs(tile.x - city.x), state.world.width - Math.abs(tile.x - city.x)) <= 1 && catalog.TERRAIN[tile.terrainId].water && (definition.ocean || tile.terrainId === 'coast')) : city;
      if (!port) break;
      if (definition.populationCost) { city.population -= definition.populationCost; assignCitizens(state, catalog, city); }
      state.units.push({ id: makeId(state, 'unit'), ownerId: city.ownerId, typeId: queue.definitionId, x: port.x, y: port.y, hp: definition.hp, movementLeft: 0, experience: 0, homeCityId: city.id, transportedByUnitId: null, stance: 'active', order: null });
    } else if (queue.kind === 'building') { if (!city.buildingIds.includes(queue.definitionId)) city.buildingIds.push(queue.definitionId); } else if (queue.definitionId === 'cultural_masterpiece') { if (!city.greatWorkCivIds.includes(city.ownerId)) city.greatWorkCivIds.push(city.ownerId); } else { const program = state.spacePrograms.find((item) => item.civId === city.ownerId); program.components[definition.part] += 1; }
    events.push({ type: 'production.completed', civId: city.ownerId, entityId: city.id, data: { definitionId: queue.definitionId } });
    if (queue.repeat && queue.kind === 'unit') { queue.progress = overflow; continue; }
    city.productionQueue.shift(); queue = city.productionQueue[0]; if (queue) queue.progress += overflow;
  }
};
export const settleCivilization = (state, catalog, civId, events) => {
  const civ = idOf(state.civilizations, civId); const cities = state.cities.filter((city) => city.ownerId === civId); const upkeep = civilizationUpkeep(state, catalog, civId).total; let gold = 0; let science = 0;
  for (const city of cities) {
    const forecast = cityForecast(state, catalog, city); city.disorder = forecast.disorder; city.foodStock += forecast.foodSurplus;
    const needed = forecast.growthNeeded; if (city.foodStock >= needed) { city.foodStock -= needed; city.population += 1; assignCitizens(state, catalog, city); events.push({ type: 'city.grew', civId, entityId: city.id, data: { population: city.population } }); }
    if (city.foodStock < 0) { city.population = Math.max(1, city.population - 1); city.foodStock = 0; assignCitizens(state, catalog, city); events.push({ type: 'city.starved', civId, entityId: city.id, data: { population: city.population } }); }
    if (!city.disorder && city.productionQueue[0]) { city.productionQueue[0].progress += forecast.production; completeQueue(state, catalog, city, events); }
    if (!city.disorder) updateCulture(city, civId, forecast.culture); gold += forecast.gold; science += forecast.research;
  }
  civ.treasury += gold - upkeep; civ.insolvent = civ.treasury < 0; if (civ.insolvent) { civ.treasury = 0; events.push({ type: 'civ.insolvent', civId, entityId: null, data: { upkeep, gold } }); }
  const research = civ.research; if (research.activeTechId && catalog.TECHS[research.activeTechId]) { const row = research.progressByTech.find((entry) => entry.techId === research.activeTechId) || (research.progressByTech.push({ techId: research.activeTechId, points: 0 }), research.progressByTech.at(-1)); row.points += science + (research.overflow || 0); research.overflow = 0; const tech = catalog.TECHS[research.activeTechId]; const needed = scaled(tech.cost, state.config.speed); if (row.points >= needed) { research.overflow = row.points - needed; row.points = needed; civ.knownTechIds.push(research.activeTechId); research.activeTechId = null; events.push({ type: 'tech.completed', civId, entityId: row.techId, data: { points: row.points } }); } }
  civ.warWeariness = Math.max(0, civ.warWeariness + (state.relations.some((relation) => relation.atWar && [relation.civAId, relation.civBId].includes(civId)) ? 0.1 : -0.5));
  if (civ.government.transitionRoundsLeft > 0 && --civ.government.transitionRoundsLeft === 0) { civ.government.currentId = civ.government.pendingId; civ.government.pendingId = null; events.push({ type: 'government.changed', civId, entityId: null, data: { governmentId: civ.government.currentId } }); }
  return { gold, science, upkeep };
};

export const civilizationUpkeep = (state, catalog, civId) => {
  const civ = idOf(state.civilizations, civId); const government = catalog.GOVERNMENTS[civ.government.currentId];
  const cities = state.cities.filter((city) => city.ownerId === civId); const units = state.units.filter((unit) => unit.ownerId === civId);
  const buildings = cities.reduce((sum, city) => sum + city.buildingIds.reduce((total, id) => total + catalog.BUILDINGS[id].upkeep, 0), 0);
  const military = units.slice(government.freeUnits).reduce((sum, unit) => sum + catalog.UNITS[unit.typeId].upkeep, 0);
  return { cities: cities.length, buildings, units: military, multiplier: government.upkeepMultiplier, total: Math.ceil((cities.length + buildings + military) * government.upkeepMultiplier) };
};
