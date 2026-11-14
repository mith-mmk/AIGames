import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';

// Shared physical route; traversal and same-ball recapture are regression tested.
export const RAMP_WIDTH = 0.68;
export const RAMP_WALL_HEIGHT = 0.45;
// Upper-center handoff: the leftward rear sweep is actual open wire, not acrylic.
export const WIRE_START_FRACTION = 124/240;
export const WIRE_FUNNEL_FRACTION = 24/240;
export const WIRE_RADIUS = .018;
export const WIRE_HALF_SPACING = .09;
export const WIRE_GUARD_SPACING = .175;
export const WIRE_GUARD_HEIGHT = .16;
export const WIRE_HEIGHT_OFFSET = .135-Math.sqrt((.135+WIRE_RADIUS)**2-WIRE_HALF_SPACING**2);
export function rampWireRails(rows) {
  return [-1,1].flatMap(sign=>[false,true].map(guard=>rows.map(r=>{
    const n=r.right.clone().sub(r.left).normalize();
    return r.p.clone().addScaledVector(n,sign*(guard?WIRE_GUARD_SPACING:WIRE_HALF_SPACING)).add(new T.Vector3(0,WIRE_HEIGHT_OFFSET+(guard?WIRE_GUARD_HEIGHT:0),0));
  })));
}
export const RAMP_POINTS = Object.freeze([
  [1.5, 0.04, 1.1],
  [1.9, 0.24, 0.25],
  [1.85, 0.5, -0.6333],
  [1.55, 0.73, -1.4],
  [1.30, 0.87, -2.1666666666666665],
  [1.65, 0.86, -2.933333333333333],
  [1.80, 0.78, -3.7],
  [1.2, 0.6, -4.45],
  [0, 0.56, -4.65],
  [-1.4, 0.48, -4.05],
  [-2.35, 0.47, -2.7],
  [-2.45, 0.46, -1],
  [-2.40, 0.45, 1.3],
  [-2.30, 0.44, 2.45],
  [-1.90, 0.44, 2.95],
  [-1.55, 0.44, 3.15],
]);
export function sampleRamp(count=240) {
  const curve=new T.CatmullRomCurve3(RAMP_POINTS.map(p=>new T.Vector3(...p)),false,'centripetal');
  return Array.from({length:count+1},(_,i)=>{
    const p=curve.getPoint(i/count), t=curve.getTangent(i/count);
    const n=new T.Vector3(-t.z,0,t.x).normalize();
    const narrowing=p.x<0?Math.max(0,Math.min(1,(p.z-1.8)/.7)):0;
    const funnel=Math.max(0,Math.min(1,(i/count-(WIRE_START_FRACTION-WIRE_FUNNEL_FRACTION))/WIRE_FUNNEL_FRACTION));
    const width=RAMP_WIDTH-.36*Math.max(narrowing*narrowing*(3-2*narrowing),funnel*funnel*(3-2*funnel));
    return {p,t,left:p.clone().addScaledVector(n,-width/2),right:p.clone().addScaledVector(n,width/2)};
  });
}
// Sensors follow the actual route, including its direction at each crossing.
export function rampSensorGates(rows=sampleRamp()) {
  const rear=rows.reduce((best,r,i)=>r.p.z<rows[best].p.z?i:best,0);
  return [Math.round((rows.length-1)*.10),rear,rows.length-1].map((i,index)=>{
    const row=rows[i], direction=row.t.clone(); direction.y=0; direction.normalize();
    const halfHeight=index===2?.20:(RAMP_WALL_HEIGHT+.22)/2;
    const position=row.p.clone().add(new T.Vector3(0,index===2?.14:halfHeight+.04,0));
    if(index===2)position.addScaledVector(direction,.28);
    return {position,direction,halfWidth:row.left.distanceTo(row.right)/2+.035,halfHeight,halfDepth:.10};
  });
}
function surface(rows, kind) {
  const positions=[], indices=[];
  for(const row of rows) {
    let a,b;
    if(kind==='deck') {a=row.left.clone();b=row.right.clone();}
    else {a=row[kind].clone();b=a.clone();b.y+=RAMP_WALL_HEIGHT;}
    positions.push(...a.toArray(),...b.toArray());
  }
  for(let i=0;i<rows.length-1;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  // The two channel walls face opposite directions. Edge correction needs
  // both normals to face into the ball channel, not identical winding.
  if(kind!=='deck')for(let i=0;i<indices.length;i+=3){
    const row=Math.floor(i/6),at=index=>new T.Vector3(...positions.slice(index*3,index*3+3));
    const a=at(indices[i]),b=at(indices[i+1]),c=at(indices[i+2]);
    const normal=b.clone().sub(a).cross(c.clone().sub(a));
    const inward=rows[row].p.clone().add(rows[row+1].p).multiplyScalar(.5).sub(a.clone().add(b).add(c).multiplyScalar(1/3));
    inward.y=0;
    if(normal.dot(inward)<0)[indices[i+1],indices[i+2]]=[indices[i+2],indices[i+1]];
  }
  return {positions:new Float32Array(positions),indices:new Uint32Array(indices)};
}
// Select complete strips, including the first endpoint above the low threshold.
// Render and collision must terminate at the same section of the ramp.
export function lowRampSegments(rows=sampleRamp()) {
  const segments=[];
  for(let i=0;i<rows.length-1;i++)if(rows[i].p.x>=0&&Math.min(rows[i].p.y,rows[i+1].p.y)<.46)segments.push({a:rows[i],b:rows[i+1],index:i});
  return segments;
}
function skirt(rows,side) {
  const positions=[],indices=[];
  for(const segment of lowRampSegments(rows)) {
    // Block low underside access. Above this threshold the free gap is >= .37.
    const a=segment.a[side],b=segment.b[side],k=positions.length/3;
    positions.push(a.x,.04,a.z,a.x,a.y,a.z,b.x,.04,b.z,b.x,b.y,b.z);
    indices.push(k,k+1,k+2,k+1,k+3,k+2);
  }
  return {positions:new Float32Array(positions),indices:new Uint32Array(indices)};
}
function geometry(data) {const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(data.positions,3));g.setIndex(new T.BufferAttribute(data.indices,1));g.computeVertexNormals();return g;}
// Mount stations are shared by visible columns and their collision bodies.
export function rampSupportStations(rows=sampleRamp()) {
  const spanStart=rows.findIndex(r=>r.p.x<0&&r.p.z>=1.30), stations=[];
  let distance=0;
  for(let i=1;i<rows.length;i++){
    distance+=rows[i].p.distanceTo(rows[i-1].p);
    if(distance>=1.05){stations.push(i);distance=0;}
  }
  const end=rows.length-1;
  if(distance>=.8||!stations.length)stations.push(end);else stations[stations.length-1]=end;
  if(spanStart>=0){for(let i=stations.length-1;i>=0;i--)if(stations[i]>=spanStart)stations.splice(i,1);stations.push(spanStart,end);}
  return stations.filter(i=>rows[i].p.y>=.46||rows[i].p.x<0).map(i=>{
    const r=rows[i],divider=r.p.x>=-.45&&r.p.z>=-3.7;
    const x=r.p.x<-.45?-2.90:r.p.z<-3.7?r.p.x:2.35;
    const z=r.p.x>=-.45&&r.p.z<-3.7?-5.95:r.p.z;
    const drop=Math.min(.065,Math.max(.025,r.p.y-.38));
    return {i,x,z,drop,y:r.p.y-drop,divider};
  });
}
export function buildPhysicalRamp(game) {
  const rows=sampleRamp(), colliders=[];
  const wireStart=Math.round((rows.length-1)*WIRE_START_FRACTION);
  // One continuous deck removes seam ridges that trapped slow returning balls.
  // Correct the deck and left S-bend internal edges after orienting the left
  // face into the channel. Keep the right wall's established contact response:
  // correcting it too loses required natural 82/83-tick ramp shots.
  for(const kind of ['deck','left','right']) {
    for (const [start,end,flags] of [[0,wireStart,kind==='right'?undefined:R.TriMeshFlags.FIX_INTERNAL_EDGES]]) {
      const data=surface(rows.slice(start,end+1),kind);
      colliders.push(game.world.createCollider(R.ColliderDesc.trimesh(data.positions,data.indices,flags).setFriction(0.025).setRestitution(.02)));
    }
  }
  for(const rail of rampWireRails(rows.slice(wireStart)))for(let i=1;i<rail.length;i++) {
    const a=rail[i-1],b=rail[i],delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
    const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
    colliders.push(game.world.createCollider(R.ColliderDesc.capsule(delta.length()/2,WIRE_RADIUS).setTranslation(mid.x,mid.y,mid.z).setRotation(q).setFriction(.025).setRestitution(.02)));
  }
  const baseColliderStart=colliders.length;
  // Fill every low strip down to the playfield. Side-only skirts allow a
  // ground ball entering at the elevated end to roll into a shrinking gap.
  for(const {a,b} of lowRampSegments(rows)) {
    const vertices=[];
    for(const row of [a,b])for(const side of ['left','right']) {
      const p=row[side];vertices.push(p.x,p.y,p.z,p.x,.035,p.z);
    }
    // The outside sliver is narrower than a ball: merge it into the base,
    // rather than leaving a dead-end between the skirt and shooter divider.
    for(const row of [a,b])vertices.push(2.35,row.p.y,row.p.z,2.35,.035,row.p.z);
    const desc=R.ColliderDesc.convexHull(new Float32Array(vertices));
    if(desc)colliders.push(game.world.createCollider(desc.setFriction(.025).setRestitution(.02)));
  }
  // A chamfered nose closes the base upstream without a perpendicular
  // dead-end against the shooter divider. Its low prism remains below the ramp.
  const nose=[];
  for(const [x,z] of [[1.55,-1.25],[2.35,-1.25],[2.35,-2.35]])for(const y of [.035,.40])nose.push(x,y,z);
  colliders.push(game.world.createCollider(R.ColliderDesc.convexHull(new Float32Array(nose)).setFriction(.02).setRestitution(.1)));
  const baseColliders=colliders.slice(baseColliderStart);
  // Right columns grow directly from the existing shooter divider footprint,
  // rather than long arms reaching beyond the cabinet. Airborne balls also
  // collide with these visible columns and horizontal support arms.
  for(const m of rampSupportStations(rows))if(m.divider){
    const top=new T.Vector3(m.x,m.y,m.z),bottom=new T.Vector3(m.x,.055,m.z),saddle=rows[m.i].p.clone().add(new T.Vector3(0,-m.drop,0));
    for(const [a,b,radius] of [[bottom,top,.037],[top,saddle,.034]]){
      const delta=b.clone().sub(a),mid=a.clone().add(b).multiplyScalar(.5);
      const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.clone().normalize());
      colliders.push(game.world.createCollider(R.ColliderDesc.cylinder(delta.length()/2,radius).setTranslation(mid.x,mid.y,mid.z).setRotation(q).setFriction(.025).setRestitution(.02)));
    }
    colliders.push(game.world.createCollider(R.ColliderDesc.cylinder(.045/2,.040).setTranslation(m.x,m.y,m.z).setFriction(.025).setRestitution(.02)));
  }
  return {colliders,baseColliders,rows,dispose(){for(const c of colliders)game.world.removeCollider(c,true);}};
}
export function buildVisualRamp(assets) {
  const rows=sampleRamp(),root=new T.Group();root.name='physical-s-ramp';assets.root.add(root);
  const split=Math.round((rows.length-1)*WIRE_START_FRACTION), sheet=rows.slice(0,split+1);
  const acrylic=new T.MeshStandardMaterial({color:0x85b2a8,metalness:.08,roughness:.22,transparent:true,opacity:.4,depthWrite:false,side:T.DoubleSide});
  for(const kind of ['deck','left','right'])assets.mesh(geometry(surface(sheet,kind)),acrylic,root);
  for(const rail of rampWireRails(rows.slice(split)))assets.tube(root,rail.map(p=>p.toArray()),WIRE_RADIUS,'chrome');
  for(const side of ['left','right'])assets.tube(root,sheet.map(r=>[r[side].x,r[side].y+RAMP_WALL_HEIGHT,r[side].z]),.022,'chrome');
  root.add(buildRampBaseVisual(rows,assets.materials.dark));
  return root;
}

