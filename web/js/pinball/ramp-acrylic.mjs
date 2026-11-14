import {rampDeckGeometry} from './ramp-deck.mjs';
import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {loft,RAMP_HARDWARE_DIMENSIONS} from './ramp-hardware.mjs';
const UP=new T.Vector3(0,1,0);

// Full visible sheets and the missing exterior faces come from the same loft.
export function rampAcrylicParts(input,wall){
 const rows=input.map(r=>({...r,n:r.right.clone().sub(r.left).setY(0).normalize()}));
 const sheet=RAMP_HARDWARE_DIMENSIONS.sheet;
 return ['underside','left','right'].map(kind=>{
  const sign=kind==='left'?-1:1;
  const sections=rows.map(r=>kind==='underside'?
   [r.left.clone(),r.right.clone(),r.right.clone().addScaledVector(UP,-sheet),r.left.clone().addScaledVector(UP,-sheet)]:
   [r[kind].clone(),r[kind].clone().addScaledVector(UP,wall),r[kind].clone().addScaledVector(r.n,sign*sheet).addScaledVector(UP,wall),r[kind].clone().addScaledVector(r.n,sign*sheet).addScaledVector(UP,-sheet)]);
  const maps=sections.map((section,i)=>{
   const area=section.reduce((sum,p,j)=>{const q=section[(j+1)%4];return sum+p.dot(rows[i].n)*q.y-q.dot(rows[i].n)*p.y;},0);
   return area>0?[3,2,1,0]:[0,1,2,3];
  });
  return {name:kind==='underside'?'continuous-floor-with-underside':kind+'-folded-wall',
   kind,rows,maps,geometry:kind==='underside'?rampDeckGeometry(rows,'solid'):loft(rows,r=>sections[rows.indexOf(r)].map(p=>p.clone()))};
 });
}

// Existing deck top and channel-facing wall contacts remain untouched.
// Sealed low-base interior faces cannot be reached and are not duplicated.
export function rampAcrylicContactParts(parts,wall,firstOpenRow){
 const contacts=[],sheet=RAMP_HARDWARE_DIMENSIONS.sheet;
 for(const part of parts){
  // The deck has a locally conforming mesh, not the four-vertex loft layout.
  if(part.kind==='underside'){
   contacts.push({name:part.name+'-exterior-contact',geometry:rampDeckGeometry(part.rows,'contact',firstOpenRow),sourceName:part.name});
   continue;
  }
  const {kind,maps,rows,geometry}=part,source=geometry.index.array,indices=[];
  for(let k=0;k<source.length;k+=3){
   const tri=[source[k],source[k+1],source[k+2]],rs=tri.map(v=>Math.floor(v/4));
   const first=Math.min(...rs),last=Math.max(...rs);
   if(first===last){
    if(kind==='underside'&&first===rows.length-1)indices.push(...tri);
    continue;
   }
   if(kind==='underside'&&first<firstOpenRow)continue;
   const edge=(a,b)=>tri.every(v=>[a,b].includes(maps[Math.floor(v/4)][v%4]));
   if(edge(2,3)||((kind==='underside'||first>=firstOpenRow)&&edge(3,0))||(kind==='underside'&&edge(1,2)))indices.push(...tri);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',geometry.attributes.position.clone());g.setIndex(indices);g.computeVertexNormals();
  contacts.push({name:part.name+'-exterior-contact',geometry:g,sourceName:part.name});
 }
 const rows=parts[0].rows;
 for(const side of ['left','right'])for(const endpoint of [0,rows.length-1]){
  const r=rows[endpoint],sign=side==='left'?-1:1,base=r[side],outside=base.clone().addScaledVector(r.n,sign*sheet);
  // The lip already supplies the upper .018 of the end face.
  const points=[base.clone(),base.clone().addScaledVector(UP,wall-sheet),outside.clone().addScaledVector(UP,wall-sheet),outside.clone().addScaledVector(UP,-sheet)];
  const normal=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));
  const direction=r.t.clone().multiplyScalar(endpoint===0?-1:1),reverse=normal.dot(direction)<0;
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));
  g.setIndex(reverse?[0,2,1,0,3,2]:[0,1,2,0,2,3]);g.computeVertexNormals();
  contacts.push({name:side+'-wall-'+(endpoint===0?'entry':'exit')+'-end-contact',geometry:g,sourceName:side+'-folded-wall'});
 }
 return contacts;
}
