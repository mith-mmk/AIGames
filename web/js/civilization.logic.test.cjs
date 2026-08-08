const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const code = fs.readFileSync("web/js/civilization.js", "utf8");
const context = { console: { ...console, warn() {} }, globalThis: {} };
vm.createContext(context);
vm.runInContext(code, context);

const api = context.globalThis.ChronicleKingdoms;
const CivilizationCore = context.globalThis.CivilizationCore;

function createStorage() {
    const values = new Map();
    return {
        values,
        getItem(key) { return values.get(key) || null; },
        setItem(key, value) { values.set(key, value); },
    };
}

function createGame(seed = 482731) {
    const storage = createStorage();
    const game = new CivilizationCore({ seed, storage });
    game.startGame();
    return { game, storage };
}

function placeUnit(game, unit, x, y) {
    game.map.tiles.forEach((tile) => { tile.unitIds = tile.unitIds.filter((id) => id !== unit.id); });
    unit.x = x;
    unit.y = y;
    game.map.getTile(x, y).unitIds.push(unit.id);
}

assert.equal(typeof CivilizationCore, "function");
assert.equal(api.SAVE_VERSION, 2);

{
    const first = new CivilizationCore({ seed: 111 });
    const second = new CivilizationCore({ seed: 111 });
    const third = new CivilizationCore({ seed: 222 });
    assert.deepEqual(first.map.tiles.map((tile) => tile.terrain), second.map.tiles.map((tile) => tile.terrain));
    assert.notDeepEqual(first.map.tiles.map((tile) => tile.terrain), third.map.tiles.map((tile) => tile.terrain));
    assert.equal(first.campaign.status, "ready");
    first.startGame();
    assert.equal(first.campaign.status, "running");
    assert.equal(first.cities.length, 4);
    assert.equal(first.units.filter((unit) => unit.ownerId === "player").length, 3);
}

{
    const map = new api.WorldMap(8, 8, 3);
    assert.equal(map.canFoundCity(0, 0, []), false);
    const mountain = map.tiles.findIndex((tile) => tile.terrain === "mountain");
    if (mountain >= 0) assert.equal(map.canFoundCity(mountain % map.width, Math.floor(mountain / map.width), []), false);
    const plains = map.tiles.findIndex((tile) => ["plains", "forest", "hills", "desert"].includes(tile.terrain));
    assert.equal(map.canFoundCity(plains % map.width, Math.floor(plains / map.width), []), true);
}

{
    const { game } = createGame();
    const player = game.getCiv("player");
    const city = game.cities.find((item) => item.ownerId === "player");
    const initialPopulation = city.population;
    for (let turn = 0; turn < 8; turn += 1) game.processCivilizationTurn(player);
    assert.ok(city.population > initialPopulation);
    assert.ok(player.gold > 100);
    assert.ok(player.researchPoints > 0);
    assert.ok(city.culture > 10);
    assert.ok(city.workedTiles.length >= 1);
    const yields = game.cityManager.calculateYields(city);
    assert.ok(yields.food >= 1);
    assert.ok(game.getResearchRate(player) >= 1);
    assert.ok(game.cityManager.getProductionRate(city) >= 1);
}

{
    const { game } = createGame();
    const player = game.getCiv("player");
    const city = game.cities.find((item) => item.ownerId === "player");
    player.techs = ["pottery", "writing", "currency", "bronze_working", "code_of_laws", "masonry", "sailing", "education", "industrialization", "electricity"];
    assert.equal(Object.keys(api.BUILDING_DEFS).length, 10);
    assert.equal(game.setCityProduction(city.id, "library"), true);
    city.production = game.getProductionCost("library", player);
    game.processCivilizationTurn(player);
    assert.equal(city.buildings.includes("library"), true);
    const beforeResearch = player.researchPoints;
    game.processCivilizationTurn(player);
    assert.ok(player.researchPoints > beforeResearch);
}

