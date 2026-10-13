import { BELT_SECONDS, DEFINITIONS, ENERGY_CAPACITY, GOAL, INPUT_CAPACITY, OUTPUT_CAPACITY } from './data.js';
import { SIZE, type Building, type GameState, type Item, type Kind, type Resource } from './types.js';

const RESOURCES: readonly Resource[] = ['wood', 'ore', 'ingot'];
const KINDS: readonly Kind[] = ['miner', 'belt', 'smelter', 'generator', 'wire', 'lumber', 'delivery'];
const TERRAIN = ['grass', 'ore', 'forest'];
const DATABASE = 'aigames-fantasy-automation';
const STORE = 'saves';
const SLOT = 'workshop';

function record(value: unknown, fields: readonly string[], label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}が正しくありません。`);
  const obj = value as Record<string, unknown>;
  if (Object.keys(obj).some(key => !fields.includes(key))) throw new Error(`${label}に未対応の項目があります。`);
  return obj;
}
function number(value: unknown, label: string, max = Number.MAX_SAFE_INTEGER, integer = true): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max || (integer && !Number.isSafeInteger(value))) {
    throw new Error(`${label}の数値が正しくありません。`);
  }
  return value;
}
function flag(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label}が正しくありません。`);
  return value;
}
function item(value: unknown): Item {
  const obj = record(value, ['resource', 'automated'], '搬送品');
  if (!RESOURCES.includes(obj.resource as Resource)) throw new Error('保存された資源が未対応です。');
  return { resource: obj.resource as Resource, automated: flag(obj.automated, '自動生産フラグ') };
}
function items(value: unknown, capacity: number): Item[] {
  if (!Array.isArray(value) || value.length > capacity) throw new Error('設備バッファが正しくありません。');
  return value.map(item);
}
function building(value: unknown): Building {
  const obj = record(value, ['id', 'kind', 'x', 'z', 'direction', 'input', 'output', 'progress', 'working', 'energy', 'status', 'item', 'beltProgress', 'pendingEnergy'], '設備');
  if (!KINDS.includes(obj.kind as Kind)) throw new Error('保存された設備が未対応です。');
  if (typeof obj.status !== 'string' || obj.status.length > 256) throw new Error('設備の状態が正しくありません。');
  const id = number(obj.id, '設備ID');
  if (id === 0) throw new Error('設備IDが正しくありません。');
  const result: Building = {
    id, kind: obj.kind as Kind, x: number(obj.x, 'X座標', SIZE - 1), z: number(obj.z, 'Z座標', SIZE - 1),
    direction: number(obj.direction, '方向', 3) as Building['direction'], input: items(obj.input, INPUT_CAPACITY), output: items(obj.output, OUTPUT_CAPACITY),
    progress: number(obj.progress, '作業進捗', DEFINITIONS[obj.kind as Kind].seconds ?? 0, false), working: flag(obj.working, '作業フラグ'),
    energy: number(obj.energy, '魔力', ENERGY_CAPACITY, false), status: obj.status,
    item: obj.item === null ? null : item(obj.item), beltProgress: number(obj.beltProgress, '搬送進捗', BELT_SECONDS, false),
    ...(Object.hasOwn(obj, 'pendingEnergy') ? { pendingEnergy: number(obj.pendingEnergy, '内部完成魔力', ENERGY_CAPACITY, false) } : {}),
  };
  validateBuildingSemantics(result);
  return result;
}

