import * as T from '../vendor/three-0.180.0/three.module.min.js';
import {LOWER_LAYOUT,ENTRY_BARS,lowerLaneMounts} from './layout.mjs';
export function studyMountParts(side) {
 return lowerLaneMounts(side).flatMap(([x,y,z],i)=>[
 {name:'lane-throughboard-stem-'+side+'-'+i,center:[x,(y-.04)/2,z],radius:.018,height:y+.04,material:'steel'},
 {name:'lane-underboard-foot-'+side+'-'+i,center:[x,-.035,z],radius:.045,height:.030,material:'brass'}
 ]);
}
export function entryMountParts(x) { return [-5,-4.1].flatMap((z,i)=>[
 {name:'entry-throughboard-stem-'+x+'-'+i,center:[x,.095,z],radius:.030,height:.270,material:'brass'},
 {name:'entry-underboard-foot-'+x+'-'+i,center:[x,-.035,z],radius:.045,height:.030,material:'brass'}
 ]);}
function draw(a,parts) {for(const p of parts){const m=a.cylinder(a.root,p.radius,p.height,...p.center,p.material);m.name=p.name;}}
export function drawStudyMounts(a,side){draw(a,studyMountParts(side));}
export function drawStudyEntryMounts(a,x){draw(a,entryMountParts(x));}
export function installStudyMounts(game,R) {
 return [...[-1,1].flatMap(studyMountParts),...ENTRY_BARS.flatMap(entryMountParts)].map(p=>({...p,collider:game.world.createCollider(R.ColliderDesc.cylinder(p.height/2,p.radius).setTranslation(...p.center).setRestitution(.35).setFriction(.05))}));
}
export function laneStudyBand(label,side) {
 const p=label==='IN'?LOWER_LAYOUT.inlaneInkPath:[[2.52,2.25,.25],[2.50,3.20,.25],[2.36,3.70,.25],[2.18,4.25,.25]];
 const positions=[],uv=[],indices=[],lengths=[0];
 for(let i=1;i<p.length;i++)lengths.push(lengths.at(-1)+Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]));
 for(let i=0;i<p.length;i++){
  const a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)],d=Math.hypot(b[0]-a[0],b[1]-a[1]),nx=-(b[1]-a[1])/d,nz=(b[0]-a[0])/d,w=p[i][2]/2;
  positions.push(side*(p[i][0]-nx*w),0,p[i][1]-nz*w,side*(p[i][0]+nx*w),0,p[i][1]+nz*w);
  uv.push(0,1-lengths[i]/lengths.at(-1),1,1-lengths[i]/lengths.at(-1));
  if(i<p.length-1){const k=i*2;if(side>0)indices.push(k,k+1,k+2,k+1,k+3,k+2);else indices.push(k,k+2,k+1,k+1,k+2,k+3);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
}
