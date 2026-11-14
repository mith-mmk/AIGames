import {handoffLift} from './ramp-profile.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import { MechanicalRamp, MechanicalWireform, RAMP_WIRE_DIMENSIONS } from './components/ramp-wire.mjs';
import { buildPhysicalRamp, sampleRamp, rampUndersideParts, rampNoseVertices, lowRampSegments, rampSupportStations, RAMP_WALL_HEIGHT, WIRE_START_FRACTION, WIRE_HEIGHT_OFFSET, WIRE_RADIUS, WIRE_HALF_SPACING, rampWireRails } from './ramp-geometry.mjs';

test('installed ramp has matched sheet walls, true paired rails and visible anti-trap base',()=>{
 const part=new MechanicalRamp();
 try {
  assert.equal(RAMP_WIRE_DIMENSIONS.wall,RAMP_WALL_HEIGHT);
  assert.ok(part.root.getObjectByName('chamfered-anti-trap-nose'));
  assert.ok(part.root.getObjectByName('left-low-base-skirt'));
  const wire=part.root.getObjectByName('true-paired-wire-return');
  assert.equal(wire.userData.hiddenFloor,false);
  assert.equal(wire.userData.runningRails,2);
  const floor=part.root.getObjectByName('continuous-floor-with-underside');
  assert.equal(floor.geometry.attributes.position.count,(Math.round(240*WIRE_START_FRACTION)+1)*4+124);
  assert.ok(floor.material.opacity>=.12&&floor.material.opacity<=.25,'clear acrylic should reveal the playfield while remaining visibly tinted');
  assert.equal(floor.material.transparent,true);
  assert.equal(floor.material.depthWrite,false,'overlapping clear walls must not occlude the deck');
  assert.equal(floor.material.side,T.DoubleSide,'both sides of the formed clear shell remain visible');
  const split=Math.round(240*WIRE_START_FRACTION);
  const expected=sampleRamp()[split];
  const rows=rampWireRails(sampleRamp().slice(split));
  assert.ok(Math.abs(rows[0][0].distanceTo(rows[2][0])-2*WIRE_HALF_SPACING)<1e-8);
  // The sheet now has a real drop; test the same centered sphere support
  // on the running-stock datum rather than the elevated sheet datum.
  const ball=new T.Vector3(expected.p.x,expected.p.y-handoffLift(expected.parameter).height+.135,expected.p.z);
  assert.ok(Math.abs(ball.distanceTo(rows[0][0])-(.135+WIRE_RADIUS))<1e-8);
  assert.ok(WIRE_HEIGHT_OFFSET>0);
 } finally {part.dispose();}
});

test('support columns stay on the perimeter or shooter divider, and beams clear ground balls',()=>{
 const part=new MechanicalRamp();
 try {
  part.root.updateMatrixWorld(true);
  let posts=0, beams=0;
  part.root.traverse(o=>{
   if(!o.geometry)return;
   const b=new T.Box3().setFromObject(o);
   if(/^support-post-/.test(o.name)) {
    posts++;assert.ok(b.max.x< -2.60 || b.max.z< -5.65 || (b.min.x>=2.305&&b.max.x<=2.395),`${o.name} crosses table lane`);
   }
   if(/^cantilever-crosshead-/.test(o.name)) {beams++;assert.ok(b.min.y>.31,`${o.name} blocks ground ball at ${b.min.y}`);}
   assert.ok(!o.name.startsWith('diagonal-knee-brace'));
  });
  assert.ok(posts>4);assert.equal(posts,beams);
 } finally {part.dispose();}
});

test('production return has an actual open gap, not a hidden supporting floor',async()=>{
 await R.init(); const world=new R.World({x:0,y:-9.81,z:0});
 try {
  buildPhysicalRamp({world});world.step();
  const rows=sampleRamp();
  const rayAt=i=>{const p=rows[i].p;return world.castRay(new R.Ray({x:p.x,y:p.y+.5,z:p.z},{x:0,y:-1,z:0}),.7,true);};
  const split=Math.round((rows.length-1)*WIRE_START_FRACTION);
  assert.ok(rayAt(split-4),'sheet rise must have a real deck');
  assert.equal(rayAt(Math.round((split+rows.length-1)/2)),null,'center gap between running wires must be physically open');
  assert.equal(rayAt(225),null,'wire exit must not retain a hidden deck');
 } finally {world.free();}
});

