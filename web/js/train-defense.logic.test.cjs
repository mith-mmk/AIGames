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
    assert.equal(snapshot.scrap, 110);
    assert.equal(snapshot.distance, 0);
    assert.equal(snapshot.destinationDistance, 900);
    assert.equal(snapshot.levelIndex, 0);
    assert.equal(snapshot.levelLabel, "1面 練習線");
    assert.equal(snapshot.currentWaveLabel, "1面 練習線: 先遣隊");
    assert.equal(game.slots.length, 14);
    assert.equal(game.levels.length, 5);
    assert.equal(context.globalThis.TrainDefenseCore, TrainDefenseCore);
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
    const game = new TrainDefenseCore();
    game.start();
    game.state.distance = game.getSnapshot().destinationDistance;
    game.checkEndState();
    assert.equal(game.state.status, "level-cleared");
    assert.match(game.state.message, /練習線/);
    game.state.scrap = 26;
    game.state.hp = 71;
    game.setSelectedBuilding("signal");
    assert.equal(game.advanceLevel(), true);
    const snapshot = game.getSnapshot();
    assert.equal(snapshot.status, "running");
    assert.equal(snapshot.levelIndex, 1);
    assert.equal(snapshot.levelLabel, "2面 峡谷線");
    assert.equal(snapshot.hp, 85);
    assert.equal(snapshot.scrap, 60);
    assert.equal(snapshot.selectedBuilding, "signal");
    assert.equal(game.slots.length, 24);
}

{
    const game = new TrainDefenseCore();
    game.start();
    for (let levelIndex = 0; levelIndex < 4; levelIndex += 1) {
        game.state.distance = game.getSnapshot().destinationDistance;
        game.checkEndState();
        assert.equal(game.state.status, "level-cleared");
        assert.equal(game.currentLevelIndex, levelIndex);
        assert.equal(game.advanceLevel(), true);
        assert.equal(game.currentLevelIndex, levelIndex + 1);
        assert.equal(game.state.status, "running");
    }
    game.state.distance = game.getSnapshot().destinationDistance;
    game.checkEndState();
    assert.equal(game.state.status, "ended");
    assert.match(game.state.message, /終着駅/);
}

{
    const game = new TrainDefenseCore();
    game.currentLevelIndex = 1;
    game.initLevel({ status: "running" });
    game.state.spawnTimer = 0;
    game.updateWaves(0.1);
    assert.equal(game.enemies[0].lane, "top");
    assert.match(game.state.laneWarning, /上レーン/);
}

{
    const game = new TrainDefenseCore();
    game.currentLevelIndex = 1;
    game.initLevel({ scrap: 100 });
    const unstableSlot = game.slots.find((slot) => slot.trait === "unstable");
    assert.equal(game.getBuildingCost("cannon", unstableSlot), 39);
    assert.equal(game.buildAtSlot(unstableSlot.id, "cannon").ok, true);
    assert.equal(game.state.scrap, 61);
}

{
    const game = new TrainDefenseCore();
    game.currentLevelIndex = 1;
    game.initLevel({ scrap: 100 });
    const chokeSlot = game.slots.find((slot) => slot.trait === "choke");
    const result = game.buildAtSlot(chokeSlot.id, "signal");
    assert.equal(result.ok, true);
    assert.equal(game.getSlowAmount(result.building, game.buildingTypes.signal) < game.buildingTypes.signal.slowAmount, true);
    assert.equal(game.getSlowDuration(result.building, game.buildingTypes.signal) > game.buildingTypes.signal.slowDuration, true);
}

{
    const game = new TrainDefenseCore();
    const sprinter = game.spawnEnemy("sprinter", "top");
    const breacher = game.spawnEnemy("breacher", "center");
    const shield = game.spawnEnemy("shield", "bottom");
    assert.equal(sprinter.speed > game.enemyTypes.runner.speed, true);
    assert.equal(game.getEnemyDamage(breacher.type) > game.enemyTypes.raider.damage, true);
    assert.equal(shield.hp > game.enemyTypes.armor.hp, true);
    assert.equal(game.getEnemyDamage("breacher"), game.enemyTypes.breacher.damage);
}

{
    const game = new TrainDefenseCore();
    game.currentLevelIndex = 2;
    game.initLevel({ scrap: 100, status: "running" });
    const chokeSlot = game.slots.find((slot) => slot.trait === "choke");
    const result = game.buildAtSlot(chokeSlot.id, "signal");
    game.spawnEnemy("sprinter", result.building.laneRole);
    const enemy = game.enemies[0];
    enemy.x = game.getBuildingPosition(result.building).x + 90;
    enemy.y = result.building.y;
    for (let index = 0; index < 40; index += 1) {
        game.update(0.05);
    }
    assert.equal(enemy.slowMultiplier < 1, true);
    assert.equal(enemy.slowTimer > 0, true);
}

{
    const game = new TrainDefenseCore();
    game.currentLevelIndex = 3;
    game.initLevel({ scrap: 100, status: "running", hp: 50 });
    const result = game.buildAtSlot(0, "repair");
    assert.equal(result.ok, true);
    const amount = game.getRepairAmount(result.building, game.buildingTypes.repair);
    assert.equal(amount > game.buildingTypes.repair.repairAmount, true);
    game.update(0.05);
    assert.equal(game.state.hp, 50 + amount);
}

{
    const game = new TrainDefenseCore();
    game.currentLevelIndex = 4;
    game.initLevel({ status: "running" });
    game.state.waveIndex = 3;
    game.state.spawnTimer = 0;
    game.updateWaves(0.1);
    assert.match(game.state.laneWarning, /最終総攻撃/);
    assert.equal(["top", "bottom", "center"].includes(game.enemies[0].lane), true);
    assert.equal(["sprinter", "breacher", "shield", "raider", "armor"].includes(game.enemies[0].type), true);
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
    assert.equal(game.state.status, "level-cleared");
    assert.match(game.state.message, /練習線/);
}

{
    const game = new TrainDefenseCore({ destinationDistance: 0.4, trainSpeed: 10 });
    game.currentLevelIndex = 4;
    game.initLevel({ status: "running" });
    game.update(0.25);
    assert.equal(game.state.status, "ended");
    assert.match(game.state.message, /終着駅/);
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
