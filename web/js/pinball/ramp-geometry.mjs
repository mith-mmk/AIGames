import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';

// Shared physical route; traversal and same-ball recapture are regression tested.
export const RAMP_WIDTH = .55;
export const RAMP_POINTS = Object.freeze([
  [1.50,.04,.35], [1.60,.08,-.05], [1.78,.28,-.65],
  [1.90,.58,-1.65], [1.95,.85,-2.6], [1.5,1.05,-3.65],
  [.25,.90,-4.20], [-1.15,.78,-4.0], [-2.10,.78,-3.05],
  [-2.30,.78,-1.7], [-2.25,.78,.1], [-2.0,.75,1.6], [-.90,.55,2.5], [-.90,.49,2.8], [-.90,.45,3.00],
]);
export function sampleRamp(count=240) {
  const curve=new T.CatmullRomCurve3(RAMP_POINTS.map(p=>new T.Vector3(...p)),false,'centripetal');
  return Array.from({length:count+1},(_,i)=>{
    const p=curve.getPoint(i/count), t=curve.getTangent(i/count);
    const n=new T.Vector3(-t.z,0,t.x).normalize();
    const narrowing=p.x<0?Math.max(0,Math.min(1,(p.z-1.8)/.7)):0;
    const width=RAMP_WIDTH-.23*narrowing*narrowing*(3-2*narrowing);
    return {p,t,left:p.clone().addScaledVector(n,-width/2),right:p.clone().addScaledVector(n,width/2)};
  });
}
function surface(rows, kind) {
  const positions=[], indices=[];
  for(const row of rows) {
    let a,b;
    if(kind==='deck') {a=row.left.clone();b=row.right.clone();}
    else {a=row[kind].clone();b=a.clone();b.y+=.55;}
    positions.push(...a.toArray(),...b.toArray());
  }
  for(let i=0;i<rows.length-1;i++){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
  return {positions:new Float32Array(positions),indices:new Uint32Array(indices)};
}
function skirt(rows,side) {
  const positions=[],indices=[];
  for(let i=0;i<rows.length-1;i++) {
    // Block low underside access. Above this threshold the free gap is >= .37.
    if(rows[i].p.x<0||Math.min(rows[i].p.y,rows[i+1].p.y)>=.46)continue;
    const a=rows[i][side],b=rows[i+1][side],k=positions.length/3;
    positions.push(a.x,.04,a.z,a.x,a.y,a.z,b.x,.04,b.z,b.x,b.y,b.z);
    indices.push(k,k+1,k+2,k+1,k+3,k+2);
  }
  return {positions:new Float32Array(positions),indices:new Uint32Array(indices)};
}
function geometry(data) {const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(data.positions,3));g.setIndex(new T.BufferAttribute(data.indices,1));g.computeVertexNormals();return g;}
export function buildPhysicalRamp(game) {
  const rows=sampleRamp(), colliders=[];
  for(const kind of ['deck','left','right']) {
    const data=surface(rows,kind);
    colliders.push(game.world.createCollider(R.ColliderDesc.trimesh(data.positions,data.indices).setFriction(.025).setRestitution(.02)));
  }
  // Fill every low strip down to the playfield. Side-only skirts allow a
  // ground ball entering at the elevated end to roll into a shrinking gap.
  for(let i=0;i<rows.length-1;i++) {
    if(rows[i].p.x<0||Math.min(rows[i].p.y,rows[i+1].p.y)>=.46)continue;
    const vertices=[];
    for(const row of [rows[i],rows[i+1]])for(const side of ['left','right']) {
      const p=row[side];vertices.push(p.x,p.y,p.z,p.x,.035,p.z);
    }
    // The outside sliver is narrower than a ball: merge it into the base,
    // rather than leaving a dead-end between the skirt and shooter divider.
    for(const row of [rows[i],rows[i+1]])vertices.push(2.35,row.p.y,row.p.z,2.35,.035,row.p.z);
    const desc=R.ColliderDesc.convexHull(new Float32Array(vertices));
    if(desc)colliders.push(game.world.createCollider(desc.setFriction(.025).setRestitution(.02)));
  }
  // A chamfered nose closes the base upstream without a perpendicular
  // dead-end against the shooter divider. Its low prism remains below the ramp.
  const nose=[];
  for(const [x,z] of [[1.55,-1.25],[2.35,-1.25],[2.35,-2.35]])for(const y of [.035,.40])nose.push(x,y,z);
  colliders.push(game.world.createCollider(R.ColliderDesc.convexHull(new Float32Array(nose)).setFriction(.02).setRestitution(.1)));
  return {colliders,rows,dispose(){for(const c of colliders)game.world.removeCollider(c,true);}};
}
export function buildVisualRamp(assets) {
  const rows=sampleRamp(),root=new T.Group();root.name='physical-s-ramp';assets.root.add(root);
  const deck=new T.MeshStandardMaterial({color:0x467587,metalness:.18,roughness:.34,transparent:true,opacity:.28,depthWrite:false,side:T.DoubleSide});
  const wall=new T.MeshStandardMaterial({color:0x86bbce,metalness:.15,roughness:.25,transparent:true,opacity:.12,depthWrite:false,side:T.DoubleSide});
  for(const kind of ['deck','left','right'])assets.mesh(geometry(surface(rows,kind)),kind==='deck'?deck:wall,root);
  // Open wire return appearance, with a nearly invisible shared collision floor.
  for(let i=0;i<rows.length;i+=16)for(const side of ['left','right']) {
    const r=rows[i];assets.tube(root,[[r[side].x,r[side].y,r[side].z],[r[side].x,r[side].y+.55,r[side].z]],.012,'chrome');
  }
  const noseTop={positions:new Float32Array([1.55,.40,-1.25,2.35,.40,-1.25,2.35,.40,-2.35,1.55,.035,-1.25,2.35,.035,-1.25,2.35,.035,-2.35]),indices:new Uint32Array([0,2,1,0,1,3,1,4,3,1,2,4,2,5,4,2,0,5,0,3,5])};
  assets.mesh(geometry(noseTop),assets.materials.dark,root);
  const baseRows=rows.filter(r=>r.p.x>0&&r.p.y<.46);
  const basePositions=[],baseIndices=[];
  for(const r of baseRows)basePositions.push(r.right.x,r.right.y,r.right.z,2.35,r.p.y,r.p.z);
  for(let i=0;i<baseRows.length-1;i++){const k=i*2;baseIndices.push(k,k+1,k+2,k+1,k+3,k+2);}
  assets.mesh(geometry({positions:new Float32Array(basePositions),indices:new Uint32Array(baseIndices)}),assets.materials.dark,root);
  for(const side of ['left','right']) {
    assets.mesh(geometry(skirt(rows,side)),assets.materials.dark.clone(),root).material.side=T.DoubleSide;
    assets.tube(root,rows.filter((_,i)=>i%4===0).map(r=>[r[side].x,r[side].y+.55,r[side].z]),.022,'chrome');
  }
  return root;
}
