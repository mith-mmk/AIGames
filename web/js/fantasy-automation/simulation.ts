import { BELT_SECONDS, DEFINITIONS, ENERGY_CAPACITY, GOAL, GOLEM_INTERVAL, GOLEM_RANGE, INPUT_CAPACITY, OUTPUT_CAPACITY, PORTAL_ENERGY, PORTAL_INTERVAL, POWER_KINDS, RECIPES, RESOURCES, RESOURCE_NAMES, STORAGE_CAPACITY, TREE_INTERVAL, getRecipe } from './data';
import { migrateGameState } from './migration';
import { canResearch, currentSwordRate, isKindUnlocked, isRecipeUnlocked } from './technology';
import { DIRECTIONS, SIZE, STEP, type Building, type Command, type CommandResult, type Direction, type GameState, type Item, type Kind, type Resource } from './types';

type Network = { generators: Building[] };
type Transfer = { source: Building; target: Building; item: Item; sourceSlot: 'item' | 'input' | 'output'; port: 0 | 1 };
const TECHNOLOGIES = ['basic', 'logistics', 'crystals', 'assembly', 'mastery', 'runecraft', 'golemcraft', 'sanctuary', 'alchemy', 'portalcraft', 'worldGrafting', 'worldAwakened'] as const;
const key = (x: number, z: number): number => z * SIZE + x;
const success = (reason = ''): CommandResult => ({ ok: true, reason });
const failure = (reason: string): CommandResult => ({ ok: false, reason });
const automatic = (item: Item): boolean => item.automated && !item.handled;
const conveyor = (building: Building): boolean => building.kind === 'belt' || building.kind === 'splitter';

