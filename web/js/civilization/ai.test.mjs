import assert from 'node:assert/strict';
import { CivilizationAI } from './ai.mjs';
import { CivilizationEngine } from './engine.mjs';
import { TECHS, UNITS } from './data.mjs';

const clone = (value) => JSON.parse(JSON.stringify(value));
const config = () => ({
  presetId: 'custom',
  width: 48,
  height: 32,
  civilizationCount: 2,
  speed: 1,
  maxRounds: 120,
  mapType: 'continents',
  seed: 73,
  humanCivId: 'civ-2',
  civilizationIds: ['civ-1', 'civ-2'],
});

const allowedFacade = (engine) => new Proxy({}, {
  get(_target, property) {
    if (['getView', 'getPathPreview', 'getCombatPreview', 'dispatch'].includes(property)) {
      return engine[property].bind(engine);
    }
    throw new Error('AI accessed a privileged engine member: ' + String(property));
  },
});

{
  const first = new CivilizationEngine();
  const second = new CivilizationEngine();
  assert.equal(first.init(config()).ok, true);
  assert.equal(second.init(config()).ok, true);
  const firstResult = new CivilizationAI().runTurn(allowedFacade(first), 'civ-1');
  const secondResult = new CivilizationAI().runTurn(allowedFacade(second), 'civ-1');
  assert.deepEqual(firstResult.actions, secondResult.actions, 'same observed state must choose same actions');
  assert.deepEqual(first.serialize(), second.serialize(), 'same AI turn must produce the same state');
  assert(firstResult.actions.length <= 80, 'initial turn must respect the bounded action cap');
  assert.equal(firstResult.actions.filter(
    (item) => item.command.type === 'civ.endTurn',
  ).length, 1, 'AI must end its turn exactly once');
  assert.equal(firstResult.actions.find(
    (item) => item.command.type === 'civ.endTurn',
  ).ok, true);
  assert(firstResult.actions.some(
    (item) => item.ok && item.command.type === 'unit.foundCity',
  ), 'initial settler must found a city');
  assert(firstResult.actions.some(
    (item) => item.ok && item.command.type === 'civ.selectResearch',
  ), 'AI must select research');
  assert(firstResult.actions.some(
    (item) => item.ok && item.command.type === 'city.queue',
  ), 'new city must receive production');
  assert.equal(first.getView('civ-2').turn.activeCivId, 'civ-2');
}

{
  const engine = new CivilizationEngine();
  engine.init(config());
  let dispatches = 0;
  const facade = allowedFacade({
    getView: engine.getView.bind(engine),
    getPathPreview: engine.getPathPreview.bind(engine),
    getCombatPreview: engine.getCombatPreview.bind(engine),
    dispatch(command) {
      dispatches += 1;
      return engine.dispatch(command);
    },
  });
  assert.deepEqual(new CivilizationAI().runTurn(facade, 'civ-2'), { actions: [], events: [] });
  assert.equal(dispatches, 0, 'non-active civilization must not dispatch');
}

{
  const engine = new CivilizationEngine();
  assert.equal(engine.init(config()).ok, true);
  for (let round = 0; round < 3; round += 1) {
    for (const civId of ['civ-1', 'civ-2']) {
      const result = new CivilizationAI().runTurn(allowedFacade(engine), civId);
      assert.equal(result.actions.filter(
        (item) => item.command.type === 'civ.endTurn',
      ).length, 1);
      assert(result.actions.length <= Math.min(400, Math.max(
        80,
        engine.serialize().units.filter((unit) => unit.ownerId === civId).length * 8,
      )));
    }
  }
  const validator = new CivilizationEngine();
  assert.equal(validator.load(engine.serialize()).ok, true,
    'multiple AI rounds must preserve the snapshot contract');
  assert.equal(engine.serialize().turn.round, 4);
}

