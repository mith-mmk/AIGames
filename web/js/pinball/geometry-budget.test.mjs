import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import { WorkshopAssets } from './assets.mjs';

test('straight structural tubes retain endpoints/radius without redundant axial tessellation', () => {
  const assets=new WorkshopAssets(),root=new T.Group();
  const points=[[1,2,3],[4,6,3]];
  const tube=assets.tube(root,points,.05,'steel');
  const g=tube.geometry;
  assert.equal(g.index.count/3,16);
  assert.equal(g.parameters.radialSegments,8);
  assert.equal(g.parameters.radius,.05);
  for(const [t,point] of [[0,points[0]],[1,points[1]]])
    assert.ok(g.parameters.path.getPoint(t).distanceTo(new T.Vector3(...point))<1e-12);
  assert.ok([...g.attributes.position.array].every(Number.isFinite));
  const curved=assets.tube(root,[[0,0,0],[1,1,0],[2,0,0]],.05,'steel');
  assert.equal(curved.geometry.parameters.tubularSegments,100);
  tube.geometry.dispose();curved.geometry.dispose();
  for(const m of Object.values(assets.materials))m.dispose();
});

test('installed shooter roof uses three closed capsule stocks on the existing physical axes',()=>{
  const saved=Object.getOwnPropertyDescriptor(globalThis,'document');
  // Canvas is irrelevant to this mesh assertion; retain the real assembly builder.
  const ctx=new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:10}):key.startsWith('create')?()=>({addColorStop(){}}):()=>{}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}});
  const assets=new WorkshopAssets();
  try {
    const root=assets.build(),roof=root.getObjectByName('shooter-roof-capsule-stock');
    assert.ok(roof?.isMesh);
    assert.equal(roof.material,assets.materials.chrome);
    const g=roof.geometry,p=g.attributes.position,ranges=g.userData.primitiveRanges;
    assert.equal(ranges.length,3);
    assert.equal(g.index.count/3,576); // Old open tubes: 48; closed stocks add 528.
    const ends=[[2.72,.23,-4.15],[2.4,.23,-5.2],[1.25,.23,-5.55],[.95,.23,-5.3]];
    for(const [part,range] of ranges.entries()){
      const line=new T.Line3(new T.Vector3(...ends[part]),new T.Vector3(...ends[part+1]));
      const vertices=new Map(),edges=new Map();
      const weld=v=>{const key=v.toArray().map(x=>x.toFixed(6)).join(',');if(!vertices.has(key))vertices.set(key,vertices.size);return vertices.get(key);};
      for(let k=range.indexStart;k<range.indexStart+range.indexCount;k+=3){
        const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,g.index.getX(k+j)));
        for(const v of vs)assert.ok(Math.abs(v.distanceTo(line.closestPointToPoint(v,true,new T.Vector3()))-.06)<3e-7);
        const normal=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0]));
        const center=vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3);
        assert.ok(normal.dot(center.clone().sub(line.closestPointToPoint(center,true,new T.Vector3())))>0);
        const ids=vs.map(weld);
        for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(a<b?1:-1);}
      }
      assert.equal(vertices.size-edges.size+range.indexCount/3,2);
      for(const pair of edges.values()){assert.equal(pair.length,2);assert.equal(pair[0]+pair[1],0);}
    }
  }finally{
    assets.root.traverse(o=>o.geometry?.dispose());
    for(const m of Object.values(assets.materials))m.dispose();
    if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;
  }
});

test('installed rollover bars are closed stocks on actual capsule axes and retain eight original mounts',async()=>{
  const {PinballPhysics}=await import('./physics.mjs'),game=await PinballPhysics.create();
  const saved=Object.getOwnPropertyDescriptor(globalThis,'document');
  const ctx=new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:10}):key.startsWith('create')?()=>({addColorStop(){}}):()=>{}});
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}});
  const assets=new WorkshopAssets();
  try {
    const root=assets.build(),colliders=[];game.world.forEachCollider(c=>colliders.push(c));
    // Upper pop layout is intentionally two side bumpers, not the old triangle.
    // Avoid coupling rollover mount fidelity to unrelated lower guard counts.
    const {BUMPERS}=await import('./layout.mjs');
    assert.equal([...game.hitObjects.values()].filter(hit=>hit.type==='bumper').length,BUMPERS.length);
    for(const x of[-1.875,-.625,.625,1.875]){
      const bar=root.getObjectByName('upper-rollover-bar-'+x);
      assert.ok(bar?.isMesh);assert.equal(bar.material,assets.materials.chrome);
      const matches=colliders.filter(c=>c.shape.type===2&&Math.abs(c.translation().x-x)<1e-6&&Math.abs(c.translation().z+4.55)<1e-6&&Math.abs(c.shape.radius-.035)<1e-9);
      assert.equal(matches.length,1);const c=matches[0],t=c.translation(),q=c.rotation();
      assert.ok(Math.abs(c.shape.halfHeight-.45)<1e-12);assert.ok(Math.abs(t.y-.23)<1e-6);
      const axis=new T.Vector3(0,1,0).applyQuaternion(new T.Quaternion(q.x,q.y,q.z,q.w).normalize()),center=new T.Vector3(t.x,t.y,t.z);
      const line=new T.Line3(center.clone().addScaledVector(axis,-c.shape.halfHeight),center.clone().addScaledVector(axis,c.shape.halfHeight));
      const g=bar.geometry,p=g.attributes.position,vertices=new Map(),edges=new Map();
      assert.equal(g.userData.primitiveRanges.length,1);assert.equal(g.index.count/3,192); // Old open bar16tri; four bars add704.
      const weld=v=>{const key=v.toArray().map(n=>n.toFixed(6)).join(',');if(!vertices.has(key))vertices.set(key,vertices.size);return vertices.get(key);};
      for(let k=0;k<g.index.count;k+=3){
        const vs=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,g.index.getX(k+j)));
        for(const v of vs)assert.ok(Math.abs(v.distanceTo(line.closestPointToPoint(v,true,new T.Vector3()))-c.shape.radius)<5e-7);
        const normal=vs[1].clone().sub(vs[0]).cross(vs[2].clone().sub(vs[0])),mid=vs[0].clone().add(vs[1]).add(vs[2]).multiplyScalar(1/3);
        assert.ok(normal.dot(mid.clone().sub(line.closestPointToPoint(mid,true,new T.Vector3())))>0);
        const ids=vs.map(weld);for(let j=0;j<3;j++){const a=ids[j],b=ids[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(',');if(!edges.has(key))edges.set(key,[]);edges.get(key).push(a<b?1:-1);}
      }
      assert.equal(vertices.size-edges.size+g.index.count/3,2);for(const pair of edges.values()){assert.equal(pair.length,2);assert.equal(pair[0]+pair[1],0);}
      for(const z of[-5,-4.1]){const mounts=[];root.traverse(m=>{const p=m.geometry?.parameters;if(m.isMesh&&m.geometry.type==='CylinderGeometry'&&p.radiusTop===.055&&p.radiusBottom===.055&&p.height===.23&&m.position.distanceTo(new T.Vector3(x,.12,z))<1e-9)mounts.push(m);});assert.equal(mounts.length,1);assert.equal(mounts[0].material,assets.materials.brass);}
    }
  }finally{
    assets.root.traverse(o=>o.geometry?.dispose());for(const m of Object.values(assets.materials))m.dispose();game.dispose();
    if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;
  }
});
