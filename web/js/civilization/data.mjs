const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const entries = (rows) => freeze(Object.fromEntries(rows.map(([id, value]) => [id, freeze(value)])));

export const RULES_VERSION = 1;
export const SAVE_VERSION = 1;

export const TERRAIN = entries([
  ['grassland', { label: '草原', food: 2, production: 1, trade: 1, move: 1, defense: 0, water: false }],
  ['plains', { label: '平原', food: 1, production: 2, trade: 1, move: 1, defense: 0, water: false }],
  ['desert', { label: '砂漠', food: 0, production: 1, trade: 1, move: 1, defense: 0, water: false }],
  ['forest', { label: '森林', food: 1, production: 2, trade: 0, move: 2, defense: 0.5, water: false }],
  ['hills', { label: '丘陵', food: 0, production: 3, trade: 0, move: 2, defense: 0.5, water: false }],
  ['mountain', { label: '山岳', food: 0, production: 1, trade: 0, move: 3, defense: 1, water: false }],
  ['tundra', { label: 'ツンドラ', food: 1, production: 1, trade: 0, move: 1, defense: 0, water: false }],
  ['coast', { label: '沿岸', food: 2, production: 0, trade: 2, move: 1, defense: 0, water: true }],
  ['ocean', { label: '外洋', food: 1, production: 0, trade: 1, move: 1, defense: 0, water: true }],
]);

export const RESOURCES = entries([
  ['wheat', { label: '小麦', food: 2, production: 0, trade: 0, terrains: ['grassland', 'plains'] }],
  ['iron', { label: '鉄', food: 0, production: 2, trade: 0, terrains: ['hills', 'mountain'] }],
  ['fish', { label: '魚', food: 2, production: 0, trade: 0, terrains: ['coast'] }],
  ['silk', { label: '絹', food: 0, production: 0, trade: 2, terrains: ['forest', 'plains'] }],
]);

export const IMPROVEMENTS = entries([
  ['road', { label: '道路', kind: 'route', cost: 2, requires: 'engineering', terrains: ['grassland', 'plains', 'desert', 'forest', 'hills', 'tundra', 'coast'] }],
  ['railroad', { label: '鉄道', kind: 'route', cost: 4, requires: 'railroad', terrains: ['grassland', 'plains', 'desert', 'forest', 'hills', 'tundra', 'coast'] }],
  ['irrigation', { label: '灌漑', kind: 'landUse', cost: 3, requires: 'pottery', terrains: ['grassland', 'plains', 'desert', 'tundra'], food: 2, production: 0, trade: 0 }],
  ['mine', { label: '鉱山', kind: 'landUse', cost: 3, requires: 'mining', terrains: ['hills', 'mountain', 'desert', 'forest'], food: 0, production: 2, trade: 0 }],
]);

const unit = (label, symbol, cost, attack, defense, movement, role, domain = 'land', capacity = 0, ocean = false, requires = null, upkeep = 1, populationCost = 0, hp = 10) => ({ label, symbol, cost, attack, defense, hp, movement, role, domain, capacity, ocean, requires, upkeep, populationCost });
export const UNITS = entries([
  ['settler', unit('開拓者', 'S', 50, 0, 1, 2, 'settler', 'land', 0, false, null, 1, 1)], ['worker', unit('労働者', 'W', 30, 0, 1, 2, 'worker', 'land', 0, false, null)], ['scout', unit('偵察兵', 'R', 20, 1, 1, 3, 'scout')], ['warrior', unit('戦士', 'M', 25, 2, 2, 1, 'melee')],
  ['spearman', unit('槍兵', 'P', 40, 3, 3, 2, 'melee', 'land', 0, false, 'bronze_working')], ['archer', unit('弓兵', 'A', 45, 4, 2, 2, 'ranged', 'land', 0, false, 'mathematics')], ['swordsman', unit('剣士', 'S', 55, 5, 4, 2, 'melee', 'land', 0, false, 'iron_working')], ['horseman', unit('騎兵', 'H', 60, 6, 3, 3, 'melee', 'land', 0, false, 'horseback')], ['knight', unit('騎士', 'K', 80, 8, 5, 3, 'melee', 'land', 0, false, 'feudalism', 2)], ['musketman', unit('マスケット兵', 'G', 90, 9, 6, 2, 'melee', 'land', 0, false, 'gunpowder', 2)], ['rifleman', unit('ライフル兵', 'F', 110, 11, 8, 2, 'melee', 'land', 0, false, 'industrialization', 2)], ['infantry', unit('歩兵', 'I', 130, 13, 10, 2, 'melee', 'land', 0, false, 'combustion', 2)], ['tank', unit('戦車', 'T', 180, 16, 14, 3, 'melee', 'land', 0, false, 'combustion', 3)], ['catapult', unit('投石機', 'C', 70, 7, 2, 2, 'siege', 'land', 0, false, 'mathematics', 2)], ['cannon', unit('大砲', 'C', 110, 10, 4, 2, 'siege', 'land', 0, false, 'gunpowder', 2)], ['artillery', unit('砲兵', 'A', 150, 14, 6, 2, 'siege', 'land', 0, false, 'steel', 3)],
  ['galley', unit('ガレー船', 'G', 60, 4, 3, 2, 'naval', 'sea', 2, false, 'sailing', 2)], ['caravel', unit('キャラベル船', 'C', 90, 7, 5, 3, 'naval', 'sea', 3, true, 'compass', 2)], ['transport', unit('輸送船', 'T', 100, 1, 3, 2, 'transport', 'sea', 6, true, 'navigation', 2)], ['frigate', unit('フリゲート', 'F', 130, 11, 7, 3, 'naval', 'sea', 0, true, 'steam_power', 3)], ['ironclad', unit('装甲艦', 'I', 150, 13, 9, 2, 'naval', 'sea', 0, true, 'steel', 3)], ['battleship', unit('戦艦', 'B', 180, 16, 12, 3, 'naval', 'sea', 0, true, 'combustion', 3)],
]);

