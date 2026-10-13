import type { Definition, Kind } from './types';
import definitions from './definitions.json';

/** Construction and recipes are deliberately kept outside the simulator. */
export const DEFINITIONS: Record<Kind, Definition> = definitions;

export const INPUT_CAPACITY = 8;
export const OUTPUT_CAPACITY = 4;
export const ENERGY_CAPACITY = 30;
export const BELT_SECONDS = DEFINITIONS.belt.seconds!;
export const GOAL = 100;
