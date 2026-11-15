import fs from 'node:fs';
const output=new URL('../../../artifacts/pinball/plunger-fit-replay/',import.meta.url);fs.mkdirSync(output,{recursive:true});
import R from '../../../web/js/vendor/rapier3d-0.17.3/rapier.mjs';
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
import {MechanicalCabinet} from '../../../web/js/pinball/components/cabinet.mjs';
import {MechanicalPlunger} from './plunger-prototype.mjs';
await R.init();const p=new MechanicalPlunger(),c=new MechanicalCabinet();p.root.position.set(2.53,.175,4.6);c.root.position.z=.2;p.root.updateMatrixWorld(true);c.root.updateMatrixWorld(true);
const zero={x:0,y:0,z:0},identity={x:0,y:0,z:0,w:1},parts=[],obstacles=[];
const names=['board-edge-1-5.55-hex-head','board-edge-1-5.55-shank','formed-apron-wing-1','front-hazard-apron','apron-folded-front-1','front-folded-cross-rail'];
for(const name of names){const o=c.root.getObjectByName(name),g=o.geometry.clone().applyMatrix4(o.matrixWorld);obstacles.push({name,shape:new R.TriMesh(g.attributes.position.array,g.index?g.index.array:new Uint32Array(Array.from({length:g.attributes.position.count},(_,i)=>i))),box:new T.Box3().setFromObject(o)});g.dispose();}
function add(o,indices,suffix){const a=o.geometry.attributes.position,vs=[];for(const i of indices){let v=new T.Vector3().fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);vs.push(v.x,v.y,v.z);}const shape=new R.ConvexPolyhedron(new Float32Array(vs));parts.push({name:o.name+suffix,shape,box:new T.Box3().setFromArray(vs)});}
for(const o of [p.rod,...p.knob.children]){
 const g=o.geometry,points=g.parameters.points;
 if(points){const n=points.length,s=g.parameters.segments;
  if(o.name==='knob-grip-band'){
   // Each ring sector is an exact convex wedge; no filled annular bore.
   for(let k=0;k<s;k++)add(o,[k*n,k*n+1,k*n+2,k*n+3,(k+1)*n,(k+1)*n+1,(k+1)*n+2,(k+1)*n+3],'/sector'+k);
  }else for(let j=0;j<n-1;j++){if(Math.abs(points[j+1].y-points[j].y)<1e-8)continue;const ids=[];for(let k=0;k<=s;k++)ids.push(k*n+j,k*n+j+1);add(o,ids,'/frustum'+j);}
 }else add(o,Array.from({length:g.attributes.position.count},(_,i)=>i),'');
}
const witnesses=new Map();let queries=0;
for(let i=0;i<=100;i++){const shift=new T.Vector3(0,0,.32*i/100),pos={x:0,y:0,z:shift.z};for(const a of parts){const b=a.box.clone().translate(shift);for(const target of obstacles){if(!b.intersectsBox(target.box))continue;queries++;const contact=a.shape.contactShape(pos,identity,target.shape,zero,identity,0);if(contact&&contact.distance< -1e-6){const key=target.name;const existing=witnesses.get(key);const w={obstacle:target.name,movingPart:a.name,pull:i/100,penetration:-contact.distance,movingPoint:contact.point1,obstaclePoint:contact.point2};if(!existing||w.penetration>existing.penetration)witnesses.set(key,w);}}}}
const result={method:'Rapier exact installed cabinet trimeshes versus convex frustum decomposition of existing lathe cap/rod, separate annular sectors for band, convex individual knurl boxes. No whole-knob convexification.',strokeSamples:101,queries,convexParts:parts.length,witnesses:[...witnesses.values()],noWitness:names.filter(n=>!witnesses.has(n)),status:witnesses.size?'Confirmed actual geometry interference; rejected as-is':'No tested geometry interference found'};fs.writeFileSync(new URL('narrowphase.json',output),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));p.dispose();c.dispose();
