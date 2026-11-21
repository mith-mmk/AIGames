const SAVE_KEY = 'aigames-mirror-garden-v1';
export class GardenProgress {
  constructor(storage) { this.storage = storage; this.best = {}; this.available = true; this.init(); }
  init() {
    try {
      const data = JSON.parse(this.storage.getItem(SAVE_KEY) || '{}');
      for (const [id, moves] of Object.entries(data.best || {})) {
        if (/^(?:[1-9]|10)$/.test(id) && Number.isInteger(moves) && moves >= 0 && moves <= 100000) this.best[id] = moves;
      }
    } catch { this.available = false; }
  }
  record(id, moves) {
    this.best[id] = Math.min(this.best[id] ?? Infinity, moves);
    try { this.storage.setItem(SAVE_KEY, JSON.stringify({ best: this.best })); } catch { this.available = false; }
  }
}
