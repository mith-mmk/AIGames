import * as THREE from "three";

const TILE = { WALL: 0, FLOOR: 1, UP: 2, DOWN: 3 };
const DIRS = [
    { x: 0, y: -1, name: "北" },
    { x: 1, y: 0, name: "東" },
    { x: 0, y: 1, name: "南" },
    { x: -1, y: 0, name: "西" },
];
const ASSET_ROOT = "./assets/rougelike/";
const ASSET_VERSION = "20260503-alpha2";
const MAX_ITEMS = 10;
const ASSET_FILES = {
    floor: "floor.png",
    wall: "wall.png",
    door: "door.png",
    chest: "chest.png",
    trap: "trap.png",
    teleporter: "teleporter.png",
    downStairs: "stairs-down.png",
    upStairs: "stairs-up.png",
    hpPotion: "potion-hp.png",
    mpPotion: "potion-mp.png",
    fullPotion: "potion-full.png",
    fireScroll: "scroll-fire.png",
    waterScroll: "scroll-water.png",
    windScroll: "scroll-wind.png",
    earthScroll: "scroll-earth.png",
    healScroll: "scroll-heal.png",
    buffScroll: "scroll-buff.png",
    "equip-sword": "sword.png",
    "equip-spear": "spear.png",
    "equip-bow": "bow.png",
    "equip-staff": "staff.png",
    "equip-armor": "armor.png",
    "equip-shield": "shield.png",
    "equip-helmet": "helmet.png",
    slime: "slime.png",
    skeleton: "skeleton.png",
    goblin: "goblin.png",
    bat: "bat.png",
    ogre: "ogre.png",
    wolf: "wolf.png",
    lich: "lich.png",
    dragon: "dragon.png",
    boss: "boss.png",
    "monster-kobold": "monster-kobold.png",
    "monster-zombie": "monster-zombie.png",
    "monster-lizardman": "monster-lizardman.png",
    "monster-harpy": "monster-harpy.png",
    "monster-spider": "monster-spider.png",
    "monster-ghost": "monster-ghost.png",
    "monster-toad": "monster-toad.png",
    "monster-amoeba": "monster-amoeba.png",
    "monster-wasp": "monster-wasp.png",
    "monster-viper": "monster-viper.png",
    "monster-orc": "monster-orc.png",
    "monster-troll": "monster-troll.png",
    "monster-banshee": "monster-banshee.png",
    "monster-turtle": "monster-turtle.png",
    "monster-beetle": "monster-beetle.png",
    "monster-golem": "monster-golem.png",
    "monster-mimic": "monster-mimic.png",
    "monster-minotaur": "monster-minotaur.png",
    "monster-king-slime": "monster-king-slime.png",
    "monster-dullahan": "monster-dullahan.png",
    "monster-basilisk": "monster-basilisk.png",
    "monster-treant": "monster-treant.png",
    "monster-phoenix": "monster-phoenix.png",
    "monster-griffin": "monster-griffin.png",
    "monster-wyvern": "monster-wyvern.png",
    "monster-chimera": "monster-chimera.png",
    "monster-cyclops": "monster-cyclops.png",
    "monster-hydra": "monster-hydra.png",
    "monster-medusa": "monster-medusa.png",
    "monster-lesser-demon": "monster-lesser-demon.png",
    "monster-vampire": "monster-vampire.png",
    "monster-greater-demon": "monster-greater-demon.png",
    "monster-giant": "monster-giant.png",
    medal: "medal.png",
    inn: "inn.png",
    shop: "shop.png",
};
const OPAQUE_TEXTURE_KEYS = new Set(["floor", "wall", "downStairs", "upStairs"]);

const CLASS_DEFS = {
    warrior: { name: "戦士", desc: "HP・STR・VITが高い。近接戦の安定型。", hp: 1.2, mp: 0.5, str: 1.5, int: 1.0, dex: 1.0, vit: 1.2 },
    mage: { name: "魔法使い", desc: "MP・INTが高い。魔法で敵を崩す。", hp: 0.8, mp: 1.5, str: 0.5, int: 1.5, dex: 1.0, vit: 1.0 },
    thief: { name: "盗賊", desc: "DEXが高い。罠の発見と逃走が得意。", hp: 0.9, mp: 0.5, str: 1.0, int: 1.0, dex: 1.5, vit: 0.8 },
    priest: { name: "僧侶", desc: "MP・INT・VITが高い。回復に強い。", hp: 1.0, mp: 1.5, str: 0.5, int: 1.5, dex: 1.0, vit: 1.2 },
    adventurer: { name: "冒険者", desc: "全能力が平均的。扱いやすい。", hp: 1.0, mp: 1.0, str: 1.0, int: 1.0, dex: 1.0, vit: 1.0 },
};

const MONSTER_DEFS = [
    ["スライム", 1, 3, 0.7], ["コボルト", 1, 3, 1], ["スケルトン", 1, 3, 1], ["ゴブリン", 1, 3, 1],
    ["ゾンビ", 2, 5, 0.7], ["リザードマン", 2, 5, 1], ["ハーピー", 2, 5, 1.2], ["コウモリ", 2, 5, 1.4],
    ["オーガ", 4, 8, 0.9], ["ゴースト", 4, 8, 1.1], ["ジャイアントワスプ", 4, 8, 1.3],
    ["オーク", 6, 12, 1], ["ウルフ", 6, 12, 1.4], ["トロール", 6, 12, 0.8], ["ミミック", 6, 12, 0],
    ["ミノタウロス", 10, 20, 1], ["リッチ", 10, 20, 1], ["バジリスク", 10, 20, 0.9],
    ["フェニックス", 15, 30, 1.5], ["グリフォン", 15, 30, 1.4], ["ヒドラ", 15, 30, 0.8],
    ["グレーターデーモン", 20, 30, 1], ["ジャイアント", 20, 30, 0.8], ["ドラゴン", 30, 40, 1],
];

const ITEM_DEFS = {
    hpPotion: { name: "HP回復ポーション", type: "potion", price: 40, use: "hp", power: 50 },
    hpPotionPlus: { name: "HP回復ポーション+", type: "potion", price: 80, use: "hp", power: 100 },
    mpPotion: { name: "MP回復ポーション", type: "potion", price: 45, use: "mp", power: 30 },
    curePotion: { name: "ステータス回復ポーション", type: "potion", price: 70, use: "cure", power: 0 },
    mpPotionPlus: { name: "MP回復ポーション+", type: "potion", price: 75, use: "mp", power: 50 },
    fullPotion: { name: "万能回復ポーション", type: "potion", price: 160, use: "full", power: 0 },
    fireScroll: { name: "ファイアボールのスクロール", type: "scroll", price: 80, spell: "fire" },
    waterScroll: { name: "ウォーターランスのスクロール", type: "scroll", price: 75, spell: "water" },
    windScroll: { name: "ウィンドカッターのスクロール", type: "scroll", price: 75, spell: "wind" },
    earthScroll: { name: "アーススパイクのスクロール", type: "scroll", price: 75, spell: "earth" },
    iceScroll: { name: "アイスシャードのスクロール", type: "scroll", price: 80, spell: "ice" },
    lightningScroll: { name: "ライトニングのスクロール", type: "scroll", price: 95, spell: "lightning" },
    sleepScroll: { name: "スリープのスクロール", type: "scroll", price: 80, spell: "sleep" },
    paralyzeScroll: { name: "パラライズのスクロール", type: "scroll", price: 90, spell: "paralyze" },
    blindScroll: { name: "ブラインドのスクロール", type: "scroll", price: 70, spell: "blind" },
    teleportScroll: { name: "テレポートのスクロール", type: "scroll", price: 90, spell: "teleport" },
    freezeScroll: { name: "フリーズのスクロール", type: "scroll", price: 95, spell: "freeze" },
    gravityScroll: { name: "グラビティのスクロール", type: "scroll", price: 90, spell: "gravity" },
    healScroll: { name: "治療のスクロール", type: "scroll", price: 70, spell: "heal" },
    recoverScroll: { name: "回復のスクロール", type: "scroll", price: 100, spell: "recover" },
    buffScroll: { name: "ステータスバフのスクロール", type: "scroll", price: 90, spell: "buff" },
    medal: { name: "勝利のメダル", type: "treasure", price: 5000 },
};

