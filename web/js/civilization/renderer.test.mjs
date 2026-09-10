import assert from 'node:assert/strict';
import { CivilizationRenderer } from './renderer.mjs';

const noop = () => {};
const context = new Proxy({
  createLinearGradient: () => ({ addColorStop: noop }),
  measureText: (text) => ({ width: String(text).length * 7 }),
  roundRect: noop,
}, { get: (target, key) => target[key] ?? noop, set: () => true });
const canvas = () => ({ width: 640, height: 480, clientWidth: 640, clientHeight: 480, getContext: () => context, getBoundingClientRect: () => ({ left: 20, top: 10, width: 640, height: 480 }) });
const world = (width = 48, height = 32) => ({ width, height, tiles: Array.from({ length: width * height }, (_, id) => ({ id, x: id % width, y: Math.floor(id / width), visibility: 'visible', terrainId: 'grassland', river: false, resourceId: null, routeId: null, landUseId: null, cityId: null, unitIds: [] })) });
const view = { world: world(), cities: [], units: [], civilizations: [] };

{
  const uiState = { camera: { x: 11, y: 9, zoom: 1 } };
  const renderer = new CivilizationRenderer(canvas(), uiState);
  renderer.draw(view);
  const point = renderer.tileFromPointer(20 + 320, 10 + 240);
  assert.deepEqual(point, { x: 11, y: 9, tileId: 9 * 48 + 11 });
  const before = structuredClone(uiState.camera);
  renderer.draw(view);
  assert.deepEqual(uiState.camera, before, 'draw must not mutate shared UI state');
}

{
  const uiState = { camera: { x: 47, y: 12, zoom: 1 } };
  const renderer = new CivilizationRenderer(canvas(), uiState);
  renderer.draw(view);
  renderer.pan(64, 0);
  assert.notEqual(uiState.camera.x, 47, 'pan changes only the camera');
  const cursor = renderer.tileFromPointer(20 + 430, 10 + 150);
  renderer.zoomAt(1.6, 20 + 430, 10 + 150);
  assert.equal(uiState.camera.zoom, 1.6);
  assert.deepEqual(renderer.tileFromPointer(20 + 430, 10 + 150), cursor, 'zoom preserves the tile under the cursor');
  renderer.centerOn(49, 99);
  assert.equal(uiState.camera.y, 31, 'centerOn clamps the north/south map edge');
}

console.log('renderer projection tests passed');

{
  const painted = [];
  const fakeContext = new Proxy({
    createLinearGradient: () => ({ addColorStop: noop }),
    measureText: text => ({ width: String(text).length * 7 }),
    drawImage: (...args) => painted.push(args),
  }, { get: (target, key) => target[key] ?? noop, set: (target, key, value) => { target[key] = value; return true; } });
  const fakeCanvas = canvas(); fakeCanvas.getContext = () => fakeContext;
  const art = { get: id => ({ marker: id, naturalWidth: 100, naturalHeight: 120 }) };
  const renderer = new CivilizationRenderer(fakeCanvas, { camera: { x: 11, y: 9, zoom: 1 } }, art);
  const units = [
    { id: 's', typeId: 'settler', ownerId: 'a', x: 11, y: 9, hp: 10, movementLeft: 2, stance: 'active' },
    { id: 'w', typeId: 'warrior', ownerId: 'a', x: 11, y: 9, hp: 10, movementLeft: 1, stance: 'active' },
  ];
  const testView = { ...view, world: world(), units, civilizations: [{ id: 'a', color: '#ab4532' }] };
  testView.world.tiles[9 * 48 + 11].unitIds = ['s', 'w'];
  renderer.draw(testView);
  assert.equal(painted.length, 1, 'a stack paints one representative, not three overlapping sprites');
  assert.equal(painted[0][0].marker, 'warrior');
  const hit = renderer.unitHits[0];
  assert.equal(renderer.unitFromPointer(20 + hit.left + hit.width / 2, 10 + hit.top + hit.height / 2).unitId, 'w', 'the raised sprite selects its source tile');
  painted.length = 0; renderer.draw(testView, { selectedUnitId: 's' });
  assert.equal(painted[0][0].marker, 'settler', 'explicit selection overrides the military representative');
  const sizeAtOne = renderer.unitHits[0].height;
  renderer.uiState.camera.zoom = 2.4; painted.length = 0; renderer.draw(testView, { selectedUnitId: 's' });
  assert.ok(Math.abs(renderer.unitHits[0].height / sizeAtOne - 2.4) < 1e-8, 'sprite scales with map zoom');
  testView.world.tiles[9 * 48 + 11].visibility = 'remembered'; painted.length = 0; renderer.draw(testView);
  assert.equal(painted.length, 0, 'remembered tiles never paint enemy or stale units');
  assert.equal(renderer.unitHits.length, 0, 'invisible sprites cannot be clicked');
}