// Opaque visible counterparts of the gameplay-critical low base and nose.
export function buildRampBaseVisual(rows=sampleRamp(),material) {
  const root=new T.Group(); root.name='solid-anti-trap-ramp-base';
  const add=(name,g)=>{const m=new T.Mesh(g,material);m.name=name;m.castShadow=true;m.receiveShadow=true;root.add(m);return m;};
  const noseTop={positions:new Float32Array([1.55,.40,-1.25,2.35,.40,-1.25,2.35,.40,-2.35,1.55,.035,-1.25,2.35,.035,-1.25,2.35,.035,-2.35]),indices:new Uint32Array([0,2,1,0,1,3,1,4,3,1,2,4,2,5,4,2,0,5,0,3,5])};
  add('chamfered-anti-trap-nose',geometry(noseTop));
  const segments=lowRampSegments(rows);
  const baseRows=segments.length?[segments[0].a,...segments.map(s=>s.b)]:[];
  const basePositions=[],baseIndices=[];
  for(const r of baseRows)basePositions.push(r.right.x,r.right.y,r.right.z,2.35,r.p.y,r.p.z);
  for(let i=0;i<baseRows.length-1;i++){const k=i*2;baseIndices.push(k,k+1,k+2,k+1,k+3,k+2);}
  add('divider-base-top',geometry({positions:new Float32Array(basePositions),indices:new Uint32Array(baseIndices)}));
  for(const side of ['left','right']) add(`${side}-low-base-skirt`,geometry(skirt(rows,side)));
  const outer=[], indices=[];
  for(const r of baseRows)outer.push(2.35,.035,r.p.z,2.35,r.p.y,r.p.z);
  for(let i=0;i<baseRows.length-1;i++){const k=2*i;indices.push(k,k+2,k+1,k+1,k+2,k+3);}
  add('divider-base-outer-wall',geometry({positions:new Float32Array(outer),indices:new Uint32Array(indices)}));
  // Cap the elevated end where the low solid base stops.
  const r=baseRows.at(-1);
  if(r)add('low-base-end-cap',geometry({positions:new Float32Array([r.left.x,.035,r.left.z,r.left.x,r.left.y,r.left.z,2.35,.035,r.p.z,2.35,r.p.y,r.p.z]),indices:new Uint32Array([0,2,1,1,2,3])}));
  return root;
}