const EQUIP_DEFS = {
    sword: { name: "剣", slot: "weapon", price: 160, atk: 9, str: 3 },
    spear: { name: "槍", slot: "weapon", price: 190, atk: 11, dex: 1 },
    bow: { name: "弓", slot: "weapon", price: 180, atk: 8, dex: 4 },
    staff: { name: "魔法の杖", slot: "weapon", price: 210, atk: 5, int: 5 },
    armor: { name: "鎧", slot: "armor", price: 180, def: 8, vit: 3 },
    shield: { name: "盾", slot: "armor", price: 150, def: 6, vit: 2 },
    helmet: { name: "ヘルメット", slot: "armor", price: 120, def: 4, vit: 1 },
};

const SPELLS = {
    fire: { name: "ファイアボール", mp: 8, kind: "damage", power: 20 },
    water: { name: "ウォーターランス", mp: 7, kind: "damage", power: 16, debuff: "str" },
    wind: { name: "ウィンドカッター", mp: 7, kind: "damage", power: 15, status: "盲目" },
    earth: { name: "アーススパイク", mp: 8, kind: "damage", power: 18, debuff: "dex" },
    ice: { name: "アイスシャード", mp: 7, kind: "damage", power: 17, status: "凍結" },
    lightning: { name: "ライトニング", mp: 10, kind: "damage", power: 24 },
    sleep: { name: "スリープ", mp: 8, kind: "status", status: "睡眠" },
    paralyze: { name: "パラライズ", mp: 9, kind: "status", status: "麻痺" },
    blind: { name: "ブラインド", mp: 6, kind: "status", status: "盲目" },
    teleport: { name: "テレポート", mp: 10, kind: "teleport" },
    freeze: { name: "フリーズ", mp: 10, kind: "status", status: "凍結" },
    gravity: { name: "グラビティ", mp: 9, kind: "damage", power: 14 },
    cure: { name: "キュア", mp: 8, kind: "heal", power: 35 },
    heal: { name: "ヒール", mp: 10, kind: "cure" },
    recover: { name: "回復", mp: 12, kind: "recover", power: 35 },
    buff: { name: "ステータスバフ", mp: 8, kind: "buff" },
    analyze: { name: "アナライズ", mp: 4, kind: "analyze" },
};

const dom = {
    classScreen: document.getElementById("rc-class-screen"),
    classList: document.getElementById("rc-class-list"),
    gameScreen: document.getElementById("rc-game-screen"),
    canvas: document.getElementById("rc-canvas"),
    minimap: document.getElementById("rc-minimap"),
    objective: document.getElementById("rc-objective"),
    groundActions: document.getElementById("rc-ground-actions"),
    log: document.getElementById("rc-log"),
    modalLayer: document.getElementById("rc-modal-layer"),
    modalTitle: document.getElementById("rc-modal-title"),
    modalBody: document.getElementById("rc-modal-body"),
    modalActions: document.getElementById("rc-modal-actions"),
};

const hudIds = ["class-name", "floor", "gold", "hp-text", "mp-text", "exp-text", "level", "str", "int", "dex", "vit", "status", "weapon", "armor"];
const hud = Object.fromEntries(hudIds.map((id) => [id, document.getElementById(`rc-${id}`)]));
hud.hpBar = document.getElementById("rc-hp-bar");
hud.mpBar = document.getElementById("rc-mp-bar");
hud.expBar = document.getElementById("rc-exp-bar");

const state = {
    floor: 1,
    maxFloor: 12,
    map: [],
    rooms: [],
    player: null,
    entities: [],
    items: [],
    traps: [],
    secrets: [],
    logs: [],
    mode: "class",
    combat: null,
    dirtyScene: true,
};

const render = {
    renderer: null,
    scene: null,
    camera: null,
    root: null,
    playerLight: null,
    textures: {},
    meshes: [],
    sprites: [],
};

function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function chance(rate) {
    return Math.random() < rate;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function pick(items) {
    return items[rand(0, items.length - 1)];
}

function keyOf(pos) {
    return `${pos.x},${pos.y}`;
}

function requiredExp(level) {
    return 100 * level * level;
}

function makePlayer(classKey) {
    const cls = CLASS_DEFS[classKey];
    const level = 1;
    const stats = {
        str: Math.round((5 + level * rand(1, 3)) * cls.str),
        int: Math.round((5 + level * rand(1, 3)) * cls.int),
        dex: Math.round((5 + level * rand(1, 3)) * cls.dex),
        vit: Math.round((5 + level * rand(1, 3)) * cls.vit),
    };
    const maxHp = Math.round((100 + level * rand(1, 20) + stats.vit * 5) * cls.hp);
    const maxMp = Math.round((50 + level * rand(1, 10) + stats.int * 5) * cls.mp);
    return {
        classKey,
        className: cls.name,
        level,
        exp: 0,
        gold: 80,
        hp: maxHp,
        maxHp,
        mp: maxMp,
        maxMp,
        stats,
        baseStats: { ...stats },
        x: 1,
        y: 1,
        dir: 0,
        status: [],
        statDamage: { str: 0, int: 0, dex: 0, vit: 0 },
        buffs: 0,
        inventory: [{ kind: "item", id: "hpPotion" }, { kind: "item", id: "mpPotion" }, { kind: "item", id: "fireScroll" }],
        equipment: { weapon: null, armor: null },
        hasMedal: false,
    };
}

function effectiveStats() {
    const p = state.player;
    const stats = { ...p.stats };
    for (const key of Object.keys(stats)) {
        stats[key] = Math.max(1, stats[key] - (p.statDamage[key] || 0));
    }
    for (const id of Object.values(p.equipment)) {
        if (!id) {
            continue;
        }
        const eq = EQUIP_DEFS[id];
        stats.str += eq.str || 0;
        stats.int += eq.int || 0;
        stats.dex += eq.dex || 0;
        stats.vit += eq.vit || 0;
    }
    if (p.buffs > 0) {
        stats.str += 4;
        stats.int += 4;
        stats.dex += 4;
        stats.vit += 4;
    }
    return stats;
}

function attackPower(actor) {
    const stats = actor === state.player ? effectiveStats() : actor.stats;
    const weapon = actor === state.player && actor.equipment.weapon ? EQUIP_DEFS[actor.equipment.weapon] : null;
    return stats.str + (weapon?.atk || 4);
}

function defensePower(actor) {
    const stats = actor === state.player ? effectiveStats() : actor.stats;
    const armor = actor === state.player && actor.equipment.armor ? EQUIP_DEFS[actor.equipment.armor] : null;
    return Math.floor(stats.vit / 2) + (armor?.def || 0);
}

function initClasses() {
    dom.classList.replaceChildren();
    for (const [key, cls] of Object.entries(CLASS_DEFS)) {
        const button = document.createElement("button");
        button.className = "rc-class-card";
        button.innerHTML = `<strong>${cls.name}</strong><span>${cls.desc}</span>`;
        button.addEventListener("click", () => startGame(key));
        dom.classList.appendChild(button);
    }
}

function startGame(classKey) {
    state.maxFloor = rand(10, 20);
    state.player = makePlayer(classKey);
    state.floor = 1;
    state.mode = "play";
    state.logs = [];
    dom.classScreen.classList.add("hidden");
    dom.gameScreen.classList.remove("hidden");
    initThree();
    generateFloor(1, "up");
    log(`${state.player.className}は迷宮の入口に立った。`, "good");
    updateAll();
    animate();
}

function makeEmptyMap(width, height) {
    return Array.from({ length: height }, () => Array.from({ length: width }, () => TILE.WALL));
}

function carveRoom(room) {
    for (let y = room.y; y < room.y + room.h; y += 1) {
        for (let x = room.x; x < room.x + room.w; x += 1) {
            state.map[y][x] = TILE.FLOOR;
        }
    }
}

function carveH(x1, x2, y) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x += 1) {
        state.map[y][x] = TILE.FLOOR;
    }
}

