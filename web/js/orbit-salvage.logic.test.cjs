const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const code = fs.readFileSync("web/js/orbit-salvage.js", "utf8");
const context = { console: { ...console, warn() {} }, globalThis: {} };
vm.createContext(context);
vm.runInContext(code, context);

const OrbitSalvageCore = context.globalThis.OrbitSalvageCore;

function createGame(stageIndex = 0) {
    const game = new OrbitSalvageCore({ random: () => 0.5, stageIndex });
    game.startStage(stageIndex);
    game.state.spawnTimer = 999;
    return game;
}

function addCrossingObject(game, type, angle = game.angle) {
    const definition = game.objectTypes[type];
    game.objects.push({
        id: 999,
        type,
        family: definition.family,
        angle,
        radius: 185,
        speed: 100,
    });
}

function assertProgress(actual, expected) {
    assert.equal(actual.version, expected.version);
    assert.equal(actual.highestStage, expected.highestStage);
    assert.equal(actual.highScore, expected.highScore);
}

{
    const game = new OrbitSalvageCore({ random: () => 0.5 });
    const snapshot = game.getSnapshot();
    assert.equal(snapshot.status, "ready");
    assert.equal(snapshot.stageCount, 10);
    assert.equal(snapshot.stageIndex, 0);
    assert.equal(snapshot.hp, 100);
    assert.equal(snapshot.maxHp, 100);
    assert.equal(snapshot.shieldDegrees, 32);
    assert.equal(snapshot.rotationSpeed, 2.6);
    assert.equal(snapshot.quota, 6);
    assert.equal(snapshot.timeRemaining, 30);
}

{
    assert.equal(OrbitSalvageCore.normalizeAngle(-0.1) > 6.18, true);
    assert.equal(OrbitSalvageCore.normalizeAngle(Math.PI * 3) < Math.PI + 0.001, true);
    assert.equal(OrbitSalvageCore.shortestAngleDelta(0.05, Math.PI * 2 - 0.05) > 0, true);

    const game = createGame();
    game.angle = Math.PI * 2 - 0.05;
    game.setPointerTarget(0.05);
    game.update(0.02);
    assert.equal(game.angle < 0.01 || game.angle > Math.PI * 2 - 0.05, true);
    game.setRotationInput(-1);
    const before = game.angle;
    game.update(0.05);
    assert.equal(OrbitSalvageCore.shortestAngleDelta(game.angle, before) < 0, true);
}

{
    const game = createGame();
    addCrossingObject(game, "resource");
    game.update(0.1);
    assert.equal(game.state.collected, 1);
    assert.equal(game.score, 100);
    assert.equal(game.state.combo, 1);

    addCrossingObject(game, "rare");
    game.update(0.1);
    assert.equal(game.state.collected, 3);
    assert.equal(game.score, 600);
    assert.equal(game.state.combo, 2);
}

{
    const game = createGame();
    assert.equal(game.toggleMode(), true);
    assert.equal(game.toggleMode(), false);
    addCrossingObject(game, "resource");
    game.update(0.1);
    assert.equal(game.state.collected, 0);
    assert.equal(game.score, 0);
    assert.match(game.state.lastMessage, /資源を破損/);
}

{
    const game = createGame(1);
    game.toggleMode();
    addCrossingObject(game, "meteor");
    game.update(0.1);
    assert.equal(game.hp, game.maxHp);
    assert.equal(game.score, 75);

    game.modeCooldown = 0;
    game.toggleMode();
    addCrossingObject(game, "heavy");
    game.update(0.1);
    assert.equal(game.hp, game.maxHp - 30);
}

{
    const game = createGame();
    addCrossingObject(game, "meteor", game.angle + Math.PI);
    game.objects[0].radius = 65;
    game.update(0.1);
    assert.equal(game.hp, game.maxHp - 20);
    assert.equal(game.objects.length, 0);
}

{
    const stages = OrbitSalvageCore.getStageDefinitions();
    assert.equal(stages.length, 10);
    assert.deepEqual(Array.from(stages, (stage) => stage.duration), [30, 30, 40, 40, 40, 40, 40, 40, 40, 50]);
    assert.deepEqual(Array.from(stages, (stage) => stage.quota), [6, 0, 8, 10, 12, 12, 14, 16, 18, 22]);
    assert.equal(stages[4].weights.rare > 0, true);
    assert.equal(stages[5].weights.heavy > 0, true);
    assert.equal(stages[6].pairChance > 0.3, true);
    assert.equal(stages[7].spawnRadius < stages[6].spawnRadius, true);
}

{
    const game = createGame();
    game.state.collected = game.state.quota;
    game.state.timeRemaining = 0.01;
    game.update(0.02);
    assert.equal(game.state.status, "stage-cleared");
    assert.equal(game.score, 1000);

    assert.equal(game.applyUpgrade("shield"), true);
    assert.equal(game.shieldDegrees, 38);
    assert.equal(game.startNextStage(), true);
    assert.equal(game.stageIndex, 1);
    assert.equal(game.state.status, "running");
}

{
    const game = createGame(2);
    game.state.timeRemaining = 0.01;
    game.update(0.02);
    assert.equal(game.state.status, "failed");
    assert.match(game.state.lastMessage, /ノルマ未達/);
}

{
    const game = createGame(9);
    game.state.collected = game.state.quota;
    game.state.timeRemaining = 0.01;
    game.update(0.02);
    assert.equal(game.state.status, "completed");
}

{
    const game = createGame();
    game.state.status = "stage-cleared";
    for (let index = 0; index < 4; index += 1) {
        game.state.upgradeSelected = false;
        assert.equal(game.applyUpgrade("shield"), true);
    }
    game.state.upgradeSelected = false;
    assert.equal(game.applyUpgrade("shield"), false);
    assert.equal(game.shieldDegrees, 56);

    for (let index = 0; index < 5; index += 1) {
        game.state.upgradeSelected = false;
        assert.equal(game.applyUpgrade("thruster"), true);
    }
    assert.equal(game.rotationSpeed, 4.5);

    for (let index = 0; index < 5; index += 1) {
        game.state.upgradeSelected = false;
        assert.equal(game.applyUpgrade("hull"), true);
    }
    assert.equal(game.maxHp, 150);
}

{
    const game = createGame();
    game.score = 800;
    game.hp = 20;
    game.state.status = "failed";
    assert.equal(game.retryStage(), true);
    assert.equal(game.hp, 100);
    assert.equal(game.score, 0);
    assert.equal(game.state.status, "running");
}

{
    const values = new Map();
    const storage = {
        getItem(key) { return values.get(key) || null; },
        setItem(key, value) { values.set(key, value); },
    };
    assertProgress(OrbitSalvageCore.readProgress(storage), { version: 1, highestStage: 0, highScore: 0 });
    assert.equal(OrbitSalvageCore.writeProgress(storage, { highestStage: 4, highScore: 9876 }), true);
    assertProgress(OrbitSalvageCore.readProgress(storage), { version: 1, highestStage: 4, highScore: 9876 });

    values.set("ai-games.orbit-salvage.progress", "not-json");
    assertProgress(OrbitSalvageCore.readProgress(storage), { version: 1, highestStage: 0, highScore: 0 });
    values.set("ai-games.orbit-salvage.progress", JSON.stringify({ version: 99, highestStage: 9, highScore: 1 }));
    assertProgress(OrbitSalvageCore.readProgress(storage), { version: 1, highestStage: 0, highScore: 0 });
}

console.log("Orbit Salvage logic tests passed.");
