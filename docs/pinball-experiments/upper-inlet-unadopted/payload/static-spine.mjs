import fs from'node:fs';import crypto from'node:crypto';import{PinballPhysics}from'../../../web/js/pinball/physics.mjs';import{INLET_CONNECTOR,inletPose,inletRailPoints,inletInnerPoints,inletOuterPoints,inletCaseGeometry,inletMountParts}from'../../../web/js/pinball/upper-inlet-study.mjs';
const g=await PinballPhysics.create(),samples=[],centerline=[];let min={gap:Infinity},maxStep=0,prior;
const skip=c=>c.handle===g.ballCollider.handle||c.isSensor()||(c.shape.halfExtents&&Math.abs(c.translation().y+.04)<1e-8&&c.shape.halfExtents.x>2);
const caseHandles=new Set(g.inletContacts.filter(p=>p.name==='inlet-outboard-closed-cabinet-insert').map(p=>p.collider.handle));
try{
 for(let i=0;i<=1024;i++){
  const at=inletPose(i/1024).p,point={x:at.x,y:.175,z:at.z};if(prior)maxStep=Math.max(maxStep,Math.hypot(point.x-prior.x,point.z-prior.z));prior=point;
  let best={gap:Infinity};
  g.world.forEachCollider(c=>{if(skip(c))return;const solid=c.shapeType()!==6||caseHandles.has(c.handle),q=c.projectPoint(point,solid),gap=Math.hypot(point.x-q.point.x,point.y-q.point.y,point.z-q.point.z)-.135;if(gap<best.gap)best={gap,handle:c.handle,shape:c.shapeType(),colliderPosition:c.translation(),closestPoint:q.point};});
  const row={parameter:i/1024,point,...best};if(i%64===0)samples.push(row);if(best.gap<min.gap)min=row;
 }
 const geom=inletCaseGeometry(),pos=geom.attributes.position.array,finite=Array.from(pos).every(Number.isFinite);geom.dispose();
 const endpoints={inner:[inletRailPoints('inner')[0].toArray(),inletRailPoints('inner').at(-1).toArray()],outer:[inletRailPoints('outer')[0].toArray(),inletRailPoints('outer').at(-1).toArray()]};
 const result={scope:'Sampled ground-center connector spine only. All nonsensor colliders except known board floor are queried. Open trimeshes use surface projection; named closed insert uses solid projection. Not an independent continuous whole-world collision or natural-trajectory proof.',shapeTypeTriMesh:6,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync('artifacts/pinball/upper-inlet-return-3989bfe/sources.json')).digest('hex'),sampleCount:1025,min,maxStep,conservativeLipschitzBoundForThisSpine:min.gap-maxStep/2,endpoints,caseFinite:finite,mountExtents:inletMountParts().map(p=>({name:p.name,minY:p.center[1]-p.height/2,maxY:p.center[1]+p.height/2})),samples,colliders:g.world.colliders.len(),inletContacts:g.inletContacts.length};
 fs.writeFileSync('artifacts/pinball/upper-inlet-return-3989bfe/static-spine.json',JSON.stringify(result,null,2));console.log(JSON.stringify({min:result.min,bound:result.conservativeLipschitzBoundForThisSpine,endpoints,caseFinite:finite},null,2));
}finally{g.dispose();}