const building = (label, cost, requires = null, bonuses = {}) => ({ label, cost, requires, food: 0, production: 0, trade: 0, research: 0, culture: 0, happiness: 0, defense: 0, upkeep: 1, ...bonuses });
export const BUILDINGS = entries([
  ['granary', building('穀倉', 40, 'pottery', { food: 1 })], ['library', building('図書館', 50, 'writing', { research: 3 })], ['market', building('市場', 60, 'currency', { trade: 2 })], ['barracks', building('兵舎', 50, 'bronze_working', { defense: 0.25 })], ['temple', building('寺院', 60, 'theology', { culture: 2, happiness: 2 })], ['walls', building('城壁', 70, 'masonry', { defense: 0.5 })], ['harbor', building('港', 80, 'sailing', { trade: 3 })], ['aqueduct', building('水道', 90, 'engineering', { food: 2 })], ['courthouse', building('裁判所', 90, 'civil_service', { happiness: 1 })], ['workshop', building('工房', 100, 'guilds', { production: 2 })], ['university', building('大学', 120, 'education', { research: 6 })], ['theater', building('劇場', 110, 'theology', { culture: 4, happiness: 3 })], ['bank', building('銀行', 130, 'banking', { trade: 4 })], ['factory', building('工場', 160, 'industrialization', { production: 4 })], ['museum', building('博物館', 150, 'printing', { culture: 8 })], ['hospital', building('病院', 170, 'medicine', { food: 3, happiness: 1 })], ['powerplant', building('発電所', 180, 'electricity', { production: 5 })], ['researchlab', building('研究所', 200, 'computers', { research: 12 })], ['broadcast', building('放送局', 220, 'radio', { culture: 12, happiness: 3 })],
]);

export const PROJECTS = entries([
  ['cultural_masterpiece', { label: '文化大事業', cost: 500, requires: 'mass_media', kind: 'culture', part: null }], ['space_structure', { label: '宇宙船構造体', cost: 250, requires: 'rocketry', kind: 'space', part: 'structure' }], ['space_propulsion', { label: '宇宙船推進装置', cost: 350, requires: 'spaceflight', kind: 'space', part: 'propulsion' }], ['space_life_support', { label: '宇宙船生命維持装置', cost: 400, requires: 'spaceflight', kind: 'space', part: 'support' }],
]);

