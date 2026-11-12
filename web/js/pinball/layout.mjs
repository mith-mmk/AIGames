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

export const UPPER_RAMP = Object.freeze([
  [-2.38, 0.09, 1.1], [-2.4, 0.55, -0.8], [-2.35, 1.9, -3.05],
  [-1.6, 2.8, -4.25], [0.15, 2.85, -4.2], [1.55, 2.7, -4.18], [2.08, 2.6, -4.2],
]);
export const SLING_VERTICES = Object.freeze([[1.35, 1.95], [1.65, 2.9], [0.96, 3.05]]);

// Shared lower playfield geometry. Coordinates are table-local, right-hand side.
export const LOWER_LAYOUT = Object.freeze({
  guide: [[1.9, .22, 1.8], [1.85, .22, 3.0], [1.0, .22, 3.15]],
  guideRadius: .04,
  guideEntry: { left: [2.73, .22, .8], right: [2.30, .22, .8] },
  slingVertices: [[1.10, 1.65], [1.40, 2.60], [.71, 2.75]],
  slingCenter: [1.10, 2.25],
  flipperPivot: [1.20, .27, 3.90],
  flipperCenter: .49, flipperHalfLength: .55, flipperHalfWidth: .14,
  centerSaveZ: [4.50, 4.63],
});
