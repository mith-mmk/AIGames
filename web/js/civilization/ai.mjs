import { cityForecast } from './economy.mjs';
import {
  BUILDINGS, GOVERNMENTS, IMPROVEMENTS, PROJECTS, RESOURCES, TECHS, TERRAIN, UNITS,
} from './data.mjs';

const CIVILIANS = new Set(['settler', 'worker']);
const byId = (a, b) => String(a.id).localeCompare(String(b.id));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const wrapX = (width, x) => ((x % width) + width) % width;
const hash = (value) => Array.from(String(value)).reduce(
  (total, character) => ((total * 33) + character.codePointAt(0)) >>> 0,
  5381,
);
const ownCities = (view) => view.cities.filter((city) => city.ownerId === view.self.id).sort(byId);
const ownUnits = (view) => view.units.filter((unit) => unit.ownerId === view.self.id).sort(byId);
const unitDef = (unit) => UNITS[unit.typeId];
const isCivilian = (unit) => CIVILIANS.has(unitDef(unit)?.role);
const isMilitary = (unit) => Boolean(unitDef(unit)?.attack > 0 && !isCivilian(unit));
const isLandMilitary = (unit) => isMilitary(unit) && unitDef(unit).domain === 'land';
const isTransport = (unit) => (unitDef(unit)?.capacity || 0) > 0;
const unlocked = (definition, techIds) => Boolean(
  definition && (!definition.requires || techIds.includes(definition.requires)),
);
const relationWith = (view, otherId) => view.relations.find(
  (relation) => (relation.civAId === view.self.id && relation.civBId === otherId)
    || (relation.civBId === view.self.id && relation.civAId === otherId),
) || null;
const otherParty = (treaty, civId) => treaty.civAId === civId ? treaty.civBId : treaty.civAId;
const tileAt = (view, x, y) => {
  if (y < 0 || y >= view.world.height) return null;
  return view.world.tiles[y * view.world.width + wrapX(view.world.width, x)] || null;
};
const distance = (view, a, b) => Math.max(
  Math.min(Math.abs(a.x - b.x), view.world.width - Math.abs(a.x - b.x)),
  Math.abs(a.y - b.y),
);
const adjacentTiles = (view, point) => {
  const rows = [];
  const ids = new Set();
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    if (!dx && !dy) continue;
    const tile = tileAt(view, point.x + dx, point.y + dy);
    if (tile && !ids.has(tile.id)) {
      ids.add(tile.id);
      rows.push(tile);
    }
  }
  return rows.sort((a, b) => a.id - b.id);
};
const emptyTerms = () => ({
  goldFromA: 0, goldFromB: 0, techIdsFromA: [], techIdsFromB: [],
});
const sameRates = (a, b) => a.tax === b.tax && a.science === b.science && a.luxury === b.luxury;
const sameArray = (a, b) => a.length === b.length && a.every((value, index) => value === b[index]);

function bindFacade(facade) {
  const getView = facade?.getView;
  const getPathPreview = facade?.getPathPreview;
  const getCombatPreview = facade?.getCombatPreview;
  const dispatch = facade?.dispatch;
  if (![getView, getPathPreview, getCombatPreview, dispatch].every((method) => typeof method === 'function')) {
    throw new TypeError('CivilizationAI requires the four public engine methods');
  }
  return {
    getView: getView.bind(facade),
    getPathPreview: getPathPreview.bind(facade),
    getCombatPreview: getCombatPreview.bind(facade),
    dispatch: dispatch.bind(facade),
  };
}

function turnContext(api, civId, initialView) {
  let view = initialView;
  let ended = false;
  const actions = [];
  const events = [];
  const attempted = new Set();
  const handled = new Set();
  const cap = Math.min(400, Math.max(80, ownUnits(initialView).length * 8));
  const attempt = (command, final = false) => {
    if (ended || view?.turn.status !== 'running' || view?.turn.activeCivId !== civId) return null;
    if ((!final && actions.length >= cap - 1) || (final && actions.length >= cap)) return null;
    const full = { ...command, civId };
    const key = JSON.stringify(full);
    if (attempted.has(key)) return null;
    attempted.add(key);
    const result = api.dispatch(full);
    actions.push({ command: full, ok: Boolean(result?.ok), reason: result?.reason || null });
    if (result?.ok) {
      events.push(...(result.events || []));
      view = api.getView(civId);
    }
    if (full.type === 'civ.endTurn') ended = true;
    return result;
  };
  return {
    api, civId, actions, events, attempted, handled, cap, attempt,
    get view() { return view; },
  };
}

function strategy(view) {
  const program = view.spacePrograms.find((item) => item.civId === view.self.id);
  if (program?.launchedRound !== null) return 'score';
  return ['culture', 'space', 'conquest'][hash(view.self.id) % 3];
}