function carveV(y1, y2, x) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y += 1) {
        state.map[y][x] = TILE.FLOOR;
    }
}

function roomCenter(room) {
    return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function generateFloor(floor, enterFrom) {
    const width = 28;
    const height = 28;
    state.map = makeEmptyMap(width, height);
    state.rooms = [];
    state.entities = [];
    state.items = [];
    state.traps = [];
    state.secrets = [];
    state.floor = floor;

    let attempts = 0;
    while (state.rooms.length < 10 && attempts < 180) {
        attempts += 1;
        const room = { x: rand(2, width - 9), y: rand(2, height - 9), w: rand(4, 8), h: rand(4, 8) };
        const overlaps = state.rooms.some((other) => (
            room.x < other.x + other.w + 2 && room.x + room.w + 2 > other.x &&
            room.y < other.y + other.h + 2 && room.y + room.h + 2 > other.y
        ));
        if (!overlaps) {
            carveRoom(room);
            if (state.rooms.length > 0) {
                const prev = roomCenter(state.rooms[state.rooms.length - 1]);
                const next = roomCenter(room);
                if (chance(0.5)) {
                    carveH(prev.x, next.x, prev.y);
                    carveV(prev.y, next.y, next.x);
                } else {
                    carveV(prev.y, next.y, prev.x);
                    carveH(prev.x, next.x, next.y);
                }
            }
            state.rooms.push(room);
        }
    }

    const first = roomCenter(state.rooms[0]);
    const last = roomCenter(state.rooms[state.rooms.length - 1]);
    state.map[first.y][first.x] = TILE.UP;
    state.map[last.y][last.x] = floor === state.maxFloor ? TILE.FLOOR : TILE.DOWN;
    const start = enterFrom === "down" ? last : first;
    state.player.x = start.x;
    state.player.y = start.y;
    state.player.dir = 0;

    populateFloor(last);
    addSecretRoom();
    state.dirtyScene = true;
}

function randomFloorCell(occupied = new Set()) {
    for (let tries = 0; tries < 200; tries += 1) {
        const room = pick(state.rooms);
        const pos = { x: rand(room.x, room.x + room.w - 1), y: rand(room.y, room.y + room.h - 1) };
        if (state.map[pos.y][pos.x] !== TILE.WALL && !occupied.has(keyOf(pos)) && (pos.x !== state.player.x || pos.y !== state.player.y)) {
            occupied.add(keyOf(pos));
            return pos;
        }
    }
    return roomCenter(pick(state.rooms));
}

function populateFloor(lastRoomCenter) {
    const occupied = new Set([keyOf(state.player)]);
    const monsterCount = rand(4, 7) + Math.floor(state.floor / 3);
    for (let i = 0; i < monsterCount; i += 1) {
        const pos = randomFloorCell(occupied);
        state.entities.push(makeMonster(pos.x, pos.y));
    }

    const itemCount = rand(4, 8);
    for (let i = 0; i < itemCount; i += 1) {
        const pos = randomFloorCell(occupied);
        state.items.push({ ...pos, item: randomLoot(false), chest: chance(0.35) });
    }

    const trapCount = rand(5, 9);
    for (let i = 0; i < trapCount; i += 1) {
        const pos = randomFloorCell(occupied);
        state.traps.push({ ...pos, type: pick(["teleport", "poison", "pit", "bomb", "alarm", "needle"]), hidden: chance(0.65) });
    }

    if (state.floor === state.maxFloor) {
        state.items.push({ x: lastRoomCenter.x, y: lastRoomCenter.y, item: { kind: "item", id: "medal" }, chest: false });
        state.entities.push(makeBoss(lastRoomCenter.x + 1, lastRoomCenter.y));
    }
}

function addSecretRoom() {
    const base = pick(state.rooms);
    const x = clamp(base.x + base.w + 1, 3, state.map[0].length - 5);
    const y = clamp(base.y + 1, 3, state.map.length - 5);
    const door = { x: x - 1, y: y + 1 };
    if (tileAt(door.x - 1, door.y) === TILE.WALL) {
        return;
    }
    for (let yy = y; yy < y + 3; yy += 1) {
        for (let xx = x; xx < x + 3; xx += 1) {
            state.map[yy][xx] = TILE.FLOOR;
        }
    }
    state.map[door.y][door.x] = TILE.WALL;
    state.secrets.push({ ...door, open: false, roomX: x + 1, roomY: y + 1 });
    state.items.push({ x: x + 1, y: y + 1, item: randomLoot(true), chest: true });
    state.entities.push(makeMonster(x + 2, y + 1));
}

function makeMonster(x, y) {
    const candidates = MONSTER_DEFS.filter(([, min, max]) => state.floor >= min - 1 && state.floor <= max + 2);
    const [name, min, max, speed] = pick(candidates.length ? candidates : MONSTER_DEFS);
    const level = clamp(rand(min, max) + Math.floor(state.floor / 2), 1, 40);
    const maxHp = 24 + level * rand(5, 9);
    return {
        id: crypto.randomUUID(),
        name,
        level,
        x,
        y,
        hp: maxHp,
        maxHp,
        stats: {
            str: 4 + level * 2,
            int: 3 + level,
            dex: Math.max(1, Math.round((4 + level) * speed)),
            vit: 3 + level,
        },
        status: [],
        exp: level * 10,
        gold: rand(8, 22) * level,
    };
}

function makeBoss(x, y) {
    const level = Math.max(12, state.maxFloor + rand(6, 12));
    const maxHp = 140 + level * 14;
    return {
        id: crypto.randomUUID(),
        name: "迷宮の番人",
        level,
        x,
        y,
        hp: maxHp,
        maxHp,
        stats: {
            str: 12 + level * 3,
            int: 10 + level * 2,
            dex: 8 + level,
            vit: 12 + level * 2,
        },
        status: [],
        exp: level * 20,
        gold: level * 60,
        boss: true,
    };
}

function randomLoot(allowEquip = true) {
    if (allowEquip && chance(0.28)) {
        return { kind: "equip", id: pick(Object.keys(EQUIP_DEFS)) };
    }
    return { kind: "item", id: pick(Object.keys(ITEM_DEFS).filter((id) => id !== "medal")) };
}

function loadGameTextures(loader) {
    for (const [key, file] of Object.entries(ASSET_FILES)) {
        const texture = loader.load(`${ASSET_ROOT}codex/${file}?v=${ASSET_VERSION}`, () => {
            state.dirtyScene = true;
        });
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.generateMipmaps = OPAQUE_TEXTURE_KEYS.has(key);
        texture.minFilter = OPAQUE_TEXTURE_KEYS.has(key) ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        render.textures[key] = texture;
    }
    render.textures.scroll = render.textures.fireScroll;
    render.textures.equipFallback = render.textures["equip-sword"];
}

function textureForItem(item) {
    if (item.kind === "equip") {
        return render.textures[`equip-${item.id}`] || render.textures.equipFallback || render.textures.scroll;
    }
    const def = ITEM_DEFS[item.id];
    if (item.id === "medal") {
        return render.textures.medal;
    }
    if (def?.type === "potion") {
        if (def.use === "mp") {
            return render.textures.mpPotion;
        }
        if (def.use === "full" || def.use === "cure") {
            return render.textures.fullPotion;
        }
        return render.textures.hpPotion;
    }
    const scrollMap = {
        fire: "fireScroll",
        water: "waterScroll",
        wind: "windScroll",
        earth: "earthScroll",
        heal: "healScroll",
        recover: "healScroll",
        buff: "buffScroll",
    };
    return render.textures[scrollMap[def?.spell] || "scroll"];
}

function textureForMonster(enemy) {
    if (enemy.boss) {
        return render.textures.boss;
    }
    const monsterTextureMap = [
        ["キングスライム", "monster-king-slime"],
        ["スライム", "slime"],
        ["コボルト", "monster-kobold"],
        ["スケルトン", "skeleton"],
        ["ゴブリン", "goblin"],
        ["ゾンビ", "monster-zombie"],
        ["リザードマン", "monster-lizardman"],
        ["ハーピー", "monster-harpy"],
        ["コウモリ", "bat"],
        ["ヒュージスパイダー", "monster-spider"],
        ["ジャイアントスパイダー", "monster-spider"],
        ["オーガ", "ogre"],
        ["ゴースト", "monster-ghost"],
        ["ジャイアントトード", "monster-toad"],
        ["ジャイアントアメーバ", "monster-amoeba"],
        ["ジャイアントワスプ", "monster-wasp"],
        ["ジャイアントヴァイパー", "monster-viper"],
        ["オーク", "monster-orc"],
        ["ウルフ", "wolf"],
        ["トロール", "monster-troll"],
        ["トロル", "monster-troll"],
        ["バンシー", "monster-banshee"],
        ["ジャイアントタートル", "monster-turtle"],
        ["キラービートル", "monster-beetle"],
        ["ゴーレム", "monster-golem"],
        ["ミミック", "monster-mimic"],
        ["ミノタウロス", "monster-minotaur"],
        ["デュラハン", "monster-dullahan"],
        ["リッチ", "lich"],
        ["バジリスク", "monster-basilisk"],
        ["トレント", "monster-treant"],
        ["フェニックス", "monster-phoenix"],
        ["グリフォン", "monster-griffin"],
        ["ワイバーン", "monster-wyvern"],
        ["キメラ", "monster-chimera"],
        ["サイクロプス", "monster-cyclops"],
        ["ヒドラ", "monster-hydra"],
        ["メデューサ", "monster-medusa"],
        ["レッサーデーモン", "monster-lesser-demon"],
        ["ヴァンパイア", "monster-vampire"],
        ["グレーターデーモン", "monster-greater-demon"],
        ["ジャイアント", "monster-giant"],
        ["ドラゴン", "dragon"],
    ];
    const found = monsterTextureMap.find(([name]) => enemy.name.includes(name));
    if (found) {
        return render.textures[found[1]];
    }
    if (enemy.name.includes("ドラゴン")) {
        return render.textures.dragon;
    }
    if (enemy.name.includes("リッチ") || enemy.name.includes("ゴースト")) {
        return render.textures.lich;
    }
    if (enemy.name.includes("ウルフ")) {
        return render.textures.wolf;
    }
    if (enemy.name.includes("オーガ") || enemy.name.includes("オーク") || enemy.name.includes("トロ")) {
        return render.textures.ogre;
    }
    if (enemy.name.includes("コウモリ") || enemy.name.includes("ハーピー")) {
        return render.textures.bat;
    }
    if (enemy.name.includes("ゴブリン") || enemy.name.includes("コボルト")) {
        return render.textures.goblin;
    }
    if (enemy.name.includes("スケルトン")) {
        return render.textures.skeleton;
    }
    return render.textures.slime;
}

function log(text, tone = "") {
    state.logs.unshift({ text, tone });
    state.logs = state.logs.slice(0, 12);
    renderLog();
}

function renderLog() {
    dom.log.replaceChildren();
    for (const entry of state.logs) {
        const line = document.createElement("div");
        line.className = `rc-log-line ${entry.tone ? `rc-log-${entry.tone}` : ""}`;
        line.textContent = entry.text;
        dom.log.appendChild(line);
    }
}

function tileAt(x, y) {
    if (y < 0 || y >= state.map.length || x < 0 || x >= state.map[0].length) {
        return TILE.WALL;
    }
    return state.map[y][x];
}

function entityAt(x, y) {
    return state.entities.find((entity) => entity.x === x && entity.y === y);
}

function itemsAt(x, y) {
    return state.items.filter((item) => item.x === x && item.y === y);
}

function trapAt(x, y) {
    return state.traps.find((trap) => trap.x === x && trap.y === y);
}

function movePlayer(dx, dy) {
    if (state.mode !== "play") {
        return;
    }
    const nx = state.player.x + dx;
    const ny = state.player.y + dy;
    if (tileAt(nx, ny) === TILE.WALL) {
        const secret = state.secrets.find((entry) => entry.x === nx && entry.y === ny);
        if (secret?.open) {
            state.player.x = nx;
            state.player.y = ny;
            afterPlayerTurn();
            return;
        }
        log("壁がある。", "warn");
        return;
    }
    const enemy = entityAt(nx, ny);
    if (enemy) {
        openCombat(enemy);
        return;
    }
    state.player.x = nx;
    state.player.y = ny;
    afterPlayerTurn();
}

function afterPlayerTurn() {
    handleTrap();
    moveMonsters();
    tickStatuses();
    updateAll();
}

function tickStatuses() {
    const p = state.player;
    if (p.status.includes("毒")) {
        p.hp = Math.max(0, p.hp - Math.max(2, Math.floor(p.maxHp * 0.03)));
        log("毒でHPが減った。", "bad");
    }
    if (p.buffs > 0) {
        p.buffs -= 1;
    }
    if (p.hp <= 0) {
        showResult(false, `B${state.floor}Fで力尽きた。`);
    }
}

function moveMonsters() {
    for (const monster of state.entities) {
        if (monster.status.includes("睡眠") || monster.status.includes("凍結") || monster.status.includes("麻痺")) {
            continue;
        }
        const distance = Math.abs(monster.x - state.player.x) + Math.abs(monster.y - state.player.y);
        if (distance === 1) {
            openCombat(monster);
            return;
        }
        if (distance < 7 || chance(0.35)) {
            const options = DIRS
                .map((dir) => ({ x: monster.x + dir.x, y: monster.y + dir.y }))
                .filter((pos) => tileAt(pos.x, pos.y) !== TILE.WALL && !entityAt(pos.x, pos.y) && !(pos.x === state.player.x && pos.y === state.player.y))
                .sort((a, b) => (
                    Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y) -
                    Math.abs(b.x - state.player.x) - Math.abs(b.y - state.player.y)
                ));
            if (options[0]) {
                monster.x = options[0].x;
                monster.y = options[0].y;
            }
        }
    }
}

