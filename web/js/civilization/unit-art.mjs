import { UNITS } from './data.mjs';
import { UNIT_ART_BOUNDS } from './unit-art-bounds.mjs';

const dimensions = {
  horseman: [58, 96], knight: [60, 108], tank: [64, 64],
  catapult: [58, 90], cannon: [56, 70], artillery: [64, 80],
  galley: [64, 96], caravel: [60, 96], transport: [64, 96],
  frigate: [64, 96], ironclad: [64, 96], battleship: [64, 96],
};

/** Art is presentation metadata, deliberately separate from rules and save data. */
export const UNIT_ART = Object.freeze(Object.fromEntries(Object.keys(UNITS).map(id => {
  const [width, height] = dimensions[id] || [42, 48];
  return [id, Object.freeze({
    url: new URL(`../../assets/civilization/units/${id}.png`, import.meta.url).href,
    width, height, anchorX: 0.5, anchorY: 0.96, bounds: UNIT_ART_BOUNDS[id],
  })];
})));

export const isMilitaryUnit = unit => (UNITS[unit.typeId]?.attack || 0) > 0;
export const CITY_ART = Object.freeze({
  url: new URL('../../assets/civilization/city.png', import.meta.url).href,
  bounds: [94, 196, 1068, 802], width: 78,
});
export function representativeUnit(units, selectedId = null) {
  const available = units.filter(unit => !unit.transportedByUnitId);
  return available.find(unit => unit.id === selectedId)
    || available.find(isMilitaryUnit) || available[0] || null;
}

export function nextStackUnit(units, selectedId = null) {
  const available = units.filter(unit => !unit.transportedByUnitId);
  const index = available.findIndex(unit => unit.id === selectedId);
  return index < 0 ? representativeUnit(available) : available[(index + 1) % available.length] || null;
}

export function unitStateLabel(unit) {
  if (unit.transportedByUnitId) return '積載中';
  if (unit.stance === 'sleeping') return '休眠';
  if (unit.stance === 'fortified') return '防御';
  if (unit.order?.kind === 'improve' || unit.order?.type === 'improve') return '工事中';
  if (unit.order) return '継続命令';
  if (unit.stance === 'waiting') return '待機';
  return unit.movementLeft <= 0 ? '行動済み' : '行動可能';
}

export const unitIsSpent = unit => unit.movementLeft <= 0
  || ['waiting', 'sleeping', 'fortified'].includes(unit.stance);

export class UnitArtStore {
  constructor(imageFactory = () => new Image()) {
    this.imageFactory = imageFactory;
    this.images = new Map();
    this.pending = null;
    this.ready = false;
  }

  async load(onProgress = () => {}) {
    if (this.ready) return this;
    if (this.pending) return this.pending;
    this.pending = this.loadMissing(onProgress);
    try { return await this.pending; }
    finally { this.pending = null; }
  }

  async loadMissing(onProgress) {
    let loaded = this.images.size;
    const results = await Promise.allSettled(Object.entries(UNIT_ART).map(async ([id, art]) => {
      if (this.images.has(id)) return;
      const image = this.imageFactory();
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('timeout')), 15000);
        const finish = error => {
          clearTimeout(timer); image.onload = null; image.onerror = null;
          if (error) reject(new Error(`${UNITS[id].label} (${id}.png)`)); else resolve();
        };
        image.onload = () => finish();
        image.onerror = () => finish(new Error('load'));
        image.src = art.url;
      });
      this.images.set(id, image);
      onProgress(++loaded, Object.keys(UNIT_ART).length);
    }));
    const failures = results.filter(result => result.status === 'rejected').map(result => result.reason.message);
    if (failures.length) throw new Error(`素材を読み込めません: ${failures.join('、')}`);
    this.ready = true;
    return this;
  }

  get(id) { return this.images.get(id); }

  async loadCity() {
    if (this.images.has('city')) return;
    const image = this.imageFactory();
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('都市素材の読込がタイムアウトしました')), 15000);
      const finish = error => {
        clearTimeout(timer); image.onload = null; image.onerror = null;
        if (error) reject(error); else resolve();
      };
      image.onload = () => finish();
      image.onerror = () => finish(new Error('都市素材 (city.png) を読み込めません'));
      image.src = CITY_ART.url;
    });
    this.images.set('city', image);
  }
}
