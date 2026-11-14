import fs from 'node:fs';import crypto from 'node:crypto';
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
import{PinballPhysics}from'../../../web/js/pinball/physics.mjs';
import{WorkshopAssets}from'../../../web/js/pinball/assets.mjs';
import{lowerLanePaths,lowerLaneMounts,RECEIVER_LAYOUT,flipperAngle}from'../../../web/js/pinball/layout.mjs';
import{drawCLanes,drawCSave,C_SAVE}from'../../../web/js/pinball/lower-c-study.mjs';
const out='artifacts/pinball/receiver-release-8849609',hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const record=[],old=PinballPhysics.prototype.segment;
PinballPhysics.prototype.segment=function(a,b,r,hit=null){const c=old.call(this,a,b,r,hit);if(r===.02&&!hit)record.push({a,b,r,collider:c});return c;};
const g=await PinballPhysics.create();PinballPhysics.prototype.segment=old;
const assets=new WorkshopAssets();drawCLanes(assets,-1);drawCLanes(assets,1);assets.text=()=>{};drawCSave(assets);assets.root.updateWorldMatrix(true,true);
const names=new Map(record.map((p,i)=>[p.collider.handle,'receiver-rail-'+i]));for(const p of g.cMechanics.contacts)names.set(p.collider.handle,p.name);names.set(g.cMechanics.cam.handle,'C-save-cam');for(const[h,s]of g.flipperHandles)names.set(h,'flipper-'+s);
const all=[];g.world.forEachCollider(c=>{const sh=c.shape,p=c.translation();if(c.handle===g.ballCollider.handle||c.isSensor())return;if(sh.halfExtents&&Math.abs(p.y+.04)<1e-7&&Math.abs(sh.halfExtents.y-.08)<1e-7&&(sh.halfExtents.x>2.7||Math.abs(sh.halfExtents.x-.22)<1e-6))return;all.push(c);});
const lower=[...record.map(p=>p.collider),...g.cMechanics.contacts.filter(p=>p.name.startsWith('C-lane')).map(p=>p.collider)];
const v=p=>new T.Vector3(p.x,p.y,p.z);
function nearest(point,subset=all){let best={gap:Infinity};for(const c of subset){const q=c.projectPoint(point,c.shapeType()!==6),gap=Math.hypot(point.x-q.point.x,point.y-q.point.y,point.z-q.point.z)-.135;if(gap<best.gap)best={gap,inside:q.isInside,handle:c.handle,name:names.get(c.handle)||'unchanged-other',type:c.shapeType(),center:c.translation(),closest:q.point};}return best;}
function frame(t){const p=lowerLanePaths(1)[0],len=p.slice(1).map((q,i)=>Math.hypot(...q.map((a,k)=>a-p[i][k]))),total=len.reduce((a,b)=>a+b,0);let left=t*total;for(let i=0;i<len.length;i++)if(left<=len[i]||i===len.length-1){const u=left/len[i],d=p[i+1].map((q,k)=>(q-p[i][k])/len[i]);return{p:p[i].map((q,k)=>q+u*(p[i+1][k]-q)),n:[d[2],0,-d[0]]};}else left-=len[i];}
try{
 const mounts=g.cMechanics.contacts.map(p=>{const mesh=assets.root.getObjectByName(p.name),a=mesh.position,c=p.collider,cp=c.translation(),cq=c.rotation(),q=new T.Quaternion(cq.x,cq.y,cq.z,cq.w);return{name:p.name,meshCenter:a.toArray(),colliderCenter:cp,centerError:a.distanceTo(v(cp)),visibleRadius:mesh.geometry.parameters.radiusTop,visibleHeight:mesh.geometry.parameters.height,physicalRadius:c.shape.radius,physicalHeight:c.shape.halfHeight*2,axisQuaternionError:1-Math.abs(mesh.quaternion.dot(q)),yMin:p.center[1]-p.height/2,yMax:p.center[1]+p.height/2};});
 const mesh=assets.root.getObjectByName('C-shared-earned-save-cam'),verts=mesh.geometry.attributes.position,physical=g.cMechanics.cam.shape.vertices;let maxCam=0;for(let i=0;i<verts.count;i++){const p=new T.Vector3().fromBufferAttribute(verts,i);let best=Infinity;for(let j=0;j<physical.length;j+=3)best=Math.min(best,p.distanceTo(new T.Vector3(...physical.slice(j,j+3))));maxCam=Math.max(maxCam,best);}
 const railChecks=[];let number=0;
 for(const side of[-1,1])for(const[pathIndex,path]of lowerLanePaths(side).entries()){
  const rendered=assets.root.getObjectByName('C-shared-lane-stock-'+side+'-'+pathIndex),pos=rendered.geometry.attributes.position,ranges=rendered.geometry.userData.primitiveRanges;
  for(let i=1;i<path.length;i++){
   const a=new T.Vector3(...path[i-1]),b=new T.Vector3(...path[i]),center=a.clone().add(b).multiplyScalar(.5),length=a.distanceTo(b),axis=b.clone().sub(a).normalize(),c=record[number++].collider,range=ranges[i-1];let lo=Infinity,hi=-Infinity,maxRadius=0;
   for(let j=range.vertexStart;j<range.vertexStart+range.vertexCount;j++){const p=new T.Vector3().fromBufferAttribute(pos,j).sub(center),along=p.dot(axis);lo=Math.min(lo,along);hi=Math.max(hi,along);maxRadius=Math.max(maxRadius,p.clone().addScaledVector(axis,-along).length());}
   const rotation=c.rotation(),actualAxis=new T.Vector3(0,1,0).applyQuaternion(new T.Quaternion(rotation.x,rotation.y,rotation.z,rotation.w));
   railChecks.push({side,pathIndex,segment:i-1,centerError:center.distanceTo(v(c.translation())),lengthError:Math.abs(length-2*c.shape.halfHeight),radiusError:Math.abs(c.shape.radius-.02),axisError:1-Math.abs(axis.dot(actualAxis)),meshMinAlong:lo,meshMaxAlong:hi,meshRadius:maxRadius,endpointExtentError:Math.max(Math.abs(lo+length/2+.02),Math.abs(hi-length/2-.02)),meshTriangles:range.indexCount/3});
  }
 }
 const scan=[],overlaps=[];
 for(const held of[false,true]){
  for(let i=0;i<2;i++){const angle=flipperAngle(Boolean(i),held);g.flippers[i].setRotation({x:0,y:Math.sin(angle/2),z:0,w:Math.cos(angle/2)},true);}g.world.propagateModifiedBodyPositionsToColliders();
  for(const side of[-1,1])for(const role of['IN','OUT'])for(const y of[.175,.195,.22,.35,.575])for(const offset of[-.05,0,.05]){
   let minimum={gap:Infinity},negative=0;const byName={};
   for(let i=0;i<=48;i++){const f=frame(i/48),normal=(role==='IN'?-.205:.215)+offset,p={x:side*(f.p[0]+normal*f.n[0]),y,z:f.p[2]+normal*f.n[2]},n=nearest(p);if(n.gap<0){negative++;const name=n.name.startsWith('receiver-rail')?'receiver-rail':n.name;byName[name]=(byName[name]||0)+1;}if(n.gap<minimum.gap)minimum={t:i/48,p,...n};}
   scan.push({held,side,role,y,offset,samples:49,negative,negativeByName:byName,minimum});
  }
  for(const[h,side]of g.flipperHandles){const bat=g.world.getCollider(h);for(const c of lower){const q=bat.contactCollider(c,0);if(q&&q.distance<=0)overlaps.push({held,side,other:names.get(c.handle),center:c.translation(),distance:q.distance,normal:q.normal1,point:q.point1});}}
 }
 const wireColumn=[.175,.195,.22,.35,.575].map(y=>{const p={x:-1.72,y,z:3};return{p,all:nearest(p),lower:nearest(p,lower)};});
 const transfer=RECEIVER_LAYOUT.terminal.map(p=>p.slice()),paths=lowerLanePaths(1),points={dividerFirstJoin:RECEIVER_LAYOUT.connector[0],receiverJoin:RECEIVER_LAYOUT.connector[3],outerJoin:RECEIVER_LAYOUT.outerConnector[0],outerStraightJoin:RECEIVER_LAYOUT.outerConnector[3]};
 const seamChecks=Object.entries(points).map(([name,p])=>{const segs=record.filter(r=>[r.a,r.b].some(q=>q.every((v,i)=>Math.abs(v-p[i])<1e-12)));return{name,p,incidentCapsules:segs.length,matchingCenters:segs.flatMap(r=>[r.a,r.b].filter(q=>q.every((v,i)=>Math.abs(v-p[i])<1e-12))),note:'Same exact center at adjacent capsule endpoints; their closed radius .020 solids overlap. Not a smooth-contact or natural-play proof.'};});
 const result={scope:'Assembled ordinary physics and actual lower mesh-builder output, not installed browser/global scene. No physics step, launch or geometry variant. Label text was omitted from this component-only mesh inspection.',sourceSha256:hash(fs.readFileSync(out+'/sources.json')),colliders:g.world.colliders.len(),lowerCapsules:record.length,attachments:mounts.length,cam:{meshVertices:verts.count,hullVertices:physical.length/3,maxVertexError:maxCam},mounts,railChecks,seamChecks,receiverTerminal:transfer,scanScope:'Actual divider arc-length frame, IN normal offset -.205 / OUT +.215, +/- .050 and five heights, both bat poses. The normal probe line is illustrative and can fold at the tight receiver. All negatives retained. Floors/ball/sensors excluded; open meshes surface-only. No continuous/full-height clearance assertion.',scan,batStockOverlaps:overlaps,wireColumn,saveFrame:C_SAVE,limits:['Bat-stock solid overlap records are retained; zero/negative is not silently excused by lane closure','Old fixed save still lacks moving action and completed coil bracket','Actual installed browser/camera transforms, budget, mobile and reference fidelity remain independent review gates','Receiver target and projected accepted traces are not dynamically imposed or replayed']};
 fs.writeFileSync(out+'/geometry-audit.json',JSON.stringify(result,null,2));
 const aggregate={};for(const row of scan)for(const[n,count]of Object.entries(row.negativeByName))aggregate[n]=(aggregate[n]||0)+count;
 console.log(JSON.stringify({colliders:result.colliders,lowerCapsules:record.length,attachments:mounts.length,cam:result.cam,mountMaxError:Math.max(...mounts.map(x=>x.centerError)),mountMaxAxisQuaternionError:Math.max(...mounts.map(x=>Math.abs(x.axisQuaternionError))),railMaxCenterError:Math.max(...railChecks.map(x=>x.centerError)),railMaxExtentError:Math.max(...railChecks.map(x=>x.endpointExtentError)),seamChecks,batStockOverlaps:overlaps,negativeByName:aggregate,wireGround:wireColumn[0]},null,2));
}finally{g.dispose();assets.root.traverse(m=>{m.geometry?.dispose();});for(const m of Object.values(assets.materials))m.dispose();}
