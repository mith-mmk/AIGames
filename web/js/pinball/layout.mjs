const BALL_RADIUS=.135;
// Add one complete ball diameter beside each original cabinet edge.
export const PLAYFIELD_SIDE_EXTENSION=2*BALL_RADIUS;
export const TABLE = Object.freeze({
  width: 5.5+2*PLAYFIELD_SIDE_EXTENSION,
  length: 11.9,
  // Extend only the downstream end; keep every upper mechanism at its datum.
  centerZ: .20, rearZ: -5.75, frontZ: 6.15,
  ballRadius: BALL_RADIUS,
  tilt: (6.5 * Math.PI) / 180,
});
// Reference triangle: the two rear pops and one forward center pop. The
// latter releases near-axis returns sideways rather than cycling on center.
export const BUMPERS = Object.freeze([
  { x: -.78, z: -3.15 }, { x: .78, z: -3.15 },
  { x: 0, z: -2.15, returnRelief: 3 },
]);
// The reference has asymmetric target banks, not four central barriers.
// Endpoints are shared by the visible rubber and physical collision face.
// Legacy export retained; the supplied reference uses standups, not mini pops.
export const MINI_BUMPERS = Object.freeze([]);
export const TARGET_BANKS = Object.freeze([
  { key: "left-middle", faceAngle:Math.PI/4, width:.32, carrier:false, a: [-1.15,.22,-.525], b: [-1.15,.22,-1.825], count: 3, type: "bank", glyph:"wrench", color:"yellow", height:.50, depth:.085 },
  { key: "right-side", a: [.80,.22,-1.25], b: [1.35,.22,-.70], count: 3, type: "bank", glyph:"robot", color:"red", height:.50, depth:.085 },
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

export function flipperAngle(mirror, active, difficulty = "standard") {
  // A shallower resting bat gives beginners more reach without closing the drain.
  const angle = active ? .48 : difficulty === "relaxed" ? -.45 : -.60;
  return mirror ? Math.PI - angle : angle;
}

export const UPPER_RAMP = Object.freeze([
  [-2.38, 0.09, 1.1], [-2.4, 0.55, -0.8], [-2.35, 1.9, -3.05],
  [-1.6, 2.8, -4.25], [0.15, 2.85, -4.2], [1.55, 2.7, -4.18], [2.08, 2.6, -4.2],
]);
// Historical preview study, not the installed lower contact.
export const SLING_VERTICES=Object.freeze([[1.35,1.95],[1.65,2.9],[.96,3.05]]);
// Shared lower playfield geometry. Coordinates are table-local, right-hand side.
export const LOWER_LAYOUT = Object.freeze({
  downstreamOffset: .40,
  drainZ: 5.05,
  // Keep the cradle entrance, then wrap the cheek around the paddle heel.
  // Its lower face overlaps the root boundary, leaving no ball-sized side leak.
  guide: [
    [2.04,.22,3.46], [2.02,.22,3.51], [1.85,.22,3.76], [1.185,.22,4.05],
    // Straight heel-side guide avoids a concave pocket against the rounded bat.
    [1.285,.22,4.22], [1.285,.22,4.45], [1.285,.22,4.85],
  ],
  guideRadius: .020,
  // The splitter rises out of the deck on a diagonal. A level, blunt end
  // stopped slow straight returns like a post; the tapered nose sheds them.
  guideEntry: { left: [2.10,.02,2.66], right: [2.10,.02,2.66] },
  // The passive outer rubber forms the inner edge of IN while the small
  // continuation rail guides the release downstream of the sling, not through it.
  // OUT is a separate route between the divider and the outer return guide.
  inlaneInner: [[1.40,.22,3.47],[1.32,.22,3.57],[1.22,.22,3.62]],
  outlaneOuter: [[2.33+PLAYFIELD_SIDE_EXTENSION,.22,1.35],[2.33+PLAYFIELD_SIDE_EXTENSION,.22,3.35],[2.32,.22,4.88]],
  inlaneSensor: [1.81,.20,3.19],
  // Floor ink follows the open IN approach and the actual curved return; [x,z,width].
  inlaneInkPath: [[1.81,3.13,.11],[1.75,3.42,.11],[1.57,3.70,.12],[1.32,3.84,.10]],
  laneInserts: {in: [1.80,3.08,-.10,.20,.86], out: [2.29,3.68,-.13,.23,1.55]},
  slingVertices: [[1.55,2.32],[1.54,3.33],[1.18,3.53]],
  slingCoverHeight: .33,
  slingCenter: [1.43,3.06],
  flipperPivot: [1.25, .27, 4.45],
  flipperCenter: .54, flipperHalfLength: .60, flipperHalfWidth: .14,
  centerSaveZ: [4.90, 5.03],
  centerKick: {x:0, z:4.96, halfWidth:.60, speed:8},
  outKick: {x:2.28,z:3.63,halfWidth:.16,speed:12},
});

// Mirrored three-post slings sit beside the IN inserts, above the flippers.
export function lowerSlingVertices(side) {
  return LOWER_LAYOUT.slingVertices.map(([x,z])=>[side*x,z]);
}

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
      const trim=Math.min(p[2]<3.5?.16:.08,la*.25,lb*.25);
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
  return points.filter((p,i)=>p[1]>=.08 && points.findIndex(q=>q.every((v,k)=>v===p[k]))===i)
    .map(([x,y,z])=>[side*x,y,z]);
}

// Move the shooter outward with the cabinet without enlarging the barrel.
const SHOOTER_OUTER_X=2.72+PLAYFIELD_SIDE_EXTENSION;
export const SHOOTER_ROOF=Object.freeze([
  [SHOOTER_OUTER_X,.23,-4.15],[2.40+.18,.23,-5.20],[1.25,.23,-5.55],[.95,.23,-5.3],
]);
// Solid backing closes the inaccessible pocket behind the shooter bend.
export const SHOOTER_BACKING = Object.freeze([
  [SHOOTER_OUTER_X+.01,-4.15],...SHOOTER_ROOF.slice(1,3).map(([x,,z])=>[x,z]),
  [1.25,-5.73],[SHOOTER_OUTER_X+.01,-5.73],
]);
export const SHOOTER_LAYOUT = Object.freeze({
  x:2.53+PLAYFIELD_SIDE_EXTENSION,innerX:2.35+PLAYFIELD_SIDE_EXTENSION,outerX:SHOOTER_OUTER_X,
  restZ: 4.60, ballZ: 4.425, frontZ: 5.90,
  returnMinX:2.45+PLAYFIELD_SIDE_EXTENSION,returnMaxX:2.70+PLAYFIELD_SIDE_EXTENSION,
  returnMinZ: 4.25, returnMaxZ: 4.56,
});
