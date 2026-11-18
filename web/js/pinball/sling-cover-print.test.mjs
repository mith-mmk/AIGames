import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import * as T from '../vendor/three-0.180.0/three.module.min.js';import {MechanicalSling} from './components/sling-target.mjs';import {WorkshopAssets} from './assets.mjs';import {LOWER_LAYOUT,lowerSlingVertices} from './layout.mjs';
const h=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
function geometryData(root){const rows=[];root.traverse(m=>{if(m.isMesh)rows.push([m.name,Array.from(m.geometry.attributes.position.array),Array.from(m.geometry.attributes.normal.array),m.geometry.index?Array.from(m.geometry.index.array):null,m.position.toArray(),m.quaternion.toArray()]);});return rows;}
function canonical(root){root.updateMatrixWorld(true);const rows=[];root.traverse(m=>{if(!m.isMesh)return;const g=m.geometry,p=g.attributes.position,n=g.attributes.normal,normal=new T.Matrix3().getNormalMatrix(m.matrixWorld);for(let i=0;i<(g.index?.count??p.count);i+=3){const row=[];for(let j=0;j<3;j++){const k=g.index?g.index.getX(i+j):i+j;row.push(...new T.Vector3().fromBufferAttribute(p,k).applyMatrix4(m.matrixWorld).toArray().map(Math.fround),...new T.Vector3().fromBufferAttribute(n,k).applyNormalMatrix(normal).toArray().map(Math.fround));}rows.push(JSON.stringify(row));}});return h(rows.sort());}
function canvasEnvironment(){const saved=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement(){const ctx={paths:[],beginPath(){this.path=[];},moveTo(x,y){this.path.push([x,y]);},lineTo(x,y){this.path.push([x,y]);},closePath(){},fill(){this.paths.push({color:this.fillStyle,points:this.path});},fillRect(){},arc(){}};return{width:0,height:0,getContext:()=>ctx,ctx};}}});return()=>{if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;};}

test('generic sling remains DOM-free and does not own caller maps',()=>{const caller=new T.Texture(),material=new T.MeshStandardMaterial({map:caller});let calls=0;caller.addEventListener('dispose',()=>calls++);const part=new MechanicalSling({materials:{dark:material}});assert.equal(part.coverPrintTexture,undefined);part.dispose();part.dispose();assert.equal(calls,0);material.dispose();caller.dispose();});

test('installed left and right print changes only UV/material and remains registered after batching',()=>{const restore=canvasEnvironment(),records=[];try{for(const side of[-1,1]){const [originX,originZ]=LOWER_LAYOUT.slingCenter;
const points=lowerSlingVertices(side).map(([x,z])=>[x-side*originX,z-originZ]);
const options={points,coverHeight:LOWER_LAYOUT.slingCoverHeight};
const baseline=new MechanicalSling(options),printed=new MechanicalSling({...options,coverPrint:true});assert.deepEqual(geometryData(printed.root),geometryData(baseline.root));const mesh=printed.root.getObjectByName('recessed-plastic-cover-insert'),g=mesh.geometry,uv=g.attributes.uv,n=g.attributes.normal,texture=mesh.material.map,gear=texture.image.ctx.paths.find(p=>p.points?.length===32);assert.ok(gear);assert.equal(gear.color,'#f4c531');assert.equal(mesh.material.emissive.getHex(),0);for(let i=0;i<uv.count;i++)if(n.getY(i)<=.999){assert.equal(uv.getX(i),0);assert.equal(uv.getY(i),0);}
// Locate the actual canvas gear center in actual top-triangle UVs, independently of metadata.
const center=gear.points.reduce((s,p)=>[s[0]+p[0]/32,s[1]+p[1]/32],[0,0]),target=new T.Vector3(center[0]/512,1-center[1]/512,0);let mapped;
for(let i=0;i<g.attributes.position.count;i+=3){if(n.getY(i)<.999)continue;const ids=g.index?[g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)]:[i,i+1,i+2];const u=ids.map(k=>new T.Vector3(uv.getX(k),uv.getY(k),0)),bary=new T.Triangle(...u).getBarycoord(target,new T.Vector3());if(bary&&Math.min(bary.x,bary.y,bary.z)>=-1e-7){mapped=ids.reduce((s,k,j)=>s.addScaledVector(new T.Vector3().fromBufferAttribute(g.attributes.position,k),bary.getComponent(j)),new T.Vector3());break;}}
assert.ok(mapped,'the ink center must map onto the visible top face');
// Check the design invariant geometrically, rather than the coordinates of
// a previous triangle. The intended gear center is inside the insert and
// equidistant from its three inset edges; no print-registration metadata is read.
const corners=points.map(p=>new T.Vector2(...p));
const centroid=corners.reduce((sum,p)=>sum.add(p),new T.Vector2()).multiplyScalar(1/3);
const insert=corners.map(p=>centroid.clone().lerp(p,.78));
const ink=new T.Vector2(mapped.x,mapped.z);
const signedDistances=insert.map((a,i)=>{
 const edge=insert[(i+1)%3].clone().sub(a),displacement=ink.clone().sub(a);
 return edge.cross(displacement)/edge.length();
});
assert.ok(signedDistances.every(d=>Math.sign(d)===Math.sign(signedDistances[0])));
const gaps=signedDistances.map(Math.abs);
assert.ok(Math.min(...gaps)>.08,'the gear center must not clip a cover edge');
assert.ok(Math.max(...gaps)-Math.min(...gaps)<1e-6,'the gear stays centered in the reshaped cover');
const assets=new WorkshopAssets(),before=h(geometryData(baseline.root));assets.batchStaticAssembly(baseline.root);assets.batchStaticAssembly(printed.root);assert.equal(canonical(baseline.root),canonical(printed.root));assert.equal(printed.root.getObjectByName('recessed-plastic-cover-insert').material.map,texture);records.push({side,preBatchPositionIndexNormalHash:before,postBatchCanonicalHash:canonical(printed.root),mapped:mapped.toArray()});baseline.dispose();printed.dispose();for(const m of Object.values(assets.materials))m.dispose();}assert.equal(records.length,2);}finally{restore();}});

test('standalone printed sling disposes only its owned texture exactly once',()=>{const restore=canvasEnvironment();try{const caller=new T.Texture(),mat=new T.MeshStandardMaterial({map:caller});let external=0,owned=0;caller.addEventListener('dispose',()=>external++);const part=new MechanicalSling({materials:{dark:mat},coverPrint:true});part.coverPrintTexture.addEventListener('dispose',()=>owned++);part.dispose();part.dispose();assert.equal(owned,1);assert.equal(external,0);mat.dispose();caller.dispose();}finally{restore();}});

test('actual installed asset disposal releases both registered print textures',()=>{const saved=Object.getOwnPropertyDescriptor(globalThis,'document'),ctx=new Proxy({}, {get:(_,key)=>key==='measureText'?()=>({width:10}):key.startsWith('create')?()=>({addColorStop(){}}):()=>{}});Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>ctx})}});const assets=new WorkshopAssets();try{assets.build();const textures=[...assets.mechanical.slings.values()].map(s=>s.coverPrintTexture);assert.equal(textures.length,2);assert.ok(textures.every(t=>t?.isCanvasTexture));const counts=[0,0];textures.forEach((t,i)=>t.addEventListener('dispose',()=>counts[i]++));assets.dispose();assert.deepEqual(counts,[1,1]);}finally{if(saved)Object.defineProperty(globalThis,'document',saved);else delete globalThis.document;}});
