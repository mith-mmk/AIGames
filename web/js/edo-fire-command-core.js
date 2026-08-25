(function defineEdoFireCommandCore(globalScope) {
    "use strict";

    const data = globalScope.EdoFireCommandData;
    if (!data) throw new Error("EdoFireCommandData must be loaded first.");

    const SAVE_KEY = "ai-games.edo-fire-command.save";
    const SAVE_VERSION = 1;
    const ACTION_ORDER = Object.freeze(["rescue", "extinguish", "refill", "demolish"]);

    class SeededRandom {
        constructor(seed = 1) {
            this.state = (Number(seed) >>> 0) || 1;
        }

        next() {
            let value = this.state += 0x6D2B79F5;
            value = Math.imul(value ^ value >>> 15, value | 1);
            value ^= value + Math.imul(value ^ value >>> 7, value | 61);
            return ((value ^ value >>> 14) >>> 0) / 4294967296;
        }

        clone() {
            const copy = new SeededRandom(1);
            copy.state = this.state;
            return copy;
        }
    }

    function deepCopy(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function tileIndex(x, y) {
        return y * data.WIDTH + x;
    }

    function manhattan(first, second) {
        return Math.abs(first.x - second.x) + Math.abs(first.y - second.y);
    }

    class FireBoard {
        constructor(rows) {
            this.width = data.WIDTH;
            this.height = data.HEIGHT;
            this.tiles = [];
            rows.forEach((row, y) => {
                [...row].forEach((symbol, x) => {
                    const type = data.MAP_SYMBOLS[symbol];
                    if (!type) throw new Error(`Unknown map symbol ${symbol}`);
                    const definition = data.TILE_TYPES[type];
                    this.tiles.push({
                        x,
                        y,
                        type,
                        fuel: definition.fuel,
                        heat: 0,
                        wet: 0,
                        civilians: 0,
                        destroyed: false,
                        demolished: false,
                    });
                });
            });
        }

        inBounds(x, y) {
            return x >= 0 && y >= 0 && x < this.width && y < this.height;
        }

        get(x, y) {
            return this.inBounds(x, y) ? this.tiles[tileIndex(x, y)] : null;
        }

        neighbors4(x, y) {
            return [[1, 0], [-1, 0], [0, 1], [0, -1]]
                .map(([dx, dy]) => this.get(x + dx, y + dy))
                .filter(Boolean);
        }

        clone() {
            const copy = Object.create(FireBoard.prototype);
            copy.width = this.width;
            copy.height = this.height;
            copy.tiles = deepCopy(this.tiles);
            return copy;
        }

        pathDistance(start, target, blocked = new Set()) {
            if (!this.inBounds(target.x, target.y)) return Infinity;
            const targetTile = this.get(target.x, target.y);
            if (!targetTile || !data.TILE_TYPES[targetTile.type].passable || blocked.has(`${target.x},${target.y}`)) return Infinity;
            const queue = [{ x: start.x, y: start.y, distance: 0 }];
            const visited = new Set([`${start.x},${start.y}`]);
            while (queue.length) {
                const current = queue.shift();
                if (current.x === target.x && current.y === target.y) return current.distance;
                for (const tile of this.neighbors4(current.x, current.y)) {
                    const key = `${tile.x},${tile.y}`;
                    const passable = data.TILE_TYPES[tile.type].passable;
                    if (!passable || blocked.has(key) || visited.has(key)) continue;
                    visited.add(key);
                    queue.push({ x: tile.x, y: tile.y, distance: current.distance + (tile.type === "rubble" ? 2 : 1) });
                }
            }
            return Infinity;
        }
    }

    class ProgressStore {
        constructor(storage = null) {
            this.storage = storage;
        }

        defaults() {
            return { version: SAVE_VERSION, unlocked: 1, bestRanks: {}, settings: { reducedMotion: false } };
        }

        load() {
            if (!this.storage) return this.defaults();
            try {
                const parsed = JSON.parse(this.storage.getItem(SAVE_KEY));
                if (!parsed || parsed.version !== SAVE_VERSION) return this.defaults();
                return {
                    version: SAVE_VERSION,
                    unlocked: Math.max(1, Math.min(data.SCENARIOS.length, Number(parsed.unlocked) || 1)),
                    bestRanks: parsed.bestRanks && typeof parsed.bestRanks === "object" ? parsed.bestRanks : {},
                    settings: { reducedMotion: Boolean(parsed.settings && parsed.settings.reducedMotion) },
                };
            } catch {
                return this.defaults();
            }
        }

        save(progress) {
            if (!this.storage) return false;
            try {
                this.storage.setItem(SAVE_KEY, JSON.stringify(progress));
                return true;
            } catch {
                return false;
            }
        }

        record(progress, scenario, rank) {
            const rankValue = { bronze: 1, silver: 2, gold: 3 };
            const next = deepCopy(progress);
            const previous = next.bestRanks[scenario.id];
            if (!previous || rankValue[rank] > rankValue[previous]) next.bestRanks[scenario.id] = rank;
            next.unlocked = Math.max(next.unlocked, Math.min(data.SCENARIOS.length, scenario.number + 1));
            this.save(next);
            return next;
        }
    }

    class EdoFireCore {
        constructor(options = {}) {
            this.scenarios = options.scenarios || data.SCENARIOS;
            this.status = "ready";
            this.scenario = null;
            this.board = null;
            this.random = new SeededRandom(1);
            this.turn = 0;
            this.wind = "W";
            this.squads = [];
            this.orders = new Map();
            this.casualties = 0;
            this.rescued = 0;
            this.destroyedBuildings = 0;
            this.destroyedLandmarks = 0;
            this.demolitionsUsed = 0;
            this.lastMessage = "夜を選んでください。";
            this.result = null;
        }

        startScenario(identifier = 1) {
            const scenario = typeof identifier === "number"
                ? this.scenarios.find((item) => item.number === identifier)
                : this.scenarios.find((item) => item.id === identifier);
            if (!scenario) throw new Error("Unknown scenario.");
            this.scenario = scenario;
            this.board = new FireBoard(scenario.map);
            this.random = new SeededRandom(scenario.seed);
            this.turn = 0;
            this.wind = scenario.initialWind;
            this.squads = scenario.squads.map((squad) => ({ ...squad, water: data.SQUAD_TYPES[squad.type].waterMax }));
            this.orders = new Map();
            this.casualties = 0;
            this.rescued = 0;
            this.destroyedBuildings = 0;
            this.destroyedLandmarks = 0;
            this.demolitionsUsed = 0;
            this.result = null;
            this.status = "running";
            for (const fire of scenario.fires) {
                const tile = this.board.get(fire.x, fire.y);
                if (tile) tile.heat = 3;
            }
            for (const civilians of scenario.civilians) {
                const tile = this.board.get(civilians.x, civilians.y);
                if (tile) tile.civilians = civilians.count;
            }
            this.lastMessage = scenario.subtitle;
            return this.getSnapshot();
        }

        getSquad(id) {
            return this.squads.find((squad) => squad.id === id) || null;
        }

        getPlannedPosition(squad) {
            const order = this.orders.get(squad.id);
            return order && order.move ? order.move : { x: squad.x, y: squad.y };
        }

        getBlockedPositions(exceptId) {
            const blocked = new Set();
            for (const squad of this.squads) {
                if (squad.id === exceptId) continue;
                const position = this.getPlannedPosition(squad);
                blocked.add(`${position.x},${position.y}`);
            }
            return blocked;
        }

        getReachable(squadId) {
            const squad = this.getSquad(squadId);
            if (!squad || this.status !== "running") return [];
            const definition = data.SQUAD_TYPES[squad.type];
            const blocked = this.getBlockedPositions(squadId);
            return this.board.tiles
                .filter((tile) => data.TILE_TYPES[tile.type].passable)
                .filter((tile) => this.board.pathDistance(squad, tile, blocked) <= definition.move)
                .map((tile) => ({ x: tile.x, y: tile.y }));
        }

        queueMove(squadId, x, y) {
            const squad = this.getSquad(squadId);
            if (!squad || this.status !== "running") return { ok: false, reason: "not-running" };
            const distance = this.board.pathDistance(squad, { x, y }, this.getBlockedPositions(squadId));
            if (distance > data.SQUAD_TYPES[squad.type].move) return { ok: false, reason: "unreachable" };
            const order = this.orders.get(squadId) || {};
            order.move = { x, y };
            if (order.action && manhattan(order.move, order.action) > 1) delete order.action;
            this.orders.set(squadId, order);
            this.lastMessage = `${data.SQUAD_TYPES[squad.type].label}の移動先を定めた。`;
            return { ok: true };
        }

        validateAction(squad, action, target) {
            const position = this.getPlannedPosition(squad);
            const tile = this.board.get(target.x, target.y);
            if (!tile || manhattan(position, target) > 1) return { ok: false, reason: "out-of-range" };
            if (action === "extinguish") {
                if (squad.type !== "water" || squad.water <= 0) return { ok: false, reason: "no-water" };
                return tile.heat > 0 ? { ok: true } : { ok: false, reason: "no-fire" };
            }
            if (action === "refill") {
                if (squad.type !== "water") return { ok: false, reason: "wrong-squad" };
                return ["well", "canal"].includes(tile.type) ? { ok: true } : { ok: false, reason: "no-water-source" };
            }
            if (action === "rescue") {
                if (squad.type !== "ladder") return { ok: false, reason: "wrong-squad" };
                return tile.civilians > 0 ? { ok: true } : { ok: false, reason: "no-civilians" };
            }
            if (action === "demolish") {
                if (squad.type !== "tobi") return { ok: false, reason: "wrong-squad" };
                if (this.demolitionsUsed >= this.scenario.demolitionLimit) return { ok: false, reason: "no-authority" };
                if (tile.type === "landmark") return { ok: false, reason: "landmark" };
                if (tile.type !== "house" || tile.destroyed) return { ok: false, reason: "invalid-building" };
                const rescuePlanned = [...this.orders.values()].some((order) => order.action
                    && order.action.type === "rescue"
                    && order.action.x === target.x
                    && order.action.y === target.y);
                if (tile.civilians > 0 && !rescuePlanned) return { ok: false, reason: "occupied" };
                return { ok: true };
            }
            return { ok: false, reason: "unknown-action" };
        }

        queueAction(squadId, action, x, y) {
            const squad = this.getSquad(squadId);
            if (!squad || this.status !== "running") return { ok: false, reason: "not-running" };
            const validation = this.validateAction(squad, action, { x, y });
            if (!validation.ok) return validation;
            const order = this.orders.get(squadId) || {};
            order.action = { type: action, x, y };
            this.orders.set(squadId, order);
            this.lastMessage = `${data.SQUAD_TYPES[squad.type].label}に${this.actionLabel(action)}を命じた。`;
            return { ok: true };
        }

        clearOrder(squadId) {
            this.orders.delete(squadId);
        }

        actionLabel(action) {
            return { extinguish: "消火", refill: "補給", rescue: "救助", demolish: "破壊消防" }[action] || action;
        }

        applyEvents(turn) {
            const messages = [];
            for (const event of this.scenario.events.filter((item) => item.turn === turn)) {
                if (event.type === "wind") this.wind = event.wind;
                if (event.type === "ignite") {
                    const tile = this.board.get(event.x, event.y);
                    if (tile && !tile.destroyed) tile.heat = 3;
                }
                if (event.message) messages.push(event.message);
            }
            return messages;
        }

        resolveOrders() {
            for (const squad of this.squads) {
                const order = this.orders.get(squad.id);
                if (order && order.move) {
                    squad.x = order.move.x;
                    squad.y = order.move.y;
                }
            }
            for (const actionType of ACTION_ORDER) {
                for (const squad of this.squads) {
                    const order = this.orders.get(squad.id);
                    if (!order || !order.action || order.action.type !== actionType) continue;
                    const target = this.board.get(order.action.x, order.action.y);
                    if (actionType === "rescue" && target.civilians > 0) {
                        this.rescued += target.civilians;
                        target.civilians = 0;
                    } else if (actionType === "extinguish" && squad.water > 0) {
                        target.heat = Math.max(0, target.heat - 2);
                        target.wet = Math.min(2, target.wet + 1);
                        squad.water -= 1;
                    } else if (actionType === "refill") {
                        squad.water = data.SQUAD_TYPES[squad.type].waterMax;
                    } else if (actionType === "demolish" && target.type === "house" && target.civilians === 0) {
                        target.type = "rubble";
                        target.fuel = 0;
                        target.heat = 0;
                        target.destroyed = true;
                        target.demolished = true;
                        this.demolitionsUsed += 1;
                    }
                }
            }
            this.orders.clear();
        }

        firePressure(from, to, wind) {
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            if (dx === wind.dx && dy === wind.dy) return 2;
            if (dx * wind.dx + dy * wind.dy === 0) return 1;
            return 0;
        }

        destroyTile(tile) {
            if (tile.destroyed) return;
            if (tile.civilians > 0) {
                this.casualties += tile.civilians;
                tile.civilians = 0;
            }
            if (tile.type === "landmark") this.destroyedLandmarks += 1;
            else this.destroyedBuildings += 1;
            tile.type = "rubble";
            tile.fuel = 0;
            tile.heat = 0;
            tile.destroyed = true;
        }

        advanceFire() {
            const wind = data.WINDS[this.wind];
            const pressure = new Map();
            const burning = this.board.tiles.filter((tile) => tile.heat >= 2 && tile.fuel > 0 && !tile.destroyed);
            for (const source of burning) {
                source.fuel -= 1;
                for (const target of this.board.neighbors4(source.x, source.y)) {
                    if (target.fuel <= 0 || target.destroyed) continue;
                    const amount = this.firePressure(source, target, wind);
                    const key = `${target.x},${target.y}`;
                    pressure.set(key, Math.max(pressure.get(key) || 0, amount));
                }
                if (this.scenario.emberChance > 0 && this.random.next() < this.scenario.emberChance) {
                    const target = this.board.get(source.x + wind.dx * 2, source.y + wind.dy * 2);
                    if (target && target.fuel > 0 && !target.destroyed) {
                        const key = `${target.x},${target.y}`;
                        pressure.set(key, Math.max(pressure.get(key) || 0, 1));
                    }
                }
            }
            for (const tile of this.board.tiles) {
                if (tile.destroyed || tile.fuel <= 0) continue;
                if (tile.heat < 2) {
                    const incoming = Math.max(0, (pressure.get(`${tile.x},${tile.y}`) || 0) - tile.wet);
                    tile.heat = Math.min(3, Math.max(0, tile.heat - 1) + incoming);
                } else {
                    tile.heat = 3;
                }
                tile.wet = Math.max(0, tile.wet - 1);
            }
            for (const tile of burning) {
                if (tile.fuel <= 0) this.destroyTile(tile);
            }
        }

        hasPendingIgnition() {
            return this.scenario.events.some((event) => event.type === "ignite" && event.turn > this.turn);
        }

        activeFireCount() {
            return this.board.tiles.filter((tile) => tile.heat > 0 && !tile.destroyed).length;
        }

        remainingCivilians() {
            return this.board.tiles.reduce((sum, tile) => sum + tile.civilians, 0);
        }

        calculateScore() {
            return Math.max(0, 100 - this.casualties * 25 - this.destroyedBuildings * 6 - this.destroyedLandmarks * 15 - this.demolitionsUsed * 4);
        }

        calculateRank(score = this.calculateScore()) {
            if (score >= 85) return "gold";
            if (score >= 65) return "silver";
            return "bronze";
        }

        finish(status, reason) {
            this.status = status;
            const score = this.calculateScore();
            this.result = { status, reason, score, rank: status === "won" ? this.calculateRank(score) : null };
            this.lastMessage = reason;
        }

        evaluate() {
            if (this.casualties > this.scenario.casualtyLimit) {
                this.finish("lost", "犠牲者が許容数を超えた。退路を確保できなかった。");
                return;
            }
            if (this.destroyedLandmarks > 0) {
                this.finish("lost", "守るべき番屋・蔵が焼け落ちた。");
                return;
            }
            if (this.destroyedBuildings > this.scenario.destructionLimit) {
                this.finish("lost", "町の焼失が限界を超えた。");
                return;
            }
            if (this.activeFireCount() === 0 && !this.hasPendingIgnition() && this.remainingCivilians() === 0) {
                this.finish("won", "鎮火。夜明け前に町と人を守り切った。");
                return;
            }
            if (this.turn >= this.scenario.maxTurns) {
                this.finish("lost", "夜明けまでに鎮火できなかった。");
            }
        }

        endTurn() {
            if (this.status !== "running") return { ok: false, reason: "not-running" };
            this.resolveOrders();
            const eventMessages = this.applyEvents(this.turn + 1);
            this.advanceFire();
            this.turn += 1;
            this.evaluate();
            if (this.status === "running") {
                this.lastMessage = eventMessages.join(" ") || `第${this.turn}刻の指図を終えた。`;
            }
            return { ok: true, snapshot: this.getSnapshot() };
        }

        cloneForSimulation() {
            const copy = new EdoFireCore({ scenarios: this.scenarios });
            copy.status = this.status;
            copy.scenario = this.scenario;
            copy.board = this.board.clone();
            copy.random = this.random.clone();
            copy.turn = this.turn;
            copy.wind = this.wind;
            copy.squads = deepCopy(this.squads);
            copy.orders = new Map();
            copy.casualties = this.casualties;
            copy.rescued = this.rescued;
            copy.destroyedBuildings = this.destroyedBuildings;
            copy.destroyedLandmarks = this.destroyedLandmarks;
            copy.demolitionsUsed = this.demolitionsUsed;
            copy.lastMessage = this.lastMessage;
            copy.result = this.result ? deepCopy(this.result) : null;
            return copy;
        }

        getForecast(steps = 2) {
            if (!this.board) return [];
            const simulation = this.cloneForSimulation();
            const forecast = [];
            for (let step = 0; step < steps && simulation.status === "running"; step += 1) {
                simulation.endTurn();
                forecast.push({
                    turn: simulation.turn,
                    wind: simulation.wind,
                    danger: simulation.board.tiles
                        .filter((tile) => tile.heat > 0 || tile.destroyed)
                        .map((tile) => ({ x: tile.x, y: tile.y, heat: tile.heat, destroyed: tile.destroyed })),
                });
            }
            return forecast;
        }

        getSnapshot() {
            return {
                status: this.status,
                turn: this.turn,
                wind: this.wind,
                scenario: this.scenario,
                board: this.board ? this.board.tiles.map((tile) => ({ ...tile })) : [],
                squads: this.squads.map((squad) => ({ ...squad })),
                orders: Object.fromEntries([...this.orders.entries()].map(([id, order]) => [id, deepCopy(order)])),
                casualties: this.casualties,
                rescued: this.rescued,
                destroyedBuildings: this.destroyedBuildings,
                destroyedLandmarks: this.destroyedLandmarks,
                demolitionsUsed: this.demolitionsUsed,
                activeFires: this.board ? this.activeFireCount() : 0,
                civilians: this.board ? this.remainingCivilians() : 0,
                score: this.board ? this.calculateScore() : 100,
                lastMessage: this.lastMessage,
                result: this.result ? { ...this.result } : null,
            };
        }
    }

    globalScope.EdoFireCommand = Object.freeze({
        SAVE_KEY,
        SAVE_VERSION,
        WIDTH: data.WIDTH,
        HEIGHT: data.HEIGHT,
        TILE_TYPES: data.TILE_TYPES,
        SQUAD_TYPES: data.SQUAD_TYPES,
        WINDS: data.WINDS,
        SCENARIOS: data.SCENARIOS,
        SeededRandom,
        FireBoard,
        ProgressStore,
        EdoFireCore,
    });
})(globalThis);
