import { BUILDINGS, PROJECTS, RESOURCES, UNITS } from './data.mjs';
import { UNIT_ART, CITY_ART, UnitArtStore, representativeUnit, unitIsSpent } from './unit-art.mjs';

const TILE_WIDTH = 64;
const TILE_HEIGHT = 32;
const HALF_WIDTH = TILE_WIDTH / 2;
const HALF_HEIGHT = TILE_HEIGHT / 2;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;

const TERRAIN_COLORS = Object.freeze({
  grassland: ['#94ae58', '#b9ca73'],
  plains: ['#bfa65d', '#dbc67d'],
  desert: ['#d9bb73', '#ecd493'],
  forest: ['#557b48', '#81a35a'],
  hills: ['#9b8752', '#b9a66e'],
  mountain: ['#7f766e', '#aaa198'],
  tundra: ['#a9b8a6', '#cbd3bc'],
  coast: ['#4a93a8', '#77bdc8'],
  ocean: ['#2e718c', '#549db3'],
});

const CIVILIZATION_FALLBACK = '#6d4c41';

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const modulo = (value, divisor) => ((value % divisor) + divisor) % divisor;
const hash = (x, y, salt = 0) => {
  let value = (Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663) ^ salt) >>> 0;
  value ^= value >>> 16;
  return (Math.imul(value, 2246822507) ^ (value >>> 13)) >>> 0;
};

function project(x, y) {
  return { x: (x - y) * HALF_WIDTH, y: (x + y) * HALF_HEIGHT };
}

function unproject(x, y) {
  return { x: (x / HALF_WIDTH + y / HALF_HEIGHT) / 2, y: (y / HALF_HEIGHT - x / HALF_WIDTH) / 2 };
}

function diamondPath(context, x, y, width = HALF_WIDTH, height = HALF_HEIGHT) {
  context.beginPath();
  context.moveTo(x, y - height);
  context.lineTo(x + width, y);
  context.lineTo(x, y + height);
  context.lineTo(x - width, y);
  context.closePath();
}

function labelForUnit(unit) {
  return UNITS[unit.typeId]?.label ?? unit.typeId ?? '部隊';
}

/**
 * Canvas-only map renderer. The renderer owns paint caches but never owns game state.
 * uiState.camera is deliberately the only shared mutable viewport state.
 */
export class CivilizationRenderer {
  constructor(canvas, uiState, artStore = new UnitArtStore()) {
    if (!canvas?.getContext) throw new TypeError('CivilizationRenderer requires a canvas element.');
    if (!uiState || typeof uiState !== 'object') throw new TypeError('CivilizationRenderer requires uiState.');
    this.canvas = canvas;
    this.artStore = artStore;
    this.context = canvas.getContext('2d', { alpha: false });
    if (!this.context) throw new Error('2D canvas rendering is unavailable.');
    this.uiState = uiState;
    this.uiState.camera ??= { x: 0, y: 0, zoom: 1 };
    this.uiState.camera.x ??= 0;
    this.uiState.camera.y ??= 0;
    this.uiState.camera.zoom ??= 1;
    this.cssWidth = 1;
    this.cssHeight = 1;
    this.pixelRatio = 1;
    this.lastWorld = null;
    this.unitHits = [];
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect?.();
    this.cssWidth = Math.max(1, Math.round(rect?.width || this.canvas.clientWidth || this.canvas.width || 1));
    this.cssHeight = Math.max(1, Math.round(rect?.height || this.canvas.clientHeight || this.canvas.height || 1));
    this.pixelRatio = Math.max(1, globalThis.devicePixelRatio || 1);
    const width = Math.round(this.cssWidth * this.pixelRatio);
    const height = Math.round(this.cssHeight * this.pixelRatio);
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;
  }