const tech = (label, cost, era, requires = [], description = '', effects = undefined) => ({ label, cost, requires, era, description, ...(effects ? { effects } : {}) });
export const TECHS = entries([
  ['pottery', tech('陶器', 60, '古代', [], '穀倉を解禁')], ['mining', tech('採鉱', 65, '古代', [], '鉱山資源を活用')], ['bronze_working', tech('青銅器', 70, '古代', ['mining'], '槍兵と兵舎を解禁')], ['writing', tech('筆記', 75, '古代', ['pottery'], '図書館を解禁')], ['sailing', tech('帆走', 80, '古代', [], '港とガレー船を解禁')], ['masonry', tech('石工術', 85, '古代', ['mining'], '城壁を解禁')],
  ['mathematics', tech('数学', 120, '古典', ['writing'], '弓兵と投石機を解禁')], ['currency', tech('通貨', 130, '古典', ['writing'], '市場を解禁')], ['iron_working', tech('鉄器', 140, '古典', ['bronze_working', 'mining'], '剣士を解禁')], ['horseback', tech('騎馬', 125, '古典', [], '騎兵を解禁')], ['philosophy', tech('哲学', 135, '古典', ['writing'], '研究基盤を整える', { research: 1 })], ['engineering', tech('工学', 150, '古典', ['mathematics', 'masonry'], '水道を解禁')],
  ['feudalism', tech('封建制度', 220, '中世', ['engineering'], '騎士を解禁')], ['theology', tech('神学', 230, '中世', ['philosophy'], '寺院と劇場を解禁')], ['education', tech('教育', 240, '中世', ['philosophy', 'writing'], '大学を解禁')], ['guilds', tech('ギルド', 250, '中世', ['currency'], '工房を解禁')], ['compass', tech('羅針盤', 235, '中世', ['sailing'], 'キャラベル船を解禁')], ['civil_service', tech('公民権', 260, '中世', ['feudalism'], '裁判所を解禁')],
  ['gunpowder', tech('火薬', 400, '近世', ['engineering'], 'マスケット兵と大砲を解禁')], ['printing', tech('印刷', 410, '近世', ['education'], '博物館を解禁')], ['navigation', tech('航海術', 420, '近世', ['compass'], '輸送船を解禁')], ['banking', tech('銀行制度', 430, '近世', ['currency', 'guilds'], '銀行を解禁')], ['constitution', tech('憲法', 440, '近世', ['civil_service'], '共和制を解禁')], ['scientific_method', tech('科学的方法', 450, '近世', ['education'], '研究を強化', { research: 2 })],
  ['steam_power', tech('蒸気機関', 750, '産業', ['engineering'], 'フリゲートを解禁')], ['industrialization', tech('工業化', 780, '産業', ['steam_power', 'guilds'], '工場とライフル兵を解禁')], ['railroad', tech('鉄道', 800, '産業', ['industrialization'], '移動網を強化', { production: 1 })], ['medicine', tech('医学', 770, '産業', ['scientific_method'], '病院を解禁')], ['electricity', tech('電気', 820, '産業', ['steam_power'], '発電所を解禁')], ['steel', tech('鋼鉄', 850, '産業', ['industrialization'], '砲兵と装甲艦を解禁')],
  ['combustion', tech('内燃機関', 1300, '現代', ['steel', 'industrialization'], '戦車と戦艦を解禁')], ['radio', tech('ラジオ', 1320, '現代', ['electricity'], '放送局を解禁')], ['computers', tech('コンピューター', 1350, '現代', ['electricity', 'scientific_method'], '研究所を解禁')], ['mass_media', tech('マスメディア', 1370, '現代', ['radio', 'printing'], '文化大事業を解禁')], ['rocketry', tech('ロケット工学', 1400, '現代', ['combustion', 'computers'], '宇宙船構造体を解禁')], ['spaceflight', tech('宇宙飛行', 1450, '現代', ['rocketry', 'computers'], '宇宙船部品を解禁')],
]);

export const GOVERNMENTS = entries([
  ['despotism', { label: '専制', requires: null, tradeMultiplier: 1, freeUnits: 4, happiness: 2, warWeariness: 0, upkeepMultiplier: 1 }], ['monarchy', { label: '君主制', requires: 'feudalism', tradeMultiplier: 1, freeUnits: 6, happiness: 3, warWeariness: 0.5, upkeepMultiplier: 0.8 }], ['republic', { label: '共和制', requires: 'constitution', tradeMultiplier: 1.25, freeUnits: 2, happiness: 2, warWeariness: 1, upkeepMultiplier: 1 }], ['democracy', { label: '民主制', requires: 'mass_media', tradeMultiplier: 1.5, freeUnits: 0, happiness: 3, warWeariness: 1.5, upkeepMultiplier: 1.2 }],
]);

export const PRESETS = entries([
  ['small', { label: '小', width: 48, height: 32, civCount: 4, speed: 0.6, maxTurns: 240 }], ['standard', { label: '標準', width: 64, height: 40, civCount: 6, speed: 1, maxTurns: 400 }], ['large', { label: '大', width: 96, height: 60, civCount: 8, speed: 1.5, maxTurns: 600 }],
]);