function validateBuildingSemantics(value: Building): void {
  const definition = DEFINITIONS[value.kind];
  const recipe = definition.input ?? {};
  if (value.kind === 'belt') {
    if (value.input.length || value.output.length || value.progress || value.working || (!value.item && value.beltProgress)) throw new Error('ベルトの搬送状態が正しくありません。');
  } else if (value.item !== null || value.beltProgress !== 0) throw new Error('設備に未対応の搬送品があります。');
  if (value.kind !== 'generator' && (value.energy !== 0 || value.pendingEnergy !== undefined)) throw new Error('魔力を保持できない設備です。');
  if (!value.working && value.progress !== 0) throw new Error('停止中の設備に作業進捗があります。');
  if (value.working && definition.seconds === undefined) throw new Error('この設備は生産作業できません。');
  if (value.input.some(item => !Object.hasOwn(recipe, item.resource))) throw new Error('設備の入力素材がレシピと一致しません。');
  const outputResources = Object.keys(definition.output ?? {});
  if (value.output.some(item => !outputResources.includes(item.resource))) throw new Error('設備の完成品がレシピと一致しません。');
  if (value.working) {
    const count = Object.values(recipe).reduce((sum, amount) => sum + (amount ?? 0), 0);
    const reserved = value.input.slice(0, count);
    for (const [resource, amount] of Object.entries(recipe)) if (reserved.filter(item => item.resource === resource).length !== amount) throw new Error('稼働中の設備に予約素材がありません。');
  }
  if ((value.pendingEnergy ?? 0) > 0 && (!value.working || value.progress !== definition.seconds)) throw new Error('完成魔力の待機状態が正しくありません。');
}

/** All schema changes must get an explicit migration before validation. No silent fallback/reset. */
function migrate(value: unknown): Record<string, unknown> {
  const obj = record(value, ['version', 'seed', 'tick', 'nextId', 'terrain', 'inventory', 'kits', 'buildings', 'delivered', 'won'], '保存データ');
  if (obj.version !== 1) throw new Error('この保存形式には対応していません（対応: version 1）。');
  return obj;
}

export function validateSave(value: unknown): GameState {
  const obj = migrate(value);
  if (!Array.isArray(obj.terrain) || obj.terrain.length !== SIZE * SIZE || obj.terrain.some(tile => !TERRAIN.includes(tile))) throw new Error('保存された地形が正しくありません。');
  const inventory = record(obj.inventory, RESOURCES, '所持資源');
  const kits = record(obj.kits, KINDS, '所持設備');
  const validatedKits: Partial<Record<Kind, number>> = {};
  for (const kind of KINDS) if (Object.hasOwn(kits, kind)) validatedKits[kind] = number(kits[kind], '所持設備数');
  if (!Array.isArray(obj.buildings) || obj.buildings.length > SIZE * SIZE) throw new Error('設備一覧が正しくありません。');
  const buildings = obj.buildings.map(building);
  const ids = new Set<number>();
  const cells = new Set<string>();
  for (const facility of buildings) {
    const cell = `${facility.x},${facility.z}`;
    if (ids.has(facility.id) || cells.has(cell)) throw new Error('設備IDまたは配置が重複しています。');
    ids.add(facility.id); cells.add(cell);
    if ((facility.kind === 'miner' && obj.terrain[facility.z * SIZE + facility.x] !== 'ore') || (facility.kind === 'lumber' && obj.terrain[facility.z * SIZE + facility.x] !== 'forest')) throw new Error('設備と地形が一致していません。');
  }
  const nextId = number(obj.nextId, '次の設備ID');
  if (nextId < 1 || buildings.some(facility => facility.id >= nextId)) throw new Error('次の設備IDが正しくありません。');
  const delivered = number(obj.delivered, '自動納品数');
  const won = flag(obj.won, 'クリアフラグ');
  if (won !== (delivered >= GOAL)) throw new Error('納品数とクリア状態が一致していません。');
  return {
    version: 1, seed: number(obj.seed, '地形シード'), tick: number(obj.tick, '経過時間'), nextId,
    terrain: [...obj.terrain] as GameState['terrain'], inventory: { wood: number(inventory.wood, '木材'), ore: number(inventory.ore, '鉄鉱石'), ingot: number(inventory.ingot, '鉄延べ棒') },
    kits: validatedKits, buildings, delivered, won,
  };
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
