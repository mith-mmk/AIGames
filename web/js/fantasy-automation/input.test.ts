import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { WorldInput } from './input';

class Canvas extends EventTarget {
  style = { touchAction: '' }; tabIndex = -1; captures = new Set<number>();
  setAttribute() {} focus() {}
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); this.dispatchEvent(Object.assign(new Event('lostpointercapture'), { pointerId: id })); }
}
function setup(t: TestContext) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const window = new EventTarget(); Object.defineProperty(globalThis, 'window', { configurable: true, value: window });
  const canvas = new Canvas(), picks: number[][] = [], pans: number[][] = [], zooms: number[] = [];
  let now = 1000; t.mock.method(performance, 'now', () => now);
  const input = new WorldInput(canvas as unknown as HTMLCanvasElement, {
    pick: event => ({ x: Math.floor(event.clientX / 10), z: Math.floor(event.clientY / 10) }),
    onPick: (x, z) => { picks.push([x, z]); }, onHover: () => {}, pan: (x, z) => { pans.push([x, z]); }, zoom: delta => { zooms.push(delta); }, rotate: () => {},
  });
  const event = (type: string, id: number, x = 10, y = 10, pointerType = 'touch', button = 0) => canvas.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { pointerId: id, clientX: x, clientY: y, pointerType, button }));
  t.after(() => { input.dispose(); if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window'); });
  return { canvas, window, input, event, picks, pans, zooms, advance: (ms: number) => { now += ms; } };
}

test('a touch places exactly once on release, never on first contact or compatibility click', t => {
  const s = setup(t); s.event('pointerdown', 1); assert.deepEqual(s.picks, []);
  s.event('pointerup', 1); assert.deepEqual(s.picks, [[1, 1]]);
  s.event('pointerdown', 5, 10, 10, 'mouse'); s.event('pointerup', 5, 10, 10, 'mouse'); assert.equal(s.picks.length, 1);
  const click = new Event('click', { cancelable: true }); s.canvas.dispatchEvent(click); assert(click.defaultPrevented);
  s.advance(701); s.event('pointerdown', 6, 20, 10, 'mouse'); assert.equal(s.picks.length, 2);
});

test('a late second contact cancels the pending build and performs pinch and pan without construction', t => {
  const s = setup(t); s.event('pointerdown', 1, 100, 100); s.advance(1000); assert.equal(s.picks.length, 0);
  s.event('pointerdown', 2, 200, 100); s.event('pointermove', 1, 90, 120); s.event('pointermove', 2, 230, 120);
  assert(s.pans.some(([x, y]) => x !== 0 || y !== 0)); assert(s.zooms.some(value => value < 0));
  s.event('pointerup', 2, 230, 120); s.event('pointermove', 1, 110, 140); s.event('pointerup', 1, 110, 140);
  assert.equal(s.picks.length, 0); assert.equal(s.canvas.captures.size, 0);
  s.event('pointerdown', 3, 40, 40); s.event('pointerup', 3, 40, 40); assert.deepEqual(s.picks, [[4, 4]]);
});

test('one-finger dragging never paints a belt before or after releasing', t => {
  const s = setup(t); s.event('pointerdown', 1); s.event('pointermove', 1, 100, 100); s.event('pointermove', 1, 10, 10); s.event('pointerup', 1);
  assert.deepEqual(s.picks, []); assert.deepEqual(s.pans, []);
});

test('a second touch on the surrounding interface cancels the canvas tap', t => {
  const s = setup(t); s.event('pointerdown', 1);
  s.window.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', pointerId: 2 }));
  s.event('pointerup', 1); assert.deepEqual(s.picks, []);
});

test('a canvas touch cannot click a panel revealed under its release; the next real UI press still works', t => {
  const s = setup(t); s.event('pointerdown', 1); s.event('pointerup', 1);
  const retargeted = Object.assign(new Event('click', { cancelable: true }), { detail: 1 });
  s.window.dispatchEvent(retargeted); assert(retargeted.defaultPrevented);
  s.window.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'touch', pointerId: 2, isPrimary: true }));
  const deliberate = Object.assign(new Event('click', { cancelable: true }), { detail: 1 });
  s.window.dispatchEvent(deliberate); assert(!deliberate.defaultPrevented);
});

test('pointer cancellation and capture loss never become taps, including the last finger of a gesture', t => {
  const s = setup(t); s.event('pointerdown', 1); s.event('pointercancel', 1); s.event('pointerup', 1);
  s.event('pointerdown', 2); s.canvas.releasePointerCapture(2); s.event('pointerup', 2);
  s.event('pointerdown', 3); s.event('pointerdown', 4, 100); s.event('pointercancel', 3); s.event('pointerup', 4, 100);
  assert.deepEqual(s.picks, []);
});

test('three fingers, coincident points and reversed lift order stay finite and never build', t => {
  const s = setup(t); for (const id of [1, 2, 3]) s.event('pointerdown', id);
  s.event('pointermove', 2, 300, 300); s.event('pointermove', 3, 0, 0);
  for (const id of [1, 3, 2]) s.event('pointerup', id);
  assert.deepEqual(s.picks, []); assert(s.zooms.every(Number.isFinite));
});

test('blocking, resize, blur and disposal discard pending touches and release every capture', t => {
  const s = setup(t);
  for (const mode of ['block', 'resize', 'blur']) {
    s.event('pointerdown', 1); s.event('pointerdown', 2, 100);
    if (mode === 'block') { s.input.setBlocked(true); s.input.setBlocked(false); }
    else s.window.dispatchEvent(new Event(mode));
    s.event('pointerup', 1); s.event('pointerup', 2, 100); assert.equal(s.canvas.captures.size, 0);
  }
  s.event('pointerdown', 1); s.input.dispose(); s.event('pointerup', 1); assert.deepEqual(s.picks, []);
});

test('mouse painting retains immediate placement and cardinal interpolation', t => {
  const s = setup(t); s.event('pointerdown', 1, 0, 0, 'mouse'); s.event('pointermove', 1, 35, 25, 'mouse'); s.event('pointerup', 1, 35, 25, 'mouse');
  assert.deepEqual(s.picks, [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2]]);
});
