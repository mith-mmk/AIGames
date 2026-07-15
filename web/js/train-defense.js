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
        sprinter: {
            label: "スプリンター",
            hp: 34,
            speed: 104,
            reward: 15,
            damage: 10,
            radius: 13,
        },
        breacher: {
            label: "ブリーチャー",
            hp: 82,
            speed: 47,
            reward: 22,
            damage: 32,
            radius: 17,
        },
        shield: {
            label: "シールド",
            hp: 138,
            speed: 33,
            reward: 30,
            damage: 18,
            radius: 19,
        },
    };

    const LANES = {
        top: { label: "上レーン", offset: -96 },
        center: { label: "中央突破", offset: 0 },
        bottom: { label: "下レーン", offset: 96 },
    };

    const LEVELS = [
        {
            label: "1面 練習線",
            startMessage: "1面は練習線です。砲台を置いて、設備の流れを確認してください。",
            clearMessage: "練習線を突破しました。2面からは上下レーンの圧力が上がります。",
            destinationDistance: 900,
            trainSpeed: 30,
            initialScrap: 110,
            slotSpacing: 150,
            firstSlotDistance: 110,
            slotCount: 14,
            waveBonus: 32,
            waves: [
                { label: "先遣隊", duration: 10, spawnEvery: 2.7, pattern: ["runner", "runner"], lanePattern: ["center"] },
                { label: "軽襲撃", duration: 12, spawnEvery: 2.35, pattern: ["runner", "runner", "raider"], lanePattern: ["top", "bottom", "center"] },
            ],
        },
        {
            label: "2面 峡谷線",
            startMessage: "2面は本番です。上下レーンの偏りとスロット特性を見て配置してください。",
            clearMessage: "峡谷線を突破しました。3面は高速の群れが来ます。",
            destinationDistance: 1900,
            trainSpeed: 26,
            initialScrap: 78,
            slotSpacing: 170,
            firstSlotDistance: 110,
            slotCount: 24,
            waveBonus: 18,
            waves: [
                {
                    label: "上方襲撃",
                    duration: 15,
                    spawnEvery: 1.65,
                    pattern: ["runner", "raider", "runner", "armor"],
                    lanePattern: ["top", "top", "center", "top"],
                    laneWarning: "上レーン集中。上段スロットの火力と減速が重要です。",
                },
                {
                    label: "下方襲撃",
                    duration: 15,
                    spawnEvery: 1.6,
                    pattern: ["runner", "runner", "armor", "raider"],
                    lanePattern: ["bottom", "bottom", "center", "bottom"],
                    laneWarning: "下レーン集中。下段の漏れは修理小屋で受ける判断も必要です。",
                },
                {
                    label: "中央突破",
                    duration: 16,
                    spawnEvery: 1.45,
                    pattern: ["armor", "runner", "raider", "armor"],
                    lanePattern: ["center", "top", "center", "bottom"],
                    laneWarning: "中央突破。中央寄りの不安定スロットは強いが資材を食います。",
                },
                {
                    label: "上下同時",
                    duration: 20,
                    spawnEvery: 1.25,
                    pattern: ["raider", "runner", "armor", "runner", "raider"],
                    lanePattern: ["top", "bottom", "top", "bottom", "center"],
                    laneWarning: "上下同時攻撃。減速信号で密集を止め、修理で最後を支えてください。",
                },
            ],
            slotTraits: {
                3: "choke",
                6: "unstable",
                9: "choke",
                12: "unstable",
                15: "choke",
                18: "unstable",
            },
        },
        {
            label: "3面 渓谷急行",
            startMessage: "3面は高速群です。減速信号でスプリンターを足止めすると安定します。",
            clearMessage: "渓谷急行を抜けました。4面は高火力の襲撃に備えてください。",
            destinationDistance: 2100,
            trainSpeed: 27,
            initialScrap: 72,
            slotSpacing: 165,
            firstSlotDistance: 100,
            slotCount: 26,
            waveBonus: 16,
            signalBoost: 0.08,
            waves: [
                {
                    label: "高速群",
                    duration: 16,
                    spawnEvery: 1.18,
                    pattern: ["sprinter", "runner", "sprinter", "raider"],
                    lanePattern: ["top", "bottom", "top", "center"],
                    laneWarning: "高速群。減速信号をチョークに置くと処理時間を稼げます。",
                },
                {
                    label: "谷間の密集",
                    duration: 18,
                    spawnEvery: 1.1,
                    pattern: ["sprinter", "sprinter", "armor", "runner", "sprinter"],
                    lanePattern: ["bottom", "bottom", "center", "top", "bottom"],
                    laneWarning: "下レーン密集。火力だけで追うより減速で固める局面です。",
                },
                {
                    label: "高速包囲",
                    duration: 20,
                    spawnEvery: 1.0,
                    pattern: ["sprinter", "raider", "sprinter", "shield", "runner"],
                    lanePattern: ["top", "bottom", "center", "top", "bottom"],
                    laneWarning: "上下の高速包囲。減速と砲台の射程を重ねてください。",
                },
            ],
            slotTraits: {
                2: "choke",
                4: "choke",
                7: "unstable",
                10: "choke",
                13: "choke",
                16: "unstable",
                20: "choke",
            },
        },
        {
            label: "4面 破砕橋",
            startMessage: "4面は高火力襲撃です。修理小屋で受け切る配置が有効です。",
            clearMessage: "破砕橋を渡り切りました。最終面では全戦術を使います。",
            destinationDistance: 2250,
            trainSpeed: 24,
            initialScrap: 68,
            slotSpacing: 175,
            firstSlotDistance: 115,
            slotCount: 26,
            waveBonus: 14,
            repairBoost: 5,
            waves: [
                {
                    label: "破壊工作",
                    duration: 17,
                    spawnEvery: 1.55,
                    pattern: ["breacher", "runner", "raider", "breacher"],
                    lanePattern: ["center", "top", "bottom", "center"],
                    laneWarning: "ブリーチャー接近。被弾後に修理小屋で立て直せます。",
                },
                {
                    label: "橋上圧力",
                    duration: 18,
                    spawnEvery: 1.45,
                    pattern: ["shield", "breacher", "runner", "raider"],
                    lanePattern: ["top", "center", "bottom", "center"],
                    laneWarning: "橋上圧力。装甲敵を止めつつHP管理が必要です。",
                },
                {
                    label: "爆破隊",
                    duration: 20,
                    spawnEvery: 1.35,
                    pattern: ["breacher", "breacher", "sprinter", "shield", "raider"],
                    lanePattern: ["bottom", "center", "top", "center", "bottom"],
                    laneWarning: "爆破隊。修理小屋があると高火力を受け切りやすくなります。",
                },
            ],
            slotTraits: {
                1: "unstable",
                5: "choke",
                8: "unstable",
                11: "choke",
                14: "unstable",
                17: "choke",
                21: "unstable",
            },
        },
        {
            label: "5面 終着前総攻撃",
            startMessage: "最終面です。砲台、減速信号、修理小屋を混ぜて総攻撃をしのいでください。",
            clearMessage: "終着駅に到着しました。護衛成功です。",
            destinationDistance: 2500,
            trainSpeed: 25,
            initialScrap: 64,
            slotSpacing: 170,
            firstSlotDistance: 100,
            slotCount: 30,
            waveBonus: 10,
            signalBoost: 0.06,
            repairBoost: 4,
            waves: [
                {
                    label: "高速先鋒",
                    duration: 18,
                    spawnEvery: 1.05,
                    pattern: ["sprinter", "runner", "sprinter", "breacher", "raider"],
                    lanePattern: ["top", "bottom", "center", "top", "bottom"],
                    laneWarning: "高速先鋒。減速信号で左右の崩れを抑えてください。",
                },
                {
                    label: "装甲壁",
                    duration: 19,
                    spawnEvery: 1.25,
                    pattern: ["shield", "armor", "shield", "breacher", "runner"],
                    lanePattern: ["center", "top", "center", "bottom", "top"],
                    laneWarning: "装甲壁。滞留させて砲台の集中火力を作る局面です。",
                },
                {
                    label: "破砕突撃",
                    duration: 20,
                    spawnEvery: 1.15,
                    pattern: ["breacher", "sprinter", "raider", "breacher", "shield"],
                    lanePattern: ["bottom", "top", "center", "bottom", "center"],
                    laneWarning: "破砕突撃。修理小屋で被弾後の立て直しを狙えます。",
                },
                {
                    label: "終着前総攻撃",
                    duration: 24,
                    spawnEvery: 0.95,
                    pattern: ["sprinter", "breacher", "shield", "raider", "armor", "sprinter"],
                    lanePattern: ["top", "bottom", "center", "top", "bottom", "center"],
                    laneWarning: "最終総攻撃。減速で固め、修理で受け、砲台で削り切ってください。",
                },
            ],
            slotTraits: {
                2: "choke",
                4: "unstable",
                6: "choke",
                9: "unstable",
                12: "choke",
                15: "unstable",
                18: "choke",
                21: "unstable",
                24: "choke",
                27: "unstable",
            },
        },
    ];

    const DEFAULT_CONFIG = {
        width: 1280,
        height: 720,
        trainX: 260,
        trackY: 385,
        destinationDistance: 900,
        trainSpeed: 28,
        maxHp: 100,
        initialScrap: 110,
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
            this.optionOverrides = options;
            this.config = { ...DEFAULT_CONFIG, ...options };
            this.buildingTypes = BUILDING_TYPES;
            this.enemyTypes = ENEMY_TYPES;
            this.levels = LEVELS;
            this.currentLevelIndex = clamp(options.levelIndex || 0, 0, this.levels.length - 1);
            this.waves = this.getCurrentLevelDefinition().waves;
            this.init();
        }

        init() {
            this.currentLevelIndex = 0;
            this.initLevel({
                hp: this.config.maxHp,
                scrap: this.getLevelValue("initialScrap"),
                selectedBuilding: "cannon",
                status: "ready",
                message: this.getCurrentLevelDefinition().startMessage,
            });
        }

        initLevel(carry = {}) {
            const level = this.getCurrentLevelDefinition();
            this.waves = level.waves;
            this.state = {
                status: carry.status || "ready",
                time: 0,
                distance: 0,
                hp: carry.hp ?? this.config.maxHp,
                scrap: carry.scrap ?? this.getLevelValue("initialScrap"),
                waveIndex: 0,
                waveTime: 0,
                spawnTimer: 0.35,
                spawnCursor: 0,
                selectedBuilding: carry.selectedBuilding || "cannon",
                laneWarning: "",
                message: carry.message || level.startMessage,
            };
            this.slots = this.createSlots();
            this.enemies = [];
            this.buildings = [];
            this.projectiles = [];
        }

        getCurrentLevelDefinition() {
            return this.levels[this.currentLevelIndex] || this.levels[0];
        }

        getLevelValue(key) {
            const level = this.getCurrentLevelDefinition();
            if (Object.prototype.hasOwnProperty.call(this.optionOverrides, key)) {
                return this.optionOverrides[key];
            }
            return level[key] ?? this.config[key];
        }

        createSlots() {
            const level = this.getCurrentLevelDefinition();
            const slots = [];
            for (let index = 0; index < this.getLevelValue("slotCount"); index += 1) {
                const row = index % 2;
                const trait = level.slotTraits ? level.slotTraits[index] || "normal" : "normal";
                const laneRole = this.getSlotLaneRole(row, trait);
                slots.push({
                    id: index,
                    distance: this.getLevelValue("firstSlotDistance") + Math.floor(index / 2) * this.getLevelValue("slotSpacing"),
                    y: this.config.trackY + this.getSlotRowOffset(row, trait),
                    row,
                    laneRole,
                    trait,
                    buildingId: null,
                });
            }
            return slots;
        }

        getSlotRowOffset(row, trait) {
            const baseOffset = this.config.slotRows[row];
            if (trait === "unstable") {
                return baseOffset * 0.68;
            }
            if (trait === "choke") {
                return baseOffset * 0.86;
            }
            return baseOffset;
        }

        getSlotLaneRole(row, trait) {
            if (trait === "unstable") {
                return "center";
            }
            return row === 0 ? "top" : "bottom";
        }

        start() {
            if (this.state.status === "ready" || this.state.status === "ended") {
                this.init();
            }
            if (this.state.status === "level-cleared") {
                this.advanceLevel();
                return;
            }
            this.state.status = "running";
            this.state.message = this.getCurrentLevelDefinition().startMessage;
        }

        advanceLevel() {
            if (this.state.status !== "level-cleared" || this.currentLevelIndex >= this.levels.length - 1) {
                return false;
            }
            const selectedBuilding = this.state.selectedBuilding;
            const hp = Math.min(this.config.maxHp, this.state.hp + 14);
            this.currentLevelIndex += 1;
            const scrap = this.getCarryScrap();
            this.initLevel({
                hp,
                scrap,
                selectedBuilding,
                status: "running",
                message: this.getCurrentLevelDefinition().startMessage,
            });
            return true;
        }

        getCarryScrap() {
            const nextLevel = this.getCurrentLevelDefinition();
            const minimum = 55;
            const carryLimit = nextLevel.initialScrap + 48;
            return Math.min(carryLimit, Math.max(minimum, Math.floor(this.state.scrap + 18)));
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
            if (this.state.status !== "running" && this.state.status !== "paused") {
                this.state.message = "護衛開始後に設備を配置できます。";
                return { ok: false, reason: "not-running" };
            }
            if (slot.buildingId !== null) {
                this.state.message = "この場所にはすでに設備があります。";
                return { ok: false, reason: "occupied" };
            }
            const cost = this.getBuildingCost(buildingType, slot);
            if (this.state.scrap < cost) {
                this.state.message = "資材が足りません。";
                return { ok: false, reason: "scrap" };
            }
            const building = {
                id: `building-${this.buildings.length + 1}`,
                type: buildingType,
                slotId: slot.id,
                distance: slot.distance,
                y: slot.y,
                laneRole: slot.laneRole,
                trait: slot.trait,
                cooldown: 0,
            };
            slot.buildingId = building.id;
            this.buildings.push(building);
            this.state.scrap -= cost;
            this.state.message = `${buildingDefinition.label}を建設しました。`;
            return { ok: true, building };
        }

        getBuildingCost(buildingType, slot) {
            const baseCost = this.buildingTypes[buildingType].cost;
            if (slot && slot.trait === "unstable") {
                return Math.ceil(baseCost * 1.28);
            }
            return baseCost;
        }

        spawnEnemy(type, lane = null) {
            const definition = this.enemyTypes[type];
            if (!definition) {
                return null;
            }
            const resolvedLane = lane || this.getFallbackLane();
            const laneOffset = LANES[resolvedLane] ? LANES[resolvedLane].offset : LANES.center.offset;
            const enemy = {
                id: `enemy-${this.state.time.toFixed(2)}-${this.enemies.length}`,
                type,
                lane: resolvedLane,
                x: this.config.enemySpawnX,
                y: this.config.trackY + laneOffset,
                targetY: this.config.trackY + laneOffset,
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

        getFallbackLane() {
            const fallback = ["top", "bottom", "center"];
            return fallback[this.enemies.length % fallback.length];
        }

        update(deltaSeconds) {
            if (this.state.status !== "running") {
                return;
            }
            const dt = clamp(deltaSeconds, 0, 0.05);
            this.state.time += dt;
            this.state.distance = Math.min(
                this.getLevelValue("destinationDistance"),
                this.state.distance + this.getLevelValue("trainSpeed") * dt,
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
                const lane = wave.lanePattern ? wave.lanePattern[this.state.spawnCursor % wave.lanePattern.length] : null;
                this.spawnEnemy(type, lane);
                this.state.spawnCursor += 1;
                this.state.spawnTimer += wave.spawnEvery;
                this.state.laneWarning = wave.laneWarning || "";
                this.state.message = wave.laneWarning || `${wave.label} 接近中`;
            }
            if (this.state.waveTime >= wave.duration && this.enemies.length === 0) {
                this.state.waveIndex += 1;
                this.state.waveTime = 0;
                this.state.spawnTimer = 2.4;
                this.state.spawnCursor = 0;
                this.state.laneWarning = "";
                if (this.state.waveIndex < this.waves.length) {
                    this.state.scrap += this.getWaveBonus();
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
                        this.state.hp = Math.min(this.config.maxHp, this.state.hp + this.getRepairAmount(building, definition));
                        building.cooldown = definition.fireRate;
                    }
                    return;
                }
                if (building.cooldown > 0) {
                    return;
                }
                const origin = this.getBuildingPosition(building);
                const target = this.findTarget(origin, this.getBuildingRange(building, definition));
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
                    slowAmount: this.getSlowAmount(building, definition),
                    slowDuration: this.getSlowDuration(building, definition),
                });
                building.cooldown = definition.fireRate;
            });
        }

        getBuildingRange(building, definition) {
            if (building.laneRole === "center") {
                return definition.range + 36;
            }
            return definition.range;
        }

        getSlowAmount(building, definition) {
            if (building.type !== "signal") {
                return 0;
            }
            const level = this.getCurrentLevelDefinition();
            if (building.type === "signal" && building.trait === "choke") {
                return Math.max(0.24, (definition.slowAmount || 0) - 0.14 - (level.signalBoost || 0));
            }
            return Math.max(0.3, (definition.slowAmount || 0) - (level.signalBoost || 0));
        }

        getSlowDuration(building, definition) {
            if (building.type !== "signal") {
                return 0;
            }
            const level = this.getCurrentLevelDefinition();
            if (building.type === "signal" && building.trait === "choke") {
                return (definition.slowDuration || 0) + 1.1 + (level.signalBoost ? 0.45 : 0);
            }
            return definition.slowDuration || 0;
        }

        getRepairAmount(building, definition) {
            const level = this.getCurrentLevelDefinition();
            const traitBonus = building.trait === "unstable" ? 2 : 0;
            return definition.repairAmount + (level.repairBoost || 0) + traitBonus;
        }

        getBuildingPosition(building) {
            return {
                x: this.worldDistanceToScreenX(building.distance),
                y: building.y,
                laneRole: building.laneRole,
            };
        }

        findTarget(origin, range) {
            let best = null;
            let bestDistance = Infinity;
            this.enemies.forEach((enemy) => {
                const currentDistance = distanceBetween(origin, enemy);
                const lanePenalty = this.getLanePenalty(origin.laneRole, enemy.lane);
                const adjustedDistance = currentDistance + lanePenalty;
                if (currentDistance <= range && adjustedDistance < bestDistance) {
                    best = enemy;
                    bestDistance = adjustedDistance;
                }
            });
            return best;
        }

        getLanePenalty(slotLane, enemyLane) {
            if (!slotLane || slotLane === "center" || slotLane === enemyLane) {
                return 0;
            }
            if (enemyLane === "center") {
                return 28;
            }
            return 70;
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
                enemy.y += ((enemy.targetY || this.config.trackY) - enemy.y) * dt * 0.55;
                if (enemy.x <= this.config.enemyHitX) {
                    const definition = this.enemyTypes[enemy.type];
                    this.state.hp = Math.max(0, this.state.hp - this.getEnemyDamage(enemy.type));
                    this.state.message = `${definition.label}が列車を攻撃しました。`;
                    return;
                }
                activeEnemies.push(enemy);
            });
            this.enemies = activeEnemies;
        }

        getWaveBonus() {
            return this.getCurrentLevelDefinition().waveBonus;
        }

        getEnemyDamage(enemyType) {
            const definition = this.enemyTypes[enemyType];
            return definition ? definition.damage : 0;
        }

        checkEndState() {
            if (this.state.hp <= 0) {
                this.state.status = "ended";
                this.state.message = "列車が破壊されました。";
                return;
            }
            if (this.state.distance >= this.getLevelValue("destinationDistance")) {
                if (this.currentLevelIndex < this.levels.length - 1) {
                    this.state.status = "level-cleared";
                    this.state.message = this.getCurrentLevelDefinition().clearMessage;
                    return;
                }
                this.state.status = "ended";
                this.state.message = this.getCurrentLevelDefinition().clearMessage;
            }
        }

        getSnapshot() {
            const currentWave = this.waves[this.state.waveIndex] || null;
            const nextWave = this.waves[this.state.waveIndex + 1] || null;
            const level = this.getCurrentLevelDefinition();
            return {
                ...this.state,
                maxHp: this.config.maxHp,
                levelIndex: this.currentLevelIndex,
                levelLabel: level.label,
                isFinalLevel: this.currentLevelIndex === this.levels.length - 1,
                destinationDistance: this.getLevelValue("destinationDistance"),
                currentWaveLabel: `${level.label}: ${currentWave ? currentWave.label : "最終区間"}`,
                currentWaveNumber: Math.min(this.state.waveIndex + 1, this.waves.length),
                waveCount: this.waves.length,
                waveProgress: currentWave ? clamp(this.state.waveTime / currentWave.duration, 0, 1) : 1,
                nextWaveLabel: nextWave ? nextWave.label : "最終波",
                nextWaveLaneWarning: nextWave ? nextWave.laneWarning || "複数レーンから侵攻" : "目的地まで護衛",
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
            this.drawLaneGuides(ctx, width);
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

        drawLaneGuides(ctx, width) {
            if (this.core.currentLevelIndex === 0) {
                return;
            }
            Object.keys(LANES).forEach((laneKey) => {
                if (laneKey === "center") {
                    return;
                }
                const lane = LANES[laneKey];
                const y = this.core.config.trackY + lane.offset;
                ctx.strokeStyle = laneKey === "top" ? "rgba(80, 91, 99, 0.22)" : "rgba(96, 63, 43, 0.24)";
                ctx.lineWidth = 4;
                ctx.setLineDash([18, 18]);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
                ctx.setLineDash([]);
            });
        }

        drawSlots(ctx) {
            this.core.getVisibleSlots().forEach((slot) => {
                const isChoke = slot.trait === "choke";
                const isUnstable = slot.trait === "unstable";
                ctx.fillStyle = slot.buildingId ? "rgba(45, 62, 58, 0.38)" : "rgba(255, 247, 213, 0.72)";
                ctx.strokeStyle = slot.buildingId ? "#2d3e3a" : "#6d5737";
                if (isChoke) {
                    ctx.strokeStyle = "#2f7d87";
                } else if (isUnstable) {
                    ctx.strokeStyle = "#9d3f2c";
                }
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
                if (isChoke || isUnstable) {
                    ctx.fillStyle = isChoke ? "#2f7d87" : "#9d3f2c";
                    ctx.font = "700 17px Segoe UI, sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(isChoke ? "S" : "!", slot.x, slot.y + 6);
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
                ctx.fillStyle = this.getEnemyColor(enemy.type);
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

        getEnemyColor(type) {
            const colors = {
                runner: "#6f2d2d",
                armor: "#4d4f58",
                raider: "#733f20",
                sprinter: "#8c2f59",
                breacher: "#8b3d2e",
                shield: "#34495c",
            };
            return colors[type] || "#733f20";
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
            const progress = this.core.state.distance / this.core.getLevelValue("destinationDistance");
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
                status: document.getElementById("train-defense-status"),
                level: document.getElementById("train-defense-level"),
                hp: document.getElementById("train-defense-hp"),
                hpBar: document.getElementById("train-defense-hp-bar"),
                scrap: document.getElementById("train-defense-scrap"),
                distance: document.getElementById("train-defense-distance"),
                destination: document.getElementById("train-defense-destination"),
                wave: document.getElementById("train-defense-wave"),
                progressBar: document.getElementById("train-defense-progress-bar"),
                nextWave: document.getElementById("train-defense-next-wave"),
                laneWarning: document.getElementById("train-defense-lane-warning"),
                selected: document.getElementById("train-defense-selected"),
                selectedRange: document.getElementById("train-defense-range"),
                selectedEffect: document.getElementById("train-defense-effect"),
                selectedCost: document.getElementById("train-defense-cost"),
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
            this.elements.startButton.textContent = "護衛開始";
            this.lastFrame = performance.now();
            this.loop(this.lastFrame);
            this.syncUi();
        }

        restart() {
            cancelAnimationFrame(this.animationId);
            this.core.init();
            this.elements.overlay.hidden = false;
            this.elements.overlayTitle.textContent = "列車防衛";
            this.elements.overlayText.textContent = "1面は練習線です。砲台を置いて設備の流れを確認してください。";
            this.elements.startButton.textContent = "護衛開始";
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
            } else if (this.core.state.status === "level-cleared") {
                this.showLevelClearOverlay();
            } else if (this.core.state.status === "ended") {
                this.showEndOverlay();
            }
        }

        showLevelClearOverlay() {
            const snapshot = this.core.getSnapshot();
            this.elements.overlay.hidden = false;
            this.elements.overlayTitle.textContent = `${snapshot.levelIndex + 1}面突破`;
            this.elements.overlayText.textContent = this.core.state.message;
            this.elements.startButton.textContent = `${snapshot.levelIndex + 2}面へ進む`;
        }

        showEndOverlay() {
            this.elements.overlay.hidden = false;
            this.elements.overlayTitle.textContent = this.core.state.hp > 0 ? "護衛成功" : "護衛失敗";
            this.elements.overlayText.textContent = this.core.state.message;
            this.elements.startButton.textContent = "もう一度";
        }

        syncUi() {
            const snapshot = this.core.getSnapshot();
            const levelProgress = snapshot.destinationDistance > 0
                ? Math.min(1, snapshot.distance / snapshot.destinationDistance)
                : 1;
            const selectedDefinition = this.core.buildingTypes[snapshot.selectedBuilding];
            this.elements.hp.textContent = `${Math.ceil(snapshot.hp)} / ${snapshot.maxHp}`;
            this.elements.hpBar.style.transform = `scaleX(${Math.max(0, snapshot.hp / snapshot.maxHp)})`;
            this.elements.scrap.textContent = String(Math.floor(snapshot.scrap));
            this.elements.distance.textContent = `${Math.floor(snapshot.distance)}m`;
            this.elements.destination.textContent = `${Math.max(0, Math.ceil(snapshot.destinationDistance - snapshot.distance))}m`;
            this.elements.level.textContent = snapshot.levelLabel;
            this.elements.wave.textContent = `第${snapshot.currentWaveNumber}波 / ${snapshot.waveCount}`;
            this.elements.progressBar.style.width = `${levelProgress * 100}%`;
            this.elements.nextWave.textContent = snapshot.nextWaveLabel;
            this.elements.laneWarning.textContent = snapshot.nextWaveLaneWarning;
            this.elements.selected.textContent = this.core.buildingTypes[snapshot.selectedBuilding].label;
            this.elements.message.textContent = snapshot.laneWarning || snapshot.message;
            this.elements.selectedRange.textContent = selectedDefinition.range > 0 ? `${selectedDefinition.range}m` : "列車全体";
            this.elements.selectedCost.textContent = String(selectedDefinition.cost);
            this.elements.selectedEffect.textContent = this.getSelectedBuildingEffect(snapshot.selectedBuilding, selectedDefinition);
            this.elements.status.textContent = this.getStatusLabel(snapshot);
            this.elements.pauseButton.textContent = snapshot.status === "paused" ? "再開" : "一時停止";
            this.elements.buildingButtons.forEach((button) => {
                const selected = button.dataset.building === snapshot.selectedBuilding;
                button.classList.toggle("selected", selected);
                button.setAttribute("aria-pressed", selected ? "true" : "false");
            });
        }

        getSelectedBuildingEffect(type, definition) {
            if (type === "cannon") {
                return `単体 ${definition.damage}ダメージ`;
            }
            if (type === "signal") {
                const slowMultiplier = this.core.getSlowAmount({ type, trait: "normal" }, definition);
                return `速度 ${Math.round(slowMultiplier * 100)}%`;
            }
            const repairAmount = this.core.getRepairAmount({ type, trait: "normal" }, definition);
            return `+${repairAmount} HP / ${definition.fireRate}s`;
        }

        getStatusLabel(snapshot) {
            if (snapshot.status === "running") {
                return "走行中";
            }
            if (snapshot.status === "paused") {
                return "一時停止";
            }
            if (snapshot.status === "level-cleared") {
                return "面クリア";
            }
            if (snapshot.status === "ended") {
                return snapshot.hp > 0 ? "到着" : "破損";
            }
            return "待機中";
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
