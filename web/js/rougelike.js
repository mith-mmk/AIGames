/* =================================================================
   rougelike.js  –  ローグライクRPG with Three.js 3D dungeon
   ================================================================= */
import * as THREE from 'three';

// ─────────────────────────────────────────
// 定数
// ─────────────────────────────────────────
const TILE = { WALL: 0, FLOOR: 1, STAIR_DOWN: 2, TRAP: 3, CHEST: 4, DOOR: 5 };
const DIR = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] };
const MAX_FLOORS = 10;          // 最下層
const MAX_INVENTORY = 10;

// 向き: 0=北(↑) 1=東(→) 2=南(↓) 3=西(←)
// W=前進  A=左回転  D=右回転  S=後ろ回転(180°)
const FACING_DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];  // [dx,dy]
const FACING_ANGLES = [0, -Math.PI / 2, Math.PI, Math.PI / 2]; // Three.js camera rotation.y

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────
function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndF(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
function chance(p) { return Math.random() < p; }
function pick(arr) { return arr[rnd(0, arr.length - 1)]; }

// ─────────────────────────────────────────
// クラス（職業）定義
// ─────────────────────────────────────────
const CLASS_DEFS = {
  warrior: { name: '戦士', hp: 1.2, mp: 0.5, str: 1.5, int: 1.0, dex: 1.0, vit: 1.2 },
  mage: { name: '魔法使い', hp: 0.8, mp: 1.5, str: 0.5, int: 1.5, dex: 1.0, vit: 1.0 },
  thief: { name: '盗賊', hp: 0.9, mp: 0.5, str: 1.0, int: 1.0, dex: 1.5, vit: 0.8 },
  priest: { name: '僧侶', hp: 1.0, mp: 1.5, str: 0.5, int: 1.5, dex: 1.0, vit: 1.2 },
  adventurer: { name: '冒険者', hp: 1.0, mp: 1.0, str: 1.0, int: 1.0, dex: 1.0, vit: 1.0 },
};

// ─────────────────────────────────────────
// モンスター定義テーブル
// ─────────────────────────────────────────
const MONSTER_TABLE = [
  { id: 'slime', name: 'スライム', lv: 1, hp: 10, atk: 2, def: 1, exp: 5, gold: [1, 5], minFloor: 1 },
  { id: 'kobold', name: 'コボルト', lv: 1, hp: 15, atk: 3, def: 1, exp: 8, gold: [2, 6], minFloor: 1 },
  { id: 'skeleton', name: 'スケルトン', lv: 2, hp: 20, atk: 4, def: 2, exp: 10, gold: [3, 8], minFloor: 2 },
  { id: 'zombie', name: 'ゾンビ', lv: 2, hp: 20, atk: 4, def: 2, exp: 10, gold: [2, 7], minFloor: 2 },
  { id: 'lizardman', name: 'リザードマン', lv: 2, hp: 20, atk: 4, def: 2, exp: 10, gold: [3, 9], minFloor: 2 },
  { id: 'harpy', name: 'ハーピー', lv: 2, hp: 20, atk: 4, def: 2, exp: 10, gold: [3, 8], minFloor: 2 },
  { id: 'bat', name: 'コウモリ', lv: 2, hp: 20, atk: 4, def: 2, exp: 10, gold: [1, 4], minFloor: 2 },
  { id: 'spider', name: 'スパイダー', lv: 2, hp: 20, atk: 4, def: 2, exp: 10, gold: [2, 6], minFloor: 2 },
  { id: 'slimeking', name: 'スライムキング', lv: 2, hp: 20, atk: 4, def: 2, exp: 10, gold: [4, 10], minFloor: 2 },
  { id: 'goblin', name: 'ゴブリン', lv: 2, hp: 20, atk: 4, def: 2, exp: 10, gold: [3, 9], minFloor: 2 },
  { id: 'ogre', name: 'オーガ', lv: 3, hp: 30, atk: 6, def: 3, exp: 15, gold: [5, 12], minFloor: 3 },
  { id: 'barbarian', name: 'バーバリアン', lv: 3, hp: 30, atk: 6, def: 3, exp: 15, gold: [5, 12], minFloor: 3 },
  { id: 'knight', name: 'ナイト', lv: 3, hp: 30, atk: 6, def: 3, exp: 15, gold: [6, 14], minFloor: 3 },
  { id: 'ghost', name: 'ゴースト', lv: 3, hp: 30, atk: 6, def: 3, exp: 15, gold: [4, 10], minFloor: 3 },
  { id: 'orc', name: 'オーク', lv: 3, hp: 30, atk: 6, def: 3, exp: 15, gold: [5, 12], minFloor: 3 },
  { id: 'wolf', name: 'ウルフ', lv: 4, hp: 40, atk: 8, def: 4, exp: 20, gold: [6, 14], minFloor: 4 },
  { id: 'zombie2', name: 'ゾンビ(強)', lv: 4, hp: 40, atk: 8, def: 4, exp: 20, gold: [5, 12], minFloor: 4 },
  { id: 'troll', name: 'トロル', lv: 5, hp: 50, atk: 10, def: 5, exp: 50, gold: [10, 20], minFloor: 5 },
  { id: 'banshee', name: 'バンシー', lv: 6, hp: 60, atk: 12, def: 6, exp: 30, gold: [8, 18], minFloor: 5 },
  { id: 'turtle', name: 'ジャイアントタートル', lv: 7, hp: 80, atk: 15, def: 8, exp: 50, gold: [12, 24], minFloor: 6 },
  { id: 'beetle', name: 'キラービートル', lv: 7, hp: 80, atk: 15, def: 8, exp: 50, gold: [12, 24], minFloor: 6 },
  { id: 'golem', name: 'ゴーレム', lv: 8, hp: 100, atk: 20, def: 10, exp: 100, gold: [15, 30], minFloor: 7 },
  { id: 'minotaur', name: 'ミノタウロス', lv: 10, hp: 200, atk: 50, def: 30, exp: 500, gold: [30, 60], minFloor: 8 },
  { id: 'kingslime', name: 'キングスライム', lv: 11, hp: 300, atk: 60, def: 40, exp: 700, gold: [40, 80], minFloor: 8 },
  { id: 'dullahan', name: 'デュラハン', lv: 12, hp: 400, atk: 70, def: 50, exp: 1000, gold: [50, 100], minFloor: 9 },
  { id: 'lich', name: 'リッチ', lv: 12, hp: 500, atk: 80, def: 50, exp: 1000, gold: [50, 100], minFloor: 9 },
  { id: 'basilisk', name: 'バジリスク', lv: 12, hp: 500, atk: 80, def: 50, exp: 1000, gold: [50, 100], minFloor: 9 },
  { id: 'phoenix', name: 'フェニックス', lv: 13, hp: 600, atk: 85, def: 60, exp: 1200, gold: [60, 120], minFloor: 10 },
  { id: 'vampire', name: 'ヴァンパイア', lv: 14, hp: 800, atk: 95, def: 80, exp: 2000, gold: [80, 150], minFloor: 10 },
  { id: 'dragon', name: 'ドラゴン', lv: 15, hp: 1000, atk: 100, def: 100, exp: 2500, gold: [100, 200], minFloor: 10 },
];

// ─────────────────────────────────────────
// アイテム定義
// ─────────────────────────────────────────
const ITEM_DEFS = {
  // ポーション
  hp_potion: { name: 'HP回復ポーション', type: 'potion', subtype: 'hp', effect: 50, buy: 50, sell: 25 },
  mp_potion: { name: 'MP回復ポーション', type: 'potion', subtype: 'mp', effect: 30, buy: 40, sell: 20 },
  st_potion: { name: 'ステータス回復ポーション', type: 'potion', subtype: 'status', buy: 60, sell: 30 },
  all_potion: { name: '万能回復ポーション', type: 'potion', subtype: 'all', buy: 120, sell: 60 },
  // スクロール (使い切り)
  sc_fire: { name: 'スクロール: ファイアボール', type: 'scroll', spell: 'fireball', buy: 80, sell: 40 },
  sc_ice: { name: 'スクロール: アイスシャード', type: 'scroll', spell: 'iceshrd', buy: 80, sell: 40 },
  sc_lightning: { name: 'スクロール: ライトニング', type: 'scroll', spell: 'lightning', buy: 80, sell: 40 },
  sc_sleep: { name: 'スクロール: スリープ', type: 'scroll', spell: 'sleep', buy: 70, sell: 35 },
  sc_paralyze: { name: 'スクロール: パラライズ', type: 'scroll', spell: 'paralyze', buy: 70, sell: 35 },
  sc_blind: { name: 'スクロール: ブラインド', type: 'scroll', spell: 'blind', buy: 70, sell: 35 },
  sc_teleport: { name: 'スクロール: テレポート', type: 'scroll', spell: 'teleport', buy: 60, sell: 30 },
  sc_freeze: { name: 'スクロール: フリーズ', type: 'scroll', spell: 'freeze', buy: 90, sell: 45 },
  sc_gravity: { name: 'スクロール: グラビティ', type: 'scroll', spell: 'gravity', buy: 90, sell: 45 },
  sc_cure: { name: 'スクロール: 治療', type: 'scroll', spell: 'cure', buy: 50, sell: 25 },
  sc_recover: { name: 'スクロール: 回復', type: 'scroll', spell: 'recover', buy: 70, sell: 35 },
  sc_statbuf: { name: 'スクロール: ステータスバフ', type: 'scroll', spell: 'statbuf', buy: 100, sell: 50 },
  // 武器
  sword: { name: '剣', type: 'weapon', subtype: 'sword', atk: 10, def: 0, buy: 200, sell: 100 },
  spear: { name: '槍', type: 'weapon', subtype: 'spear', atk: 12, def: 0, buy: 220, sell: 110 },
  bow: { name: '弓', type: 'weapon', subtype: 'bow', atk: 9, def: 0, buy: 180, sell: 90 },
  staff: { name: '魔法の杖', type: 'weapon', subtype: 'staff', atk: 7, def: 0, buy: 160, sell: 80, intBonus: 3 },
  // 防具
  armor: { name: '鎧', type: 'armor', subtype: 'armor', atk: 0, def: 10, buy: 200, sell: 100 },
  shield: { name: '盾', type: 'armor', subtype: 'shield', atk: 0, def: 7, buy: 160, sell: 80 },
  helmet: { name: 'ヘルメット', type: 'armor', subtype: 'helmet', atk: 0, def: 5, buy: 130, sell: 65 },
  // 宝
  medal: { name: '勝利のメダル', type: 'treasure', buy: 0, sell: 1000 },
  treasure: { name: 'お宝', type: 'treasure', buy: 0, sell: rnd(50, 300) },
};

// 魔法定義 (MP消費・何度でも使用可)
const MAGIC_DEFS = {
  fireball: { name: 'ファイアボール', mpCost: 10, type: 'attack', element: 'fire', power: 25 },
  iceshrd: { name: 'アイスシャード', mpCost: 10, type: 'attack', element: 'ice', power: 22 },
  lightning: { name: 'ライトニング', mpCost: 12, type: 'attack', element: 'lightning', power: 28 },
  sleep: { name: 'スリープ', mpCost: 8, type: 'status', ailment: 'sleep', turns: 3 },
  paralyze: { name: 'パラライズ', mpCost: 8, type: 'status', ailment: 'paralyze', turns: 2 },
  blind: { name: 'ブラインド', mpCost: 8, type: 'status', ailment: 'blind', turns: 3 },
  teleport: { name: 'テレポート', mpCost: 5, type: 'position', target: 'self' },
  freeze: { name: 'フリーズ', mpCost: 15, type: 'position', target: 'area', ailment: 'freeze', turns: 2 },
  gravity: { name: 'グラビティ', mpCost: 15, type: 'position', target: 'area', pull: true },
  cure: { name: 'キュア', mpCost: 8, type: 'heal', healHp: 40 },
  heal: { name: 'ヒール', mpCost: 6, type: 'healstatus' },
  statbuf: { name: 'ステータスバフ', mpCost: 12, type: 'buff', turns: 5 },
};

// 罠定義
const TRAP_DEFS = [
  { id: 'teleporter', name: 'テレポータ', desc: 'どこかへ飛ばされた！' },
  { id: 'poisonneedle', name: '毒針', desc: '毒を受けた！' },
  { id: 'pitfall', name: '落とし穴', desc: '落とし穴に落ちた！1階下へ落下。' },
  { id: 'explosion', name: '爆発物', desc: '爆発した！ダメージを受けた。' },
  { id: 'alarm', name: 'アラーム', desc: 'アラームが鳴り、モンスターが出現した！' },
  { id: 'hiddenneedle', name: '隠し針', desc: '見えない罠！HPが減った。', hidden: true },
];

// ─────────────────────────────────────────
// Player クラス
// ─────────────────────────────────────────
class Player {
  constructor(classId) {
    this.classId = classId;
    const cd = CLASS_DEFS[classId];
    this.className = cd.name;
    this.level = 1;
    this.exp = 0;
    this._classMul = cd;

    this._baseStr = 5; this._baseInt = 5; this._baseDex = 5; this._baseVit = 5;
    this._calcStats();
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.gold = 50;
    this.ailments = [];    // 'poison','sleep','paralyze','blind','freeze'
    this.bufTurns = 0;

    this.inventory = [];   // { itemId, qty, equipped }
    this.weapon = null;
    this.armors = { armor: null, shield: null, helmet: null };

    // 初期装備（剣 + 鎧）
    this._equip('sword');
    this._equip('armor');
    this.addItem('hp_potion', 2);
    this.addItem('mp_potion', 1);
  }

  _calcStats() {
    const m = this._classMul;
    this._str = Math.floor((this._baseStr + this.level * rnd(1, 3)) * m.str);
    this._int = Math.floor((this._baseInt + this.level * rnd(1, 3)) * m.int);
    this._dex = Math.floor((this._baseDex + this.level * rnd(1, 3)) * m.dex);
    this._vit = Math.floor((this._baseVit + this.level * rnd(1, 3)) * m.vit);
    this.maxHp = Math.floor((100 + this.level * rnd(1, 20) * m.hp) + this._vit * 5);
    this.maxMp = Math.floor((50 + this.level * rnd(1, 10) * m.mp) + this._int * 5);
  }

  get str() { return this._str + (this.weapon ? (ITEM_DEFS[this.weapon].atk || 0) : 0); }
  get int() { return this._int + (this.weapon && ITEM_DEFS[this.weapon].intBonus ? ITEM_DEFS[this.weapon].intBonus : 0); }
  get dex() { return this._dex; }
  get vit() { return this._vit + this._armorDef(); }

  _armorDef() {
    let d = 0;
    for (const k of Object.keys(this.armors)) {
      if (this.armors[k]) d += ITEM_DEFS[this.armors[k]].def || 0;
    }
    return d;
  }

  get atk() { return this.str; }
  get def() { return this.vit; }

  requiredExp() { return 10 * Math.pow(this.level, 2); }

  gainExp(e) {
    this.exp += e;
    const results = [];
    while (this.exp >= this.requiredExp()) {
      this.exp -= this.requiredExp();
      results.push(this._levelUp());
    }
    return results;
  }

  _levelUp() {
    this.level++;
    const prevHp = this.maxHp; const prevMp = this.maxMp;
    const prevStr = this._str; const prevInt = this._int;
    const prevDex = this._dex; const prevVit = this._vit;
    this._calcStats();
    const dhp = this.maxHp - prevHp; const dmp = this.maxMp - prevMp;
    const dstr = this._str - prevStr; const dint = this._int - prevInt;
    const ddex = this._dex - prevDex; const dvit = this._vit - prevVit;
    this.hp = Math.min(this.maxHp, this.hp + dhp);
    this.mp = Math.min(this.maxMp, this.mp + dmp);
    return { level: this.level, dhp, dmp, dstr, dint, ddex, dvit };
  }

  addItem(itemId, qty = 1) {
    const existing = this.inventory.find(i => i.itemId === itemId);
    if (existing) { existing.qty += qty; return true; }
    if (this.inventory.length >= MAX_INVENTORY) return false;
    this.inventory.push({ itemId, qty, equipped: false });
    return true;
  }

  removeItem(itemId, qty = 1) {
    const idx = this.inventory.findIndex(i => i.itemId === itemId);
    if (idx < 0) return false;
    this.inventory[idx].qty -= qty;
    if (this.inventory[idx].qty <= 0) this.inventory.splice(idx, 1);
    return true;
  }

  hasItem(itemId) { return this.inventory.some(i => i.itemId === itemId); }
  countItem(itemId) { const i = this.inventory.find(x => x.itemId === itemId); return i ? i.qty : 0; }

  _equip(itemId) {
    const def = ITEM_DEFS[itemId];
    if (!def) return;
    if (def.type === 'weapon') { this.weapon = itemId; }
    else if (def.type === 'armor') { this.armors[def.subtype] = itemId; }
  }

  equipItem(itemId) {
    const def = ITEM_DEFS[itemId];
    if (!def || (def.type !== 'weapon' && def.type !== 'armor')) return `${def ? def.name : itemId} は装備できません。`;
    this._equip(itemId);
    return `${def.name} を装備した。`;
  }

  unequipItem(itemId) {
    const def = ITEM_DEFS[itemId];
    if (!def) return;
    if (def.type === 'weapon' && this.weapon === itemId) this.weapon = null;
    else if (def.type === 'armor') this.armors[def.subtype] = null;
  }

  hasAilment(a) { return this.ailments.includes(a); }
  addAilment(a) { if (!this.hasAilment(a)) this.ailments.push(a); }
  removeAilment(a) { this.ailments = this.ailments.filter(x => x !== a); }
  clearAilments() { this.ailments = []; }

  tickAilments() {
    const msgs = [];
    if (this.hasAilment('poison')) {
      const dmg = Math.max(1, Math.floor(this.maxHp * 0.05));
      this.hp = Math.max(0, this.hp - dmg);
      msgs.push({ text: `毒でHPが${dmg}減った！`, cls: 'rl-log-dmg' });
    }
    return msgs;
  }
}

// ─────────────────────────────────────────
// Enemy クラス
// ─────────────────────────────────────────
class Enemy {
  constructor(def, floor) {
    this.id = def.id;
    this.name = def.name;
    this.level = def.lv + Math.floor(floor / 2);
    const scale = 1 + floor * 0.12;
    this.maxHp = Math.floor(def.hp * scale);
    this.hp = this.maxHp;
    this.atk = Math.floor(def.atk * scale);
    this.def = Math.floor(def.def * scale);
    this.exp = Math.floor(def.exp * scale);
    this.gold = rnd(...def.gold);
    this.str = this.atk;
    this.dex = this.level * 2;
    this.vit = this.def;
    this.ailments = [];
    this.dropTable = this._buildDropTable(def.id, floor);
  }

  _buildDropTable(id, floor) {
    const drops = [];
    // ポーション
    if (chance(0.3)) drops.push(chance(0.5) ? 'hp_potion' : 'mp_potion');
    // 装備 (floor >= 3 から確率増加)
    if (floor >= 3 && chance(0.15)) drops.push(pick(['sword', 'spear', 'bow', 'staff', 'armor', 'shield', 'helmet']));
    // スクロール
    const scrolls = ['sc_fire', 'sc_ice', 'sc_lightning', 'sc_sleep', 'sc_paralyze', 'sc_blind', 'sc_teleport', 'sc_freeze', 'sc_gravity', 'sc_cure', 'sc_recover', 'sc_statbuf'];
    if (chance(0.2)) drops.push(pick(scrolls));
    // お宝
    if (chance(0.1 + floor * 0.02)) drops.push('treasure');
    return drops;
  }

  hasAilment(a) { return this.ailments.includes(a); }
  addAilment(a) { if (!this.hasAilment(a)) this.ailments.push(a); }
  removeAilment(a) { this.ailments = this.ailments.filter(x => x !== a); }

  ailmentTick() {
    const expired = [];
    this.ailments = this.ailments.filter(a => {
      if (typeof a === 'object') { a.turns--; if (a.turns <= 0) { expired.push(a.id); return false; } return true; }
      return true;
    });
    return expired;
  }
}

// ─────────────────────────────────────────
// CombatResolver – 戦闘計算
// ─────────────────────────────────────────
class CombatResolver {
  // 命中判定
  static hitCheck(atkDex, defDex) {
    const rate = clamp(0.75 + (atkDex - defDex) * 0.05, 0.1, 0.99);
    return chance(rate);
  }

  // ダメージ計算
  static calcDamage(atkStr, defVit, atkSide_STR, def_VIT) {
    const base = Math.max(0, atkStr - defVit);
    const mod = 1 + (atkSide_STR - def_VIT) * 0.1;
    return Math.max(1, Math.floor(base * mod * rndF(0.85, 1.15)));
  }

  // プレイヤー → 敵 通常攻撃
  static playerAttack(player, enemy) {
    const msgs = [];
    if (enemy.hasAilment('sleep') || enemy.hasAilment('paralyze') || enemy.hasAilment('freeze')) {
      msgs.push({ text: `${enemy.name} は動けない状態だ！`, cls: 'rl-log-info' });
    }
    if (!this.hitCheck(player.dex, enemy.dex)) {
      msgs.push({ text: `${enemy.name} への攻撃は外れた！`, cls: 'rl-log-warn' });
      return msgs;
    }
    const dmg = this.calcDamage(player.atk, enemy.def, player.str, enemy.vit);
    enemy.hp -= dmg;
    msgs.push({ text: `${enemy.name} に ${dmg} ダメージ！(残HP: ${Math.max(0, enemy.hp)})`, cls: 'rl-log-dmg' });
    return msgs;
  }

  // 敵 → プレイヤー 通常攻撃
  static enemyAttack(enemy, player, defenseMode = false) {
    const msgs = [];
    if (enemy.hasAilment('sleep') || enemy.hasAilment('paralyze') || enemy.hasAilment('freeze')) {
      const exp = enemy.ailments.find(a => typeof a === 'object');
      // ailment turn処理はGame側で
      msgs.push({ text: `${enemy.name} は動けない！`, cls: 'rl-log-info' });
      return msgs;
    }
    if (enemy.hasAilment('blind') && chance(0.5)) {
      msgs.push({ text: `${enemy.name} の攻撃は外れた（盲目）！`, cls: 'rl-log-warn' });
      return msgs;
    }
    if (!this.hitCheck(enemy.dex, player.dex)) {
      msgs.push({ text: `${enemy.name} の攻撃は外れた！`, cls: 'rl-log-warn' });
      return msgs;
    }
    let dmg = this.calcDamage(enemy.atk, player.vit, enemy.str, player.vit);
    if (defenseMode) dmg = Math.floor(dmg * 0.5);
    player.hp -= dmg;
    msgs.push({ text: `${enemy.name} から ${dmg} ダメージを受けた！(残HP: ${Math.max(0, player.hp)})`, cls: 'rl-log-dmg' });
    return msgs;
  }

  // 魔法 / スクロール効果解決
  static resolveSpell(spellId, caster, target, targetIsEnemy, gs) {
    const def = MAGIC_DEFS[spellId];
    const msgs = [];
    if (!def) return msgs;

    if (def.type === 'attack') {
      if (!targetIsEnemy) { msgs.push({ text: '攻撃対象が必要です。', cls: 'rl-log-warn' }); return msgs; }
      const pow = def.power + (caster.int || 0) * 0.5;
      const dmg = Math.floor(pow * rndF(0.9, 1.1));
      target.hp -= dmg;
      msgs.push({ text: `${def.name}! ${target.name} に ${dmg} ダメージ！`, cls: 'rl-log-dmg' });
      if (def.element === 'ice' && chance(0.3)) {
        target.addAilment({ id: 'freeze', turns: 2 });
        msgs.push({ text: `${target.name} は凍りついた！`, cls: 'rl-log-info' });
      }
    } else if (def.type === 'status') {
      if (!targetIsEnemy) { msgs.push({ text: '対象が必要です。', cls: 'rl-log-warn' }); return msgs; }
      target.addAilment({ id: def.ailment, turns: def.turns });
      const ailMap = { sleep: '眠り', paralyze: '麻痺', blind: '盲目' };
      msgs.push({ text: `${target.name} は${ailMap[def.ailment] || def.ailment}状態になった！`, cls: 'rl-log-info' });
    } else if (def.type === 'position') {
      if (def.target === 'self') {
        if (gs) gs.teleportPlayer();
        msgs.push({ text: 'テレポートした！', cls: 'rl-log-info' });
      } else if (def.target === 'area') {
        // フリーズ・グラビティは戦闘中は単体に適用
        if (targetIsEnemy) {
          if (def.ailment) {
            target.addAilment({ id: def.ailment, turns: def.turns });
            msgs.push({ text: `${target.name} は凍りついた！`, cls: 'rl-log-info' });
          }
          if (def.pull) {
            msgs.push({ text: `${target.name} は引き寄せられた（移動不可）！`, cls: 'rl-log-info' });
            target.addAilment({ id: 'freeze', turns: 1 });
          }
        }
      }
    } else if (def.type === 'heal') {
      caster.hp = Math.min(caster.maxHp, caster.hp + def.healHp);
      msgs.push({ text: `HPが ${def.healHp} 回復した！`, cls: 'rl-log-heal' });
    } else if (def.type === 'healstatus') {
      caster.clearAilments();
      msgs.push({ text: '状態異常が治った！', cls: 'rl-log-heal' });
    } else if (def.type === 'buff') {
      caster.bufTurns = (caster.bufTurns || 0) + def.turns;
      msgs.push({ text: `ステータスが一時的に上昇した！(${def.turns}ターン)`, cls: 'rl-log-heal' });
    }
    return msgs;
  }
}

// ─────────────────────────────────────────
// BSP ダンジョン生成
// ─────────────────────────────────────────
class BSPNode {
  constructor(x, y, w, h) { this.x = x; this.y = y; this.w = w; this.h = h; this.left = null; this.right = null; this.room = null; }
  split(minSize = 7) {
    if (this.left || this.right) return false;
    const h = chance(0.5);
    if (h) {
      if (this.h < minSize * 2) return false;
      const split = rnd(minSize, this.h - minSize);
      this.left = new BSPNode(this.x, this.y, this.w, split);
      this.right = new BSPNode(this.x, this.y + split, this.w, this.h - split);
    } else {
      if (this.w < minSize * 2) return false;
      const split = rnd(minSize, this.w - minSize);
      this.left = new BSPNode(this.x, this.y, split, this.h);
      this.right = new BSPNode(this.x + split, this.y, this.w - split, this.h);
    }
    this.left.split(minSize);
    this.right.split(minSize);
    return true;
  }
  createRooms(tiles) {
    if (this.left || this.right) {
      if (this.left) this.left.createRooms(tiles);
      if (this.right) this.right.createRooms(tiles);
      if (this.left && this.right) connectRooms(this.left.getRoom(), this.right.getRoom(), tiles);
    } else {
      const rx = this.x + rnd(1, 2);
      const ry = this.y + rnd(1, 2);
      const rw = rnd(4, Math.max(4, this.w - 3));
      const rh = rnd(4, Math.max(4, this.h - 3));
      this.room = { x: rx, y: ry, w: rw, h: rh };
      for (let cy = ry; cy < ry + rh; cy++)
        for (let cx = rx; cx < rx + rw; cx++)
          if (cy > 0 && cy < tiles.length - 1 && cx > 0 && cx < tiles[0].length - 1) tiles[cy][cx] = TILE.FLOOR;
    }
  }
  getRoom() {
    if (this.room) return this.room;
    const l = this.left ? this.left.getRoom() : null;
    const r = this.right ? this.right.getRoom() : null;
    if (!l) return r;
    if (!r) return l;
    return chance(0.5) ? l : r;
  }
  getAllRooms() {
    if (this.room) return [this.room];
    const rooms = [];
    if (this.left) rooms.push(...this.left.getAllRooms());
    if (this.right) rooms.push(...this.right.getAllRooms());
    return rooms;
  }
}

function connectRooms(a, b, tiles) {
  if (!a || !b) return;
  const ax = a.x + Math.floor(a.w / 2), ay = a.y + Math.floor(a.h / 2);
  const bx = b.x + Math.floor(b.w / 2), by = b.y + Math.floor(b.h / 2);
  let cx = ax, cy = ay;
  while (cx !== bx) { if (cy > 0 && cy < tiles.length - 1 && cx > 0 && cx < tiles[0].length - 1) tiles[cy][cx] = TILE.FLOOR; cx += cx < bx ? 1 : -1; }
  while (cy !== by) { if (cy > 0 && cy < tiles.length - 1 && cx > 0 && cx < tiles[0].length - 1) tiles[cy][cx] = TILE.FLOOR; cy += cy < by ? 1 : -1; }
}

function roomCenter(r) { return { x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) }; }

