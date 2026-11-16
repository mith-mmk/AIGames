/** Retain transitions between rendered frames without extending a short tap.
 * Times use the browser performance clock (milliseconds). Physics remains fixed
 * step; transitions are quantized by its existing accumulator, not a new timer.
 */
export class FlipperInputTimeline {
  constructor() { this.reset(); }
  reset(input = {}) {
    this.applied = { left: Boolean(input.left), right: Boolean(input.right) };
    this.latest = { ...this.applied };
    this.events = [];
  }
  set(side, value, time) {
    if (!['left', 'right'].includes(side) || !Number.isFinite(time)) return;
    value = Boolean(value);
    if (this.latest[side] === value) return;
    this.latest[side] = value;
    const last = this.events.at(-1)?.time ?? time;
    this.events.push({ time: Math.max(time, last), input: { ...this.latest } });
  }
  consume(start, end) {
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
    const segments = [];
    let cursor = start, count = 0;
    for (const event of this.events) {
      if (event.time > end) break;
      const boundary = Math.max(start, event.time);
      if (boundary > cursor) segments.push({ dt: (boundary - cursor) / 1000, input: { ...this.applied } });
      this.applied = event.input;
      cursor = boundary;
      count++;
    }
    this.events.splice(0, count);
    if (end > cursor) segments.push({ dt: (end - cursor) / 1000, input: { ...this.applied } });
    return segments;
  }
}
