const STEPS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const REFLECTIONS = [[3, 2, 1, 0], [1, 0, 3, 2]];
const key = ({ x, y }) => `${x},${y}`;
export const initialOrientations = level => level.mirrors.map(m => m.orientation);
export function validateLevel(level) {
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height) || level.width < 2 || level.height < 2) throw new Error('Invalid board size');
  const occupied = new Set(), ids = new Set();
  for (const item of [level.source, level.goal, ...level.mirrors, ...level.walls, ...level.checkpoints]) {
    if (!Number.isInteger(item.x) || !Number.isInteger(item.y) || item.x < 0 || item.y < 0 || item.x >= level.width || item.y >= level.height || occupied.has(key(item))) throw new Error('Invalid or overlapping cell');
    occupied.add(key(item));
  }
  if (!Number.isInteger(level.source.direction) || level.source.direction < 0 || level.source.direction > 3) throw new Error('Invalid source direction');
  for (const m of level.mirrors) {
    if (!m.id || ids.has(m.id) || ![0, 1].includes(m.orientation)) throw new Error('Invalid mirror');
    ids.add(m.id);
  }
  if (level.mirrors.filter(m => !m.fixed).length > 12) throw new Error('Solver supports at most 12 rotating mirrors');
}

/** Pure discrete optics. A state is (cell, incoming direction), never just a cell. */
export function traceLight(level, orientations = initialOrientations(level)) {
  if (orientations.length !== level.mirrors.length || orientations.some((v, i) => ![0, 1].includes(v) || (level.mirrors[i].fixed && v !== level.mirrors[i].orientation))) throw new Error('Invalid orientations');
  const mirrors = new Map(level.mirrors.map((m, i) => [key(m), i]));
  const walls = new Set(level.walls.map(key)), checkpoints = new Map(level.checkpoints.map((c, i) => [key(c), i]));
  const visited = new Set(), lit = new Set(), points = [], mirrorOrder = [];
  let { x, y, direction } = level.source, bends = 0;
  const end = status => ({ status, won: status === 'won', points, lit: [...lit].sort((a, b) => a - b), mirrorOrder, bends, states: visited.size });
  while (true) {
    points.push({ x, y, direction });
    if (x < 0 || y < 0 || x >= level.width || y >= level.height) return end('escaped');
    const state = `${x},${y},${direction}`;
    if (visited.has(state)) return end('loop');
    visited.add(state);
    const cell = key({ x, y });
    if (walls.has(cell)) return end('blocked');
    if (checkpoints.has(cell)) lit.add(checkpoints.get(cell));
    if (cell === key(level.goal)) return end(lit.size === level.checkpoints.length ? 'won' : 'incomplete');
    if (mirrors.has(cell)) {
      const index = mirrors.get(cell);
      direction = REFLECTIONS[orientations[index]][direction];
      mirrorOrder.push(level.mirrors[index].id); bends++;
    }
    x += STEPS[direction][0]; y += STEPS[direction][1];
  }
}

/** Enumeration is complete. Binary independent rotations make Hamming distance exact. */
export function solveLevel(level, from = initialOrientations(level)) {
  validateLevel(level);
  traceLight(level, from); // validate the caller's state too
  const rotating = level.mirrors.map((m, i) => m.fixed ? -1 : i).filter(i => i >= 0);
  const solutions = [], routes = new Set();
  let minimum = Infinity, best = null, optimalConfigurations = 0;
  for (let mask = 0; mask < 2 ** rotating.length; mask++) {
    const orientations = initialOrientations(level);
    rotating.forEach((i, bit) => { orientations[i] = (mask >> bit) & 1; });
    const trace = traceLight(level, orientations);
    if (!trace.won) continue;
    const actions = rotating.filter(i => from[i] !== orientations[i]);
    const solution = { orientations, actions, bends: trace.bends, mirrorOrder: trace.mirrorOrder };
    solutions.push(solution);
    routes.add(trace.points.map(p => `${p.x},${p.y},${p.direction}`).join(';'));
    if (actions.length < minimum) { minimum = actions.length; best = solution; optimalConfigurations = 1; }
    else if (actions.length === minimum) optimalConfigurations++;
  }
  return { solutions, minimum, best, optimalConfigurations, distinctRoutes: routes.size, configurations: 2 ** rotating.length };
}

export class MirrorSession {
  constructor(level) { this.init(level); }
  init(level) {
    validateLevel(level); this.level = level; this.orientations = initialOrientations(level); this.history = []; this.hintStep = 0;
  }
  get moves() { return this.history.length; }
  get trace() { return traceLight(this.level, this.orientations); }
  rotate(index) {
    if (!Number.isInteger(index) || !this.level.mirrors[index] || this.level.mirrors[index].fixed || this.trace.won) return false;
    this.history.push([...this.orientations]); this.orientations[index] ^= 1; this.hintStep = 0; return true;
  }
  undo() {
    if (!this.history.length) return false;
    this.orientations = this.history.pop(); this.hintStep = 0; return true;
  }
  reset() { this.init(this.level); }
  hint() {
    if (this.trace.won) return { text: '光がゴールに届いています。次の庭へ進めます。', index: null };
    this.hintStep = Math.min(this.hintStep + 1, 3);
    if (this.hintStep === 1) return { text: `ヒント 1/3：${this.level.hint}`, index: null };
    const solution = solveLevel(this.level, this.orientations).best;
    if (!solution) return { text: 'この配置の解が見つかりません。リセットしてください。', index: null };
    const index = solution.actions[0], m = this.level.mirrors[index];
    return { text: this.hintStep === 2 ? `ヒント 2/3：鏡 ${m.id} の向きに注目しましょう。` : `ヒント 3/3：鏡 ${m.id} を ${solution.orientations[index] === 0 ? '/' : '\\'} に変えましょう。`, index };
  }
}