class DungeonFloor {
  constructor(floorNum) {
    this.floorNum = floorNum;
    this.W = 40; this.H = 40;
    this.tiles = Array.from({ length: this.H }, () => new Array(this.W).fill(TILE.WALL));
    this.enemies = [];
    this.items = [];
    this.traps = [];
    this.stairPos = null;
    this.playerStart = null;
    this._generate();
  }

  _generate() {
    const root = new BSPNode(0, 0, this.W, this.H);
    root.split(7);
    root.createRooms(this.tiles);
    const rooms = root.getAllRooms();
    if (rooms.length < 2) { /* fallback */ this._addFallbackRoom(); return; }

    this.playerStart = roomCenter(rooms[0]);
    const lastRoom = rooms[rooms.length - 1];
    const sc = roomCenter(lastRoom);
    this.stairPos = sc;
    this.tiles[sc.y][sc.x] = TILE.STAIR_DOWN;

    // 勝利メダルを最下層に配置
    if (this.floorNum === MAX_FLOORS) {
      this.items.push({ x: sc.x, y: sc.y - 1, itemId: 'medal', qty: 1 });
    }

    // 隠し部屋（5%の確率）
    if (chance(0.05) && rooms.length > 2) {
      const hiddenRoom = rooms[rnd(1, rooms.length - 2)];
      const hc = roomCenter(hiddenRoom);
      if (this.tiles[hc.y][hc.x] === TILE.FLOOR) {
        this.tiles[hc.y][hc.x] = TILE.DOOR; // 隠し扉
        const rareScrolls = ['sc_freeze', 'sc_gravity', 'sc_statbuf'];
        this.items.push({ x: hc.x + 1, y: hc.y, itemId: pick(rareScrolls), qty: 1 });
      }
    }

    // モンスター・アイテム・罠配置
    for (let i = 1; i < rooms.length - 1; i++) {
      const r = rooms[i];
      // モンスター
      const candidates = MONSTER_TABLE.filter(m => m.minFloor <= this.floorNum);
      const monsterCount = rnd(1, 3);
      for (let j = 0; j < monsterCount; j++) {
        const def = pick(candidates);
        const pos = this._rndInRoom(r);
        this.enemies.push({ x: pos.x, y: pos.y, enemy: new Enemy(def, this.floorNum) });
      }
      // アイテム
      if (chance(0.4)) {
        const items = Object.keys(ITEM_DEFS).filter(k => ITEM_DEFS[k].type !== 'treasure' && k !== 'medal');
        const pos = this._rndInRoom(r);
        this.items.push({ x: pos.x, y: pos.y, itemId: pick(items), qty: 1 });
      }
      // 罠
      if (chance(0.3)) {
        const trapDef = pick(TRAP_DEFS);
        const pos = this._rndInRoom(r);
        this.traps.push({ x: pos.x, y: pos.y, trap: trapDef, revealed: !trapDef.hidden });
      }
      // 宝箱
      if (chance(0.2)) {
        const pos = this._rndInRoom(r);
        this.tiles[pos.y][pos.x] = TILE.CHEST;
        this.items.push({ x: pos.x, y: pos.y, itemId: 'treasure', qty: 1 });
      }
    }
  }

