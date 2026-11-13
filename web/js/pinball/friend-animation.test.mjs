import test from "node:test";
import assert from "node:assert/strict";
import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { WorkshopFriend } from "./components/workshop-friend.mjs";
import { WorkshopRoom } from "./workshop.mjs";

function build(t) {
  const previous=globalThis.document;
  globalThis.document={createElement:()=>({getContext:()=>new Proxy({}, {
    get:(target,key)=>target[key] || (()=>{}),
  })})};
  const friend=new WorkshopFriend();friend.build(new T.Group());
  globalThis.document=previous;
  t.after(()=>friend.dispose());
  return friend;
}
function pose(friend) {
  return Object.values(friend.parts).flatMap(p=>[p.rotation.x,p.rotation.y,p.rotation.z]);
}

test("rigid animation preserves Chappy's detail and stays within 35 meshes", t=>{
  const friend=build(t),geometries=[];
  friend.root.traverse(o=>{if(o.geometry)geometries.push(o.geometry);});
  assert.ok(geometries.length<=35,`${geometries.length} meshes`);
  assert.ok(geometries.length>20);
  assert.equal(friend.parts.head.parent,friend.parts.body);
  assert.equal(friend.parts.leftArm.parent,friend.parts.body);
  assert.ok(friend.parts.leftArm.getObjectByName("chappy-leftArm-metal"));
  const root=friend.root.matrix.clone();friend.root.updateMatrix();root.copy(friend.root.matrix);
  for(const event of ["launch","hit","mission","multiplier","tilt","drain","gameover","flipper"]) {
    friend.resetAnimation();friend.update(1/60,{event,playing:false});
    for(let frame=0;frame<10;frame++)friend.update(1/60,{playing:false});
    assert.ok(pose(friend).some(v=>Math.abs(v)>.001),event);
    for(let frame=0;frame<200;frame++) {
      friend.update(1/60,{playing:false});friend.root.updateMatrixWorld(true);
      assert.ok(pose(friend).every(Number.isFinite));
      friend.root.traverse(o=>{
        assert.ok(o.matrixWorld.elements.every(Number.isFinite));
        assert.deepEqual(o.scale.toArray(),[1,1,1]);
      });
    }
    assert.ok(pose(friend).every(v=>Math.abs(v)<1e-10));
  }
  friend.root.updateMatrix();assert.deepEqual(friend.root.matrix.elements,root.elements);
  const after=[];friend.root.traverse(o=>{if(o.geometry)after.push(o.geometry);});
  assert.deepEqual(after,geometries);
});

test("pause freezes, reduced motion suppresses, restart resets, idle is playing-only",t=>{
  const friend=build(t);
  for(let i=0;i<20;i++)friend.update(.02,{playing:false});
  assert.ok(pose(friend).every(v=>v===0));
  for(let i=0;i<20;i++)friend.update(.02,{playing:true});
  assert.ok(pose(friend).some(v=>v!==0));
  friend.update(.02,{event:"mission"});const frozen=pose(friend),clock=friend.clock;
  for(let i=0;i<20;i++)friend.update(.02,{event:"tilt",paused:true});
  assert.deepEqual(pose(friend),frozen);assert.equal(friend.clock,clock);
  friend.update(.02,{event:"mission",reducedMotion:true});
  assert.ok(pose(friend).every(v=>v===0));assert.equal(friend.gesture,null);
  friend.update(.02,["mission"],{phase:"playing"});
  friend.update(.02,[],{phase:"paused"});assert.equal(friend.gesture,"mission");
  friend.resetAnimation();assert.ok(pose(friend).every(v=>v===0));
  for(const dt of [NaN,Infinity,-1,100])friend.update(dt,{event:"launch"});
  assert.ok(pose(friend).every(Number.isFinite));
});

test("room forwards both update contracts and reset aliases",t=>{
  const room=new WorkshopRoom();room.friend=build(t);
  room.update(.05,{event:"launch"});assert.equal(room.friend.gesture,"launch");
  room.reset();assert.equal(room.friend.gesture,null);
  room.update(.05,["mission"],{phase:"playing"});assert.equal(room.friend.gesture,"mission");
  room.resetAnimation();assert.equal(room.friend.gesture,null);
});