  draw(view, { selectedTileId = null, selectedUnitId = null, selectedCityId = null, hoverTileId = null, preview = null, presentation = null } = {}) {
    view = presentation?.view || view;
    if (!view?.world?.tiles || !Number.isInteger(view.world.width) || !Number.isInteger(view.world.height)) return;
    this.unitHits = [];
    const { world } = view;
    this.lastWorld = { width: world.width, height: world.height };
    const context = this.context;
    const camera = this.camera();
    const cameraPoint = project(camera.x, camera.y);
    const scale = this.pixelRatio;
    context.setTransform(scale, 0, 0, scale, 0, 0);
    this.drawParchment(context);

    const visible = this.visibleTiles(world, camera, cameraPoint);
    const citiesById = new Map((view.cities ?? []).map((city) => [city.id, city]));
    const actorIds = new Set((presentation?.actors || []).map(actor => actor.unit.id));
    const unitsById = new Map((view.units ?? []).map((unit) => [unit.id, unit]));
    const civilizations = new Map((view.civilizations ?? []).map((civilization) => [civilization.id, civilization]));

    for (const entry of visible) this.drawTile(context, entry, cameraPoint, camera.zoom);
    this.drawPreview(context, preview, world, cameraPoint, camera.zoom);
    const highlighted = [selectedTileId, hoverTileId].filter((value, index, values) => value !== null && values.indexOf(value) === index);
    for (const tileId of highlighted) {
      const tile = this.tileAt(world, tileId);
      if (!tile || tile.visibility === 'unexplored') continue;
      const visualX = this.nearestWrappedX(tile.x, camera.x, world.width);
      const screen = this.toScreen(project(visualX, tile.y), cameraPoint, camera.zoom);
      this.drawTileHighlight(context, screen, tileId === selectedTileId, tileId === hoverTileId);
    }

    const entities = visible.flatMap((entry) => {
      if (entry.tile.visibility === 'unexplored') return [];
      const city = entry.tile.cityId ? citiesById.get(entry.tile.cityId) : null;
      const units = entry.tile.visibility === 'visible'
        ? (entry.tile.unitIds ?? []).map((id) => unitsById.get(id)).filter(Boolean).filter((unit) => !unit.transportedByUnitId && !actorIds.has(unit.id))
        : [];
      return [{ ...entry, city, units }];
    });
    for (const actor of presentation?.actors || []) {
      const x = this.nearestWrappedX(actor.x, camera.x, world.width);
      entities.push({ center: project(x, actor.y), actor, units: [actor.unit],
        city: null, hasCity: Boolean(world.tiles[actor.unit.y * world.width + actor.unit.x]?.cityId) });
    }
    entities.sort((a, b) => a.center.y - b.center.y || a.center.x - b.center.x);
    for (const entry of entities) {
      const screen = this.toScreen(entry.center, cameraPoint, camera.zoom);
      if (entry.city) {
        const unit = representativeUnit(entry.units, selectedUnitId);
        const art = unit && UNIT_ART[unit.typeId];
        const height = art ? Math.min(art.height, art.width * art.bounds[3] / art.bounds[2]) * camera.zoom : 0;
        const labelOffset = art ? Math.min(0, 25 * camera.zoom - height * art.anchorY + 22) : 0;
        this.drawCity(context, entry.city, screen, civilizations.get(entry.city.ownerId), entry.city.id === selectedCityId, labelOffset);
      }
      if (entry.units.length) this.drawUnits(context, entry.units, screen, civilizations, selectedUnitId,
        { zoom: camera.zoom, city: Boolean(entry.city) || entry.hasCity, actor: entry.actor, pulse: presentation?.pulse });
    }

    this.drawUnitEffects(context, presentation?.effects || [], cameraPoint, camera.zoom);

  }

