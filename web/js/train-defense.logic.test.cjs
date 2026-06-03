const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const code = fs.readFileSync("web/js/train-defense.js", "utf8");
const context = { console, globalThis: {} };
vm.createContext(context);
vm.runInContext(code, context);

const TrainDefenseCore = context.globalThis.TrainDefenseCore;

{
    const game = new TrainDefenseCore();
    const snapshot = game.getSnapshot();
    assert.equal(snapshot.hp, 100);
    assert.equal(snapshot.scrap, 90);
    assert.equal(snapshot.distance, 0);
    assert.equal(snapshot.destinationDistance, 2200);
    assert.equal(snapshot.currentWaveLabel, "先遣隊");
    assert.equal(game.slots.length, 24);
}

{
    const game = new TrainDefenseCore();
    game.state.scrap = 10;
    assert.equal(game.buildAtSlot(0, "cannon").reason, "scrap");
    game.state.scrap = 90;
    const result = game.buildAtSlot(0, "cannon");
    assert.equal(result.ok, true);
    assert.equal(game.state.scrap, 60);
    assert.equal(game.buildAtSlot(0, "signal").reason, "occupied");
}

{
    const game = new TrainDefenseCore({ trainSpeed: 0 });
    game.start();
    game.state.waveIndex = game.waves.length;
    game.buildAtSlot(0, "cannon");
    game.spawnEnemy("runner");
    const buildingPosition = game.getBuildingPosition(game.buildings[0]);
    game.enemies[0].x = buildingPosition.x + 80;
    game.enemies[0].y = buildingPosition.y;
    const scrapBefore = game.state.scrap;
    for (let index = 0; index < 80; index += 1) {
        game.update(0.05);
    }
    assert.equal(game.enemies.some((enemy) => enemy.type === "runner"), false);
    assert.equal(game.state.scrap > scrapBefore, true);
}

{
    const game = new TrainDefenseCore({ trainSpeed: 0 });
    game.start();
    game.state.waveIndex = game.waves.length;
    const hpBefore = game.state.hp;
    game.spawnEnemy("raider");
    game.enemies[0].x = game.config.enemyHitX + 1;
    game.update(0.2);
    assert.equal(game.state.hp, hpBefore - game.enemyTypes.raider.damage);
    assert.equal(game.enemies.length, 0);
}

{
    const game = new TrainDefenseCore({ destinationDistance: 0.4, trainSpeed: 10 });
    game.start();
    game.update(0.25);
    assert.equal(game.state.status, "ended");
    assert.match(game.state.message, /目的地/);
}

{
    const game = new TrainDefenseCore();
    game.start();
    game.state.hp = 1;
    game.spawnEnemy("runner");
    game.enemies[0].x = game.config.enemyHitX + 1;
    game.update(0.2);
    assert.equal(game.state.status, "ended");
    assert.match(game.state.message, /破壊/);
}

{
    const game = new TrainDefenseCore();
    game.start();
    game.pause();
    game.update(0.5);
    assert.equal(game.state.distance, 0);
    assert.equal(game.enemies.length, 0);
    game.resume();
    game.update(0.5);
    assert.equal(game.state.distance > 0, true);
}
