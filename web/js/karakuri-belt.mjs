import { MECHANISM as G } from './karakuri-contact.mjs';

const corridor = .27;
function pointDistance(p, a, b) {
  const length2 = (b.x - a.x) ** 2 + (b.z - a.z) ** 2;
  const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.z - a.z) * (b.z - a.z)) / length2)) : 0;
  return Math.hypot(p.x - a.x - t * (b.x - a.x), p.z - a.z - t * (b.z - a.z));
}
function intersectsBox(a, b, box) {
  // Segment against a conservatively expanded horizontal footprint.
  let low = 0, high = 1;
  for (const key of ['x', 'z']) {
    const delta = b[key] - a[key], min = box[key] - box[key === 'x' ? 'halfX' : 'halfZ'] - corridor, max = box[key] + box[key === 'x' ? 'halfX' : 'halfZ'] + corridor;
    if (Math.abs(delta) < 1e-9) { if (a[key] < min || a[key] > max) return false; }
    else { const t1 = (min - a[key]) / delta, t2 = (max - a[key]) / delta; low = Math.max(low, Math.min(t1, t2)); high = Math.min(high, Math.max(t1, t2)); if (low > high) return false; }
  }
  return true;
}

export function beltPorts(parts) {
  return [...parts.filter(p => p.radius && p.enabled !== false).map(p => ({ id: p.id, label: p.id === 'large' ? '出力歯車' : p.name, x: p.x, z: p.z })), { id: 'lift', label: 'リフト', x: 1.6, z: 0 }];
}

export function beltPair(ports, aId, bId, obstacles = []) {
  const a = ports.find(p => p.id === aId), b = ports.find(p => p.id === bId);
  const result = { valid: false, ids: [aId, bId].sort(), a, b, pose: null, reason: '' };
  if (!a || !b) { result.reason = '接続できる印のある軸を選ぼう。'; return result; }
  if (aId === bId) { result.reason = '別の軸をもう一つ選ぼう。'; return result; }
  const left = a.x < b.x || (a.x === b.x && a.z < b.z) ? a : b, right = left === a ? b : a;
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  result.pose = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, angle: (Math.atan2(right.z - left.z, right.x - left.x) + Math.PI * 2) % (Math.PI * 2), length };
  if (!Number.isFinite(length) || length < .9 || length > 5.6) { result.reason = '軸の間隔が近すぎるか遠すぎる。'; return result; }
  if (ports.some(p => p.id !== aId && p.id !== bId && pointDistance(p, a, b) < corridor + .23)) { result.reason = '途中の別の軸と重なる。接続先を選び直そう。'; return result; }
  if (obstacles.some(o => o.radius ? pointDistance(o, a, b) < corridor + o.radius : intersectsBox(a, b, o))) { result.reason = '支柱や土台と重なる。軸を置き直してからつなごう。'; return result; }
  result.valid = true; result.reason = `${a.label} ↔ ${b.label}`; return result;
}

export function beltObstacles(parts, hasGate) {
  const rail = parts.find(p => p.id === 'rail');
  return [
    ...[-G.guideZ, G.guideZ].map(z => ({ x: G.guideX, z, radius: G.screwRadius })),
    { x: 1.12, z: -.6, halfX: .475, halfZ: .03 },
    ...[-.8, .8].map(x => ({ x: rail.x + x * Math.cos(rail.angle), z: rail.z + x * Math.sin(rail.angle), radius: .085 })),
    { x: G.bellX, z: G.bellZ, halfX: .5, halfZ: .6 },
    ...(hasGate ? [-.7, .7].map(z => ({ x: G.gateX, z, radius: .064 })) : [])
  ];
}

export function nearestBeltPair(pose, pairs, project) {
  const center = project(pose); if (!center?.visible) return null;
  const ranked = [];
  for (const pair of pairs) {
    if (!pair.pose || !project(pair.a)?.visible || !project(pair.b)?.visible) continue;
    const world = Math.hypot(pose.x - pair.pose.x, pose.z - pair.pose.z);
    const p = project(pair.pose), screen = Math.hypot(center.x - p.x, center.y - p.y);
    if (world > 1.1 || screen > 56) continue;
    ranked.push({ pair, world, score: screen + world * 16 + Math.abs(pose.length - pair.pose.length) * 2 });
  }
  ranked.sort((a, b) => a.score - b.score);
  if (ranked.length > 1 && ranked[1].score - ranked[0].score < 8 && Math.abs(ranked[1].world - ranked[0].world) < .18) return null;
  return ranked[0]?.pair || null;
}
