import { chebyshevWrapped, normalizeX, randomInt, tileId } from './rules.mjs';

const WATER = new Set(['coast', 'ocean']);
export const getTile = (world, x, y) => (y < 0 || y >= world.height ? null : world.tiles[tileId(world.width, normalizeX(world.width, x), y)] || null);
export const adjacent = (world, point) => {
  const tiles = [];
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (dx || dy) {
    const tile = getTile(world, point.x + dx, point.y + dy); if (tile) tiles.push(tile);
  }
  return tiles;
};
export const cityRadiusTiles = (world, city) => {
  const result = [];
  for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
    if (Math.abs(dx) === 2 && Math.abs(dy) === 2) continue;
    const tile = getTile(world, city.x + dx, city.y + dy); if (tile) result.push(tile);
  }
  return result;
};
// Seeded broad land masses and smaller island chains share the same wrapped grid.
export const generateWorld = ({ width, height, mapType, rng }) => {
  const random = () => randomInt(rng, 1000000) / 1000000;
  const archipelago = mapType === 'archipelago';
  const count = archipelago ? Math.round(width * height / 140) : 4;
  const centers = Array.from({ length: count }, (_, index) => ({
    x: archipelago ? random() * width : ((index + .25 + random() * .5) / count) * width,
    y: height * (.2 + random() * .6),
    rx: archipelago ? 2.8 + random() * 3.6 : width * (.14 + random() * .065),
    ry: archipelago ? 2.5 + random() * 2.8 : height * (.24 + random() * .11)
  }));
  const coarseWidth = Math.ceil(width / 5); const coarseHeight = Math.ceil(height / 5) + 1;
  const noiseGrid = Array.from({ length: coarseWidth * coarseHeight }, random);
  const noise = (x, y) => {
    const gx = x / width * coarseWidth; const gy = y / height * (coarseHeight - 1);
    const x0 = Math.floor(gx); const y0 = Math.floor(gy); const fx = gx - x0; const fy = gy - y0;
    const at = (dx, dy) => noiseGrid[Math.min(coarseHeight - 1, y0 + dy) * coarseWidth + (x0 + dx) % coarseWidth];
    return (at(0, 0) * (1 - fx) + at(1, 0) * fx) * (1 - fy) + (at(0, 1) * (1 - fx) + at(1, 1) * fx) * fy;
  };
  const tiles = [];
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const heightNoise = noise(x, y); const detail = random();
    const influence = Math.max(...centers.map((center) => {
      const dx = Math.min(Math.abs(x - center.x), width - Math.abs(x - center.x)) / center.rx;
      const dy = (y - center.y) / center.ry;
      return 1 - dx * dx - dy * dy;
    }));
    const land = influence + (heightNoise - .5) * .8 + (detail - .5) * .16 > 0;
    let terrainId = 'ocean';
    if (land) {
      const latitude = Math.abs(y / (height - 1) - .5) * 2;
      terrainId = latitude > .78 ? 'tundra' : heightNoise > .77 ? 'mountain' : heightNoise > .65 ? 'hills' : heightNoise < .3 && latitude < .5 ? 'desert' : detail < .25 ? 'forest' : detail < .7 ? 'grassland' : 'plains';
    }
    tiles.push({ id: tileId(width, x, y), x, y, terrainId, river: false, resourceId: null, routeId: null, landUseId: null });
  }
  const world = { width, height, wrapX: true, tiles };
  for (const tile of tiles) if (tile.terrainId === 'ocean' && adjacent(world, tile).some((other) => !WATER.has(other.terrainId))) tile.terrainId = 'coast';
  for (const tile of tiles) {
    const roll = random();
    if (tile.terrainId === 'coast' && roll < .13) tile.resourceId = 'fish';
    else if (['grassland', 'plains'].includes(tile.terrainId) && roll < .09) tile.resourceId = 'wheat';
    else if (['hills', 'mountain'].includes(tile.terrainId) && roll < .15) tile.resourceId = 'iron';
    else if (tile.terrainId === 'forest' && roll < .09) tile.resourceId = 'silk';
  }
  // Distance to sea provides deterministic downhill river paths without loops.
  const distance = new Map(); const queue = tiles.filter((tile) => WATER.has(tile.terrainId));
  queue.forEach((tile) => distance.set(tile.id, 0));
  for (let i = 0; i < queue.length; i += 1) for (const neighbor of adjacent(world, queue[i])) if (!distance.has(neighbor.id)) { distance.set(neighbor.id, distance.get(queue[i].id) + 1); queue.push(neighbor); }
  for (const source of tiles.filter((tile) => distance.get(tile.id) >= 3 && random() < .018)) {
    let current = source;
    while (current && !WATER.has(current.terrainId)) {
      current.river = true;
      current = adjacent(world, current).filter((tile) => distance.get(tile.id) < distance.get(current.id)).sort((a, b) => distance.get(a.id) - distance.get(b.id) || a.id - b.id)[0];
    }
  }
  return world;
};
export const chooseStarts = (world, count, terrain) => {
  const starts = [];
  const quality = (tile) => ({ grassland: 6, plains: 5, forest: 4, hills: 3, desert: 2, tundra: 1 }[tile.terrainId] || 0) + (tile.resourceId ? 2 : 0) + (tile.river ? 1 : 0) + adjacent(world, tile).reduce((sum, other) => sum + (terrain[other.terrainId].food || 0), 0);
  const candidates = world.tiles.filter((tile) => !terrain[tile.terrainId].water && tile.terrainId !== 'mountain' && tile.y >= 3 && tile.y < world.height - 3 && adjacent(world, tile).filter(other => !terrain[other.terrainId].water).length >= 3).sort((a, b) => quality(b) - quality(a) || ((a.id * 1103515245) % 65537) - ((b.id * 1103515245) % 65537));
  const minimum = Math.max(6, Math.floor(Math.min(world.width, world.height) / Math.max(2, count)));
  for (const candidate of candidates) if (starts.every((start) => chebyshevWrapped(world, start, candidate) >= minimum)) {
    starts.push({ x: candidate.x, y: candidate.y }); if (starts.length === count) return starts;
  }
  return candidates.slice(0, count).map(({ x, y }) => ({ x, y }));
};
export const terrainPassable = (catalog, unit, tile) => {
  const terrain = catalog.TERRAIN[tile.terrainId];
  if (unit.domain === 'sea') return terrain.water && (unit.ocean || tile.terrainId !== 'ocean');
  return !terrain.water;
};