function visiblePower(view, ownerId) {
  return view.units.filter((unit) => unit.ownerId === ownerId && isMilitary(unit)).reduce((total, unit) => {
    const definition = unitDef(unit);
    return total + (definition.attack + definition.defense)
      * clamp(unit.hp / definition.hp, 0.1, 1);
  }, 0);
}

function acceptTreaty(view, treaty) {
  const targetId = otherParty(treaty, view.self.id);
  const relation = relationWith(view, targetId);
  const ownGold = treaty.civAId === view.self.id ? treaty.terms.goldFromA : treaty.terms.goldFromB;
  if (ownGold > view.self.treasury) return false;
  if (treaty.kind === 'peace') {
    return Boolean(relation?.atWar) && (view.self.warWeariness >= 3
      || visiblePower(view, view.self.id) <= visiblePower(view, targetId) * 1.25);
  }
  if (treaty.kind === 'alliance') return (relation?.value || 0) >= 45;
  if (treaty.kind === 'openBorders' || treaty.kind === 'tradeAgreement') return (relation?.value || 0) >= -5;
  if (treaty.kind === 'exchange') {
    const outgoing = treaty.civAId === view.self.id ? treaty.terms.techIdsFromA : treaty.terms.techIdsFromB;
    const incoming = treaty.civAId === view.self.id ? treaty.terms.techIdsFromB : treaty.terms.techIdsFromA;
    return incoming.filter((id) => !view.self.knownTechIds.includes(id)).length >= outgoing.length;
  }
  return false;
}

function diplomacy(context) {
  for (const treaty of context.view.treaties
    .filter((item) => item.status === 'proposed' && item.proposedByCivId !== context.civId)
    .sort(byId)) {
    context.attempt({
      type: 'diplomacy.respond', treatyId: treaty.id, accept: acceptTreaty(context.view, treaty),
    });
  }
  const relations = [...context.view.relations].sort((a, b) => {
    const aId = a.civAId === context.civId ? a.civBId : a.civAId;
    const bId = b.civAId === context.civId ? b.civBId : b.civAId;
    return aId.localeCompare(bId);
  });
  for (const relation of relations) {
    const view = context.view;
    const targetCivId = relation.civAId === context.civId ? relation.civBId : relation.civAId;
    const pending = view.treaties.some((item) => item.status === 'proposed'
      && otherParty(item, context.civId) === targetCivId);
    if (pending) continue;
    if (relation.atWar) {
      const losing = visiblePower(view, context.civId) < visiblePower(view, targetCivId) * 0.8;
      if (losing || view.self.warWeariness >= 4) {
        context.attempt({ type: 'diplomacy.propose', targetCivId, kind: 'peace', terms: emptyTerms() });
      }
    } else if (relation.value >= 20) {
      const hasTrade = view.treaties.some((item) => item.status === 'active'
        && item.kind === 'tradeAgreement' && otherParty(item, context.civId) === targetCivId);
      if (!hasTrade) context.attempt({
        type: 'diplomacy.propose', targetCivId, kind: 'tradeAgreement', terms: emptyTerms(),
      });
    }
  }
}

function ratesFor(view) {
  const disorder = ownCities(view).some(
    (city) => city.disorder || (city.forecast?.happiness?.unhappy || 0) > 0,
  );
  if (disorder && view.self.treasury >= 20) return { tax: 30, science: 40, luxury: 30 };
  if ((view.self.forecast?.netGold || 0) < 0 || view.self.treasury < 10) {
    return { tax: 70, science: 20, luxury: 10 };
  }
  if (view.relations.some((relation) => relation.atWar)) {
    return { tax: 40, science: 30, luxury: 30 };
  }
  return { tax: 30, science: 60, luxury: 10 };
}

function governmentAndRates(context) {
  let view = context.view;
  const rates = ratesFor(view);
  if (!sameRates(view.self.rates, rates)) context.attempt({ type: 'civ.setRates', rates });
  view = context.view;
  if (view.self.government.pendingId) return;
  const atWar = view.relations.some((relation) => relation.atWar);
  const order = atWar
    ? ['monarchy', 'republic', 'democracy', 'despotism']
    : ['democracy', 'republic', 'monarchy', 'despotism'];
  const target = order.find((id) => unlocked(GOVERNMENTS[id], view.self.knownTechIds));
  if (target && target !== view.self.government.currentId) {
    context.attempt({ type: 'civ.changeGovernment', governmentId: target });
  }
}

function techStep(targetId, known, visiting = new Set()) {
  if (known.includes(targetId) || visiting.has(targetId) || !TECHS[targetId]) return null;
  visiting.add(targetId);
  for (const prerequisite of TECHS[targetId].requires) {
    const step = techStep(prerequisite, known, visiting);
    if (step) return step;
  }
  visiting.delete(targetId);
  return TECHS[targetId].requires.every((id) => known.includes(id)) ? targetId : null;
}

