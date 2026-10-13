export type BaseResource = 'wood' | 'ore' | 'ingot';
export type Resource = BaseResource | 'rawCrystal' | 'crystal' | 'sword';
export type Kind = 'miner' | 'belt' | 'smelter' | 'generator' | 'wire' | 'lumber' | 'delivery' | 'splitter' | 'storage' | 'crystalMiner' | 'crystalRefiner' | 'assembler';
export type Direction = 0 | 1 | 2 | 3;
export type TechId = 'basic' | 'logistics' | 'crystals' | 'assembly' | 'mastery';
export type RecipeId = 'ingot' | 'crystal' | 'sword';
export type Item = { resource: Resource; automated: boolean; handled?: boolean };
export type Inventory = Record<BaseResource, number> & Partial<Record<Exclude<Resource, BaseResource>, number>>;
export interface Building {
  id: number; kind: Kind; x: number; z: number; direction: Direction;
  input: Item[]; output: Item[]; progress: number; working: boolean;
  energy: number; pendingEnergy?: number; status: string;
  item: Item | null; beltProgress: number; recipe?: RecipeId;
  splitCursor?: 0 | 1; reserved?: Item[];
}
export interface ProductionStats {
  produced: Partial<Inventory>; delivered: Partial<Inventory>;
  recentSwordTicks: number[]; peakSwordRate: number;
}
export interface ResearchState { unlocked: TechId[]; tracked: TechId | null; }
export interface GameState {
  version: 1 | 2; seed: number; tick: number; nextId: number;
  terrain: ('grass' | 'ore' | 'forest' | 'crystal')[];
  inventory: Inventory; kits: Partial<Record<Kind, number>>;
  buildings: Building[]; delivered: number; won: boolean;
  stats?: ProductionStats; research?: ResearchState; inventoryItems?: Item[]; pendingCrystalCells?: number[];
}
export type Command =
  | { type: 'gatherWood' }
  | { type: 'build'; kind: Kind; x: number; z: number; direction: Direction }
  | { type: 'remove'; id: number }
  | { type: 'rotate'; id: number }
  | { type: 'feed'; id: number; resource: Resource; amount: number }
  | { type: 'collect'; id: number; resource?: Resource; amount?: number }
  | { type: 'research'; id: TechId }
  | { type: 'track'; id: TechId | null }
  | { type: 'recipe'; id: number; recipe: RecipeId };
export interface CommandResult { ok: boolean; reason: string; }
export interface Definition { label: string; cost: Partial<Inventory>; seconds?: number; input?: Partial<Inventory>; output?: Partial<Inventory>; energy?: number; generatedEnergy?: number; technology?: TechId; recipes?: RecipeId[]; }
export interface RecipeDefinition { label: string; seconds: number; input: Partial<Inventory>; output: Partial<Inventory>; energy: number; technology: TechId; }
export const SIZE = 32;
export const STEP = 0.05;
export const DIRECTIONS: readonly [number, number][] = [[0,-1],[1,0],[0,1],[-1,0]];