  _addFallbackRoom() {
    const cx = Math.floor(this.W / 2), cy = Math.floor(this.H / 2);
    for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 3; x <= cx + 3; x++) this.tiles[y][x] = TILE.FLOOR;
    this.playerStart = { x: cx, y: cy };
    this.stairPos = { x: cx + 2, y: cy };
    this.tiles[cy][cx + 2] = TILE.STAIR_DOWN;
  }

  _rndInRoom(r) {
    return { x: rnd(r.x, r.x + r.w - 1), y: rnd(r.y, r.y + r.h - 1) };
  }

  isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return false;
    return this.tiles[y][x] !== TILE.WALL;
  }

  getEnemyAt(x, y) { return this.enemies.find(e => e.x === x && e.y === y); }
  getItemAt(x, y) { return this.items.filter(i => i.x === x && i.y === y); }
  getTrapAt(x, y) { return this.traps.find(t => t.x === x && t.y === y); }

  removeEnemy(x, y) { this.enemies = this.enemies.filter(e => !(e.x === x && e.y === y)); }
  removeItem(x, y, itemId) {
    const idx = this.items.findIndex(i => i.x === x && i.y === y && i.itemId === itemId);
    if (idx >= 0) this.items.splice(idx, 1);
  }
  removeTrap(x, y) { this.traps = this.traps.filter(t => !(t.x === x && t.y === y)); }
}