{
    const { game } = createGame();
    const worker = game.units.find((unit) => unit.ownerId === "player" && unit.type === "worker");
    game.getCiv("player").techs.push("pottery", "mining", "engineering");
    const before = { x: worker.x, y: worker.y };
    assert.equal(game.getMoveOptions(worker).some((option) => option.ok), true);
    assert.equal(game.moveUnit(worker.id, -1, -1).ok, false);
    const destination = game.map.neighbors(before.x, before.y).find((candidate) => api.TERRAIN[candidate.tile.terrain].move < 99);
    const result = game.moveUnit(worker.id, destination.x, destination.y);
    assert.equal(result.ok, true);
    assert.equal(worker.movementLeft < api.UNIT_DEFS.worker.movement, true);
    const tile = game.map.getTile(worker.x, worker.y);
    const improvement = ["farm", "mine", "road"].find((id) => api.IMPROVEMENT_DEFS[id].terrains.includes(tile.terrain));
    assert.equal(game.unitManager.buildImprovement(worker.id, improvement), true);
    assert.equal(tile.improvement, improvement);
}

{
    const random = { next: () => 0.5 };
    const attacker = { attack: 8, defense: 2, veteran: 0 };
    const defender = { attack: 2, defense: 3, veteran: 0 };
    const first = api.CombatResolver.resolve(attacker, defender, "plains", random);
    const second = api.CombatResolver.resolve(attacker, defender, "plains", { next: () => 0.5 });
    assert.deepEqual(first, second);
    assert.equal(typeof first.attackerWins, "boolean");
    assert.equal(api.CombatResolver.resolve({ attack: 0, defense: 1, veteran: 0 }, defender, "plains", random).invalid, true);
}

{
    const { game } = createGame();
    const player = game.getCiv("player");
    const enemy = game.civilizations.find((civ) => civ.id !== "player");
    const enemyCity = game.cities.find((city) => city.ownerId === enemy.id);
    const attacker = game.units.find((unit) => unit.ownerId === "player" && unit.type === "warrior");
    const defender = game.units.find((unit) => unit.ownerId === enemy.id && unit.type === "warrior");
    attacker.type = "tank";
    defender.type = "scout";
    attacker.x = enemyCity.x;
    attacker.y = enemyCity.y;
    defender.x = enemyCity.x;
    defender.y = enemyCity.y;
    game.map.getTile(enemyCity.x, enemyCity.y).unitIds = [attacker.id, defender.id];
    game.random = { next: () => 0.01 };
    game.resolveCombat(attacker, defender, enemyCity.isCapital ? "plains" : "forest");
    assert.equal(enemyCity.ownerId, "player");
    assert.equal(game.units.includes(defender), false);
    assert.equal(player.name, "アステリア");
}

{
    const { game } = createGame();
    const player = game.getCiv("player");
    assert.equal(api.TechnologyTree.isAvailable(player, "pottery"), true);
    assert.equal(api.TechnologyTree.isAvailable(player, "writing"), false);
    assert.equal(game.chooseResearch("pottery"), true);
    player.researchPoints = 20;
    game.completeResearch(player);
    assert.equal(player.techs.includes("pottery"), true);
    assert.equal(api.TechnologyTree.isAvailable(player, "writing"), true);
}

{
    const { game } = createGame();
    game.campaign.status = "running";
    game.cities.filter((city) => city.ownerId !== "player").forEach((city) => { city.ownerId = "player"; });
    game.checkVictory();
    assert.equal(game.campaign.status, "won");
    assert.equal(game.campaign.victoryType, "conquest");
    assert.equal(game.civilizations.filter((civ) => civ.id !== "player").every((civ) => civ.eliminated), true);
}

{
    const { game } = createGame();
    const player = game.getCiv("player");
    game.campaign.status = "running";
    player.techs = ["orbital_charter"];
    player.launchProgress = 5;
    game.checkVictory();
    assert.equal(game.campaign.victoryType, "science");
}

{
    const { game } = createGame();
    const player = game.getCiv("player");
    game.campaign.status = "running";
    player.culture = 800;
    game.civilizations.filter((civ) => civ.id !== "player").forEach((civ) => { civ.capitalId = null; });
    game.cities.filter((city) => city.ownerId === "player").forEach((city) => { city.culture = 80; });
    game.cities.push({ id: "culture-city-2", ownerId: "player", x: 15, y: 12, population: 3, culture: 80, productionId: "warrior", production: 0, food: 0, buildings: [], defense: 2 });
    game.cities.push({ id: "culture-city-3", ownerId: "player", x: 17, y: 12, population: 3, culture: 80, productionId: "warrior", production: 0, food: 0, buildings: [], defense: 2 });
    game.checkVictory();
    assert.equal(game.campaign.victoryType, "culture");
}