function chooseResearch(context, focus) {
  const view = context.view;
  if (view.self.research.activeTechId) return;
  const hasWater = view.world.tiles.some(
    (tile) => tile.visibility !== 'unexplored' && TERRAIN[tile.terrainId]?.water,
  );
  const strategic = focus === 'culture'
    ? ['mass_media', 'navigation', 'spaceflight', 'combustion']
    : focus === 'space'
      ? ['spaceflight', 'navigation', 'mass_media', 'combustion']
      : ['combustion', 'navigation', 'spaceflight', 'mass_media'];
  const targets = [
    'pottery', 'writing', 'currency', 'mining', 'bronze_working', 'philosophy', 'theology', 'education', 'sailing',
    ...(hasWater ? ['navigation'] : []), ...strategic,
  ];
  for (const targetId of targets) {
    const step = techStep(targetId, view.self.knownTechIds);
    if (step) {
      context.attempt({ type: 'civ.selectResearch', techId: step });
      return;
    }
  }
  const fallback = Object.entries(TECHS).filter(([id, tech]) => !view.self.knownTechIds.includes(id)
    && tech.requires.every((required) => view.self.knownTechIds.includes(required)))
    .sort((a, b) => a[1].cost - b[1].cost || a[0].localeCompare(b[0]))[0];
  if (fallback) context.attempt({ type: 'civ.selectResearch', techId: fallback[0] });
}

function yieldScore(tile, focus) {
  const terrain = TERRAIN[tile.terrainId];
  if (!terrain) return -1000;
  const resource = RESOURCES[tile.resourceId] || {};
  const improvement = IMPROVEMENTS[tile.landUseId] || {};
  const food = terrain.food + (resource.food || 0) + (improvement.food || 0);
  const production = terrain.production + (resource.production || 0) + (improvement.production || 0);
  const trade = terrain.trade + (resource.trade || 0) + (improvement.trade || 0) + (tile.river ? 1 : 0);
  if (focus === 'growth') return food * 8 + production * 2 + trade;
  if (focus === 'production') return production * 8 + food * 3 + trade;
  if (focus === 'research') return trade * 7 + food * 3 + production * 2;
  return food * 5 + production * 4 + trade * 3;
}

function cityFocus(city, focus) {
  if ((city.forecast?.food?.net || 0) < 0) return 'balanced';
  if (city.productionQueue.some((item) => item.kind === 'project')) return 'production';
  if (focus === 'space') return city.population >= 4 ? 'production' : 'research';
  if (focus === 'culture') return city.population >= 4 ? 'research' : 'growth';
  return city.population >= 4 ? 'production' : 'balanced';
}

function allocateCity(context, cityId) {
  const view = context.view;
  const city = view.cities.find((item) => item.id === cityId && item.ownerId === context.civId);
  if (!city) return;
  const otherWorked = new Set(ownCities(view).filter((item) => item.id !== city.id)
    .flatMap((item) => item.workedTileIds));
  const centerId = city.y * view.world.width + city.x;
  const radius = view.world.tiles.filter((tile) => {
    const dx = Math.min(Math.abs(tile.x - city.x), view.world.width - Math.abs(tile.x - city.x));
    const dy = Math.abs(tile.y - city.y);
    return tile.visibility !== 'unexplored' && tile.id !== centerId && dx <= 2 && dy <= 2
      && !(dx === 2 && dy === 2) && !otherWorked.has(tile.id);
  });
  const locked = [...new Set(city.lockedTileIds)].filter(
    (id) => radius.some((tile) => tile.id === id),
  ).sort((a, b) => a - b).slice(0, city.population);
  const catalog = { BUILDINGS, GOVERNMENTS, IMPROVEMENTS, PROJECTS, RESOURCES, TECHS, TERRAIN, UNITS };
  const localState = { config: view.config, world: view.world, civilizations: [{...view.self, insolvent: false}], tradeRoutes: view.tradeRoutes };
  const available = city.population - locked.length;
  let best = null;
  for (const allocationFocus of ['balanced', 'growth', 'production', 'research']) {
    const tiles = radius.filter(tile => !locked.includes(tile.id)).sort((a,b) => yieldScore(b, allocationFocus)-yieldScore(a, allocationFocus)||a.id-b.id);
    for (let entertainers=0;entertainers<=available;entertainers+=1) for(let extras=0;extras<=Math.min(3,available-entertainers);extras+=1) {
      const selected = tiles.slice(0,available-entertainers-extras);
      const spare = available-entertainers-selected.length;
      const cashPoor = view.self.treasury < 20 || view.self.forecast.netGold < 0;
      const proposed = { ...city, workedTileIds: [...locked,...selected.map(tile=>tile.id)], specialists: { scientist: cashPoor ? 0 : spare, taxCollector: cashPoor ? spare : 0, entertainer: entertainers } };
      const forecast = cityForecast(localState,catalog,proposed);
      const score = (forecast.disorder ? -1000 : 0) + Math.min(forecast.foodSurplus, 2) * (forecast.foodSurplus < 0 ? 35 : 2)
        + forecast.production * 3 + forecast.research * 4 + forecast.gold * (cashPoor ? 7 : 2);
      if(!best||score>best.score)best={score,workedTileIds:proposed.workedTileIds.sort((a,b)=>a-b),specialists:proposed.specialists};
    }
  }
  const workedTileIds = best.workedTileIds; const specialists = best.specialists;
  const current = [...city.workedTileIds].sort((a, b) => a - b);
  if (!sameArray(current, workedTileIds)
    || city.specialists.scientist !== specialists.scientist
    || city.specialists.taxCollector !== specialists.taxCollector
    || city.specialists.entertainer !== specialists.entertainer) {
    context.attempt({
      type: 'city.allocate',
      cityId,
      workedTileIds,
      lockedTileIds: locked,
      specialists,
    });
  }
}

