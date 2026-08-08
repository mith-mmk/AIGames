(function initializeChronicleKingdoms(globalScope) {
    "use strict";

    const SAVE_KEY = "ai-games.civilization.save";
    const SAVE_VERSION = 2;
    const MAP_WIDTH = 32;
    const MAP_HEIGHT = 24;
    const MAX_TURNS = 120;
    const TERRAIN = Object.freeze({
        plains: Object.freeze({ label: "平地", symbol: "·", color: "#b8c982", food: 2, production: 1, trade: 1, move: 1 }),
        forest: Object.freeze({ label: "森林", symbol: "♣", color: "#4d8054", food: 1, production: 2, trade: 1, move: 2 }),
        hills: Object.freeze({ label: "丘陵", symbol: "⌃", color: "#9b8b62", food: 1, production: 3, trade: 0, move: 2 }),
        mountain: Object.freeze({ label: "山岳", symbol: "▲", color: "#67717a", food: 0, production: 0, trade: 0, move: 99 }),
        desert: Object.freeze({ label: "砂漠", symbol: "░", color: "#d3a75b", food: 1, production: 1, trade: 1, move: 1 }),
        water: Object.freeze({ label: "水域", symbol: "≈", color: "#376b91", food: 1, production: 0, trade: 2, move: 99 }),
    });

    const UNIT_DEFS = Object.freeze({
        settler: Object.freeze({ label: "開拓者", symbol: "S", attack: 0, defense: 1, movement: 2, cost: 40, role: "settler" }),
        warrior: Object.freeze({ label: "戦士", symbol: "W", attack: 2, defense: 2, movement: 1, cost: 20, role: "melee" }),
        scout: Object.freeze({ label: "偵察兵", symbol: "R", attack: 1, defense: 1, movement: 3, cost: 15, role: "scout" }),
        archer: Object.freeze({ label: "弓兵", symbol: "A", attack: 3, defense: 2, movement: 1, cost: 25, role: "ranged" }),
        horseman: Object.freeze({ label: "騎兵", symbol: "H", attack: 4, defense: 2, movement: 2, cost: 35, role: "mounted" }),
        worker: Object.freeze({ label: "労働者", symbol: "L", attack: 0, defense: 1, movement: 2, cost: 25, role: "worker" }),
        swordsman: Object.freeze({ label: "剣士", symbol: "K", attack: 5, defense: 4, movement: 1, cost: 45, role: "melee" }),
        catapult: Object.freeze({ label: "砲兵", symbol: "C", attack: 6, defense: 1, movement: 1, cost: 55, role: "siege" }),
        knight: Object.freeze({ label: "騎士", symbol: "N", attack: 7, defense: 4, movement: 2, cost: 65, role: "mounted" }),
        tank: Object.freeze({ label: "戦車", symbol: "T", attack: 9, defense: 6, movement: 3, cost: 85, role: "armour" }),
        artillery: Object.freeze({ label: "重砲", symbol: "G", attack: 11, defense: 3, movement: 1, cost: 95, role: "siege" }),
        diplomat: Object.freeze({ label: "外交官", symbol: "D", attack: 0, defense: 1, movement: 2, cost: 30, role: "diplomat" }),
    });

    const BUILDING_DEFS = Object.freeze({
        granary: Object.freeze({ label: "穀倉", cost: 30, food: 1, production: 0, trade: 0, research: 0, culture: 0, defense: 0 }),
        library: Object.freeze({ label: "図書館", cost: 40, food: 0, production: 0, trade: 0, research: 3, culture: 0, defense: 0 }),
        market: Object.freeze({ label: "市場", cost: 45, food: 0, production: 0, trade: 3, research: 0, culture: 0, defense: 0 }),
        barracks: Object.freeze({ label: "兵舎", cost: 40, food: 0, production: 0, trade: 0, research: 0, culture: 0, defense: 2 }),
        temple: Object.freeze({ label: "神殿", cost: 45, food: 0, production: 0, trade: 0, research: 0, culture: 3, defense: 0 }),
        factory: Object.freeze({ label: "工場", cost: 70, food: 0, production: 3, trade: 0, research: 0, culture: 0, defense: 0 }),
        harbor: Object.freeze({ label: "港", cost: 55, food: 0, production: 0, trade: 3, research: 0, culture: 0, defense: 0 }),
        university: Object.freeze({ label: "大学", cost: 80, food: 0, production: 0, trade: 0, research: 5, culture: 0, defense: 0 }),
        museum: Object.freeze({ label: "博物館", cost: 75, food: 0, production: 0, trade: 0, research: 0, culture: 6, defense: 0 }),
        walls: Object.freeze({ label: "城壁", cost: 60, food: 0, production: 0, trade: 0, research: 0, culture: 0, defense: 4 }),
    });

    const IMPROVEMENT_DEFS = Object.freeze({
        road: Object.freeze({ label: "道路", food: 0, production: 0, trade: 0, movement: -1, requiresTech: "engineering", terrains: ["plains", "forest", "hills", "desert"] }),
        farm: Object.freeze({ label: "農場", food: 2, production: 0, trade: 0, movement: 0, requiresTech: "pottery", terrains: ["plains", "desert"] }),
        mine: Object.freeze({ label: "鉱山", food: 0, production: 2, trade: 0, movement: 0, requiresTech: "mining", terrains: ["hills", "forest", "desert"] }),
    });

    const UNIT_TECH_REQUIREMENTS = Object.freeze({
        horseman: "horseback",
        knight: "horseback",
        swordsman: "bronze_working",
        catapult: "gunpowder",
        tank: "rocketry",
        artillery: "rocketry",
        diplomat: "writing",
    });

    const BUILDING_TECH_REQUIREMENTS = Object.freeze({
        granary: "pottery",
        library: "writing",
        market: "currency",
        barracks: "bronze_working",
        temple: "code_of_laws",
        factory: "industrialization",
        harbor: "sailing",
        university: "education",
        museum: "electricity",
        walls: "masonry",
    });

    const TECHS = Object.freeze([
        { id: "pottery", label: "陶器", era: "古代", cost: 20, prereq: [], effect: "都市成長 +1" },
        { id: "mining", label: "採鉱", era: "古代", cost: 25, prereq: [], effect: "鉱山を建設可能" },
        { id: "sailing", label: "帆走", era: "古代", cost: 25, prereq: [], effect: "交易 +1" },
        { id: "writing", label: "文字", era: "古代", cost: 30, prereq: ["pottery"], effect: "研究 +2" },
        { id: "bronze_working", label: "青銅器", era: "古代", cost: 35, prereq: ["mining"], effect: "戦士を強化" },
        { id: "masonry", label: "石工", era: "古代", cost: 35, prereq: ["mining"], effect: "都市防御 +2" },
        { id: "code_of_laws", label: "法典", era: "中世", cost: 45, prereq: ["writing"], effect: "文化 +2" },
        { id: "horseback", label: "騎馬", era: "中世", cost: 50, prereq: ["bronze_working"], effect: "騎兵を解禁" },
        { id: "engineering", label: "工学", era: "中世", cost: 55, prereq: ["masonry"], effect: "道路を強化" },
        { id: "currency", label: "通貨", era: "中世", cost: 50, prereq: ["sailing"], effect: "交易 +2" },
        { id: "feudalism", label: "封建制度", era: "中世", cost: 60, prereq: ["code_of_laws"], effect: "都市成長 +1" },
        { id: "education", label: "教育", era: "中世", cost: 65, prereq: ["writing", "code_of_laws"], effect: "研究 +3" },
        { id: "gunpowder", label: "火薬", era: "産業", cost: 80, prereq: ["engineering"], effect: "砲兵を解禁" },
        { id: "steam_power", label: "蒸気機関", era: "産業", cost: 90, prereq: ["engineering", "currency"], effect: "生産 +2" },
        { id: "industrialization", label: "工業化", era: "産業", cost: 100, prereq: ["steam_power"], effect: "工場を建設可能" },
        { id: "medicine", label: "医学", era: "産業", cost: 80, prereq: ["education"], effect: "人口減少を軽減" },
        { id: "nationalism", label: "国民国家", era: "産業", cost: 95, prereq: ["feudalism"], effect: "戦闘力 +1" },
        { id: "electricity", label: "電気", era: "産業", cost: 110, prereq: ["industrialization"], effect: "文化 +4" },
        { id: "flight", label: "航空", era: "現代", cost: 125, prereq: ["electricity"], effect: "偵察範囲 +1" },
        { id: "computers", label: "コンピュータ", era: "現代", cost: 140, prereq: ["education", "electricity"], effect: "研究 +5" },
        { id: "rocketry", label: "ロケット工学", era: "現代", cost: 150, prereq: ["flight"], effect: "戦車・重砲を強化" },
        { id: "globalization", label: "グローバル化", era: "現代", cost: 135, prereq: ["currency", "computers"], effect: "交易 +5" },
        { id: "artificial_intelligence", label: "人工知能", era: "現代", cost: 175, prereq: ["computers", "rocketry"], effect: "研究 +8" },
        { id: "orbital_charter", label: "軌道憲章", era: "現代", cost: 220, prereq: ["rocketry", "artificial_intelligence"], effect: "科学勝利計画を開始" },
    ]);

    const PERSONALITIES = Object.freeze({
        aurora: Object.freeze({ label: "オーロラ連邦", color: "#d95d7a", weights: { military: 0.8, expansion: 1.2, science: 1.3, culture: 1.1, trade: 1 } }),
        verdant: Object.freeze({ label: "緑野同盟", color: "#58a66c", weights: { military: 0.7, expansion: 1.4, science: 0.8, culture: 1.3, trade: 1 } }),
        ironhold: Object.freeze({ label: "鉄壁王国", color: "#bd8b47", weights: { military: 1.5, expansion: 0.8, science: 0.8, culture: 0.7, trade: 0.9 } }),
    });

    const POLICY_OPTIONS = Object.freeze([
        { id: "military", label: "軍事国家", description: "戦闘力 +2、生産 +1、外交関係 -2", effects: { combat: 2, production: 1, diplomacy: -2 } },
        { id: "expansion", label: "開拓者の民", description: "開拓者の生産 -10、都市建設時の文化 +20", effects: { settlerCost: -10, foundingCulture: 20 } },
        { id: "science", label: "学術国家", description: "研究 +3、軍事ユニットの生産 +5", effects: { research: 3, unitCost: 5 } },
        { id: "culture", label: "文化国家", description: "文化 +4、都市防御 -1", effects: { culture: 4, defense: -1 } },
        { id: "trade", label: "商業国家", description: "交易 +4、国庫 +5、都市防御 -1", effects: { trade: 4, gold: 5, defense: -1 } },
    ]);

    const TERRAIN_SPRITE_INDEX = Object.freeze({ plains: 0, forest: 1, hills: 2, mountain: 3, desert: 4, water: 5 });
    const UNIT_SPRITE_INDEX = Object.freeze({ settler: 6, warrior: 7, scout: 8, archer: 9, horseman: 10, worker: 11, swordsman: 12, catapult: 13, knight: 14, tank: 15, artillery: 16, diplomat: 17 });

    function clampRelation(value) {
        return Math.max(-100, Math.min(100, Math.trunc(Number(value) || 0)));
    }

    class SeededRandom {
        constructor(seed) {
            this.state = (Number(seed) >>> 0) || 1;
        }

        next() {
            let value = this.state += 0x6D2B79F5;
            value = Math.imul(value ^ value >>> 15, value | 1);
            value ^= value + Math.imul(value ^ value >>> 7, value | 61);
            return ((value ^ value >>> 14) >>> 0) / 4294967296;
        }

        nextInt(max) {
            return Math.floor(this.next() * max);
        }
    }

    class WorldMap {
        constructor(width = MAP_WIDTH, height = MAP_HEIGHT, seed = 1) {
            this.width = width;
            this.height = height;
            this.seed = Number(seed) >>> 0 || 1;
            this.random = new SeededRandom(this.seed);
            this.tiles = [];
            this.generate();
        }

        index(x, y) {
            return y * this.width + x;
        }

        inBounds(x, y) {
            return x >= 0 && y >= 0 && x < this.width && y < this.height;
        }

        getTile(x, y) {
            return this.inBounds(x, y) ? this.tiles[this.index(x, y)] : null;
        }

        generate() {
            this.tiles = [];
            for (let y = 0; y < this.height; y += 1) {
                for (let x = 0; x < this.width; x += 1) {
                    const edge = x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1;
                    const elevation = this.random.next();
                    const moisture = this.random.next();
                    let terrain = "plains";
                    if (edge || elevation < 0.13) {
                        terrain = "water";
                    } else if (elevation > 0.88) {
                        terrain = "mountain";
                    } else if (elevation > 0.71) {
                        terrain = "hills";
                    } else if (moisture < 0.2) {
                        terrain = "desert";
                    } else if (moisture > 0.72) {
                        terrain = "forest";
                    }
                    this.tiles.push({ terrain, discoveredBy: [], improvement: null, cityId: null, unitIds: [] });
                }
            }
            this.ensurePlayableCore();
        }

        ensurePlayableCore() {
            const centerX = Math.floor(this.width / 2);
            const centerY = Math.floor(this.height / 2);
            for (let y = centerY - 3; y <= centerY + 3; y += 1) {
                for (let x = centerX - 3; x <= centerX + 3; x += 1) {
                    const tile = this.getTile(x, y);
                    if (tile && tile.terrain === "water") {
                        tile.terrain = "plains";
                    }
                }
            }
        }

        neighbors(x, y) {
            const result = [];
            for (let dy = -1; dy <= 1; dy += 1) {
                for (let dx = -1; dx <= 1; dx += 1) {
                    if ((dx || dy) && this.inBounds(x + dx, y + dy)) {
                        result.push({ x: x + dx, y: y + dy, tile: this.getTile(x + dx, y + dy) });
                    }
                }
            }
            return result;
        }

        canFoundCity(x, y, cities = []) {
            const tile = this.getTile(x, y);
            if (!tile || ["water", "mountain"].includes(tile.terrain) || tile.cityId !== null) {
                return false;
            }
            return !cities.some((city) => Math.abs(city.x - x) <= 2 && Math.abs(city.y - y) <= 2);
        }

        revealAround(x, y, radius = 2, civId = "player") {
            for (let dy = -radius; dy <= radius; dy += 1) {
                for (let dx = -radius; dx <= radius; dx += 1) {
                    const tile = this.getTile(x + dx, y + dy);
                    if (tile && Math.abs(dx) + Math.abs(dy) <= radius + 1) {
                        tile.discoveredBy = Array.isArray(tile.discoveredBy) ? tile.discoveredBy : [];
                        if (!tile.discoveredBy.includes(civId)) tile.discoveredBy.push(civId);
                    }
                }
            }
        }

        isDiscovered(x, y, civId = "player") {
            const tile = this.getTile(x, y);
            return Boolean(tile && Array.isArray(tile.discoveredBy) && tile.discoveredBy.includes(civId));
        }

        findStartPosition(targetX, targetY) {
            for (let radius = 0; radius < Math.max(this.width, this.height); radius += 1) {
                for (let y = targetY - radius; y <= targetY + radius; y += 1) {
                    for (let x = targetX - radius; x <= targetX + radius; x += 1) {
                        const tile = this.getTile(x, y);
                        if (tile && ["plains", "forest", "hills"].includes(tile.terrain)) {
                            return { x, y };
                        }
                    }
                }
            }
            return { x: 1, y: 1 };
        }

        serialize() {
            return { width: this.width, height: this.height, seed: this.seed, tiles: this.tiles };
        }

        static fromSnapshot(snapshot) {
            const map = new WorldMap(snapshot.width, snapshot.height, snapshot.seed);
            if (Array.isArray(snapshot.tiles) && snapshot.tiles.length === map.width * map.height) {
                map.tiles = snapshot.tiles.map((tile) => ({
                    terrain: tile.terrain,
                    discoveredBy: Array.isArray(tile.discoveredBy) ? [...new Set(tile.discoveredBy)] : [],
                    improvement: tile.improvement || null,
                    cityId: tile.cityId || null,
                    unitIds: Array.isArray(tile.unitIds) ? [...new Set(tile.unitIds)] : [],
                }));
            }
            return map;
        }
    }

    class TechnologyTree {
        static getAll() {
            return TECHS.map((tech) => ({ ...tech, prereq: [...tech.prereq] }));
        }

        static get(id) {
            return TECHS.find((tech) => tech.id === id) || null;
        }

        static isAvailable(civ, techId) {
            const tech = TechnologyTree.get(techId);
            return Boolean(tech && !civ.techs.includes(techId) && tech.prereq.every((id) => civ.techs.includes(id)));
        }

        static getEra(civ) {
            const completed = civ.techs.map((id) => TechnologyTree.get(id)).filter(Boolean);
            if (completed.some((tech) => tech.era === "現代")) return "現代";
            if (completed.some((tech) => tech.era === "産業")) return "産業";
            if (completed.some((tech) => tech.era === "中世")) return "中世";
            return "古代";
        }
    }

    class CombatResolver {
        static resolve(attacker, defender, terrain, random, bonuses = {}) {
            if (!attacker || !defender || attacker.attack <= 0) return { attackerWins: false, invalid: true, attackPower: 0, defensePower: Math.max(0, defender?.defense || 0), attackRoll: 0, defenseRoll: 0 };
            const terrainDefense = terrain === "hills" ? 2 : terrain === "forest" ? 1 : 0;
            const attackPower = Math.max(1, attacker.attack + (bonuses.attack || 0) + attacker.veteran * 0.5);
            const defensePower = Math.max(1, defender.defense + terrainDefense + (bonuses.defense || 0) + defender.veteran * 0.5);
            const attackRoll = attackPower * (0.75 + random.next() * 0.5);
            const defenseRoll = defensePower * (0.75 + random.next() * 0.5);
            return {
                attackerWins: attackRoll >= defenseRoll,
                attackPower,
                defensePower,
                attackRoll,
                defenseRoll,
            };
        }
    }

    class CityManager {
        constructor(core) {
            this.core = core;
        }

        found(civId, x, y, cityContext = this.core.cities) {
            const core = this.core;
            if (!['ready', 'running'].includes(core.campaign.status)) return null;
            const civ = core.getCiv(civId);
            if (!civ || !core.map.canFoundCity(x, y, cityContext)) return null;
            const policy = POLICY_OPTIONS.find((item) => item.id === civ.policy);
            const id = `city-${core.nextCityId++}`;
            const city = { id, ownerId: civId, name: `${core.getCiv(civId).name} ${core.cities.length + 1}`, x, y, population: 1, food: 0, production: 0, productionId: "warrior", buildings: [], workedTiles: [{ x, y }], culture: 10 + (policy?.effects.foundingCulture || 0), isCapital: core.cities.filter((item) => item.ownerId === civId).length === 0, defense: 2 };
            core.cities.push(city);
            core.map.getTile(x, y).cityId = id;
            core.map.revealAround(x, y, 3, civId);
            civ.culture += 10;
            core.addLog(`${city.name}を建設しました。`);
            return city;
        }

        getWorkedTiles(city) {
            const core = this.core;
            const candidates = [{ x: city.x, y: city.y, tile: core.map.getTile(city.x, city.y) }, ...core.map.neighbors(city.x, city.y).map((candidate) => ({ x: candidate.x, y: candidate.y, tile: candidate.tile }))]
                .filter((candidate) => candidate.tile && TERRAIN[candidate.tile.terrain].move < 99)
                .sort((first, second) => {
                    const firstImprovement = IMPROVEMENT_DEFS[first.tile.improvement] || {};
                    const secondImprovement = IMPROVEMENT_DEFS[second.tile.improvement] || {};
                    const firstYield = TERRAIN[first.tile.terrain].food + TERRAIN[first.tile.terrain].production + TERRAIN[first.tile.terrain].trade + (firstImprovement.food || 0) + (firstImprovement.production || 0) + (firstImprovement.trade || 0);
                    const secondYield = TERRAIN[second.tile.terrain].food + TERRAIN[second.tile.terrain].production + TERRAIN[second.tile.terrain].trade + (secondImprovement.food || 0) + (secondImprovement.production || 0) + (secondImprovement.trade || 0);
                    return secondYield - firstYield || first.y - second.y || first.x - second.x;
                });
            return candidates.slice(0, Math.min(city.population, 6));
        }

        calculateYields(city, workedCandidates = this.getWorkedTiles(city)) {
            const core = this.core;
            const civ = core.getCiv(city.ownerId);
            const workedTiles = workedCandidates.map((candidate) => candidate.tile || candidate);
            const policy = POLICY_OPTIONS.find((item) => item.id === civ?.policy);
            const buildingYield = city.buildings.reduce((total, id) => {
                const building = BUILDING_DEFS[id];
                if (!building) return total;
                total.food += building.food;
                total.production += building.production;
                total.trade += building.trade;
                total.research += building.research;
                total.culture += building.culture;
                total.defense += building.defense;
                return total;
            }, { food: 0, production: 0, trade: 0, research: 0, culture: 0, defense: 0 });
            const improvementYield = workedTiles.reduce((total, tile) => {
                const improvement = IMPROVEMENT_DEFS[tile.improvement];
                if (!improvement) return total;
                total.food += improvement.food;
                total.production += improvement.production;
                total.trade += improvement.trade;
                return total;
            }, { food: 0, production: 0, trade: 0 });
            return {
                food: workedTiles.reduce((total, tile) => total + TERRAIN[tile.terrain].food, 0) + improvementYield.food + buildingYield.food + (civ?.techs.includes("pottery") ? 1 : 0),
                production: workedTiles.reduce((total, tile) => total + TERRAIN[tile.terrain].production, 0) + improvementYield.production + buildingYield.production + (civ?.techs.includes("steam_power") ? 2 : 0) + (policy?.id === "military" ? 1 : 0),
                trade: workedTiles.reduce((total, tile) => total + TERRAIN[tile.terrain].trade, 0) + improvementYield.trade + buildingYield.trade + (civ?.techs.includes("currency") ? 2 : 0) + (civ?.techs.includes("globalization") ? 5 : 0),
                research: buildingYield.research,
                culture: buildingYield.culture,
                defense: buildingYield.defense,
            };
        }

        getProductionRate(city) {
            return Math.max(1, this.calculateYields(city).production);
        }

        processTurn(city) {
            const core = this.core;
            const civ = core.getCiv(city.ownerId);
            if (core.campaign.status !== "running" || civ?.eliminated) return;
            if (!core.isProductionAvailable(civ, city.productionId) || (BUILDING_DEFS[city.productionId] && city.buildings.includes(city.productionId))) city.productionId = "warrior";
            const workedTiles = this.assignWorkedTiles(city);
            const policy = POLICY_OPTIONS.find((item) => item.id === civ.policy);
            const yields = this.calculateYields(city, workedTiles);
            const foodYield = yields.food;
            const productionYield = yields.production;
            const tradeYield = yields.trade;
            city.food += foodYield;
            city.production += Math.max(1, productionYield);
            civ.gold += Math.max(1, tradeYield) + (policy && policy.effects.gold ? policy.effects.gold : 0);
            civ.researchPoints += Math.max(1, tradeYield) + yields.research + 1 + (civ.techs.includes("writing") ? 2 : 0) + (civ.techs.includes("education") ? 3 : 0) + (civ.techs.includes("computers") ? 5 : 0) + (policy && policy.effects.research ? policy.effects.research : 0);
            city.culture += 2 + yields.culture + (civ.techs.includes("code_of_laws") ? 2 : 0) + (civ.techs.includes("electricity") ? 4 : 0) + (policy && policy.effects.culture ? policy.effects.culture : 0);
            city.defense = core.getCityDefense(city);
            civ.culture += city.culture >= 80 ? 2 : 1;
            const foodNeeded = city.population * 8;
            if (city.food >= foodNeeded) {
                city.food -= foodNeeded;
                city.population += 1;
                core.addLog(`${city.name}の人口が${city.population}になりました。`);
            }
            if (city.productionId && city.production >= core.getProductionCost(city.productionId, civ)) {
                city.production -= core.getProductionCost(city.productionId, civ);
                if (BUILDING_DEFS[city.productionId]) {
                    city.buildings.push(city.productionId);
                    core.addLog(`${city.name}で${BUILDING_DEFS[city.productionId].label}が完成しました。`);
                } else {
                    core.spawnUnit(city.ownerId, city.productionId, city.x, city.y);
                    core.addLog(`${city.name}で${UNIT_DEFS[city.productionId]?.label || "部隊"}が完成しました。`);
                }
                city.productionId = "warrior";
            }
        }

        assignWorkedTiles(city) {
            const workedCandidates = this.getWorkedTiles(city);
            city.workedTiles = workedCandidates.map((candidate) => ({ x: candidate.x, y: candidate.y }));
            return workedCandidates.map((candidate) => candidate.tile);
        }
    }

    class UnitManager {
        constructor(core) {
            this.core = core;
        }

        resetMovementForCivilization(civId) {
            if (!['ready', 'running'].includes(this.core.campaign.status)) return false;
            this.core.units.filter((unit) => unit.ownerId === civId).forEach((unit) => {
                unit.movementLeft = UNIT_DEFS[unit.type].movement;
            });
            return true;
        }

        move(unitId, x, y) {
            return this.core.moveUnit(unitId, x, y);
        }

        buildImprovement(unitId, improvement, isAi = false) {
            const core = this.core;
            const unit = core.units.find((item) => item.id === unitId);
            const definition = IMPROVEMENT_DEFS[improvement];
            if (core.campaign.status !== "running" || !unit || (!isAi && unit.ownerId !== "player") || UNIT_DEFS[unit.type].role !== "worker" || unit.movementLeft <= 0 || !definition) return false;
            const tile = core.map.getTile(unit.x, unit.y);
            const civ = core.getCiv(unit.ownerId);
            if (!tile || !civ || tile.improvement || !definition.terrains.includes(tile.terrain) || !civ.techs.includes(definition.requiresTech)) return false;
            tile.improvement = improvement;
            unit.movementLeft = 0;
            core.addLog(`${TERRAIN[tile.terrain].label}に${definition.label}を建設しました。`);
            core.save();
            return true;
        }
    }

    class CivilizationAI {
        static chooseProduction(core, civ, city = null) {
            const personality = PERSONALITIES[civ.id] || PERSONALITIES.aurora;
            const enemyNearby = core.units.some((unit) => unit.ownerId === "player" && core.map.isDiscovered(unit.x, unit.y, civ.id) && core.cities.some((city) => city.ownerId === civ.id && Math.abs(city.x - unit.x) + Math.abs(city.y - unit.y) < 5));
            const candidates = [...Object.keys(UNIT_DEFS), ...Object.keys(BUILDING_DEFS)].filter((id) => core.isProductionAvailable(civ, id) && !(BUILDING_DEFS[id] && city?.buildings.includes(id)));
            return candidates.sort((a, b) => {
                const score = (id) => {
                    const def = UNIT_DEFS[id] || BUILDING_DEFS[id];
                    let value = 0;
                    if (UNIT_DEFS[id]) {
                        if (def.role === "settler") value += personality.weights.expansion * 12;
                        if (["melee", "ranged", "mounted", "armour", "siege"].includes(def.role)) value += personality.weights.military * (enemyNearby ? 14 : 4);
                        if (def.role === "scout") value += personality.weights.expansion * 4;
                        if (def.role === "worker") value += personality.weights.expansion * 3;
                    } else {
                        if (id === "library" || id === "university") value += personality.weights.science * 10;
                        if (id === "market" || id === "harbor") value += personality.weights.trade * 8;
                        if (id === "temple" || id === "museum") value += personality.weights.culture * 8;
                        if (id === "walls" || id === "barracks") value += personality.weights.military * 6;
                    }
                    return value - def.cost / 20;
                };
                return score(b) - score(a) || a.localeCompare(b);
            })[0] || "warrior";
        }

        static chooseResearch(civ) {
            return TECHS.filter((tech) => TechnologyTree.isAvailable(civ, tech.id)).sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id))[0]?.id || null;
        }

        static militaryStrength(core, civ) {
            const unitStrength = core.units.filter((unit) => unit.ownerId === civ.id).reduce((total, unit) => total + UNIT_DEFS[unit.type].attack + UNIT_DEFS[unit.type].defense, 0);
            const cityStrength = core.cities.filter((city) => city.ownerId === civ.id).reduce((total, city) => total + core.getCityDefense(city), 0);
            return unitStrength + cityStrength;
        }

        static runDiplomacy(core, civ) {
            if (core.campaign.turn % 5 !== 0) return;
            const personality = PERSONALITIES[civ.id] || PERSONALITIES.aurora;
            const ownStrength = CivilizationAI.militaryStrength(core, civ);
            core.civilizations.filter((target) => target.id !== civ.id && !target.eliminated).forEach((target) => {
                const relation = core.getRelationValue(civ.id, target.id);
                const strengthDifference = ownStrength - CivilizationAI.militaryStrength(core, target);
                const candidates = [
                    { id: "noop", score: 0 },
                    { id: "war", score: relation > -30 ? personality.weights.military * Math.max(0, strengthDifference / 5) : -Infinity },
                    { id: "peace", score: relation <= -30 ? 18 + Math.max(0, -strengthDifference / 10) : -Infinity },
                    { id: "trade", score: relation > -30 && civ.gold >= 10 ? personality.weights.trade * 8 + Math.max(0, relation / 10) : -Infinity },
                ].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
                const action = candidates[0];
                if (!action || action.id === "noop" || action.score < 10) return;
                if (action.id === "war") {
                    core.setRelation(civ.id, target.id, -100);
                    core.addLog(`${civ.name}が${target.name}へ宣戦しました。`);
                } else if (action.id === "peace") {
                    core.setRelation(civ.id, target.id, Math.max(0, relation + 20));
                    core.addLog(`${civ.name}と${target.name}が和平しました。`);
                } else if (action.id === "trade") {
                    civ.gold -= 10;
                    target.gold += 10;
                    core.setRelation(civ.id, target.id, relation + 8);
                    core.addLog(`${civ.name}と${target.name}が交易しました。`);
                }
            });
        }

        static runTurn(core, civ) {
            if (core.campaign.status !== "running" || civ.eliminated) return;
            const personality = PERSONALITIES[civ.id] || PERSONALITIES.aurora;
            core.unitManager.resetMovementForCivilization(civ.id);
            if (!civ.researchTarget) civ.researchTarget = CivilizationAI.chooseResearch(civ);
            core.cities.filter((city) => city.ownerId === civ.id).forEach((city) => {
                if (!city.productionId || city.productionId === "warrior" || (BUILDING_DEFS[city.productionId] && city.buildings.includes(city.productionId))) city.productionId = CivilizationAI.chooseProduction(core, civ, city);
            });
            const units = core.units.filter((unit) => unit.ownerId === civ.id);
            units.forEach((unit) => {
                if (!core.units.includes(unit) || unit.movementLeft <= 0) return;
                const knownCities = core.cities.filter((city) => city.ownerId === civ.id || core.map.isDiscovered(city.x, city.y, civ.id));
                if (UNIT_DEFS[unit.type].role === "settler" && core.map.canFoundCity(unit.x, unit.y, knownCities)) {
                    const city = core.cityManager.found(civ.id, unit.x, unit.y, knownCities);
                    if (city) core.removeUnit(unit);
                    return;
                }
                if (UNIT_DEFS[unit.type].role === "worker" && !core.map.getTile(unit.x, unit.y).improvement) {
                    const improvement = Object.keys(IMPROVEMENT_DEFS).sort((a, b) => {
                        const aDefinition = IMPROVEMENT_DEFS[a];
                        const bDefinition = IMPROVEMENT_DEFS[b];
                        return ((bDefinition.food || 0) + (bDefinition.production || 0) + (bDefinition.trade || 0)) - ((aDefinition.food || 0) + (aDefinition.production || 0) + (aDefinition.trade || 0)) || a.localeCompare(b);
                    }).find((id) => {
                        const definition = IMPROVEMENT_DEFS[id];
                        return definition.terrains.includes(core.map.getTile(unit.x, unit.y).terrain) && civ.techs.includes(definition.requiresTech);
                    });
                    if (improvement) {
                        core.unitManager.buildImprovement(unit.id, improvement, true);
                        return;
                    }
                }
                const target = core.findNearestTarget(unit, civ.id);
                const defenseCity = core.cities.filter((city) => city.ownerId === civ.id).sort((a, b) => {
                    const aThreat = core.units.some((enemy) => enemy.ownerId !== civ.id && core.map.isDiscovered(enemy.x, enemy.y, civ.id) && Math.abs(enemy.x - a.x) + Math.abs(enemy.y - a.y) <= 6);
                    const bThreat = core.units.some((enemy) => enemy.ownerId !== civ.id && core.map.isDiscovered(enemy.x, enemy.y, civ.id) && Math.abs(enemy.x - b.x) + Math.abs(enemy.y - b.y) <= 6);
                    return Number(bThreat) - Number(aThreat) || a.id.localeCompare(b.id);
                }).find((city) => core.units.some((enemy) => enemy.ownerId !== civ.id && core.map.isDiscovered(enemy.x, enemy.y, civ.id) && Math.abs(enemy.x - city.x) + Math.abs(enemy.y - city.y) <= 6));
                if (target && unit.movementLeft > 0) {
                    const dx = Math.sign(target.x - unit.x);
                    const dy = Math.sign(target.y - unit.y);
                    const nextX = unit.x + dx;
                    const nextY = unit.y + dy;
                    if (core.map.inBounds(nextX, nextY) && TERRAIN[core.map.getTile(nextX, nextY).terrain].move < 99) {
                        core.moveUnit(unit.id, nextX, nextY, true);
                    }
                } else if (defenseCity && (unit.x !== defenseCity.x || unit.y !== defenseCity.y)) {
                    const dx = Math.sign(defenseCity.x - unit.x);
                    const dy = Math.sign(defenseCity.y - unit.y);
                    const nextX = unit.x + dx;
                    const nextY = unit.y + dy;
                    if (core.map.inBounds(nextX, nextY) && TERRAIN[core.map.getTile(nextX, nextY).terrain].move < 99) core.moveUnit(unit.id, nextX, nextY, true);
                } else {
                    const exploration = core.map.neighbors(unit.x, unit.y).filter((candidate) => TERRAIN[candidate.tile.terrain].move < 99).sort((a, b) => {
                        const score = (candidate) => {
                            const frontier = core.map.neighbors(candidate.x, candidate.y).filter((neighbor) => !core.map.isDiscovered(neighbor.x, neighbor.y, civ.id)).length;
                            const fresh = core.map.isDiscovered(candidate.x, candidate.y, civ.id) ? 0 : 100;
                            return fresh + frontier * 10;
                        };
                        return score(b) - score(a) || a.y - b.y || a.x - b.x;
                    })[0];
                    if (exploration) core.moveUnit(unit.id, exploration.x, exploration.y, true);
                }
            });
            if (personality.weights.science > 1.1 && !civ.policy) civ.policy = "science";
            if (personality.weights.military > 1.2 && !civ.policy) civ.policy = "military";
            CivilizationAI.runDiplomacy(core, civ);
        }
    }

    class CivilizationCore {
        constructor(options = {}) {
            this.width = options.width || MAP_WIDTH;
            this.height = options.height || MAP_HEIGHT;
            this.storage = options.storage || (typeof globalScope.localStorage !== "undefined" ? globalScope.localStorage : null);
            this.random = new SeededRandom(options.seed || 1);
            this.cityManager = new CityManager(this);
            this.unitManager = new UnitManager(this);
            this.init(options);
        }

        init(options = {}) {
            const seed = Number(options.seed || this.random.state || Date.now()) >>> 0 || 1;
            this.random = new SeededRandom(seed);
            this.map = new WorldMap(this.width, this.height, seed);
            this.nextCityId = 1;
            this.nextUnitId = 1;
            this.cities = [];
            this.units = [];
            this.events = { log: [], current: null, history: [] };
            this.selection = { unitId: null, cityId: null, tileX: null, tileY: null, cameraX: 0, cameraY: 0 };
            this.campaign = { version: SAVE_VERSION, seed, width: this.width, height: this.height, turn: 1, maxTurns: MAX_TURNS, status: "ready", winner: null, victoryType: null, launchProgress: 0 };
            this.civilizations = this.createCivilizations();
            this.createStartingPositions();
            return this.getSnapshot();
        }

        createCivilizations() {
            return [
                { id: "player", name: "アステリア", color: "#54b7d6", gold: 100, researchPoints: 0, researchTarget: "pottery", techs: [], culture: 0, score: 0, policy: "science", capitalId: null, launchProgress: 0, relation: {}, eliminated: false },
                ...Object.entries(PERSONALITIES).map(([id, definition]) => ({ id, name: definition.label, color: definition.color, gold: 100, researchPoints: 0, researchTarget: null, techs: [], culture: 0, score: 0, policy: null, capitalId: null, launchProgress: 0, relation: { player: 0 }, eliminated: false })),
            ];
        }

        createStartingPositions() {
            const targets = [{ x: 4, y: 4 }, { x: this.width - 5, y: this.height - 5 }, { x: this.width - 5, y: 5 }, { x: 5, y: this.height - 5 }];
            this.civilizations.forEach((civ, index) => {
                const position = this.map.findStartPosition(targets[index].x, targets[index].y);
                const city = this.cityManager.found(civ.id, position.x, position.y);
                civ.capitalId = city.id;
                this.spawnUnit(civ.id, "warrior", position.x, position.y);
                const settlerPosition = this.findOpenAdjacent(position.x, position.y);
                this.spawnUnit(civ.id, "settler", settlerPosition.x, settlerPosition.y);
                if (index === 0) {
                    const workerPosition = this.findOpenAdjacent(position.x, position.y, [settlerPosition]);
                    this.spawnUnit(civ.id, "worker", workerPosition.x, workerPosition.y);
                }
            });
            this.events.log = [];
            this.addLog("アステリアの年代記が始まりました。");
        }

        findOpenAdjacent(x, y, excluded = []) {
            const excludedKeys = new Set(excluded.map((position) => `${position.x},${position.y}`));
            const candidates = this.map.neighbors(x, y).filter((candidate) => TERRAIN[candidate.tile.terrain].move < 99 && candidate.tile.cityId === null && !excludedKeys.has(`${candidate.x},${candidate.y}`));
            return candidates[0] || { x, y };
        }

        startGame() {
            if (this.campaign.status === "ready") {
                this.campaign.status = "running";
                this.addLog("第1ターン。未知の大地を探索しましょう。");
                this.save();
            }
            return this.getSnapshot();
        }

        getCiv(id) {
            return this.civilizations.find((civ) => civ.id === id) || null;
        }

        getProductionCost(id, civ) {
            const def = UNIT_DEFS[id];
            if (def) {
                const policy = POLICY_OPTIONS.find((item) => item.id === civ.policy);
                return Math.max(10, def.cost + (policy?.effects.unitCost || 0) + (id === "settler" ? (policy?.effects.settlerCost || 0) : 0));
            }
            return BUILDING_DEFS[id]?.cost || 30;
        }

        getResearchRate(civ) {
            if (!civ) return 0;
            const policy = POLICY_OPTIONS.find((item) => item.id === civ.policy);
            return this.cities.filter((city) => city.ownerId === civ.id).reduce((total, city) => {
                const yields = this.cityManager.calculateYields(city);
                return total + Math.max(1, yields.trade) + yields.research + 1 + (civ.techs.includes("writing") ? 2 : 0) + (civ.techs.includes("education") ? 3 : 0) + (civ.techs.includes("computers") ? 5 : 0) + (policy?.effects.research || 0);
            }, 0);
        }

        isUnitAvailable(civ, unitType) {
            const requiredTech = UNIT_TECH_REQUIREMENTS[unitType];
            return Boolean(civ && UNIT_DEFS[unitType] && (!requiredTech || civ.techs.includes(requiredTech)));
        }

        isBuildingAvailable(civ, buildingId) {
            const requiredTech = BUILDING_TECH_REQUIREMENTS[buildingId];
            return Boolean(civ && BUILDING_DEFS[buildingId] && (!requiredTech || civ.techs.includes(requiredTech)));
        }

        isProductionAvailable(civ, productionId) {
            return this.isUnitAvailable(civ, productionId) || this.isBuildingAvailable(civ, productionId);
        }

        getCityDefense(city) {
            const civ = this.getCiv(city.ownerId);
            const buildingDefense = city.buildings.reduce((total, id) => total + (BUILDING_DEFS[id]?.defense || 0), 0);
            const policy = POLICY_OPTIONS.find((item) => item.id === civ?.policy);
            return 2 + buildingDefense + (civ?.techs.includes("masonry") ? 2 : 0) + (policy?.effects.defense || 0);
        }

        getMovementCost(unit, tile) {
            const baseCost = TERRAIN[tile.terrain]?.move || 99;
            const roadBonus = tile.improvement === "road" && UNIT_DEFS[unit.type].movement > 0 ? IMPROVEMENT_DEFS.road.movement : 0;
            return Math.max(1, baseCost + roadBonus);
        }

        getMoveOption(unit, x, y) {
            if (!unit || !this.map.inBounds(x, y) || Math.max(Math.abs(x - unit.x), Math.abs(y - unit.y)) !== 1) return { ok: false, reason: "invalid", x, y, cost: 0, enemy: null };
            const tile = this.map.getTile(x, y);
            const terrain = TERRAIN[tile.terrain];
            const cost = this.getMovementCost(unit, tile);
            const enemy = this.units.find((other) => other.ownerId !== unit.ownerId && other.x === x && other.y === y) || null;
            if (terrain.move >= 99) return { ok: false, reason: "terrain", x, y, cost, enemy };
            if (unit.movementLeft < cost) return { ok: false, reason: "movement", x, y, cost, enemy };
            if (enemy && UNIT_DEFS[unit.type].attack <= 0) return { ok: false, reason: "civilian", x, y, cost, enemy };
            return { ok: true, reason: null, x, y, cost, enemy };
        }

        getMoveOptions(unit) {
            if (!unit) return [];
            return this.map.neighbors(unit.x, unit.y).map((candidate) => this.getMoveOption(unit, candidate.x, candidate.y));
        }

        spawnUnit(ownerId, type, x, y) {
            if (!['ready', 'running'].includes(this.campaign.status) || !this.getCiv(ownerId) || !UNIT_DEFS[type] || !this.map.inBounds(x, y)) return null;
            const unit = { id: `unit-${this.nextUnitId++}`, ownerId, type, x, y, hp: 100, veteran: 0, movementLeft: UNIT_DEFS[type].movement };
            this.units.push(unit);
            const tile = this.map.getTile(x, y);
            tile.unitIds = Array.isArray(tile.unitIds) ? tile.unitIds : [];
            tile.unitIds.push(unit.id);
            this.map.revealAround(x, y, this.getCiv(ownerId)?.id === "player" ? 2 : 1, ownerId);
            return unit;
        }

        removeUnit(unit) {
            this.map.tiles.forEach((tile) => {
                tile.unitIds = Array.isArray(tile.unitIds) ? tile.unitIds.filter((id) => id !== unit.id) : [];
            });
            this.units = this.units.filter((item) => item.id !== unit.id);
        }

        findNearestEnemy(unit, ownerId) {
            return this.units.filter((other) => {
                if (other.ownerId === ownerId || other.type === "settler" || !this.map.isDiscovered(other.x, other.y, ownerId)) return false;
                return this.getRelationValue(ownerId, other.ownerId) <= -30;
            }).sort((a, b) => {
                const da = Math.abs(a.x - unit.x) + Math.abs(a.y - unit.y);
                const db = Math.abs(b.x - unit.x) + Math.abs(b.y - unit.y);
                return da - db || a.id.localeCompare(b.id);
            })[0] || null;
        }

        findNearestTarget(unit, ownerId) {
            const unitTarget = this.findNearestEnemy(unit, ownerId);
            const cityTarget = this.cities.filter((city) => city.ownerId !== ownerId && this.map.isDiscovered(city.x, city.y, ownerId) && this.getRelationValue(ownerId, city.ownerId) <= -30).sort((a, b) => {
                const da = Math.abs(a.x - unit.x) + Math.abs(a.y - unit.y);
                const db = Math.abs(b.x - unit.x) + Math.abs(b.y - unit.y);
                return da - db || a.id.localeCompare(b.id);
            })[0] || null;
            if (!unitTarget) return cityTarget;
            if (!cityTarget) return unitTarget;
            const unitDistance = Math.abs(unitTarget.x - unit.x) + Math.abs(unitTarget.y - unit.y);
            const cityDistance = Math.abs(cityTarget.x - unit.x) + Math.abs(cityTarget.y - unit.y);
            return unitDistance <= cityDistance ? unitTarget : cityTarget;
        }

        moveUnit(unitId, x, y, isAi = false) {
            const unit = this.units.find((item) => item.id === unitId);
            if (this.campaign.status !== "running" || !unit || (!isAi && unit.ownerId !== "player") || !this.map.inBounds(x, y)) return { ok: false, reason: "invalid" };
            const option = this.getMoveOption(unit, x, y);
            if (!option.ok) return { ok: false, reason: option.reason === "movement" ? "blocked" : option.reason };
            const tile = this.map.getTile(x, y);
            const movementCost = option.cost;
            if (option.enemy) {
                unit.movementLeft -= movementCost;
                const result = this.resolveCombat(unit, option.enemy, tile.terrain);
                if (result.attackerWins && unit.ownerId === "player") {
                    this.selection.cityId = this.cities.find((city) => city.ownerId === "player" && city.x === x && city.y === y)?.id || null;
                    this.selection.tileX = x;
                    this.selection.tileY = y;
                }
                return { ok: true, combat: result };
            }
            const oldTile = this.map.getTile(unit.x, unit.y);
            oldTile.unitIds = oldTile.unitIds.filter((id) => id !== unit.id);
            unit.x = x;
            unit.y = y;
            unit.movementLeft -= movementCost;
            tile.unitIds.push(unit.id);
            this.captureCityIfUnoccupied(unit);
            this.map.revealAround(x, y, unit.type === "scout" ? 3 : 2, unit.ownerId);
            if (unit.ownerId === "player") {
                this.selection.unitId = unit.id;
                this.selection.cityId = this.cities.find((city) => city.ownerId === "player" && city.x === x && city.y === y)?.id || null;
                this.selection.tileX = x;
                this.selection.tileY = y;
            }
            return { ok: true, combat: null };
        }

        captureCityIfUnoccupied(unit) {
            const city = this.cities.find((item) => item.x === unit.x && item.y === unit.y && item.ownerId !== unit.ownerId);
            if (!city || this.units.some((other) => other.ownerId !== unit.ownerId && other.x === unit.x && other.y === unit.y)) return false;
            city.ownerId = unit.ownerId;
            this.updateEliminations();
            this.addLog(`${city.name}を占領しました。`);
            return true;
        }

        updateEliminations() {
            this.civilizations.forEach((civ) => {
                const hasCities = this.cities.some((city) => city.ownerId === civ.id);
                if (!hasCities && !civ.eliminated) {
                    civ.eliminated = true;
                    this.units.filter((unit) => unit.ownerId === civ.id).forEach((unit) => this.removeUnit(unit));
                    this.addLog(`${civ.name}が滅亡しました。`);
                }
            });
        }

        resolveCombat(attacker, defender, terrainName) {
            if (!['ready', 'running'].includes(this.campaign.status) || !attacker || !defender || !this.units.includes(attacker) || !this.units.includes(defender)) return { attackerWins: false, invalid: true, attackPower: 0, defensePower: 0, attackRoll: 0, defenseRoll: 0 };
            if (!UNIT_DEFS[attacker.type] || UNIT_DEFS[attacker.type].attack <= 0) return { attackerWins: false, invalid: true, attackPower: 0, defensePower: UNIT_DEFS[defender.type]?.defense || 0, attackRoll: 0, defenseRoll: 0 };
            const attackerCiv = this.getCiv(attacker.ownerId);
            const attackerPolicy = POLICY_OPTIONS.find((item) => item.id === attackerCiv.policy);
            this.setRelation(attacker.ownerId, defender.ownerId, -100);
            const attackerStats = { ...attacker, attack: UNIT_DEFS[attacker.type].attack, defense: UNIT_DEFS[attacker.type].defense };
            const defenderStats = { ...defender, attack: UNIT_DEFS[defender.type].attack, defense: UNIT_DEFS[defender.type].defense };
            const city = this.cities.find((item) => item.x === defender.x && item.y === defender.y && item.ownerId === defender.ownerId);
            const cityDefense = city ? this.getCityDefense(city) : 0;
            const result = CombatResolver.resolve(attackerStats, defenderStats, terrainName, this.random, { attack: attackerPolicy?.effects.combat || 0, defense: cityDefense });
            if (result.attackerWins) {
                const destination = { x: defender.x, y: defender.y };
                this.removeUnit(defender);
                attacker.veteran += 1;
                const oldTile = this.map.getTile(attacker.x, attacker.y);
                oldTile.unitIds = oldTile.unitIds.filter((id) => id !== attacker.id);
                attacker.x = destination.x;
                attacker.y = destination.y;
                const tile = this.map.getTile(destination.x, destination.y);
                tile.unitIds = tile.unitIds.filter((id) => id !== attacker.id);
                tile.unitIds.push(attacker.id);
                this.captureCityIfUnoccupied(attacker);
                this.addLog(`${UNIT_DEFS[attacker.type].label}が${UNIT_DEFS[defender.type].label}を撃破しました。`);
            } else {
                this.removeUnit(attacker);
                defender.veteran += 1;
                this.addLog(`${UNIT_DEFS[defender.type].label}が攻撃を退けました。`);
            }
            this.checkVictory();
            return result;
        }

        foundCity(unitId) {
            const unit = this.units.find((item) => item.id === unitId);
            if (this.campaign.status !== "running" || !unit || unit.ownerId !== "player" || UNIT_DEFS[unit.type].role !== "settler") return false;
            const city = this.cityManager.found("player", unit.x, unit.y);
            if (!city) {
                this.addLog("この土地には都市を建設できません。");
                return false;
            }
            this.removeUnit(unit);
            this.selection.cityId = city.id;
            this.selection.unitId = null;
            this.selection.tileX = city.x;
            this.selection.tileY = city.y;
            this.save();
            return true;
        }

        setCityProduction(cityId, productionId) {
            const city = this.cities.find((item) => item.id === cityId && item.ownerId === "player");
            const civ = this.getCiv("player");
            if (this.campaign.status !== "running" || !city || !this.isProductionAvailable(civ, productionId) || (BUILDING_DEFS[productionId] && city.buildings.includes(productionId))) return false;
            city.productionId = productionId;
            this.addLog(`${city.name}の生産を変更しました。`);
            this.save();
            return true;
        }

        selectAt(x, y) {
            const tile = this.map.getTile(x, y);
            if (!tile || !this.map.isDiscovered(x, y, "player")) return null;
            this.selection.tileX = x;
            this.selection.tileY = y;
            const units = this.getUnitsAt(x, y, "player");
            const currentIndex = units.findIndex((item) => item.id === this.selection.unitId);
            const unit = units.length > 0 ? units[(currentIndex + 1 + units.length) % units.length] : null;
            const city = this.cities.find((item) => item.ownerId === "player" && item.x === x && item.y === y);
            if (unit && city && units.length === 1 && this.selection.unitId === unit.id) {
                this.selection.unitId = null;
                this.selection.cityId = city.id;
            } else if (unit) {
                this.selection.unitId = unit.id;
                this.selection.cityId = city?.id || null;
            } else if (city) {
                this.selection.unitId = null;
                this.selection.cityId = city.id;
            } else {
                this.selection.unitId = null;
                this.selection.cityId = null;
            }
            return { unit, city, tile };
        }

        getUnitsAt(x, y, ownerId = null) {
            const tile = this.map.getTile(x, y);
            if (!tile) return [];
            const order = new Map((Array.isArray(tile.unitIds) ? tile.unitIds : []).map((id, index) => [id, index]));
            return this.units.filter((unit) => unit.x === x && unit.y === y && (!ownerId || unit.ownerId === ownerId)).sort((first, second) => (order.get(first.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(second.id) ?? Number.MAX_SAFE_INTEGER) || first.id.localeCompare(second.id));
        }

        selectUnit(unitId) {
            const unit = this.units.find((item) => item.id === unitId && item.ownerId === "player");
            if (!unit || !this.map.isDiscovered(unit.x, unit.y, "player")) return null;
            this.selection.unitId = unit.id;
            const city = this.cities.find((item) => item.ownerId === "player" && item.x === unit.x && item.y === unit.y);
            this.selection.cityId = city?.id || null;
            this.selection.tileX = unit.x;
            this.selection.tileY = unit.y;
            return unit;
        }

        selectCity(cityId) {
            const city = this.cities.find((item) => item.id === cityId && item.ownerId === "player");
            if (!city || !this.map.isDiscovered(city.x, city.y, "player")) return null;
            this.selection.unitId = null;
            this.selection.cityId = city.id;
            this.selection.tileX = city.x;
            this.selection.tileY = city.y;
            return city;
        }

        choosePolicy(policyId) {
            if (this.campaign.status !== "running" || this.events.current?.type !== "policy" || !POLICY_OPTIONS.some((item) => item.id === policyId)) return false;
            const civ = this.getCiv("player");
            civ.policy = policyId;
            this.events.current = null;
            const policy = POLICY_OPTIONS.find((item) => item.id === policyId);
            this.events.history.push({ turn: this.campaign.turn, type: "policy", policyId });
            this.addLog(`国是「${policy.label}」を採用しました。`);
            this.save();
            return true;
        }

        chooseResearch(techId) {
            const civ = this.getCiv("player");
            if (this.campaign.status !== "running" || !TechnologyTree.isAvailable(civ, techId)) return false;
            civ.researchTarget = techId;
            this.addLog(`研究対象を「${TechnologyTree.get(techId).label}」に設定しました。`);
            this.save();
            return true;
        }

        getRelationValue(firstId, secondId) {
            return this.getCiv(firstId)?.relation?.[secondId] ?? 0;
        }

        getRelationStatus(value) {
            if (value >= 30) return "同盟";
            if (value >= 10) return "友好";
            if (value > -10) return "中立";
            if (value > -30) return "緊張";
            return "戦争";
        }

        setRelation(firstId, secondId, value) {
            const first = this.getCiv(firstId);
            const second = this.getCiv(secondId);
            if (!first || !second || firstId === secondId) return false;
            first.relation[secondId] = clampRelation(value);
            second.relation[firstId] = clampRelation(value);
            return true;
        }

        negotiate(targetId, action) {
            if (this.campaign.status !== "running") return false;
            const target = this.getCiv(targetId);
            const player = this.getCiv("player");
            if (!target || targetId === "player") return false;
            const current = this.getRelationValue("player", targetId);
            if (action === "trade" && current <= -30) return false;
            if (action === "trade") {
                if (player.gold < 10) return false;
                player.gold -= 10;
                target.gold += 10;
                this.setRelation("player", targetId, current + 8);
                this.addLog(`${target.name}と交易協定を結びました。`);
            } else if (action === "peace") {
                this.setRelation("player", targetId, Math.max(0, current + 20));
                this.addLog(`${target.name}へ和平を提案しました。`);
            } else if (action === "war") {
                this.setRelation("player", targetId, -100);
                this.addLog(`${target.name}へ宣戦布告しました。`);
            } else {
                return false;
            }
            this.save();
            return true;
        }

        completeResearch(civ) {
            if (this.campaign.status !== "running") return;
            const tech = TechnologyTree.get(civ.researchTarget);
            if (!tech || !TechnologyTree.isAvailable(civ, tech.id) || civ.researchPoints < tech.cost) return;
            civ.researchPoints -= tech.cost;
            civ.techs.push(tech.id);
            civ.researchTarget = CivilizationAI.chooseResearch(civ);
            this.addLog(`${civ.name}が「${tech.label}」を研究しました。`);
        }

        processCivilizationTurn(civ) {
            if (this.campaign.status !== "running") return;
            const hadOrbitalCharter = civ.techs.includes("orbital_charter");
            const policy = POLICY_OPTIONS.find((item) => item.id === civ.policy);
            this.cities.filter((city) => city.ownerId === civ.id).forEach((city) => this.cityManager.processTurn(city));
            this.completeResearch(civ);
            if (hadOrbitalCharter) {
                civ.launchProgress = Math.min(5, civ.launchProgress + 1);
            }
            if (policy?.effects.diplomacy) {
                this.civilizations.filter((target) => target.id !== civ.id).forEach((target) => {
                    this.setRelation(civ.id, target.id, this.getRelationValue(civ.id, target.id) + policy.effects.diplomacy);
                });
            }
            civ.score = this.calculateScore(civ);
        }

        calculateScore(civ) {
            if (civ.eliminated) return 0;
            return this.cities.filter((city) => city.ownerId === civ.id).reduce((total, city) => total + city.population * 10 + Math.floor(city.culture / 10), 0) + civ.techs.length * 20 + this.units.filter((unit) => unit.ownerId === civ.id).length * 5 + Math.floor(civ.gold / 10);
        }

        endTurn() {
            if (this.campaign.status !== "running" || this.events.current) return false;
            this.civilizations.forEach((civ) => this.processCivilizationTurn(civ));
            this.civilizations.filter((civ) => civ.id !== "player").forEach((civ) => {
                this.unitManager.resetMovementForCivilization(civ.id);
                if (!civ.eliminated) CivilizationAI.runTurn(this, civ);
            });
            if (this.campaign.turn < MAX_TURNS) this.campaign.turn += 1;
            this.unitManager.resetMovementForCivilization("player");
            if (this.campaign.turn < MAX_TURNS && this.campaign.turn % 10 === 0) {
                this.events.current = { type: "policy", options: POLICY_OPTIONS.map((option) => ({ id: option.id, label: option.label, description: option.description })) };
            }
            this.checkVictory();
            this.save();
            return true;
        }

        checkVictory() {
            if (!["running", "ready"].includes(this.campaign.status)) return this.campaign.status;
            this.updateEliminations();
            const player = this.getCiv("player");
            const playerDefeated = !this.cities.some((city) => city.id === player.capitalId && city.ownerId === "player") || !this.cities.some((city) => city.ownerId === "player");
            if (playerDefeated) {
                this.finish("lost", "conquest", this.civilizations.find((civ) => civ.id !== "player" && this.cities.some((city) => city.ownerId === civ.id))?.id || null);
                return this.campaign.status;
            }
            const victory = this.civilizations.filter((civ) => !civ.eliminated).map((civ) => {
                const cities = this.cities.filter((city) => city.ownerId === civ.id);
                const capitals = this.civilizations.filter((other) => other.id !== civ.id).map((other) => other.capitalId).filter(Boolean);
                if (capitals.length > 0 && capitals.every((capitalId) => this.cities.some((city) => city.id === capitalId && city.ownerId === civ.id))) return { civ, type: "conquest" };
                if (civ.techs.includes("orbital_charter") && civ.launchProgress >= 5) return { civ, type: "science" };
                if (civ.culture >= 800 && cities.filter((city) => city.culture >= 80).length >= 3) return { civ, type: "culture" };
                return null;
            }).find(Boolean);
            if (victory) {
                this.finish(victory.civ.id === player.id ? "won" : "lost", victory.type, victory.civ.id);
            } else if (this.campaign.turn >= MAX_TURNS) {
                const highest = [...this.civilizations].sort((a, b) => this.calculateScore(b) - this.calculateScore(a) || a.id.localeCompare(b.id))[0];
                this.finish(highest.id === "player" ? "won" : "lost", "score", highest.id);
            }
            return this.campaign.status;
        }

        finish(status, victoryType, winnerId = null) {
            this.campaign.status = status;
            this.campaign.winner = winnerId;
            this.campaign.victoryType = victoryType;
            this.events.current = null;
            this.addLog(status === "won" ? `勝利条件「${victoryType}」を達成しました。` : "アステリアの年代記はここで終わります。");
            this.save();
        }

        addLog(message) {
            this.events.log.push({ turn: this.campaign?.turn || 1, message });
            if (this.events.log.length > 20) this.events.log.shift();
        }

        getSnapshot() {
            const player = this.getCiv("player");
            const research = player?.researchTarget ? TechnologyTree.get(player.researchTarget) : null;
            return {
                campaign: { ...this.campaign },
                player: player ? { ...player, era: TechnologyTree.getEra(player), researchLabel: research?.label || "なし", researchCost: research?.cost || 0 } : null,
                map: { width: this.map.width, height: this.map.height, seed: this.map.seed },
                cities: this.cities,
                units: this.units,
                events: this.events,
                selection: this.selection,
            };
        }

        toSaveData() {
            return { version: SAVE_VERSION, campaign: this.campaign, map: this.map.serialize(), civilizations: this.civilizations, cities: this.cities, units: this.units, events: this.events, selection: this.selection, nextCityId: this.nextCityId, nextUnitId: this.nextUnitId, randomState: this.random.state >>> 0 };
        }

        save(storage = this.storage) {
            if (!storage || typeof storage.setItem !== "function") return false;
            try {
                storage.setItem(SAVE_KEY, JSON.stringify(this.toSaveData()));
                return true;
            } catch {
                return false;
            }
        }

        load(storage = this.storage) {
            if (!storage || typeof storage.getItem !== "function") return false;
            try {
                const raw = storage.getItem(SAVE_KEY);
                const data = raw ? JSON.parse(raw) : null;
                if (!CivilizationCore.isValidSave(data)) return false;
                this.campaign = data.campaign;
                this.map = WorldMap.fromSnapshot(data.map);
                this.civilizations = data.civilizations;
                this.cities = data.cities;
                this.units = data.units;
                this.events = data.events;
                this.selection = { tileX: null, tileY: null, ...data.selection };
                this.nextCityId = data.nextCityId;
                this.nextUnitId = data.nextUnitId;
                this.random = new SeededRandom(data.randomState);
                this.map.tiles.forEach((tile) => { tile.cityId = null; tile.unitIds = []; });
                this.cities.forEach((city) => {
                    const tile = this.map.getTile(city.x, city.y);
                    if (tile) tile.cityId = city.id;
                });
                this.units.forEach((unit) => {
                    const tile = this.map.getTile(unit.x, unit.y);
                    if (tile) tile.unitIds.push(unit.id);
                });
                return true;
            } catch {
                return false;
            }
        }

        static isValidSave(data) {
            if (!data || data.version !== SAVE_VERSION || !data.campaign || !data.map || !Array.isArray(data.civilizations) || !Array.isArray(data.cities) || !Array.isArray(data.units) || !data.events || !Array.isArray(data.events.log) || !Array.isArray(data.events.history) || !data.selection) return false;
            const campaign = data.campaign;
            if (campaign.version !== SAVE_VERSION || campaign.width !== MAP_WIDTH || campaign.height !== MAP_HEIGHT || !Number.isInteger(campaign.turn) || campaign.turn < 1 || campaign.turn > MAX_TURNS || campaign.maxTurns !== MAX_TURNS || !["ready", "running", "won", "lost"].includes(campaign.status) || !Number.isInteger(campaign.seed) || campaign.seed < 1 || campaign.seed > 0xFFFFFFFF || (campaign.victoryType !== null && !["conquest", "science", "culture", "score"].includes(campaign.victoryType)) || !Number.isInteger(campaign.launchProgress) || campaign.launchProgress < 0 || campaign.launchProgress > 5) return false;
            if (data.map.width !== MAP_WIDTH || data.map.height !== MAP_HEIGHT || !Array.isArray(data.map.tiles) || data.map.tiles.length !== MAP_WIDTH * MAP_HEIGHT) return false;
            const civIds = new Set(data.civilizations.filter((civ) => civ && typeof civ.id === "string").map((civ) => civ.id));
            if (data.civilizations.length !== 4 || !civIds.has("player") || !["aurora", "verdant", "ironhold"].every((id) => civIds.has(id)) || civIds.size !== data.civilizations.length) return false;
            if (campaign.winner !== null && !civIds.has(campaign.winner)) return false;
            if (data.civilizations.some((civ) => !civ || typeof civ.name !== "string" || typeof civ.eliminated !== "boolean" || !Number.isFinite(civ.gold) || civ.gold < 0 || !Number.isFinite(civ.researchPoints) || civ.researchPoints < 0 || !Array.isArray(civ.techs) || new Set(civ.techs).size !== civ.techs.length || civ.techs.some((id) => !TechnologyTree.get(id)) || (civ.researchTarget !== null && !TechnologyTree.get(civ.researchTarget)) || (civ.policy !== null && !POLICY_OPTIONS.some((policy) => policy.id === civ.policy)) || !Number.isFinite(civ.culture) || civ.culture < 0 || !Number.isFinite(civ.score) || civ.score < 0 || !Number.isInteger(civ.launchProgress) || civ.launchProgress < 0 || civ.launchProgress > 5 || !civ.relation || typeof civ.relation !== "object" || Object.entries(civ.relation).some(([id, value]) => !civIds.has(id) || id === civ.id || !Number.isInteger(value) || value < -100 || value > 100))) return false;
            if (!Number.isInteger(data.randomState) || data.randomState < 0 || data.randomState > 0xFFFFFFFF) return false;
            const cityIds = new Set(data.cities.filter((city) => city && typeof city.id === "string").map((city) => city.id));
            const unitIds = new Set(data.units.filter((unit) => unit && typeof unit.id === "string").map((unit) => unit.id));
            const validTerrain = new Set(Object.keys(TERRAIN));
            const validImprovements = new Set([null, ...Object.keys(IMPROVEMENT_DEFS)]);
            if (data.map.tiles.some((tile) => !tile || !validTerrain.has(tile.terrain) || !Array.isArray(tile.discoveredBy) || new Set(tile.discoveredBy).size !== tile.discoveredBy.length || tile.discoveredBy.some((id) => !civIds.has(id)) || !validImprovements.has(tile.improvement) || !Array.isArray(tile.unitIds) || new Set(tile.unitIds).size !== tile.unitIds.length || tile.unitIds.some((id) => !unitIds.has(id)) || (tile.cityId !== null && (!cityIds.has(tile.cityId) || typeof tile.cityId !== "string")))) return false;
            if (cityIds.size !== data.cities.length || unitIds.size !== data.units.length) return false;
            if (data.cities.some((city) => !city || typeof city.id !== "string" || !cityIds.has(city.id) || !civIds.has(city.ownerId) || typeof city.isCapital !== "boolean" || !Number.isInteger(city.x) || !Number.isInteger(city.y) || city.x < 0 || city.x >= MAP_WIDTH || city.y < 0 || city.y >= MAP_HEIGHT || !Number.isInteger(city.population) || city.population < 1 || !Number.isFinite(city.food) || city.food < 0 || !Number.isFinite(city.production) || city.production < 0 || !Number.isFinite(city.defense) || city.defense < 0 || (!UNIT_DEFS[city.productionId] && !BUILDING_DEFS[city.productionId]) || !Array.isArray(city.buildings) || city.buildings.some((id) => !BUILDING_DEFS[id]) || !Array.isArray(city.workedTiles) || city.workedTiles.some((position) => !position || !Number.isInteger(position.x) || !Number.isInteger(position.y) || position.x < 0 || position.x >= MAP_WIDTH || position.y < 0 || position.y >= MAP_HEIGHT))) return false;
            if (data.units.some((unit) => !unit || typeof unit.id !== "string" || !unitIds.has(unit.id) || !civIds.has(unit.ownerId) || !UNIT_DEFS[unit.type] || !Number.isInteger(unit.x) || !Number.isInteger(unit.y) || unit.x < 0 || unit.x >= MAP_WIDTH || unit.y < 0 || unit.y >= MAP_HEIGHT || !Number.isFinite(unit.movementLeft) || unit.movementLeft < 0 || unit.movementLeft > UNIT_DEFS[unit.type].movement || !Number.isFinite(unit.hp) || unit.hp < 1 || unit.hp > 100 || !Number.isInteger(unit.veteran) || unit.veteran < 0)) return false;
            if (data.cities.some((city) => new Set(city.buildings).size !== city.buildings.length)) return false;
            const tileAt = (x, y) => data.map.tiles[y * MAP_WIDTH + x];
            if (data.cities.some((city) => tileAt(city.x, city.y).cityId !== city.id)) return false;
            if (data.units.some((unit) => tileAt(unit.x, unit.y).unitIds.filter((id) => id === unit.id).length !== 1)) return false;
            if (data.map.tiles.some((tile, index) => tile.unitIds.some((id) => {
                const unit = data.units.find((candidate) => candidate.id === id);
                return !unit || unit.x !== index % MAP_WIDTH || unit.y !== Math.floor(index / MAP_WIDTH);
            }))) return false;
            if (data.map.tiles.some((tile, index) => tile.cityId && !data.cities.some((city) => city.id === tile.cityId && city.x === index % MAP_WIDTH && city.y === Math.floor(index / MAP_WIDTH)))) return false;
            if (data.civilizations.some((civ) => civ.capitalId !== null && (!cityIds.has(civ.capitalId) || !data.cities.some((city) => city.id === civ.capitalId && city.ownerId === civ.id && city.isCapital)))) return false;
            if (data.events.log.some((entry) => !entry || !Number.isInteger(entry.turn) || entry.turn < 1 || entry.turn > MAX_TURNS || typeof entry.message !== "string") || data.events.history.some((entry) => !entry || entry.type !== "policy" || !Number.isInteger(entry.turn) || entry.turn < 1 || entry.turn > MAX_TURNS || !POLICY_OPTIONS.some((policy) => policy.id === entry.policyId))) return false;
            if (data.events.current !== null && (!data.events.current || data.events.current.type !== "policy" || !Array.isArray(data.events.current.options) || data.events.current.options.length !== POLICY_OPTIONS.length || data.events.current.options.some((option) => !option || !POLICY_OPTIONS.some((policy) => policy.id === option.id) || typeof option.label !== "string" || typeof option.description !== "string"))) return false;
            if (data.selection.unitId !== null && data.selection.unitId === undefined || data.selection.cityId !== null && data.selection.cityId === undefined || (data.selection.tileX !== undefined && data.selection.tileX !== null && (!Number.isInteger(data.selection.tileX) || data.selection.tileX < 0 || data.selection.tileX >= MAP_WIDTH)) || (data.selection.tileY !== undefined && data.selection.tileY !== null && (!Number.isInteger(data.selection.tileY) || data.selection.tileY < 0 || data.selection.tileY >= MAP_HEIGHT)) || !Number.isFinite(data.selection.cameraX) || !Number.isFinite(data.selection.cameraY)) return false;
            if (!Number.isInteger(data.nextCityId) || data.nextCityId < 1 || !Number.isInteger(data.nextUnitId) || data.nextUnitId < 1) return false;
            if ((data.selection.unitId !== null && !unitIds.has(data.selection.unitId)) || (data.selection.cityId !== null && !cityIds.has(data.selection.cityId))) return false;
            return true;
        }
    }

    class CivilizationRenderer {
        constructor(canvas, core) {
            this.canvas = canvas;
            this.context = canvas.getContext("2d");
            this.core = core;
            this.tileSize = 26;
            this.spriteSheet = null;
            this.spriteReady = false;
            if (typeof globalScope.Image === "function") {
                this.spriteSheet = new globalScope.Image();
                this.spriteSheet.onload = () => {
                    this.spriteReady = true;
                    this.draw();
                };
                this.spriteSheet.src = "./assets/civilization/sprites.svg";
            }
        }

        resize() {
            const scale = Math.min(this.canvas.width / this.core.map.width, this.canvas.height / this.core.map.height);
            this.tileSize = Math.max(16, Math.floor(scale));
        }

        tileFromPointer(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((clientX - rect.left) * this.canvas.width / rect.width / this.tileSize);
            const y = Math.floor((clientY - rect.top) * this.canvas.height / rect.height / this.tileSize);
            return { x, y };
        }

        draw() {
            const ctx = this.context;
            const core = this.core;
            this.resize();
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = "#101922";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            for (let y = 0; y < core.map.height; y += 1) {
                for (let x = 0; x < core.map.width; x += 1) {
                    const tile = core.map.getTile(x, y);
                    const definition = TERRAIN[tile.terrain];
                    const px = x * this.tileSize;
                    const py = y * this.tileSize;
                    const discovered = core.map.isDiscovered(x, y, "player");
                    if (discovered && this.spriteReady) {
                        ctx.drawImage(this.spriteSheet, TERRAIN_SPRITE_INDEX[tile.terrain] * 32, 0, 32, 32, px, py, this.tileSize, this.tileSize);
                    } else {
                        ctx.fillStyle = discovered ? definition.color : "#17212a";
                        ctx.fillRect(px, py, this.tileSize, this.tileSize);
                    }
                    if (discovered) {
                        ctx.fillStyle = "rgba(0, 0, 0, 0.17)";
                        ctx.fillRect(px, py + this.tileSize - 2, this.tileSize, 2);
                        ctx.strokeStyle = "rgba(255,255,255,0.08)";
                        ctx.strokeRect(px, py, this.tileSize, this.tileSize);
                    }
                }
            }
            const previewSelectedUnit = core.units.find((unit) => unit.id === core.selection.unitId && unit.ownerId === "player");
            if (previewSelectedUnit && core.campaign.status === "running") {
                core.getMoveOptions(previewSelectedUnit).forEach((option) => {
                    const px = option.x * this.tileSize;
                    const py = option.y * this.tileSize;
                    ctx.fillStyle = option.ok ? "rgba(84, 183, 214, 0.24)" : "rgba(217, 93, 122, 0.18)";
                    ctx.fillRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
                    ctx.strokeStyle = option.ok ? "rgba(84, 183, 214, 0.85)" : "rgba(217, 93, 122, 0.7)";
                    ctx.lineWidth = 2;
                    ctx.strokeRect(px + 2, py + 2, this.tileSize - 4, this.tileSize - 4);
                });
                ctx.lineWidth = 1;
            }
            core.cities.forEach((city) => {
                const civ = core.getCiv(city.ownerId);
                const px = city.x * this.tileSize;
                const py = city.y * this.tileSize;
                if (!core.map.isDiscovered(city.x, city.y, "player")) return;
                ctx.strokeStyle = civ.color;
                ctx.lineWidth = Math.max(2, this.tileSize * 0.12);
                ctx.strokeRect(px + 3, py + 3, this.tileSize - 6, this.tileSize - 6);
                ctx.fillStyle = "#f6e6b0";
                ctx.font = `${Math.max(8, this.tileSize * 0.32)}px monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(city.isCapital ? "★" : "●", px + this.tileSize * 0.2, py + this.tileSize * 0.2);
                ctx.lineWidth = 1;
            });
            const selectedUnitId = core.selection.unitId;
            [...core.units].sort((first, second) => Number(first.id === selectedUnitId) - Number(second.id === selectedUnitId)).forEach((unit) => {
                if (!core.map.isDiscovered(unit.x, unit.y, "player")) return;
                const civ = core.getCiv(unit.ownerId);
                const px = unit.x * this.tileSize;
                const py = unit.y * this.tileSize;
                if (this.spriteReady) {
                    ctx.globalAlpha = 0.92;
                    ctx.drawImage(this.spriteSheet, UNIT_SPRITE_INDEX[unit.type] * 32, 0, 32, 32, px, py, this.tileSize, this.tileSize);
                    ctx.globalAlpha = 1;
                }
                ctx.beginPath();
                ctx.fillStyle = civ.color;
                ctx.arc(px + this.tileSize / 2, py + this.tileSize / 2, this.tileSize * 0.33, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = "#f6e6b0";
                ctx.lineWidth = Math.max(1, this.tileSize * 0.06);
                ctx.stroke();
                ctx.fillStyle = "#101922";
                ctx.font = `700 ${Math.max(9, this.tileSize * 0.42)}px monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(UNIT_DEFS[unit.type].symbol, px + this.tileSize / 2, py + this.tileSize / 2);
                ctx.lineWidth = 1;
            });
            for (let y = 0; y < core.map.height; y += 1) {
                for (let x = 0; x < core.map.width; x += 1) {
                    if (!core.map.isDiscovered(x, y, "player")) continue;
                    const stack = core.getUnitsAt(x, y);
                    if (stack.length < 2) continue;
                    const px = x * this.tileSize;
                    const py = y * this.tileSize;
                    ctx.fillStyle = "#101922";
                    ctx.fillRect(px + this.tileSize * 0.66, py + 1, this.tileSize * 0.32, this.tileSize * 0.28);
                    ctx.fillStyle = "#f6e6b0";
                    ctx.font = `700 ${Math.max(8, this.tileSize * 0.24)}px monospace`;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(String(stack.length), px + this.tileSize * 0.82, py + this.tileSize * 0.14);
                }
            }
            const selection = core.selection;
            const selectedUnit = core.units.find((unit) => unit.id === selection.unitId);
            const selectedCity = core.cities.find((city) => city.id === selection.cityId);
            const selected = selectedUnit || selectedCity;
            if (selected) {
                ctx.strokeStyle = "#ffe27a";
                ctx.lineWidth = 3;
                ctx.strokeRect(selected.x * this.tileSize + 2, selected.y * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
                ctx.lineWidth = 1;
            }
        }
    }

    class CivilizationInput {
        constructor(game) {
            this.game = game;
            this.dragging = false;
            game.canvas.addEventListener("click", (event) => this.onCanvasClick(event));
            game.canvas.addEventListener("pointerdown", () => { this.dragging = true; });
            game.canvas.addEventListener("pointerup", () => { this.dragging = false; });
            globalScope.addEventListener?.("keydown", (event) => this.onKeyDown(event));
        }

        onCanvasClick(event) {
            if (this.dragging && event.type !== "click") return;
            const position = this.game.renderer.tileFromPointer(event.clientX, event.clientY);
            const selectedUnit = this.game.core.units.find((unit) => unit.id === this.game.core.selection.unitId);
            if (selectedUnit && (selectedUnit.x !== position.x || selectedUnit.y !== position.y)) {
                const moveOption = this.game.core.getMoveOption(selectedUnit, position.x, position.y);
                const targetOwnUnit = this.game.core.getUnitsAt(position.x, position.y, "player").length > 0;
                const targetOwnCity = this.game.core.cities.some((city) => city.ownerId === "player" && city.x === position.x && city.y === position.y);
                if (!moveOption.ok && (targetOwnUnit || targetOwnCity)) {
                    this.game.core.selectAt(position.x, position.y);
                    this.game.syncUi();
                    return;
                }
                const moved = this.game.core.moveUnit(selectedUnit.id, position.x, position.y);
                if (moved.ok) {
                    this.game.syncUi();
                    return;
                }
                const reason = { blocked: "移動力が足りません。", terrain: "その地形には進入できません。", civilian: "民間ユニットは攻撃できません。", invalid: "1マス先を選択してください。" }[moved.reason] || "その場所へは移動できません。";
                this.game.core.addLog(`${UNIT_DEFS[selectedUnit.type].label}：${reason}`);
                this.game.syncUi();
                return;
            }
            const targetCity = this.game.core.cities.find((city) => city.ownerId === "player" && city.x === position.x && city.y === position.y);
            if (targetCity) {
                this.game.core.selectAt(position.x, position.y);
                this.game.syncUi();
                return;
            }
            this.game.core.selectAt(position.x, position.y);
            this.game.syncUi();
        }

        onKeyDown(event) {
            if (event.key.toLowerCase() === "e") this.game.endTurn();
            if (event.key.toLowerCase() === "f") this.game.foundSelectedCity();
            if (event.key.toLowerCase() === "escape") this.game.clearSelection();
        }
    }

    class CivilizationGame {
        constructor(canvas, elements = {}) {
            this.canvas = canvas;
            this.elements = elements;
            this.core = new CivilizationCore({ seed: elements.seedInput?.value || Date.now() });
            this.renderer = new CivilizationRenderer(canvas, this.core);
            this.input = new CivilizationInput(this);
            this.game = { running: false, pendingMove: false };
            this.init();
        }

        init() {
            const querySeed = new URLSearchParams(globalScope.location?.search || "").get("seed");
            if (querySeed) this.core.init({ seed: Number(querySeed) });
            this.syncUi();
            this.renderer.draw();
            return this.core.getSnapshot();
        }

        start() {
            this.core.startGame();
            this.game.running = true;
            this.elements.startOverlay?.setAttribute("hidden", "hidden");
            this.syncUi();
        }

        newCampaign(seed) {
            this.core.init({ seed: Number(seed) || Date.now() });
            this.core.startGame();
            this.game.running = true;
            this.elements.startOverlay?.setAttribute("hidden", "hidden");
            this.elements.resultOverlay?.setAttribute("hidden", "hidden");
            this.syncUi();
        }

        loadCampaign() {
            if (!this.core.load()) {
                this.core.init({ seed: this.core.campaign.seed });
                this.game.running = false;
                this.elements.startOverlay?.removeAttribute("hidden");
                this.elements.resultOverlay?.setAttribute("hidden", "hidden");
                this.syncUi();
                return false;
            }
            this.game.running = this.core.campaign.status === "running";
            if (this.core.campaign.status === "ready") this.elements.startOverlay?.removeAttribute("hidden");
            else this.elements.startOverlay?.setAttribute("hidden", "hidden");
            if (["won", "lost"].includes(this.core.campaign.status)) this.elements.resultOverlay?.removeAttribute("hidden");
            else this.elements.resultOverlay?.setAttribute("hidden", "hidden");
            this.syncUi();
            return true;
        }

        endTurn() {
            if (this.core.endTurn()) this.syncUi();
        }

        foundSelectedCity() {
            if (this.core.selection.unitId && this.core.foundCity(this.core.selection.unitId)) this.syncUi();
        }

        clearSelection() {
            this.core.selection.unitId = null;
            this.core.selection.cityId = null;
            this.core.selection.tileX = null;
            this.core.selection.tileY = null;
            this.syncUi();
        }

        syncUi() {
            this.renderer.draw();
            const snapshot = this.core.getSnapshot();
            const player = snapshot.player;
            const setText = (element, value) => { if (element) element.textContent = value; };
            setText(this.elements.status, snapshot.campaign.status === "running" ? "進行中" : snapshot.campaign.status === "ready" ? "待機中" : snapshot.campaign.status === "won" ? "勝利" : "敗北");
            setText(this.elements.turn, `${snapshot.campaign.turn} / ${snapshot.campaign.maxTurns}`);
            setText(this.elements.era, player?.era || "古代");
            setText(this.elements.civName, player?.name || "アステリア");
            setText(this.elements.gold, player?.gold ?? 0);
            setText(this.elements.score, player?.score ?? 0);
            setText(this.elements.research, player ? `${player.researchLabel} ${player.researchPoints}/${player.researchCost}` : "なし");
            setText(this.elements.seed, snapshot.campaign.seed);
            const selectedUnit = this.core.units.find((unit) => unit.id === this.core.selection.unitId);
            const selectedCity = this.core.cities.find((city) => city.id === this.core.selection.cityId);
            const cityAtSelectedUnit = selectedUnit ? this.core.cities.find((city) => city.ownerId === "player" && city.x === selectedUnit.x && city.y === selectedUnit.y) : null;
            const activeCity = selectedCity || cityAtSelectedUnit;
            if (cityAtSelectedUnit && !selectedCity) this.core.selection.cityId = cityAtSelectedUnit.id;
            setText(this.elements.selectedTitle, selectedUnit ? UNIT_DEFS[selectedUnit.type].label : activeCity ? activeCity.name : "未選択");
            const moveOptions = selectedUnit ? this.core.getMoveOptions(selectedUnit) : [];
            const movableCount = moveOptions.filter((option) => option.ok).length;
            const productionDefinition = activeCity ? (UNIT_DEFS[activeCity.productionId] || BUILDING_DEFS[activeCity.productionId]) : null;
            setText(this.elements.selectedDetail, selectedUnit ? `移動 ${selectedUnit.movementLeft} / ${UNIT_DEFS[selectedUnit.type].movement} HP ${selectedUnit.hp} ・移動可能 ${movableCount}方向` : activeCity ? `人口 ${activeCity.population} / 文化 ${activeCity.culture} / 生産 ${productionDefinition?.label || "未選択"} / 設備 ${activeCity.buildings.length}` : "マップ上の都市かユニットを選択してください");
            this.renderUnitStack(selectedUnit, activeCity);
            this.syncImprovementButtons(selectedUnit);
            setText(this.elements.log, snapshot.events.log.slice(-6).map((entry) => `T${entry.turn} ${entry.message}`).join("\n"));
            this.renderProduction(activeCity);
            this.renderCityDetails(activeCity);
            this.renderResearch(player);
            const terrainPosition = selectedUnit ? { x: selectedUnit.x, y: selectedUnit.y } : activeCity ? { x: activeCity.x, y: activeCity.y } : this.core.selection.tileX === null ? null : { x: this.core.selection.tileX, y: this.core.selection.tileY };
            this.renderTerrainDetails(terrainPosition);
            this.renderDiplomacy(player);
            this.renderEvent(snapshot.events.current);
            if (snapshot.campaign.status === "won" || snapshot.campaign.status === "lost") {
                this.elements.resultOverlay?.removeAttribute("hidden");
                setText(this.elements.resultTitle, snapshot.campaign.status === "won" ? "文明の勝利" : "文明の終焉");
                setText(this.elements.resultText, snapshot.campaign.victoryType === "score" ? "120ターンのスコアを集計しました。" : `勝利条件：${snapshot.campaign.victoryType}`);
            }
        }

        renderProduction(city) {
            const select = this.elements.production;
            const status = this.elements.productionStatus;
            const setText = (element, value) => { if (element) element.textContent = value; };
            if (!select) return;
            select.innerHTML = "";
            const player = this.core.getCiv("player");
            const options = ["warrior", "settler", "scout", "archer", "horseman", "worker", "swordsman", "catapult", "knight", "tank", "artillery", "diplomat", ...Object.keys(BUILDING_DEFS)];
            options.forEach((id) => {
                const option = globalScope.document.createElement("option");
                option.value = id;
                const definition = UNIT_DEFS[id] || BUILDING_DEFS[id];
                option.textContent = `${definition.label} (${this.core.getProductionCost(id, player)})`;
                option.disabled = !this.core.isProductionAvailable(player, id) || (BUILDING_DEFS[id] && city?.buildings.includes(id));
                select.appendChild(option);
            });
            const productionId = city && this.core.isProductionAvailable(player, city.productionId) ? city.productionId : "warrior";
            if (city) select.value = productionId;
            select.disabled = !city;
            if (!city) {
                status?.setAttribute("hidden", "hidden");
                setText(this.elements.productionName, "未選択");
                setText(this.elements.productionProgress, "0 / 0");
                setText(this.elements.productionTurns, "都市を選択してください");
                if (this.elements.productionBar) this.elements.productionBar.style.width = "0%";
                return;
            }
            const civ = this.core.getCiv(city.ownerId);
            const cost = this.core.getProductionCost(productionId, civ);
            const progress = Math.max(0, Math.min(cost, city.production));
            const rate = this.core.cityManager.getProductionRate(city);
            const percent = cost > 0 ? Math.round(progress / cost * 100) : 100;
            const remainingTurns = Math.max(0, Math.ceil((cost - progress) / rate));
            status?.removeAttribute("hidden");
            setText(this.elements.productionName, `${(UNIT_DEFS[productionId] || BUILDING_DEFS[productionId]).label}（毎ターン +${rate}）`);
            setText(this.elements.productionProgress, `完成度 ${progress} / ${cost}（${percent}%）`);
            setText(this.elements.productionTurns, remainingTurns > 0 ? `完成まで約 ${remainingTurns}ターン` : "次のターンに完成");
            if (this.elements.productionBar) {
                this.elements.productionBar.style.width = `${percent}%`;
                this.elements.productionBar.parentElement?.setAttribute("aria-valuenow", String(percent));
            }
        }

        renderUnitStack(selectedUnit, selectedCity) {
            const container = this.elements.unitStack;
            if (!container) return;
            container.innerHTML = "";
            const reference = selectedUnit || (selectedCity ? { x: selectedCity.x, y: selectedCity.y } : null);
            const stack = reference ? this.core.getUnitsAt(reference.x, reference.y, "player") : [];
            if (stack.length < 2) {
                container.setAttribute("hidden", "hidden");
                return;
            }
            container.removeAttribute("hidden");
            const label = globalScope.document.createElement("span");
            label.className = "unit-stack-label";
            label.textContent = `同一タイルのユニット (${stack.length})`;
            const list = globalScope.document.createElement("div");
            list.className = "unit-stack-list";
            stack.forEach((unit) => {
                const button = globalScope.document.createElement("button");
                button.type = "button";
                button.className = unit.id === this.core.selection.unitId ? "selected" : "";
                button.textContent = `${UNIT_DEFS[unit.type].symbol} ${UNIT_DEFS[unit.type].label}`;
                button.setAttribute("aria-pressed", String(unit.id === this.core.selection.unitId));
                button.addEventListener("click", () => {
                    this.core.selectUnit(unit.id);
                    this.syncUi();
                });
                list.appendChild(button);
            });
            if (selectedCity) {
                const cityButton = globalScope.document.createElement("button");
                cityButton.type = "button";
                cityButton.className = !selectedUnit ? "selected" : "";
                cityButton.textContent = `● ${selectedCity.name}`;
                cityButton.addEventListener("click", () => {
                    this.core.selectCity(selectedCity.id);
                    this.syncUi();
                });
                list.appendChild(cityButton);
            }
            container.append(label, list);
        }

        renderResearch(player) {
            const list = this.elements.techList;
            const setText = (element, value) => { if (element) element.textContent = value; };
            if (!list || !player) {
                this.elements.researchStatus?.setAttribute("hidden", "hidden");
                return;
            }
            const tech = TechnologyTree.get(player.researchTarget);
            const rate = this.core.getResearchRate(player);
            if (tech) {
                const progress = Math.max(0, Math.min(tech.cost, player.researchPoints));
                const percent = tech.cost > 0 ? Math.round(progress / tech.cost * 100) : 100;
                const remainingTurns = Math.max(0, Math.ceil((tech.cost - progress) / Math.max(1, rate)));
                this.elements.researchStatus?.removeAttribute("hidden");
                setText(this.elements.researchName, `${tech.label}（毎ターン +${rate}）`);
                setText(this.elements.researchProgress, `研究進捗 ${progress} / ${tech.cost}（${percent}%）`);
                setText(this.elements.researchTurns, remainingTurns > 0 ? `完成まで約 ${remainingTurns}ターン` : "次のターンに完了");
                if (this.elements.researchBar) {
                    this.elements.researchBar.style.width = `${percent}%`;
                    this.elements.researchBar.parentElement?.setAttribute("aria-valuenow", String(percent));
                }
            } else {
                this.elements.researchStatus?.setAttribute("hidden", "hidden");
                setText(this.elements.researchName, "研究対象なし");
                setText(this.elements.researchProgress, "0 / 0");
                setText(this.elements.researchTurns, "全技術を取得しました");
                if (this.elements.researchBar) this.elements.researchBar.style.width = "0%";
            }
            list.innerHTML = "";
            TechnologyTree.getAll().filter((tech) => TechnologyTree.isAvailable(player, tech.id)).slice(0, 8).forEach((tech) => {
                const button = globalScope.document.createElement("button");
                button.type = "button";
                button.textContent = `${tech.label} · ${tech.cost}`;
                button.className = tech.id === player.researchTarget ? "selected" : "";
                button.addEventListener("click", () => { this.core.chooseResearch(tech.id); this.syncUi(); });
                list.appendChild(button);
            });
        }

        renderCityDetails(city) {
            const details = this.elements.cityDetails;
            const setText = (element, value) => { if (element) element.textContent = value; };
            if (!details) return;
            if (!city) {
                details.setAttribute("hidden", "hidden");
                setText(this.elements.cityBuildings, "未建設");
                setText(this.elements.cityUnits, "なし");
                setText(this.elements.cityGrowth, "都市を選択してください");
                return;
            }
            details.removeAttribute("hidden");
            const buildings = city.buildings.map((id) => BUILDING_DEFS[id]?.label).filter(Boolean);
            if (this.elements.cityBuildings) {
                this.elements.cityBuildings.innerHTML = buildings.length ? buildings.map((label) => `<span>${label}</span>`).join("") : "<span>未建設</span>";
            }
            const units = this.core.getUnitsAt(city.x, city.y, city.ownerId);
            if (this.elements.cityUnits) {
                this.elements.cityUnits.textContent = units.length ? units.map((unit) => `${UNIT_DEFS[unit.type].symbol} ${UNIT_DEFS[unit.type].label}（HP ${unit.hp}・移動 ${unit.movementLeft}）`).join(" ／ ") : "なし";
            }
            const yields = this.core.cityManager.calculateYields(city);
            const foodNeed = city.population * 8;
            const foodRate = Math.max(1, yields.food);
            const foodProgress = Math.max(0, city.food);
            const remaining = Math.max(0, Math.ceil((foodNeed - foodProgress) / foodRate));
            if (this.elements.cityGrowth) {
                this.elements.cityGrowth.innerHTML = `<span>人口<strong>${city.population}</strong></span><span>食料<strong>${foodProgress} / ${foodNeed}</strong></span><span>毎ターン<strong>+${foodRate}</strong></span><span>成長まで<strong>${remaining}ターン</strong></span>`;
            }
        }

        renderTerrainDetails(position) {
            const container = this.elements.terrainDetails;
            if (!container) return;
            if (!position) {
                container.textContent = "マップ上のタイルを選択してください";
                return;
            }
            const tile = this.core.map.getTile(position.x, position.y);
            if (!tile || !this.core.map.isDiscovered(position.x, position.y, "player")) {
                container.textContent = "未発見の土地です";
                return;
            }
            const terrain = TERRAIN[tile.terrain];
            const improvement = tile.improvement ? IMPROVEMENT_DEFS[tile.improvement] : null;
            const movement = terrain.move >= 99 ? "進入不可" : `${this.core.getMovementCost({ type: "warrior" }, tile)}（基本 ${terrain.move}）`;
            container.innerHTML = `<strong>${terrain.symbol} ${terrain.label}</strong><span>収益: 食料 ${terrain.food} / 生産 ${terrain.production} / 交易 ${terrain.trade}</span><span>移動コスト: ${movement}</span><span>${improvement ? `改良: ${improvement.label} (${improvement.food || 0}/${improvement.production || 0}/${improvement.trade || 0} 収益, 移動 ${improvement.movement || 0})` : "改良なし"}</span>`;
        }

        syncImprovementButtons(selectedUnit) {
            const tile = selectedUnit ? this.core.map.getTile(selectedUnit.x, selectedUnit.y) : null;
            const civ = this.core.getCiv("player");
            ["road", "farm", "mine"].forEach((improvement) => {
                const button = this.elements.improvements?.[improvement];
                const definition = IMPROVEMENT_DEFS[improvement];
                const canBuild = Boolean(this.core.campaign.status === "running" && selectedUnit && tile && !tile.improvement && selectedUnit.ownerId === "player" && UNIT_DEFS[selectedUnit.type].role === "worker" && selectedUnit.movementLeft > 0 && definition.terrains.includes(tile.terrain) && civ.techs.includes(definition.requiresTech));
                if (button) button.disabled = !canBuild;
            });
        }

        buildSelectedImprovement(improvement) {
            if (this.core.selection.unitId && this.core.unitManager.buildImprovement(this.core.selection.unitId, improvement)) this.syncUi();
        }

        renderDiplomacy(player) {
            const list = this.elements.diplomacyList;
            if (!list || !player) return;
            list.innerHTML = "";
            this.core.civilizations.filter((civ) => civ.id !== "player").forEach((civ) => {
                const value = this.core.getRelationValue("player", civ.id);
                const row = globalScope.document.createElement("div");
                row.className = "diplomacy-row";
                const name = globalScope.document.createElement("div");
                name.className = "diplomacy-name";
                const title = globalScope.document.createElement("strong");
                title.textContent = civ.name;
                const status = globalScope.document.createElement("small");
                status.textContent = `${this.core.getRelationStatus(value)} (${value})`;
                name.append(title, status);
                const actions = globalScope.document.createElement("div");
                actions.className = "diplomacy-actions";
                [{ id: "trade", label: "交易" }, { id: "peace", label: "和平" }, { id: "war", label: "戦争" }].forEach((action) => {
                    const button = globalScope.document.createElement("button");
                    button.type = "button";
                    button.className = "button quiet";
                    button.textContent = action.label;
                    button.disabled = action.id === "trade" && (value <= -30 || player.gold < 10);
                    button.addEventListener("click", () => { this.core.negotiate(civ.id, action.id); this.syncUi(); });
                    actions.appendChild(button);
                });
                row.append(name, actions);
                list.appendChild(row);
            });
        }

        renderEvent(event) {
            const modal = this.elements.eventOverlay;
            const options = this.elements.eventOptions;
            if (!modal || !options) return;
            if (!event) {
                modal.setAttribute("hidden", "hidden");
                return;
            }
            modal.removeAttribute("hidden");
            options.innerHTML = "";
            event.options.forEach((option) => {
                const button = globalScope.document.createElement("button");
                button.type = "button";
                button.textContent = `${option.label}：${option.description}`;
                button.addEventListener("click", () => { this.core.choosePolicy(option.id); this.syncUi(); });
                options.appendChild(button);
            });
        }
    }

    globalScope.ChronicleKingdoms = Object.freeze({
        CivilizationCore,
        CivilizationGame,
        WorldMap,
        CityManager,
        UnitManager,
        CombatResolver,
        TechnologyTree,
        CivilizationAI,
        CivilizationRenderer,
        CivilizationInput,
        TERRAIN,
        UNIT_DEFS,
        BUILDING_DEFS,
        IMPROVEMENT_DEFS,
        UNIT_TECH_REQUIREMENTS,
        BUILDING_TECH_REQUIREMENTS,
        TECHS,
        SAVE_KEY,
        SAVE_VERSION,
    });
    globalScope.CivilizationCore = CivilizationCore;

    if (globalScope.document) {
        const canvas = globalScope.document.querySelector("#ck-canvas");
        if (canvas) {
            const element = (id) => globalScope.document.querySelector(id);
            const game = new CivilizationGame(canvas, {
                seedInput: element("#ck-seed-input"),
                startOverlay: element("#ck-start-overlay"),
                resultOverlay: element("#ck-result-overlay"),
                eventOverlay: element("#ck-event-overlay"),
                eventOptions: element("#ck-event-options"),
                status: element("#ck-status"),
                turn: element("#ck-turn"),
                era: element("#ck-era"),
                civName: element("#ck-civ-name"),
                gold: element("#ck-gold"),
                score: element("#ck-score"),
                research: element("#ck-research"),
                seed: element("#ck-seed"),
                selectedTitle: element("#ck-selected-title"),
                selectedDetail: element("#ck-selected-detail"),
                unitStack: element("#ck-unit-stack"),
                production: element("#ck-production"),
                productionStatus: element("#ck-production-status"),
                productionName: element("#ck-production-name"),
                productionProgress: element("#ck-production-progress"),
                productionBar: element("#ck-production-bar"),
                productionTurns: element("#ck-production-turns"),
                researchStatus: element("#ck-research-status"),
                researchName: element("#ck-research-name"),
                researchProgress: element("#ck-research-progress"),
                researchBar: element("#ck-research-bar"),
                researchTurns: element("#ck-research-turns"),
                cityDetails: element("#ck-city-details"),
                cityBuildings: element("#ck-city-buildings"),
                cityUnits: element("#ck-city-units"),
                cityGrowth: element("#ck-city-growth"),
                terrainDetails: element("#ck-terrain-details"),
                techList: element("#ck-tech-list"),
                log: element("#ck-log"),
                improvements: {
                    road: element("#ck-improvement-road"),
                    farm: element("#ck-improvement-farm"),
                    mine: element("#ck-improvement-mine"),
                },
                diplomacyList: element("#ck-diplomacy-list"),
                resultTitle: element("#ck-result-title"),
                resultText: element("#ck-result-text"),
            });
            globalScope.chronicleKingdomsGame = game;
            element("#ck-start-button")?.addEventListener("click", () => game.start());
            element("#ck-new-seed-button")?.addEventListener("click", () => { const seed = Math.floor(Math.random() * 2147483647); element("#ck-seed-input").value = seed; });
            element("#ck-new-game-button")?.addEventListener("click", () => game.newCampaign(element("#ck-seed-input").value));
            element("#ck-end-turn-button")?.addEventListener("click", () => game.endTurn());
            element("#ck-found-button")?.addEventListener("click", () => game.foundSelectedCity());
            element("#ck-clear-button")?.addEventListener("click", () => game.clearSelection());
            ["road", "farm", "mine"].forEach((improvement) => element(`#ck-improvement-${improvement}`)?.addEventListener("click", () => game.buildSelectedImprovement(improvement)));
            element("#ck-production")?.addEventListener("change", (event) => { if (game.core.selection.cityId) game.core.setCityProduction(game.core.selection.cityId, event.target.value); game.syncUi(); });
            element("#ck-copy-seed-button")?.addEventListener("click", async () => {
                try {
                    const shareUrl = new URL(globalScope.location.href);
                    shareUrl.searchParams.set("seed", String(game.core.campaign.seed));
                    await globalScope.navigator.clipboard.writeText(shareUrl.toString());
                } catch { /* Clipboard is optional. */ }
            });
            element("#ck-load-button")?.addEventListener("click", () => game.loadCampaign());
        }
    }
}(typeof globalThis !== "undefined" ? globalThis : window));
