// One shared structural definition. No ball-state reads, trajectory correction or runtime tests.
export const WHOLE=Object.freeze({left:-3.23,right:3.65,width:6.88,centerX:.21,rear:-5.75,front:6.15,length:11.90,pivot:[1.90,.27,4.45],batLength:1.65,leftColumnX:-3.12,shooterX:2.93,railRadius:.020,neck:[1.7652264233903296,.22,4.009302854537964],outOffset:.430,chordTolerance:.0005,wireEnd:[-2.06,.44,2.75]});
const shift=2.30-WHOLE.neck[0],run=WHOLE.neck[2]-2.45;
export const RAD=(run*run+shift*shift)/(4*shift),ANGLE=2*Math.atan(shift/run),LOWER_C=Object.freeze({radius:RAD,angle:ANGLE,outOffset:.430});
export function bendFrame(t){const q=2*t,a=q<=1?q*ANGLE:(2-q)*ANGLE;return{p:q<=1?[2.30-RAD*(1-Math.cos(a)),.22,2.45+RAD*Math.sin(a)]:[2.30-RAD*(1-Math.cos(ANGLE))-RAD*(Math.cos(a)-Math.cos(ANGLE)),.22,2.45+RAD*Math.sin(ANGLE)+RAD*(Math.sin(ANGLE)-Math.sin(a))],t:[-Math.sin(a),0,Math.cos(a)],n:[Math.cos(a),0,Math.sin(a)]};}
const arcLength=2*RAD*ANGLE,totalLength=1.10+arcLength;
export function lowerCFrame(t){const s=Math.max(0,Math.min(1,t))*totalLength;if(s<=1.10)return{p:[2.30,.22,1.35+s],t:[0,0,1],n:[1,0,0]};return bendFrame((s-1.10)/arcLength);}
const dist=(p,a,b)=>{const d=b.map((v,i)=>v-a[i]),l=d.reduce((s,v)=>s+v*v,0),t=l?Math.max(0,Math.min(1,p.reduce((s,v,i)=>s+(v-a[i])*d[i],0)/l)):0;return Math.hypot(...p.map((v,i)=>v-a[i]-t*d[i]));};const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
export function bezier(c){const out=[c[0]];function add(c,depth=0){if(Math.max(dist(c[1],c[0],c[3]),dist(c[2],c[0],c[3]))<=WHOLE.chordTolerance){out.push(c[3]);return;}if(depth>16)throw Error('Unresolved Bezier');const a=mid(c[0],c[1]),b=mid(c[1],c[2]),d=mid(c[2],c[3]),e=mid(a,b),f=mid(b,d),m=mid(e,f);add([c[0],a,e,m],depth+1);add([m,f,d,c[3]],depth+1);}add(c);return out;}
const steps=Math.ceil(ANGLE/(2*Math.acos(1-WHOLE.chordTolerance/(RAD+.45))));
export const bendFrames=Array.from({length:steps*2+1},(_,i)=>bendFrame(i/(steps*2)));
const neck=WHOLE.neck,tail=bezier([neck,[neck[0],.22,neck[2]+.11],[2.07,.22,4.25],[2.07,.22,4.40]]);
export const divider=[[2.30,.22,1.35],...bendFrames.map(f=>f.p),...tail.slice(1),[2.07,.22,4.85]];
// The sling is the upper IN boundary. Begin a new inner only after its lower end.
const offset=(f,o,y=.22)=>[f.p[0]+o*f.n[0],y,f.p[2]+o*f.n[2]];
const innerAtZ=z=>{let lo=0,hi=1;for(let i=0;i<60;i++){let t=(lo+hi)/2;if(offset(bendFrame(t),-.43)[2]<z)lo=t;else hi=t;}return offset(bendFrame((lo+hi)/2),-.43);};
export const inner=[innerAtZ(2.75),...bendFrames.map(f=>offset(f,-.43)).filter(p=>p[2]>2.75&&p[2]<3.20),innerAtZ(3.20)];
function outer(side){const o=side<0?.43:.45,y=side<0?.22:.23,arc=bendFrames.map(f=>offset(f,o,y)),end=arc.at(-1);const tail=bezier([end,[end[0],y,4.12],[2.57,y,4.24],[2.57,y,4.40]]);return[...(side<0?[[2.73,.22,1.35]]:[]),...arc,...tail.slice(1),[2.57,y,4.85]];}
export function lowerSections(side){return[{role:'divider',radius:.020,points:divider},{role:'inner',radius:.020,points:inner},{role:'outer',radius:side<0?.020:.045,points:outer(side)}].map(s=>({...s,points:s.points.map(([x,y,z])=>[side*x,y,z])}));}
export function lowerLanePaths(side){return lowerSections(side).map(s=>s.points);}
export function lowerLaneMounts(side){const arcMid=bendFrame(.35).p,outerMid=offset(bendFrame(.45),side<0?.43:.45,side<0?.22:.23);const p=[[2.30,.22,1.35],[2.30,.22,2.45],arcMid,[2.07,.22,4.70],inner[0],innerAtZ(3.0),...(side<0?[[2.73,.22,1.35]]:[]),outerMid,[2.57,side<0?.22:.23,4.70]];return p.map(([x,y,z])=>[side*x,y,z]);}
const U={startX:2.75,startZ:.50,shift:.40,run:3.60};const ur=(U.run**2+U.shift**2)/(4*U.shift),ua=2*Math.atan(U.shift/U.run),un=Math.ceil(ua/(2*Math.acos(1-WHOLE.chordTolerance/(ur+.455))));
function upper(t){let q=2*t,a=q<=1?q*ua:(2-q)*ua;return{p:q<=1?[U.startX-ur*(1-Math.cos(a)),.23,U.startZ-ur*Math.sin(a)]:[U.startX-ur*(1-Math.cos(ua))-ur*(Math.cos(a)-Math.cos(ua)),.23,U.startZ-ur*Math.sin(ua)-ur*(Math.sin(ua)-Math.sin(a))],n:[Math.cos(a),0,-Math.sin(a)]};}
const upperFrames=Array.from({length:un*2+1},(_,i)=>upper(i/(un*2)));
export const SHOOTER_INNER=[[2.75,.23,5.90],...upperFrames.map(f=>f.p),[2.35,.23,-3.90]];
export const SHOOTER_OUTER=[[3.205,.23,4.95],...upperFrames.map(f=>f.p.map((v,i)=>v+.455*f.n[i])),[2.805,.23,-4.15]];
export const UPPER_ROOF=[[2.805,.23,-4.15],[2.40,.23,-5.20],[1.25,.23,-5.55],[.95,.23,-5.30]];
export const UPPER_BACKING=[[2.815,-4.15],[2.40,-5.20],[1.25,-5.55],[1.25,-5.73],[2.815,-5.73]];
// Arrow indicates a geometric tangent, not an intended ball-state velocity.
export const WIRE_EXIT_TANGENT=(()=>{let lo=0,hi=1;for(let i=0;i<60;i++){const t=(lo+hi)/2,f=bendFrame(t);if(f.p[2]-.215*f.n[2]<2.75)lo=t;else hi=t;}const f=bendFrame((lo+hi)/2);return[-f.t[0],0,f.t[2]];})();

export function shooterInnerXAtZ(z){for(let i=1;i<SHOOTER_INNER.length;i++){const a=SHOOTER_INNER[i-1],b=SHOOTER_INNER[i];if(z<=Math.max(a[2],b[2])&&z>=Math.min(a[2],b[2]))return a[0]+(b[0]-a[0])*(z-a[2])/(b[2]-a[2]);}throw Error("Support outside shooter inner range "+z);}