function bestUnit(view, scoring, predicate) {
  return Object.entries(UNITS).filter(([, definition]) => predicate(definition)
    && unlocked(definition, view.self.knownTechIds))
    .sort((a, b) => scoring(b[1]) - scoring(a[1])
      || a[1].cost - b[1].cost || a[0].localeCompare(b[0]))[0]?.[0] || null;
}

function queuedCount(view, kind, definitionId) {
  return ownCities(view).reduce((count, city) => count + city.productionQueue.filter(
    (item) => item.kind === kind && item.definitionId === definitionId,
  ).length, 0);
}

function spaceProject(view) {
  const program = view.spacePrograms.find((item) => item.civId === view.self.id);
  if (!program || program.launchedRound !== null) return null;
  return [
    ['space_structure', 'structure', 3],
    ['space_propulsion', 'propulsion', 2],
    ['space_life_support', 'support', 1],
  ].find(([id, part, needed]) => program.components[part] + queuedCount(view, 'project', id) < needed
    && unlocked(PROJECTS[id], view.self.knownTechIds))?.[0] || null;
}

function productionChoices(view, city, focus) {
  const choices = [];
  const known = view.self.knownTechIds;
  const add = (kind, definitionId, repeat = false) => {
    if (!definitionId || choices.some(
      (item) => item.kind === kind && item.definitionId === definitionId,
    )) return;
    const table = kind === 'unit' ? UNITS : kind === 'building' ? BUILDINGS : PROJECTS;
    if (!unlocked(table[definitionId], known)) return;
    if (kind === 'building' && (city.buildingIds.includes(definitionId)
      || city.productionQueue.some(
        (item) => item.kind === kind && item.definitionId === definitionId,
      ))) return;
    if (kind === 'project' && city.productionQueue.some(
      (item) => item.kind === kind && item.definitionId === definitionId,
    )) return;
    choices.push({ kind, definitionId, repeat });
  };

  const defenders = view.units.filter((unit) => unit.ownerId === view.self.id
    && unit.x === city.x && unit.y === city.y && isLandMilitary(unit));
  const happiness = Object.entries(BUILDINGS).filter(([, building]) => building.happiness > 0
    && unlocked(building, known)).sort((a, b) => b[1].happiness - a[1].happiness
    || a[1].cost - b[1].cost || a[0].localeCompare(b[0]))[0]?.[0];
  const defense = bestUnit(view, (unit) => unit.defense * 3 + unit.attack,
    (unit) => unit.domain === 'land' && unit.attack > 0);
  const attack = bestUnit(view, (unit) => unit.attack * 3 + unit.defense,
    (unit) => unit.domain === 'land' && unit.attack > 0);
  const workers = ownUnits(view).filter((unit) => unit.typeId === 'worker').length
    + queuedCount(view, 'unit', 'worker');
  const settlers = ownUnits(view).filter((unit) => unit.typeId === 'settler').length
    + queuedCount(view, 'unit', 'settler');
  const targetCities = Math.min(6, 3 + Math.floor(view.turn.round / 150));
  const atWar = view.relations.some((relation) => relation.atWar);

  if ((city.disorder || (city.forecast?.happiness?.unhappy || 0) > 0) && happiness) {
    add('building', happiness);
  }
  if (!defenders.length && ownUnits(view).filter(isLandMilitary).length < ownCities(view).length * 2) add('unit', defense);
  if (workers < Math.max(1, Math.ceil(ownCities(view).length / 2))) add('unit', 'worker');
  if (settlers < 1 && ownCities(view).length < targetCities && city.population >= 2) {
    add('unit', 'settler');
  }
  if (focus === 'culture' && known.includes('mass_media')
    && !city.greatWorkCivIds.includes(view.self.id)) add('project', 'cultural_masterpiece');
  if (focus === 'space' || view.turn.round > view.config.maxRounds * 0.6) {
    add('project', spaceProject(view));
  }
  add('building', 'library');
  if(view.self.treasury < 30)add('building', 'market');
  if ((city.forecast?.food?.net || 0) <= 2) add('building', 'granary');
  if (atWar) add('unit', attack);
  if (city.focus === 'research') {
    for (const id of ['researchlab', 'university', 'library']) add('building', id);
  }
  if (city.focus === 'production') {
    for (const id of ['powerplant', 'factory', 'workshop']) add('building', id);
  }
  if (focus === 'culture') {
    for (const id of ['broadcast', 'museum', 'theater', 'temple']) add('building', id);
  }
  const knowsWater = view.world.tiles.some((tile) => TERRAIN[tile.terrainId]?.water);
  if (knowsWater && !ownUnits(view).some(isTransport)
    && queuedCount(view, 'unit', 'transport') === 0) add('unit', 'transport');
  add('building', 'market');
  if(ownUnits(view).filter(isMilitary).length < ownCities(view).length * (atWar ? 4 : 2) && view.self.forecast.netGold >= 0)add('unit', attack); 
  return choices;
}

