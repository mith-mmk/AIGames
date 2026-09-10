const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
const STORE_NAME = 'saveSlots';
const AUTO_LABEL = '自動保存';
const MANUAL_LABEL = '手動保存';

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

const byteLength = (text) => {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).byteLength;
  return unescape(encodeURIComponent(text)).length;
};

const snapshotError = (message) => new TypeError(`Invalid Chronicle Kingdoms save: ${message}`);

function assertSnapshotShape(snapshot) {
  if (!isRecord(snapshot)) throw snapshotError('the document must be an object');
  if (!Object.hasOwn(snapshot, 'schemaVersion')) throw snapshotError('schemaVersion is required');
  if (!isRecord(snapshot.config)) throw snapshotError('config is required');
  if (!isRecord(snapshot.turn)) throw snapshotError('turn is required');
  if (!isRecord(snapshot.world)) throw snapshotError('world is required');
  for (const field of ['civilizations', 'cities', 'units']) if (!Array.isArray(snapshot[field])) throw snapshotError(`${field} must be an array`);
}

function assertJsonCompatible(value, path = '$', seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw snapshotError(`${path} must contain finite numbers`);
    return;
  }
  if (!value || typeof value !== 'object') throw snapshotError(`${path} is not JSON compatible`);
  if (seen.has(value)) throw snapshotError(`${path} contains a circular reference`);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null && !Array.isArray(value)) throw snapshotError(`${path} must be a plain object`);
  seen.add(value);
  if (Array.isArray(value)) value.forEach((item, index) => assertJsonCompatible(item, `${path}[${index}]`, seen));
  else Object.entries(value).forEach(([key, item]) => assertJsonCompatible(item, `${path}.${key}`, seen));
  seen.delete(value);
}

/** Serialize a raw Snapshot document after the deliberately shallow store boundary check. */
export function stringifySnapshot(snapshot) {
  assertSnapshotShape(snapshot);
  assertJsonCompatible(snapshot);
  let text;
  try {
    text = JSON.stringify(snapshot);
  } catch (error) {
    throw snapshotError(`the document is not JSON serializable (${error.message})`);
  }
  if (typeof text !== 'string') throw snapshotError('the document is not JSON serializable');
  if (byteLength(text) > MAX_DOCUMENT_BYTES) throw new RangeError('Chronicle Kingdoms save exceeds the 20 MiB limit.');
  try {
    const roundTrip = JSON.parse(text);
    assertSnapshotShape(roundTrip);
  } catch (error) {
    if (error instanceof RangeError) throw error;
    throw snapshotError(error.message.replace(/^Invalid Chronicle Kingdoms save: /, ''));
  }
  return text;
}

/** Parse and clone a raw Snapshot document. Full game validation belongs to CivilizationEngine.load(). */
export function parseSnapshotJson(text) {
  if (typeof text !== 'string') throw snapshotError('JSON text must be a string');
  if (byteLength(text) > MAX_DOCUMENT_BYTES) throw new RangeError('Chronicle Kingdoms save exceeds the 20 MiB limit.');
  let snapshot;
  try {
    snapshot = JSON.parse(text);
  } catch (error) {
    throw snapshotError(`malformed JSON (${error.message})`);
  }
  assertSnapshotShape(snapshot);
  return snapshot;
}

const cloneSnapshot = (snapshot) => parseSnapshotJson(stringifySnapshot(snapshot));
const requestResult = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
});
const transactionResult = (transaction) => new Promise((resolve, reject) => {
  transaction.oncomplete = () => resolve();
  transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction was aborted.'));
  transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed.'));
});

function normalizeLabel(label, kind) {
  const text = typeof label === 'string' ? label.trim() : '';
  return text.slice(0, 120) || (kind === 'auto' ? AUTO_LABEL : MANUAL_LABEL);
}

function saveMetadata(snapshot, slotId, kind, label, savedAt) {
  const humanId = snapshot.config.humanCivId;
  const civilization = snapshot.civilizations.find((row) => row?.id === humanId) ?? snapshot.civilizations[0];
  return {
    slotId,
    kind,
    label,
    savedAt,
    round: Number.isInteger(snapshot.turn.round) ? snapshot.turn.round : null,
    civName: typeof civilization?.name === 'string' ? civilization.name : '',
  };
}

export class CivilizationSaveStore {
  constructor({ indexedDB = globalThis.indexedDB, databaseName = 'ai-games-chronicle-kingdoms' } = {}) {
    this.indexedDB = indexedDB;
    this.databaseName = databaseName;
    this.database = null;
    this.openPromise = null;
    this.autoSequence = 0;
    this.lastSavedAt = 0;
  }