function handleTrap() {
    const trap = trapAt(state.player.x, state.player.y);
    if (!trap) {
        return;
    }
    const stats = effectiveStats();
    const detect = stats.dex * 0.025 + stats.int * 0.01;
    if (trap.hidden && chance(detect)) {
        trap.hidden = false;
        log("罠を見抜いて踏みとどまった。", "good");
        return;
    }
    state.traps = state.traps.filter((entry) => entry !== trap);
    applyTrap(trap);
}

function applyTrap(trap) {
    const p = state.player;
    const stats = effectiveStats();
    if (trap.type === "teleport") {
        const pos = randomFloorCell();
        p.x = pos.x;
        p.y = pos.y;
        log("テレポータで飛ばされた。", "warn");
    } else if (trap.type === "poison") {
        if (!p.status.includes("毒")) {
            p.status.push("毒");
        }
        p.statDamage.vit += 1;
        p.statDamage.dex += 1;
        log("毒針を受け、VITとDEXが下がった。", "bad");
    } else if (trap.type === "pit") {
        p.hp -= rand(15, 32);
        log("落とし穴でダメージを受けた。", "bad");
        if (state.floor < state.maxFloor) {
            generateFloor(state.floor + 1, "up");
        }
    } else if (trap.type === "bomb") {
        if (chance(stats.dex * 0.02)) {
            log("爆発物を回避した。", "good");
        } else {
            p.hp -= rand(22, 44);
            log("爆発に巻き込まれた。", "bad");
        }
    } else if (trap.type === "alarm") {
        const pos = randomFloorCell();
        state.entities.push(makeMonster(pos.x, pos.y));
        log("警報でモンスターが現れた。", "warn");
    } else {
        if (chance((stats.dex + stats.int) * 0.012)) {
            log("隠し針を回避した。", "good");
        } else {
            p.hp -= rand(10, 26);
            p.statDamage.str += 1;
            log("隠し針が刺さり、STRが下がった。", "bad");
        }
    }
}