// ─────────────────────────────────────────
// GameState – ゲーム全体の状態管理
// ─────────────────────────────────────────
class GameState {
  constructor(classId) {
    this.player = new Player(classId);
    this.floorNum = 1;
    this.floor = new DungeonFloor(1);
    this.px = this.floor.playerStart.x;
    this.py = this.floor.playerStart.y;
    this.phase = 'explore';  // 'explore' | 'combat' | 'shop' | 'inn' | 'result'
    this.combatEnemy = null;
    this.defenseMode = false;
    this.combatTurn = 'player';
    this.hasMedal = false;
    this.onSurface = false;
    this._pendingLevelUps = [];
  }

  // 移動
  move(dx, dy) {
    if (this.phase !== 'explore') return;
    const nx = this.px + dx, ny = this.py + dy;
    if (!this.floor.isWalkable(nx, ny)) {
      game.log('壁がある。', 'rl-log-warn'); return;
    }
    // 敵と接触 → 戦闘
    const enemySpot = this.floor.getEnemyAt(nx, ny);
    if (enemySpot) {
      this.startCombat(enemySpot.enemy, nx, ny);
      return;
    }
    this.px = nx; this.py = ny;
    this._onStep();
    // プレイヤー移動後に敵もターン行動
    if (this.phase === 'explore') this._tickEnemies();
  }

  // ─── 敵ターン行動 ───
  _tickEnemies() {
    let moved = false;
    for (const ent of this.floor.enemies) {
      if (!chance(0.6)) continue;
      const ddx = this.px - ent.x;
      const ddy = this.py - ent.y;
      const dist = Math.abs(ddx) + Math.abs(ddy);

      let dirs;
      if (dist <= 8 && dist > 0) {
        // 追跡: プレイヤー方向を優先
        const primary = Math.abs(ddx) >= Math.abs(ddy) ? [ddx > 0 ? 1 : -1, 0] : [0, ddy > 0 ? 1 : -1];
        const secondary = Math.abs(ddx) >= Math.abs(ddy)
          ? (Math.abs(ddy) > 0 ? [[0, ddy > 0 ? 1 : -1]] : [])
          : (Math.abs(ddx) > 0 ? [[ddx > 0 ? 1 : -1, 0]] : []);
        dirs = [primary, ...secondary, [0, -1], [0, 1], [-1, 0], [1, 0]];
      } else {
        // ランダム徘徊
        dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]].sort(() => Math.random() - 0.5);
      }

