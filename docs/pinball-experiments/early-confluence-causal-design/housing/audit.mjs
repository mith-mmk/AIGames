import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
import {WorkshopAssets} from '../../../web/js/pinball/assets.mjs';
const a=new WorkshopAssets(),g=new T.Group();
// Exact stable PlayfieldParts dimensions and WorkshopAssets mesh generators.
const housing=a.roundedBox(g,.22,.10,.42,-2.10,.10,3.78,'steel',.035);
const rod=a.tube(g,[[-2.10,.13,3.80],[-2.10,.13,3.50]],.06,'chrome');
housing.name='existing-save-housing';rod.name='existing-save-rod';g.updateMatrixWorld(true);
const meshes=[housing,rod];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const records=meshes.map(o=>{const b=new T.Box3().setFromObject(o),geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();geometry.applyMatrix4(o.matrixWorld);const p=geometry.attributes.position,triangles=[];for(let i=0;i<p.count;i+=3)triangles.push(new T.Triangle(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,i+j))));return{name:o.name,bounds:[b.min.toArray(),b.max.toArray()],triangles,vertexHash:hash(Buffer.from(p.array.buffer))};});
const input=fs.readFileSync(new URL('../early-confluence-696c646/save-classification.json',import.meta.url));const cases=JSON.parse(input).cases.filter(r=>!r.saved),point=new T.Vector3(),closest=new T.Vector3();
const results=cases.map(r=>({spec:r.spec,windowTicks:r.window.length,parts:records.map(part=>{const samples=r.window.map(row=>{point.set(row.p.x,row.p.y,row.p.z);let d=Infinity;for(const t of part.triangles){t.closestPointToPoint(point,closest);d=Math.min(d,point.distanceTo(closest));}return{tick:row.tick,p:row.p,sphereToRenderedSurfaceGap:d-.135};});return{name:part.name,intersectingSamples:samples.filter(s=>s.sphereToRenderedSurfaceGap<0).length,minGap:Math.min(...samples.map(s=>s.sphereToRenderedSurfaceGap)),samples};})}));
const output={method:'Exact existing roundedBox/tube triangles; recorded nine missed-save floor-ball centers. Minimum Euclidean center-to-triangle-surface distance minus ball radius. Negative proves sphere intersects/contains visible surface; not a signed volume SDF, collider simulation or force result. No production geometry or physics changes. Every-tick window samples only.',inputSHA256:hash(input),meshes:records.map(({triangles,...r})=>({...r,triangleCount:triangles.length})),results};
fs.writeFileSync(new URL('./audit.json',import.meta.url),JSON.stringify(output,null,2));console.log(JSON.stringify({meshes:output.meshes,cases:results.map(r=>({name:r.spec.name,windowTicks:r.windowTicks,parts:r.parts.map(({samples,...p})=>p)}))},null,2));
for(const o of meshes)o.geometry.dispose();for(const m of Object.values(a.materials))m.dispose();