  open() {
    if (this.database) return Promise.resolve(this.database);
    if (this.openPromise) return this.openPromise;
    if (!this.indexedDB?.open) return Promise.reject(new Error('IndexedDB is unavailable; Chronicle Kingdoms saves cannot be persisted.'));
    this.openPromise = new Promise((resolve, reject) => {
      let request;
      try {
        request = this.indexedDB.open(this.databaseName, 1);
      } catch (error) {
        reject(new Error(`Unable to open Chronicle Kingdoms saves: ${error.message}`));
        return;
      }
      request.onupgradeneeded = () => {
        const database = request.result;
        let store;
        if (!database.objectStoreNames.contains(STORE_NAME)) store = database.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
        else store = request.transaction.objectStore(STORE_NAME);
        if (!store.indexNames.contains('kindSavedAt')) store.createIndex('kindSavedAt', ['kind', 'savedAt']);
      };
      request.onsuccess = () => { this.database = request.result; resolve(this.database); };
      request.onerror = () => reject(new Error(`Unable to open Chronicle Kingdoms saves: ${request.error?.message ?? 'unknown IndexedDB error'}`));
      request.onblocked = () => reject(new Error('Chronicle Kingdoms saves are blocked by another open database connection.'));
    }).catch((error) => { this.openPromise = null; throw error; });
    return this.openPromise;
  }

  async write({ slotId, kind = 'auto', label, snapshot } = {}) {
    if (kind !== 'auto' && kind !== 'manual') throw new TypeError('Save kind must be auto or manual.');
    const cloned = cloneSnapshot(snapshot);
    const normalizedSlotId = kind === 'auto' ? this.nextAutoSlotId() : this.manualSlotId(slotId);
    const savedAt = Math.max(Date.now(), this.lastSavedAt + 1);
    this.lastSavedAt = savedAt;
    const record = { ...saveMetadata(cloned, normalizedSlotId, kind, normalizeLabel(label, kind), savedAt), snapshot: cloned };
    const database = await this.open();
    let transaction;
    try {
      transaction = database.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(record);
      if (kind === 'auto') {
        const autos = store.getAll();
        autos.onsuccess = () => {
          const obsolete = autos.result.filter((row) => row.kind === 'auto').sort((a, b) => b.savedAt - a.savedAt || b.slotId.localeCompare(a.slotId)).slice(3);
          obsolete.forEach((row) => store.delete(row.slotId));
        };
        autos.onerror = () => { try { transaction.abort(); } catch { /* indexedDB reports the original error */ } };
      }
    } catch (error) {
      try { transaction?.abort(); } catch { /* nothing to abort */ }
      throw new Error(`Unable to write Chronicle Kingdoms save: ${error.message}`);
    }
    await transactionResult(transaction);
    return { ...record, snapshot: cloneSnapshot(record.snapshot) };
  }

  async read(slotId) {
    const id = this.requiredSlotId(slotId);
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    const [record] = await Promise.all([requestResult(request), transactionResult(transaction)]);
    return record ? cloneSnapshot(record.snapshot) : null;
  }

  async list() {
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).getAll();
    const [records] = await Promise.all([requestResult(request), transactionResult(transaction)]);
    return records.map(({ slotId, kind, label, savedAt, round, civName }) => ({ slotId, kind, label, savedAt, round, civName })).sort((a, b) => b.savedAt - a.savedAt || b.slotId.localeCompare(a.slotId));
  }

  async remove(slotId) {
    const id = this.requiredSlotId(slotId);
    const database = await this.open();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).delete(id);
    await transactionResult(transaction);
  }

  async exportJson(slotId) {
    const snapshot = await this.read(slotId);
    if (!snapshot) return null;
    return stringifySnapshot(snapshot);
  }

  importJson(text) {
    return parseSnapshotJson(text);
  }

  close() {
    this.database?.close();
    this.database = null;
    this.openPromise = null;
  }

  nextAutoSlotId() {
    this.autoSequence += 1;
    const salt = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
    return `auto-${Date.now()}-${this.autoSequence}-${salt}`;
  }

  manualSlotId(slotId) {
    const id = typeof slotId === 'string' ? slotId.trim() : '';
    if (!id) return `manual-${Date.now()}-${++this.autoSequence}`;
    return id;
  }

  requiredSlotId(slotId) {
    const id = typeof slotId === 'string' ? slotId.trim() : '';
    if (!id) throw new TypeError('A save slot ID is required.');
    return id;
  }
}