{
    const { game } = createGame();
    const player = game.getCiv("player");
    game.campaign.status = "running";
    game.campaign.turn = 120;
    player.score = 10000;
    game.civilizations.filter((civ) => civ.id !== "player").forEach((civ) => { civ.gold = 0; });
    game.checkVictory();
    assert.equal(game.campaign.victoryType, "score");
}

{
    const { game, storage } = createGame();
    game.endTurn();
    assert.equal(game.save(storage), true);
    const loaded = new CivilizationCore({ seed: 99, storage });
    assert.equal(loaded.load(storage), true);
    assert.equal(loaded.campaign.turn, game.campaign.turn);
    assert.equal(loaded.map.seed, game.map.seed);
    storage.setItem(api.SAVE_KEY, "not-json");
    assert.equal(loaded.load(storage), false);
    storage.setItem(api.SAVE_KEY, JSON.stringify({ version: 99 }));
    assert.equal(loaded.load(storage), false);
    storage.setItem(api.SAVE_KEY, JSON.stringify({ version: 1 }));
    assert.equal(loaded.load(storage), false);
}

{
    const { game } = createGame();
    const ai = game.civilizations.find((civ) => civ.id !== "player");
    const production = api.CivilizationAI.chooseProduction(game, ai);
    assert.equal(Boolean(api.UNIT_DEFS[production] || api.BUILDING_DEFS[production]), true);
    assert.equal(game.isProductionAvailable(ai, production), true);
    assert.equal(api.CivilizationAI.chooseResearch(ai) !== null, true);
    api.CivilizationAI.runTurn(game, ai);
    assert.ok(game.cities.some((city) => city.ownerId === ai.id && city.productionId));
}

{
    const { game } = createGame();
    const target = game.civilizations.find((civ) => civ.id !== "player");
    const player = game.getCiv("player");
    assert.equal(game.getRelationStatus(game.getRelationValue("player", target.id)), "中立");
    assert.equal(game.negotiate(target.id, "trade"), true);
    assert.equal(player.gold, 90);
    assert.equal(game.getRelationValue("player", target.id), 8);
    assert.equal(game.negotiate(target.id, "war"), true);
    assert.equal(game.getRelationStatus(game.getRelationValue("player", target.id)), "戦争");
    assert.equal(game.negotiate(target.id, "peace"), true);
    assert.equal(game.getRelationStatus(game.getRelationValue("player", target.id)), "中立");
}

{
    const { game } = createGame();
    for (let turn = 0; turn < 9; turn += 1) assert.equal(game.endTurn(), true);
    assert.equal(game.campaign.turn, 10);
    assert.equal(game.events.current.type, "policy");
    assert.equal(game.endTurn(), false);
    assert.equal(game.choosePolicy("culture"), true);
    assert.equal(game.events.current, null);
    assert.equal(game.endTurn(), true);
}

{
    const { game } = createGame();
    const worker = game.units.find((unit) => unit.ownerId === "player" && unit.type === "worker");
    const destination = game.map.neighbors(worker.x, worker.y).find((candidate) => api.TERRAIN[candidate.tile.terrain].move < 99);
    assert.equal(game.moveUnit(worker.id, destination.x, destination.y).ok, true);
    assert.ok(worker.movementLeft < api.UNIT_DEFS.worker.movement);
    assert.equal(game.endTurn(), true);
    assert.equal(worker.movementLeft, api.UNIT_DEFS.worker.movement);
}