      for (const [ex, ey] of dirs) {
        const nx = ent.x + ex, ny = ent.y + ey;
        if (!this.floor.isWalkable(nx, ny)) continue;
        if (this.floor.getEnemyAt(nx, ny)) continue;
        // プレイヤー位置への移動 → 奇襲戦闘
        if (nx === this.px && ny === this.py) {
          if (dist <= 8) {
            const savedX = ent.x, savedY = ent.y;
            ent.x = nx; ent.y = ny;
            game.log(`${ent.enemy.name} が奇襲してきた！`, 'rl-log-warn');
            this.startCombat(ent.enemy, nx, ny);
            return;
          }
          continue;
        }
        ent.x = nx; ent.y = ny;
        moved = true;
        break;
      }
    }
    if (moved) { game.rebuildDungeon3D(); game.renderMinimap(); }
  }

  // ─── SPACE インタラクト ───
  interact() {
    if (this.phase !== 'explore') return;
    const tile = this.floor.tiles[this.py][this.px];

    // 階段
    if (tile === TILE.STAIR_DOWN) {
      if (this.floorNum >= MAX_FLOORS) {
        if (this.hasMedal) { this.victory(); }
        else { game.log('最下層だ。勝利のメダルを探そう！', 'rl-log-warn'); }
      } else {
        game.log(`B${this.floorNum + 1}Fへ降りた。`, 'rl-log-info');
        this.floorNum++;
        this.floor = new DungeonFloor(this.floorNum);
        this.px = this.floor.playerStart.x;
        this.py = this.floor.playerStart.y;
        game.rebuildDungeon3D();
      }
      game.renderMinimap();
      game.updateHUD();
      return;
    }

    // アイテム取得
    const items = this.floor.getItemAt(this.px, this.py);
    if (items.length === 0) { game.log('ここには何もない。', 'rl-log-info'); return; }
    let changed = false;
    for (const it of [...items]) {
      if (it.itemId === 'medal') {
        this.hasMedal = true;
        game.log('✨ 勝利のメダルを手に入れた！地上へ戻ろう！', 'rl-log-item');
        this.floor.removeItem(this.px, this.py, 'medal');
        changed = true;
      } else if (this.player.addItem(it.itemId, it.qty)) {
        game.log(`${ITEM_DEFS[it.itemId]?.name || it.itemId} を拾った。`, 'rl-log-item');
        this.floor.removeItem(this.px, this.py, it.itemId);
        changed = true;
      } else {
        game.log('所持品がいっぱいで拾えない！', 'rl-log-warn');
      }
    }
    if (changed) { game.rebuildDungeon3D(); game.renderMinimap(); }
    game.updateHUD();
  }

  _onStep() {
    const tile = this.floor.tiles[this.py][this.px];
    const msgs = this.player.tickAilments();
    msgs.forEach(m => game.log(m.text, m.cls));
    if (this.player.hp <= 0) { this.gameOver(); return; }

    // 罠（自動発動）
    const trap = this.floor.getTrapAt(this.px, this.py);
    if (trap) { this._triggerTrap(trap); }

    // 足元ヒント（アイテム・階段）
    const items = this.floor.getItemAt(this.px, this.py);
    if (items.length > 0) {
      const names = items.map(i => ITEM_DEFS[i.itemId]?.name || i.itemId).join(', ');
      game.log(`足元: ${names}　[SPACE]で拾う`, 'rl-log-item');
    }
    if (tile === TILE.STAIR_DOWN) {
      game.log('階段がある。[SPACE] で次の階へ降りる', 'rl-log-info');
    }

    game.renderMinimap();
    game.updateHUD();
  }

  _triggerTrap(trapEntry) {
    const t = trapEntry.trap;
    game.log(`罠発動！ ${t.name} – ${t.desc}`, 'rl-log-trap');
    switch (t.id) {
      case 'teleporter':
        this.teleportPlayer();
        break;
      case 'poisonneedle':
        this.player.addAilment('poison');
        game.log('毒状態になった！', 'rl-log-trap');
        break;
      case 'pitfall': {
        const dmg = rnd(5, 20);
        this.player.hp = Math.max(0, this.player.hp - dmg);
        game.log(`落とし穴！${dmg}ダメージ。1階下へ落下。`, 'rl-log-dmg');
        if (this.player.hp <= 0) { this.gameOver(); return; }
        this.floorNum = Math.min(MAX_FLOORS, this.floorNum + 1);
        this.floor = new DungeonFloor(this.floorNum);
        this.px = this.floor.playerStart.x; this.py = this.floor.playerStart.y;
        game.rebuildDungeon3D();
        break;
      }
      case 'explosion': {
        const dex = this.player.dex;
        if (chance(0.3 + dex * 0.01)) { game.log('爆発物を回避した！', 'rl-log-info'); }
        else {
          const dmg = rnd(15, 40);
          this.player.hp = Math.max(0, this.player.hp - dmg);
          game.log(`爆発！${dmg}ダメージ！`, 'rl-log-dmg');
          if (this.player.hp <= 0) { this.gameOver(); return; }
        }
        break;
      }
      case 'alarm': {
        // 近くにモンスターを召喚
        const candidates = MONSTER_TABLE.filter(m => m.minFloor <= this.floorNum);
        const def = pick(candidates);
        const ex = clamp(this.px + rnd(-2, 2), 0, this.floor.W - 1);
        const ey = clamp(this.py + rnd(-2, 2), 0, this.floor.H - 1);
        if (this.floor.tiles[ey][ex] === TILE.FLOOR && !this.floor.getEnemyAt(ex, ey)) {
          this.floor.enemies.push({ x: ex, y: ey, enemy: new Enemy(def, this.floorNum) });
          game.rebuildDungeon3D();
        }
        break;
      }
      case 'hiddenneedle': {
        const dex = this.player.dex; const int_ = this.player.int;
        if (chance(0.1 + (dex + int_) * 0.005)) { game.log('隠し針を感知した！回避！', 'rl-log-info'); }
        else {
          const dmg = rnd(5, 15);
          this.player.hp = Math.max(0, this.player.hp - dmg);
          game.log(`隠し針！${dmg}ダメージ。`, 'rl-log-dmg');
          if (this.player.hp <= 0) { this.gameOver(); return; }
        }
        break;
      }
    }
    this.floor.removeTrap(this.px, this.py);
    game.updateHUD();
  }

  teleportPlayer() {
    // ランダムな FLOOR タイルへ移動
    const floors = [];
    for (let y = 0; y < this.floor.H; y++) for (let x = 0; x < this.floor.W; x++) if (this.floor.tiles[y][x] === TILE.FLOOR) floors.push({ x, y });
    if (floors.length > 0) { const p = pick(floors); this.px = p.x; this.py = p.y; }
    game.updateCamera();
  }

  // ─── 戦闘 ───
  startCombat(enemy, ex, ey) {
    this.phase = 'combat';
    this.combatEnemy = { enemy, ex, ey };
    this.defenseMode = false;
    this.combatTurn = 'player';
    game.openCombatModal(enemy);
  }

  // コマンド実行 → メッセージ配列を返す
  execCommand(cmd, subTarget) {
    const player = this.player;
    const enemy = this.combatEnemy.enemy;
    const msgs = [];

    switch (cmd) {
      case 'attack': {
        msgs.push(...CombatResolver.playerAttack(player, enemy));
        this.defenseMode = false;
        break;
      }
      case 'defend': {
        this.defenseMode = true;
        msgs.push({ text: '防御体勢をとった。次の攻撃のダメージを半減する。', cls: 'rl-log-info' });
        break;
      }
      case 'magic': {
        const spell = subTarget;
        const def = MAGIC_DEFS[spell];
        if (!def) { msgs.push({ text: '魔法が見つからない。', cls: 'rl-log-warn' }); return msgs; }
        if (player.mp < def.mpCost) { msgs.push({ text: `MP不足！(必要MP: ${def.mpCost})`, cls: 'rl-log-warn' }); return msgs; }
        player.mp -= def.mpCost;
        msgs.push(...CombatResolver.resolveSpell(spell, player, enemy, true, this));
        break;
      }
      case 'scroll': {
        const itemId = subTarget;
        const idef = ITEM_DEFS[itemId];
        if (!idef || idef.type !== 'scroll') { msgs.push({ text: 'スクロールではない。', cls: 'rl-log-warn' }); return msgs; }
        if (!player.hasItem(itemId)) { msgs.push({ text: '持っていない。', cls: 'rl-log-warn' }); return msgs; }
        player.removeItem(itemId);
        msgs.push({ text: `${idef.name} を使用した！`, cls: 'rl-log-item' });
        msgs.push(...CombatResolver.resolveSpell(idef.spell, player, enemy, true, this));
        break;
      }
      case 'item': {
        const itemId = subTarget;
        const idef = ITEM_DEFS[itemId];
        if (!idef || idef.type !== 'potion') { msgs.push({ text: '使用できないアイテムです。', cls: 'rl-log-warn' }); return msgs; }
        player.removeItem(itemId);
        msgs.push({ text: `${idef.name} を使った。`, cls: 'rl-log-item' });
        if (idef.subtype === 'hp') { player.hp = Math.min(player.maxHp, player.hp + idef.effect); msgs.push({ text: `HP が ${idef.effect} 回復した。`, cls: 'rl-log-heal' }); }
        else if (idef.subtype === 'mp') { player.mp = Math.min(player.maxMp, player.mp + idef.effect); msgs.push({ text: `MP が ${idef.effect} 回復した。`, cls: 'rl-log-heal' }); }
        else if (idef.subtype === 'status') { player.clearAilments(); msgs.push({ text: '状態異常が回復した。', cls: 'rl-log-heal' }); }
        else if (idef.subtype === 'all') { player.hp = player.maxHp; player.mp = player.maxMp; player.clearAilments(); msgs.push({ text: 'HP・MP・状態異常が全回復した！', cls: 'rl-log-heal' }); }
        break;
      }
      case 'equip': {
        const itemId = subTarget;
        const msg = player.equipItem(itemId);
        msgs.push({ text: msg, cls: 'rl-log-item' });
        break;
      }
      case 'run': {
        const rate = clamp(0.3 + player.dex * 0.02, 0.1, 0.9);
        if (chance(rate)) {
          msgs.push({ text: '逃げ切った！', cls: 'rl-log-info' });
          this._endCombat(false, false);
          return msgs;
        } else {
          msgs.push({ text: '逃げられなかった！', cls: 'rl-log-warn' });
        }
        break;
      }
      case 'special': {
        const canSpecial = player.hp < player.maxHp * 0.5 || (player.weapon && ['sword', 'spear'].includes(ITEM_DEFS[player.weapon]?.subtype));
        if (!canSpecial) { msgs.push({ text: '特殊攻撃の条件を満たしていない。', cls: 'rl-log-warn' }); return msgs; }
        const dmg = Math.floor(CombatResolver.calcDamage(player.atk * 1.8, enemy.def, player.str, enemy.vit));
        enemy.hp -= dmg;
        msgs.push({ text: `特殊攻撃！ ${enemy.name} に ${dmg} の大ダメージ！`, cls: 'rl-log-dmg' });
        break;
      }
    }

    // 敵死亡チェック
    if (enemy.hp <= 0) {
      msgs.push(...this._defeatEnemy());
      return msgs;
    }

    // 敵ターン
    msgs.push(...this._enemyTurn(enemy));

    // プレイヤー死亡チェック
    if (player.hp <= 0) { this.gameOver(); }
    return msgs;
  }

  _enemyTurn(enemy) {
    const msgs = [];
    // 状態異常ターン更新
    if (enemy.ailments) {
      enemy.ailments = enemy.ailments.filter(a => {
        if (typeof a === 'object') { a.turns--; if (a.turns <= 0) { msgs.push({ text: `${enemy.name} の${a.id}が解けた。`, cls: 'rl-log-info' }); return false; } return true; }
        return true;
      });
    }
    msgs.push(...CombatResolver.enemyAttack(enemy, this.player, this.defenseMode));
    this.defenseMode = false;
    return msgs;
  }

  _defeatEnemy() {
    const msgs = [];
    const enemy = this.combatEnemy.enemy;
    msgs.push({ text: `${enemy.name} を倒した！`, cls: 'rl-log-info' });
    msgs.push({ text: `経験値 ${enemy.exp} を得た。`, cls: 'rl-log-exp' });
    this.player.gold += enemy.gold;
    msgs.push({ text: `${enemy.gold}G を手に入れた。`, cls: 'rl-log-item' });

    // ドロップ
    for (const dropId of enemy.dropTable) {
      if (this.player.addItem(dropId)) {
        msgs.push({ text: `${ITEM_DEFS[dropId]?.name || dropId} をドロップした！`, cls: 'rl-log-item' });
      } else {
        msgs.push({ text: `${ITEM_DEFS[dropId]?.name || dropId} を拾えなかった（所持品上限）。`, cls: 'rl-log-warn' });
      }
    }

    const levelUps = this.player.gainExp(enemy.exp);
    levelUps.forEach(lu => msgs.push({ text: `⬆ レベルアップ！ Lv.${lu.level} になった！`, cls: 'rl-log-exp' }));
    this._pendingLevelUps.push(...levelUps);

    this.floor.removeEnemy(this.combatEnemy.ex, this.combatEnemy.ey);
    game.rebuildDungeon3D();
    this._endCombat(true, levelUps.length > 0);
    return msgs;
  }

  _endCombat(won, leveled) {
    this.phase = 'explore';
    this.combatEnemy = null;
    this.defenseMode = false;
    game.closeCombatModal(leveled);
  }

  // ─── 地上 ───
  goToSurface() {
    this.onSurface = true;
    this.phase = 'inn';
    game.openInn();
  }

  leaveInn() {
    game.closeInn();
    this.phase = 'shop';
    game.openShop();
  }

  leaveShop() {
    game.closeShop();
    if (this.hasMedal) { this.victory(); return; }
    this.onSurface = false;
    this.phase = 'explore';
  }

  // ─── 勝敗 ───
  victory() {
    this.phase = 'result';
    game.showResult(true, `Lv.${this.player.level} で勝利のメダルを持ち帰った！\nゴールドは ${this.player.gold}G`);
  }

  gameOver() {
    this.phase = 'result';
    game.showResult(false, `B${this.floorNum}F で力尽きた…\nLv.${this.player.level}`);
  }
}