function makeScenario(civId = 'civ-1') {
  const width = 8;
  const height = 8;
  const tiles = [];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    tiles.push({
      id: y * width + x,
      x,
      y,
      visibility: x === 0 || y === 0 || x === width - 1 || y === height - 1
        ? 'unexplored' : 'visible',
      terrainId: 'grassland',
      river: false,
      resourceId: null,
      routeId: null,
      landUseId: null,
      cityId: null,
      unitIds: [],
    });
  }
  const city = {
    id: 'city-home',
    ownerId: civId,
    name: '本都',
    x: 3,
    y: 3,
    population: 4,
    foodStock: 10,
    buildingIds: [],
    focus: 'balanced',
    workedTileIds: [18, 19, 20, 26],
    lockedTileIds: [],
    specialists: { scientist: 0, taxCollector: 0, entertainer: 0 },
    productionQueue: [],
    cultureByCiv: [{ civId, amount: 100 }],
    greatWorkCivIds: [],
    disorder: false,
    forecast: {
      food: { gross: 11, consumed: 8, net: 3, threshold: 40, turns: 10, reason: null },
      production: { perRound: 6, current: 0, required: 0, turns: null, reason: 'NO_QUEUE' },
      trade: { gross: 8, tax: 2, science: 5, luxury: 1 },
      happiness: { happy: 2, content: 2, unhappy: 0, reasons: [] },
      upkeep: 0,
      culture: { perRound: 2, selfTotal: 100, threshold: 3000, qualified: false },
    },
  };
  tiles[city.y * width + city.x].cityId = city.id;
  const knownTechIds = Object.keys(TECHS);
  return {
    config: { maxRounds: 400, speed: 1 },
    self: {
      id: civId,
      name: '試験国',
      treasury: 100,
      rates: { tax: 30, science: 60, luxury: 10 },
      government: { currentId: 'democracy', pendingId: null, transitionRoundsLeft: 0 },
      knownTechIds,
      research: { activeTechId: 'spaceflight', progressByTech: [] },
      warWeariness: 0,
      forecast: { grossTrade: 8, tax: 2, science: 5, luxury: 1, upkeep: 0, netGold: 2, researchPerRound: 5 },
    },
    turn: {
      round: 100,
      activeCivId: civId,
      activeCivIndex: 0,
      phase: 'orders',
      status: 'running',
      winnerCivIds: [],
      victoryType: null,
    },
    world: { width, height, wrapX: true, tiles },
    civilizations: [{ id: civId, name: '試験国', color: '#fff', eliminated: false }],
    cities: [city],
    units: [
      {
        id: 'unit-guard',
        ownerId: civId,
        typeId: 'tank',
        x: 3,
        y: 3,
        hp: UNITS.tank.hp,
        movementLeft: UNITS.tank.movement,
        experience: 0,
        homeCityId: city.id,
        transportedByUnitId: null,
        stance: 'active',
        order: null,
        forecast: { movement: UNITS.tank.movement },
      },
      {
        id: 'unit-worker',
        ownerId: civId,
        typeId: 'worker',
        x: 3,
        y: 3,
        hp: UNITS.worker.hp,
        movementLeft: UNITS.worker.movement,
        experience: 0,
        homeCityId: city.id,
        transportedByUnitId: null,
        stance: 'active',
        order: null,
        forecast: { movement: UNITS.worker.movement },
      },
      {
        id: 'unit-settler',
        ownerId: civId,
        typeId: 'settler',
        x: 3,
        y: 3,
        hp: UNITS.settler.hp,
        movementLeft: UNITS.settler.movement,
        experience: 0,
        homeCityId: city.id,
        transportedByUnitId: null,
        stance: 'active',
        order: null,
        forecast: { movement: UNITS.settler.movement },
      },
    ],
    relations: [],
    treaties: [],
    tradeRoutes: [],
    spacePrograms: [{
      civId,
      components: { structure: 0, propulsion: 0, support: 0 },
      launchedRound: null,
      arrivalRound: null,
    }],
    availableCommands: [],
    pending: { uncommandedUnitIds: [], cityIdsWithoutProduction: [city.id], needsResearch: false },
  };
}

function fakeFacade(sourceView, hooks = {}) {
  const view = clone(sourceView);
  let eventId = 1;
  const commands = [];
  const api = {
    getView() { return clone(view); },
    getPathPreview(_civId, unitId, to) {
      const unit = view.units.find((item) => item.id === unitId);
      if (!unit || hooks.noPaths) {
        return { ok: false, reason: 'ILLEGAL_TARGET', path: [], totalCost: null, arrivalRound: null };
      }
      return {
        ok: true,
        reason: null,
        path: [{ x: to.x, y: to.y, cost: 1, arrivalRound: view.turn.round, certainty: 'known' }],
        totalCost: 1,
        arrivalRound: view.turn.round,
      };
    },
    getCombatPreview(_civId, attackerId, defenderId) {
      assert(view.units.some((item) => item.id === attackerId));
      assert(view.units.some((item) => item.id === defenderId), 'AI requested hidden defender data');
      if (hooks.combatRequiresWar && !view.relations.some((item) => item.atWar)) {
        return {
          ok: false, reason: 'DIPLOMACY_REQUIRED', attackerPower: null, defenderPower: null, winChance: null,
        };
      }
      return { ok: true, reason: null, attackerPower: 20, defenderPower: 2, winChance: 0.9 };
    },
    dispatch(command) {
      commands.push(clone(command));
      const event = {
        id: 'fake-event-' + String(eventId++),
        type: command.type,
        round: view.turn.round,
        civId: command.civId,
        entityId: command.unitId || command.cityId || null,
        data: {},
      };
      if (command.type === 'civ.endTurn') view.turn.activeCivId = 'next-civ';
      if (command.type === 'civ.setRates') view.self.rates = clone(command.rates);
      if (command.type === 'civ.selectResearch') view.self.research.activeTechId = command.techId;
      if (command.type === 'civ.changeGovernment') view.self.government.pendingId = command.governmentId;
      if (command.type === 'city.setFocus') {
        view.cities.find((item) => item.id === command.cityId).focus = command.focus;
      }
      if (command.type === 'city.allocate') {
        const city = view.cities.find((item) => item.id === command.cityId);
        city.workedTileIds = clone(command.workedTileIds);
        city.lockedTileIds = clone(command.lockedTileIds);
        city.specialists = clone(command.specialists);
      }
      if (command.type === 'city.queue') {
        view.cities.find((item) => item.id === command.cityId).productionQueue.push({
          id: 'queue-' + String(eventId),
          progress: 0,
          ...clone(command.item),
        });
      }
      if (command.type === 'unit.board') {
        view.units.find((item) => item.id === command.unitId).transportedByUnitId = command.transportUnitId;
      }
      if (command.type === 'diplomacy.declareWar') {
        const relation = view.relations.find((item) => item.civAId === command.targetCivId
          || item.civBId === command.targetCivId);
        if (relation) relation.atWar = true;
      }
      if (command.type === 'unit.attack') {
        view.units = view.units.filter((item) => item.id !== command.targetUnitId);
      }
      if (command.type === 'space.launch') {
        view.spacePrograms[0].launchedRound = view.turn.round;
      }
      return { ok: true, reason: null, events: [event] };
    },
  };
  return {
    facade: new Proxy({}, {
      get(_target, property) {
        if (Object.hasOwn(api, property)) return api[property].bind(api);
        throw new Error('AI accessed hidden facade property: ' + String(property));
      },
    }),
    commands,
  };
}

