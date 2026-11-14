import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import R from '../vendor/rapier3d-0.17.3/rapier.mjs';
import {MechanicalRamp} from './components/ramp-wire.mjs';
import {PinballPhysics} from './physics.mjs';
import {sampleRamp,RAMP_WALL_HEIGHT,lowRampSegments} from './ramp-geometry.mjs';
import {RAMP_HARDWARE_DIMENSIONS} from './ramp-hardware.mjs';

function meshDistance(mesh,p){
 let distance=Infinity;
 const a=mesh.geometry.attributes.position,ix=mesh.geometry.index;
 for(let k=0;k<ix.count;k+=3){
  const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(a,ix.getX(k+j)).applyMatrix4(mesh.matrixWorld));
  distance=Math.min(distance,new T.Triangle(...v).closestPointToPoint(p,new T.Vector3()).distanceTo(p));
 }
 return distance;
}

test('missing acrylic contacts lie on real visible exterior faces without duplicating top inner or lip faces',async()=>{
 const g=await PinballPhysics.create(),assembly=new MechanicalRamp();
 try{
  assembly.root.updateMatrixWorld(true);const rows=sampleRamp();
  assert.equal(g.ramp.acrylicContacts.length,7);
  assert.equal(g.ramp.acrylicFirstOpenRow,lowRampSegments(rows).at(-1).index+1);
  assert.equal(g.ramp.acrylicContacts.reduce((n,p)=>n+p.indexCount/3,0),1478);
  for(const part of g.ramp.acrylicContacts){
   const {name,collider,indexOffset,indexCount}=part,shape=collider.shape;
   const sourceName=name.endsWith('-exterior-contact')?name.replace('-exterior-contact',''):(name.startsWith('left')?'left':'right')+'-folded-wall';
   const mesh=assembly.root.getObjectByName(sourceName);assert.ok(mesh,name);
   for(let k=indexOffset;k<indexOffset+indexCount;k+=3){
    const v=[0,1,2].map(j=>new T.Vector3(...shape.vertices.slice(shape.indices[k+j]*3,shape.indices[k+j]*3+3)));
    const center=v[0].clone().add(v[1]).add(v[2]).multiplyScalar(1/3);
    // Independently measure against installed visible triangles, not the factory.
    for(const p of [center,...v.map(p=>p.clone().lerp(center,.01))])assert.ok(meshDistance(mesh,p)<3e-7,name);
    for(const existing of g.ramp.colliders.slice(0,3)){
     const q=existing.projectPoint(center,true);
     assert.ok(center.distanceTo(new T.Vector3(q.point.x,q.point.y,q.point.z))>.001,'duplicate deck/inner face: '+name);
    }
    const normal=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0])).normalize();
    assert.ok(normal.length()>.99,name);
    if(name.endsWith('-end-contact')){
     const endpoint=name.includes('-entry-')?0:124,r=rows[endpoint];
     assert.ok(normal.dot(r.t)*(endpoint===0?-1:1)>0,'end outward winding: '+name);
     assert.ok(Math.max(...v.map(p=>p.y))<=r.p.y+RAMP_WALL_HEIGHT-RAMP_HARDWARE_DIMENSIONS.sheet+1e-7,'lip end must not be duplicated');
    }else{
     // Geometric classification, independent of vertex ordering and factory metadata.
     const nearest=rows.slice(0,125).map((r,i)=>({r,i,d:r.p.distanceTo(center)})).sort((a,b)=>a.d-b.d)[0];
     const row=nearest.r;
     if(name.startsWith('continuous-floor')){
      let distance=Infinity,strip=-1;
      for(let i=0;i<124;i++)for(const pts of [[rows[i].left,rows[i].right,rows[i+1].left],[rows[i].right,rows[i+1].right,rows[i+1].left]]){
       const t=new T.Triangle(...pts.map(p=>p.clone().add(new T.Vector3(0,-RAMP_HARDWARE_DIMENSIONS.sheet,0))));
       const d=t.closestPointToPoint(center,new T.Vector3()).distanceTo(center);
       if(d<distance){distance=d;strip=i;}
      }
      assert.ok(strip>=lowRampSegments(rows).at(-1).index+1,'sealed low underside must not be duplicated: '+strip);
     }
     const exit=rows[124];
     const exitTangent=exit.t.clone().setY(0).normalize();
     const exitPlane=p=>Math.abs(p.clone().sub(exit.p).dot(exitTangent));
     if(v.every(p=>exitPlane(p)<1e-6))assert.ok(normal.dot(exit.t)>0,'floor exit cap outward');
     else if(Math.abs(normal.y)>.1)assert.ok(normal.y<0,'underside/bevel faces downward: '+name);
     else {
      const side=name.startsWith('left')?'left':name.startsWith('right')?'right':
       (center.distanceTo(row.left)<center.distanceTo(row.right)?'left':'right');
      const out=row[side].clone().sub(row.p);
      assert.ok(normal.dot(out)>0,'outer wall/edge winding: '+name);
     }
    }
   }
  }
 }finally{assembly.dispose();g.dispose();}
});