// ─────────────────────────────────────────
// Three.js レンダラー
// ─────────────────────────────────────────
class Dungeon3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 8, 20);

    this.camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.1, 40);
    this.camera.position.set(0, 1.6, 0);

    this._setupLights();
    this._meshGroup = new THREE.Group();
    this.scene.add(this._meshGroup);

    this._materials = this._buildMaterials();
    this._animId = null;
    this._startLoop();
  }

  _setupLights() {
    // 環境光（ほんのり薄明かり）
    const ambient = new THREE.AmbientLight(0x443333, 1.2);
    this.scene.add(ambient);

    // プレイヤーが持つ松明ライト
    this.playerLight = new THREE.PointLight(0xff9944, 2.5, 12);
    this.playerLight.castShadow = true;
    this.scene.add(this.playerLight);

    // 松明ゆらぎ用タイマー
    this._torchTime = 0;
    // 壁に取り付けた松明ライト群（buildFloor で設定）
    this._wallTorchLights = [];
  }

  _buildMaterials() {
    return {
      floor: new THREE.MeshLambertMaterial({ color: 0x3a3a3a }),
      wall: new THREE.MeshLambertMaterial({ color: 0x5a4a3a }),
      stair: new THREE.MeshLambertMaterial({ color: 0x6699aa }),
      chest: new THREE.MeshLambertMaterial({ color: 0xddaa22 }),
      door: new THREE.MeshLambertMaterial({ color: 0x886633 }),
      enemy: new THREE.MeshLambertMaterial({ color: 0xdd3333 }),
      trap: new THREE.MeshLambertMaterial({ color: 0xff6600 }),
      item: new THREE.MeshLambertMaterial({ color: 0x33ddaa }),
      // 松明素材
      torchPole: new THREE.MeshLambertMaterial({ color: 0x8b5e3c }),
      torchFlame: new THREE.MeshLambertMaterial({ color: 0xff8800, emissive: new THREE.Color(0xff4400), emissiveIntensity: 1.0 }),
    };
  }

  buildFloor(dungeonFloor, px, py) {
    // 既存メッシュをクリア
    while (this._meshGroup.children.length > 0) this._meshGroup.remove(this._meshGroup.children[0]);
    // 壁松明ライトを削除
    for (const l of this._wallTorchLights) this.scene.remove(l);
    this._wallTorchLights = [];

    const floor = dungeonFloor;
    const RENDER_RADIUS = 10; // 視野範囲

    const floorGeo = new THREE.BoxGeometry(1, 0.1, 1);
    const wallGeo = new THREE.BoxGeometry(1, 2, 1);
    const tinyGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const stairGeo = new THREE.BoxGeometry(0.8, 0.12, 0.8);
    // 松明ジオメトリ
    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6);
    const flameGeo = new THREE.ConeGeometry(0.1, 0.28, 7);

    // 松明配置チェック用: FLOORマスの中で壁に隣接する座標を収集
    const torchCandidates = [];
    for (let y = 1; y < floor.H - 1; y++) {
      for (let x = 1; x < floor.W - 1; x++) {
        if (floor.tiles[y][x] !== TILE.FLOOR) continue;
        if (Math.abs(x - px) > RENDER_RADIUS || Math.abs(y - py) > RENDER_RADIUS) continue;
        // いずれかの隣が壁 → 松明候補
        const adj = [[0, -1], [0, 1], [-1, 0], [1, 0]];
        const wallDir = adj.find(([dx, dy]) => floor.tiles[y + dy]?.[x + dx] === TILE.WALL);
        if (wallDir) torchCandidates.push({ x, y, wallDir });
      }
    }
    // 約15タイルに1本の割合でランダム配置（シード: x*31+y）
    const torchPositions = torchCandidates.filter(c => ((c.x * 31 + c.y * 17) % 15) === 0);

    for (let y = 0; y < floor.H; y++) {
      for (let x = 0; x < floor.W; x++) {
        if (Math.abs(x - px) > RENDER_RADIUS || Math.abs(y - py) > RENDER_RADIUS) continue;
        const t = floor.tiles[y][x];
        const wx = x - px, wz = y - py;

        if (t !== TILE.WALL) {
          const fm = new THREE.Mesh(floorGeo, this._materials.floor);
          fm.position.set(wx, -0.05, wz);
          fm.receiveShadow = true;
          this._meshGroup.add(fm);
        }
        if (t === TILE.WALL) {
          const wm = new THREE.Mesh(wallGeo, this._materials.wall);
          wm.position.set(wx, 0.95, wz);
          wm.castShadow = true;
          this._meshGroup.add(wm);
        } else if (t === TILE.STAIR_DOWN) {
          const sm = new THREE.Mesh(stairGeo, this._materials.stair);
          sm.position.set(wx, 0.06, wz);
          this._meshGroup.add(sm);
        } else if (t === TILE.CHEST) {
          const cm = new THREE.Mesh(tinyGeo, this._materials.chest);
          cm.position.set(wx, 0.2, wz);
          this._meshGroup.add(cm);
        } else if (t === TILE.DOOR) {
          const dm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 0.9), this._materials.door);
          dm.position.set(wx, 0.8, wz);
          this._meshGroup.add(dm);
        }
      }
    }

    // ── 壁松明を配置 ──
    for (const { x, y, wallDir } of torchPositions) {
      const wx = x - px, wz = y - py;
      // 柄
      const pole = new THREE.Mesh(poleGeo, this._materials.torchPole);
      pole.position.set(wx + wallDir[0] * 0.3, 1.1, wz + wallDir[1] * 0.3);
      this._meshGroup.add(pole);
      // 炎
      const flame = new THREE.Mesh(flameGeo, this._materials.torchFlame);
      flame.position.set(wx + wallDir[0] * 0.3, 1.38, wz + wallDir[1] * 0.3);
      this._meshGroup.add(flame);
      // 松明ライト（シーンに直接追加してワールド座標で使う）
      const tl = new THREE.PointLight(0xff7700, 1.6, 7);
      tl.position.set(x - px + wallDir[0] * 0.3, 1.4, y - py + wallDir[1] * 0.3);
      // ゆらぎ用の位相を保存
      tl.userData.phase = (x * 7 + y * 13) % 100 / 10;
      this.scene.add(tl);
      this._wallTorchLights.push(tl);
    }

    // アイテム
    for (const it of floor.items) {
      if (Math.abs(it.x - px) > RENDER_RADIUS || Math.abs(it.y - py) > RENDER_RADIUS) continue;
      const im = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), this._materials.item);
      im.position.set(it.x - px, 0.15, it.y - py);
      this._meshGroup.add(im);
    }
    // 敵
    for (const ent of floor.enemies) {
      if (Math.abs(ent.x - px) > RENDER_RADIUS || Math.abs(ent.y - py) > RENDER_RADIUS) continue;
      const em = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.9, 8), this._materials.enemy);
      em.position.set(ent.x - px, 0.45, ent.y - py);
      this._meshGroup.add(em);
    }
    // 罠（発見済みのみ表示）
    for (const tr of floor.traps) {
      if (!tr.revealed) continue;
      if (Math.abs(tr.x - px) > RENDER_RADIUS || Math.abs(tr.y - py) > RENDER_RADIUS) continue;
      const tm = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.05, 8, 16), this._materials.trap);
      tm.position.set(tr.x - px, 0.05, tr.y - py);
      tm.rotation.x = Math.PI / 2;
      this._meshGroup.add(tm);
    }
  }

  // facingAngle: FACING_ANGLES[facing] を渡す
  updateCamera(facingAngle) {
    this.playerLight.position.set(0, 1.2, 0);
    this.camera.position.set(0, 1.6, 0);
    this.camera.rotation.set(0, facingAngle, 0);
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.renderer.domElement.width !== w || this.renderer.domElement.height !== h) {
      this.renderer.setSize(w, h, false);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  _startLoop() {
    const loop = (time = 0) => {
      this._animId = requestAnimationFrame(loop);
      this.resize();
      // 松明ゆらぎアニメーション
      this._torchTime = time * 0.001;
      // プレイヤー手持ち松明のゆらぎ
      const pFlicker = 1.8 + Math.sin(this._torchTime * 7.3) * 0.4 + Math.sin(this._torchTime * 13.1) * 0.2;
      this.playerLight.intensity = pFlicker;
      this.playerLight.distance = 10 + Math.sin(this._torchTime * 5.7) * 1.5;
      // 壁松明のゆらぎ
      for (const tl of this._wallTorchLights) {
        const ph = tl.userData.phase;
        tl.intensity = 1.4 + Math.sin(this._torchTime * 6.1 + ph) * 0.4 + Math.sin(this._torchTime * 11.3 + ph) * 0.15;
      }
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose() {
    if (this._animId) cancelAnimationFrame(this._animId);
    this.renderer.dispose();
  }
}

// ─────────────────────────────────────────
// ミニマップ描画
// ─────────────────────────────────────────
function renderMinimap(canvas, floor, px, py) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, W, H);
  const cw = W / floor.W, ch = H / floor.H;
  const COLORS = {
    [TILE.WALL]: '#1a1a1a',
    [TILE.FLOOR]: '#555',
    [TILE.STAIR_DOWN]: '#66aaff',
    [TILE.TRAP]: '#ff6600',
    [TILE.CHEST]: '#ddaa22',
    [TILE.DOOR]: '#886633',
  };
  for (let y = 0; y < floor.H; y++) {
    for (let x = 0; x < floor.W; x++) {
      const t = floor.tiles[y][x];
      ctx.fillStyle = COLORS[t] || '#333';
      ctx.fillRect(x * cw, y * ch, cw, ch);
    }
  }
  // 敵
  ctx.fillStyle = '#f87171';
  for (const e of floor.enemies) ctx.fillRect(e.x * cw + 1, e.y * ch + 1, cw - 2, ch - 2);
  // アイテム
  ctx.fillStyle = '#67e8f9';
  for (const i of floor.items) ctx.fillRect(i.x * cw + 1, i.y * ch + 1, cw - 2, ch - 2);
  // 罠（発見済み）
  ctx.fillStyle = '#fb923c';
  for (const t of floor.traps) { if (t.revealed) ctx.fillRect(t.x * cw + 1, t.y * ch + 1, cw - 2, ch - 2); }
  // プレイヤー
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(px * cw, py * ch, cw, ch);
}

// ─────────────────────────────────────────
// UI Controller – DOM操作とゲーム接続
// ─────────────────────────────────────────
class GameUI {
  constructor() {
    this.gs = null;
    this.d3 = null;
    this._facing = 2;   // 初期向き: 2=南(↓)
    this._inputLocked = false;
    this._selectedInvIdx = -1;
    this._combatSubMode = null; // 'magic'|'scroll'|'item'|'equip'
    this._bindClassSelect();
  }

