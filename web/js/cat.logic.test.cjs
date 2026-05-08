const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const files = [
    "web/js/cat/data.js",
    "web/js/cat/save.js",
    "web/js/cat/assets.js",
    "web/js/cat/core.js",
];

const storage = {
    value: null,
    getItem() {
        return this.value;
    },
    setItem(key, value) {
        this.value = value;
    },
};

const context = {
    console,
    globalThis: {},
    Date,
};
context.globalThis = context;
vm.createContext(context);
files.forEach((file) => {
    vm.runInContext(fs.readFileSync(file, "utf8"), context);
});

function makeGame(seed = 123) {
    const saveStore = new context.BlackCatSaveStore(storage);
    saveStore.load();
    return new context.BlackCatGame({
        stages: context.BlackCatData.FALLBACK_STAGES,
        saveStore,
        seed,
    });
}

{
    const stage = context.BlackCatData.FALLBACK_STAGES[0];
    assert.equal(context.BlackCatAssetTools.validateStage(stage), true);
    assert.equal(stage.id, "room");
    assert.ok(stage.spawnTables.items.includes("fish"));
}

{
    const game = makeGame(1);
    game.start();
    const y = game.cat.y;
    assert.equal(game.jump(), true);
    game.update(0.1);
    assert.ok(game.cat.y < y);
    assert.equal(game.cat.onGround, false);
}

{
    const game = makeGame(2);
    game.start();
    game.setAction("crouch", true);
    game.update(0.016);
    assert.equal(game.cat.crouching, true);
    game.setAction("crouch", false);
    game.update(0.016);
    assert.equal(game.cat.crouching, false);
}

{
    const game = makeGame(3);
    game.start();
    game.update(1);
    assert.ok(game.distance > 0);
}

{
    const game = makeGame(4);
    game.start();
    const entity = {
        id: "test-fish",
        kind: "item",
        type: "fish",
        x: game.cat.worldX,
        y: game.cat.y - 60,
        width: 48,
        height: 48,
    };
    game.entities.push(entity);
    game.resolveCollisions();
    assert.equal(entity.removed, true);
    assert.equal(game.score, 10);
    assert.equal(game.save.collection.items["拾った魚"], 1);
}

{
    const game = makeGame(5);
    game.start();
    const obstacle = {
        id: "test-vacuum",
        kind: "obstacle",
        type: "vacuum",
        x: game.cat.worldX,
        y: game.cat.y - 70,
        width: 160,
        height: 96,
    };
    game.entities.push(obstacle);
    game.resolveCollisions();
    assert.equal(obstacle.hit, true);
    assert.equal(game.surprise, 40);
    assert.equal(game.save.collection.encounters["掃除機"], 1);
}

{
    const game = makeGame(6);
    game.start();
    game.checkpointX = 300;
    game.surprise = 90;
    const obstacle = {
        id: "test-dog",
        kind: "obstacle",
        type: "dog",
        x: game.cat.worldX,
        y: game.cat.y - 70,
        width: 112,
        height: 112,
    };
    game.entities.push(obstacle);
    game.resolveCollisions();
    assert.equal(game.state, "recovering");
    for (let i = 0; i < 30 && game.state !== "running"; i += 1) {
        game.update(0.05);
    }
    assert.equal(game.state, "running");
    assert.equal(game.cat.worldX, 300);
    assert.equal(game.surprise, 20);
}

{
    const saveStore = new context.BlackCatSaveStore(storage);
    saveStore.load();
    saveStore.registerCollection("items", "鈴");
    saveStore.recordWalk({ distance: 900, score: 120, escaped: false });
    const text = saveStore.exportText();
    const imported = new context.BlackCatSaveStore(storage);
    imported.importText(text);
    assert.equal(imported.save.collection.items["鈴"], 1);
    assert.equal(imported.save.records.bestDistance, 900);
}