const probes=[
 {name:'left-ground',mesh:'left-folded-wall',p:[1.02155699366,.175,.84688889172],v:[1.798028065,0,.875839641]},
 {name:'right-air',mesh:'right-folded-wall',p:[2.0394131781132456,.3735515289604664,1.2320649986112404],v:[-1.76096575016,.8,-.94815590847]},
 {name:'underside-rise',mesh:'continuous-floor-with-underside',p:[1.71408365416,.33310025297,-.70816789141],v:[.18762692644,2.65743803682,.71743994582]}
];
test('legal ground and rising airborne balls hit the visible acrylic exterior',async()=>{
 for(const f of probes){
  const outcomes=[];
  for(const enabled of [true,false]){
   const g=await PinballPhysics.create(),assembly=new MechanicalRamp();
   try{
    assembly.root.updateMatrixWorld(true);
    const c=g.ramp.acrylicContacts[0].collider;
    if(!enabled){
     const shape=c.shape,metalEnd=g.ramp.acrylicContacts[0].indexOffset;
     // Keep identical metal surfaces and edge correction in the control world.
     g.world.removeCollider(c,true);
     g.world.createCollider(R.ColliderDesc.trimesh(shape.vertices,shape.indices.slice(0,metalEnd),R.TriMeshFlags.FIX_INTERNAL_EDGES).setFriction(.025).setRestitution(.02));
    }
    const p=new T.Vector3(...f.p);
    g.world.forEachCollider(c=>{
     if(c.handle===g.ballCollider.handle||c.isSensor())return;
     const q=c.projectPoint(p,true);
     assert.ok(p.distanceTo(new T.Vector3(q.point.x,q.point.y,q.point.z))>=.135-1e-4,'legal initial sphere: '+f.name);
    });
    g.launch();g.state.kickbackCharges=0;g.state.sideSaveCharges=0;
    g.ball.setTranslation(p,true);g.ball.setLinvel(new T.Vector3(...f.v),true);
    let contact=false;
    for(let tick=0;tick<8;tick++){
     g.step(1/120);
     if(enabled)g.world.contactPair(g.ballCollider,c,m=>{
      const p=new T.Vector3(g.ballPosition.x,g.ballPosition.y,g.ballPosition.z);
      if(m.numContacts()>0&&meshDistance(assembly.root.getObjectByName(f.mesh),p)<.14)contact=true;
     });
    }
    if(enabled)assert.ok(contact,'visible face must really contact: '+f.name);
    outcomes.push(new T.Vector3(g.ballPosition.x,g.ballPosition.y,g.ballPosition.z));
   }finally{assembly.dispose();g.dispose();}
  }
  assert.ok(outcomes[0].distanceTo(outcomes[1])>.01,'exterior must alter trajectory: '+f.name);
 }
});
