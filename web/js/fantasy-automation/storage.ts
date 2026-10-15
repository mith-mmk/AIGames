import { BELT_SECONDS, DEFINITIONS, ENERGY_CAPACITY, GOAL, INPUT_CAPACITY, OUTPUT_CAPACITY, RECIPES, RESOURCES, STORAGE_CAPACITY } from './data.js';
import { migrateGameState } from './migration.js';
import { TECHNOLOGIES, isKindUnlocked, isRecipeUnlocked } from './technology.js';
import { SIZE, type Building, type GameState, type Inventory, type Item, type Kind, type ProductionStats, type RecipeId, type ResearchState, type Resource, type TechId } from './types.js';

const KINDS = Object.keys(DEFINITIONS) as Kind[];
const LEGACY_RESOURCES: readonly Resource[] = ['wood', 'ore', 'ingot'];
const LEGACY_KINDS: readonly Kind[] = ['miner', 'belt', 'smelter', 'generator', 'wire', 'lumber', 'delivery'];
const V2_RESOURCES: readonly Resource[] = [...LEGACY_RESOURCES, 'rawCrystal', 'crystal', 'sword'];
const V2_KINDS: readonly Kind[] = [...LEGACY_KINDS, 'splitter', 'storage', 'crystalMiner', 'crystalRefiner', 'assembler'];
const V2_TECHS: readonly TechId[] = ['basic', 'logistics', 'crystals', 'assembly', 'mastery'];
const resourcesFor = (version: GameState['version']): readonly Resource[] => version === 1 ? LEGACY_RESOURCES : version === 2 ? V2_RESOURCES : RESOURCES;
const kindsFor = (version: GameState['version']): readonly Kind[] => version === 1 ? LEGACY_KINDS : version === 2 ? V2_KINDS : KINDS;
const TERRAIN = ['grass', 'ore', 'forest', 'crystal'];
const DATABASE = 'aigames-fantasy-automation';
const STORE = 'saves';
const SLOT = 'workshop';
const STATE_FIELDS = ['version', 'seed', 'tick', 'nextId', 'terrain', 'inventory', 'kits', 'buildings', 'delivered', 'won'];
const BUILDING_FIELDS = ['id', 'kind', 'x', 'z', 'direction', 'input', 'output', 'progress', 'working', 'energy', 'status', 'item', 'beltProgress', 'pendingEnergy'];

