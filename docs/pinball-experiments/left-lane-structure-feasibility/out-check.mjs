import fs from 'node:fs';
const d=JSON.parse(fs.readFileSync(new URL('./result.json',import.meta.url))),r=d.radius,z0=d.startZ,cx=-2.3+r,theta=42*Math.PI/180;
const start=[cx-(r+.43)*Math.cos(theta),z0+(r+.43)*Math.sin(theta)],end=[-2.33+(4.3-3.35)*.28/1.53,4.3],t0=[Math.sin(theta),Math.cos(theta)],t1=[.28/Math.hypot(.28,1.53),1.53/Math.hypot(.28,1.53)],dx=end[0]-start[0],dz=end[1]-start[1],det=t0[0]*t1[1]-t0[1]*t1[0],a=(dx*t1[1]-dz*t1[0])/det,b=(t0[0]*dz-t0[1]*dx)/det,control=start.map((v,i)=>v+a*t0[i]);
const points=Array.from({length:257},(_,i)=>{const u=i/256;return start.map((v,k)=>(1-u)**2*v+2*u*(1-u)*control[k]+u*u*end[k]);});
function pseg(p,a,b){const v=b.map((x,k)=>x-a[k]),tt=Math.max(0,Math.min(1,v.reduce((s,x,k)=>s+x*(p[k]-a[k]),0)/v.reduce((s,x)=>s+x*x,0)));return Math.hypot(...p.map((x,k)=>x-a[k]-tt*v[k]));}
const divider=Array.from({length:1025},(_,i)=>{const th=d.angleDegrees*Math.PI/180*i/1024;return [cx-r*Math.cos(th),z0+r*Math.sin(th)];});
const tail=[d.join.filter((_,i)=>i!==1),d.next.filter((_,i)=>i!==1)];
let min=Infinity,at;for(let i=0;i<points.length;i++){for(let j=1;j<divider.length;j++){const gap=pseg(points[i],divider[j-1],divider[j])-.04;if(gap<min){min=gap;at=[i,j-1];}}const gap=pseg(points[i],tail[0],tail[1])-.04;if(gap<min){min=gap;at=[i,'old-tail'];}}
const qerr=Math.hypot(control[0]-(start[0]+end[0])/2,control[1]-(start[1]+end[1])/2)/2/256**2;
const result={normalOffset:.43,departureAngle:42,start,end,tangentStart:t0,tangentEnd:t1,forwardTangentIntersectionDistance:a,backwardDistance:b,quadraticControl:control,quadraticChordError:qerr,pointSampleDistanceToDividerAndFirstTail:min,pointSampleWorst:at,warning:'Static unique tangent-intersection quadratic, not installed source. Point-sampled clearance is not continuous all-solids certificate; no caps or earned save return qualification.'};console.log(JSON.stringify(result,null,2));// Read-only: print fresh values without overwriting recorded evidence.