test('standalone paired rails support and roll a ball without any plane collider',async()=>{
 await R.init(); const world=new R.World({x:0,y:-9.81,z:1});world.timestep=1/120;
 const part=new MechanicalWireform({points:[[0,.8,0],[0,.8,2]]});
 try {
  const physical=part.createColliders(world);
  assert.equal(physical.colliders.length,480);
  assert.equal(physical.hiddenFloor,false);
  const height=part.root.userData.ballCenterAboveRunningWires;
  const ball=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,.8+height,.2).setCcdEnabled(true));
  world.createCollider(R.ColliderDesc.ball(.135).setFriction(.025),ball);
  for(let i=0;i<120;i++){world.step();assert.ok(Math.abs(ball.translation().x)<.03);assert.ok(Math.abs(ball.translation().y-(.8+height))<.02);}
  assert.ok(ball.translation().z>.4,'ball must physically roll along wires');
 } finally {part.dispose();world.free();}
});


test('all perimeter ramp supports have matching physical posts, arms, collars and feet',async()=>{
 await R.init();const world=new R.World({x:0,y:-9.81,z:0});
 try{
  const ramp=buildPhysicalRamp({world}),mounts=rampSupportStations(ramp.rows);
  const supports=ramp.supportColliders;
  assert.equal(supports.length,mounts.length*4);
  world.step();
  assert.ok(mounts.length>0);
  mounts.forEach((m,i)=>{
   const post=supports[i*4],arm=supports[i*4+1],collar=supports[i*4+2],foot=supports[i*4+3];
   assert.ok(Math.abs(post.translation().x-m.x)<1e-6);
   assert.ok(Math.abs(post.shape.radius-.037)<1e-6);
   assert.ok(Math.abs(post.shape.halfHeight-(m.y-.055)/2)<1e-6);
   assert.ok(Math.abs(arm.shape.radius-.034)<1e-6);
   assert.ok(Math.abs(collar.shape.radius-.040)<1e-6);
   assert.ok(Math.abs(collar.shape.halfHeight-.045/2)<1e-6);
   assert.ok(arm.translation().y-arm.shape.radius>.31);
   assert.ok(Math.abs(foot.shape.radius-(m.divider?.040:.085))<1e-6);
   assert.ok(Math.abs(foot.shape.halfHeight-.0125)<1e-6);
   assert.ok(Math.abs(foot.translation().y-.055)<1e-6);
   const p=post.translation(),hit=world.castRay(new R.Ray({x:p.x+.10,y:p.y,z:p.z},{x:-1,y:0,z:0}),.12,true);
   assert.equal(hit?.collider.handle,post.handle,'visible post blocks an airborne crossing');
  });
 }finally{world.free();}
});

test('acrylic offset walls never fold backwards along the centerline',()=>{
 for(const count of [240,24000]){
  const rows=sampleRamp(count),end=Math.round(count*WIRE_START_FRACTION);
  for(let i=0;i<end;i++){
   const d=rows[i+1].p.clone().sub(rows[i].p);d.y=0;
   assert.ok(d.lengthSq()>0);
   for(const side of ['left','right']){
    const edge=rows[i+1][side].clone().sub(rows[i][side]);edge.y=0;
    assert.ok(edge.dot(d)/d.lengthSq()>.10,`${side} offset folds near ${i}/${count}`);
   }
  }
 }
});

test('low base drawing ends at the same complete strip as its collider',()=>{
 const rows=sampleRamp(),segments=lowRampSegments(rows),last=segments.at(-1).b;
 assert.equal(segments[0].index,0);assert.ok(last.p.y>=.46);
 assert.ok(segments.at(-1).a.p.y<.46);
 const part=new MechanicalRamp();
 try{
  const cap=part.root.getObjectByName('low-base-end-cap').geometry.attributes.position;
  const expected=[[last.left.x,.035,last.left.z],[last.left.x,last.left.y,last.left.z],[last.right.x,.035,last.right.z],[last.right.x,last.right.y,last.right.z],[2.35,.035,last.p.z],[2.35,last.p.y,last.p.z]];
  assert.equal(cap.count,expected.length);
  for(let i=0;i<cap.count;i++)assert.ok(new T.Vector3().fromBufferAttribute(cap,i).distanceTo(new T.Vector3(...expected[i]))<1e-6);
 }finally{part.dispose();}
});

