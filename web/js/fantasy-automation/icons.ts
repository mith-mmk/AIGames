import type { Resource } from './types.js';
/** Original tiny silhouettes, shared by resource slots and the compact HUD. */
export function resourceIcon(resource: Resource): string {
  const shapes: Record<Resource, string> = {
    wood: '<path d="M5 8 21 4 27 11 11 16Z"/><path d="M11 16 27 11 27 23 11 28 5 21 5 8"/><path d="m11 16 0 12M8 12l15-4"/>',
    ore: '<path d="m5 22 3-13 11-5 9 9-4 13-13 2Z"/><path d="m8 9 9 8 11-4M17 17l-6 11m6-11 7 9"/>',
    ingot: '<path d="m7 8 18-2 5 12-5 7-21 1-2-8Z"/><path d="m7 8 2 12 21-2M9 20l-5 6"/>',
    rawCrystal: '<path d="m7 13 7-10 7 3 6 14-7 9-12-4Z"/><path d="m14 3 2 14 5-11m-5 11 4 12m-4-12-9-4m9 4 11 3"/>',
    crystal: '<path d="m16 2 10 12-3 13-7 4-7-4-3-13Z"/><path d="m16 2 0 29M6 14l10 4 10-4m-17 13 7-9 7 9"/>',
    runeCore: '<circle cx="16" cy="16" r="11"/><path d="m16 5 0 22M5 16h22m-19-8 16 16M8 24 24 8"/>',
    golemFrame: '<path d="m11 3 10 0 2 8-7 5-7-5Z M5 14h7v11H5Zm15 0h7v11h-7ZM11 20h10v10H11Z"/>',
    golem: '<path d="M10 3h12v10H10Zm-3 11h18v10H7ZM3 14h4v13H3Zm22 0h4v13h-4ZM9 24h6v7H9Zm8 0h6v7h-6Z"/><path d="M12 8h3m2 0h3"/>',
    sword: '<path d="m23 2 6 3-13 18-5-4Z"/><path d="m8 16 12 9-2 3-12-9Z"/><path d="m11 23-5 7-4-3 5-7Z"/>',
  };
  return `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" class="resource-icon resource-${resource}">${shapes[resource]}</svg>`;
}