function manageCities(context, focus) {
  for (const cityStub of ownCities(context.view)) {
    let city = context.view.cities.find((item) => item.id === cityStub.id);
    if (!city) continue;
    const nextFocus = cityFocus(city, focus);
    if (city.focus !== nextFocus) {
      context.attempt({ type: 'city.setFocus', cityId: city.id, focus: nextFocus });
    }
    allocateCity(context, city.id);
    const currentCity=context.view.cities.find(item=>item.id===city.id);
    if(currentCity.productionQueue[0]?.repeat)context.attempt({type:'city.queue',cityId:city.id,action:'setRepeat',itemId:currentCity.productionQueue[0].id,repeat:false});
    city = context.view.cities.find((item) => item.id === cityStub.id);
    if (!city) continue;
    for (const choice of productionChoices(context.view, city, focus)) {
      city = context.view.cities.find((item) => item.id === cityStub.id);
      if (!city || city.productionQueue.length >= 2) break;
      context.attempt({
        type: 'city.queue', cityId: city.id, action: 'append', item: choice,
      });
    }
  }
}

function settlementTile(view, tile, cities) {
  return Boolean(tile && tile.visibility !== 'unexplored' && TERRAIN[tile.terrainId]
    && !TERRAIN[tile.terrainId].water && tile.terrainId !== 'mountain' && !tile.cityId
    && cities.every((city) => distance(view, city, tile) >= 4));
}

function settlementTargets(view, settler) {
  const cities = ownCities(view);
  return view.world.tiles.filter((tile) => settlementTile(view, tile, cities)).sort((a, b) => {
    const aScore = yieldScore(a, 'balanced') * 5 - distance(view, settler, a);
    const bScore = yieldScore(b, 'balanced') * 5 - distance(view, settler, b);
    return bScore - aScore || a.id - b.id;
  });
}

function moveByPreview(context, unit, target) {
  const preview = context.api.getPathPreview(
    context.civId, unit.id, { x: target.x, y: target.y },
  );
  if (!preview?.ok || !preview.path?.length) return false;
  const result = context.attempt({
    type: 'unit.path',
    unitId: unit.id,
    path: preview.path.map((point) => ({ x: point.x, y: point.y })),
  });
  if (result?.ok) context.handled.add(unit.id);
  return Boolean(result?.ok);
}

function foundCities(context) {
  for (const stub of ownUnits(context.view).filter(
    (unit) => unit.typeId === 'settler' && !unit.transportedByUnitId,
  )) {
    const unit = context.view.units.find((item) => item.id === stub.id);
    if (!unit) continue;
    const cities = ownCities(context.view);
    const tile = tileAt(context.view, unit.x, unit.y);
    if (cities.length === 0 || settlementTile(context.view, tile, cities)) {
      const name = cities.length === 0
        ? context.view.self.name + '首都'
        : '開拓地 ' + String(cities.length + 1) + '-' + unit.id;
      if (context.attempt({ type: 'unit.foundCity', unitId: unit.id, name })?.ok) {
        context.handled.add(unit.id);
      }
    }
  }
}

function improvementChoices(view, tile) {
  const ids = [];
  if (!tile.landUseId) {
    if (['grassland', 'plains', 'desert', 'tundra'].includes(tile.terrainId)) {
      ids.push('irrigation');
    }
    if (['hills', 'mountain', 'forest', 'desert'].includes(tile.terrainId)) ids.push('mine');
  }
  if (!tile.routeId) ids.push('road');
  if (tile.routeId === 'road') ids.push('railroad');
  return ids.filter((id) => unlocked(IMPROVEMENTS[id], view.self.knownTechIds)
    && IMPROVEMENTS[id].terrains.includes(tile.terrainId));
}

