import { BELT_SECONDS, DEFINITIONS, ENERGY_CAPACITY, GOAL, INPUT_CAPACITY, OUTPUT_CAPACITY } from './data';
import { DIRECTIONS, SIZE, STEP, type Building, type Command, type CommandResult, type Direction, type GameState, type Item, type Kind, type Resource } from './types';

type Network = { generators: Building[] };
type Transfer = { source: Building; target: Building; item: Item; fromBelt: boolean };
const POWER_KINDS: readonly Kind[] = ['wire', 'generator', 'miner', 'smelter'];
const RESOURCES: readonly Resource[] = ['wood', 'ore', 'ingot'];
const key = (x: number, z: number): number => z * SIZE + x;
const success = (reason = ''): CommandResult => ({ ok: true, reason });
const failure = (reason: string): CommandResult => ({ ok: false, reason });

/** No renderer, clock, storage, or DOM dependency: one step is exactly 50 ms. */
export class Simulation {
  state!: GameState;

  constructor(seed = 662) { this.init(seed); }

  init(seed = this.state?.seed ?? 662): void {
    const terrain: GameState['terrain'] = Array(SIZE * SIZE).fill('grass');
    let randomState = seed >>> 0;
    const random = (): number => {
      randomState += 0x6d2b79f5;
      let value = randomState;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    // Small resource patches; reserve a clear central teaching area for every seed.
    for (let patch = 0; patch < 26; patch++) {
      const x = 2 + Math.floor(random() * (SIZE - 4));
      const z = 2 + Math.floor(random() * (SIZE - 4));
      const resource = patch % 3 === 0 ? 'ore' : 'forest';
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (random() > 0.35) terrain[key(x + dx, z + dz)] = resource;
      }
    }
    for (let z = 13; z <= 21; z++) for (let x = 8; x <= 18; x++) terrain[key(x, z)] = 'grass';
    terrain[key(12, 16)] = terrain[key(12, 15)] = 'ore';
    terrain[key(9, 18)] = terrain[key(9, 19)] = 'forest';
    this.state = {
      version: 1, seed, tick: 0, nextId: 1, terrain,
      inventory: { wood: 40, ore: 0, ingot: 20 },
      kits: { miner: 1, smelter: 1, generator: 1 },
      buildings: [], delivered: 0, won: false,
    };
  }

  snapshot(): GameState { return structuredClone(this.state); }

  restore(state: GameState): void {
    if (state.version !== 1 || state.terrain.length !== SIZE * SIZE || !Array.isArray(state.buildings)) {
      throw new Error('保存データの形式が正しくありません');
    }
    this.state = structuredClone(state);
    this.state.buildings.sort((a, b) => a.id - b.id);
  }