{
    const { game } = createGame(7001);
    const player = game.getCiv("player");
    const enemy = game.civilizations.find((civ) => civ.id !== "player");
    const enemyCity = game.cities.find((city) => city.ownerId === enemy.id);
    const attacker = game.units.find((unit) => unit.ownerId === "player" && unit.type === "warrior");
    const adjacent = game.map.neighbors(enemyCity.x, enemyCity.y).find((candidate) => api.TERRAIN[candidate.tile.terrain].move < 99);
    game.units.filter((unit) => unit.ownerId === enemy.id && unit.x === enemyCity.x && unit.y === enemyCity.y).forEach((unit) => game.removeUnit(unit));
    placeUnit(game, attacker, adjacent.x, adjacent.y);
    attacker.movementLeft = api.UNIT_DEFS.warrior.movement;
    assert.equal(game.moveUnit(attacker.id, enemyCity.x, enemyCity.y).ok, true);
    assert.equal(enemyCity.ownerId, "player");
    assert.equal(game.map.getTile(adjacent.x, adjacent.y).unitIds.includes(attacker.id), false);
    assert.equal(game.map.getTile(enemyCity.x, enemyCity.y).unitIds.filter((id) => id === attacker.id).length, 1);
    assert.equal(player.name, "アステリア");
}

{
    const { game } = createGame(7002);
    const player = game.getCiv("player");
    const worker = game.units.find((unit) => unit.ownerId === "player" && unit.type === "worker");
    player.techs.push("pottery", "mining", "engineering");
    const tile = game.map.getTile(worker.x, worker.y);
    tile.terrain = "plains";
    worker.movementLeft = 0;
    assert.equal(game.unitManager.buildImprovement(worker.id, "farm"), false);
    worker.movementLeft = api.UNIT_DEFS.worker.movement;
    assert.equal(game.unitManager.buildImprovement(worker.id, "farm"), true);
    assert.equal(game.unitManager.buildImprovement(worker.id, "mine"), false);
    assert.equal(tile.improvement, "farm");
}

{
    const without = createGame(7003).game;
    const withFarm = createGame(7003).game;
    const baselineCity = without.cities.find((city) => city.ownerId === "player");
    const farmCity = withFarm.cities.find((city) => city.ownerId === "player");
    without.map.getTile(baselineCity.x, baselineCity.y).terrain = "plains";
    withFarm.map.getTile(farmCity.x, farmCity.y).terrain = "plains";
    without.map.neighbors(baselineCity.x, baselineCity.y).forEach((candidate) => { candidate.tile.terrain = "water"; });
    withFarm.map.neighbors(farmCity.x, farmCity.y).forEach((candidate) => { candidate.tile.terrain = "water"; });
    withFarm.map.getTile(farmCity.x, farmCity.y).improvement = "farm";
    without.processCivilizationTurn(without.getCiv("player"));
    withFarm.processCivilizationTurn(withFarm.getCiv("player"));
    assert.equal(withFarm.cities.find((city) => city.id === farmCity.id).food, baselineCity.food + api.IMPROVEMENT_DEFS.farm.food);
}

{
    const { game } = createGame(7004);
    const player = game.getCiv("player");
    const city = game.cities.find((item) => item.ownerId === "player");
    assert.equal(game.isProductionAvailable(player, "tank"), false);
    assert.equal(game.setCityProduction(city.id, "tank"), false);
    player.techs.push("rocketry");
    assert.equal(game.isProductionAvailable(player, "tank"), true);
    assert.equal(game.setCityProduction(city.id, "tank"), true);
    player.policy = "expansion";
    assert.equal(game.getProductionCost("settler", player), 30);
}

{
    const { game } = createGame(7016);
    const city = game.cities.find((item) => item.ownerId === "player");
    city.productionId = "tank";
    city.production = 1000;
    game.processCivilizationTurn(game.getCiv("player"));
    assert.equal(city.productionId, "warrior");
}

{
    const { game, storage } = createGame(7005);
    game.save(storage);
    const expected = game.random.next();
    const loaded = new CivilizationCore({ seed: 1, storage });
    assert.equal(loaded.load(storage), true);
    assert.equal(loaded.random.next(), expected);
    const bad = JSON.parse(storage.getItem(api.SAVE_KEY));
    bad.map.tiles[0].terrain = "unknown";
    storage.setItem(api.SAVE_KEY, JSON.stringify(bad));
    assert.equal(loaded.load(storage), false);
    storage.setItem(api.SAVE_KEY, JSON.stringify({ version: 1 }));
    assert.equal(loaded.load(storage), false);
}

