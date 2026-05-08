(function () {
    "use strict";

    const { CANVAS, CAT, ITEM_TYPES, OBSTACLE_TYPES } = globalThis.BlackCatData;

    function seededRandom(seed) {
        let value = seed >>> 0;
        return function next() {
            value = (value * 1664525 + 1013904223) >>> 0;
            return value / 4294967296;
        };
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function rectsOverlap(a, b) {
        return a.x < b.x + b.width
            && a.x + a.width > b.x
            && a.y < b.y + b.height
            && a.y + a.height > b.y;
    }

    function chooseWeighted(keys, table, random) {
        const total = keys.reduce((sum, key) => sum + (table[key].rarity || 10), 0);
        let cursor = random() * total;
        for (const key of keys) {
            cursor -= table[key].rarity || 10;
            if (cursor <= 0) {
                return key;
            }
        }
        return keys[0];
    }

    function makeMissionSet() {
        return [
            { id: "distance", label: "300mさんぽする", target: 300 },
            { id: "fish", label: "小魚を5つ拾う", target: 5, item: "小魚" },
            { id: "gentle", label: "びっくり80未満で歩く", target: 80 },
        ];
    }

    class BlackCatGame {
        constructor(options) {
            this.stages = options.stages;
            this.saveStore = options.saveStore;
            this.audio = options.audio || null;
            this.random = seededRandom(options.seed || Date.now());
            this.stageIndex = 0;
            this.entities = [];
            this.entitySerial = 0;
            this.spawnCursor = 240;
            this.actions = { left: false, right: false, jump: false, crouch: false };
            this.missions = makeMissionSet();
            this.save = this.saveStore ? this.saveStore.load() : globalThis.BlackCatSaveTools.emptySave();
            this.init(this.stages[this.stageIndex].id);
        }

        init(stageId = "room") {
            const stageIndex = this.stages.findIndex((stage) => stage.id === stageId);
            this.stageIndex = stageIndex >= 0 ? stageIndex : 0;
            this.stage = this.stages[this.stageIndex];
            this.state = "title";
            this.score = 0;
            this.distance = 0;
            this.bestRunDistance = 0;
            this.surprise = 0;
            this.combo = 0;
            this.runEscaped = false;
            this.message = "";
            this.sleepTimer = 0;
            this.recoverTimer = 0;
            this.checkpointX = 0;
            this.entities = [];
            this.spawnCursor = 240;
            this.entitySerial = 0;
            this.cat = {
                worldX: 80,
                y: CANVAS.groundY - CAT.footOffset,
                vx: CAT.baseSpeed,
                vy: 0,
                onGround: true,
                crouching: false,
                animation: "idle",
                animationTime: 0,
                facing: 1,
            };
            this.registerPlace(this.stage.name);
            if (this.audio) {
                this.audio.setMusic(this.stage.theme.music);
            }
            this.ensureEntitiesThrough(1800);
        }

        start() {
            this.state = "running";
            this.message = "";
            if (this.audio) {
                this.audio.sfx("start");
            }
        }

        pause() {
            if (this.state === "running") {
                this.state = "paused";
            } else if (this.state === "paused") {
                this.state = "running";
            }
        }

        setStage(stageId) {
            this.init(stageId);
        }

        setAction(action, active) {
            if (Object.prototype.hasOwnProperty.call(this.actions, action)) {
                this.actions[action] = active;
            }
        }

        jump() {
            if (this.cat.onGround && this.state === "running") {
                this.cat.vy = CAT.jumpVelocity;
                this.cat.onGround = false;
                this.cat.animation = "jump";
                this.sleepTimer = 0;
                if (this.audio) {
                    this.audio.sfx("jump");
                }
                return true;
            }
            return false;
        }

        update(dt) {
            const step = clamp(dt, 0, 0.05);
            if (this.state === "running") {
                this.updateRunning(step);
            } else if (this.state === "recovering") {
                this.recoverTimer -= step;
                if (this.recoverTimer <= 0) {
                    this.resumeFromSurprise();
                }
            }
            if (this.audio && this.state === "running") {
                this.audio.tick(step);
            }
            this.cat.animationTime += step;
            this.unlockReachedStages();
        }

        updateRunning(dt) {
            if (this.actions.jump) {
                this.jump();
                this.actions.jump = false;
            }
            this.cat.crouching = this.actions.crouch && this.cat.onGround;
            const targetSpeed = this.cat.crouching ? CAT.crouchSpeed
                : this.actions.left ? CAT.leftSpeed
                    : this.actions.right ? CAT.rightSpeed
                        : CAT.baseSpeed;
            this.cat.vx += (targetSpeed - this.cat.vx) * clamp(dt * 9, 0, 1);
            this.cat.facing = this.cat.vx < -10 ? -1 : 1;
            this.cat.worldX = Math.max(0, this.cat.worldX + this.cat.vx * dt);
            this.cat.vy += CAT.gravity * dt;
            this.cat.y += this.cat.vy * dt;
            const footY = CANVAS.groundY - CAT.footOffset;
            if (this.cat.y >= footY) {
                this.cat.y = footY;
                this.cat.vy = 0;
                this.cat.onGround = true;
            }
            this.distance = Math.max(this.distance, Math.floor(this.cat.worldX / 10));
            this.bestRunDistance = Math.max(this.bestRunDistance, this.distance);
            if (this.distance % 300 < 4) {
                this.checkpointX = Math.max(this.checkpointX, this.cat.worldX - 120);
            }
            this.ensureEntitiesThrough(this.cat.worldX + 1600);
            this.updateEntities(dt);
            this.resolveCollisions();
            this.updateAnimation(dt);
        }

        updateAnimation(dt) {
            if (!this.cat.onGround) {
                this.cat.animation = this.cat.vy > 120 ? "land" : "jump";
                this.sleepTimer = 0;
                return;
            }
            if (this.cat.crouching) {
                this.cat.animation = "crouch";
                this.sleepTimer = 0;
                return;
            }
            if (Math.abs(this.cat.vx) > CAT.baseSpeed + 12 || this.actions.left || this.actions.right) {
                this.cat.animation = "walk";
                this.sleepTimer = 0;
                return;
            }
            this.sleepTimer += dt;
            this.cat.animation = this.sleepTimer > 8 ? "sleep" : "idle";
        }

        updateEntities(dt) {
            this.entities.forEach((entity) => {
                if (entity.kind === "obstacle" && OBSTACLE_TYPES[entity.type].speed) {
                    entity.x += OBSTACLE_TYPES[entity.type].speed * dt;
                }
                if (entity.kind === "obstacle" && OBSTACLE_TYPES[entity.type].chase) {
                    const gap = entity.x - this.cat.worldX;
                    if (gap > 0 && gap < 360) {
                        entity.x -= 70 * dt;
                    }
                }
            });
            this.entities = this.entities.filter((entity) => entity.x > this.cat.worldX - 700 && !entity.removed);
        }

        ensureEntitiesThrough(worldX) {
            while (this.spawnCursor < worldX) {
                const isItem = this.random() > 0.42;
                if (isItem) {
                    this.spawnItem(this.spawnCursor);
                } else {
                    this.spawnObstacle(this.spawnCursor);
                }
                this.spawnCursor += 170 + Math.floor(this.random() * 160);
            }
        }

        spawnItem(x) {
            const keys = this.stage.spawnTables.items || Object.keys(ITEM_TYPES);
            const type = chooseWeighted(keys, ITEM_TYPES, this.random);
            const spec = ITEM_TYPES[type];
            this.entities.push({
                id: `item-${this.entitySerial}`,
                kind: "item",
                type,
                x,
                y: CANVAS.groundY - 112 - Math.floor(this.random() * 150),
                width: spec.width,
                height: spec.height,
                collected: false,
            });
            this.entitySerial += 1;
        }

        spawnObstacle(x) {
            const keys = this.stage.spawnTables.obstacles || Object.keys(OBSTACLE_TYPES);
            const type = keys[Math.floor(this.random() * keys.length)];
            const spec = OBSTACLE_TYPES[type];
            this.entities.push({
                id: `obstacle-${this.entitySerial}`,
                kind: "obstacle",
                type,
                x,
                y: CANVAS.groundY - spec.height,
                width: spec.width,
                height: spec.height,
                hit: false,
            });
            this.entitySerial += 1;
        }

        catHitRect() {
            const height = this.cat.crouching ? 48 : CAT.hitHeight;
            return {
                x: this.cat.worldX - CAT.hitWidth / 2,
                y: this.cat.y - height,
                width: CAT.hitWidth,
                height,
            };
        }

        resolveCollisions() {
            const catRect = this.catHitRect();
            this.entities.forEach((entity) => {
                if (entity.removed || !rectsOverlap(catRect, entity)) {
                    return;
                }
                if (entity.kind === "item") {
                    this.collectItem(entity);
                } else if (!entity.hit) {
                    this.hitObstacle(entity);
                }
            });
        }

        collectItem(entity) {
            const spec = ITEM_TYPES[entity.type];
            entity.removed = true;
            this.combo += 1;
            const comboBonus = entity.type === "yarn" ? this.combo * 5 : 0;
            this.score += spec.score + comboBonus;
            if (spec.heal) {
                this.surprise = Math.max(0, this.surprise - spec.heal);
            }
            if (spec.randomEvent) {
                this.score += 20;
                this.surprise = Math.max(0, this.surprise - 10);
            }
            this.registerItem(spec.collection);
            if (this.audio) {
                this.audio.sfx(spec.rarity <= 8 ? "rare" : "item");
            }
        }

        hitObstacle(entity) {
            const spec = OBSTACLE_TYPES[entity.type];
            entity.hit = true;
            this.combo = 0;
            this.surprise = clamp(this.surprise + spec.surprise, 0, 100);
            this.registerEncounter(spec.collection);
            this.cat.animation = "surprised";
            if (spec.slow) {
                this.cat.vx *= spec.slow;
            }
            if (this.audio) {
                this.audio.sfx("surprise");
            }
            if (this.surprise >= 100) {
                this.startRecovery();
            }
        }

        startRecovery() {
            this.state = "recovering";
            this.runEscaped = true;
            this.recoverTimer = 1.15;
            this.message = "にゃっ。少し前からもう一度。";
            this.cat.animation = "surprised";
            if (this.saveStore) {
                this.saveStore.recordWalk({ distance: this.bestRunDistance, score: this.score, escaped: true });
            }
        }

        resumeFromSurprise() {
            this.cat.worldX = Math.max(0, this.checkpointX);
            this.cat.y = CANVAS.groundY - CAT.footOffset;
            this.cat.vy = 0;
            this.cat.onGround = true;
            this.surprise = 20;
            this.combo = 0;
            this.state = "running";
            this.entities = this.entities.filter((entity) => entity.x > this.cat.worldX + 80);
            this.ensureEntitiesThrough(this.cat.worldX + 1600);
        }

        finishWalk() {
            if (this.saveStore) {
                this.saveStore.recordWalk({ distance: this.bestRunDistance, score: this.score, escaped: this.runEscaped });
            }
        }

        registerItem(label) {
            if (this.saveStore) {
                this.save = this.saveStore.registerCollection("items", label);
            }
        }

        registerEncounter(label) {
            if (this.saveStore) {
                this.save = this.saveStore.registerCollection("encounters", label);
            }
        }

        registerPlace(label) {
            if (this.saveStore) {
                this.save = this.saveStore.registerCollection("places", label, 0);
            }
        }

        isStageUnlocked(stage) {
            const unlocked = this.save.unlockedStages || ["room"];
            if (unlocked.includes(stage.id)) {
                return true;
            }
            const distanceOk = this.save.records.bestDistance >= stage.unlocks.distance;
            const collection = stage.unlocks.collection;
            const collectionOk = !collection || Boolean(this.save.collection.items[collection]);
            return distanceOk && collectionOk;
        }

        unlockReachedStages() {
            if (!this.saveStore) {
                return;
            }
            this.stages.forEach((stage) => {
                if (this.isStageUnlocked(stage)) {
                    this.save = this.saveStore.unlockStage(stage.id);
                }
            });
        }

        missionProgress() {
            return this.missions.map((mission) => {
                if (mission.id === "distance") {
                    return { ...mission, value: Math.min(this.distance, mission.target) };
                }
                if (mission.id === "fish") {
                    const count = this.save.collection.items[mission.item] || 0;
                    return { ...mission, value: Math.min(count, mission.target) };
                }
                return { ...mission, value: this.surprise < mission.target ? mission.target : 0 };
            });
        }
    }

    globalThis.BlackCatGame = BlackCatGame;
    globalThis.BlackCatLogicTools = { seededRandom, clamp, rectsOverlap, chooseWeighted, makeMissionSet };
}());
