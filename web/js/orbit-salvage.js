(function initializeOrbitSalvage(globalScope) {
    "use strict";

    const TAU = Math.PI * 2;
    const SAVE_KEY = "ai-games.orbit-salvage.progress";
    const SAVE_VERSION = 1;
    const BASE_MAX_HP = 100;
    const BASE_SHIELD_DEGREES = 32;
    const MAX_SHIELD_DEGREES = 56;
    const BASE_ROTATION_SPEED = 2.6;
    const MAX_ROTATION_SPEED = 4.5;
    const SHIELD_RADIUS = 180;
    const BASE_RADIUS = 58;
    const MODE_COOLDOWN = 0.2;
    const COMBO_WINDOW = 3;

    const OBJECT_TYPES = Object.freeze({
        resource: Object.freeze({ family: "resource", score: 100, salvage: 1, damage: 0 }),
        rare: Object.freeze({ family: "resource", score: 250, salvage: 2, damage: 0 }),
        meteor: Object.freeze({ family: "danger", score: 75, salvage: 0, damage: 20 }),
        heavy: Object.freeze({ family: "danger", score: 150, salvage: 0, damage: 30 }),
    });

    const STAGES = Object.freeze([
        Object.freeze({ title: "回収訓練", brief: "回収モードで R 資源を捕捉してください。", duration: 30, quota: 6, spawnInterval: 1.6, speed: 88, spawnRadius: 430, pairChance: 0, weights: { resource: 1 } }),
        Object.freeze({ title: "防衛訓練", brief: "防御モードへ切り替え、D 隕石を迎撃してください。", duration: 30, quota: 0, spawnInterval: 1.5, speed: 92, spawnRadius: 430, pairChance: 0, weights: { meteor: 1 } }),
        Object.freeze({ title: "混成航路", brief: "R は回収、D は防御。形を見てモードを切り替えます。", duration: 40, quota: 8, spawnInterval: 1.35, speed: 96, spawnRadius: 430, pairChance: 0, weights: { resource: 0.56, meteor: 0.44 } }),
        Object.freeze({ title: "高速接近", brief: "飛来速度が上昇します。先読みして旋回してください。", duration: 40, quota: 10, spawnInterval: 1.2, speed: 108, spawnRadius: 430, pairChance: 0.08, weights: { resource: 0.57, meteor: 0.43 } }),
        Object.freeze({ title: "希少資源帯", brief: "星形の希少資源は回収数2、250点です。", duration: 40, quota: 12, spawnInterval: 1.1, speed: 110, spawnRadius: 430, pairChance: 0.1, weights: { resource: 0.42, rare: 0.18, meteor: 0.4 } }),
        Object.freeze({ title: "重隕石警報", brief: "六角形の大型隕石は基地へ30ダメージを与えます。", duration: 40, quota: 12, spawnInterval: 1, speed: 114, spawnRadius: 430, pairChance: 0.12, weights: { resource: 0.42, rare: 0.12, meteor: 0.31, heavy: 0.15 } }),
        Object.freeze({ title: "双方向流入", brief: "反対方向から同時に接近する飛来物へ対応してください。", duration: 40, quota: 14, spawnInterval: 0.9, speed: 118, spawnRadius: 430, pairChance: 0.34, weights: { resource: 0.4, rare: 0.14, meteor: 0.31, heavy: 0.15 } }),
        Object.freeze({ title: "センサー障害", brief: "探知距離が短縮されています。記号を素早く判別してください。", duration: 40, quota: 16, spawnInterval: 0.82, speed: 121, spawnRadius: 365, pairChance: 0.22, weights: { resource: 0.4, rare: 0.15, meteor: 0.29, heavy: 0.16 } }),
        Object.freeze({ title: "密集宙域", brief: "短い間隔で続く飛来物をコンボへ変えてください。", duration: 40, quota: 18, spawnInterval: 0.72, speed: 126, spawnRadius: 400, pairChance: 0.25, weights: { resource: 0.39, rare: 0.16, meteor: 0.27, heavy: 0.18 } }),
        Object.freeze({ title: "最終複合波", brief: "全種の飛来物が押し寄せます。基地と回収船を守り抜いてください。", duration: 50, quota: 22, spawnInterval: 0.6, speed: 134, spawnRadius: 405, pairChance: 0.4, weights: { resource: 0.37, rare: 0.17, meteor: 0.26, heavy: 0.2 } }),
    ]);

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function normalizeAngle(angle) {
        const normalized = angle % TAU;
        return normalized < 0 ? normalized + TAU : normalized;
    }

    function shortestAngleDelta(target, current) {
        let delta = normalizeAngle(target) - normalizeAngle(current);
        if (delta > Math.PI) {
            delta -= TAU;
        } else if (delta < -Math.PI) {
            delta += TAU;
        }
        return delta;
    }

    function copyUpgrades(upgrades) {
        return {
            shield: upgrades.shield,
            thruster: upgrades.thruster,
            hull: upgrades.hull,
        };
    }

    class OrbitSalvageCore {
        constructor(options = {}) {
            this.random = typeof options.random === "function" ? options.random : Math.random;
            this.stageDefinitions = STAGES;
            this.objectTypes = OBJECT_TYPES;
            this.nextObjectId = 1;
            this.stageEntry = null;
            this.init(options.stageIndex || 0);
        }

        init(stageIndex = 0) {
            this.stageIndex = clamp(Math.trunc(Number(stageIndex) || 0), 0, STAGES.length - 1);
            this.upgrades = this.createBalancedPreset(this.stageIndex);
            this.score = 0;
            this.recalculateStats();
            this.hp = this.maxHp;
            this.angle = -Math.PI / 2;
            this.rotationInput = 0;
            this.pointerTarget = null;
            this.mode = "salvage";
            this.modeCooldown = 0;
            this.objects = [];
            this.nextObjectId = 1;
            this.resetStageRuntime("ready");
            this.stageEntry = null;
            return this.getSnapshot();
        }

        createBalancedPreset(stageIndex) {
            const upgrades = { shield: 0, thruster: 0, hull: 0 };
            const order = ["shield", "thruster", "hull"];
            for (let index = 0; index < stageIndex; index += 1) {
                upgrades[order[index % order.length]] += 1;
            }
            return upgrades;
        }

        recalculateStats() {
            this.shieldDegrees = Math.min(MAX_SHIELD_DEGREES, BASE_SHIELD_DEGREES + this.upgrades.shield * 6);
            this.rotationSpeed = Math.min(MAX_ROTATION_SPEED, BASE_ROTATION_SPEED * (1.12 ** this.upgrades.thruster));
            this.maxHp = Math.min(150, BASE_MAX_HP + this.upgrades.hull * 10);
        }

        resetStageRuntime(status) {
            const stage = this.stageDefinitions[this.stageIndex];
            this.state = {
                status,
                pauseReason: "",
                elapsed: 0,
                timeRemaining: stage.duration,
                collected: 0,
                quota: stage.quota,
                combo: 0,
                comboTimer: 0,
                spawnTimer: 0.7,
                upgradeSelected: false,
                lastMessage: stage.brief,
                hitFlash: 0,
            };
            this.angle = -Math.PI / 2;
            this.rotationInput = 0;
            this.pointerTarget = null;
            this.mode = "salvage";
            this.modeCooldown = 0;
            this.objects = [];
        }

        captureStageEntry() {
            return {
                stageIndex: this.stageIndex,
                hp: this.hp,
                score: this.score,
                upgrades: copyUpgrades(this.upgrades),
            };
        }

        startStage(stageIndex = this.stageIndex) {
            const nextIndex = clamp(Math.trunc(Number(stageIndex) || 0), 0, STAGES.length - 1);
            this.stageIndex = nextIndex;
            this.recalculateStats();
            this.hp = clamp(this.hp, 0, this.maxHp);
            this.resetStageRuntime("running");
            this.stageEntry = this.captureStageEntry();
            return true;
        }

        startNextStage() {
            if (this.state.status !== "stage-cleared" || !this.state.upgradeSelected || this.stageIndex >= STAGES.length - 1) {
                return false;
            }
            this.stageIndex += 1;
            this.recalculateStats();
            this.resetStageRuntime("running");
            this.stageEntry = this.captureStageEntry();
            return true;
        }

        retryStage() {
            if (!this.stageEntry) {
                return false;
            }
            this.stageIndex = this.stageEntry.stageIndex;
            this.hp = this.stageEntry.hp;
            this.score = this.stageEntry.score;
            this.upgrades = copyUpgrades(this.stageEntry.upgrades);
            this.recalculateStats();
            this.resetStageRuntime("running");
            return true;
        }

        pause(reason = "manual") {
            if (this.state.status !== "running") {
                return false;
            }
            this.state.status = "paused";
            this.state.pauseReason = reason;
            return true;
        }

        resume() {
            if (this.state.status !== "paused") {
                return false;
            }
            this.state.status = "running";
            this.state.pauseReason = "";
            return true;
        }

        setRotationInput(direction) {
            const numericDirection = Number(direction) || 0;
            this.rotationInput = numericDirection === 0 ? 0 : Math.sign(numericDirection);
            if (this.rotationInput !== 0) {
                this.pointerTarget = null;
            }
        }

        setPointerTarget(angle) {
            if (!Number.isFinite(angle)) {
                return false;
            }
            this.pointerTarget = normalizeAngle(angle);
            this.rotationInput = 0;
            return true;
        }

        toggleMode() {
            if (this.state.status !== "running" || this.modeCooldown > 0) {
                return false;
            }
            this.mode = this.mode === "salvage" ? "defense" : "salvage";
            this.modeCooldown = MODE_COOLDOWN;
            this.state.lastMessage = this.mode === "salvage" ? "回収アレイへ切替" : "防御アレイへ切替";
            return true;
        }

        canUpgrade(type) {
            if (type === "shield") {
                return this.shieldDegrees < MAX_SHIELD_DEGREES;
            }
            if (type === "thruster") {
                return this.rotationSpeed < MAX_ROTATION_SPEED;
            }
            if (type === "hull") {
                return this.maxHp < 150;
            }
            return false;
        }

        applyUpgrade(type) {
            if (this.state.status !== "stage-cleared" || this.state.upgradeSelected || !this.canUpgrade(type)) {
                return false;
            }
            this.upgrades[type] += 1;
            this.recalculateStats();
            if (type === "hull") {
                this.hp = Math.min(this.maxHp, this.hp + 20);
            }
            this.state.upgradeSelected = true;
            return true;
        }

        update(deltaTime) {
            if (this.state.status !== "running") {
                return this.getSnapshot();
            }
            const dt = clamp(Number(deltaTime) || 0, 0, 0.25);
            if (dt === 0) {
                return this.getSnapshot();
            }

            this.state.elapsed += dt;
            this.state.timeRemaining = Math.max(0, this.state.timeRemaining - dt);
            this.modeCooldown = Math.max(0, this.modeCooldown - dt);
            this.state.hitFlash = Math.max(0, this.state.hitFlash - dt * 2.8);

            if (this.state.comboTimer > 0) {
                this.state.comboTimer = Math.max(0, this.state.comboTimer - dt);
                if (this.state.comboTimer === 0) {
                    this.state.combo = 0;
                }
            }

            this.updateRotation(dt);
            this.updateSpawning(dt);
            this.updateObjects(dt);

            if (this.state.status === "running" && this.state.timeRemaining <= 0) {
                this.finishStage();
            }
            return this.getSnapshot();
        }

        updateRotation(dt) {
            if (this.rotationInput !== 0) {
                this.angle = normalizeAngle(this.angle + this.rotationInput * this.rotationSpeed * dt);
                return;
            }
            if (this.pointerTarget === null) {
                return;
            }
            const delta = shortestAngleDelta(this.pointerTarget, this.angle);
            const step = this.rotationSpeed * dt;
            if (Math.abs(delta) <= step) {
                this.angle = this.pointerTarget;
            } else {
                this.angle = normalizeAngle(this.angle + Math.sign(delta) * step);
            }
        }

        updateSpawning(dt) {
            const stage = this.stageDefinitions[this.stageIndex];
            this.state.spawnTimer -= dt;
            while (this.state.spawnTimer <= 0 && this.state.timeRemaining > 0) {
                this.spawnWave();
                const jitter = 0.88 + this.random() * 0.24;
                this.state.spawnTimer += stage.spawnInterval * jitter;
            }
        }

        chooseObjectType(weights) {
            const roll = this.random();
            let cursor = 0;
            for (const [type, weight] of Object.entries(weights)) {
                cursor += weight;
                if (roll <= cursor) {
                    return type;
                }
            }
            return Object.keys(weights)[0];
        }

        spawnWave() {
            const stage = this.stageDefinitions[this.stageIndex];
            const type = this.chooseObjectType(stage.weights);
            const angle = this.random() * TAU;
            this.spawnObject(type, angle);
            if (stage.pairChance > 0 && this.random() < stage.pairChance) {
                this.spawnObject(this.chooseObjectType(stage.weights), normalizeAngle(angle + Math.PI));
            }
        }

        spawnObject(type, angle = this.random() * TAU) {
            const definition = this.objectTypes[type];
            if (!definition) {
                return null;
            }
            const stage = this.stageDefinitions[this.stageIndex];
            const object = {
                id: this.nextObjectId,
                type,
                family: definition.family,
                angle: normalizeAngle(angle),
                radius: stage.spawnRadius,
                speed: stage.speed * (0.88 + this.random() * 0.24),
            };
            this.nextObjectId += 1;
            this.objects.push(object);
            return object;
        }

        updateObjects(dt) {
            const survivors = [];
            for (const object of this.objects) {
                const previousRadius = object.radius;
                object.radius -= object.speed * dt;
                let resolved = false;

                if (previousRadius > SHIELD_RADIUS && object.radius <= SHIELD_RADIUS && this.isWithinShield(object.angle)) {
                    resolved = this.resolveShieldContact(object);
                }

                if (!resolved && object.radius <= BASE_RADIUS) {
                    this.resolveBaseContact(object);
                    resolved = true;
                }

                if (!resolved) {
                    survivors.push(object);
                }
            }
            this.objects = survivors;
        }

        isWithinShield(objectAngle) {
            const halfArc = (this.shieldDegrees * Math.PI / 180) / 2;
            return Math.abs(shortestAngleDelta(objectAngle, this.angle)) <= halfArc + 0.035;
        }

        resolveShieldContact(object) {
            const definition = this.objectTypes[object.type];
            if (definition.family === "resource") {
                if (this.mode === "salvage") {
                    this.registerSuccess(definition.score);
                    this.state.collected += definition.salvage;
                    this.state.lastMessage = object.type === "rare" ? "希少資源を回収 +2" : "資源を回収";
                } else {
                    this.resetCombo();
                    this.state.lastMessage = "防御アレイで資源を破損";
                }
                return true;
            }

            if (this.mode === "defense") {
                this.registerSuccess(definition.score);
                this.state.lastMessage = object.type === "heavy" ? "大型隕石を迎撃" : "隕石を迎撃";
            } else {
                this.damageBase(definition.damage, "回収アレイを隕石が突破");
            }
            return true;
        }

        resolveBaseContact(object) {
            const definition = this.objectTypes[object.type];
            if (definition.family === "resource") {
                this.resetCombo();
                this.state.lastMessage = "資源を回収できませんでした";
                return;
            }
            this.damageBase(definition.damage, "隕石が基地へ衝突");
        }

        registerSuccess(baseScore) {
            this.state.combo = this.state.comboTimer > 0 ? Math.min(5, this.state.combo + 1) : 1;
            this.state.comboTimer = COMBO_WINDOW;
            this.score += baseScore * this.state.combo;
        }

        resetCombo() {
            this.state.combo = 0;
            this.state.comboTimer = 0;
        }

        damageBase(amount, message) {
            this.hp = Math.max(0, this.hp - amount);
            this.state.hitFlash = 1;
            this.state.lastMessage = `${message} -${amount}`;
            this.resetCombo();
            if (this.hp <= 0) {
                this.state.status = "failed";
                this.state.lastMessage = "基地が機能停止しました";
            }
        }

        finishStage() {
            if (this.hp <= 0 || this.state.collected < this.state.quota) {
                this.state.status = "failed";
                this.state.lastMessage = this.hp <= 0 ? "基地が機能停止しました" : `回収ノルマ未達 ${this.state.collected} / ${this.state.quota}`;
                return;
            }
            this.score += this.hp * 10 + Math.max(0, this.state.collected - this.state.quota) * 100;
            if (this.stageIndex === STAGES.length - 1) {
                this.state.status = "completed";
                this.state.lastMessage = "全航路の回収任務を完了しました";
            } else {
                this.state.status = "stage-cleared";
                this.state.lastMessage = "ステージクリア";
            }
        }

        getSnapshot() {
            const stage = this.stageDefinitions[this.stageIndex];
            return {
                status: this.state.status,
                pauseReason: this.state.pauseReason,
                stageIndex: this.stageIndex,
                stageCount: this.stageDefinitions.length,
                stageTitle: stage.title,
                stageBrief: stage.brief,
                duration: stage.duration,
                timeRemaining: this.state.timeRemaining,
                collected: this.state.collected,
                quota: this.state.quota,
                hp: this.hp,
                maxHp: this.maxHp,
                score: this.score,
                combo: this.state.combo,
                comboTimer: this.state.comboTimer,
                mode: this.mode,
                modeCooldown: this.modeCooldown,
                angle: normalizeAngle(this.angle),
                shieldDegrees: this.shieldDegrees,
                rotationSpeed: this.rotationSpeed,
                upgrades: copyUpgrades(this.upgrades),
                lastMessage: this.state.lastMessage,
                hitFlash: this.state.hitFlash,
                objects: this.objects.map((object) => ({ ...object })),
            };
        }

        static getStageDefinitions() {
            return STAGES.map((stage) => ({ ...stage, weights: { ...stage.weights } }));
        }

        static normalizeAngle(angle) {
            return normalizeAngle(angle);
        }

        static shortestAngleDelta(target, current) {
            return shortestAngleDelta(target, current);
        }

        static readProgress(storage) {
            const fallback = { version: SAVE_VERSION, highestStage: 0, highScore: 0 };
            if (!storage || typeof storage.getItem !== "function") {
                return fallback;
            }
            try {
                const raw = storage.getItem(SAVE_KEY);
                if (!raw) {
                    return fallback;
                }
                const saved = JSON.parse(raw);
                if (saved.version !== SAVE_VERSION || !Number.isInteger(saved.highestStage) || !Number.isFinite(saved.highScore)) {
                    return fallback;
                }
                return {
                    version: SAVE_VERSION,
                    highestStage: clamp(saved.highestStage, 0, STAGES.length - 1),
                    highScore: Math.max(0, Math.trunc(saved.highScore)),
                };
            } catch (error) {
                console.warn("Orbit Salvage save data could not be read.", error);
                return fallback;
            }
        }

        static writeProgress(storage, progress) {
            if (!storage || typeof storage.setItem !== "function") {
                return false;
            }
            const safeProgress = {
                version: SAVE_VERSION,
                highestStage: clamp(Math.trunc(progress.highestStage) || 0, 0, STAGES.length - 1),
                highScore: Math.max(0, Math.trunc(progress.highScore) || 0),
            };
            try {
                storage.setItem(SAVE_KEY, JSON.stringify(safeProgress));
                return true;
            } catch (error) {
                console.warn("Orbit Salvage save data could not be written.", error);
                return false;
            }
        }
    }

    class OrbitSalvageRenderer {
        constructor(canvas) {
            if (!canvas || typeof canvas.getContext !== "function") {
                throw new Error("Orbit Salvage canvas is unavailable.");
            }
            this.canvas = canvas;
            this.context = canvas.getContext("2d");
            if (!this.context) {
                throw new Error("Orbit Salvage requires Canvas 2D support.");
            }
            this.center = { x: canvas.width / 2, y: canvas.height / 2 };
            this.stars = this.createStars(95);
        }

        createStars(count) {
            const stars = [];
            let seed = 9137;
            for (let index = 0; index < count; index += 1) {
                seed = (seed * 16807) % 2147483647;
                const x = (seed % 10000) / 10000 * this.canvas.width;
                seed = (seed * 16807) % 2147483647;
                const y = (seed % 10000) / 10000 * this.canvas.height;
                seed = (seed * 16807) % 2147483647;
                stars.push({ x, y, radius: 0.4 + (seed % 16) / 10, alpha: 0.2 + (seed % 55) / 100 });
            }
            return stars;
        }

        render(snapshot) {
            const context = this.context;
            context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawBackground(snapshot);
            this.drawRadar(snapshot);
            this.drawObjects(snapshot.objects);
            this.drawBase(snapshot);
            this.drawShip(snapshot);
            this.drawCanvasStatus(snapshot);
        }

        drawBackground(snapshot) {
            const context = this.context;
            const gradient = context.createRadialGradient(this.center.x, this.center.y, 40, this.center.x, this.center.y, 520);
            gradient.addColorStop(0, "#0c2b43");
            gradient.addColorStop(0.45, "#071625");
            gradient.addColorStop(1, "#01050c");
            context.fillStyle = gradient;
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);

            for (const star of this.stars) {
                context.globalAlpha = star.alpha;
                context.fillStyle = "#bdefff";
                context.beginPath();
                context.arc(star.x, star.y, star.radius, 0, TAU);
                context.fill();
            }
            context.globalAlpha = 1;

            if (snapshot.hitFlash > 0) {
                context.fillStyle = `rgba(255, 58, 88, ${snapshot.hitFlash * 0.16})`;
                context.fillRect(0, 0, this.canvas.width, this.canvas.height);
            }
        }

        drawRadar(snapshot) {
            const context = this.context;
            context.save();
            context.translate(this.center.x, this.center.y);
            context.strokeStyle = "rgba(72, 218, 255, 0.13)";
            context.lineWidth = 1;
            for (const radius of [90, SHIELD_RADIUS, 270, 360, 440]) {
                context.beginPath();
                context.arc(0, 0, radius, 0, TAU);
                context.stroke();
            }
            for (let angle = 0; angle < TAU; angle += Math.PI / 6) {
                context.beginPath();
                context.moveTo(Math.cos(angle) * 72, Math.sin(angle) * 72);
                context.lineTo(Math.cos(angle) * 455, Math.sin(angle) * 455);
                context.stroke();
            }

            const sweep = snapshot.angle - 0.35;
            const sweepGradient = context.createRadialGradient(0, 0, 40, 0, 0, 430);
            sweepGradient.addColorStop(0, "rgba(67, 237, 255, 0.13)");
            sweepGradient.addColorStop(1, "rgba(67, 237, 255, 0)");
            context.fillStyle = sweepGradient;
            context.beginPath();
            context.moveTo(0, 0);
            context.arc(0, 0, 430, sweep - 0.25, sweep + 0.25);
            context.closePath();
            context.fill();
            context.restore();
        }

        drawObjects(objects) {
            for (const object of objects) {
                const x = this.center.x + Math.cos(object.angle) * object.radius;
                const y = this.center.y + Math.sin(object.angle) * object.radius;
                if (object.type === "resource") {
                    this.drawResource(x, y, false);
                } else if (object.type === "rare") {
                    this.drawResource(x, y, true);
                } else if (object.type === "meteor") {
                    this.drawMeteor(x, y, object.angle, false);
                } else {
                    this.drawMeteor(x, y, object.angle, true);
                }
            }
        }

        drawResource(x, y, rare) {
            const context = this.context;
            context.save();
            context.translate(x, y);
            context.shadowBlur = 16;
            context.shadowColor = rare ? "#ffe072" : "#43edff";
            context.strokeStyle = rare ? "#ffe072" : "#43edff";
            context.fillStyle = rare ? "rgba(255, 224, 114, 0.15)" : "rgba(67, 237, 255, 0.14)";
            context.lineWidth = 2;
            context.beginPath();
            if (rare) {
                this.tracePolygon(context, 5, 2, -Math.PI / 2, 18, 8);
            } else {
                context.arc(0, 0, 15, 0, TAU);
            }
            context.fill();
            context.stroke();
            context.shadowBlur = 0;
            context.fillStyle = rare ? "#ffe072" : "#b7fbff";
            context.font = "bold 12px Consolas, monospace";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText("R", 0, 0.5);
            context.restore();
        }

        drawMeteor(x, y, angle, heavy) {
            const context = this.context;
            context.save();
            context.translate(x, y);
            context.rotate(angle + Math.PI / 2);
            context.shadowBlur = heavy ? 20 : 14;
            context.shadowColor = heavy ? "#ff526c" : "#ff9b50";
            context.strokeStyle = heavy ? "#ff526c" : "#ff9b50";
            context.fillStyle = heavy ? "rgba(255, 82, 108, 0.2)" : "rgba(255, 155, 80, 0.17)";
            context.lineWidth = heavy ? 3 : 2;
            context.beginPath();
            this.tracePolygon(context, heavy ? 6 : 3, 1, -Math.PI / 2, heavy ? 19 : 18, heavy ? 19 : 18);
            context.fill();
            context.stroke();
            context.shadowBlur = 0;
            context.rotate(-(angle + Math.PI / 2));
            context.fillStyle = heavy ? "#ffafba" : "#ffd1ad";
            context.font = "bold 12px Consolas, monospace";
            context.textAlign = "center";
            context.textBaseline = "middle";
            context.fillText("D", 0, 0.5);
            context.restore();
        }

        tracePolygon(context, points, step, startAngle, outerRadius, innerRadius) {
            const count = points * step;
            for (let index = 0; index < count; index += 1) {
                const radius = step > 1 && index % 2 === 1 ? innerRadius : outerRadius;
                const angle = startAngle + index * TAU / count;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (index === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
            }
            context.closePath();
        }

        drawBase(snapshot) {
            const context = this.context;
            context.save();
            context.translate(this.center.x, this.center.y);
            const hpRatio = snapshot.hp / snapshot.maxHp;
            context.shadowBlur = 24;
            context.shadowColor = hpRatio < 0.35 ? "#ff526c" : "#43edff";
            context.fillStyle = "#071625";
            context.strokeStyle = hpRatio < 0.35 ? "#ff526c" : "#61e9ff";
            context.lineWidth = 3;
            context.beginPath();
            this.tracePolygon(context, 8, 1, Math.PI / 8, BASE_RADIUS, BASE_RADIUS);
            context.fill();
            context.stroke();
            context.shadowBlur = 0;

            context.strokeStyle = "rgba(120, 235, 255, 0.45)";
            context.lineWidth = 1;
            context.beginPath();
            context.arc(0, 0, 38, 0, TAU);
            context.stroke();
            context.fillStyle = "#dffaff";
            context.font = "bold 13px Consolas, monospace";
            context.textAlign = "center";
            context.fillText("BASE", 0, -3);
            context.fillStyle = hpRatio < 0.35 ? "#ff7d90" : "#5dffc1";
            context.font = "bold 11px Consolas, monospace";
            context.fillText(`${snapshot.hp} HP`, 0, 14);
            context.restore();
        }

        drawShip(snapshot) {
            const context = this.context;
            const color = snapshot.mode === "salvage" ? "#43edff" : "#ff9b50";
            const arc = snapshot.shieldDegrees * Math.PI / 180;
            context.save();
            context.translate(this.center.x, this.center.y);
            context.strokeStyle = color;
            context.lineWidth = 8;
            context.lineCap = "round";
            context.shadowBlur = 22;
            context.shadowColor = color;
            context.beginPath();
            context.arc(0, 0, SHIELD_RADIUS, snapshot.angle - arc / 2, snapshot.angle + arc / 2);
            context.stroke();

            const x = Math.cos(snapshot.angle) * SHIELD_RADIUS;
            const y = Math.sin(snapshot.angle) * SHIELD_RADIUS;
            context.translate(x, y);
            context.rotate(snapshot.angle + Math.PI / 2);
            context.fillStyle = "#e7fbff";
            context.strokeStyle = color;
            context.lineWidth = 2;
            context.beginPath();
            context.moveTo(0, -20);
            context.lineTo(13, 13);
            context.lineTo(0, 8);
            context.lineTo(-13, 13);
            context.closePath();
            context.fill();
            context.stroke();
            context.restore();
        }

        drawCanvasStatus(snapshot) {
            const context = this.context;
            context.save();
            context.font = "bold 12px Consolas, monospace";
            context.textAlign = "right";
            context.fillStyle = snapshot.mode === "salvage" ? "#43edff" : "#ff9b50";
            context.fillText(snapshot.mode === "salvage" ? "ARRAY: SALVAGE" : "ARRAY: DEFENSE", this.canvas.width - 16, 25);
            if (snapshot.status === "paused") {
                context.fillStyle = "rgba(1, 5, 12, 0.66)";
                context.fillRect(0, 0, this.canvas.width, this.canvas.height);
                context.fillStyle = "#e8f8ff";
                context.font = "bold 34px Consolas, monospace";
                context.textAlign = "center";
                context.fillText("PAUSED", this.center.x, this.center.y);
            }
            context.restore();
        }
    }

    class OrbitSalvageGame {
        constructor(documentScope) {
            this.document = documentScope;
            this.elements = this.collectElements();
            this.core = new OrbitSalvageCore();
            this.renderer = new OrbitSalvageRenderer(this.elements.canvas);
            try {
                this.storage = globalScope.localStorage;
            } catch (error) {
                console.warn("Orbit Salvage storage is unavailable.", error);
                this.storage = null;
            }
            this.progress = OrbitSalvageCore.readProgress(this.storage);
            this.lastTimestamp = 0;
            this.lastHandledStatus = "ready";
            this.pointerActive = false;
            this.loop = (timestamp) => this.frame(timestamp);
            this.populateStageSelect();
            this.updateRecordDisplay();
            this.syncUi(this.core.getSnapshot());
            this.renderer.render(this.core.getSnapshot());
            globalScope.requestAnimationFrame(this.loop);
        }

        collectElements() {
            const ids = [
                "orbit-canvas", "orbit-stage-name", "orbit-start-overlay", "orbit-upgrade-overlay", "orbit-result-overlay",
                "orbit-stage-select", "orbit-record-stage", "orbit-record-score", "orbit-start-button", "orbit-result-kicker",
                "orbit-result-title", "orbit-result-text", "orbit-result-score", "orbit-retry-button", "orbit-menu-button",
                "orbit-left-button", "orbit-right-button", "orbit-mode-button", "orbit-mode-label", "orbit-status",
                "orbit-stage-title", "orbit-stage-brief", "orbit-time", "orbit-time-bar", "orbit-hp", "orbit-hp-bar",
                "orbit-quota", "orbit-quota-bar", "orbit-score", "orbit-combo", "orbit-mode-readout",
                "orbit-mode-readout-label", "orbit-mode-help", "orbit-shield-level", "orbit-thruster-level", "orbit-hull-level",
                "orbit-pause-button",
            ];
            const elements = {};
            for (const id of ids) {
                const element = this.document.getElementById(id);
                if (!element) {
                    throw new Error(`Orbit Salvage element is missing: ${id}`);
                }
                const key = id.replace("orbit-", "").replaceAll("-", "_");
                elements[key] = element;
            }
            elements.upgradeButtons = [...this.document.querySelectorAll("[data-upgrade]")];
            return elements;
        }

        init(stageIndex) {
            this.core.init(stageIndex);
            this.lastHandledStatus = "ready";
            this.lastTimestamp = 0;
            this.hideOverlays();
        }

        startSelectedStage() {
            const stageIndex = Number(this.elements.stage_select.value) || 0;
            this.init(stageIndex);
            this.core.startStage(stageIndex);
            this.lastHandledStatus = "running";
            this.syncUi(this.core.getSnapshot());
        }

        retryStage() {
            if (this.core.retryStage()) {
                this.hideOverlays();
                this.lastHandledStatus = "running";
                this.lastTimestamp = 0;
            }
        }

        selectUpgrade(type) {
            if (!this.core.applyUpgrade(type)) {
                return;
            }
            if (this.core.startNextStage()) {
                this.hideOverlays();
                this.lastHandledStatus = "running";
                this.lastTimestamp = 0;
            }
        }

        showMenu() {
            this.core.init(Number(this.elements.stage_select.value) || 0);
            this.elements.result_overlay.hidden = true;
            this.elements.upgrade_overlay.hidden = true;
            this.elements.start_overlay.hidden = false;
            this.lastHandledStatus = "ready";
            this.syncUi(this.core.getSnapshot());
        }

        togglePause() {
            const snapshot = this.core.getSnapshot();
            if (snapshot.status === "running") {
                this.core.pause("manual");
            } else if (snapshot.status === "paused") {
                this.core.resume();
                this.lastTimestamp = 0;
            }
        }

        previewSelectedStage() {
            const stageIndex = Number(this.elements.stage_select.value) || 0;
            const stage = OrbitSalvageCore.getStageDefinitions()[stageIndex];
            this.elements.stage_name.textContent = `STAGE ${String(stageIndex + 1).padStart(2, "0")}`;
            this.elements.stage_title.textContent = stage.title;
            this.elements.stage_brief.textContent = stage.brief;
        }

        setPointerFromEvent(event) {
            const rect = this.elements.canvas.getBoundingClientRect();
            const x = (event.clientX - rect.left) * this.elements.canvas.width / rect.width;
            const y = (event.clientY - rect.top) * this.elements.canvas.height / rect.height;
            const angle = Math.atan2(y - this.elements.canvas.height / 2, x - this.elements.canvas.width / 2);
            this.core.setPointerTarget(angle);
        }

        frame(timestamp) {
            if (this.lastTimestamp === 0) {
                this.lastTimestamp = timestamp;
            }
            const deltaTime = Math.min(0.05, Math.max(0, (timestamp - this.lastTimestamp) / 1000));
            this.lastTimestamp = timestamp;
            const snapshot = this.core.update(deltaTime);
            this.handleStatus(snapshot);
            this.syncUi(snapshot);
            this.renderer.render(snapshot);
            globalScope.requestAnimationFrame(this.loop);
        }

        handleStatus(snapshot) {
            if (snapshot.status === this.lastHandledStatus) {
                return;
            }
            this.lastHandledStatus = snapshot.status;
            if (snapshot.status === "stage-cleared") {
                this.saveProgress(Math.min(snapshot.stageCount - 1, snapshot.stageIndex + 1), snapshot.score);
                this.showUpgradeOverlay();
            } else if (snapshot.status === "failed") {
                this.saveProgress(this.progress.highestStage, snapshot.score);
                this.showResult(false, snapshot);
            } else if (snapshot.status === "completed") {
                this.saveProgress(snapshot.stageCount - 1, snapshot.score);
                this.showResult(true, snapshot);
            }
        }

        showUpgradeOverlay() {
            for (const button of this.elements.upgradeButtons) {
                button.disabled = !this.core.canUpgrade(button.dataset.upgrade);
            }
            this.elements.upgrade_overlay.hidden = false;
        }

        showResult(victory, snapshot) {
            this.elements.result_kicker.textContent = victory ? "ALL MISSIONS COMPLETE" : "MISSION FAILED";
            this.elements.result_title.textContent = victory ? "全航路 回収完了" : (snapshot.hp <= 0 ? "基地機能停止" : "回収ノルマ未達");
            this.elements.result_text.textContent = victory ? "オービット回収船は全10宙域を突破しました。" : snapshot.lastMessage;
            this.elements.result_score.textContent = `${snapshot.score.toLocaleString("ja-JP")} PTS`;
            this.elements.retry_button.textContent = victory ? "最終ステージを再挑戦" : "このステージを再挑戦";
            this.elements.result_overlay.hidden = false;
        }

        hideOverlays() {
            this.elements.start_overlay.hidden = true;
            this.elements.upgrade_overlay.hidden = true;
            this.elements.result_overlay.hidden = true;
        }

        saveProgress(highestStage, highScore) {
            this.progress = {
                version: SAVE_VERSION,
                highestStage: Math.max(this.progress.highestStage, highestStage),
                highScore: Math.max(this.progress.highScore, highScore),
            };
            OrbitSalvageCore.writeProgress(this.storage, this.progress);
            this.populateStageSelect();
            this.updateRecordDisplay();
        }

        populateStageSelect() {
            const current = clamp(Number(this.elements.stage_select.value) || 0, 0, this.progress.highestStage);
            this.elements.stage_select.replaceChildren();
            const stages = OrbitSalvageCore.getStageDefinitions();
            for (let index = 0; index <= this.progress.highestStage; index += 1) {
                const option = this.document.createElement("option");
                option.value = String(index);
                option.textContent = `STAGE ${String(index + 1).padStart(2, "0")} — ${stages[index].title}`;
                option.selected = index === current;
                this.elements.stage_select.append(option);
            }
            this.previewSelectedStage();
        }

        updateRecordDisplay() {
            this.elements.record_stage.textContent = `STAGE ${String(this.progress.highestStage + 1).padStart(2, "0")}`;
            this.elements.record_score.textContent = this.progress.highScore.toLocaleString("ja-JP");
        }

        syncUi(snapshot) {
            const stageNumber = String(snapshot.stageIndex + 1).padStart(2, "0");
            const statusLabels = {
                ready: "待機中",
                running: "航行中",
                paused: "一時停止",
                "stage-cleared": "完了",
                failed: "失敗",
                completed: "全任務完了",
            };
            this.elements.stage_name.textContent = `STAGE ${stageNumber}`;
            this.elements.status.textContent = statusLabels[snapshot.status] || snapshot.status;
            this.elements.stage_title.textContent = snapshot.stageTitle;
            this.elements.stage_brief.textContent = snapshot.lastMessage || snapshot.stageBrief;
            this.elements.time.textContent = snapshot.timeRemaining.toFixed(1);
            this.elements.time_bar.style.width = `${clamp(snapshot.timeRemaining / snapshot.duration * 100, 0, 100)}%`;
            this.elements.hp.textContent = `${snapshot.hp} / ${snapshot.maxHp}`;
            this.elements.hp_bar.style.width = `${clamp(snapshot.hp / snapshot.maxHp * 100, 0, 100)}%`;
            this.elements.quota.textContent = `${snapshot.collected} / ${snapshot.quota}`;
            this.elements.quota_bar.style.width = `${snapshot.quota === 0 ? 100 : clamp(snapshot.collected / snapshot.quota * 100, 0, 100)}%`;
            this.elements.score.textContent = snapshot.score.toLocaleString("ja-JP");
            this.elements.combo.textContent = `x${snapshot.combo}`;
            this.elements.shield_level.textContent = `${snapshot.shieldDegrees}°`;
            this.elements.thruster_level.textContent = snapshot.rotationSpeed.toFixed(2);
            this.elements.hull_level.textContent = `Lv.${snapshot.upgrades.hull}`;
            this.elements.pause_button.textContent = snapshot.status === "paused" ? "再開" : "一時停止";
            this.elements.pause_button.disabled = !["running", "paused"].includes(snapshot.status);

            const defense = snapshot.mode === "defense";
            this.elements.mode_button.classList.toggle("defense", defense);
            this.elements.mode_button.classList.toggle("salvage", !defense);
            this.elements.mode_readout.classList.toggle("defense", defense);
            this.elements.mode_readout.classList.toggle("salvage", !defense);
            this.elements.mode_label.textContent = defense ? "防御モード" : "回収モード";
            this.elements.mode_readout_label.textContent = defense ? "DEFENSE / 防御" : "SALVAGE / 回収";
            this.elements.mode_help.textContent = defense ? "三角・六角形の D 隕石を迎撃" : "円・星形の R 資源を捕捉";
        }
    }

    function setupOrbitSalvageEventHandlers(game) {
        const elements = game.elements;
        const held = { left: false, right: false };

        const updateRotation = () => {
            game.core.setRotationInput((held.right ? 1 : 0) - (held.left ? 1 : 0));
        };
        const setHeld = (direction, active) => {
            held[direction] = active;
            updateRotation();
        };
        const isGameKey = (key) => ["ArrowLeft", "ArrowRight", "a", "A", "d", "D", " "].includes(key);

        game.document.addEventListener("keydown", (event) => {
            if (!isGameKey(event.key) || event.target instanceof HTMLSelectElement) {
                return;
            }
            const status = game.core.getSnapshot().status;
            if (!["running", "paused"].includes(status)) {
                return;
            }
            event.preventDefault();
            if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
                setHeld("left", true);
            } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
                setHeld("right", true);
            } else if (event.key === " " && !event.repeat) {
                game.core.toggleMode();
            }
        });

        game.document.addEventListener("keyup", (event) => {
            if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
                setHeld("left", false);
            } else if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
                setHeld("right", false);
            }
        });

        const bindHoldButton = (button, direction) => {
            button.addEventListener("pointerdown", (event) => {
                event.preventDefault();
                button.setPointerCapture(event.pointerId);
                setHeld(direction, true);
            });
            const release = () => setHeld(direction, false);
            button.addEventListener("pointerup", release);
            button.addEventListener("pointercancel", release);
            button.addEventListener("lostpointercapture", release);
        };

        bindHoldButton(elements.left_button, "left");
        bindHoldButton(elements.right_button, "right");

        elements.canvas.addEventListener("pointerdown", (event) => {
            game.pointerActive = true;
            elements.canvas.setPointerCapture(event.pointerId);
            game.setPointerFromEvent(event);
        });
        elements.canvas.addEventListener("pointermove", (event) => {
            if (game.pointerActive) {
                game.setPointerFromEvent(event);
            }
        });
        const stopPointer = () => {
            game.pointerActive = false;
        };
        elements.canvas.addEventListener("pointerup", stopPointer);
        elements.canvas.addEventListener("pointercancel", stopPointer);
        elements.canvas.addEventListener("lostpointercapture", stopPointer);

        elements.mode_button.addEventListener("click", () => game.core.toggleMode());
        elements.start_button.addEventListener("click", () => game.startSelectedStage());
        elements.retry_button.addEventListener("click", () => game.retryStage());
        elements.menu_button.addEventListener("click", () => game.showMenu());
        elements.pause_button.addEventListener("click", () => game.togglePause());
        elements.stage_select.addEventListener("change", () => game.previewSelectedStage());
        for (const button of elements.upgradeButtons) {
            button.addEventListener("click", () => game.selectUpgrade(button.dataset.upgrade));
        }

        game.document.addEventListener("visibilitychange", () => {
            if (game.document.hidden) {
                game.core.pause("hidden");
            }
        });
        globalScope.addEventListener("blur", () => {
            held.left = false;
            held.right = false;
            updateRotation();
        });
    }

    globalScope.OrbitSalvageCore = OrbitSalvageCore;

    if (globalScope.document) {
        globalScope.document.addEventListener("DOMContentLoaded", () => {
            try {
                const game = new OrbitSalvageGame(globalScope.document);
                setupOrbitSalvageEventHandlers(game);
            } catch (error) {
                console.error("Orbit Salvage could not start.", error);
                const canvas = globalScope.document.getElementById("orbit-canvas");
                if (canvas) {
                    canvas.replaceWith(globalScope.document.createTextNode("ゲームの初期化に失敗しました。ページを再読み込みしてください。"));
                }
            }
        });
    }
})(globalThis);
