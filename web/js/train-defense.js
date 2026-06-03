(function () {
    "use strict";

    const BUILDING_TYPES = {
        cannon: {
            label: "砲台",
            cost: 30,
            range: 190,
            fireRate: 0.85,
            damage: 22,
            projectileSpeed: 420,
        },
        signal: {
            label: "減速信号",
            cost: 45,
            range: 170,
            fireRate: 1.35,
            damage: 3,
            projectileSpeed: 360,
            slowAmount: 0.45,
            slowDuration: 2.4,
        },
        repair: {
            label: "修理小屋",
            cost: 55,
            range: 0,
            fireRate: 4.2,
            repairAmount: 9,
        },
    };

    const ENEMY_TYPES = {
        runner: {
            label: "ランナー",
            hp: 42,
            speed: 72,
            reward: 13,
            damage: 8,
            radius: 14,
        },
        armor: {
            label: "アーマー",
            hp: 105,
            speed: 39,
            reward: 24,
            damage: 16,
            radius: 18,
        },
        raider: {
            label: "レイダー",
            hp: 68,
            speed: 55,
            reward: 19,
            damage: 24,
            radius: 16,
        },
    };

    const WAVES = [
        { label: "先遣隊", duration: 16, spawnEvery: 2.1, pattern: ["runner", "runner", "raider"] },
        { label: "装甲襲撃", duration: 18, spawnEvery: 1.75, pattern: ["runner", "armor", "runner", "raider"] },
        { label: "総攻撃", duration: 24, spawnEvery: 1.35, pattern: ["raider", "runner", "armor", "runner", "raider"] },
    ];

    const DEFAULT_CONFIG = {
        width: 1280,
        height: 720,
        trainX: 260,
        trackY: 385,
        destinationDistance: 2200,
        trainSpeed: 28,
        maxHp: 100,
        initialScrap: 90,
        slotSpacing: 190,
        firstSlotDistance: 120,
        slotRows: [-112, 112],
        slotCount: 24,
        enemySpawnX: 1260,
        enemyHitX: 334,
    };

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function distanceBetween(a, b) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    class TrainDefenseCore {
        constructor(options = {}) {
            this.config = { ...DEFAULT_CONFIG, ...options };
            this.buildingTypes = BUILDING_TYPES;
            this.enemyTypes = ENEMY_TYPES;
            this.waves = WAVES;
            this.init();
        }

        init() {
            this.state = {
                status: "ready",
                time: 0,
                distance: 0,
                hp: this.config.maxHp,
                scrap: this.config.initialScrap,
                waveIndex: 0,
                waveTime: 0,
                spawnTimer: 0.35,
                spawnCursor: 0,
                selectedBuilding: "cannon",
                message: "設備を選んで、線路脇の建設枠をクリックしてください。",
            };
            this.slots = this.createSlots();
            this.enemies = [];
            this.buildings = [];
            this.projectiles = [];
        }

        createSlots() {
            const slots = [];
            for (let index = 0; index < this.config.slotCount; index += 1) {
                const row = index % 2;
                slots.push({
                    id: index,
                    distance: this.config.firstSlotDistance + Math.floor(index / 2) * this.config.slotSpacing,
                    y: this.config.trackY + this.config.slotRows[row],
                    row,
                    buildingId: null,
                });
            }
            return slots;
        }

        start() {
            if (this.state.status === "ready" || this.state.status === "ended") {
                this.init();
            }
            this.state.status = "running";
            this.state.message = "護衛開始。目的地まで列車を守ってください。";
        }

        pause() {
            if (this.state.status === "running") {
                this.state.status = "paused";
                this.state.message = "一時停止中";
            }
        }

        resume() {
            if (this.state.status === "paused") {
                this.state.status = "running";
                this.state.message = "護衛再開";
            }
        }

        setSelectedBuilding(type) {
            if (!this.buildingTypes[type]) {
                return false;
            }
            this.state.selectedBuilding = type;
            this.state.message = `${this.buildingTypes[type].label}を選択中`;
            return true;
        }

        getVisibleSlots() {
            return this.slots.map((slot) => ({
                ...slot,
                x: this.worldDistanceToScreenX(slot.distance),
            })).filter((slot) => slot.x > -80 && slot.x < this.config.width + 80);
        }

        worldDistanceToScreenX(distance) {
            return this.config.trainX + distance - this.state.distance;
        }

        buildAtSlot(slotId, buildingType = this.state.selectedBuilding) {
            const slot = this.slots.find((candidate) => candidate.id === slotId);
            const buildingDefinition = this.buildingTypes[buildingType];
            if (!slot || !buildingDefinition) {
                return { ok: false, reason: "invalid" };
            }
            if (slot.buildingId !== null) {
                this.state.message = "この場所にはすでに設備があります。";
                return { ok: false, reason: "occupied" };
            }
            if (this.state.scrap < buildingDefinition.cost) {
                this.state.message = "資材が足りません。";
                return { ok: false, reason: "scrap" };
            }
            const building = {
                id: `building-${this.buildings.length + 1}`,
                type: buildingType,
                slotId: slot.id,
                distance: slot.distance,
                y: slot.y,
                cooldown: 0,
            };
            slot.buildingId = building.id;
            this.buildings.push(building);
            this.state.scrap -= buildingDefinition.cost;
            this.state.message = `${buildingDefinition.label}を建設しました。`;
            return { ok: true, building };
        }

        spawnEnemy(type) {
            const definition = this.enemyTypes[type];
            if (!definition) {
                return null;
            }
            const laneOffset = this.enemies.length % 3 === 0 ? -74 : this.enemies.length % 3 === 1 ? 76 : 0;
            const enemy = {
                id: `enemy-${this.state.time.toFixed(2)}-${this.enemies.length}`,
                type,
                x: this.config.enemySpawnX,
                y: this.config.trackY + laneOffset,
                hp: definition.hp,
                maxHp: definition.hp,
                speed: definition.speed,
                slowTimer: 0,
                slowMultiplier: 1,
                reached: false,
            };
            this.enemies.push(enemy);
            return enemy;
        }

        update(deltaSeconds) {
            if (this.state.status !== "running") {
                return;
            }
            const dt = clamp(deltaSeconds, 0, 0.05);
            this.state.time += dt;
            this.state.distance = Math.min(
                this.config.destinationDistance,
                this.state.distance + this.config.trainSpeed * dt,
            );
            this.updateWaves(dt);
            this.updateBuildings(dt);
            this.updateProjectiles(dt);
            this.updateEnemies(dt);
            this.checkEndState();
        }

        updateWaves(dt) {
            if (this.state.waveIndex >= this.waves.length) {
                return;
            }
            const wave = this.waves[this.state.waveIndex];
            this.state.waveTime += dt;
            this.state.spawnTimer -= dt;
            if (this.state.spawnTimer <= 0 && this.state.waveTime <= wave.duration) {
                const type = wave.pattern[this.state.spawnCursor % wave.pattern.length];
                this.spawnEnemy(type);
                this.state.spawnCursor += 1;
                this.state.spawnTimer += wave.spawnEvery;
                this.state.message = `${wave.label} 接近中`;
            }
            if (this.state.waveTime >= wave.duration && this.enemies.length === 0) {
                this.state.waveIndex += 1;
                this.state.waveTime = 0;
                this.state.spawnTimer = 2.4;
                this.state.spawnCursor = 0;
                if (this.state.waveIndex < this.waves.length) {
                    this.state.scrap += 28;
                    this.state.message = "波をしのぎました。資材を補給。";
                }
            }
        }

        updateBuildings(dt) {
            this.buildings.forEach((building) => {
                const definition = this.buildingTypes[building.type];
                building.cooldown = Math.max(0, building.cooldown - dt);
                if (building.type === "repair") {
                    if (building.cooldown === 0 && this.state.hp < this.config.maxHp) {
                        this.state.hp = Math.min(this.config.maxHp, this.state.hp + definition.repairAmount);
                        building.cooldown = definition.fireRate;
                    }
                    return;
                }
                if (building.cooldown > 0) {
                    return;
                }
                const origin = this.getBuildingPosition(building);
                const target = this.findTarget(origin, definition.range);
                if (!target) {
                    return;
                }
                this.projectiles.push({
                    x: origin.x,
                    y: origin.y,
                    targetId: target.id,
                    type: building.type,
                    damage: definition.damage,
                    speed: definition.projectileSpeed,
                    slowAmount: definition.slowAmount || 0,
                    slowDuration: definition.slowDuration || 0,
                });
                building.cooldown = definition.fireRate;
            });
        }

        getBuildingPosition(building) {
            return {
                x: this.worldDistanceToScreenX(building.distance),
                y: building.y,
            };
        }

        findTarget(origin, range) {
            let best = null;
            let bestDistance = Infinity;
            this.enemies.forEach((enemy) => {
                const currentDistance = distanceBetween(origin, enemy);
                if (currentDistance <= range && currentDistance < bestDistance) {
                    best = enemy;
                    bestDistance = currentDistance;
                }
            });
            return best;
        }

        updateProjectiles(dt) {
            const activeProjectiles = [];
            this.projectiles.forEach((projectile) => {
                const target = this.enemies.find((enemy) => enemy.id === projectile.targetId);
                if (!target) {
                    return;
                }
                const dx = target.x - projectile.x;
                const dy = target.y - projectile.y;
                const distance = Math.hypot(dx, dy);
                const travel = projectile.speed * dt;
                if (distance <= travel || distance <= 7) {
                    this.hitEnemy(target, projectile);
                    return;
                }
                projectile.x += (dx / distance) * travel;
                projectile.y += (dy / distance) * travel;
                activeProjectiles.push(projectile);
            });
            this.projectiles = activeProjectiles;
        }

        hitEnemy(enemy, projectile) {
            enemy.hp -= projectile.damage;
            if (projectile.slowAmount > 0) {
                enemy.slowMultiplier = Math.min(enemy.slowMultiplier, projectile.slowAmount);
                enemy.slowTimer = Math.max(enemy.slowTimer, projectile.slowDuration);
            }
            if (enemy.hp <= 0) {
                const definition = this.enemyTypes[enemy.type];
                this.state.scrap += definition.reward;
                this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
            }
        }

        updateEnemies(dt) {
            const activeEnemies = [];
            this.enemies.forEach((enemy) => {
                if (enemy.slowTimer > 0) {
                    enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
                    if (enemy.slowTimer === 0) {
                        enemy.slowMultiplier = 1;
                    }
                }
                enemy.x -= enemy.speed * enemy.slowMultiplier * dt;
                enemy.y += (this.config.trackY - enemy.y) * dt * 0.55;
                if (enemy.x <= this.config.enemyHitX) {
                    const definition = this.enemyTypes[enemy.type];
                    this.state.hp = Math.max(0, this.state.hp - definition.damage);
                    this.state.message = `${definition.label}が列車を攻撃しました。`;
                    return;
                }
                activeEnemies.push(enemy);
            });
            this.enemies = activeEnemies;
        }

        checkEndState() {
            if (this.state.hp <= 0) {
                this.state.status = "ended";
                this.state.message = "列車が破壊されました。";
                return;
            }
            if (this.state.distance >= this.config.destinationDistance) {
                this.state.status = "ended";
                this.state.message = "目的地に到着しました。護衛成功です。";
            }
        }

        getSnapshot() {
            const currentWave = this.waves[this.state.waveIndex] || null;
            return {
                ...this.state,
                maxHp: this.config.maxHp,
                destinationDistance: this.config.destinationDistance,
                currentWaveLabel: currentWave ? currentWave.label : "最終区間",
                buildings: this.buildings.length,
                enemies: this.enemies.length,
            };
        }
    }

    class TrainDefenseRenderer {
        constructor(canvas, core) {
            this.canvas = canvas;
            this.context = canvas.getContext("2d");
            this.core = core;
        }

        render() {
            const ctx = this.context;
            const width = this.canvas.width;
            const height = this.canvas.height;
            ctx.clearRect(0, 0, width, height);
            this.drawSky(ctx, width, height);
            this.drawTerrain(ctx, width, height);
            this.drawSlots(ctx);
            this.drawTrack(ctx, width);
            this.drawBuildings(ctx);
            this.drawTrain(ctx);
            this.drawEnemies(ctx);
            this.drawProjectiles(ctx);
            this.drawProgress(ctx, width);
        }

        drawSky(ctx, width, height) {
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, "#b6d7d4");
            gradient.addColorStop(0.62, "#e9d7aa");
            gradient.addColorStop(1, "#c99d62");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, width, height);
            ctx.fillStyle = "rgba(255, 248, 213, 0.72)";
            ctx.beginPath();
            ctx.arc(1050, 110, 54, 0, Math.PI * 2);
            ctx.fill();
        }

        drawTerrain(ctx, width, height) {
            const offset = -(this.core.state.distance * 0.45) % 220;
            ctx.fillStyle = "#8f7048";
            ctx.fillRect(0, this.core.config.trackY + 86, width, height);
            ctx.fillStyle = "rgba(79, 64, 43, 0.22)";
            for (let x = offset - 220; x < width + 220; x += 220) {
                ctx.beginPath();
                ctx.moveTo(x, this.core.config.trackY + 148);
                ctx.lineTo(x + 90, this.core.config.trackY + 104);
                ctx.lineTo(x + 210, this.core.config.trackY + 154);
                ctx.closePath();
                ctx.fill();
            }
            ctx.fillStyle = "#b98952";
            ctx.fillRect(0, this.core.config.trackY - 130, width, 260);
        }

        drawTrack(ctx, width) {
            const y = this.core.config.trackY;
            ctx.strokeStyle = "#3b3730";
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.moveTo(0, y - 18);
            ctx.lineTo(width, y - 18);
            ctx.moveTo(0, y + 18);
            ctx.lineTo(width, y + 18);
            ctx.stroke();
            const tieOffset = -(this.core.state.distance * 1.5) % 38;
            ctx.strokeStyle = "#6a432b";
            ctx.lineWidth = 7;
            for (let x = tieOffset - 38; x < width + 38; x += 38) {
                ctx.beginPath();
                ctx.moveTo(x, y - 35);
                ctx.lineTo(x + 20, y + 35);
                ctx.stroke();
            }
        }

        drawSlots(ctx) {
            this.core.getVisibleSlots().forEach((slot) => {
                ctx.fillStyle = slot.buildingId ? "rgba(45, 62, 58, 0.38)" : "rgba(255, 247, 213, 0.72)";
                ctx.strokeStyle = slot.buildingId ? "#2d3e3a" : "#6d5737";
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.roundRect(slot.x - 24, slot.y - 24, 48, 48, 8);
                ctx.fill();
                ctx.stroke();
                if (!slot.buildingId) {
                    ctx.fillStyle = "#6d5737";
                    ctx.fillRect(slot.x - 13, slot.y - 2, 26, 4);
                    ctx.fillRect(slot.x - 2, slot.y - 13, 4, 26);
                }
            });
        }

        drawBuildings(ctx) {
            this.core.buildings.forEach((building) => {
                const position = this.core.getBuildingPosition(building);
                if (position.x < -60 || position.x > this.canvas.width + 60) {
                    return;
                }
                if (building.type === "cannon") {
                    ctx.fillStyle = "#34433f";
                    ctx.fillRect(position.x - 17, position.y - 12, 34, 25);
                    ctx.fillStyle = "#1f2421";
                    ctx.fillRect(position.x + 6, position.y - 22, 34, 11);
                } else if (building.type === "signal") {
                    ctx.fillStyle = "#4b342b";
                    ctx.fillRect(position.x - 5, position.y - 26, 10, 52);
                    ctx.fillStyle = "#d4b743";
                    ctx.beginPath();
                    ctx.arc(position.x, position.y - 30, 12, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    ctx.fillStyle = "#785031";
                    ctx.fillRect(position.x - 22, position.y - 15, 44, 32);
                    ctx.fillStyle = "#c2583f";
                    ctx.beginPath();
                    ctx.moveTo(position.x - 27, position.y - 15);
                    ctx.lineTo(position.x, position.y - 39);
                    ctx.lineTo(position.x + 27, position.y - 15);
                    ctx.closePath();
                    ctx.fill();
                }
            });
        }

        drawTrain(ctx) {
            const x = this.core.config.trainX;
            const y = this.core.config.trackY;
            ctx.fillStyle = "#262b2f";
            ctx.fillRect(x - 94, y - 76, 130, 58);
            ctx.fillStyle = "#513b2d";
            ctx.fillRect(x + 36, y - 62, 92, 44);
            ctx.fillStyle = "#171b1f";
            ctx.fillRect(x - 54, y - 114, 38, 40);
            ctx.fillStyle = "#c94c35";
            ctx.fillRect(x - 84, y - 90, 68, 15);
            ctx.fillStyle = "#f2cf75";
            ctx.fillRect(x - 72, y - 64, 23, 20);
            ctx.fillStyle = "#161616";
            [-68, 6, 63, 108].forEach((wheelX) => {
                ctx.beginPath();
                ctx.arc(x + wheelX, y - 16, 16, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.fillStyle = "rgba(48, 48, 48, 0.25)";
            ctx.beginPath();
            ctx.arc(x - 34, y - 142, 18, 0, Math.PI * 2);
            ctx.arc(x - 55, y - 168, 24, 0, Math.PI * 2);
            ctx.fill();
        }

        drawEnemies(ctx) {
            this.core.enemies.forEach((enemy) => {
                const definition = this.core.enemyTypes[enemy.type];
                ctx.fillStyle = enemy.type === "runner" ? "#6f2d2d" : enemy.type === "armor" ? "#4d4f58" : "#733f20";
                ctx.beginPath();
                ctx.arc(enemy.x, enemy.y, definition.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#251c18";
                ctx.fillRect(enemy.x - definition.radius, enemy.y - definition.radius - 12, definition.radius * 2, 5);
                ctx.fillStyle = "#d6c66f";
                ctx.fillRect(
                    enemy.x - definition.radius,
                    enemy.y - definition.radius - 12,
                    definition.radius * 2 * clamp(enemy.hp / enemy.maxHp, 0, 1),
                    5,
                );
                if (enemy.slowTimer > 0) {
                    ctx.strokeStyle = "#79c9d1";
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(enemy.x, enemy.y, definition.radius + 5, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
        }

        drawProjectiles(ctx) {
            this.core.projectiles.forEach((projectile) => {
                ctx.fillStyle = projectile.type === "signal" ? "#7ed0da" : "#1f1f1f";
                ctx.beginPath();
                ctx.arc(projectile.x, projectile.y, projectile.type === "signal" ? 5 : 4, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        drawProgress(ctx, width) {
            const progress = this.core.state.distance / this.core.config.destinationDistance;
            ctx.fillStyle = "rgba(39, 30, 20, 0.5)";
            ctx.fillRect(26, 26, width - 52, 10);
            ctx.fillStyle = "#d6b24d";
            ctx.fillRect(26, 26, (width - 52) * progress, 10);
        }
    }

    class TrainDefenseGame {
        constructor() {
            this.elements = this.collectElements();
            this.core = new TrainDefenseCore();
            this.renderer = new TrainDefenseRenderer(this.elements.canvas, this.core);
            this.lastFrame = 0;
            this.animationId = 0;
            this.bind();
            this.syncUi();
            this.renderer.render();
        }

        collectElements() {
            return {
                canvas: document.getElementById("train-defense-canvas"),
                overlay: document.getElementById("train-defense-overlay"),
                overlayTitle: document.getElementById("train-defense-overlay-title"),
                overlayText: document.getElementById("train-defense-overlay-text"),
                hp: document.getElementById("train-defense-hp"),
                scrap: document.getElementById("train-defense-scrap"),
                distance: document.getElementById("train-defense-distance"),
                destination: document.getElementById("train-defense-destination"),
                wave: document.getElementById("train-defense-wave"),
                selected: document.getElementById("train-defense-selected"),
                message: document.getElementById("train-defense-message"),
                startButton: document.getElementById("train-defense-start"),
                pauseButton: document.getElementById("train-defense-pause"),
                restartButton: document.getElementById("train-defense-restart"),
                buildingButtons: Array.from(document.querySelectorAll("[data-building]")),
            };
        }

        bind() {
            this.elements.startButton.addEventListener("click", () => this.start());
            this.elements.pauseButton.addEventListener("click", () => this.togglePause());
            this.elements.restartButton.addEventListener("click", () => this.restart());
            this.elements.canvas.addEventListener("click", (event) => this.handleCanvasClick(event));
            this.elements.buildingButtons.forEach((button) => {
                button.addEventListener("click", () => {
                    this.core.setSelectedBuilding(button.dataset.building);
                    this.syncUi();
                });
            });
        }

        start() {
            this.core.start();
            this.elements.overlay.hidden = true;
            this.lastFrame = performance.now();
            this.loop(this.lastFrame);
            this.syncUi();
        }

        restart() {
            cancelAnimationFrame(this.animationId);
            this.core.init();
            this.elements.overlay.hidden = false;
            this.elements.overlayTitle.textContent = "列車防衛";
            this.elements.overlayText.textContent = "設備を選び、流れてくる建設枠に配置して目的地まで列車を守る。";
            this.syncUi();
            this.renderer.render();
        }

        togglePause() {
            if (this.core.state.status === "running") {
                this.core.pause();
            } else if (this.core.state.status === "paused") {
                this.core.resume();
                this.lastFrame = performance.now();
                this.loop(this.lastFrame);
            }
            this.syncUi();
        }

        handleCanvasClick(event) {
            const rect = this.elements.canvas.getBoundingClientRect();
            const scaleX = this.elements.canvas.width / rect.width;
            const scaleY = this.elements.canvas.height / rect.height;
            const x = (event.clientX - rect.left) * scaleX;
            const y = (event.clientY - rect.top) * scaleY;
            const slot = this.core.getVisibleSlots().find((candidate) => (
                Math.abs(candidate.x - x) <= 30 && Math.abs(candidate.y - y) <= 30
            ));
            if (!slot) {
                return;
            }
            this.core.buildAtSlot(slot.id);
            this.syncUi();
            this.renderer.render();
        }

        loop(timestamp) {
            const deltaSeconds = (timestamp - this.lastFrame) / 1000;
            this.lastFrame = timestamp;
            this.core.update(deltaSeconds);
            this.renderer.render();
            this.syncUi();
            if (this.core.state.status === "running") {
                this.animationId = requestAnimationFrame((nextTimestamp) => this.loop(nextTimestamp));
            } else if (this.core.state.status === "ended") {
                this.showEndOverlay();
            }
        }

        showEndOverlay() {
            this.elements.overlay.hidden = false;
            this.elements.overlayTitle.textContent = this.core.state.hp > 0 ? "護衛成功" : "護衛失敗";
            this.elements.overlayText.textContent = this.core.state.message;
        }

        syncUi() {
            const snapshot = this.core.getSnapshot();
            this.elements.hp.textContent = `${Math.ceil(snapshot.hp)} / ${snapshot.maxHp}`;
            this.elements.scrap.textContent = String(Math.floor(snapshot.scrap));
            this.elements.distance.textContent = `${Math.floor(snapshot.distance)}m`;
            this.elements.destination.textContent = `${Math.max(0, Math.ceil(snapshot.destinationDistance - snapshot.distance))}m`;
            this.elements.wave.textContent = snapshot.currentWaveLabel;
            this.elements.selected.textContent = this.core.buildingTypes[snapshot.selectedBuilding].label;
            this.elements.message.textContent = snapshot.message;
            this.elements.pauseButton.textContent = snapshot.status === "paused" ? "再開" : "一時停止";
            this.elements.buildingButtons.forEach((button) => {
                const selected = button.dataset.building === snapshot.selectedBuilding;
                button.classList.toggle("selected", selected);
                button.setAttribute("aria-pressed", selected ? "true" : "false");
            });
        }
    }

    globalThis.TrainDefenseCore = TrainDefenseCore;
    globalThis.TrainDefenseRenderer = TrainDefenseRenderer;
    globalThis.TrainDefenseGame = TrainDefenseGame;

    if (typeof document !== "undefined") {
        window.addEventListener("DOMContentLoaded", () => {
            new TrainDefenseGame();
        });
    }
}());
