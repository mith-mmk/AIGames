export const TABLE = Object.freeze({
  width: 5.5,
  length: 11.5,
  ballRadius: 0.135,
  tilt: (6.5 * Math.PI) / 180,
});
export const BUMPERS = Object.freeze([
  { x: -1.02, z: -2.65 },
  { x: 0.12, z: -3.27 },
  { x: 0.95, z: -2.15 },
]);
export const RAMP = Object.freeze([
  [-1.7, 0.08, 0.7],
  [-1.85, 0.35, -0.6],
  [-2.0, 0.8, -2.35],
  [-1.48, 1.12, -3.85],
  [0, 1.25, -4.5],
  [1.58, 1.05, -3.65],
  [1.8, 0.75, -1.65],
  [1.95, 0.28, 1.05],
  [1.76, 0.08, 2.2],
]);
export class TablePreviewState {
  constructor() {
    this.init();
  }
  init() {
    this.left = false;
    this.right = false;
    this.tour = false;
    this.progress = 0;
    this.view = "play";
  }
  update(dt) {
    if (this.tour)
      this.progress =
        (this.progress + Math.min(Math.max(dt, 0), 0.05) * 0.15) % 1;
  }
  setFlipper(side, value) {
    if (side === "left" || side === "right") this[side] = Boolean(value);
  }
  release() {
    this.left = false;
    this.right = false;
  }
}

export function flipperAngle(mirror, active) {
  const angle = active ? 0.48 : -0.35;
  return mirror ? Math.PI - angle : angle;
}
