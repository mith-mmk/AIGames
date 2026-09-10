import assert from 'node:assert/strict';
import { CivilizationSaveStore, parseSnapshotJson, stringifySnapshot } from './save-store.mjs';

class FakeSchemaStore {
  constructor() { this.names = new Set(); this.indexNames = { contains: (name) => this.names.has(name) }; }
  createIndex(name) { this.names.add(name); }
}

class FakeTransaction {
  constructor(database) { this.database = database; this.pending = 0; this.done = false; this.error = null; }
  objectStore() { return new FakeObjectStore(this, this.database.records); }
  request(operation) {
    const request = {};
    this.pending += 1;
    queueMicrotask(() => {
      try { request.result = operation(); request.onsuccess?.(); }
      catch (error) { request.error = error; this.error = error; request.onerror?.(); this.onabort?.(); }
      finally { this.pending -= 1; this.finish(); }
    });
    return request;
  }
  finish() {
    if (this.pending || this.done || this.error) return;
    queueMicrotask(() => { if (!this.pending && !this.done && !this.error) { this.done = true; this.oncomplete?.(); } });
  }
  abort() { this.error = this.error ?? new Error('aborted'); this.onabort?.(); }
}

class FakeObjectStore {
  constructor(transaction, records) { this.transaction = transaction; this.records = records; }
  put(record) { return this.transaction.request(() => this.records.set(record.slotId, structuredClone(record))); }
  get(slotId) { return this.transaction.request(() => structuredClone(this.records.get(slotId))); }
  getAll() { return this.transaction.request(() => [...this.records.values()].map((record) => structuredClone(record))); }
  delete(slotId) { return this.transaction.request(() => this.records.delete(slotId)); }
}

class FakeDatabase {
  constructor() { this.records = new Map(); this.schema = new FakeSchemaStore(); this.objectStoreNames = { values: new Set(), contains: (name) => this.objectStoreNames.values.has(name) }; }
  
  createObjectStore(name) { this.objectStoreNames.values.add(name); return this.schema; }
  transaction() { return new FakeTransaction(this); }
  close() {}
}

class FakeIndexedDB {
  constructor() { this.database = new FakeDatabase(); this.created = false; }
  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = this.database;
      if (!this.created) { this.created = true; request.transaction = { objectStore: () => this.database.schema }; request.onupgradeneeded?.(); }
      request.onsuccess?.();
    });
    return request;
  }
}

const snapshot = (round = 4) => ({
  schemaVersion: 1,
  config: { humanCivId: 'civ-a' },
  turn: { round },
  world: { width: 48, height: 32 },
  civilizations: [{ id: 'civ-a', name: '暁の王国' }],
  cities: [],
  units: [],
});

const fake = new FakeIndexedDB();
const store = new CivilizationSaveStore({ indexedDB: fake });
const source = snapshot();
await store.write({ slotId: 'save-auto', snapshot: source });
source.turn.round = 99;
const autos = await Promise.all([2, 3, 4].map((round) => store.write({ kind: 'auto', slotId: 'save-auto', snapshot: snapshot(round) })));
assert.equal((await store.list()).filter((row) => row.kind === 'auto').length, 3, 'only three automatic saves remain');
assert.ok(autos.every((row) => row.slotId.startsWith('auto-') && row.slotId !== 'save-auto'));

const saved = await store.read((await store.list()).at(-1).slotId);
assert.notEqual(saved.turn.round, 99, 'write stores a detached snapshot clone');
saved.turn.round = 700;
assert.notEqual((await store.read((await store.list()).at(-1).slotId)).turn.round, 700, 'read returns a detached snapshot clone');

const manual = await store.write({ kind: 'manual', slotId: 'campaign-one', label: '  ', snapshot: snapshot(12) });
assert.equal(manual.label, '手動保存');
const exported = await store.exportJson('campaign-one');
assert.equal(JSON.parse(exported).schemaVersion, 1, 'exports the raw snapshot document');
const countBeforeImport = (await store.list()).length;
assert.deepEqual(store.importJson(exported), snapshot(12));
assert.equal((await store.list()).length, countBeforeImport, 'import never writes a database slot');

assert.throws(() => parseSnapshotJson('{'), /malformed JSON/);
assert.throws(() => stringifySnapshot({}), /schemaVersion/);
const circular = snapshot(); circular.world.self = circular;
assert.throws(() => stringifySnapshot(circular), /circular/);
await assert.rejects(new CivilizationSaveStore({ indexedDB: null }).open(), /IndexedDB is unavailable/);

console.log('save store tests passed');
