import type { Kind, Resource } from './types.js';
/** Furnace silhouettes match the square kiln and open crystal generator in the world. */
export function furnaceIcon(kind: Kind): string {
  if (kind !== 'smelter' && kind !== 'generator') return '';
  const shape = kind === 'smelter'
    ? '<path d="M5 14h20v15H5zM20 14V3h6v21M9 29v-9h12v9M2 29h28"/><path d="m12 25 2-5 3 3 2-4M8 9h6l3 5H6z"/>'
    : '<path d="m16 2 7 10-7 10-7-10zM5 15v12h22V15M2 30h28M16 6v12M9 12h14"/><path d="m4 21 4-3 3 3m10 0 3-3 4 3M11 27l4-6-1 5h6l-4 5"/>';
  return `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" class="furnace-icon furnace-${kind}">${shape}</svg>`;
}
/** Original tiny silhouettes, shared by resource slots and the compact HUD. */
export function resourceIcon(resource: Resource): string {
  const shapes: Record<Resource, string> = {
    wood: '<path d="M5 8 21 4 27 11 11 16Z"/><path d="M11 16 27 11 27 23 11 28 5 21 5 8"/><path d="m11 16 0 12M8 12l15-4"/>',
    ore: '<path d="m5 22 3-13 11-5 9 9-4 13-13 2Z"/><path d="m8 9 9 8 11-4M17 17l-6 11m6-11 7 9"/>',
    ingot: '<path d="m7 8 18-2 5 12-5 7-21 1-2-8Z"/><path d="m7 8 2 12 21-2M9 20l-5 6"/>',
    rawCrystal: '<path d="m7 13 7-10 7 3 6 14-7 9-12-4Z"/><path d="m14 3 2 14 5-11m-5 11 4 12m-4-12-9-4m9 4 11 3"/>',
    crystal: '<path d="m16 2 10 12-3 13-7 4-7-4-3-13Z"/><path d="m16 2 0 29M6 14l10 4 10-4m-17 13 7-9 7 9"/>',
    essence: '<path d="M12 2h8v4l-2 3v7l9 11-2 3H7l-2-3 9-11V9l-2-3Z"/><path d="M9 24h14m-10-5 8 2"/>',
    portalCore: '<circle cx="16" cy="16" r="12"/><circle cx="16" cy="16" r="7"/><path d="m16 3 4 13-4 13-4-13Z"/>',
    worldSeed: '<path d="M16 29C2 25 3 10 16 5c13 5 14 20 0 24Z"/><path d="M16 29V9m0 10-6-5m6 8 7-5m-7-8c0-7 5-7 7-7-1 6-3 7-7 7"/>',
    runeCore: '<circle cx="16" cy="16" r="11"/><path d="m16 5 0 22M5 16h22m-19-8 16 16M8 24 24 8"/>',
    golemFrame: '<path d="m11 3 10 0 2 8-7 5-7-5Z M5 14h7v11H5Zm15 0h7v11h-7ZM11 20h10v10H11Z"/>',
    golem: '<path d="M10 3h12v10H10Zm-3 11h18v10H7ZM3 14h4v13H3Zm22 0h4v13h-4ZM9 24h6v7H9Zm8 0h6v7h-6Z"/><path d="M12 8h3m2 0h3"/>',
    sword: '<path d="m23 2 6 3-13 18-5-4Z"/><path d="m8 16 12 9-2 3-12-9Z"/><path d="m11 23-5 7-4-3 5-7Z"/>',
  };
  return `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" class="resource-icon resource-${resource}">${shapes[resource]}</svg>`;
}