function record(value: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}が正しくありません。`);
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).some(key => !fields.includes(key))) throw new Error(`${label}に未対応の項目があります。`);
  return obj;
}
function number(value: unknown, label: string, max = Number.MAX_SAFE_INTEGER, integer = true): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isSafeInteger(value))) throw new Error(`${label}の数値が正しくありません。`);
  return value;
}
function flag(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label}が正しくありません。`);
  return value;
}
function item(value: unknown, version: GameState['version'] = 3): Item {
  const legacy = version === 1;
  const obj = record(value, legacy ? ['resource', 'automated'] : ['resource', 'automated', 'handled'], '搬送品');
  if (!resourcesFor(version).includes(obj.resource as Resource)) throw new Error('保存された資源が未対応です。');
  return { resource: obj.resource as Resource, automated: flag(obj.automated, '自動生産フラグ'), ...(Object.hasOwn(obj, 'handled') ? { handled: flag(obj.handled, '手動操作フラグ') } : {}) };
}
function items(value: unknown, capacity: number, version: GameState['version'] = 3): Item[] {
  if (!Array.isArray(value) || value.length > capacity) throw new Error('設備バッファが正しくありません。');
  return value.map(value => item(value, version));
}
function recipeDefinition(value: Building) {
  if (value.recipe) return RECIPES[value.recipe];
  return DEFINITIONS[value.kind];
}
function building(value: unknown, version: GameState['version']): Building {
  const legacy = version === 1;
  const obj = record(value, legacy ? BUILDING_FIELDS : [...BUILDING_FIELDS, 'reserved', 'recipe', 'splitCursor', ...(version === 3 ? ['golemWorker', 'golemPolicy', 'golemCooldown', 'golemRoute'] : [])], '設備');
  if (!kindsFor(version).includes(obj.kind as Kind)) throw new Error('保存された設備が未対応です。');
  if (typeof obj.status !== 'string' || obj.status.length > 256) throw new Error('設備の状態が正しくありません。');
  const id = number(obj.id, '設備ID');
  if (id === 0) throw new Error('設備IDが正しくありません。');
  const kind = obj.kind as Kind;
  const recipe = Object.hasOwn(obj, 'recipe') ? obj.recipe as RecipeId : undefined;
  if (recipe !== undefined && (!Object.hasOwn(RECIPES, recipe) || !DEFINITIONS[kind].recipes?.includes(recipe) || (version === 2 && !['ingot', 'crystal', 'sword'].includes(recipe)))) throw new Error('設備のレシピが正しくありません。');
  const definition = recipe ? RECIPES[recipe] : DEFINITIONS[kind];
  const result: Building = {
    id, kind, x: number(obj.x, 'X座標', SIZE - 1), z: number(obj.z, 'Z座標', SIZE - 1),
    direction: number(obj.direction, '方向', 3) as Building['direction'], input: items(obj.input, kind === 'storage' ? STORAGE_CAPACITY : INPUT_CAPACITY, version), output: items(obj.output, OUTPUT_CAPACITY, version),
    progress: number(obj.progress, '作業進捗', definition.seconds ?? 0, false), working: flag(obj.working, '作業フラグ'),
    energy: number(obj.energy, '魔力', ENERGY_CAPACITY, false), status: obj.status,
    item: obj.item === null ? null : item(obj.item, version), beltProgress: number(obj.beltProgress, '搬送進捗', BELT_SECONDS, false),
    ...(Object.hasOwn(obj, 'pendingEnergy') ? { pendingEnergy: number(obj.pendingEnergy, '内部完成魔力', ENERGY_CAPACITY, false) } : {}),
    ...(recipe ? { recipe } : {}),
    ...(!legacy ? { reserved: items(obj.reserved, INPUT_CAPACITY, version) } : {}),
    ...(Object.hasOwn(obj, 'splitCursor') ? { splitCursor: number(obj.splitCursor, '分配方向', 1) as 0 | 1 } : {}),
  };
  if (Object.hasOwn(obj, 'golemWorker')) result.golemWorker = item(obj.golemWorker, version);
  if (Object.hasOwn(obj, 'golemPolicy')) {
    if (obj.golemPolicy !== 'fuel' && obj.golemPolicy !== 'materials') throw new Error('ゴーレムの補助方針が正しくありません。');
    result.golemPolicy = obj.golemPolicy;
  }
  if (Object.hasOwn(obj, 'golemCooldown')) result.golemCooldown = number(obj.golemCooldown, 'ゴーレムの待機時間', 19);
  if (Object.hasOwn(obj, 'golemRoute')) {
    const route = record(obj.golemRoute, ['sourceId', 'targetId', 'resource', 'tick'], 'ゴーレムの搬送記録');
    if (!RESOURCES.includes(route.resource as Resource)) throw new Error('ゴーレムの搬送資源が未対応です。');
    const sourceId = number(route.sourceId, '搬送元ID'), targetId = number(route.targetId, '搬送先ID');
    if (!sourceId || !targetId || sourceId === targetId) throw new Error('ゴーレムの搬送先が正しくありません。');
    result.golemRoute = { sourceId, targetId, resource: route.resource as Resource, tick: number(route.tick, '搬送時刻') };
  }
  validateBuildingSemantics(result, legacy);
  return result;
}
function validateBuildingSemantics(value: Building, legacy: boolean): void {
  const definition = recipeDefinition(value);
  const recipe = definition.input ?? {};
  const reserved = value.reserved ?? [];
  if (value.kind === 'belt' || value.kind === 'splitter') {
    if (value.input.length || value.output.length || reserved.length || value.progress || value.working || (!value.item && value.beltProgress)) throw new Error('ベルトの搬送状態が正しくありません。');
  } else if (value.item !== null || value.beltProgress !== 0) throw new Error('設備に未対応の搬送品があります。');
  if (value.kind !== 'splitter' && value.splitCursor !== undefined) throw new Error('分配器以外に分配方向があります。');
  if (value.kind === 'splitter' && value.splitCursor === undefined) throw new Error('分配器に分配方向がありません。');
  if (value.kind !== 'generator' && (value.energy !== 0 || value.pendingEnergy !== undefined)) throw new Error('魔力を保持できない設備です。');
  if (!value.working && (value.progress !== 0 || reserved.length)) throw new Error('停止中の設備に作業進捗・予約素材があります。');
  if (value.working && (definition.seconds === undefined || ['belt', 'splitter'].includes(value.kind))) throw new Error('この設備は生産作業できません。');
  if (value.kind !== 'golemRelay' && (value.golemWorker !== undefined || value.golemPolicy !== undefined || value.golemCooldown !== undefined || value.golemRoute !== undefined)) throw new Error('ゴーレム補助拠点以外に補助状態があります。');
  if (value.kind === 'golemRelay') {
    if (value.working || value.progress || reserved.length || value.output.length || value.input.length > 1 || value.input.some(item => item.resource !== 'golem') || (value.golemWorker && value.golemWorker.resource !== 'golem') || value.golemPolicy === undefined || value.golemCooldown === undefined) throw new Error('ゴーレム補助拠点の状態が正しくありません。');
    if (value.golemWorker && value.input.length) throw new Error('ゴーレムが重複しています。');
    return;
  }
  if (value.kind === 'storage') {
    if (value.output.length) throw new Error('収納箱の出力バッファが正しくありません。');
    return;
  }
  if (value.input.some(item => !Object.hasOwn(recipe, item.resource))) throw new Error('設備の入力素材がレシピと一致しません。');
  const outputResources = Object.keys(definition.output ?? {});
  if (value.output.some(item => !outputResources.includes(item.resource))) throw new Error('設備の完成品がレシピと一致しません。');
  if (value.working) {
    const count = Object.values(recipe).reduce((sum, amount) => sum + (amount ?? 0), 0);
    const inputs = legacy ? value.input.slice(0, count) : reserved;
    if (inputs.length !== count) throw new Error('稼働中の設備に予約素材がありません。');
    for (const [resource, amount] of Object.entries(recipe)) if (inputs.filter(item => item.resource === resource).length !== amount) throw new Error('稼働中の設備に予約素材がありません。');
  }
  if ((value.pendingEnergy ?? 0) > 0 && (!value.working || value.progress !== definition.seconds)) throw new Error('完成魔力の待機状態が正しくありません。');
}
function resourceCounts(value: unknown, label: string, version: GameState['version']): Partial<Inventory> {
  const obj = record(value, resourcesFor(version), label);
  const result: Partial<Inventory> = {};
  for (const resource of resourcesFor(version)) if (Object.hasOwn(obj, resource)) result[resource] = number(obj[resource], label);
  return result;
}
function stats(value: unknown, tick: number, delivered: number, version: GameState['version']): ProductionStats {
  const obj = record(value, ['produced', 'delivered', 'recentSwordTicks', 'peakSwordRate', ...(version === 3 ? ['golemFuelTransfers', 'golemTransfers'] : [])], '生産実績');
  const produced = resourceCounts(obj.produced, '生産数', version);
  const deliveries = resourceCounts(obj.delivered, '納品数', version);
  if ((deliveries.ingot ?? 0) !== delivered) throw new Error('鉄の延べ棒の納品実績が一致しません。');
  if (RESOURCES.some(resource => (deliveries[resource] ?? 0) > (produced[resource] ?? 0))) throw new Error('納品実績が生産実績を超えています。');
  if (!Array.isArray(obj.recentSwordTicks)) throw new Error('生産速度の記録が正しくありません。');
  const recentSwordTicks = obj.recentSwordTicks.map(value => number(value, '生産時刻', tick));
  if (recentSwordTicks.some((value, index) => index > 0 && value < recentSwordTicks[index - 1]) || recentSwordTicks.length > (produced.sword ?? 0)) throw new Error('生産速度の記録が正しくありません。');
  const peakSwordRate = number(obj.peakSwordRate, '最高生産速度');
  if (peakSwordRate > (produced.sword ?? 0) || peakSwordRate < recentSwordTicks.filter(value => value > tick - 1200).length) throw new Error('最高生産速度が正しくありません。');
  const result: ProductionStats = { produced, delivered: deliveries, recentSwordTicks, peakSwordRate };
  if (version === 3) {
    result.golemFuelTransfers = number(obj.golemFuelTransfers, '木材自動補給数');
    result.golemTransfers = number(obj.golemTransfers, 'ゴーレム搬送数');
    if (result.golemFuelTransfers > result.golemTransfers) throw new Error('木材補給数が総搬送数を超えています。');
  }
  return result;
}
function research(value: unknown, version: GameState['version']): ResearchState {
  const obj = record(value, ['unlocked', 'tracked'], '研究状態');
  const ids = version === 2 ? V2_TECHS : TECHNOLOGIES.map(node => node.id);
  if (!Array.isArray(obj.unlocked) || obj.unlocked.some(id => !ids.includes(id)) || new Set(obj.unlocked).size !== obj.unlocked.length || !obj.unlocked.includes('basic')) throw new Error('解放技術が正しくありません。');
  const unlocked = [...obj.unlocked] as TechId[];
  if (TECHNOLOGIES.some(node => unlocked.includes(node.id) && node.prerequisites.some(id => !unlocked.includes(id)))) throw new Error('解放技術の前提が一致しません。');
  if (obj.tracked !== null && !ids.includes(obj.tracked as TechId)) throw new Error('追跡技術が正しくありません。');
  return { unlocked, tracked: obj.tracked as TechId | null };
}
function validateSchema(value: unknown, version: GameState['version']): GameState {
  const legacy = version === 1;
  const obj = record(value, legacy ? STATE_FIELDS : [...STATE_FIELDS, 'stats', 'research', 'inventoryItems', 'pendingCrystalCells'], '保存データ');
  if (obj.version !== version) throw new Error('この保存形式には対応していません（対応: version 1・2・3）。');
  const allowedTerrain = legacy ? TERRAIN.slice(0, 3) : TERRAIN;
  if (!Array.isArray(obj.terrain) || obj.terrain.length !== SIZE * SIZE || obj.terrain.some(tile => !allowedTerrain.includes(tile))) throw new Error('保存された地形が正しくありません。');
  const resources = resourcesFor(version);
  const inventory = record(obj.inventory, resources, '所持資源');
  const validatedInventory = {} as Inventory;
  for (const resource of resources) validatedInventory[resource] = number(inventory[resource], '所持資源');
  const kinds = kindsFor(version);
  const kits = record(obj.kits, kinds, '所持設備');
  const validatedKits: Partial<Record<Kind, number>> = {};
  for (const kind of kinds) if (Object.hasOwn(kits, kind)) validatedKits[kind] = number(kits[kind], '所持設備数');
  if (!Array.isArray(obj.buildings) || obj.buildings.length > SIZE * SIZE) throw new Error('設備一覧が正しくありません。');
  const buildings = obj.buildings.map(value => building(value, version));
  const ids = new Set<number>(); const cells = new Set<string>();
  for (const facility of buildings) {
    const cell = `${facility.x},${facility.z}`;
    if (ids.has(facility.id) || cells.has(cell)) throw new Error('設備IDまたは配置が重複しています。');
    ids.add(facility.id); cells.add(cell);
    const terrain = obj.terrain[facility.z * SIZE + facility.x];
    if ((facility.kind === 'miner' && terrain !== 'ore') || (facility.kind === 'lumber' && terrain !== 'forest') || (facility.kind === 'crystalMiner' && terrain !== 'crystal')) throw new Error('設備と地形が一致していません。');
  }
  const nextId = number(obj.nextId, '次の設備ID');
  if (nextId < 1 || buildings.some(facility => facility.id >= nextId)) throw new Error('次の設備IDが正しくありません。');
  const delivered = number(obj.delivered, '自動納品数');
  const won = flag(obj.won, 'クリアフラグ');
  if (won !== (delivered >= GOAL)) throw new Error('納品数とクリア状態が一致していません。');
  const tick = number(obj.tick, '経過時間');
  const result: GameState = { version, seed: number(obj.seed, '地形シード'), tick, nextId, terrain: [...obj.terrain] as GameState['terrain'], inventory: validatedInventory, kits: validatedKits, buildings, delivered, won };
  if (!legacy) {
    if (Object.hasOwn(obj, 'pendingCrystalCells')) {
      if (!Array.isArray(obj.pendingCrystalCells) || obj.pendingCrystalCells.length > 2) throw new Error('未発見の結晶鉱脈が正しくありません。');
      const pending = obj.pendingCrystalCells.map(value => number(value, '未発見鉱脈の座標', SIZE * SIZE - 1));
      if (new Set(pending).size !== pending.length || pending.some(index => result.terrain[index] !== 'grass' || !cells.has(`${index % SIZE},${Math.floor(index / SIZE)}`))) throw new Error('未発見の結晶鉱脈と設備配置が一致しません。');
      result.pendingCrystalCells = pending;
    }
    for (const facility of buildings) if (facility.golemRoute && (facility.golemRoute.sourceId >= nextId || facility.golemRoute.targetId >= nextId || facility.golemRoute.tick > tick)) throw new Error('ゴーレムの搬送記録と経過時間が一致しません。');
    result.stats = stats(obj.stats, tick, delivered, version);
    result.research = research(obj.research, version);
    result.inventoryItems = items(obj.inventoryItems, RESOURCES.reduce((sum, resource) => Math.min(Number.MAX_SAFE_INTEGER, sum + (validatedInventory[resource] ?? 0)), 0), version);
    if (result.inventoryItems.some(item => !item.handled)) throw new Error('所持品の手動操作状態が正しくありません。');
    for (const resource of RESOURCES) if (result.inventoryItems.filter(item => item.resource === resource).length > (validatedInventory[resource] ?? 0)) throw new Error('所持品と資源数が一致していません。');
    for (const facility of buildings) if (!isKindUnlocked(result, facility.kind) || (facility.recipe && !isRecipeUnlocked(result, facility.recipe))) throw new Error('未解放の設備・レシピが保存されています。');
    for (const kind of kinds) if ((validatedKits[kind] ?? 0) > 0 && !isKindUnlocked(result, kind)) throw new Error('未解放の所持設備が保存されています。');
  }
  return result;
}