{
    const { game } = createGame(7006);
    const ai = game.civilizations.find((civ) => civ.id !== "player");
    const playerUnit = game.units.find((unit) => unit.ownerId === "player" && unit.type === "warrior");
    const aiUnit = game.units.find((unit) => unit.ownerId === ai.id && unit.type === "warrior");
    assert.equal(game.map.isDiscovered(aiUnit.x, aiUnit.y, "player"), false);
    placeUnit(game, aiUnit, playerUnit.x - 1, playerUnit.y);
    game.map.revealAround(aiUnit.x, aiUnit.y, 2, ai.id);
    game.setRelation(ai.id, "player", 0);
    api.CivilizationAI.runTurn(game, ai);
    assert.equal(game.units.includes(playerUnit), true);
    game.setRelation(ai.id, "player", -100);
    placeUnit(game, aiUnit, playerUnit.x - 1, playerUnit.y);
    game.map.revealAround(aiUnit.x, aiUnit.y, 2, ai.id);
    aiUnit.type = "tank";
    aiUnit.movementLeft = api.UNIT_DEFS[aiUnit.type].movement;
    game.random = { next: () => 0.01 };
    api.CivilizationAI.runTurn(game, ai);
    assert.equal(game.units.includes(playerUnit), false);
}

{
    const { game } = createGame(7009);
    const ai = game.civilizations.find((civ) => civ.id !== "player");
    const settler = game.units.find((unit) => unit.ownerId === ai.id && unit.type === "settler");
    const position = game.map.tiles.map((tile, index) => ({ tile, x: index % game.map.width, y: Math.floor(index / game.map.width) })).find((candidate) => ["plains", "forest", "hills", "desert"].includes(candidate.tile.terrain) && game.cities.every((city) => Math.abs(city.x - candidate.x) > 3 || Math.abs(city.y - candidate.y) > 3));
    placeUnit(game, settler, position.x, position.y);
    const cityCount = game.cities.length;
    api.CivilizationAI.runTurn(game, ai);
    assert.equal(game.cities.length, cityCount + 1);
    assert.equal(game.cities.some((city) => city.ownerId === ai.id && city.x === position.x && city.y === position.y), true);
    assert.equal(game.units.includes(settler), false);
}

{
    const { game } = createGame(7010);
    const enemy = game.civilizations.find((civ) => civ.id !== "player");
    const enemyCity = game.cities.find((city) => city.ownerId === enemy.id);
    enemyCity.buildings.push("walls");
    enemy.techs.push("masonry");
    enemy.policy = "culture";
    assert.equal(game.getCityDefense(enemyCity), 2 + 4 + 2 - 1);
    const worker = game.units.find((unit) => unit.ownerId === "player" && unit.type === "worker");
    const adjacent = game.map.neighbors(enemyCity.x, enemyCity.y).find((candidate) => api.TERRAIN[candidate.tile.terrain].move < 99);
    placeUnit(game, worker, adjacent.x, adjacent.y);
    assert.equal(game.moveUnit(worker.id, enemyCity.x, enemyCity.y).reason, "civilian");
}

{
    const { game } = createGame(7007);
    const ai = game.civilizations.find((civ) => civ.id !== "player");
    ai.techs = ["orbital_charter"];
    ai.launchProgress = 5;
    game.checkVictory();
    assert.equal(game.campaign.status, "lost");
    assert.equal(game.campaign.winner, ai.id);
}

{
    const { game } = createGame(7008);
    const player = game.getCiv("player");
    game.campaign.turn = game.campaign.maxTurns;
    player.gold = 100000;
    game.civilizations.filter((civ) => civ.id !== "player").forEach((civ) => { civ.gold = 0; });
    assert.equal(game.endTurn(), true);
    assert.equal(game.campaign.turn, game.campaign.maxTurns);
    assert.equal(game.campaign.victoryType, "score");
}