/** A serializable simulation: one step is exactly 50 ms, independent of the view. */
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
    terrain[key(20, 16)] = terrain[key(20, 15)] = 'crystal';
    this.state = {
      version: 4, seed, tick: 0, nextId: 1, terrain,
      inventory: { wood: 40, ore: 0, ingot: 20, rawCrystal: 0, crystal: 0, sword: 0, runeCore: 0, golemFrame: 0, golem: 0, essence: 0, portalCore: 0, worldSeed: 0 },
      kits: { miner: 1, smelter: 1, generator: 1 }, buildings: [], delivered: 0, won: false,
      stats: { produced: {}, delivered: {}, recentSwordTicks: [], peakSwordRate: 0, golemTransfers: 0, golemFuelTransfers: 0, portalTransfers: 0, treeGrowth: 0 },
      research: { unlocked: ['basic'], tracked: null }, inventoryItems: [],
    };
  }

  snapshot(): GameState { return structuredClone(this.state); }

  restore(state: GameState): void {
    if (!Array.isArray(state.terrain) || state.terrain.length !== SIZE * SIZE || !Array.isArray(state.buildings)) throw new Error('保存データの形式が正しくありません');
    this.state = migrateGameState(structuredClone(state));
    this.state.buildings.sort((a, b) => a.id - b.id);
  }

  canBuild(kind: Kind, x: number, z: number, direction: Direction): CommandResult {
    if (!Object.hasOwn(DEFINITIONS, kind)) return failure('設備の種類が不正です');
    if (!isKindUnlocked(this.state, kind)) return failure(`${DEFINITIONS[kind].label}は技術ツリーで研究すると解放されます`);
    if (!Number.isInteger(x) || !Number.isInteger(z) || x < 0 || z < 0 || x >= SIZE || z >= SIZE) return failure('地図の外には建設できません');
    if (!Number.isInteger(direction) || direction < 0 || direction > 3) return failure('方向が不正です');
    if (this.state.buildings.some(building => building.x === x && building.z === z)) return failure('この区画には設備があります');
    const terrain = this.state.terrain[key(x, z)];
    if (kind === 'miner' && terrain !== 'ore') return failure('採掘機は鉄鉱脈の上に配置してください');
    if (kind === 'crystalMiner' && terrain !== 'crystal') return failure('魔晶採掘機は魔晶鉱脈の上に配置してください');
    if (kind === 'lumber' && terrain !== 'forest') return failure('木材採取場は森林の上に配置してください');
    if ((this.state.kits[kind] ?? 0) > 0) return success('所持設備を設置');
    for (const resource of RESOURCES) {
      const cost = DEFINITIONS[kind].cost[resource] ?? 0;
      if ((this.state.inventory[resource] ?? 0) < cost) return failure(`建設素材が不足しています（${RESOURCE_NAMES[resource]} ${cost}）`);
    }
    return success();
  }

  command(command: Command): CommandResult {
    if (command.type === 'gatherWood') {
      if (!this.state.terrain.includes('forest')) return failure('この地図には手採取できる森林がありません');
      this.putInventory([{ resource: 'wood', automated: false, handled: true }]);
      return success('森林で木材を1個手採取しました（自動生産の実績には算入されません）');
    }
    if (command.type === 'research') {
      const result = canResearch(this.state, command.id);
      if (!result.ok) return result;
      this.state.research!.unlocked.push(command.id);
      return success('研究が完了しました。設備とレシピが解放されました');
    }
    if (command.type === 'track') {
      if (command.id !== null && !TECHNOLOGIES.includes(command.id)) return failure('技術の種類が不正です');
      this.state.research!.tracked = command.id;
      return success(command.id === null ? '追跡を解除しました' : '次の研究目標を追跡します');
    }
    if (command.type === 'build') {
      const result = this.canBuild(command.kind, command.x, command.z, command.direction);
      if (!result.ok) return result;
      if ((this.state.kits[command.kind] ?? 0) > 0) this.state.kits[command.kind]!--;
      else for (const resource of RESOURCES) this.takeInventory(resource, DEFINITIONS[command.kind].cost[resource] ?? 0);
      const recipe = DEFINITIONS[command.kind].recipes?.[0];
      this.state.buildings.push({
        id: this.state.nextId++, kind: command.kind, x: command.x, z: command.z, direction: command.direction,
        input: [], output: [], reserved: [], progress: 0, working: false, energy: 0, status: '待機中', item: null, beltProgress: 0,
        ...(recipe ? { recipe } : {}), ...(command.kind === 'splitter' ? { splitCursor: 0 } : {}),
        ...(command.kind === 'golemRelay' ? { golemPolicy: 'fuel', golemCooldown: 0 } : {}),
        ...(command.kind === 'portalGate' ? { portalChannel: 1, portalRole: 'send', portalCooldown: 0 } : {}),
        ...(command.kind === 'worldTree' ? { treeGrowth: 0 } : {}),
      });
      return success(`${DEFINITIONS[command.kind].label}を設置しました`);
    }
    const building = this.state.buildings.find(candidate => candidate.id === command.id);
    if (!building) return failure('設備が見つかりません');
    if (command.type === 'remove') {
      // Completed generator fuel is burned; its remaining magic is an output, not recoverable wood.
      const reserved = building.kind === 'generator' && (building.pendingEnergy ?? 0) > 0 ? [] : (building.reserved ?? []);
      this.putInventory([...building.input, ...building.output, ...reserved, ...(building.item ? [building.item] : []), ...(building.golemWorker ? [building.golemWorker] : [])]);
      for (const resource of RESOURCES) this.state.inventory[resource] = (this.state.inventory[resource] ?? 0) + Math.floor((DEFINITIONS[building.kind].cost[resource] ?? 0) / 2);
      this.state.buildings = this.state.buildings.filter(candidate => candidate.id !== building.id);
      const cell = key(building.x, building.z);
      if (this.state.pendingCrystalCells?.includes(cell)) {
        this.state.terrain[cell] = 'crystal';
        this.state.pendingCrystalCells = this.state.pendingCrystalCells.filter(pending => pending !== cell);
      }
      return success('設備を撤去しました。中身と建設素材の半分を回収');
    }
    if (command.type === 'rotate') {
      building.direction = ((building.direction + 1) % 4) as Direction;
      return success('出力方向を回転しました');
    }
    if (command.type === 'relayPolicy') {
      if (building.kind !== 'golemRelay') return failure('運搬方針はゴーレム補給所で設定してください');
      if (command.policy !== 'fuel' && command.policy !== 'materials') return failure('運搬方針が不正です');
      building.golemPolicy = command.policy;
      building.status = command.policy === 'fuel' ? '燃料補給を優先します' : 'レシピ素材の運搬を優先します';
      return success(building.status);
    }
    if (command.type === 'portalConfig') {
      if (building.kind !== 'portalGate') return failure('転送設定は転送門で変更してください');
      if (![1,2,3].includes(command.channel) || (command.role !== 'send' && command.role !== 'receive')) return failure('チャネルまたは転送方向が不正です');
      if (command.channel === building.portalChannel && command.role === building.portalRole) return success('同じ転送設定です');
      if (building.input.length || building.output.length) return failure('品が入っている間は転送設定を変更できません。先に回収してください');
      building.portalChannel = command.channel; building.portalRole = command.role;
      return success(`チャネル${command.channel}の${command.role === 'send' ? '送信' : '受信'}に設定しました`);
    }
    if (command.type === 'recipe') {
      if (!Object.hasOwn(RECIPES, command.recipe) || !isRecipeUnlocked(this.state, command.recipe)) return failure('このレシピは技術ツリーで研究すると解放されます');
      if (!DEFINITIONS[building.kind].recipes?.includes(command.recipe)) return failure('この設備ではそのレシピを使用できません');
      if (building.working || (building.reserved?.length ?? 0) > 0) return failure('稼働中はレシピを変更できません');
      const recipe = RECIPES[command.recipe];
      if (building.input.some(item => !(recipe.input[item.resource] ?? 0)) || building.output.some(item => !(recipe.output[item.resource] ?? 0))) return failure('庫内に互換性のない素材があります。先に回収してください');
      building.recipe = command.recipe;
      building.progress = 0;
      return success('レシピを変更しました');
    }
    if (command.type === 'feed') {
      if (!RESOURCES.includes(command.resource) || !Number.isSafeInteger(command.amount) || command.amount <= 0) return failure('投入数が不正です');
      if (!this.accepts(building, command.resource)) return failure('この設備ではその素材を使用できません');
      if ((this.state.inventory[command.resource] ?? 0) < command.amount) return failure('所持素材が不足しています');
      if (conveyor(building) && (building.item || command.amount !== 1)) return failure('搬送設備には空き区画へ1個ずつ投入してください');
      if (!conveyor(building) && building.kind !== 'delivery' && !this.canReceive(building, command.resource, command.amount)) return failure('入力庫が満杯、または他のレシピ素材用の空きが必要です');
      const items = this.takeInventory(command.resource, command.amount).map(item => ({ ...item, handled: true }));
      if (building.kind === 'delivery') building.status = '手動納品（目標には算入されません）';
      else if (conveyor(building)) { building.item = items[0]; building.beltProgress = 0; }
      else building.input.push(...items);
      return success(building.kind === 'delivery' ? '手動納品は目標の本数・生産実績に算入されません' : '素材を補給しました');
    }
    if (command.type === 'collect') {
      if (command.resource !== undefined && !RESOURCES.includes(command.resource)) return failure('素材の種類が不正です');
      if (command.amount !== undefined && (!Number.isSafeInteger(command.amount) || command.amount <= 0)) return failure('回収数が不正です');
      const available = [...building.input, ...building.output, ...(building.item ? [building.item] : [])].filter(item => command.resource === undefined || item.resource === command.resource).length;
      if (command.amount !== undefined && command.amount > available) return failure(`回収できる品は${available}個です（稼働中の素材は予約済み）`);
      let remaining = command.amount ?? available;
      const recovered: Item[] = [];
      const take = (items: Item[]): Item[] => items.filter(item => {
        if (remaining > 0 && (command.resource === undefined || item.resource === command.resource)) { recovered.push(item); remaining--; return false; }
        return true;
      });
      building.input = take(building.input);
      building.output = take(building.output);
      if (building.item && remaining > 0 && (command.resource === undefined || building.item.resource === command.resource)) {
        recovered.push(building.item); building.item = null; building.beltProgress = 0;
      }
      this.putInventory(recovered);
      return success(`素材を${recovered.length}個回収しました${building.working ? '（稼働中の素材は予約済み）' : ''}`);
    }
    return failure('操作が不正です');
  }

  powerSummary(): { stored: number; capacity: number } {
    const generators = this.state.buildings.filter(building => building.kind === 'generator');
    return { stored: generators.reduce((sum, generator) => sum + generator.energy, 0), capacity: generators.length * ENERGY_CAPACITY };
  }

  hasPowerAt(x: number, z: number): boolean {
    const networks = this.networks();
    return this.state.buildings.some(building => Math.abs(building.x - x) + Math.abs(building.z - z) <= 1 && (networks.get(building.id)?.generators.some(generator => generator.energy > 0) ?? false));
  }

  step(): void {
    this.state.tick++;
    const stats = this.state.stats!;
    stats.recentSwordTicks = stats.recentSwordTicks.filter(tick => tick > this.state.tick - 1200);
    const buildings = [...this.state.buildings].sort((a, b) => a.id - b.id);
    const occupants = new Map(buildings.map(building => [key(building.x, building.z), building]));
    const networks = this.networks();
    const portalOutputs = new Map(buildings.filter(building => building.kind === 'portalGate').map(building => [building.id, building.output[0]]));
    this.transferPortals(buildings, networks);
    // Relays read the initial storage contents. Belt arrivals cannot be relayed in
    // the same tick, and a carried physical item is removed before belt planning.
    this.supplyGolems(buildings);
    for (const building of buildings) if (conveyor(building) && building.item) building.beltProgress = Math.min(BELT_SECONDS, building.beltProgress + STEP);
    this.transport(buildings, occupants, portalOutputs);
    for (const building of buildings) {
      if (building.kind === 'portalGate') continue;
      if (building.kind === 'worldTree') { this.growTree(building); continue; }
      if (building.kind === 'golemRelay') continue;
      if (conveyor(building)) { building.status = building.item ? (building.beltProgress + 1e-9 >= BELT_SECONDS ? '搬送先が詰まっています' : '搬送中') : '搬送品を待っています'; continue; }
      if (building.kind === 'storage') { building.status = building.input.length >= STORAGE_CAPACITY ? '収納庫が満杯です（32個）' : `収納中 ${building.input.length}/32個`; continue; }
      if (building.kind === 'wire') { building.status = networks.get(building.id)?.generators.length ? '魔力網に接続中' : '魔力炉に接続してください'; continue; }
      if (building.kind === 'delivery') { if (!building.status.startsWith('手動')) building.status = this.state.won ? '鉄の延べ棒の目標達成！' : '鉄の延べ棒・魔導剣の自動納品を待っています'; continue; }
      this.produce(building, networks.get(building.id));
    }
    this.state.won = this.state.delivered >= GOAL;
    stats.peakSwordRate = Math.max(stats.peakSwordRate, currentSwordRate(this.state));
  }

  /** Inventory items are sparse provenance records; initial stock remains untracked. */
  private takeInventory(resource: Resource, amount: number): Item[] {
    if (amount === 0) return [];
    const taken: Item[] = [];
    let remaining = amount;
    this.state.inventoryItems = this.state.inventoryItems!.filter(item => {
      if (remaining > 0 && item.resource === resource) { taken.push(item); remaining--; return false; }
      return true;
    });
    for (let index = 0; index < remaining; index++) taken.push({ resource, automated: false, handled: true });
    this.state.inventory[resource] = (this.state.inventory[resource] ?? 0) - amount;
    return taken;
  }

  private putInventory(items: Item[]): void {
    for (const item of items) {
      this.state.inventory[item.resource] = (this.state.inventory[item.resource] ?? 0) + 1;
      this.state.inventoryItems!.push({ ...item, handled: true });
    }
  }

  private recipeInput(building: Building): Partial<Record<Resource, number>> { return getRecipe(building)?.input ?? DEFINITIONS[building.kind].input ?? {}; }

  private accepts(building: Building, resource: Resource): boolean {
    if (building.kind === 'portalGate') return building.portalRole === 'send';
    return conveyor(building) || building.kind === 'storage' || (building.kind === 'golemRelay' && resource === 'golem') || (this.recipeInput(building)[resource] ?? 0) > 0 || (building.kind === 'delivery' && (resource === 'ingot' || resource === 'sword'));
  }

  private canReceive(building: Building, resource: Resource, amount: number, incoming = 0): boolean {
    if (!this.accepts(building, resource)) return false;
    if (building.kind === 'delivery') return true;
    if (building.kind === 'golemRelay') return amount === 1 && !building.golemWorker && building.input.length + incoming === 0;
    if (conveyor(building)) return amount === 1 && incoming === 0 && (!building.item || building.beltProgress + 1e-9 >= BELT_SECONDS);
    const capacity = building.kind === 'storage' ? STORAGE_CAPACITY : INPUT_CAPACITY;
    if (building.input.length + incoming + amount > capacity) return false;
    // Preserve all missing ingredients jointly. Independent per-resource limits
    // allow two surplus ingredients to fill a three-ingredient recipe's buffer.
    const input = this.recipeInput(building);
    const missingOthers = RESOURCES.reduce((sum, other) => sum + (other === resource ? 0 : Math.max(0, (input[other] ?? 0) - building.input.filter(item => item.resource === other).length)), 0);
    return capacity - building.input.length - incoming - amount >= missingOthers;
  }

  private transferPortals(buildings: Building[], networks: Map<number, Network>): void {
    const gates = buildings.filter(building => building.kind === 'portalGate');
    for (const channel of [1,2,3] as const) {
      const pair = gates.filter(gate => gate.portalChannel === channel);
      if (pair.length === 0) continue;
      const sender = pair.find(gate => gate.portalRole === 'send');
      const receiver = pair.find(gate => gate.portalRole === 'receive');
      if (pair.some(gate => !isKindUnlocked(this.state, gate.kind))) {
        for (const gate of pair) gate.status = '転送門を技術ツリーで研究してください';
        continue;
      }
      if (pair.length !== 2 || !sender || !receiver) {
        const reason = pair.length > 2 ? `チャネル${channel}に転送門が${pair.length}基あります。送信1基・受信1基の計2基にしてください` : `チャネル${channel}に送信1基・受信1基を配置してください`;
        for (const gate of pair) gate.status = reason;
        continue;
      }
      receiver.status = receiver.output.length >= OUTPUT_CAPACITY ? '受信した品の出力庫が満杯です' : `チャネル${channel}の品を待っています（受信に魔力は不要）`;
      if ((sender.portalCooldown ?? 0) > 0) { sender.portalCooldown!--; sender.status = '転送の間隔を待っています'; continue; }
      const item = sender.input[0];
      if (!item) { sender.status = '転送する品を待っています'; continue; }
      if (receiver.output.length >= OUTPUT_CAPACITY) { sender.status = '受信側の出力庫が満杯です'; continue; }
      if (!this.spend(networks.get(sender.id), PORTAL_ENERGY)) { sender.status = '転送用の魔力が不足しています（2単位必要）'; continue; }
      sender.input.shift(); receiver.output.push({ ...item, throughPortal: true });
      sender.portalCooldown = PORTAL_INTERVAL - 1;
      sender.portalRoute = { targetId: receiver.id, resource: item.resource, tick: this.state.tick };
      sender.status = `${RESOURCE_NAMES[item.resource]}をチャネル${channel}へ転送しました`;
      receiver.status = `${RESOURCE_NAMES[item.resource]}を受信しました`;
      if (automatic(item) && !item.throughPortal) this.state.stats!.portalTransfers = (this.state.stats!.portalTransfers ?? 0) + 1;
    }
  }

  private growTree(tree: Building): void {
    if (!isKindUnlocked(this.state, tree.kind)) { tree.status = '世界樹を技術ツリーで研究してください'; return; }
    if ((tree.treeGrowth ?? 0) >= 10) { tree.status = '世界樹の成長が完了しました（余剰の種は回収できます）'; return; }
    const seed = tree.input[0];
    if (!seed) { tree.status = '転送門を通った自動生産の世界樹の種を待っています'; return; }
    if (!automatic(seed)) { tree.status = '手動で取り出し・投入した種は成長に使えません。回収してください'; return; }
    if (!seed.throughPortal) { tree.status = 'この種は転送門を通っていません。回収し、転送経路を確認してください'; return; }
    if (this.state.tick % TREE_INTERVAL !== 0) { tree.status = `世界樹が成長中です（${tree.treeGrowth ?? 0}/10）`; return; }
    tree.input.shift(); tree.treeGrowth = (tree.treeGrowth ?? 0) + 1;
    this.state.stats!.treeGrowth = (this.state.stats!.treeGrowth ?? 0) + 1;
    tree.status = `世界樹が成長しました（${tree.treeGrowth}/10）`;
  }

  /** Golems carry existing items; they neither create fuel nor need magic to carry it. */
  private supplyGolems(buildings: Building[]): void {
    const storages = buildings.filter(building => building.kind === 'storage');
    const snapshot = new Map(storages.map(storage => [storage.id, [...storage.input]]));
    for (const relay of buildings.filter(building => building.kind === 'golemRelay')) {
      if (!isKindUnlocked(this.state, relay.kind)) { relay.status = 'ゴーレム補給所を技術ツリーで研究してください'; continue; }
      if (!relay.golemWorker && relay.input[0]?.resource === 'golem') relay.golemWorker = relay.input.shift();
      if (!relay.golemWorker) { relay.status = 'ゴーレムを1体投入してください'; continue; }
      if ((relay.golemCooldown ?? 0) > 0) { relay.golemCooldown!--; continue; }
      relay.golemCooldown = GOLEM_INTERVAL - 1;
      const inRange = (building: Building): boolean => Math.abs(building.x - relay.x) + Math.abs(building.z - relay.z) <= GOLEM_RANGE;
      const sources = storages.filter(inRange);
      if (sources.length === 0) { relay.status = '範囲6区画以内に収納箱がありません'; continue; }
      const fuel = relay.golemPolicy !== 'materials';
      const targets = buildings.filter(building => inRange(building) && isKindUnlocked(this.state, building.kind) &&
        (fuel ? building.kind === 'generator' : building.kind !== 'generator' && building.kind !== 'miner' && building.kind !== 'crystalMiner' && building.kind !== 'golemRelay' && building.kind !== 'portalGate' && building.kind !== 'worldTree' && Object.keys(this.recipeInput(building)).length > 0));
      if (targets.length === 0) { relay.status = fuel ? '範囲6区画以内に魔力炉がありません' : '範囲6区画以内に素材を使う製造設備がありません'; continue; }
      const needs: { target: Building; resource: Resource; fill: number; energy: number }[] = [];
      for (const target of targets) {
        const recipe = this.recipeInput(target);
        for (const resource of fuel ? ['wood' as const] : RESOURCES) {
          const required = fuel ? 1 : recipe[resource] ?? 0;
          if (required === 0) continue;
          const count = [...target.input, ...(target.reserved ?? [])].filter(item => item.resource === resource).length;
          needs.push({ target, resource, fill: count / required, energy: fuel ? target.energy : 0 });
        }
      }
      needs.sort((a, b) => a.fill - b.fill || a.energy - b.energy || a.target.id - b.target.id || RESOURCES.indexOf(a.resource) - RESOURCES.indexOf(b.resource));
      const available = needs.filter(need => this.canReceive(need.target, need.resource, 1));
      if (available.length === 0) { relay.status = '搬送先の入力庫が満杯です（他の素材用の空きを含む）'; continue; }
      let carried = false;
      for (const need of available) {
        for (const source of sources) {
          const item = snapshot.get(source.id)!.find(item => item.resource === need.resource && source.input.includes(item));
          if (!item) continue;
          source.input.splice(source.input.indexOf(item), 1);
          need.target.input.push(item);
          relay.golemRoute = { sourceId: source.id, targetId: need.target.id, resource: item.resource, tick: this.state.tick };
          this.state.stats!.golemTransfers = (this.state.stats!.golemTransfers ?? 0) + 1;
          if (fuel && item.resource === 'wood' && automatic(item)) this.state.stats!.golemFuelTransfers = (this.state.stats!.golemFuelTransfers ?? 0) + 1;
          relay.status = `${RESOURCE_NAMES[item.resource]}を${DEFINITIONS[need.target.kind].label}へ運びました`;
          carried = true;
          break;
        }
        if (carried) break;
      }
      if (!carried) relay.status = fuel ? '収納箱に木材がありません（手動品は自動補給実績に算入されません）' : '収納箱にレシピに合う素材がありません';
    }
  }

  private networks(): Map<number, Network> {
    const powered = this.state.buildings.filter(building => POWER_KINDS.includes(building.kind)).sort((a, b) => a.id - b.id);
    const occupants = new Map(powered.map(building => [key(building.x, building.z), building]));
    const result = new Map<number, Network>();
    for (const building of powered) {
      if (result.has(building.id)) continue;
      const network: Network = { generators: [] };
      const queue = [building]; result.set(building.id, network);
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
      generator.energy -= consumed; needed -= consumed;
      if (needed === 0) break;
    }
    return true;
  }

  private produce(building: Building, network: Network | undefined): void {
    const definition = DEFINITIONS[building.kind];
    if (!isKindUnlocked(this.state, building.kind)) { building.status = '設備を技術ツリーで研究してください'; return; }
    const recipeId = building.recipe ?? definition.recipes?.[0];
    if (recipeId && !isRecipeUnlocked(this.state, recipeId)) { building.status = 'レシピを技術ツリーで研究してください'; return; }
    const recipe = getRecipe(building);
    const duration = recipe?.seconds ?? definition.seconds!;
    const energy = recipe?.energy ?? definition.energy ?? 0;
    if (energy > 0 && !network?.generators.length) { building.status = '魔力導線がつながっていません'; return; }
    if (!building.working) {
      const input = recipe?.input ?? definition.input ?? {};
      for (const resource of RESOURCES) {
        const required = input[resource] ?? 0;
        const present = building.input.filter(item => item.resource === resource).length;
        if (present < required) { building.status = `${RESOURCE_NAMES[resource]}が不足しています（あと${required - present}個）${building.kind === 'generator' ? '・手動補給できます' : ''}`; return; }
      }
      if (building.kind !== 'generator' && building.output.length >= OUTPUT_CAPACITY) { building.status = '出力庫が満杯です'; return; }
      if (energy > 0 && !this.spend(network, energy)) { building.status = `魔力が不足しています（開始時に${energy}単位必要）`; return; }
      // Reserve first matching indices in deterministic input order, including mixed ingredients.
      const needed = { ...input };
      const reserved: Item[] = [];
      building.input = building.input.filter(item => {
        if ((needed[item.resource] ?? 0) > 0) { reserved.push(item); needed[item.resource]!--; return false; }
        return true;
      });
      building.reserved = reserved;
      building.working = true; building.progress = 0;
    }
    building.progress = Math.min(duration, building.progress + STEP);
    building.status = '稼働中';
    if (building.progress + 1e-9 < duration) return;
    if (building.kind === 'generator') {
      if (building.pendingEnergy === undefined || building.pendingEnergy === 0) building.pendingEnergy = definition.generatedEnergy!;
      const stored = Math.min(ENERGY_CAPACITY - building.energy, building.pendingEnergy);
      building.energy += stored; building.pendingEnergy -= stored;
      if (building.pendingEnergy > 0) { building.status = '完成した魔力を保持中（蓄積庫が満杯）'; return; }
    } else {
      if (building.output.length >= OUTPUT_CAPACITY) { building.status = '完成品を保持中（出力庫が満杯）'; return; }
      const resource = Object.keys(recipe?.output ?? definition.output!)[0] as Resource;
      const reserved = building.reserved ?? [];
      const item: Item = { resource, automated: reserved.every(input => input.automated), ...(reserved.some(input => input.handled) ? { handled: true } : {}) };
      building.output.push(item);
      if (automatic(item)) {
        this.state.stats!.produced[resource] = (this.state.stats!.produced[resource] ?? 0) + 1;
        if (resource === 'sword') this.state.stats!.recentSwordTicks.push(this.state.tick);
      }
    }
    building.reserved = []; building.progress = 0; building.working = false; building.status = '生産完了';
  }

  /** Plan from a single snapshot, clear all sources, then commit destinations. */
  private transport(buildings: Building[], occupants: Map<number, Building>, portalOutputs: Map<number, Item | undefined>): void {
    const options = new Map<number, Transfer[]>();
    for (const source of buildings) {
      if (source.kind === 'portalGate' && source.portalRole !== 'receive') continue;
      const sourceSlot = conveyor(source) ? 'item' : source.kind === 'storage' ? 'input' : 'output';
      const item = source.kind === 'portalGate' ? portalOutputs.get(source.id) : sourceSlot === 'item' ? source.item : source[sourceSlot][0];
      if (!item || (sourceSlot === 'item' && source.beltProgress + 1e-9 < BELT_SECONDS)) continue;
      const ports: (0 | 1)[] = source.kind === 'splitter' ? (source.splitCursor === 1 ? [1, 0] : [0, 1]) : [0];
      const candidates: Transfer[] = [];
      for (const port of ports) {
        const [dx, dz] = DIRECTIONS[(source.direction + port) % 4];
        const x = source.x + dx, z = source.z + dz;
        if (x < 0 || x >= SIZE || z < 0 || z >= SIZE) continue;
        const target = occupants.get(key(x, z));
        if (target && this.canReceive(target, item.resource, 1)) candidates.push({ source, target, item, sourceSlot, port });
      }
      if (candidates.length > 0) options.set(source.id, candidates);
    }
    const rejected = new Set<string>();
    let plan: Transfer[] = [];
    for (;;) {
      const incoming = new Map<number, number>();
      plan = [];
      for (const source of buildings) {
        for (const candidate of options.get(source.id) ?? []) {
          if (rejected.has(`${source.id}:${candidate.target.id}`)) continue;
          const count = incoming.get(candidate.target.id) ?? 0;
          if (!this.canReceive(candidate.target, candidate.item.resource, 1, count)) continue;
          plan.push(candidate); incoming.set(candidate.target.id, count + 1); break;
        }
      }
      // If an occupied conveyor cannot leave, reject that edge and try the splitter's other port.
      const departing = new Set(plan.filter(transfer => transfer.sourceSlot === 'item').map(transfer => transfer.source.id));
      const blocked = plan.filter(transfer => conveyor(transfer.target) && transfer.target.item && !departing.has(transfer.target.id));
      if (blocked.length === 0) break;
      for (const transfer of blocked) rejected.add(`${transfer.source.id}:${transfer.target.id}`);
    }
    for (const transfer of plan) {
      if (transfer.sourceSlot === 'item') { transfer.source.item = null; transfer.source.beltProgress = 0; }
      else transfer.source[transfer.sourceSlot].shift();
      if (transfer.source.kind === 'splitter') transfer.source.splitCursor = transfer.port === 0 ? 1 : 0;
    }
    for (const transfer of plan) {
      if (conveyor(transfer.target)) { transfer.target.item = transfer.item; transfer.target.beltProgress = 0; }
      else if (transfer.target.kind === 'delivery') {
        if (automatic(transfer.item)) {
          const resource = transfer.item.resource;
          this.state.stats!.delivered[resource] = (this.state.stats!.delivered[resource] ?? 0) + 1;
          if (resource === 'ingot') this.state.delivered++;
        }
        transfer.target.status = automatic(transfer.item) ? `${RESOURCE_NAMES[transfer.item.resource]}を自動納品しました` : '手動で取り出し・投入した品は目標に算入されません';
      } else transfer.target.input.push(transfer.item);
    }
  }
}