{
  const view = makeScenario('civ-1');
  const secretEnemy = { id: 'enemy-secret', x: 6, y: 6 };
  assert(!view.units.some((unit) => unit.id === secretEnemy.id));
  const fake = fakeFacade(view, { noPaths: true });
  const result = new CivilizationAI().runTurn(fake.facade, 'civ-1');
  assert(result.actions.length <= Math.max(80, view.units.length * 8));
  assert(!JSON.stringify(fake.commands).includes(secretEnemy.id), 'hidden enemy must never influence commands');
  assert.equal(fake.commands.filter((command) => command.type === 'civ.endTurn').length, 1);
}

{
  const view = makeScenario('civ-1');
  view.world.tiles[2 * view.world.width + 3].terrainId = 'coast';
  view.units.push({
    id: 'unit-transport',
    ownerId: view.self.id,
    typeId: 'transport',
    x: 3,
    y: 2,
    hp: UNITS.transport.hp,
    movementLeft: UNITS.transport.movement,
    experience: 0,
    homeCityId: null,
    transportedByUnitId: null,
    stance: 'active',
    order: null,
    forecast: { movement: UNITS.transport.movement },
  });
  const fake = fakeFacade(view, { noPaths: true });
  new CivilizationAI().runTurn(fake.facade, 'civ-1');
  assert(fake.commands.some((command) => command.type === 'unit.board'
    && command.unitId === 'unit-settler' && command.transportUnitId === 'unit-transport'),
  'transport must board an adjacent colonist');
}

{
  const view = makeScenario('civ-2');
  view.spacePrograms[0].components = { structure: 3, propulsion: 2, support: 1 };
  const fake = fakeFacade(view);
  new CivilizationAI().runTurn(fake.facade, 'civ-2');
  assert.equal(fake.commands.filter((command) => command.type === 'space.launch').length, 1);
}

{
  const view = makeScenario('civ-1');
  const fake = fakeFacade(view);
  new CivilizationAI().runTurn(fake.facade, 'civ-1');
  assert(fake.commands.some((command) => command.type === 'city.queue'
    && command.item.definitionId === 'cultural_masterpiece'),
  'culture-focused civilization must queue its city project');
}

{
  const view = makeScenario('civ-3');
  view.civilizations.push({ id: 'enemy-public', name: '敵国', color: '#f00', eliminated: false });
  view.relations.push({
    civAId: view.self.id,
    civBId: 'enemy-public',
    value: -60,
    atWar: false,
    contacted: true,
  });
  view.units.push({
    id: 'enemy-visible',
    ownerId: 'enemy-public',
    typeId: 'scout',
    x: 4,
    y: 3,
    hp: UNITS.scout.hp,
    movementLeft: UNITS.scout.movement,
    experience: 0,
    homeCityId: null,
    transportedByUnitId: null,
    stance: 'active',
    order: null,
    forecast: { movement: UNITS.scout.movement },
  });
  const fake = fakeFacade(view, { combatRequiresWar: true });
  new CivilizationAI().runTurn(fake.facade, 'civ-3');
  const declaration = fake.commands.findIndex((command) => command.type === 'diplomacy.declareWar');
  const attack = fake.commands.findIndex((command) => command.type === 'unit.attack');
  assert(declaration >= 0 && attack > declaration, 'AI must declare war before attacking');
}

console.log('civilization AI passed: public facade, deterministic bounded turn, expansion, transport, culture, space, and war');
