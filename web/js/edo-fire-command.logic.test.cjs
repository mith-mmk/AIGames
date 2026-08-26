const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const context = { console, globalThis: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync("web/js/edo-fire-command-data.js", "utf8"), context);
vm.runInContext(fs.readFileSync("web/js/edo-fire-command-core.js", "utf8"), context);
vm.runInContext(fs.readFileSync("web/js/edo-fire-command-renderer.js", "utf8"), context);
vm.runInContext(fs.readFileSync("web/js/edo-fire-command-app.js", "utf8"), context);

const api = context.globalThis.EdoFireCommand;
const { EdoFireCore, FireBoard, ProgressStore, SeededRandom } = api;
const { EdoFireGame } = context.globalThis;

function plain(value) {
    return JSON.parse(JSON.stringify(value));
}

function createStorage() {
    const values = new Map();
    return {
        values,
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, value); },
    };
}

function createTestScenario(overrides = {}) {
    const map = [
        "............",
        "............",
        "............",
        "...W........",
        "...HHHL.....",
        "............",
        "..........A.",
        "............",
        "............",
    ];
    return {
        id: "test",
        number: 1,
        title: "試験火場",
        subtitle: "試験",
        maxTurns: 10,
        casualtyLimit: 1,
        destructionLimit: 5,
        demolitionLimit: 2,
        seed: 17,
        map,
        initialWind: "W",
        emberChance: 0,
        squads: [
            { id: "water-1", type: "water", x: 4, y: 5 },
            { id: "ladder-1", type: "ladder", x: 5, y: 5 },
            { id: "tobi-1", type: "tobi", x: 5, y: 3 },
        ],
        fires: [{ x: 4, y: 4 }],
        civilians: [{ x: 5, y: 4, count: 1 }],
        events: [],
        hints: ["試験"],
        ...overrides,
    };
}

assert.equal(Object.isFrozen(api), true);
assert.equal(api.WIDTH, 12);
assert.equal(api.HEIGHT, 9);
assert.equal(api.SCENARIOS.length, 5);
assert.deepEqual(plain(api.SCENARIOS[0].squads.map((squad) => squad.type)), ["water", "ladder", "tobi"]);
assert.equal(new EdoFireCore().getSnapshot().pendingIgnitions, 0);
assert.equal(new EdoFireCore().getSnapshot().nextIgnitionTurn, null);
for (const scenario of api.SCENARIOS) {
    assert.equal(scenario.map.length, 9);
    assert.equal(scenario.map.every((row) => row.length === 12), true);
}

{
    let selectedSquadId = null;
    let queuedAction = null;
    const fakeGame = {
        core: {
            status: "running",
            squads: [
                { id: "water-1", type: "water", x: 2, y: 3 },
                { id: "ladder-1", type: "ladder", x: 7, y: 5 },
            ],
            queueAction(id, action, x, y) {
                queuedAction = { id, action, x, y };
                return { ok: true };
            },
        },
        selectedSquadId: "water-1",
        commandMode: "extinguish",
        cursor: { x: 0, y: 0 },
        selectSquad(id) {
            selectedSquadId = id;
            this.selectedSquadId = id;
            this.commandMode = "move";
        },
        sync() {},
    };
    EdoFireGame.prototype.handleTile.call(fakeGame, 7, 5);
    assert.equal(selectedSquadId, "ladder-1", "another squad remains selectable while an action command is active");
    assert.equal(queuedAction, null, "selecting another squad never targets it with the active command");

    selectedSquadId = null;
    fakeGame.selectedSquadId = "water-1";
    fakeGame.commandMode = "refill";
    EdoFireGame.prototype.handleTile.call(fakeGame, 2, 3);
    assert.equal(selectedSquadId, null, "the selected squad tile remains available as an action target");
    assert.deepEqual(queuedAction, { id: "water-1", action: "refill", x: 2, y: 3 });
}

{
    let synced = 0;
    const fakeGame = {
        commandMode: "move",
        floatingOrdersOpen: true,
        sync() { synced += 1; },
    };
    EdoFireGame.prototype.setCommandMode.call(fakeGame, "extinguish");
    assert.equal(fakeGame.commandMode, "extinguish");
    assert.equal(fakeGame.floatingOrdersOpen, false, "choosing a command immediately uncovers its target tiles");
    assert.equal(synced, 1);

    fakeGame.core = {
        status: "running",
        squads: [],
        queueMove() { return { ok: true }; },
    };
    fakeGame.selectedSquadId = "water-1";
    fakeGame.commandMode = "move";
    fakeGame.cursor = { x: 0, y: 0 };
    EdoFireGame.prototype.handleTile.call(fakeGame, 4, 5);
    assert.equal(fakeGame.floatingOrdersOpen, true, "the toolbar returns beside the planned destination for the unit action");
}