function workers(context) {
  for (const stub of ownUnits(context.view).filter((unit) => unit.typeId === 'worker')) {
    const unit = context.view.units.find((item) => item.id === stub.id);
    if (!unit || unit.transportedByUnitId || unit.order || unit.movementLeft <= 0) continue;
    const current = tileAt(context.view, unit.x, unit.y);
    const improvement = improvementChoices(context.view, current)[0];
    if (improvement && context.attempt({
      type: 'unit.improve', unitId: unit.id, improvementId: improvement,
    })?.ok) {
      context.handled.add(unit.id);
      continue;
    }
    const targets = ownCities(context.view).flatMap((city) => context.view.world.tiles.filter((tile) => {
      const dx = Math.min(Math.abs(tile.x - city.x), context.view.world.width - Math.abs(tile.x - city.x));
      const dy = Math.abs(tile.y - city.y);
      return tile.visibility !== 'unexplored' && dx <= 2 && dy <= 2 && !(dx === 2 && dy === 2)
        && improvementChoices(context.view, tile).length > 0;
    })).sort((a, b) => distance(context.view, unit, a) - distance(context.view, unit, b)
      || a.id - b.id);
    if (!targets.some((target) => moveByPreview(context, unit, target))) {
      context.attempt({ type: 'unit.wait', unitId: unit.id });
      context.handled.add(unit.id);
    }
  }
}

function unloadTargets(view, cargo, transport) {
  const cities = ownCities(view);
  return adjacentTiles(view, transport).filter((tile) => tile.visibility !== 'unexplored'
    && TERRAIN[tile.terrainId] && !TERRAIN[tile.terrainId].water && tile.terrainId !== 'mountain')
    .sort((a, b) => {
      const priority = (tile) => {
        const city = view.cities.find((item) => item.id === tile.cityId);
        if (city && city.ownerId !== view.self.id && relationWith(view, city.ownerId)?.atWar) return 3;
        if (cargo.typeId === 'settler' && settlementTile(view, tile, cities)) return 2;
        return 1;
      };
      return priority(b) - priority(a) || a.id - b.id;
    });
}

function unloadCargo(context) {
  for (const stub of ownUnits(context.view).filter((unit) => unit.transportedByUnitId)) {
    const cargo = context.view.units.find((item) => item.id === stub.id);
    const transport = context.view.units.find((item) => item.id === cargo?.transportedByUnitId);
    if (!cargo || !transport) continue;
    for (const target of unloadTargets(context.view, cargo, transport)) {
      if (context.attempt({
        type: 'unit.unload', unitId: cargo.id, to: { x: target.x, y: target.y },
      })?.ok) {
        context.handled.add(cargo.id);
        break;
      }
    }
  }
}

function transportDestination(view, transport, cargo) {
  const enemyCities = view.cities.filter((city) => city.ownerId !== view.self.id
    && relationWith(view, city.ownerId)?.atWar).sort(byId);
  const settle = cargo.find((unit) => unit.typeId === 'settler');
  const landTargets = [...enemyCities, ...(settle ? settlementTargets(view, settle) : [])];
  for (const land of landTargets) {
    const water = adjacentTiles(view, land).filter(
      (tile) => tile.visibility !== 'unexplored' && TERRAIN[tile.terrainId]?.water,
    ).sort((a, b) => distance(view, transport, a) - distance(view, transport, b)
      || a.id - b.id);
    if (water.length) return water[0];
  }
  return null;
}

function explore(context, unit) {
  if (!unit || unit.movementLeft <= 0 || unit.transportedByUnitId) return false;
  const definition = unitDef(unit);
  const candidates = adjacentTiles(context.view, unit).filter((tile) => {
    if (tile.visibility === 'unexplored') return true;
    const terrain = TERRAIN[tile.terrainId];
    return terrain && (definition.domain === 'sea'
      ? terrain.water && (definition.ocean || tile.terrainId !== 'ocean')
      : !terrain.water && tile.terrainId !== 'mountain');
  });
  const offset = (hash(unit.id) + context.view.turn.round) % Math.max(1, candidates.length);
  const rotated = candidates.slice(offset).concat(candidates.slice(0, offset));
  const ordered = rotated.sort((a, b) => (a.visibility === 'unexplored' ? 0 : 1)
    - (b.visibility === 'unexplored' ? 0 : 1) || a.id - b.id);
  for (const tile of ordered) {
    if (context.attempt({
      type: 'unit.move', unitId: unit.id, to: { x: tile.x, y: tile.y },
    })?.ok) {
      context.handled.add(unit.id);
      return true;
    }
  }
  const frontier = context.view.world.tiles.filter((tile) => tile.visibility !== 'unexplored'
    && adjacentTiles(context.view, tile).some((neighbor) => neighbor.visibility === 'unexplored'))
    .sort((a, b) => distance(context.view, unit, a) - distance(context.view, unit, b)
      || a.id - b.id);
  return frontier.some((tile) => moveByPreview(context, unit, tile));
}