  unitFromPointer(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX-rect.left)*this.cssWidth/rect.width;
    const y = (clientY-rect.top)*this.cssHeight/rect.height;
    return [...this.unitHits].reverse().find(hit => x>=hit.left && x<=hit.left+hit.width && y>=hit.top && y<=hit.top+hit.height) || null;
  }

  tileFromPointer(clientX, clientY) {
    if (!this.lastWorld) return null;
    const rect = this.canvas.getBoundingClientRect?.() ?? { left: 0, top: 0, width: this.cssWidth, height: this.cssHeight };
    const width = rect.width || this.cssWidth;
    const height = rect.height || this.cssHeight;
    const screenX = (clientX - rect.left) * this.cssWidth / width;
    const screenY = (clientY - rect.top) * this.cssHeight / height;
    const camera = this.camera();
    const cameraPoint = project(camera.x, camera.y);
    const worldPoint = {
      x: cameraPoint.x + (screenX - this.cssWidth / 2) / camera.zoom,
      y: cameraPoint.y + (screenY - this.cssHeight / 2) / camera.zoom,
    };
    const exact = unproject(worldPoint.x, worldPoint.y);
    const y = Math.round(exact.y);
    if (y < 0 || y >= this.lastWorld.height) return null;
    const unwrappedX = Math.round(exact.x);
    const center = project(unwrappedX, y);
    const inDiamond = Math.abs(worldPoint.x - center.x) / HALF_WIDTH + Math.abs(worldPoint.y - center.y) / HALF_HEIGHT <= 1.000001;
    if (!inDiamond) return null;
    const x = modulo(unwrappedX, this.lastWorld.width);
    return { x, y, tileId: y * this.lastWorld.width + x };
  }

  pan(dx, dy) {
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    const camera = this.camera();
    const current = project(camera.x, camera.y);
    const next = unproject(current.x - dx / camera.zoom, current.y - dy / camera.zoom);
    this.setCamera(next.x, next.y, camera.zoom);
  }

  zoomAt(factor, clientX, clientY) {
    if (!Number.isFinite(factor) || factor <= 0) return;
    const rect = this.canvas.getBoundingClientRect?.() ?? { left: 0, top: 0, width: this.cssWidth, height: this.cssHeight };
    const screenX = (clientX - rect.left) * this.cssWidth / (rect.width || this.cssWidth);
    const screenY = (clientY - rect.top) * this.cssHeight / (rect.height || this.cssHeight);
    const camera = this.camera();
    const zoom = clamp(camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    const before = project(camera.x, camera.y);
    const pointUnderCursor = { x: before.x + (screenX - this.cssWidth / 2) / camera.zoom, y: before.y + (screenY - this.cssHeight / 2) / camera.zoom };
    const nextCamera = unproject(pointUnderCursor.x - (screenX - this.cssWidth / 2) / zoom, pointUnderCursor.y - (screenY - this.cssHeight / 2) / zoom);
    this.setCamera(nextCamera.x, nextCamera.y, zoom);
  }

  centerOn(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.setCamera(x, y, this.camera().zoom);
  }

  miniMapMetrics(canvas) {
    // CSS owns layout. Never derive CSS size from the DPR-scaled backing bitmap.
    const width = canvas.clientWidth || 220;
    const height = canvas.clientHeight || 140;
    return { width, height, inset: 6 };
  }

  miniMapPoint(canvas, clientX, clientY, world) {
    const rect = canvas.getBoundingClientRect();
    const { width, height, inset } = this.miniMapMetrics(canvas);
    const x = clientX - rect.left - (canvas.clientLeft || 0);
    const y = clientY - rect.top - (canvas.clientTop || 0);
    return {
      x: clamp(Math.floor((x - inset) / (width - 2 * inset) * world.width), 0, world.width - 1),
      y: clamp(Math.floor((y - inset) / (height - 2 * inset) * world.height), 0, world.height - 1),
    };
  }

  drawMiniMap(canvas, view) {
    if (!canvas?.getContext || canvas.hidden || !view?.world?.tiles) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const { width, height, inset } = this.miniMapMetrics(canvas);
    const ratio = Math.max(1, globalThis.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * ratio); const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#1f3b47'; context.fillRect(0, 0, width, height);
    const { world } = view;
    const tileWidth = (width - inset * 2) / world.width;
    const tileHeight = (height - inset * 2) / world.height;
    context.save(); context.beginPath(); context.rect(inset, inset, width - 2 * inset, height - 2 * inset); context.clip();
    for (const tile of world.tiles) {
      if (tile.visibility === 'unexplored') continue;
      const colors = TERRAIN_COLORS[tile.terrainId] ?? ['#56675a'];
      context.fillStyle = tile.visibility === 'remembered' ? '#43504a' : colors[0];
      context.fillRect(inset + tile.x * tileWidth, inset + tile.y * tileHeight, Math.ceil(tileWidth) + .5, Math.ceil(tileHeight) + .5);
    }
    const civilizations = new Map((view.civilizations ?? []).map(civ => [civ.id, civ]));
    for (const unit of view.units ?? []) {
      if (unit.transportedByUnitId || world.tiles[unit.y * world.width + unit.x]?.visibility !== 'visible') continue;
      context.fillStyle = civilizations.get(unit.ownerId)?.color ?? CIVILIZATION_FALLBACK;
      context.fillRect(inset + (unit.x + .5) * tileWidth - 1.5, inset + (unit.y + .5) * tileHeight - 1.5, 3, 3);
    }
    for (const city of view.cities ?? []) {
      context.fillStyle = civilizations.get(city.ownerId)?.color ?? CIVILIZATION_FALLBACK;
      const x = inset + (city.x + .5) * tileWidth; const y = inset + (city.y + .5) * tileHeight;
      context.fillRect(x - 2, y - 2, 4, 4); context.strokeStyle = '#fff2bc'; context.lineWidth = 1; context.strokeRect(x - 2, y - 2, 4, 4);
    }
    const camera = this.camera();
    const center = project(modulo(camera.x, world.width), camera.y);
    const halfW = this.cssWidth / (2 * camera.zoom); const halfH = this.cssHeight / (2 * camera.zoom);
    const corners = [[-halfW, -halfH], [halfW, -halfH], [halfW, halfH], [-halfW, halfH]]
      .map(([x, y]) => unproject(center.x + x, center.y + y));
    context.strokeStyle = '#fff1b2'; context.lineWidth = 1.5;
    for (const shift of [-world.width, 0, world.width]) {
      context.beginPath();
      corners.forEach((corner, index) => {
        const x = inset + (corner.x + shift + .5) * tileWidth; const y = inset + (corner.y + .5) * tileHeight;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.closePath(); context.stroke();
    }
    context.restore();
  }

  dispose() {
    this.context = null;
    this.canvas = null;
    this.lastWorld = null;
  }

  camera() {
    const camera = this.uiState.camera;
    return { x: Number.isFinite(camera.x) ? camera.x : 0, y: Number.isFinite(camera.y) ? camera.y : 0, zoom: clamp(Number.isFinite(camera.zoom) ? camera.zoom : 1, MIN_ZOOM, MAX_ZOOM) };
  }

  setCamera(x, y, zoom) {
    const camera = this.uiState.camera;
    camera.x = this.lastWorld ? x : x;
    camera.y = this.lastWorld ? clamp(y, 0, this.lastWorld.height - 1) : y;
    camera.zoom = clamp(zoom, MIN_ZOOM, MAX_ZOOM);
  }

  visibleTiles(world, camera, cameraPoint) {
    const corners = [
      { x: cameraPoint.x - this.cssWidth / (2 * camera.zoom), y: cameraPoint.y - this.cssHeight / (2 * camera.zoom) },
      { x: cameraPoint.x + this.cssWidth / (2 * camera.zoom), y: cameraPoint.y - this.cssHeight / (2 * camera.zoom) },
      { x: cameraPoint.x - this.cssWidth / (2 * camera.zoom), y: cameraPoint.y + this.cssHeight / (2 * camera.zoom) },
      { x: cameraPoint.x + this.cssWidth / (2 * camera.zoom), y: cameraPoint.y + this.cssHeight / (2 * camera.zoom) },
    ].map((corner) => unproject(corner.x, corner.y));
    const padding = 3;
    const minX = Math.floor(Math.min(...corners.map((point) => point.x))) - padding;
    const maxX = Math.ceil(Math.max(...corners.map((point) => point.x))) + padding;
    const minY = Math.max(0, Math.floor(Math.min(...corners.map((point) => point.y))) - padding);
    const maxY = Math.min(world.height - 1, Math.ceil(Math.max(...corners.map((point) => point.y))) + padding);
    const entries = [];
    for (let y = minY; y <= maxY; y += 1) {
      for (let visualX = minX; visualX <= maxX; visualX += 1) {
        const x = modulo(visualX, world.width);
        const tile = this.tileAt(world, y * world.width + x);
        if (!tile) continue;
        const center = project(visualX, y);
        const screen = this.toScreen(center, cameraPoint, camera.zoom);
        if (screen.x < -TILE_WIDTH * camera.zoom || screen.x > this.cssWidth + TILE_WIDTH * camera.zoom || screen.y < -TILE_HEIGHT * camera.zoom || screen.y > this.cssHeight + TILE_HEIGHT * camera.zoom) continue;
        entries.push({ tile, visualX, center });
      }
    }
    entries.sort((a, b) => a.center.y - b.center.y || a.center.x - b.center.x);
    return entries;
  }

  tileAt(world, tileId) {
    const direct = world.tiles[tileId];
    if (direct?.id === tileId) return direct;
    return world.tiles.find((tile) => tile.id === tileId) ?? null;
  }

  nearestWrappedX(x, cameraX, width) {
    return x + Math.round((cameraX - x) / width) * width;
  }

  toScreen(point, cameraPoint, zoom) {
    return { x: this.cssWidth / 2 + (point.x - cameraPoint.x) * zoom, y: this.cssHeight / 2 + (point.y - cameraPoint.y) * zoom };
  }

  drawParchment(context) {
    const gradient = context.createLinearGradient(0, 0, this.cssWidth, this.cssHeight);
    gradient.addColorStop(0, '#f6edcf');
    gradient.addColorStop(0.5, '#e8d9ad');
    gradient.addColorStop(1, '#cdbb86');
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.cssWidth, this.cssHeight);
    context.strokeStyle = 'rgba(87, 63, 35, 0.18)';
    context.lineWidth = 1;
    context.strokeRect(8, 8, this.cssWidth - 16, this.cssHeight - 16);
  }

  drawTile(context, entry, cameraPoint, zoom) {
    const { tile, center } = entry;
    const screen = this.toScreen(center, cameraPoint, zoom);
    const width = HALF_WIDTH * zoom;
    const height = HALF_HEIGHT * zoom;
    if (tile.visibility === 'unexplored') {
      diamondPath(context, screen.x, screen.y, width, height);
      context.fillStyle = '#8a7858';
      context.fill();
      context.strokeStyle = 'rgba(55, 45, 29, .25)';
      context.stroke();
      return;
    }
    const colors = TERRAIN_COLORS[tile.terrainId] ?? ['#847a62', '#afa588'];
    const gradient = context.createLinearGradient(screen.x - width, screen.y - height, screen.x + width, screen.y + height);
    gradient.addColorStop(0, colors[1]);
    gradient.addColorStop(1, colors[0]);
    diamondPath(context, screen.x, screen.y, width, height);
    context.fillStyle = gradient;
    context.fill();
    context.strokeStyle = 'rgba(58, 65, 41, .38)';
    context.lineWidth = Math.max(.7, zoom);
    context.stroke();
    context.save();
    diamondPath(context, screen.x, screen.y, width - 1, height - 1);
    context.clip();
    this.drawTerrainTexture(context, tile, screen, zoom);
    this.drawInfrastructure(context, tile, screen, zoom);
    if (tile.visibility === 'remembered') {
      context.fillStyle = 'rgba(18, 29, 33, .46)';
      context.fillRect(screen.x - width, screen.y - height, width * 2, height * 2);
    }
    context.restore();
  }

  drawTerrainTexture(context, tile, screen, zoom) {
    const random = hash(tile.x, tile.y);
    const terrain = tile.terrainId;
    if (terrain === 'forest') {
      context.fillStyle = '#315e3c';
      for (let i = 0; i < 6; i += 1) {
        const x = screen.x + ((hash(tile.x, tile.y, i) % 43) - 21) * zoom;
        const y = screen.y + ((hash(tile.y, tile.x, i + 9) % 21) - 11) * zoom;
        context.beginPath(); context.arc(x, y, 4 * zoom, 0, Math.PI * 2); context.fill();
        context.fillStyle = '#71964d'; context.beginPath(); context.arc(x - zoom, y - 2 * zoom, 2.2 * zoom, 0, Math.PI * 2); context.fill(); context.fillStyle = '#315e3c';
      }
    } else if (terrain === 'hills' || terrain === 'mountain') {
      const peaks = terrain === 'mountain' ? 3 : 2;
      for (let i = 0; i < peaks; i += 1) {
        const x = screen.x + (i - (peaks - 1) / 2) * 11 * zoom;
        const y = screen.y + (terrain === 'mountain' ? 5 : 7) * zoom;
        context.fillStyle = terrain === 'mountain' ? '#716960' : '#7d7444';
        context.beginPath(); context.moveTo(x - 8 * zoom, y + 4 * zoom); context.lineTo(x, y - (terrain === 'mountain' ? 13 : 8) * zoom); context.lineTo(x + 8 * zoom, y + 4 * zoom); context.closePath(); context.fill();
        if (terrain === 'mountain') { context.fillStyle = '#dedbd1'; context.beginPath(); context.moveTo(x, y - 13 * zoom); context.lineTo(x + 3 * zoom, y - 7 * zoom); context.lineTo(x - 2 * zoom, y - 6 * zoom); context.closePath(); context.fill(); }
      }
    } else if (terrain === 'coast' || terrain === 'ocean') {
      context.strokeStyle = 'rgba(220, 246, 237, .45)'; context.lineWidth = Math.max(.6, zoom);
      for (let i = 0; i < 3; i += 1) { const y = screen.y - 7 * zoom + i * 6 * zoom; context.beginPath(); context.arc(screen.x + ((random >>> (i * 5)) % 16 - 8) * zoom, y, 8 * zoom, 0.15, Math.PI - .15); context.stroke(); }
    } else if (terrain === 'desert') {
      context.strokeStyle = 'rgba(166, 125, 58, .35)'; context.lineWidth = zoom;
      for (let i = 0; i < 3; i += 1) { const y = screen.y - 5 * zoom + i * 5 * zoom; context.beginPath(); context.moveTo(screen.x - 15 * zoom, y); context.quadraticCurveTo(screen.x, y - 4 * zoom, screen.x + 15 * zoom, y); context.stroke(); }
    } else {
      context.fillStyle = terrain === 'tundra' ? 'rgba(245, 248, 239, .45)' : 'rgba(50, 93, 39, .22)';
      for (let i = 0; i < 5; i += 1) { const x = screen.x + ((hash(tile.x, tile.y, i) % 38) - 19) * zoom; const y = screen.y + ((hash(tile.y, tile.x, i + 17) % 18) - 9) * zoom; context.fillRect(x, y, zoom, 2 * zoom); }
    }
    if (tile.river) this.drawRiver(context, tile, screen, zoom);
    if (tile.resourceId && RESOURCES[tile.resourceId]) this.drawResource(context, tile.resourceId, screen, zoom);
  }

  drawRiver(context, tile, screen, zoom) {
    const direction = hash(tile.x, tile.y, 21) % 3;
    context.strokeStyle = '#d6ebdf'; context.lineWidth = 2.1 * zoom; context.lineCap = 'round';
    context.beginPath();
    if (direction === 0) { context.moveTo(screen.x - 25 * zoom, screen.y - 8 * zoom); context.bezierCurveTo(screen.x - 8 * zoom, screen.y - 2 * zoom, screen.x + 5 * zoom, screen.y + 2 * zoom, screen.x + 26 * zoom, screen.y + 10 * zoom); }
    if (direction === 1) { context.moveTo(screen.x - 7 * zoom, screen.y - 15 * zoom); context.bezierCurveTo(screen.x - 3 * zoom, screen.y - 4 * zoom, screen.x + 6 * zoom, screen.y + 4 * zoom, screen.x + 9 * zoom, screen.y + 17 * zoom); }
    if (direction === 2) { context.moveTo(screen.x + 22 * zoom, screen.y - 8 * zoom); context.bezierCurveTo(screen.x + 6 * zoom, screen.y - 4 * zoom, screen.x - 4 * zoom, screen.y + 4 * zoom, screen.x - 24 * zoom, screen.y + 10 * zoom); }
    context.stroke();
  }

  drawResource(context, resourceId, screen, zoom) {
    const glyphs = { wheat: '✦', iron: '◆', fish: '◒', silk: '❋' };
    context.fillStyle = '#f8efd0'; context.strokeStyle = '#4e3d25'; context.lineWidth = Math.max(1, zoom);
    context.font = `${Math.round(13 * zoom)}px serif`; context.textAlign = 'center'; context.textBaseline = 'middle';
    context.strokeText(glyphs[resourceId] ?? '•', screen.x, screen.y + 2 * zoom); context.fillText(glyphs[resourceId] ?? '•', screen.x, screen.y + 2 * zoom);
  }

  drawInfrastructure(context, tile, screen, zoom) {
    if (tile.routeId) {
      context.strokeStyle = tile.routeId === 'railroad' ? '#3b3b3d' : '#725335'; context.lineWidth = tile.routeId === 'railroad' ? 3 * zoom : 2 * zoom;
      context.beginPath(); context.moveTo(screen.x - 28 * zoom, screen.y); context.lineTo(screen.x + 28 * zoom, screen.y); context.stroke();
      if (tile.routeId === 'railroad') { context.strokeStyle = '#dfcfab'; context.lineWidth = Math.max(.65, zoom); for (let i = -19; i < 23; i += 8) { context.beginPath(); context.moveTo(screen.x + i * zoom, screen.y - 3 * zoom); context.lineTo(screen.x + i * zoom, screen.y + 3 * zoom); context.stroke(); } }
    }
    if (tile.landUseId) {
      context.strokeStyle = tile.landUseId === 'mine' ? '#4d4438' : '#c7e3da'; context.lineWidth = Math.max(.7, zoom);
      if (tile.landUseId === 'mine') { context.beginPath(); context.arc(screen.x, screen.y + 5 * zoom, 6 * zoom, Math.PI, 0); context.stroke(); }
      else { context.beginPath(); context.moveTo(screen.x - 17 * zoom, screen.y + 7 * zoom); context.lineTo(screen.x + 17 * zoom, screen.y - 6 * zoom); context.stroke(); }
    }
  }

  drawCity(context, city, screen, civilization, selected, labelOffset = 0) {
    const color = civilization?.color ?? CIVILIZATION_FALLBACK;
    const zoom = this.camera().zoom;
    const image = this.artStore.get('city');
    const width = CITY_ART.width * zoom;
    const height = width * CITY_ART.bounds[3] / CITY_ART.bounds[2];
    labelOffset = Math.min(labelOffset, 22 - height);
    context.save();
    context.fillStyle = '#122e3590'; context.strokeStyle = selected ? '#fff0a8' : color; context.lineWidth = selected ? 3 : 2;
    context.beginPath(); context.ellipse(screen.x, screen.y + 6 * zoom, width / 2, 12 * zoom, 0, 0, Math.PI * 2); context.fill(); context.stroke();
    if (image) context.drawImage(image, ...CITY_ART.bounds, screen.x - width / 2, screen.y + 9 * zoom - height, width, height);
    this.badge(context, screen.x - width / 2 + 3, screen.y - 8 * zoom, String(city.population), color);
    this.entityLabel(context, `${city.name}  ${city.population}`, screen.x, screen.y - 36 + labelOffset, color);
    const production = city.productionQueue?.[0];
    if (production && this.camera().zoom >= 1) {
      const definition = ({ unit: UNITS, building: BUILDINGS, project: PROJECTS }[production.kind] || {})[production.definitionId];
      const turns = city.forecast?.production?.turns;
      this.entityLabel(context, `${definition?.label || '生産'} · ${turns === null || turns === undefined ? '停止中' : `${turns}ターン`}`, screen.x, screen.y - 56 + labelOffset, color);
    }
    context.restore();
  }

  drawUnits(context, units, screen, civilizations, selectedUnitId, { zoom = 1, city = false, actor = null, pulse = null } = {}) {
    const unit = actor?.unit || representativeUnit(units, selectedUnitId);
    if (!unit) return;
    const art = UNIT_ART[unit.typeId];
    const image = this.artStore.get(unit.typeId);
    if (!art || !image) return;
    const selected = unit.id === selectedUnitId;
    const color = civilizations.get(unit.ownerId)?.color ?? CIVILIZATION_FALLBACK;
    const x = screen.x + (city ? 18 : 0) * zoom;
    const y = screen.y + (city ? 4 : 7) * zoom - (actor?.lift || 0) * zoom;
    const source = art.bounds || [0, 0, image.naturalWidth || image.width, image.naturalHeight || image.height];
    const fit = Math.min(art.width / source[2], art.height / source[3]) * zoom * (city ? .8 : 1);
    const width = source[2] * fit;
    const height = source[3] * fit;
    const left = x - width * art.anchorX;
    const top = y - height * art.anchorY;
    const radius = (UNITS[unit.typeId]?.domain === 'sea' ? 24 : 17) * zoom;
    context.save();
    context.globalAlpha = actor?.alpha ?? 1;
    context.fillStyle = 'rgba(9, 20, 23, .38)';
    context.beginPath(); context.ellipse(x + 2 * zoom, y + 2 * zoom, radius + 3 * zoom, 6 * zoom, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#17303be6'; context.strokeStyle = color; context.lineWidth = 2 * zoom;
    context.beginPath(); context.ellipse(x, y, radius, 5 * zoom, 0, 0, Math.PI * 2); context.fill(); context.stroke();
    if (selected) {
      const strength = pulse?.id === unit.id ? pulse.strength : 0;
      context.save(); context.strokeStyle = '#fff3b0'; context.lineWidth = (2 + strength) * zoom;
      context.shadowColor = '#fff0ad'; context.shadowBlur = 7 + strength * 14;
      context.beginPath(); context.ellipse(x, y, radius + 3 * zoom, 7 * zoom, 0, 0, Math.PI * 2); context.stroke(); context.restore();
    }
    context.save();
    context.filter = unitIsSpent(unit) ? 'saturate(.35) brightness(.82)' : 'none';
    if (selected) { context.shadowColor = '#fff5c7'; context.shadowBlur = 3 * zoom; }
    if (actor?.flash) context.filter = `brightness(${1 + actor.flash * 2})`;
    context.drawImage(image, ...source, left, top, width, height);
    if (!actor) this.unitHits.push({ unitId: unit.id, tileId: unit.y*this.lastWorld.width+unit.x, left, top, width, height });
    context.restore();
    const barWidth = Math.max(22, 27 * zoom);
    const barHeight = Math.max(3, 3 * zoom);
    const hp = clamp(unit.hp / (UNITS[unit.typeId]?.hp || 10), 0, 1);
    context.fillStyle = '#10232d'; context.fillRect(x - barWidth / 2 - 1, y + 9 * zoom, barWidth + 2, barHeight + 2);
    context.fillStyle = hp < .4 ? '#df7566' : hp < .7 ? '#e1bb62' : '#a9cf86';
    context.fillRect(x - barWidth / 2, y + 9 * zoom + 1, barWidth * hp, barHeight);
    if (city) this.entityLabel(context, `駐留 ${units.length}${selected ? ' · ' + labelForUnit(unit) : ''}`, screen.x, screen.y + 32 * zoom, color);
    else if (selected) this.entityLabel(context, labelForUnit(unit), x, y + 29 * zoom, color);
    if (units.length > 1 && !city) this.badge(context, x + radius + 4, y - 7 * zoom, String(units.length), color);
    context.restore();
  }

  drawUnitEffects(context, effects, cameraPoint, zoom) {
    const screen = point => this.toScreen(project(this.nearestWrappedX(point.x, this.camera().x, this.lastWorld.width), point.y), cameraPoint, zoom);
    for (const effect of effects) {
      context.save();
      if (effect.kind === 'damage') {
        const p = screen(effect); context.font = 'bold 16px sans-serif'; context.textAlign = 'center';
        context.strokeStyle = '#341d19'; context.lineWidth = 3; context.fillStyle = '#ffe2b9';
        const y = p.y - (52 + effect.rise) * zoom;
        context.strokeText(effect.text, p.x, y); context.fillText(effect.text, p.x, y);
      } else if (effect.kind === 'shot') {
        const a = screen(effect.from); const b = screen(effect.to); const t = effect.progress;
        const x = a.x + (b.x - a.x) * t; const y = a.y + (b.y - a.y) * t - 24 * zoom;
        context.strokeStyle = '#fff2c7'; context.lineWidth = 3 * zoom; context.shadowColor = '#ffba69'; context.shadowBlur = 8;
        context.beginPath(); context.moveTo(x - (b.x - a.x) * .12, y - (b.y - a.y) * .12); context.lineTo(x, y); context.stroke();
      }
      context.restore();
    }
  }

  badge(context, x, y, text, color) {
    context.save(); context.font = 'bold 10px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle';
    const width = Math.max(14, context.measureText(text).width + 7); context.fillStyle = '#f8edd0'; context.strokeStyle = color; context.lineWidth = 1.5;
    context.beginPath(); context.roundRect(x - width / 2, y - 7, width, 14, 6); context.fill(); context.stroke(); context.fillStyle = '#2d261d'; context.fillText(text, x, y + .5); context.restore();
  }

  entityLabel(context, text, x, y, color) {
    context.save(); context.font = 'bold 12px sans-serif'; context.textAlign = 'center'; context.textBaseline = 'middle'; const width = context.measureText(text).width + 14;
    context.fillStyle = 'rgba(39, 34, 26, .84)'; context.strokeStyle = color; context.lineWidth = 1; context.beginPath(); context.roundRect(x - width / 2, y - 10, width, 20, 5); context.fill(); context.stroke(); context.fillStyle = '#fff7de'; context.fillText(text, x, y + .5); context.restore();
  }

  drawTileHighlight(context, screen, selected, hovered) {
    diamondPath(context, screen.x, screen.y, HALF_WIDTH * this.camera().zoom - 2, HALF_HEIGHT * this.camera().zoom - 2);
    context.strokeStyle = selected ? '#fff0a1' : '#f3d76d'; context.lineWidth = selected ? 3 : 1.5; context.setLineDash(hovered && !selected ? [5, 3] : []); context.stroke(); context.setLineDash([]);
  }

  drawPreview(context, preview, world, cameraPoint, zoom) {
    if(!Array.isArray(preview?.path)||!preview.path.length)return;
    const raw=preview.from?[preview.from,...preview.path]:preview.path;
    const points=raw.map(p=>typeof p==='number'?this.tileAt(world,p):p?.tileId!==undefined?this.tileAt(world,p.tileId):p).filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y));
    if(points.length<2)return;
    let lastX=this.nearestWrappedX(points[0].x,this.camera().x,world.width);
    const screenPoints=points.map((p,index)=>{if(index)lastX=this.nearestWrappedX(p.x,lastX,world.width);return {...this.toScreen(project(lastX,p.y),cameraPoint,zoom),arrivalRound:p.arrivalRound};});
    context.save();context.lineWidth=3;context.lineCap='round';
    for(let i=1;i<screenPoints.length;i++){
      const future=Number.isFinite(preview.round)&&screenPoints[i].arrivalRound>preview.round;
      context.strokeStyle=future?'#c7c6b4':'#fff0a6';context.setLineDash(future?[3,6]:[8,4]);
      context.beginPath();context.moveTo(screenPoints[i-1].x,screenPoints[i-1].y);context.lineTo(screenPoints[i].x,screenPoints[i].y);context.stroke();
      context.setLineDash([]);context.fillStyle=future?'#989e94':'#fff0a6';context.beginPath();context.arc(screenPoints[i].x,screenPoints[i].y,3,0,Math.PI*2);context.fill();
    }
    const end=screenPoints.at(-1);context.strokeStyle='#ffe8a0';context.lineWidth=2;
    diamondPath(context,end.x,end.y,HALF_WIDTH*zoom-3,HALF_HEIGHT*zoom-3);context.stroke();
    this.badge(context,end.x,end.y+18*zoom,'目的地','#99703c');
    const current=screenPoints.filter(p=>p.arrivalRound===undefined||p.arrivalRound<=preview.round).at(-1);
    if(current&&current!==end)this.badge(context,current.x,current.y+18*zoom,'今ターン','#6b7c46');
    context.restore();
  }
}