{
    const floating = {
        hidden: true,
        style: {},
        dataset: {},
        setAttribute(name, value) { this[name] = value; },
    };
    const fakeGame = {
        floatingOrdersOpen: true,
        elements: {
            floatingOrders: floating,
            startOverlay: { hidden: true },
            resultOverlay: { hidden: true },
        },
    };
    const squad = { id: "water-1", type: "water", x: 3, y: 4 };
    EdoFireGame.prototype.renderFloatingOrders.call(fakeGame, { status: "running", orders: {} }, squad, api.SQUAD_TYPES.water);
    assert.equal(floating.hidden, false);
    assert.equal(floating.dataset.role, "water");
    assert.equal(floating.dataset.side, "right");
    assert.equal(floating.dataset.edge, "center");
    assert.equal(floating["aria-label"], "水組への指図");

    fakeGame.floatingOrdersOpen = false;
    EdoFireGame.prototype.renderFloatingOrders.call(fakeGame, { status: "running", orders: {} }, squad, api.SQUAD_TYPES.water);
    assert.equal(floating.hidden, true, "the toolbar yields the board while choosing a command target");
    fakeGame.floatingOrdersOpen = true;

    EdoFireGame.prototype.renderFloatingOrders.call(fakeGame, {
        status: "running",
        orders: { "water-1": { move: { x: 10, y: 8 } } },
    }, squad, api.SQUAD_TYPES.water);
    assert.equal(floating.dataset.side, "left", "the toolbar flips before reaching the right edge");
    assert.equal(floating.dataset.edge, "bottom", "the toolbar stays inside the lower edge");
}

{
    const first = new SeededRandom(1234);
    const second = new SeededRandom(1234);
    const third = new SeededRandom(4321);
    const firstValues = Array.from({ length: 8 }, () => first.next());
    assert.deepEqual(firstValues, Array.from({ length: 8 }, () => second.next()));
    assert.notDeepEqual(firstValues, Array.from({ length: 8 }, () => third.next()));
    const clone = first.clone();
    assert.equal(first.next(), clone.next());
}

{
    const board = new FireBoard(createTestScenario().map);
    assert.equal(board.tiles.length, 108);
    assert.equal(board.pathDistance({ x: 0, y: 0 }, { x: 2, y: 0 }), 2);
    assert.equal(board.pathDistance({ x: 0, y: 0 }, { x: 4, y: 4 }), Infinity);
    board.get(4, 4).type = "rubble";
    assert.equal(board.pathDistance({ x: 4, y: 5 }, { x: 4, y: 4 }), 2);
}

{
    const scenario = createTestScenario();
    const game = new EdoFireCore({ scenarios: [scenario] });
    game.startScenario("test");
    assert.equal(game.queueAction("water-1", "extinguish", 4, 4).ok, true);
    assert.equal(game.queueAction("tobi-1", "demolish", 5, 4).reason, "occupied");
    assert.equal(game.queueAction("ladder-1", "rescue", 5, 4).ok, true);
    assert.equal(game.queueAction("tobi-1", "demolish", 5, 4).ok, true, "planned rescue permits same-turn demolition");
    game.resolveOrders();
    assert.equal(game.board.get(4, 4).heat, 1);
    assert.equal(game.board.get(4, 4).wet, 1);
    assert.equal(game.board.get(5, 4).civilians, 0);
    assert.equal(game.rescued, 1);
    assert.equal(game.board.get(5, 4).type, "rubble");
    assert.equal(game.demolitionsUsed, 1);
    game.getSquad("tobi-1").x = 6;
    game.getSquad("tobi-1").y = 3;
    assert.equal(game.queueAction("tobi-1", "demolish", 6, 4).reason, "landmark");
}

{
    const game = new EdoFireCore({ scenarios: [createTestScenario({ fires: [] })] });
    game.startScenario("test");
    const water = game.getSquad("water-1");
    water.water = 0;
    water.x = 3;
    water.y = 4;
    assert.equal(game.queueAction("water-1", "refill", 3, 3).ok, true);
    game.resolveOrders();
    assert.equal(water.water, api.SQUAD_TYPES.water.waterMax);
    assert.equal(game.queueMove("water-1", 2, 5).ok, true);
    assert.equal(game.queueMove("ladder-1", 2, 5).reason, "unreachable");
}

