import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {baseShell, baseShellStrips, baseShellVisualParts} from './ramp-base.mjs';
import {sampleRamp, lowRampSegments, buildPhysicalRamp} from './ramp-geometry.mjs';
import {MechanicalRamp} from './components/ramp-wire.mjs';
import {PinballPhysics} from './physics.mjs';

function edgeDefects(geometry) {
  const a=geometry.attributes.position, ix=geometry.index.array, edges=new Map();
  const key=i=>new T.Vector3().fromBufferAttribute(a,i).toArray().map(v=>v.toFixed(7)).join(',');
  for(let i=0;i<ix.length;i+=3)for(let j=0;j<3;j++){
    const p=key(ix[i+j]),q=key(ix[i+(j+1)%3]),id=[p,q].sort().join('|');
    const edge=edges.get(id)??{count:0,balance:0};
    edge.count++;edge.balance+=p<q?1:-1;edges.set(id,edge);
  }
  return [...edges.values()].filter(e=>e.count!==2||e.balance!==0);
}

function faceKeys(geometry) {
  const a=geometry.attributes.position,ix=geometry.index.array,faces=[];
  for(let i=0;i<ix.length;i+=3)faces.push([0,1,2].map(j=>
    new T.Vector3().fromBufferAttribute(a,ix[i+j]).toArray().join(',')).sort().join('|'));
  return faces.sort();
}

test('low housing is closed with the existing deck and partitioned without internal faces',()=>{
  const segments=lowRampSegments(sampleRamp()),closed=baseShell(segments,true),shell=baseShell(segments);
  const parts=baseShellStrips(segments);
  try{
    assert.equal(segments.length,30);assert.equal(parts.length,segments.length);
    assert.deepEqual(edgeDefects(closed),[]);
    assert.equal(shell.userData.tags.filter(t=>t==='deck').length,0);
    const faces=parts.flatMap(faceKeys).sort();
    assert.deepEqual(faces,faceKeys(shell),'strip union must equal the actual exterior');
    assert.equal(new Set(faces).size,faces.length,'no duplicate internal or top faces');
  }finally{closed.dispose();shell.dispose();parts.forEach(g=>g.dispose());}
});

test('generic installed rows without tangent preserve the exact housing geometry',()=>{
  const rows=sampleRamp(),generic=rows.map(({p,left,right})=>({p,left,right}));
  const a=baseShell(lowRampSegments(rows)),b=baseShell(lowRampSegments(generic));
  try{assert.deepEqual(faceKeys(a),faceKeys(b));}
  finally{a.dispose();b.dispose();}
});

test('every installed housing boundary face matches the physical strip union',async()=>{
  await R.init();const world=new R.World({x:0,y:-9.81,z:0});
  const physical=buildPhysicalRamp({world}),installed=new MechanicalRamp();
  const shell=baseShell(lowRampSegments(physical.rows));
  try{
    const root=installed.root.getObjectByName('solid-anti-trap-ramp-base');
    root.updateMatrixWorld(true);
    assert.equal(physical.baseColliders.length,31,'thirty real strips then the unchanged nose');
    const a=shell.attributes.position,ix=shell.index.array;
    let checked=0;
    for(let i=0;i<ix.length;i+=3){
      const tri=new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,ix[i+j])));
      const normal=tri.getNormal(new T.Vector3()),origin=tri.getMidpoint(new T.Vector3()).addScaledVector(normal,.01);
      const direction=normal.clone().negate();
      const times=physical.baseColliders.slice(0,-1).map(c=>c.castRay(new R.Ray(origin,direction),.03,true)).filter(t=>t!==null&&t>=0);
      const visible=new T.Raycaster(origin,direction,0,.03).intersectObject(root,true)[0];
      assert.ok(times.length,`missing physical face ${i/3}`);assert.ok(visible,`missing installed face ${i/3}`);
      assert.ok(Math.abs(Math.min(...times)-visible.distance)<1e-6,`face ${i/3} mismatch`);checked++;
    }
    assert.equal(checked,308);
  }finally{shell.dispose();installed.dispose();world.free();}
});

test('low housing never projects above the actual acrylic running surface',async()=>{
  await R.init();const world=new R.World({x:0,y:-9.81,z:0}),ramp=buildPhysicalRamp({world});
  try{
    let checked=0;
    for(const {a,b} of lowRampSegments(ramp.rows))for(let j=0;j<=10;j++){
      const left=a.left.clone().lerp(b.left,.5),right=a.right.clone().lerp(b.right,.5),p=left.lerp(right,j/10);
      const ray=new R.Ray({x:p.x,y:2,z:p.z},{x:0,y:-1,z:0});
      const deck=ramp.colliders[0].castRay(ray,3,true);
      if(deck===null||deck<0)continue;
      const base=ramp.baseColliders.map(c=>c.castRay(ray,3,true)).filter(t=>t!==null&&t>=0);
      assert.ok(base.length,'sealed base must retain its lower boundary');
      assert.ok(deck-Math.min(...base)<=1e-6,'base must not lift the running surface');checked++;
    }
    assert.ok(checked>=300);
  }finally{world.free();}
});

test('historical positive-offset tangent start penetrates the deck; common corrected start is legal',async()=>{
  const g=await PinballPhysics.create();
  try{
    const gapAt=y=>{
      const p={x:1.58,y,z:1.1};let minimum=Infinity;
      g.world.forEachCollider(c=>{
        if(c.isSensor()||c.handle===g.ballCollider.handle)return;
        const q=c.projectPoint(p,true).point;
        minimum=Math.min(minimum,Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)-.135);
      });
      return minimum;
    };
    // Preserve the old invalid fixture as a regression, not a desired bounce.
    assert.ok(gapAt(.18)<-.005,'old .08 tangent start must not be called nonpenetrating');
    // All-solid +.0001 in the original hull required .1857142374; the exact
    // new boundary needs only .1855045681. Use the SAME larger start for both.
    assert.ok(gapAt(.1857142374)>=.0001-1e-7);
  }finally{g.dispose();}
});


test('one-strip generic housing renders both endpoint caps exactly once',()=>{
  const rows=sampleRamp().slice(0,2).map(({p,left,right})=>({p,left,right}));
  const segments=lowRampSegments(rows),shell=baseShell(segments),parts=baseShellVisualParts(segments);
  try{
    assert.equal(segments.length,1);
    const front=parts.find(p=>p.name==='low-base-front-cap');
    const back=parts.find(p=>p.name==='low-base-end-cap');
    assert.ok(front&&back);assert.equal(front.geometry.index.count,12);assert.equal(back.geometry.index.count,12);
    assert.deepEqual(parts.flatMap(p=>faceKeys(p.geometry)).sort(),faceKeys(shell));
  }finally{shell.dispose();parts.forEach(p=>p.geometry.dispose());}
});