test('compact low nose uses one closed shell and matching convex contact vertices',async()=>{
 await R.init();const world=new R.World({x:0,y:-9.81,z:0}),physical=buildPhysicalRamp({world}),part=new MechanicalRamp();
 try{
  const visible=part.root.getObjectByName('chamfered-anti-trap-nose').geometry;
  assert.deepEqual(Array.from(visible.attributes.position.array),Array.from(rampNoseVertices()));
  assert.equal(visible.index.count,24);
  const contact=physical.baseColliders.at(-1),vertices=contact.vertices();
  for(let i=0;i<visible.attributes.position.count;i++){
   const p=new T.Vector3().fromBufferAttribute(visible.attributes.position,i);let closest=Infinity;
   for(let j=0;j<vertices.length;j+=3)closest=Math.min(closest,p.distanceTo(new T.Vector3(vertices[j],vertices[j+1],vertices[j+2])));
   assert.ok(closest<1e-6);
  }
  visible.computeBoundingBox();assert.ok(visible.boundingBox.max.y<=.320001);assert.ok(visible.boundingBox.min.z>=-1.650001);
 }finally{part.dispose();world.free();}
});

test('underfloor bearers, saddles and wire ties share nominal visual and contact stock',async()=>{
 await R.init();const world=new R.World({x:0,y:-9.81,z:0}),ramp=buildPhysicalRamp({world}),part=new MechanicalRamp();
 try{
  const parts=rampUndersideParts(ramp.rows),expected=parts.reduce((n,p)=>n+p.points.length-1,0);
  assert.equal(ramp.undersideContacts.length,expected);assert.ok(expected>300);
  for(const p of parts){
   const mesh=part.root.getObjectByName(p.name);assert.ok(mesh,p.name);
   assert.equal(mesh.geometry.parameters.radius,p.radius);
   assert.ok(mesh.geometry.parameters.path.getPoint(0).distanceTo(p.points[0])<1e-8);
   assert.ok(mesh.geometry.parameters.path.getPoint(1).distanceTo(p.points.at(-1))<1e-8);
   assert.equal(mesh.geometry.parameters.path.curves.length,p.points.length-1);
   for(let i=1;i<p.points.length;i++){
    const line=mesh.geometry.parameters.path.curves[i-1];
    assert.ok(line.v1.distanceTo(p.points[i-1])<1e-8);
    assert.ok(line.v2.distanceTo(p.points[i])<1e-8);
    const entry=ramp.undersideContacts.find(c=>c.name===p.name&&c.segment===i-1),c=entry.collider;
    const delta=p.points[i].clone().sub(p.points[i-1]),mid=p.points[i].clone().add(p.points[i-1]).multiplyScalar(.5);
    assert.ok(Math.abs(c.shape.radius-p.radius)<1e-7);
    assert.ok(Math.abs(c.shape.halfHeight-delta.length()/2)<1e-7);
    const pos=c.translation();assert.ok(new T.Vector3(pos.x,pos.y,pos.z).distanceTo(mid)<1e-6);
    const q=c.rotation(),axis=new T.Vector3(0,1,0).applyQuaternion(new T.Quaternion(q.x,q.y,q.z,q.w));
    assert.ok(Math.abs(axis.dot(delta.normalize()))>.999999);
   }
  }
 }finally{part.dispose();world.free();}
});


test('low base end cap follows its accessible convex boundary',async()=>{
 await R.init();const world=new R.World({x:0,y:-9.81,z:0}),physical=buildPhysicalRamp({world}),part=new MechanicalRamp();
 try{
  part.root.updateMatrixWorld(true);const cap=part.root.getObjectByName('low-base-end-cap');let checked=0;
  for(const x of [1.6,1.8,2.0,2.1,2.2,2.3])for(const y of [.08,.18,.30,.42]){
   const origin={x,y,z:-.9},direction={x:0,y:0,z:1};
   const distances=physical.baseColliders.map(c=>c.castRay(new R.Ray(origin,direction),2,true)).filter(t=>t>=0).sort((a,b)=>a-b);
   const visible=new T.Raycaster(new T.Vector3(x,y,-.9),new T.Vector3(0,0,1),0,2).intersectObject(cap)[0];
   assert.ok(distances.length,`missing physical boundary ${x},${y}`);assert.ok(visible,`missing visible cap ${x},${y}`);
   assert.ok(Math.abs(distances[0]-visible.distance)<1e-5,`cap mismatch ${x},${y}`);checked++;
  }
  assert.equal(checked,24);
 }finally{part.dispose();world.free();}
});