{
    const game = new EdoFireCore({ scenarios: [createTestScenario({ civilians: [] })] });
    game.startScenario("test");
    game.advanceFire();
    assert.equal(game.board.get(5, 4).heat, 2, "downwind house ignites");
    assert.equal(game.board.get(3, 4).heat, 0, "upwind house is protected");

    const wetGame = new EdoFireCore({ scenarios: [createTestScenario({ civilians: [] })] });
    wetGame.startScenario("test");
    wetGame.board.get(5, 4).wet = 1;
    wetGame.advanceFire();
    assert.equal(wetGame.board.get(5, 4).heat, 1, "wetness absorbs one pressure");
}

{
    const scenario = createTestScenario({ civilians: [], events: [{ turn: 1, type: "wind", wind: "S" }] });
    const game = new EdoFireCore({ scenarios: [scenario] });
    game.startScenario("test");
    const before = plain(game.getSnapshot());
    const randomState = game.random.state;
    const forecast = plain(game.getForecast(2));
    assert.deepEqual(plain(game.getSnapshot()), before, "forecast does not mutate the live state");
    assert.equal(game.random.state, randomState, "forecast does not consume live random state");
    game.endTurn();
    assert.equal(game.wind, "S");
    assert.deepEqual(forecast[0].events, [{ type: "wind", wind: "S" }]);
    const predicted = forecast[0].danger.sort((a, b) => a.y - b.y || a.x - b.x);
    const actual = plain(game.board.tiles
        .filter((tile) => tile.heat > 0 || tile.destroyed)
        .map((tile) => ({ x: tile.x, y: tile.y, heat: tile.heat, destroyed: tile.destroyed }))
        .sort((a, b) => a.y - b.y || a.x - b.x));
    assert.deepEqual(actual, predicted, "first forecast step matches no-order resolution");
}

{
    const game = new EdoFireCore({ scenarios: [createTestScenario({ fires: [], civilians: [], events: [{ turn: 2, type: "ignite", x: 3, y: 4 }] })] });
    game.startScenario("test");
    assert.equal(game.getSnapshot().pendingIgnitions, 1);
    assert.equal(game.getSnapshot().nextIgnitionTurn, 2);
    game.endTurn();
    assert.equal(game.status, "running", "pending ignition prevents an early win");
    assert.match(game.lastMessage, /第2刻に飛び火予報/);
    game.endTurn();
    assert.equal(game.board.get(3, 4).heat, 3);
    assert.equal(game.getSnapshot().pendingIgnitions, 0);
    assert.equal(game.getSnapshot().nextIgnitionTurn, null);
}

{
    const game = new EdoFireCore();
    game.startScenario("warehouse-embers");
    const forecast = plain(game.getForecast(2));
    assert.equal(game.getSnapshot().pendingIgnitions, 2);
    assert.equal(forecast[0].turn, 1);
    assert.deepEqual(forecast[0].events, [{ type: "ignite", wind: null }]);
    assert.deepEqual(forecast[1].events, [{ type: "ignite", wind: null }], "stage four announces both flying embers inside the initial forecast");
}

{
    const game = new EdoFireCore({ scenarios: [createTestScenario()] });
    game.startScenario("test");
    game.casualties = 0;
    game.destroyedBuildings = 1;
    game.demolitionsUsed = 1;
    assert.equal(game.calculateScore(), 90);
    assert.equal(game.calculateRank(), "gold");
    game.destroyedBuildings = 4;
    assert.equal(game.calculateRank(), "silver");
    game.casualties = 1;
    game.destroyedBuildings = 3;
    game.demolitionsUsed = 2;
    assert.equal(game.calculateRank(), "bronze");
}

{
    const casualtyGame = new EdoFireCore({ scenarios: [createTestScenario()] });
    casualtyGame.startScenario("test");
    casualtyGame.casualties = 2;
    casualtyGame.evaluate();
    assert.equal(casualtyGame.status, "lost");
    assert.match(casualtyGame.result.reason, /犠牲者/);

    const landmarkGame = new EdoFireCore({ scenarios: [createTestScenario()] });
    landmarkGame.startScenario("test");
    landmarkGame.destroyTile(landmarkGame.board.get(6, 4));
    landmarkGame.evaluate();
    assert.equal(landmarkGame.status, "lost");
    assert.match(landmarkGame.result.reason, /番屋・蔵/);

    const timeoutGame = new EdoFireCore({ scenarios: [createTestScenario()] });
    timeoutGame.startScenario("test");
    timeoutGame.turn = timeoutGame.scenario.maxTurns;
    timeoutGame.evaluate();
    assert.equal(timeoutGame.status, "lost");
    assert.match(timeoutGame.result.reason, /夜明け/);
}

