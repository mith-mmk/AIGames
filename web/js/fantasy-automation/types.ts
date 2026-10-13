export type Resource = 'wood' | 'ore' | 'ingot';
export type Kind = 'miner' | 'belt' | 'smelter' | 'generator' | 'wire' | 'lumber' | 'delivery';
export type Direction = 0 | 1 | 2 | 3;
export type Item = { resource: Resource; automated: boolean };
export type Inventory = Record<Resource, number>;
export interface Building {
  id: number; kind: Kind; x: number; z: number; direction: Direction;
  input: Item[]; output: Item[]; progress: number; working: boolean;
  energy: number; pendingEnergy?: number; status: string;
  item: Item | null; beltProgress: number;
}
export interface GameState {
  version: 1; seed: number; tick: number; nextId: number;
  terrain: ('grass' | 'ore' | 'forest')[];
  inventory: Inventory; kits: Partial<Record<Kind, number>>;
  buildings: Building[]; delivered: number; won: boolean;
}
export type Command =
  | { type: 'build'; kind: Kind; x: number; z: number; direction: Direction }
  | { type: 'remove'; id: number }
  | { type: 'rotate'; id: number }
  | { type: 'feed'; id: number; resource: Resource; amount: number }
  | { type: 'collect'; id: number };
export interface CommandResult { ok: boolean; reason: string; }
export interface Definition { label: string; cost: Partial<Inventory>; seconds?: number; input?: Partial<Inventory>; output?: Partial<Inventory>; energy?: number; generatedEnergy?: number; }
export const SIZE = 32;
export const STEP = 0.05;
export const DIRECTIONS: readonly [number, number][] = [[0,-1],[1,0],[0,1],[-1,0]];
