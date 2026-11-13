export const TABLE = Object.freeze({
  width: 5.5,
  length: 11.5,
  ballRadius: 0.135,
  tilt: (6.5 * Math.PI) / 180,
});
// Reference triangle: a rear pair and a centered forward bumper.
// The bumper area is reached through the two side openings, not a guaranteed
// unobstructed straight shot through the middle.
export const BUMPERS = Object.freeze([
  { x: -.78, z: -3.15 }, { x: .78, z: -3.15 }, { x: 0, z: -2.15 },
]);
// The reference has asymmetric target banks, not four central barriers.
// Endpoints are shared by the visible rubber and physical collision face.
// Legacy export retained; the supplied reference uses standups, not mini pops.
export const MINI_BUMPERS = Object.freeze([]);
export const TARGET_BANKS = Object.freeze([
  { key: "left-upper", a: [-1.85,.22,-1.95], b: [-.72,.22,-2.10], count: 3, type: "bank", glyph:"wrench", color:"yellow", height:.50, depth:.085 },
  { key: "left-middle", faceAngle:Math.PI/4, width:.32, a: [-1.65,.22,.80], b: [-1.87,.22,-.40], count: 2, type: "bank", glyph:"wrench", color:"yellow", height:.50, depth:.085 },
  { key: "right-side", a: [.55,.22,-.70], b: [1.20,.22,-.05], count: 3, type: "bank", glyph:"robot", color:"red", height:.50, depth:.085 },
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
  const angle = active ? 0.48 : -0.60;
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
    [1.96,.22,1.65], [1.96,.22,2.60], [1.65,.22,3.10], [.835,.22,3.40],
    // Straight heel-side guide avoids a concave pocket against the rounded bat.
    [.935,.22,3.60], [.935,.22,3.90], [.935,.22,4.30],
  ],
  guideRadius: .020,
  guideEntry: { left: [1.96, .22, 1.35], right: [1.96, .22, 1.35] },
  // Two distinct passages: IN between sling/inner return and divider;
  // OUT between divider and outer wall, ending at the apron drain.
  inlaneInner: [[1.49,.22,2.45],[1.25,.22,2.65],[1.04,.22,2.80]],
  outlaneOuter: [[2.33,.22,1.35],[2.33,.22,3.35],[2.05,.22,4.48]],
  inlaneSensor: [1.50,.20,2.95],
  laneInserts: {in: [1.38,2.97,-.25,.20,.44], out: [1.98,3.44,0,.22,.64]},
  slingVertices: [[1.44, 1.70], [1.49, 2.45], [.84, 2.65]],
  slingCenter: [1.26, 2.27],
  flipperPivot: [.90, .27, 3.90],
  flipperCenter: .42, flipperHalfLength: .48, flipperHalfWidth: .14,
  centerSaveZ: [4.50, 4.63],
});

// One source for installed rails and contact capsules; returns fresh arrays.
export function lowerLanePaths(side) {
  const entry=LOWER_LAYOUT.guideEntry[side<0?'left':'right'];
  // Small manufactured bends replace abrupt capsule junctions. Both render
  // and contact rails consume these exact sampled points.
  const bend=path=>{
    const out=[path[0]];
    for(let i=1;i<path.length-1;i++) {
      const a=path[i-1],p=path[i],b=path[i+1];
      const la=Math.hypot(...a.map((v,k)=>v-p[k])),lb=Math.hypot(...b.map((v,k)=>v-p[k]));
      const trim=Math.min(.08,la*.25,lb*.25);
      const u=p.map((v,k)=>v+(a[k]-v)*trim/la),w=p.map((v,k)=>v+(b[k]-v)*trim/lb);
      out.push(u);
      for(let j=1;j<=6;j++){const t=j/6;out.push(p.map((v,k)=>(1-t)**2*u[k]+2*(1-t)*t*v+t*t*w[k]));}
    }
    out.push(path.at(-1));return out;
  };
  return [[entry,...LOWER_LAYOUT.guide],LOWER_LAYOUT.inlaneInner,LOWER_LAYOUT.outlaneOuter]
    .map(bend).map(path=>path.map(([x,y,z])=>[side*x,y,z]));
}

// Supports stay at design stations, independent of curve tessellation.
export function lowerLaneMounts(side) {
  const entry=LOWER_LAYOUT.guideEntry[side<0?'left':'right'];
  const points=[entry,...LOWER_LAYOUT.guide,...LOWER_LAYOUT.inlaneInner,...LOWER_LAYOUT.outlaneOuter];
  return points.filter((p,i)=>points.findIndex(q=>q.every((v,k)=>v===p[k]))===i)
    .map(([x,y,z])=>[side*x,y,z]);
}

// Solid backing closes the inaccessible pocket behind the shooter bend.
export const SHOOTER_BACKING = Object.freeze([[2.73,-4.15],[2.40,-5.20],[1.25,-5.55],[1.25,-5.73],[2.73,-5.73]]);
