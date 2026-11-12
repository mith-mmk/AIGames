export const TABLE = Object.freeze({
  width: 5.5,
  length: 11.5,
  ballRadius: 0.135,
  tilt: (6.5 * Math.PI) / 180,
});
// Offset the forward bumper to leave a ball-width central shot corridor.
export const BUMPERS = Object.freeze([
  { x: -1.15, z: -3.5 }, { x: 1.15, z: -3.5 }, { x: -1.5, z: -2.25 },
]);
// The reference has asymmetric target banks, not four central barriers.
// Endpoints are shared by the visible rubber and physical collision face.
export const TARGET_BANKS = Object.freeze([
  { key: "left-upper", a: [-1.95,.22,-.95], b: [-.85,.22,-1.15], count: 4, type: "bank" },
  { key: "left-side", a: [-1.98,.22,-.15], b: [-1.83,.22,1.0], count: 3, type: "target" },
  { key: "right-side", a: [.90,.22,-2.10], b: [1.20,.22,-1.40], count: 3, type: "bank" },
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
  // Keep the cradle entrance, then wrap the cheek around the paddle heel.
  // Its lower face overlaps the root boundary, leaving no ball-sized side leak.
  guide: [
    [1.94,.22,1.65], [1.90,.22,2.60], [1.65,.22,3.10], [1.15,.22,3.40],
    [1.35,.22,3.60], [1.25,.22,3.90], [1.25,.22,4.30],
  ],
  guideRadius: .04,
  guideEntry: { left: [2.73, .22, .8], right: [2.30, .22, .8] },
  slingVertices: [[1.25, 1.85], [1.40, 2.55], [1.05, 2.75]],
  slingCenter: [1.23, 2.30],
  flipperPivot: [1.20, .27, 3.90],
  flipperCenter: .49, flipperHalfLength: .55, flipperHalfWidth: .14,
  centerSaveZ: [4.50, 4.63],
});

// Solid backing closes the inaccessible pocket behind the shooter bend.
export const SHOOTER_BACKING = Object.freeze([[2.73,-4.15],[2.40,-5.20],[1.25,-5.55],[1.25,-5.73],[2.73,-5.73]]);