/** Validate the historical schema first, then explicitly migrate and strictly validate version 3. */
export function validateSave(value: unknown): GameState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('保存データが正しくありません。');
  const version = (value as { version?: unknown }).version;
  if (version === 1 || version === 2) return validateSchema(migrateGameState(validateSchema(value, version)), 3);
  if (version === 3) return validateSchema(value, 3);
  throw new Error('この保存形式には対応していません（対応: version 1・2・3）。');
}

export class GameSave {
  private database: Promise<IDBDatabase> | null = null;
  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      this.database = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('この環境では保存機能を利用できません。')); return; }
        const request = indexedDB.open(DATABASE, 1);
        request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
        request.onerror = () => reject(new Error('保存領域を開けませんでした。'));
        request.onblocked = () => reject(new Error('別のタブを閉じてから保存してください。'));
        request.onsuccess = () => {
          const db = request.result;
          db.onversionchange = () => { db.close(); this.database = null; };
          resolve(db);
        };
      }).catch(error => { this.database = null; throw error; });
    }
    return this.database;
  }
  private async transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.open();
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      let value: T;
      request.onsuccess = () => { value = request.result; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(new Error('保存領域へのアクセスに失敗しました。'));
      tx.onabort = () => reject(new Error('保存処理が中断されました。'));
    });
  }
  async load(): Promise<GameState | null> {
    const value = await this.transaction('readonly', store => store.get(SLOT));
    return value === undefined ? null : validateSave(value);
  }
  async save(state: GameState): Promise<void> {
    const snapshot = validateSave(state);
    await this.transaction('readwrite', store => store.put(snapshot, SLOT));
  }
  async clear(): Promise<void> {
    await this.transaction('readwrite', store => store.delete(SLOT));
  }
}