function interact() {
    if (state.mode !== "play") {
        return;
    }
    const hereItems = itemsAt(state.player.x, state.player.y);
    if (hereItems.length) {
        pickUp(hereItems[0]);
        return;
    }
    const tile = tileAt(state.player.x, state.player.y);
    if (tile === TILE.DOWN) {
        generateFloor(state.floor + 1, "up");
        log(`B${state.floor}Fへ降りた。`, "good");
        updateAll();
        return;
    }
    if (tile === TILE.UP) {
        if (state.floor === 1) {
            openTown();
        } else {
            generateFloor(state.floor - 1, "down");
            log(`B${state.floor}Fへ上った。`, "good");
            updateAll();
        }
        return;
    }
    log("周囲を調べた。", "");
    revealNearbyTraps();
}

function revealNearbyTraps() {
    const stats = effectiveStats();
    let foundTraps = 0;
    let foundSecrets = 0;
    for (const trap of state.traps) {
        const distance = Math.abs(trap.x - state.player.x) + Math.abs(trap.y - state.player.y);
        if (distance <= 2 && trap.hidden && chance(stats.dex * 0.05)) {
            trap.hidden = false;
            foundTraps += 1;
        }
    }
    const dir = DIRS[state.player.dir];
    const front = { x: state.player.x + dir.x, y: state.player.y + dir.y };
    const secret = state.secrets.find((entry) => entry.x === front.x && entry.y === front.y && !entry.open);
    if (secret && chance(0.35 + stats.int * 0.015 + stats.dex * 0.015)) {
        secret.open = true;
        state.map[secret.y][secret.x] = TILE.FLOOR;
        foundSecrets += 1;
        log("隠し扉を見つけた。奥に小部屋がある。", "good");
    }
    if (foundTraps > 0) {
        log(`${foundTraps}個の罠を見つけた。`, "good");
    }
    if (foundSecrets > 0) {
        log(`${foundSecrets}個の隠し扉を開いた。`, "good");
    }
    state.dirtyScene = true;
}

function pickUp(entry) {
    if (state.player.inventory.length >= MAX_ITEMS && entry.item.id !== "medal") {
        log("所持品がいっぱいだ。", "warn");
        return;
    }
    state.items = state.items.filter((item) => item !== entry);
    if (entry.item.id === "medal") {
        state.player.hasMedal = true;
    }
    state.player.inventory.push(entry.item);
    log(`${itemName(entry.item)}を拾った。`, "good");
    updateAll();
}

function itemName(item) {
    if (item.kind === "equip") {
        return EQUIP_DEFS[item.id].name;
    }
    return ITEM_DEFS[item.id].name;
}

function openCombat(enemy) {
    state.mode = "combat";
    state.combat = { enemy, defending: false };
    renderCombat();
}

function renderCombat() {
    const enemy = state.combat.enemy;
    openModal(`戦闘: ${enemy.name}`, [
        `${enemy.name} Lv.${enemy.level} HP ${enemy.hp}/${enemy.maxHp}`,
        `状態: ${enemy.status.join(", ") || "正常"}`,
    ], [
        ["攻撃", () => combatAttack()],
        ["魔法", () => chooseSpell(false)],
        ["アイテム", () => openInventory("use")],
        ["スクロール", () => chooseScroll()],
        ["装備", () => openInventory("equip")],
        ["防御", () => combatDefend()],
        ["特殊攻撃", () => specialAttack()],
        ["逃げる", () => runAway()],
    ]);
}

function combatAttack() {
    const enemy = state.combat.enemy;
    const damage = calcDamage(state.player, enemy);
    if (damage === 0) {
        log("攻撃は外れた。", "warn");
    } else {
        enemy.hp -= damage;
        log(`${enemy.name}に${damage}ダメージ。`, "good");
    }
    finishPlayerCombatAction();
}

function calcDamage(attacker, defender) {
    const atkStats = attacker === state.player ? effectiveStats() : attacker.stats;
    const defStats = defender === state.player ? effectiveStats() : defender.stats;
    const hit = clamp(0.75 + (atkStats.dex - defStats.dex) * 0.05, 0.15, 0.95);
    if (!chance(hit)) {
        return 0;
    }
    const raw = Math.max(1, attackPower(attacker) - defensePower(defender));
    const statMul = Math.max(0.25, 1 + (atkStats.str - defStats.vit) * 0.1);
    return Math.max(1, Math.round(raw * statMul * (Math.random() * 0.3 + 0.85)));
}

function finishPlayerCombatAction() {
    const enemy = state.combat.enemy;
    if (enemy.hp <= 0) {
        winCombat(enemy);
        return;
    }
    enemyTurn(enemy);
    if (state.player.hp <= 0) {
        closeModal();
        showResult(false, `${enemy.name}に倒された。`);
        return;
    }
    updateAll();
    renderCombat();
}

function enemyTurn(enemy) {
    if (enemy.status.includes("睡眠") || enemy.status.includes("凍結") || enemy.status.includes("麻痺")) {
        log(`${enemy.name}は動けない。`, "good");
        enemy.status = enemy.status.filter((status) => chance(0.45) ? false : status);
        return;
    }
    let damage = calcDamage(enemy, state.player);
    if (state.combat.defending) {
        damage = Math.floor(damage / 2);
        state.combat.defending = false;
    }
    state.player.hp -= damage;
    log(`${enemy.name}の攻撃。${damage}ダメージ。`, damage > 0 ? "bad" : "good");
}

function winCombat(enemy) {
    state.entities = state.entities.filter((entity) => entity !== enemy);
    state.player.exp += enemy.exp;
    state.player.gold += enemy.gold;
    log(`${enemy.name}を倒した。EXP ${enemy.exp} / ${enemy.gold}G`, "good");
    if (chance(0.45)) {
        const loot = randomLoot(true);
        if (state.player.inventory.length < MAX_ITEMS) {
            state.player.inventory.push(loot);
            log(`${itemName(loot)}を入手した。`, "good");
        } else {
            state.items.push({ x: state.player.x, y: state.player.y, item: loot, chest: false });
            log(`${itemName(loot)}は足元に落ちた。`, "warn");
        }
    }
    checkLevelUp();
    state.mode = "play";
    state.combat = null;
    closeModal();
    updateAll();
}