  _bindClassSelect() {
    document.querySelectorAll('.rl-classbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = btn.dataset.class;
        this._startGame(cid);
      });
    });
  }

  _startGame(classId) {
    document.getElementById('rl-classselect').classList.add('hidden');
    document.getElementById('rl-game').classList.remove('hidden');

    this.gs = new GameState(classId);
    const canvas = document.getElementById('rl-canvas');
    this.d3 = new Dungeon3D(canvas);
    this.rebuildDungeon3D();
    this.updateHUD();
    this._bindKeys();
    this._bindCombat();
    this._bindInventory();
    this._bindShop();
    this._bindInn();
    this._bindResult();
    this.log(`${CLASS_DEFS[classId].name} でゲーム開始！ダンジョンへ潜れ。`, 'rl-log-info');
  }

  // ─── ログ ───
  log(text, cls = '') {
    const logEl = document.getElementById('rl-log');
    const p = document.createElement('p');
    if (cls) p.className = cls;
    p.textContent = text;
    logEl.appendChild(p);
    logEl.scrollTop = logEl.scrollHeight;
    // 最大200行
    while (logEl.children.length > 200) logEl.removeChild(logEl.firstChild);
  }

  // ─── HUD更新 ───
  updateHUD() {
    if (!this.gs) return;
    const p = this.gs.player;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const bar = (id, cur, max) => { const el = document.getElementById(id); if (el) el.style.width = `${Math.floor(cur / max * 100)}%`; };
    set('rl-hp', p.hp); set('rl-maxhp', p.maxHp);
    set('rl-mp', p.mp); set('rl-maxmp', p.maxMp);
    set('rl-lv', p.level); set('rl-exp', p.exp);
    set('rl-nextexp', p.requiredExp());
    set('rl-str', p.str); set('rl-int', p.int);
    set('rl-dex', p.dex); set('rl-vit', p.vit);
    set('rl-floor', this.gs.floorNum);
    set('rl-gold', p.gold);
    set('rl-classname', p.className ?? '');
    bar('rl-hpbar', p.hp, p.maxHp);
    bar('rl-mpbar', p.mp, p.maxMp);
    bar('rl-expbar', p.exp, p.requiredExp());
    const ailEl = document.getElementById('rl-status-ailment');
    if (ailEl) ailEl.textContent = p.ailments.map(a => `[${a}]`).join(' ');
  }

  // ─── 3D再構築 ───
  rebuildDungeon3D() {
    if (!this.d3 || !this.gs) return;
    this.d3.buildFloor(this.gs.floor, this.gs.px, this.gs.py);
    this.d3.updateCamera(FACING_ANGLES[this._facing]);
  }

  updateCamera() {
    if (!this.d3 || !this.gs) return;
    this.d3.updateCamera(FACING_ANGLES[this._facing]);
  }

  // ─── ミニマップ ───
  renderMinimap() {
    if (!this.gs) return;
    const canvas = document.getElementById('rl-minimap');
    renderMinimap(canvas, this.gs.floor, this.gs.px, this.gs.py);
  }

  // ─── キーボード ───
  _bindKeys() {
    document.addEventListener('keydown', e => {
      if (this._inputLocked) return;
      if (!this.gs || this.gs.phase !== 'explore') return;
      const key = e.key.toLowerCase();
      let acted = false;

      if (key === 'w' || key === 'arrowup') {
        // 前進: 現在の向きに1歩進む
        const [dx, dy] = FACING_DIRS[this._facing];
        this.gs.move(dx, dy);
        acted = true;
      } else if (key === 'a' || key === 'arrowleft') {
        // 左回転 (反時計回り 90°)
        this._facing = (this._facing + 3) % 4;
        acted = true;
      } else if (key === 'd' || key === 'arrowright') {
        // 右回転 (時計回り 90°)
        this._facing = (this._facing + 1) % 4;
        acted = true;
      } else if (key === 's' || key === 'arrowdown') {
        // 後ろ回転 (180°)
        this._facing = (this._facing + 2) % 4;
        acted = true;
      } else if (key === ' ') {
        e.preventDefault();
        this.gs.interact();
        this.renderMinimap();
        this.updateHUD();
        return;
      } else if (key === 'i') { this.openInventory(); return; }
      else if (key === 'e') { this.openInventory('equip'); return; }
      else if (key === 'q') { this.openInventory('use'); return; }
      else if (key === 'x') { this.openInventory('drop'); return; }

      if (acted) {
        this.rebuildDungeon3D();
        this.renderMinimap();
        this.updateHUD();
        // ペンディングレベルアップ
        if (this.gs._pendingLevelUps.length > 0) {
          const lu = this.gs._pendingLevelUps.shift();
          this._showLevelUp(lu);
        }
      }
    });
  }

  _showLevelUp(lu) {
    const el = document.getElementById('rl-levelup-info');
    el.innerHTML = `<b>Lv.${lu.level}</b><br>HP +${lu.dhp}  MP +${lu.dmp}<br>STR +${lu.dstr}  INT +${lu.dint}  DEX +${lu.ddex}  VIT +${lu.dvit}`;
    this._openModal('rl-modal-levelup');
    this._inputLocked = true;
    document.getElementById('rl-levelup-ok').onclick = () => {
      this._closeModal('rl-modal-levelup');
      this._inputLocked = false;
      if (this.gs._pendingLevelUps.length > 0) this._showLevelUp(this.gs._pendingLevelUps.shift());
    };
  }

  // ─── 戦闘 ───
  _bindCombat() {
    document.querySelectorAll('.rl-cmdbtn[data-cmd]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        if (['magic', 'scroll', 'item', 'equip'].includes(cmd)) {
          this._openCombatSub(cmd);
        } else {
          this._execCombatCmd(cmd, null);
        }
      });
    });
    document.getElementById('rl-combat-sub-back').addEventListener('click', () => {
      document.getElementById('rl-combat-sub').classList.add('hidden');
      document.getElementById('rl-combat-cmds').classList.remove('hidden');
      this._combatSubMode = null;
    });
  }

  _openCombatSub(mode) {
    this._combatSubMode = mode;
    const list = document.getElementById('rl-combat-sub-list');
    list.innerHTML = '';
    const player = this.gs.player;

    if (mode === 'magic') {
      // 習得している魔法 = クラスに応じてフィルタ
      const magicIds = this._getPlayerMagics();
      if (magicIds.length === 0) { this.log('使える魔法がない。', 'rl-log-warn'); return; }
      magicIds.forEach(id => {
        const md = MAGIC_DEFS[id];
        const btn = document.createElement('button');
        btn.className = 'rl-cmdbtn';
        btn.textContent = `${md.name} (MP:${md.mpCost})`;
        btn.disabled = player.mp < md.mpCost;
        btn.addEventListener('click', () => this._execCombatCmd('magic', id));
        list.appendChild(btn);
      });
    } else if (mode === 'scroll') {
      const scrolls = player.inventory.filter(i => ITEM_DEFS[i.itemId]?.type === 'scroll');
      if (scrolls.length === 0) { this.log('スクロールを持っていない。', 'rl-log-warn'); return; }
      scrolls.forEach(i => {
        const def = ITEM_DEFS[i.itemId];
        const btn = document.createElement('button');
        btn.className = 'rl-cmdbtn';
        btn.textContent = `${def.name} x${i.qty}`;
        btn.addEventListener('click', () => this._execCombatCmd('scroll', i.itemId));
        list.appendChild(btn);
      });
    } else if (mode === 'item') {
      const potions = player.inventory.filter(i => ITEM_DEFS[i.itemId]?.type === 'potion');
      if (potions.length === 0) { this.log('使えるアイテムがない。', 'rl-log-warn'); return; }
      potions.forEach(i => {
        const def = ITEM_DEFS[i.itemId];
        const btn = document.createElement('button');
        btn.className = 'rl-cmdbtn';
        btn.textContent = `${def.name} x${i.qty}`;
        btn.addEventListener('click', () => this._execCombatCmd('item', i.itemId));
        list.appendChild(btn);
      });
    } else if (mode === 'equip') {
      const equipItems = player.inventory.filter(i => {
        const d = ITEM_DEFS[i.itemId];
        return d && (d.type === 'weapon' || d.type === 'armor');
      });
      if (equipItems.length === 0) { this.log('装備できるアイテムがない。', 'rl-log-warn'); return; }
      equipItems.forEach(i => {
        const def = ITEM_DEFS[i.itemId];
        const btn = document.createElement('button');
        btn.className = 'rl-cmdbtn';
        const isEq = player.weapon === i.itemId || Object.values(player.armors).includes(i.itemId);
        btn.textContent = `${def.name}${isEq ? ' [装備中]' : ''}`;
        btn.addEventListener('click', () => this._execCombatCmd('equip', i.itemId));
        list.appendChild(btn);
      });
    }

    document.getElementById('rl-combat-cmds').classList.add('hidden');
    document.getElementById('rl-combat-sub').classList.remove('hidden');
  }

  _getPlayerMagics() {
    const classId = this.gs.player.classId;
    const allMagic = Object.keys(MAGIC_DEFS);
    // クラスによって使用可能な魔法を制限
    if (classId === 'warrior') return allMagic.filter(id => !['sleep', 'paralyze', 'blind', 'freeze', 'gravity'].includes(id));
    if (classId === 'thief') return ['teleport', 'blind', 'cure'];
    if (classId === 'priest') return ['cure', 'heal', 'statbuf', 'sleep', 'paralyze'];
    return allMagic; // mage, adventurer: 全魔法
  }

  _execCombatCmd(cmd, sub) {
    if (!this.gs || this.gs.phase !== 'combat') return;
    // サブパネルを閉じる
    document.getElementById('rl-combat-sub').classList.add('hidden');
    document.getElementById('rl-combat-cmds').classList.remove('hidden');

    const msgs = this.gs.execCommand(cmd, sub);
    const logEl = document.getElementById('rl-combat-log');
    msgs.forEach(m => {
      const p = document.createElement('p');
      if (m.cls) p.className = m.cls;
      p.textContent = m.text;
      logEl.appendChild(p);
      // メインログにも流す
      this.log(m.text, m.cls);
    });
    logEl.scrollTop = logEl.scrollHeight;
    while (logEl.children.length > 100) logEl.removeChild(logEl.firstChild);

    // 敵HPバー更新
    if (this.gs.combatEnemy) {
      const e = this.gs.combatEnemy.enemy;
      document.getElementById('rl-enemy-hp').textContent = Math.max(0, e.hp);
      const pct = Math.max(0, e.hp / e.maxHp * 100);
      document.getElementById('rl-enemy-hpbar').style.width = pct + '%';
      const ailStr = e.ailments.map(a => typeof a === 'object' ? `[${a.id}]` : `[${a}]`).join(' ');
      document.getElementById('rl-enemy-ailment').textContent = ailStr;
    }
    this.updateHUD();
  }

  openCombatModal(enemy) {
    document.getElementById('rl-combat-title').textContent = `戦闘: ${enemy.name} Lv.${enemy.level}`;
    document.getElementById('rl-enemy-name').textContent = enemy.name;
    document.getElementById('rl-enemy-hp').textContent = enemy.hp;
    document.getElementById('rl-enemy-maxhp').textContent = enemy.maxHp;
    document.getElementById('rl-enemy-hpbar').style.width = '100%';
    document.getElementById('rl-enemy-ailment').textContent = '';
    document.getElementById('rl-combat-log').innerHTML = '';
    document.getElementById('rl-combat-sub').classList.add('hidden');
    document.getElementById('rl-combat-cmds').classList.remove('hidden');
    this._openModal('rl-modal-combat');
    this.log(`${enemy.name} (Lv.${enemy.level}) が現れた！`, 'rl-log-warn');
  }

  closeCombatModal(leveled) {
    this._closeModal('rl-modal-combat');
    this.updateHUD();
    this.rebuildDungeon3D();
    if (leveled && this.gs._pendingLevelUps.length > 0) {
      this._showLevelUp(this.gs._pendingLevelUps.shift());
    }
  }

  // ─── インベントリ ───
  _bindInventory() {
    document.getElementById('rl-inv-close').addEventListener('click', () => this._closeModal('rl-modal-inv'));
    document.getElementById('rl-inv-use').addEventListener('click', () => this._invAction('use'));
    document.getElementById('rl-inv-equip').addEventListener('click', () => this._invAction('equip'));
    document.getElementById('rl-inv-drop').addEventListener('click', () => this._invAction('drop'));
    document.getElementById('rl-inv-cancel').addEventListener('click', () => {
      this._selectedInvIdx = -1;
      document.getElementById('rl-inv-actions').classList.add('hidden');
      this.openInventory();
    });
  }

  openInventory(mode) {
    const player = this.gs.player;
    const list = document.getElementById('rl-inv-list');
    list.innerHTML = '';
    document.getElementById('rl-inv-count').textContent = player.inventory.length;
    document.getElementById('rl-inv-actions').classList.add('hidden');
    this._selectedInvIdx = -1;

    player.inventory.forEach((item, idx) => {
      const def = ITEM_DEFS[item.itemId];
      const div = document.createElement('div');
      div.className = 'rl-inv-item';
      const isEq = player.weapon === item.itemId || Object.values(player.armors).includes(item.itemId);
      if (isEq) div.classList.add('equipped');
      div.innerHTML = `<span>${def?.name || item.itemId}${isEq ? ' ✓' : ''}</span><span class="rl-inv-qty">x${item.qty}</span>`;
      div.addEventListener('click', () => {
        document.querySelectorAll('.rl-inv-item').forEach(d => d.classList.remove('selected'));
        div.classList.add('selected');
        this._selectedInvIdx = idx;
        document.getElementById('rl-inv-actions').classList.remove('hidden');
        // ボタン有効/無効
        const d2 = ITEM_DEFS[item.itemId];
        document.getElementById('rl-inv-use').disabled = !d2 || (d2.type !== 'potion' && d2.type !== 'scroll');
        document.getElementById('rl-inv-equip').disabled = !d2 || (d2.type !== 'weapon' && d2.type !== 'armor');
      });
      list.appendChild(div);
    });

    if (mode === 'equip') this.log('E:装備するアイテムを選んでください。', 'rl-log-info');
    if (mode === 'use') this.log('Q:使用するアイテムを選んでください。', 'rl-log-info');
    if (mode === 'drop') this.log('X:捨てるアイテムを選んでください。', 'rl-log-info');

    this._openModal('rl-modal-inv');
  }

  _invAction(action) {
    const player = this.gs.player;
    if (this._selectedInvIdx < 0 || this._selectedInvIdx >= player.inventory.length) return;
    const item = player.inventory[this._selectedInvIdx];
    const idef = ITEM_DEFS[item.itemId];

    if (action === 'use') {
      if (idef.type === 'potion') {
        player.removeItem(item.itemId);
        if (idef.subtype === 'hp') { player.hp = Math.min(player.maxHp, player.hp + idef.effect); this.log(`HP +${idef.effect}`, 'rl-log-heal'); }
        else if (idef.subtype === 'mp') { player.mp = Math.min(player.maxMp, player.mp + idef.effect); this.log(`MP +${idef.effect}`, 'rl-log-heal'); }
        else if (idef.subtype === 'status') { player.clearAilments(); this.log('状態回復！', 'rl-log-heal'); }
        else if (idef.subtype === 'all') { player.hp = player.maxHp; player.mp = player.maxMp; player.clearAilments(); this.log('全回復！', 'rl-log-heal'); }
      } else if (idef.type === 'scroll') {
        player.removeItem(item.itemId);
        this.log(`${idef.name} を使用。`, 'rl-log-item');
        const msgs = CombatResolver.resolveSpell(idef.spell, player, null, false, this.gs);
        msgs.forEach(m => this.log(m.text, m.cls));
      }
    } else if (action === 'equip') {
      const msg = player.equipItem(item.itemId);
      this.log(msg, 'rl-log-item');
    } else if (action === 'drop') {
      const name = idef?.name || item.itemId;
      player.removeItem(item.itemId);
      this.log(`${name} を捨てた。`, 'rl-log-item');
    }

    this._closeModal('rl-modal-inv');
    this.updateHUD();
  }

  // ─── ショップ ───
  _bindShop() {
    document.getElementById('rl-shop-close').addEventListener('click', () => {
      this._closeModal('rl-modal-shop');
      this.gs.leaveShop();
    });
    document.querySelectorAll('.rl-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.rl-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this._renderShopList(tab.dataset.tab);
      });
    });
  }

  openShop() {
    document.getElementById('rl-shop-gold').textContent = this.gs.player.gold;
    this._renderShopList('buy');
    this._openModal('rl-modal-shop');
  }

  _renderShopList(mode) {
    const list = document.getElementById('rl-shop-list');
    list.innerHTML = '';
    document.getElementById('rl-shop-gold').textContent = this.gs.player.gold;

    if (mode === 'buy') {
      const shopStock = ['hp_potion', 'mp_potion', 'st_potion', 'all_potion',
        'sc_fire', 'sc_ice', 'sc_lightning', 'sc_sleep', 'sc_paralyze', 'sc_blind',
        'sc_teleport', 'sc_freeze', 'sc_gravity', 'sc_cure', 'sc_recover', 'sc_statbuf',
        'sword', 'spear', 'bow', 'staff', 'armor', 'shield', 'helmet'];
      shopStock.forEach(id => {
        const def = ITEM_DEFS[id];
        const row = document.createElement('div');
        row.className = 'rl-shop-item';
        row.innerHTML = `<span>${def.name}</span><span>${def.buy}G</span>`;
        const btn = document.createElement('button');
        btn.textContent = '購入';
        btn.disabled = this.gs.player.gold < def.buy || this.gs.player.inventory.length >= MAX_INVENTORY;
        btn.addEventListener('click', () => {
          if (this.gs.player.gold < def.buy) { this.log('G不足！', 'rl-log-warn'); return; }
          if (!this.gs.player.addItem(id)) { this.log('所持品がいっぱい！', 'rl-log-warn'); return; }
          this.gs.player.gold -= def.buy;
          this.log(`${def.name} を ${def.buy}G で購入した。`, 'rl-log-item');
          this._renderShopList('buy');
          this.updateHUD();
        });
        row.appendChild(btn);
        list.appendChild(row);
      });
    } else {
      this.gs.player.inventory.forEach(item => {
        const def = ITEM_DEFS[item.itemId];
        if (!def || def.sell === undefined) return;
        const row = document.createElement('div');
        row.className = 'rl-shop-item';
        row.innerHTML = `<span>${def.name} x${item.qty}</span><span>${def.sell}G</span>`;
        const btn = document.createElement('button');
        btn.textContent = '売却';
        btn.addEventListener('click', () => {
          this.gs.player.removeItem(item.itemId);
          this.gs.player.gold += def.sell;
          this.log(`${def.name} を ${def.sell}G で売却した。`, 'rl-log-item');
          this._renderShopList('sell');
          this.updateHUD();
        });
        row.appendChild(btn);
        list.appendChild(row);
      });
      if (list.children.length === 0) list.innerHTML = '<div style="padding:10px;color:#888">売れるものがない</div>';
    }
  }

  closeShop() { this._closeModal('rl-modal-shop'); }

  // ─── 宿屋 ───
  _bindInn() {
    document.getElementById('rl-inn-stay').addEventListener('click', () => {
      const cost = this._innCost();
      if (this.gs.player.gold < cost) { this.log(`G不足（必要: ${cost}G）`, 'rl-log-warn'); return; }
      this.gs.player.gold -= cost;
      this.gs.player.hp = this.gs.player.maxHp;
      this.gs.player.mp = this.gs.player.maxMp;
      this.gs.player.clearAilments();
      this.log('ゆっくり休んだ。HP・MP・状態異常が全回復した！', 'rl-log-heal');
      this._closeModal('rl-modal-inn');
      this.updateHUD();
      this.gs.leaveInn();
    });
    document.getElementById('rl-inn-leave').addEventListener('click', () => {
      this._closeModal('rl-modal-inn');
      this.gs.leaveInn();
    });
  }

  _innCost() { return Math.max(10, this.gs.floorNum * 20); }

  openInn() {
    document.getElementById('rl-inn-cost').textContent = this._innCost();
    this._openModal('rl-modal-inn');
  }

  closeInn() { this._closeModal('rl-modal-inn'); }

  // ─── 結果画面 ───
  _bindResult() {
    document.getElementById('rl-result-retry').addEventListener('click', () => {
      this._closeModal('rl-modal-result');
      // クラス選択に戻る
      if (this.d3) { this.d3.dispose(); this.d3 = null; }
      this.gs = null;
      document.getElementById('rl-game').classList.add('hidden');
      document.getElementById('rl-classselect').classList.remove('hidden');
      document.getElementById('rl-log').innerHTML = '';
    });
  }

  showResult(won, msg) {
    const title = document.getElementById('rl-result-title');
    title.textContent = won ? '🏆 勝利！' : '💀 ゲームオーバー';
    title.style.color = won ? '#fbbf24' : '#f87171';
    document.getElementById('rl-result-msg').textContent = msg;
    this._openModal('rl-modal-result');
  }

  // ─── モーダル汎用 ───
  _openModal(id) { document.getElementById(id)?.classList.remove('hidden'); }
  _closeModal(id) { document.getElementById(id)?.classList.add('hidden'); }
}

// ─────────────────────────────────────────
// エントリーポイント
// ─────────────────────────────────────────
let game;
window.addEventListener('DOMContentLoaded', () => {
  game = new GameUI();
});
