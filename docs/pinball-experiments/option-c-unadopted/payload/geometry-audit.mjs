import fs from'node:fs';import crypto from'node:crypto';
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
import{PinballPhysics}from'../../../web/js/pinball/physics.mjs';
import{LOWER_LAYOUT,LOWER_C,lowerCFrame,lowerLanePaths,flipperAngle}from'../../../web/js/pinball/layout.mjs';
import{cSaveCamGeometry,C_SAVE,applyCSave}from'../../../web/js/pinball/lower-c-study.mjs';
const out='artifacts/pinball/option-c-earlycurve-1add1b7',sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const recorded=[],segment=PinballPhysics.prototype.segment;
PinballPhysics.prototype.segment=function(a,b,r,hit=null){const collider=segment.call(this,a,b,r,hit);if(r===.02&&!hit)recorded.push({a,b,r,collider});return collider;};
const g=await PinballPhysics.create();PinballPhysics.prototype.segment=segment;
const names=new Map(recorded.map((p,i)=>[p.collider.handle,'C-lower-rail-'+i]));
for(const p of g.cMechanics.contacts)names.set(p.collider.handle,p.name);
names.set(g.cMechanics.cam.handle,'C-save-cam');
for(const [handle,side]of g.flipperHandles)names.set(handle,'flipper-'+side);
const all=[];g.world.forEachCollider(c=>{const shape=c.shape,p=c.translation();if(c.handle===g.ballCollider.handle||c.isSensor())return;if(shape.halfExtents&&Math.abs(p.y+.04)<1e-7&&Math.abs(shape.halfExtents.y-.08)<1e-7&&(shape.halfExtents.x>2.7||Math.abs(shape.halfExtents.x-.22)<1e-6))return;all.push(c);});
function nearest(point,subset=all){
 let best={gap:Infinity};
 for(const c of subset){const q=c.projectPoint(point,c.shapeType()!==6),distance=Math.hypot(point.x-q.point.x,point.y-q.point.y,point.z-q.point.z),gap=distance-.135;if(gap<best.gap)best={gap,handle:c.handle,name:names.get(c.handle)||'unchanged-other',shape:c.shapeType(),colliderCenter:c.translation(),closestPoint:q.point};}
 return best;
}
try{
 const geometry=cSaveCamGeometry(),positions=geometry.attributes.position.array,indices=geometry.index.array,edges=new Map();let volume=0,minOutward=Infinity;
 const vertices=Array.from({length:positions.length/3},(_,i)=>new T.Vector3(...positions.slice(i*3,i*3+3))),center=vertices.reduce((a,b)=>a.add(b),new T.Vector3()).multiplyScalar(1/vertices.length);
 for(let i=0;i<indices.length;i+=3){const ids=Array.from(indices.slice(i,i+3)),[a,b,c]=ids.map(j=>vertices[j]);volume+=a.dot(b.clone().cross(c))/6;minOutward=Math.min(minOutward,b.clone().sub(a).cross(c.clone().sub(a)).dot(a.clone().add(b).add(c).multiplyScalar(1/3).sub(center)));for(let j=0;j<3;j++){const key=[ids[j],ids[(j+1)%3]].sort((a,b)=>a-b).join('/');edges.set(key,(edges.get(key)||0)+1);}}
 const physical=g.cMechanics.cam.shape.vertices,physicalV=Array.from({length:physical.length/3},(_,i)=>new T.Vector3(...physical.slice(i*3,i*3+3)));
 const cam={meshVertexCount:vertices.length,hullVertexCount:physicalV.length,triangles:indices.length/3,euler:vertices.length-edges.size+indices.length/3,allEdgesPaired:[...edges.values()].every(n=>n===2),signedVolume:volume,outwardFaceDotMin:minOutward,hullToMeshMaxDistance:Math.max(...physicalV.map(p=>Math.min(...vertices.map(q=>p.distanceTo(q))))),meshToHullMaxDistance:Math.max(...vertices.map(p=>Math.min(...physicalV.map(q=>p.distanceTo(q))))),bottomY:Math.min(...vertices.map(p=>p.y)),topY:Math.max(...vertices.map(p=>p.y)),floorStep:.060-.040};geometry.dispose();
 const supports=g.cMechanics.contacts.map(p=>({name:p.name,center:p.center,radius:p.radius,height:p.height,actualCenter:p.collider.translation(),actualRadius:p.collider.shape.radius,actualHalfHeight:p.collider.shape.halfHeight,nominalPoseError:Math.hypot(...p.center.map((v,i)=>v-Object.values(p.collider.translation())[i])),nominalDimensionsMatch:Math.abs(p.radius-p.collider.shape.radius)<1e-7&&Math.abs(p.height/2-p.collider.shape.halfHeight)<1e-7}));
 const scan=[],heights=[.175,.195,.22,.35,.575];
 for(const held of[false,true]){
  for(let i=0;i<2;i++){const angle=flipperAngle(Boolean(i),held);g.flippers[i].setRotation({x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)},true);}
  g.world.propagateModifiedBodyPositionsToColliders();
  for(const side of[-1,1])for(const role of['IN','OUT'])for(const height of heights)for(const offset of[-.05,0,.05]){
   let minimum={gap:Infinity},negative=0,negativeByName={};
   for(let i=0;i<=32;i++){const t=i/32,f=lowerCFrame(t),alongNormal=(role==='IN'?-.205:.215)+offset,point={x:side*(f.p[0]+alongNormal*f.n[0]),y:height,z:f.p[2]+alongNormal*f.n[2]},best=nearest(point);if(best.gap<0){negative++;const name=best.name.startsWith('C-lower-rail')?'C-lower-rail':best.name;negativeByName[name]=(negativeByName[name]||0)+1;}if(best.gap<minimum.gap)minimum={parameter:t,point,...best};}
   scan.push({held,side,role,height,normalOffset:offset,samples:33,negative,negativeByName,minimum});
  }
 }
 const wireColumn=heights.map(y=>{const point={x:-1.72,y,z:3};return{point,all:nearest(point),newLowerOnly:nearest(point,[...recorded.map(x=>x.collider),...g.cMechanics.contacts.filter(x=>x.name.startsWith('C-lane')).map(x=>x.collider)])};});
 const rotationChecks=[[-7,8],[0,3],[5,20]].map(([x,z])=>{let applied;const stub={ball:{mass:()=>.08,applyImpulse:p=>{applied=p;}},cMechanics:{firings:0}};applyCSave(stub,{x,y:0,z});const final={x:x+applied.x/.08,z:z+applied.z/.08};return{incoming:{x,z},impulse:applied,final,horizontalSpeed:Math.hypot(final.x,final.z),firings:stub.cMechanics.firings};});
 const result={status:'Static geometry audit only; no launch or capture test',sourceSha256:sha(fs.readFileSync(out+'/sources.json')),colliders:g.world.colliders.len(),lowerRailCapsules:recorded.length,addedAttachments:supports.length,cam,supports,scanScope:'Samples on illustrative IN/OUT center lines and +/- .050 offsets at five heights, both rest/held bat poses. Sphere R .135. Floors/sensors/ball excluded; open trimeshes queried as surfaces. Negative entries retained. This is not a continuous full-sphere proof or a claim of natural reachability. IN terminal bat contact and low cam contact are deliberately not filtered out.',scan,wireColumn,save:{frame:C_SAVE,oldDetectorPlanArea:.54*.27,newDetectorPlanArea:.38*.27,rotationChecks,unchargedTransit:'Unverified; fixed cam projects .020 above floor and must be crossed physically. No ball lift/reposition applied.'},limits:['No universal safe radius inferred','No separate fixture launch, natural progression, capture, refire, earned-save behavior or full regression in this script','Analytic capsule/cylinder physical solids versus inscribed rendered radial meshes share axes/dimensions, not identical faceted surfaces','Actual installed browser mesh and mobile/visibility review remains separate']};
 fs.writeFileSync(out+'/geometry-audit.json',JSON.stringify(result,null,2));
 const aggregate={};for(const r of scan)for(const [n,c]of Object.entries(r.negativeByName))aggregate[n]=(aggregate[n]||0)+c;
 console.log(JSON.stringify({colliders:result.colliders,lowerRailCapsules:recorded.length,attachments:supports.length,cam,supportMaxPoseError:Math.max(...supports.map(p=>p.nominalPoseError)),allSupportDimensionsMatch:supports.every(p=>p.nominalDimensionsMatch),negativeSamplesByObject:aggregate,wireGround:wireColumn[0],rotationSpeeds:rotationChecks.map(x=>x.horizontalSpeed)},null,2));
}finally{g.dispose();}