{
    const { game } = createGame(7011);
    game.finish("won", "science", "player");
    const player = game.getCiv("player");
    const city = game.cities.find((item) => item.ownerId === "player");
    const worker = game.units.find((unit) => unit.ownerId === "player" && unit.type === "worker");
    assert.equal(game.endTurn(), false);
    assert.equal(game.setCityProduction(city.id, "warrior"), false);
    assert.equal(game.chooseResearch("pottery"), false);
    assert.equal(game.moveUnit(worker.id, worker.x, worker.y + 1).ok, false);
    assert.equal(player.researchPoints, 0);
    assert.equal(game.choosePolicy("culture"), false);
    const attacker = game.units.find((unit) => unit.ownerId === "player" && unit.type === "warrior");
    const defender = game.units.find((unit) => unit.ownerId === "aurora" && unit.type === "warrior");
    assert.equal(game.resolveCombat(attacker, defender, "plains").invalid, true);
    assert.equal(game.units.includes(attacker), true);
    const beforeMovement = worker.movementLeft;
    assert.equal(game.unitManager.resetMovementForCivilization("player"), false);
    assert.equal(worker.movementLeft, beforeMovement);
    assert.equal(game.cityManager.found("player", city.x + 4, city.y + 4), null);
}

{
    const { game, storage } = createGame(7013);
    const save = JSON.parse(storage.getItem(api.SAVE_KEY));
    const unit = save.units[0];
    const tile = save.map.tiles[unit.y * save.map.width + unit.x];
    tile.unitIds.push(unit.id);
    storage.setItem(api.SAVE_KEY, JSON.stringify(save));
    assert.equal(game.load(storage), false);
}

{
    const { game } = createGame(7012);
    const player = game.getCiv("player");
    const capital = game.cities.find((city) => city.id === player.capitalId);
    capital.ownerId = "aurora";
    player.techs = ["orbital_charter"];
    player.launchProgress = 5;
    game.checkVictory();
    assert.equal(game.campaign.status, "lost");
}

{
    const { game } = createGame(7014);
    const player = game.getCiv("player");
    const capital = game.cities.find((city) => city.id === player.capitalId);
    const warrior = game.units.find((unit) => unit.ownerId === "player" && unit.type === "warrior");
    const settler = game.units.find((unit) => unit.ownerId === "player" && unit.type === "settler");
    placeUnit(game, warrior, capital.x, capital.y);
    placeUnit(game, settler, capital.x, capital.y);
    const stack = game.getUnitsAt(capital.x, capital.y, "player");
    assert.equal(stack.map((unit) => unit.id).join(","), [warrior.id, settler.id].join(","));
    game.selectAt(capital.x, capital.y);
    assert.equal(game.selection.unitId, warrior.id);
    assert.equal(game.selection.cityId, capital.id);
    game.selectAt(capital.x, capital.y);
    assert.equal(game.selection.unitId, settler.id);
    game.selectAt(capital.x, capital.y);
    assert.equal(game.selection.unitId, warrior.id);
    assert.equal(game.selectUnit(settler.id).id, settler.id);
    assert.equal(game.selection.unitId, settler.id);
    assert.equal(game.selectCity(capital.id).id, capital.id);
    assert.equal(game.selection.unitId, null);
}

{
    const { game } = createGame(7015);
    const warrior = game.units.find((unit) => unit.ownerId === "player" && unit.type === "warrior");
    const settler = game.units.find((unit) => unit.ownerId === "player" && unit.type === "settler");
    const destination = game.map.neighbors(warrior.x, warrior.y).find((candidate) => api.TERRAIN[candidate.tile.terrain].move < 99);
    placeUnit(game, settler, destination.x, destination.y);
    warrior.movementLeft = 0;
    game.selection.unitId = warrior.id;
    let syncCount = 0;
    const input = new api.CivilizationInput({ canvas: { addEventListener() {} }, core: game, renderer: { tileFromPointer: () => ({ x: destination.x, y: destination.y }) }, syncUi: () => { syncCount += 1; } });
    input.onCanvasClick({ type: "click", clientX: 0, clientY: 0 });
    assert.equal(game.selection.unitId, settler.id);
    assert.equal(syncCount, 1);
}

console.log("Chronicle Kingdoms logic tests passed.");