function transports(context) {
  for (const stub of ownUnits(context.view).filter(isTransport)) {
    let transport = context.view.units.find((item) => item.id === stub.id);
    if (!transport || transport.movementLeft <= 0 || transport.order) continue;
    let cargo = ownUnits(context.view).filter((unit) => unit.transportedByUnitId === transport.id);
    const capacity = unitDef(transport).capacity;
    if (cargo.length < capacity) {
      const boarders = ownUnits(context.view).filter((unit) => unit.id !== transport.id
        && !unit.transportedByUnitId && unitDef(unit).domain === 'land'
        && distance(context.view, unit, transport) <= 1).sort((a, b) => {
        const rank = (unit) => unit.typeId === 'settler' ? 0 : isMilitary(unit) ? 1 : 2;
        return rank(a) - rank(b) || byId(a, b);
      });
      for (const boarder of boarders.slice(0, capacity - cargo.length)) {
        context.attempt({
          type: 'unit.board', unitId: boarder.id, transportUnitId: transport.id,
        });
      }
    }
    transport = context.view.units.find((item) => item.id === stub.id);
    cargo = ownUnits(context.view).filter((unit) => unit.transportedByUnitId === transport?.id);
    if (!transport) continue;
    const target = transportDestination(context.view, transport, cargo);
    if (target && moveByPreview(context, transport, target)) continue;
    if (explore(context, transport)) continue;
    context.attempt({ type: 'unit.wait', unitId: transport.id });
    context.handled.add(transport.id);
  }
}

function moveSettlers(context) {
  for (const stub of ownUnits(context.view).filter((unit) => unit.typeId === 'settler')) {
    const unit = context.view.units.find((item) => item.id === stub.id);
    if (!unit || unit.transportedByUnitId || context.handled.has(unit.id)
      || unit.movementLeft <= 0) continue;
    if (settlementTargets(context.view, unit).some(
      (target) => moveByPreview(context, unit, target),
    )) continue;
    if (explore(context, unit)) continue;
    context.attempt({ type: 'unit.wait', unitId: unit.id });
    context.handled.add(unit.id);
  }
}

function declareWarIfAdvantage(context, targetCivId) {
  const view = context.view;
  const relation = relationWith(view, targetCivId);
  if (relation?.atWar) return true;
  if (!relation?.contacted) return false;
  const ownStrength = visiblePower(view, context.civId);
  const targetStrength = Math.max(1, visiblePower(view, targetCivId));
  const cityGuarded = ownCities(view).every((city) => ownUnits(view).some(
    (unit) => isLandMilitary(unit) && unit.x === city.x && unit.y === city.y,
  ));
  const late = view.turn.round >= view.config.maxRounds * 0.55;
  if ((!cityGuarded && ownCities(view).length > 1) || ownStrength < targetStrength * 1.25
    || ((relation.value || 0) >= 0 && !late)) return false;
  return Boolean(context.attempt({
    type: 'diplomacy.declareWar', targetCivId,
  })?.ok);
}

function attackAdjacent(context, unit) {
  const enemies = context.view.units.filter((candidate) => candidate.ownerId !== context.civId
    && !candidate.transportedByUnitId && distance(context.view, unit, candidate) === 1)
    .sort((a, b) => a.ownerId.localeCompare(b.ownerId) || byId(a, b));
  for (const enemy of enemies) {
    if (!declareWarIfAdvantage(context, enemy.ownerId)) continue;
    const attacker = context.view.units.find((item) => item.id === unit.id);
    const defender = context.view.units.find((item) => item.id === enemy.id);
    if (!attacker || !defender) return true;
    const preview = context.api.getCombatPreview(
      context.civId, attacker.id, defender.id,
    );
    const defending = ownCities(context.view).some(
      (city) => distance(context.view, city, defender) <= 1,
    );
    if (preview?.ok && preview.winChance >= (defending ? 0.35 : 0.5)) {
      if (context.attempt({
        type: 'unit.attack', unitId: attacker.id, targetUnitId: defender.id,
      })?.ok) {
        context.handled.add(unit.id);
        return true;
      }
    }
  }
  return false;
}