  canBuild(kind: Kind, x: number, z: number, direction: Direction): CommandResult {
    if (!Object.hasOwn(DEFINITIONS, kind)) return failure('設備の種類が不正です');
    if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || z < 0 || x >= SIZE || z >= SIZE) return failure('地図の外には建設できません');
    if (!Number.isInteger(direction) || direction < 0 || direction > 3) return failure('方向が不正です');
    if (this.state.buildings.some(building => building.x === x && building.z === z)) return failure('この区画には設備があります');
    const terrain = this.state.terrain[key(x, z)];
    if (kind === 'miner' && terrain !== 'ore') return failure('採掘機は鉄鉱脈の上に配置してください');
    if (kind === 'lumber' && terrain !== 'forest') return failure('木材採取場は森林の上に配置してください');
    if ((this.state.kits[kind] ?? 0) > 0) return success('所持設備を設置');
    for (const resource of RESOURCES) {
      const cost = DEFINITIONS[kind].cost[resource] ?? 0;
      if (this.state.inventory[resource] < cost) return failure(`建設素材が不足しています（${resource === 'wood' ? '木材' : resource === 'ore' ? '鉄鉱石' : '鉄延べ棒'} ${cost}）`);
    }
    return success();
  }

  command(command: Command): CommandResult {
    if (command.type === 'build') {
      const result = this.canBuild(command.kind, command.x, command.z, command.direction);
      if (!result.ok) return result;
      if ((this.state.kits[command.kind] ?? 0) > 0) this.state.kits[command.kind]!--;
      else for (const resource of RESOURCES) this.state.inventory[resource] -= DEFINITIONS[command.kind].cost[resource] ?? 0;
      this.state.buildings.push({
        id: this.state.nextId++, kind: command.kind, x: command.x, z: command.z,
        direction: command.direction, input: [], output: [], progress: 0,
        working: false, energy: 0, status: '待機中', item: null, beltProgress: 0,
      });
      return success(`${DEFINITIONS[command.kind].label}を設置しました`);
    }
    const building = this.state.buildings.find(candidate => candidate.id === command.id);
    if (!building) return failure('設備が見つかりません');
    if (command.type === 'remove') {
      // Reserved recipe inputs are still physically in input and are recovered once.
      // A completed generator batch has already burned its reserved fuel, even if
      // part of its generated energy is waiting for free storage capacity.
      const burnedFuel = building.kind === 'generator' && (building.pendingEnergy ?? 0) > 0 ? 1 : 0;
      for (const item of [...building.input.slice(burnedFuel), ...building.output, ...(building.item ? [building.item] : [])]) this.state.inventory[item.resource]++;
      for (const resource of RESOURCES) this.state.inventory[resource] += Math.floor((DEFINITIONS[building.kind].cost[resource] ?? 0) / 2);
      this.state.buildings = this.state.buildings.filter(candidate => candidate.id !== building.id);
      return success('設備を撤去しました。中身と建設素材の半分を回収');
    }
    if (command.type === 'rotate') {
      building.direction = ((building.direction + 1) % 4) as Direction;
      return success('出力方向を回転しました');
    }
    if (command.type === 'feed') {
      if (!RESOURCES.includes(command.resource) || !Number.isSafeInteger(command.amount) || command.amount <= 0) return failure('投入数が不正です');
      if (!this.accepts(building, command.resource)) return failure('この設備ではその素材を使用できません');
      if (this.state.inventory[command.resource] < command.amount) return failure('所持素材が不足しています');
      if (building.kind === 'belt' && (building.item || command.amount !== 1)) return failure('ベルトには空き区画へ1個ずつ投入してください');
      if (building.kind !== 'delivery' && building.kind !== 'belt' && building.input.length + command.amount > INPUT_CAPACITY) return failure('設備の入力庫が満杯です');
      this.state.inventory[command.resource] -= command.amount;
      if (building.kind === 'delivery') {
        building.status = '手動納品（目標には算入されません）';
      } else if (building.kind === 'belt') {
        building.item = { resource: command.resource, automated: false };
        building.beltProgress = 0;
      } else {
        for (let count = 0; count < command.amount; count++) building.input.push({ resource: command.resource, automated: false });
      }
      return success(building.kind === 'delivery' ? '手動納品は目標の本数に算入されません' : '素材を補給しました');
    }
    if (command.type === 'collect') {
      const reserved = building.working ? this.recipeAmount(building) : 0;
      const recovered = [...building.input.splice(reserved), ...building.output.splice(0)];
      if (building.item) { recovered.push(building.item); building.item = null; building.beltProgress = 0; }
      for (const item of recovered) this.state.inventory[item.resource]++;
      return success(`素材を${recovered.length}個回収しました${reserved ? '（稼働中の素材は予約済み）' : ''}`);
    }
    return failure('操作が不正です');
  }

  powerSummary(): { stored: number; capacity: number } {
    const generators = this.state.buildings.filter(building => building.kind === 'generator');
    return { stored: generators.reduce((sum, generator) => sum + generator.energy, 0), capacity: generators.length * ENERGY_CAPACITY };
  }

  hasPowerAt(x: number, z: number): boolean {
    const networks = this.networks();
    return this.state.buildings.some(building => (
      Math.abs(building.x - x) + Math.abs(building.z - z) <= 1 &&
      (networks.get(building.id)?.generators.some(generator => generator.energy > 0) ?? false)
    ));
  }

  step(): void {
    this.state.tick++;
    const buildings = [...this.state.buildings].sort((a, b) => a.id - b.id);
    const occupants = new Map(buildings.map(building => [key(building.x, building.z), building]));
    for (const building of buildings) if (building.kind === 'belt' && building.item) {
      building.beltProgress = Math.min(BELT_SECONDS, building.beltProgress + STEP);
    }
    this.transport(buildings, occupants);
    const networks = this.networks();
    for (const building of buildings) {
      if (building.kind === 'belt') { building.status = building.item ? (building.beltProgress + 1e-9 >= BELT_SECONDS ? '搬送先が詰まっています' : '搬送中') : '搬送品を待っています'; continue; }
      if (building.kind === 'wire') { building.status = networks.get(building.id)?.generators.length ? '魔力網に接続中' : '魔力炉に接続してください'; continue; }
      if (building.kind === 'delivery') { if (!building.status.startsWith('手動')) building.status = this.state.won ? '目標達成！' : '鉄延べ棒の自動納品を待っています'; continue; }
      this.produce(building, networks.get(building.id));
    }
    this.state.won = this.state.delivered >= GOAL;
  }

  private recipeAmount(building: Building): number {
    return Object.values(DEFINITIONS[building.kind].input ?? {}).reduce((sum, amount) => sum + (amount ?? 0), 0);
  }

  private accepts(building: Building, resource: Resource): boolean {
    return building.kind === 'belt' ||
      (DEFINITIONS[building.kind].input?.[resource] ?? 0) > 0 ||
      (building.kind === 'delivery' && resource === 'ingot');
  }

  private networks(): Map<number, Network> {
    const powered = this.state.buildings.filter(building => POWER_KINDS.includes(building.kind)).sort((a, b) => a.id - b.id);
    const occupants = new Map(powered.map(building => [key(building.x, building.z), building]));
    const result = new Map<number, Network>();
    for (const building of powered) {
      if (result.has(building.id)) continue;
      const network: Network = { generators: [] };
      const queue = [building];
      result.set(building.id, network);
      for (let index = 0; index < queue.length; index++) {
        const current = queue[index];
        if (current.kind === 'generator') network.generators.push(current);
        for (const [dx, dz] of DIRECTIONS) {
          const x = current.x + dx, z = current.z + dz;
          if (x < 0 || x >= SIZE || z < 0 || z >= SIZE) continue;
          const adjacent = occupants.get(key(x, z));
          if (adjacent && !result.has(adjacent.id)) { result.set(adjacent.id, network); queue.push(adjacent); }
        }
      }
      network.generators.sort((a, b) => a.id - b.id);
    }
    return result;
  }

  private spend(network: Network | undefined, amount: number): boolean {
    if (!network || network.generators.reduce((sum, generator) => sum + generator.energy, 0) < amount) return false;
    let needed = amount;
    for (const generator of network.generators) {
      const consumed = Math.min(needed, generator.energy);
      generator.energy -= consumed;
      needed -= consumed;
      if (needed === 0) break;
    }
    return true;
  }

  private produce(building: Building, network: Network | undefined): void {
    const definition = DEFINITIONS[building.kind];
    const duration = definition.seconds!;
    const powered = building.kind === 'miner' || building.kind === 'smelter';
    if (powered && !network?.generators.length) { building.status = '魔力導線がつながっていません'; return; }
    if (!building.working) {
      const recipe = definition.input ?? {};
      for (const resource of RESOURCES) if (building.input.filter(item => item.resource === resource).length < (recipe[resource] ?? 0)) {
        building.status = building.kind === 'generator' ? '木材が不足しています（手動補給できます）' : '鉄鉱石が不足しています';
        return;
      }
      if (building.kind !== 'generator' && building.output.length >= OUTPUT_CAPACITY) { building.status = '出力庫が満杯です'; return; }
      if (powered && !this.spend(network, definition.energy ?? 0)) { building.status = '魔力が不足しています'; return; }
      // Accepted resources are recipe-specific, so the first N items form a stable reservation.
      building.working = true;
      building.progress = 0;
    }
    building.progress = Math.min(duration, building.progress + STEP);
    building.status = '稼働中';
    if (building.progress + 1e-9 < duration) return;
    if (building.kind === 'generator') {
      if (building.pendingEnergy === undefined || building.pendingEnergy === 0) building.pendingEnergy = definition.generatedEnergy!;
      const stored = Math.min(ENERGY_CAPACITY - building.energy, building.pendingEnergy);
      building.energy += stored;
      building.pendingEnergy -= stored;
      if (building.pendingEnergy > 0) { building.status = '完成した魔力を保持中（蓄積庫が満杯）'; return; }
    } else {
      if (building.output.length >= OUTPUT_CAPACITY) { building.status = '完成品を保持中（出力庫が満杯）'; return; }
      const resource = Object.keys(definition.output!)[0] as Resource;
      const automated = building.kind !== 'smelter' || building.input.slice(0, this.recipeAmount(building)).every(item => item.automated);
      building.output.push({ resource, automated });
    }
    building.input.splice(0, this.recipeAmount(building));
    building.progress = 0;
    building.working = false;
    building.status = '生産完了';
  }

  private transport(buildings: Building[], occupants: Map<number, Building>): void {
    const candidates: Transfer[] = [];
    const incoming = new Map<number, number>();
    for (const source of buildings) {
      const fromBelt = source.kind === 'belt';
      const item = fromBelt ? source.item : source.output[0];
      if (!item || (fromBelt && source.beltProgress + 1e-9 < BELT_SECONDS)) continue;
      const [dx, dz] = DIRECTIONS[source.direction];
      const x = source.x + dx, z = source.z + dz;
      if (x < 0 || x >= SIZE || z < 0 || z >= SIZE) continue;
      const target = occupants.get(key(x, z));
      if (!target || !this.accepts(target, item.resource)) continue;
      const accepted = incoming.get(target.id) ?? 0;
      if (target.kind === 'belt') {
        if (accepted > 0 || (target.item && target.beltProgress + 1e-9 < BELT_SECONDS)) continue;
      } else if (target.kind !== 'delivery' && target.input.length + accepted >= INPUT_CAPACITY) continue;
      candidates.push({ source, target, item, fromBelt });
      incoming.set(target.id, accepted + 1);
    }
    // An occupied belt accepts an item only if its existing item also has a valid move.
    // Iterate to a fixed point: stalls propagate upstream, but closed loops can rotate.
    let plan = candidates;
    for (;;) {
      const departing = new Set(plan.filter(transfer => transfer.fromBelt).map(transfer => transfer.source.id));
      const next = plan.filter(transfer => transfer.target.kind !== 'belt' || !transfer.target.item || departing.has(transfer.target.id));
      if (next.length === plan.length) break;
      plan = next;
    }
    for (const transfer of plan) {
      if (transfer.fromBelt) { transfer.source.item = null; transfer.source.beltProgress = 0; }
      else transfer.source.output.shift();
    }
    for (const transfer of plan) {
      if (transfer.target.kind === 'belt') { transfer.target.item = transfer.item; transfer.target.beltProgress = 0; }
      else if (transfer.target.kind === 'delivery') {
        if (transfer.item.automated) this.state.delivered++;
        transfer.target.status = transfer.item.automated ? '鉄延べ棒を自動納品しました' : '手動由来の品は目標に算入されません';
      } else transfer.target.input.push(transfer.item);
    }
  }
}
