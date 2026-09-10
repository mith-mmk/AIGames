export const clone = (value) => JSON.parse(JSON.stringify(value));
export const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
export const idOf = (items, id) => items.find((item) => item.id === id) || null;
export const tileId = (width, x, y) => y * width + x;
export const normalizeX = (width, x) => ((x % width) + width) % width;
export const sameTile = (a, b) => a.x === b.x && a.y === b.y;
export const chebyshevWrapped = (world, a, b) => Math.max(Math.min(Math.abs(a.x - b.x), world.width - Math.abs(a.x - b.x)), Math.abs(a.y - b.y));
export const inBounds = (world, point) => Number.isInteger(point?.x) && Number.isInteger(point?.y) && point.y >= 0 && point.y < world.height;
export const normalizedPoint = (world, point) => inBounds(world, point) ? { x: normalizeX(world.width, point.x), y: point.y } : null;
export const event = (state, type, civId = null, entityId = null, data = {}) => ({
  id: `event-${state.nextId++}`, type, round: state.turn.round, civId, entityId, data,
});
export const mulberry32 = (rng) => {
  rng.state = (rng.state + 0x6D2B79F5) >>> 0;
  let value = rng.state;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
};
export const randomInt = (rng, max) => Math.floor(mulberry32(rng) * max);
export const scaled = (amount, speed) => Math.max(1, Math.round(amount * speed));
export const relationFor = (state, a, b) => state.relations.find((relation) => (relation.civAId === a && relation.civBId === b) || (relation.civAId === b && relation.civBId === a)) || null;
export const isAtWar = (state, a, b) => Boolean(relationFor(state, a, b)?.atWar);
export const makeId = (state, prefix) => `${prefix}-${state.nextId++}`;