function checkLevelUp() {
    const p = state.player;
    while (p.exp >= requiredExp(p.level)) {
        p.exp -= requiredExp(p.level);
        p.level += 1;
        const cls = CLASS_DEFS[p.classKey];
        p.stats.str += Math.round(rand(1, 3) * cls.str);
        p.stats.int += Math.round(rand(1, 3) * cls.int);
        p.stats.dex += Math.round(rand(1, 3) * cls.dex);
        p.stats.vit += Math.round(rand(1, 3) * cls.vit);
        p.maxHp += Math.round(rand(8, 20) * cls.hp + p.stats.vit);
        p.maxMp += Math.round(rand(5, 12) * cls.mp + p.stats.int);
        p.hp = p.maxHp;
        p.mp = p.maxMp;
        log(`Lv.${p.level}に上がった。`, "good");
    }
}

function combatDefend() {
    state.combat.defending = true;
    log("防御姿勢を取った。", "good");
    finishPlayerCombatAction();
}

function specialAttack() {
    if (state.player.hp > state.player.maxHp / 2 && !state.player.equipment.weapon) {
        log("特殊攻撃の条件を満たしていない。", "warn");
        renderCombat();
        return;
    }
    const enemy = state.combat.enemy;
    const damage = Math.round(calcDamage(state.player, enemy) * 1.8 + state.player.level * 3);
    enemy.hp -= damage;
    state.player.mp = Math.max(0, state.player.mp - 5);
    log(`特殊攻撃で${damage}ダメージ。`, "good");
    finishPlayerCombatAction();
}

function runAway() {
    const enemy = state.combat.enemy;
    const rate = clamp(0.35 + (effectiveStats().dex - enemy.stats.dex) * 0.04, 0.1, 0.9);
    if (chance(rate)) {
        log("戦闘から逃げた。", "good");
        state.mode = "play";
        state.combat = null;
        closeModal();
        updateAll();
    } else {
        log("逃走に失敗した。", "bad");
        enemyTurn(enemy);
        renderCombat();
    }
}

function chooseSpell(fromInventory) {
    const keys = ["fire", "water", "wind", "earth", "ice", "lightning", "sleep", "paralyze", "blind", "teleport", "freeze", "gravity", "cure", "heal", "recover", "buff", "analyze"];
    openModal("魔法", keys.map((key) => `${SPELLS[key].name} MP${SPELLS[key].mp}`), [
        ...keys.map((key) => [SPELLS[key].name, () => castSpell(key, fromInventory)]),
        ["戻る", () => state.mode === "combat" ? renderCombat() : closeModal()],
    ]);
}

function chooseScroll() {
    const scrolls = state.player.inventory
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.kind === "item" && ITEM_DEFS[item.id].type === "scroll");
    if (!scrolls.length) {
        log("スクロールを持っていない。", "warn");
        renderCombat();
        return;
    }
    openModal("スクロール", scrolls.map(({ item }) => itemName(item)), [
        ...scrolls.map(({ item, index }) => [itemName(item), () => {
            state.player.inventory.splice(index, 1);
            castSpell(ITEM_DEFS[item.id].spell, true);
        }]),
        ["戻る", () => renderCombat()],
    ]);
}

function castSpell(key, free) {
    const spell = SPELLS[key];
    const p = state.player;
    if (!free && p.mp < spell.mp) {
        log("MPが足りない。", "warn");
        if (state.mode === "combat") {
            renderCombat();
        }
        return;
    }
    if (!free) {
        p.mp -= spell.mp;
    }
    const enemy = state.combat?.enemy;
    if (spell.kind === "damage" && enemy) {
        const damage = Math.round(spell.power + effectiveStats().int * 1.5 + p.level * 2);
        enemy.hp -= damage;
        if (spell.status && chance(0.45)) {
            enemy.status.push(spell.status);
        }
        if (spell.debuff && chance(0.55)) {
            enemy.stats[spell.debuff] = Math.max(1, enemy.stats[spell.debuff] - 2);
        }
        log(`${spell.name}で${damage}ダメージ。`, "good");
        finishPlayerCombatAction();
    } else if (spell.kind === "status" && enemy) {
        enemy.status.push(spell.status);
        log(`${enemy.name}を${spell.status}にした。`, "good");
        finishPlayerCombatAction();
    } else if (spell.kind === "teleport") {
        const pos = randomFloorCell();
        p.x = pos.x;
        p.y = pos.y;
        log("テレポートした。", "good");
        closeModal();
        updateAll();
    } else if (spell.kind === "heal") {
        p.hp = Math.min(p.maxHp, p.hp + spell.power + effectiveStats().int * 2);
        log("HPを回復した。", "good");
        if (state.mode === "combat") {
            finishPlayerCombatAction();
        } else {
            closeModal();
            updateAll();
        }
    } else if (spell.kind === "cure") {
        p.status = [];
        p.statDamage = { str: 0, int: 0, dex: 0, vit: 0 };
        log("状態異常を回復した。", "good");
        if (state.mode === "combat") {
            finishPlayerCombatAction();
        } else {
            closeModal();
            updateAll();
        }
    } else if (spell.kind === "recover") {
        p.hp = Math.min(p.maxHp, p.hp + spell.power + effectiveStats().int * 2);
        p.mp = Math.min(p.maxMp, p.mp + Math.floor(spell.power / 2));
        log("HPとMPを回復した。", "good");
        if (state.mode === "combat") {
            finishPlayerCombatAction();
        } else {
            closeModal();
            updateAll();
        }
    } else if (spell.kind === "buff") {
        p.buffs = 12;
        log("一時的に能力が上がった。", "good");
        if (state.mode === "combat") {
            finishPlayerCombatAction();
        } else {
            closeModal();
            updateAll();
        }
    } else if (spell.kind === "analyze") {
        const weapon = p.equipment.weapon ? EQUIP_DEFS[p.equipment.weapon] : null;
        log(weapon ? `${weapon.name}: 攻撃力+${weapon.atk || 0}` : "武器を装備していない。", "good");
        if (state.mode === "combat") {
            finishPlayerCombatAction();
        } else {
            closeModal();
            updateAll();
        }
    } else {
        log("ここでは効果がない。", "warn");
        closeModal();
    }
}

function openInventory(mode = "view") {
    const rows = state.player.inventory.map((item, index) => `${index + 1}. ${itemName(item)}`);
    const actions = state.player.inventory.map((item, index) => {
        let label = "見る";
        if (mode === "use") {
            label = item.kind === "equip" ? "装備" : "使う";
        } else if (mode === "equip") {
            label = item.kind === "equip" ? "装備" : "選択不可";
        } else if (mode === "drop") {
            label = "捨てる";
        }
        return [label === "選択不可" ? `${itemName(item)}` : `${label}: ${itemName(item)}`, () => handleInventoryItem(index, mode)];
    });
    openModal(`所持品 ${state.player.inventory.length}/${MAX_ITEMS}`, rows.length ? rows : ["何も持っていない。"], [
        ...actions,
        ["閉じる", () => {
            if (state.mode === "combat") {
                renderCombat();
            } else {
                closeModal();
            }
        }],
    ]);
}

function handleInventoryItem(index, mode) {
    const item = state.player.inventory[index];
    if (!item) {
        return;
    }
    if (mode === "drop") {
        state.player.inventory.splice(index, 1);
        state.items.push({ x: state.player.x, y: state.player.y, item, chest: false });
        log(`${itemName(item)}を捨てた。`, "warn");
        closeModal();
        updateAll();
        return;
    }
    if (item.kind === "equip") {
        equipItem(index);
        return;
    }
    useItem(index);
}

