export type BaseResource = 'wood' | 'ore' | 'ingot';
export type Resource = BaseResource | 'rawCrystal' | 'crystal' | 'sword' | 'runeCore' | 'golemFrame' | 'golem' | 'essence' | 'portalCore' | 'worldSeed';
export type Kind = 'miner' | 'belt' | 'smelter' | 'generator' | 'wire' | 'lumber' | 'delivery' | 'splitter' | 'storage' | 'crystalMiner' | 'crystalRefiner' | 'assembler' | 'runeCarver' | 'frameForge' | 'golemForge' | 'golemRelay' | 'alchemyLab' | 'portalForge' | 'portalGate' | 'seedLoom' | 'worldTree';
export type Direction = 0 | 1 | 2 | 3;
export type TechId = 'basic' | 'logistics' | 'crystals' | 'assembly' | 'mastery' | 'runecraft' | 'golemcraft' | 'sanctuary' | 'alchemy' | 'portalcraft' | 'worldGrafting' | 'worldAwakened';
export type RecipeId = 'ingot' | 'crystal' | 'sword' | 'runeCore' | 'golemFrame' | 'golem' | 'essence' | 'portalCore' | 'worldSeed';
export type Item = { resource: Resource; automated: boolean; handled?: boolean; throughPortal?: boolean };
export type Inventory = Record<BaseResource, number> & Partial<Record<Exclude<Resource, BaseResource>, number>>;
export interface Building {
  id: number; kind: Kind; x: number; z: number; direction: Direction;
  input: Item[]; output: Item[]; progress: number; working: boolean;
  energy: number; pendingEnergy?: number; status: string;
  item: Item | null; beltProgress: number; recipe?: RecipeId;
  splitCursor?: 0 | 1; reserved?: Item[];
  golemWorker?: Item; golemPolicy?: 'fuel' | 'materials'; golemCooldown?: number;
  golemRoute?: { sourceId: number; targetId: number; resource: Resource; tick: number };
  portalChannel?: 1 | 2 | 3; portalRole?: 'send' | 'receive'; portalCooldown?: number;
  portalRoute?: { targetId: number; resource: Resource; tick: number }; treeGrowth?: number;
}
export interface ProductionStats {
  produced: Partial<Inventory>; delivered: Partial<Inventory>;
  recentSwordTicks: number[]; peakSwordRate: number;
  golemFuelTransfers?: number; golemTransfers?: number;
  portalTransfers?: number; treeGrowth?: number;
}
export interface ResearchState { unlocked: TechId[]; tracked: TechId | null; }
export interface GameState {
  version: 1 | 2 | 3 | 4; seed: number; tick: number; nextId: number;
  terrain: ('grass' | 'ore' | 'forest' | 'crystal')[];
  inventory: Inventory; kits: Partial<Record<Kind, number>>;
  buildings: Building[]; delivered: number; won: boolean;
  stats?: ProductionStats; research?: ResearchState; inventoryItems?: Item[]; pendingCrystalCells?: number[];
}
export type Command =
  | { type: 'gatherWood' }
  | { type: 'undoBuild' }
  | { type: 'build'; kind: Kind; x: number; z: number; direction: Direction }
  | { type: 'remove'; id: number }
  | { type: 'rotate'; id: number }
  | { type: 'feed'; id: number; resource: Resource; amount: number }
  | { type: 'collect'; id: number; resource?: Resource; amount?: number }
  | { type: 'research'; id: TechId }
  | { type: 'track'; id: TechId | null }
  | { type: 'recipe'; id: number; recipe: RecipeId }
  | { type: 'relayPolicy'; id: number; policy: 'fuel' | 'materials' }
  | { type: 'portalConfig'; id: number; channel: 1 | 2 | 3; role: 'send' | 'receive' };
export interface CommandResult { ok: boolean; reason: string; }
export interface Definition { label: string; cost: Partial<Inventory>; seconds?: number; input?: Partial<Inventory>; output?: Partial<Inventory>; energy?: number; generatedEnergy?: number; technology?: TechId; recipes?: RecipeId[]; }
export interface RecipeDefinition { label: string; seconds: number; input: Partial<Inventory>; output: Partial<Inventory>; energy: number; technology: TechId; }
export const SIZE = 32;
export const STEP = 0.05;
export const DIRECTIONS: readonly [number, number][] = [[0,-1],[1,0],[0,1],[-1,0]];