function retreat(context) {
  for (const stub of ownUnits(context.view).filter(isMilitary)) {
    const unit = context.view.units.find((item) => item.id === stub.id);
    if (!unit || unit.transportedByUnitId || unit.hp >= unitDef(unit).hp * 0.4) continue;
    const city = ownCities(context.view).sort(
      (a, b) => distance(context.view, unit, a) - distance(context.view, unit, b)
        || byId(a, b),
    )[0];
    if (city && unit.x === city.x && unit.y === city.y) {
      context.attempt({ type: 'unit.sleep', unitId: unit.id });
      context.handled.add(unit.id);
    } else if (city) {
      moveByPreview(context, unit, city);
    }
  }
}

function defend(context) {
  for (const city of ownCities(context.view)) {
    const present = ownUnits(context.view).filter(
      (unit) => isLandMilitary(unit) && unit.x === city.x && unit.y === city.y,
    );
    if (present.length) {
      const defender = present.find((unit) => !context.handled.has(unit.id));
      if (defender && defender.stance !== 'fortified') {
        context.attempt({ type: 'unit.fortify', unitId: defender.id });
        context.handled.add(defender.id);
      }
      continue;
    }
    const nearest = ownUnits(context.view).filter((unit) => isLandMilitary(unit)
      && !context.handled.has(unit.id) && !unit.transportedByUnitId)
      .sort((a, b) => distance(context.view, a, city) - distance(context.view, b, city)
        || byId(a, b))[0];
    if (nearest) moveByPreview(context, nearest, city);
  }
}

function militaryAndExploration(context) {
  retreat(context);
  for (const stub of ownUnits(context.view).filter(isMilitary)) {
    const unit = context.view.units.find((item) => item.id === stub.id);
    if (!unit || context.handled.has(unit.id) || unit.transportedByUnitId
      || unit.movementLeft <= 0) continue;
    attackAdjacent(context, unit);
  }
  defend(context);
  for (const stub of ownUnits(context.view)) {
    const unit = context.view.units.find((item) => item.id === stub.id);
    if (!unit || context.handled.has(unit.id) || unit.transportedByUnitId || unit.order
      || unit.movementLeft <= 0 || unit.stance === 'sleeping' || unit.typeId === 'worker'
      || unit.typeId === 'settler' || isTransport(unit)) continue;
    const target = context.view.cities.filter((city) => city.ownerId !== context.civId
      && relationWith(context.view, city.ownerId)?.atWar)
      .sort((a, b) => distance(context.view, unit, a) - distance(context.view, unit, b)
        || byId(a, b))[0];
    if (target && moveByPreview(context, unit, target)) continue;
    if (explore(context, unit)) continue;
    context.attempt({
      type: isLandMilitary(unit) ? 'unit.fortify' : 'unit.wait', unitId: unit.id,
    });
    context.handled.add(unit.id);
  }
}

function trade(context) {
  for (const origin of ownCities(context.view)) {
    const existing = context.view.tradeRoutes.filter(
      (route) => route.originCityId === origin.id,
    );
    if (existing.length >= 3) continue;
    const destinations = context.view.cities.filter((city) => city.id !== origin.id
      && !existing.some((route) => route.destinationCityId === city.id)
      && (city.ownerId === context.civId || relationWith(context.view, city.ownerId)?.contacted))
      .sort((a, b) => (a.ownerId === context.civId ? 0 : 1)
        - (b.ownerId === context.civId ? 0 : 1)
        || distance(context.view, origin, a) - distance(context.view, origin, b)
        || byId(a, b));
    if (destinations.length) context.attempt({
      type: 'trade.open',
      originCityId: origin.id,
      destinationCityId: destinations[0].id,
    });
  }
}

function launch(context) {
  const program = context.view.spacePrograms.find((item) => item.civId === context.civId);
  if (program && program.launchedRound === null && program.components.structure >= 3
    && program.components.propulsion >= 2 && program.components.support >= 1
    && context.view.self.knownTechIds.includes('spaceflight')) {
    context.attempt({ type: 'space.launch' });
  }
}

/**
 * Runs one bounded, synchronous AI turn. Actions include all unique dispatch
 * attempts as { command, ok, reason }; events contain accepted engine events.
 */
export class CivilizationAI {
  runTurn(engineFacade, civId) {
    const api = bindFacade(engineFacade);
    const initialView = api.getView(civId);
    if (!initialView || initialView.turn.status !== 'running'
      || initialView.turn.activeCivId !== civId) return { actions: [], events: [] };

    const context = turnContext(api, civId, initialView);
    const focus = strategy(initialView);
    diplomacy(context);
    governmentAndRates(context);
    chooseResearch(context, focus);
    launch(context);
    foundCities(context);
    manageCities(context, focus);
    workers(context);
    unloadCargo(context);
    transports(context);
    moveSettlers(context);
    militaryAndExploration(context);
    trade(context);
    launch(context);
    context.attempt({ type: 'civ.endTurn' }, true);
    return { actions: context.actions, events: context.events };
  }
}