function useItem(index) {
    const item = state.player.inventory[index];
    const def = ITEM_DEFS[item.id];
    const inCombat = state.mode === "combat";
    if (def.type === "scroll") {
        state.player.inventory.splice(index, 1);
        castSpell(def.spell, true);
        return;
    }
    if (def.use === "hp") {
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + def.power);
        log(`${def.name}を使った。`, "good");
    } else if (def.use === "mp") {
        state.player.mp = Math.min(state.player.maxMp, state.player.mp + def.power);
        log(`${def.name}を使った。`, "good");
    } else if (def.use === "cure") {
        state.player.status = [];
        state.player.statDamage = { str: 0, int: 0, dex: 0, vit: 0 };
        log("状態異常とステータス低下を回復した。", "good");
    } else if (def.use === "full") {
        state.player.hp = state.player.maxHp;
        state.player.mp = state.player.maxMp;
        state.player.status = [];
        state.player.statDamage = { str: 0, int: 0, dex: 0, vit: 0 };
        log("HP/MP/状態異常を全回復した。", "good");
    } else {
        log("今は使えない。", "warn");
        return;
    }
    state.player.inventory.splice(index, 1);
    if (inCombat) {
        finishPlayerCombatAction();
    } else {
        closeModal();
        updateAll();
    }
}

function equipItem(index) {
    const item = state.player.inventory[index];
    if (item.kind !== "equip") {
        log("装備品ではない。", "warn");
        openInventory("equip");
        return;
    }
    const def = EQUIP_DEFS[item.id];
    const old = state.player.equipment[def.slot];
    state.player.equipment[def.slot] = item.id;
    state.player.inventory.splice(index, 1);
    if (old) {
        state.player.inventory.push({ kind: "equip", id: old });
    }
    log(`${def.name}を装備した。`, "good");
    if (state.mode === "combat") {
        finishPlayerCombatAction();
    } else {
        closeModal();
        updateAll();
    }
}

function openTown() {
    if (state.player.hasMedal) {
        showResult(true, `勝利のメダルを持ち帰った。Lv.${state.player.level} / ${state.player.gold}G`);
        return;
    }
    openModal("地上", ["宿屋と商店がある。準備を整えて迷宮へ戻れる。"], [
        ["宿屋", () => openInn()],
        ["商店", () => openShop()],
        ["迷宮へ戻る", () => closeModal()],
    ]);
}

function openInn() {
    const cost = 25 + state.player.level * 8;
    openModal("宿屋", [`宿泊費 ${cost}G。HP・MP・状態異常が全回復する。`], [
        ["泊まる", () => {
            if (state.player.gold < cost) {
                log("ゴールドが足りない。", "warn");
                openTown();
                return;
            }
            state.player.gold -= cost;
            state.player.hp = state.player.maxHp;
            state.player.mp = state.player.maxMp;
            state.player.status = [];
            log("宿屋で休んだ。", "good");
            updateAll();
            openTown();
        }],
        ["戻る", () => openTown()],
    ]);
}

function openShop() {
    const stock = ["hpPotion", "hpPotionPlus", "mpPotion", "mpPotionPlus", "curePotion", "fullPotion", "fireScroll", "waterScroll", "windScroll", "earthScroll", "healScroll", "recoverScroll", "buffScroll"];
    const equipStock = ["sword", "spear", "bow", "staff", "armor", "shield", "helmet"];
    openModal("商店", [`所持金 ${state.player.gold}G`], [
        ...stock.map((id) => [`買う: ${ITEM_DEFS[id].name} ${ITEM_DEFS[id].price}G`, () => buyItem({ kind: "item", id }, ITEM_DEFS[id].price)]),
        ...equipStock.map((id) => [`買う: ${EQUIP_DEFS[id].name} ${EQUIP_DEFS[id].price}G`, () => buyItem({ kind: "equip", id }, EQUIP_DEFS[id].price)]),
        ["売却", () => openSell()],
        ["戻る", () => openTown()],
    ]);
}

function buyItem(item, price) {
    if (state.player.gold < price) {
        log("ゴールドが足りない。", "warn");
    } else if (state.player.inventory.length >= MAX_ITEMS) {
        log("所持品がいっぱいだ。", "warn");
    } else {
        state.player.gold -= price;
        state.player.inventory.push(item);
        log(`${itemName(item)}を買った。`, "good");
    }
    updateAll();
    openShop();
}

function openSell() {
    const actions = state.player.inventory.map((item, index) => {
        const price = Math.floor(((item.kind === "equip" ? EQUIP_DEFS[item.id].price : ITEM_DEFS[item.id].price) || 20) / 2);
        return [`売る: ${itemName(item)} ${price}G`, () => {
            state.player.inventory.splice(index, 1);
            state.player.gold += price;
            log(`${itemName(item)}を売った。`, "good");
            updateAll();
            openSell();
        }];
    });
    openModal("売却", actions.length ? ["売る品を選ぶ。"] : ["売れる品がない。"], [
        ...actions,
        ["戻る", () => openShop()],
    ]);
}

function showResult(win, message) {
    state.mode = "result";
    openModal(win ? "勝利" : "ゲームオーバー", [message], [
        ["もう一度", () => location.reload()],
        ["トップへ戻る", () => { location.href = "./"; }],
    ]);
}

function openModal(title, bodyLines, actions) {
    dom.modalTitle.textContent = title;
    dom.modalBody.replaceChildren();
    for (const line of bodyLines) {
        const row = document.createElement("div");
        row.textContent = line;
        dom.modalBody.appendChild(row);
    }
    dom.modalActions.replaceChildren();
    for (const [label, handler] of actions) {
        const button = document.createElement("button");
        button.textContent = label;
        button.addEventListener("click", handler);
        dom.modalActions.appendChild(button);
    }
    dom.modalLayer.classList.remove("hidden");
}

function closeModal() {
    dom.modalLayer.classList.add("hidden");
    if (state.mode !== "result" && state.mode !== "combat") {
        state.mode = "play";
    }
}

function updateAll() {
    updateHud();
    updateGroundActions();
    renderMinimap();
    state.dirtyScene = true;
}

function updateHud() {
    const p = state.player;
    const stats = effectiveStats();
    hud["class-name"].textContent = p.className;
    hud.floor.textContent = state.floor;
    hud.gold.textContent = p.gold;
    hud["hp-text"].textContent = `${Math.max(0, p.hp)}/${p.maxHp}`;
    hud["mp-text"].textContent = `${p.mp}/${p.maxMp}`;
    hud["exp-text"].textContent = `${p.exp}/${requiredExp(p.level)}`;
    hud.level.textContent = p.level;
    hud.str.textContent = stats.str;
    hud.int.textContent = stats.int;
    hud.dex.textContent = stats.dex;
    hud.vit.textContent = stats.vit;
    hud.status.textContent = p.status.join(", ") || (p.buffs > 0 ? "強化" : "正常");
    hud.weapon.textContent = p.equipment.weapon ? EQUIP_DEFS[p.equipment.weapon].name : "素手";
    hud.armor.textContent = p.equipment.armor ? EQUIP_DEFS[p.equipment.armor].name : "なし";
    hud.hpBar.style.width = `${clamp((p.hp / p.maxHp) * 100, 0, 100)}%`;
    hud.mpBar.style.width = `${clamp((p.mp / p.maxMp) * 100, 0, 100)}%`;
    hud.expBar.style.width = `${clamp((p.exp / requiredExp(p.level)) * 100, 0, 100)}%`;
    dom.objective.textContent = p.hasMedal ? "勝利のメダルを持ち帰れ" : `B${state.floor}F: ${state.floor === state.maxFloor ? "勝利のメダルを探せ" : "下り階段を探せ"}`;
}

