import test from 'node:test';
import assert from 'node:assert/strict';
import { PinballSound } from './sound.mjs';

const gesture = { isTrusted: true, type: 'pointerdown' };
class Param {
  setValueAtTime() {}
  linearRampToValueAtTime() {}
  exponentialRampToValueAtTime() {}
}
class Node {
  constructor() { this.gain = new Param(); this.frequency = new Param(); this.stops = 0; this.disconnected = false; }
  connect() {}
  disconnect() { this.disconnected = true; }
  start() {}
  stop() { this.stops++; }
}
class Context {
  constructor() { this.state = 'suspended'; this.currentTime = 0; this.oscillators = []; this.gains = []; this.resumes = 0; this.closes = 0; }
  createGain() { const node = new Node(); this.gains.push(node); return node; }
  createOscillator() { const node = new Node(); this.oscillators.push(node); return node; }
  async resume() { this.resumes++; this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  async close() { this.closes++; this.state = 'closed'; }
}
function setup(options = {}) {
  const context = new Context(); let creates = 0;
  const sound = new PinballSound({ storage: {}, contextFactory: () => { creates++; return context; }, ...options });
  return { sound, context, creates: () => creates };
}

test('no autoplay, allocation or resume without a trusted input gesture', async () => {
  const { sound, context, creates } = setup();
  assert.equal(sound.play('launch'), false);
  for (const event of [undefined, { type: 'pointerdown', isTrusted: false }, { type: 'load', isTrusted: true }]) {
    assert.equal(await sound.unlock(event), false);
  }
  assert.equal(creates(), 0);
  assert.equal(context.oscillators.length, 0);
  assert.equal(await sound.unlock(gesture), true);
  assert.equal(creates(), 1);
  assert.equal(context.resumes, 1);
  assert.equal(context.gains[0].gain.value, .13);
  await sound.unlock(gesture);
  assert.equal(creates(), 1);
  sound.dispose();
});

test('all cabinet events have bounded short effects and unknown events are ignored', async () => {
  const { sound, context } = setup(); await sound.unlock(gesture);
  for (const name of ['launch', 'flipper', 'bumper', 'sling', 'target', 'mission', 'multiplier', 'tilt', 'drain', 'gameover']) {
    assert.equal(sound.play(name), true, name);
    const source = context.oscillators.at(-1);
    assert.equal(source.stops, 1);
    source.onended();
    assert.equal(source.disconnected, true);
    assert.equal(sound.voices.size, 0);
  }
  assert.equal(sound.play('missing'), false);
  sound.dispose();
});

test('repeat rate limits and a hard voice cap prevent audio storms', async () => {
  const { sound, context } = setup({ maxVoices: 2 }); await sound.unlock(gesture);
  assert.equal(sound.play('bumper'), true);
  assert.equal(sound.play('bumper'), false);
  assert.equal(sound.play('sling'), true);
  context.currentTime = 1;
  assert.equal(sound.play('target'), false);
  assert.equal(context.oscillators.length, 2);
  context.oscillators[0].onended();
  assert.equal(sound.play('bumper', Infinity), true);
  assert.equal(sound.voices.size, 2);
  sound.dispose();
});

test('mute and pause stop active voices; unmute/unpause need a gesture', async () => {
  const values = new Map();
  const { sound, context } = setup({ storage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) } });
  await sound.unlock(gesture); sound.play('mission');
  assert.equal(sound.setMuted(true), true);
  assert.equal(sound.voices.size, 0);
  assert.equal(context.oscillators[0].stops, 2);
  assert.equal(context.oscillators[0].disconnected, true);
  assert.equal(await sound.unlock(gesture), false);
  assert.equal(sound.play('target'), false);
  assert.equal(values.get('ai-games-pinball-muted'), 'true');
  sound.toggleMuted(); assert.equal(sound.play('target'), false);
  await sound.unlock(gesture); sound.play('target');
  sound.setPaused(true); assert.equal(sound.voices.size, 0);
  assert.equal(await sound.unlock(gesture), false);
  sound.setPaused(false); assert.equal(sound.play('target'), false);
  assert.equal(await sound.unlock(gesture), true);
  assert.equal(sound.play('target'), true);
  sound.dispose(); sound.dispose();
  assert.equal(context.closes, 1);
  assert.equal(context.gains.every(node => node.disconnected), true);
  assert.equal(await sound.unlock(gesture), false);
});

test('saved mute and unavailable WebAudio/storage fail silently', async () => {
  const saved = setup({ storage: { getItem: () => 'true' } });
  assert.equal(saved.sound.muted, true);
  assert.equal(await saved.sound.unlock(gesture), false);
  assert.equal(saved.creates(), 0);
  const unavailable = new PinballSound({ contextFactory: () => null, storage: { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); } } });
  assert.equal(await unavailable.unlock(gesture), false);
  unavailable.setMuted(true); unavailable.dispose();
  const broken = setup(); broken.context.resume = async () => { throw Error('denied'); };
  assert.equal(await broken.sound.unlock(gesture), false);
  broken.context.close = async () => { throw Error('closed'); };
  broken.sound.dispose();
});

test('pending resume cannot restart sound after pause or disposal', async () => {
  for (const action of ['pause', 'mute', 'dispose']) {
    const { sound, context } = setup(); let finish;
    context.resume = () => new Promise(resolve => { finish = () => { context.state = 'running'; resolve(); }; });
    const pending = sound.unlock(gesture);
    if (action === 'pause') sound.setPaused(true);
    if (action === 'mute') sound.setMuted(true);
    if (action === 'dispose') sound.dispose();
    finish(); assert.equal(await pending, false);
    assert.equal(sound.play('launch'), false);
    sound.dispose();
  }
});