{
    const storage = createStorage();
    const store = new ProgressStore(storage);
    const initial = store.load();
    assert.equal(initial.unlocked, 1);
    const afterWin = store.record(initial, api.SCENARIOS[0], "gold");
    assert.equal(afterWin.unlocked, 2);
    assert.equal(afterWin.bestRanks["small-fire"], "gold");
    const afterLowerRank = store.record(afterWin, api.SCENARIOS[0], "bronze");
    assert.equal(afterLowerRank.bestRanks["small-fire"], "gold");
    storage.setItem(api.SAVE_KEY, "not-json");
    assert.equal(store.load().unlocked, 1);
    storage.setItem(api.SAVE_KEY, JSON.stringify({ version: 99, unlocked: 5 }));
    assert.equal(store.load().unlocked, 1);
}

function adjacentReachable(game, squad, target) {
    const reachable = game.getReachable(squad.id);
    return reachable.find((position) => Math.abs(position.x - target.x) + Math.abs(position.y - target.y) <= 1) || null;
}

function waterSourcePlan(game, squad) {
    const reachable = game.getReachable(squad.id);
    for (const position of reachable) {
        const source = game.board.tiles.find((tile) => ["well", "canal"].includes(tile.type)
            && Math.abs(position.x - tile.x) + Math.abs(position.y - tile.y) <= 1);
        if (source) return { position, source };
    }
    return null;
}

function moveCloser(game, squad, target) {
    const reachable = game.getReachable(squad.id);
    const position = reachable.sort((first, second) => {
        const firstDistance = Math.abs(first.x - target.x) + Math.abs(first.y - target.y);
        const secondDistance = Math.abs(second.x - target.x) + Math.abs(second.y - target.y);
        return firstDistance - secondDistance;
    })[0];
    if (position) game.queueMove(squad.id, position.x, position.y);
}

function issueGreedyOrders(game) {
    const targetedFires = new Set();
    for (const squad of game.squads) {
        if (squad.type === "ladder") {
            const targets = game.board.tiles.filter((tile) => tile.civilians > 0);
            const target = targets.find((tile) => adjacentReachable(game, squad, tile));
            if (target) {
                const position = adjacentReachable(game, squad, target);
                game.queueMove(squad.id, position.x, position.y);
                game.queueAction(squad.id, "rescue", target.x, target.y);
            } else if (targets[0]) {
                moveCloser(game, squad, targets[0]);
            }
            continue;
        }
        if (squad.type !== "water") continue;
        if (squad.water === 0) {
            const refill = waterSourcePlan(game, squad);
            if (refill) {
                game.queueMove(squad.id, refill.position.x, refill.position.y);
                game.queueAction(squad.id, "refill", refill.source.x, refill.source.y);
            }
            continue;
        }
        const fires = game.board.tiles
            .filter((tile) => tile.heat > 0 && !tile.destroyed && !targetedFires.has(`${tile.x},${tile.y}`))
            .sort((first, second) => second.heat - first.heat);
        const target = fires.find((tile) => adjacentReachable(game, squad, tile));
        if (target) {
            const position = adjacentReachable(game, squad, target);
            const moved = game.queueMove(squad.id, position.x, position.y);
            if (moved.ok && game.queueAction(squad.id, "extinguish", target.x, target.y).ok) {
                targetedFires.add(`${target.x},${target.y}`);
            }
        } else if (fires[0]) {
            moveCloser(game, squad, fires[0]);
        }
    }
}

const balanceExpectations = {
    1: { minTurn: 3, maxTurn: 4, minScore: 85, maxScore: 100, rank: "gold" },
    2: { minTurn: 5, maxTurn: 7, minScore: 85, maxScore: 94, rank: "gold" },
    3: { minTurn: 4, maxTurn: 6, minScore: 65, maxScore: 84, rank: "silver" },
    4: { minTurn: 5, maxTurn: 7, minScore: 85, maxScore: 94, rank: "gold" },
    5: { minTurn: 8, maxTurn: 11, minScore: 65, maxScore: 84, rank: "silver" },
};

for (const scenario of api.SCENARIOS) {
    const game = new EdoFireCore();
    game.startScenario(scenario.id);
    while (game.status === "running") {
        issueGreedyOrders(game);
        game.endTurn();
    }
    assert.equal(game.status, "won", `${scenario.title} should be clearable by the deterministic command policy: ${game.result.reason}`);
    const expected = balanceExpectations[scenario.number];
    assert.ok(game.turn >= expected.minTurn && game.turn <= expected.maxTurn, `${scenario.title} clear turn stays in its balance window`);
    assert.ok(game.result.score >= expected.minScore && game.result.score <= expected.maxScore, `${scenario.title} score stays in its balance window`);
    assert.equal(game.result.rank, expected.rank, `${scenario.title} fixed-policy rank remains intentional`);
}

console.log("江戸火消し指図 logic tests passed");