function updateGroundActions() {
    const lines = [];
    const items = itemsAt(state.player.x, state.player.y);
    if (items.length) {
        lines.push(`SPACE: ${itemName(items[0].item)}を拾う`);
    }
    if (tileAt(state.player.x, state.player.y) === TILE.DOWN) {
        lines.push("SPACE: 下り階段");
    }
    if (tileAt(state.player.x, state.player.y) === TILE.UP) {
        lines.push(state.floor === 1 ? "SPACE: 地上へ戻る" : "SPACE: 上り階段");
    }
    dom.groundActions.textContent = lines.join(" / ") || `${DIRS[state.player.dir].name}を向いている`;
}

function initThree() {
    if (render.renderer) {
        return;
    }
    render.renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true });
    render.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    render.scene = new THREE.Scene();
    render.scene.background = new THREE.Color(0x07090d);
    render.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 90);
    render.root = new THREE.Group();
    render.scene.add(render.root);
    render.scene.add(new THREE.HemisphereLight(0xaec9ff, 0x141820, 1.2));
    render.playerLight = new THREE.PointLight(0xffd58a, 2.2, 12);
    render.scene.add(render.playerLight);

    const loader = new THREE.TextureLoader();
    loadGameTextures(loader);
    window.addEventListener("resize", resizeRenderer);
    resizeRenderer();
}

function resizeRenderer() {
    const width = dom.canvas.clientWidth || window.innerWidth;
    const height = dom.canvas.clientHeight || window.innerHeight;
    render.renderer.setSize(width, height, false);
    render.camera.aspect = width / height;
    render.camera.updateProjectionMatrix();
}

function clearScene() {
    for (const object of render.meshes) {
        object.geometry?.dispose();
        render.root.remove(object);
    }
    render.meshes = [];
    render.sprites = [];
}

function rebuildScene() {
    clearScene();
    const floorMat = new THREE.MeshStandardMaterial({ map: render.textures.floor, roughness: 0.9 });
    const wallMat = new THREE.MeshStandardMaterial({ map: render.textures.wall, roughness: 0.85 });
    const upMat = new THREE.MeshStandardMaterial({ map: render.textures.upStairs, roughness: 0.8 });
    const downMat = new THREE.MeshStandardMaterial({ map: render.textures.downStairs, roughness: 0.8 });
    const floorGeo = new THREE.PlaneGeometry(1, 1);
    const wallGeo = new THREE.BoxGeometry(1, 1.8, 1);

    for (let y = 0; y < state.map.length; y += 1) {
        for (let x = 0; x < state.map[y].length; x += 1) {
            const tile = state.map[y][x];
            if (tile !== TILE.WALL) {
                const material = tile === TILE.DOWN ? downMat : tile === TILE.UP ? upMat : floorMat;
                const floor = new THREE.Mesh(floorGeo, material);
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(x, 0, y);
                render.root.add(floor);
                render.meshes.push(floor);
            } else {
                const wall = new THREE.Mesh(wallGeo, wallMat);
                wall.position.set(x, 0.9, y);
                render.root.add(wall);
                render.meshes.push(wall);
            }
        }
    }
    addMarkers();
    state.dirtyScene = false;
}

function addMarkers() {
    const markerGeo = new THREE.PlaneGeometry(0.75, 0.75);
    const makeMarker = (x, y, texture, color = 0xffffff) => {
        const mat = new THREE.MeshBasicMaterial({
            map: texture,
            color,
            transparent: true,
            alphaTest: 0.08,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(markerGeo, mat);
        mesh.position.set(x, 0.45, y);
        render.root.add(mesh);
        render.meshes.push(mesh);
        render.sprites.push(mesh);
    };
    for (const item of state.items) {
        makeMarker(item.x, item.y, item.chest ? render.textures.chest : textureForItem(item.item));
    }
    for (const trap of state.traps) {
        if (!trap.hidden) {
            makeMarker(trap.x, trap.y, trap.type === "teleport" ? render.textures.teleporter : render.textures.trap, 0xffffff);
        }
    }
    for (const enemy of state.entities) {
        makeMarker(enemy.x, enemy.y, textureForMonster(enemy));
    }
}

function updateCamera() {
    const p = state.player;
    const dir = DIRS[p.dir];
    render.camera.position.set(p.x - dir.x * 0.15, 0.85, p.y - dir.y * 0.15);
    render.camera.lookAt(p.x + dir.x * 3, 0.85, p.y + dir.y * 3);
    render.playerLight.position.set(p.x, 1.8, p.y);
    for (const sprite of render.sprites) {
        sprite.lookAt(render.camera.position);
    }
}

function animate() {
    if (!render.renderer) {
        return;
    }
    if (state.dirtyScene) {
        rebuildScene();
    }
    updateCamera();
    render.renderer.render(render.scene, render.camera);
    requestAnimationFrame(animate);
}

function renderMinimap() {
    const ctx = dom.minimap.getContext("2d");
    const size = dom.minimap.width;
    ctx.clearRect(0, 0, size, size);
    const cell = size / state.map.length;
    for (let y = 0; y < state.map.length; y += 1) {
        for (let x = 0; x < state.map[y].length; x += 1) {
            const distance = Math.abs(x - state.player.x) + Math.abs(y - state.player.y);
            if (distance > 8) {
                continue;
            }
            const tile = state.map[y][x];
            ctx.fillStyle = tile === TILE.WALL ? "#1c2028" : tile === TILE.DOWN ? "#4e80ff" : tile === TILE.UP ? "#62d68b" : "#596273";
            ctx.fillRect(x * cell, y * cell, Math.ceil(cell), Math.ceil(cell));
        }
    }
    for (const trap of state.traps.filter((entry) => !entry.hidden)) {
        ctx.fillStyle = "#ff8d52";
        ctx.fillRect(trap.x * cell, trap.y * cell, cell, cell);
    }
    for (const enemy of state.entities) {
        if (Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y) <= 8) {
            ctx.fillStyle = "#ff5f73";
            ctx.fillRect(enemy.x * cell, enemy.y * cell, cell, cell);
        }
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc((state.player.x + 0.5) * cell, (state.player.y + 0.5) * cell, Math.max(3, cell * 0.7), 0, Math.PI * 2);
    ctx.fill();
}

document.addEventListener("keydown", (event) => {
    if (!state.player || state.mode === "class" || state.mode === "result") {
        return;
    }
    if (dom.modalLayer.classList.contains("hidden") === false && state.mode !== "combat") {
        if (event.key === "Escape") {
            closeModal();
        }
        return;
    }
    const key = event.key.toLowerCase();
    if (key === "a" || event.key === "ArrowLeft") {
        state.player.dir = (state.player.dir + 3) % 4;
        updateAll();
    } else if (key === "d" || event.key === "ArrowRight") {
        state.player.dir = (state.player.dir + 1) % 4;
        updateAll();
    } else if (key === "w" || event.key === "ArrowUp") {
        const dir = DIRS[state.player.dir];
        movePlayer(dir.x, dir.y);
    } else if (key === "s" || event.key === "ArrowDown") {
        const dir = DIRS[(state.player.dir + 2) % 4];
        movePlayer(dir.x, dir.y);
    } else if (event.code === "Space") {
        event.preventDefault();
        interact();
    } else if (key === "e") {
        openInventory("equip");
    } else if (key === "q") {
        openInventory("use");
    } else if (key === "x") {
        openInventory("drop");
    } else if (key === "i") {
        openInventory("view");
    }
});

initClasses();
