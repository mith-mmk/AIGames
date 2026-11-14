// Dimensioned static design, NOT a runtime replacement or an adopted source.
export const PLAN=Object.freeze({pivot:[1.25,.27,4.45],start:[1.9,.22,3],neck:[1.201035134606193,.22,4.066486926208361],stockRadius:.020,ballRadius:.135,outOffset:.430,chordTolerance:.0005,tail:[[1.201035134606193,.22,4.066486926208361],[1.201035134606193,.22,4.17],[1.42,.22,4.25],[1.42,.22,4.4]],outTail:[[1.631035134606193,.22,4.066486926208361],[1.631035134606193,.22,4.15],[1.92,.22,4.24],[1.92,.22,4.4]]});
const shift=PLAN.start[0]-PLAN.neck[0],run=PLAN.neck[2]-PLAN.start[2];
export const RAD=(run*run+shift*shift)/(4*shift),ANGLE=2*Math.atan(shift/run);
export function frame(t){const q=2*t,a=q<=1?q*ANGLE:(2-q)*ANGLE;return{p:q<=1?[1.9-RAD*(1-Math.cos(a)),.22,3+RAD*Math.sin(a)]:[1.9-RAD*(1-Math.cos(ANGLE))-RAD*(Math.cos(a)-Math.cos(ANGLE)),.22,3+RAD*Math.sin(ANGLE)+RAD*(Math.sin(ANGLE)-Math.sin(a))],t:[-Math.sin(a),0,Math.cos(a)],n:[Math.cos(a),0,Math.sin(a)]};}
const mid=(a,b)=>a.map((v,i)=>(v+b[i])/2);
const dist=(p,a,b)=>{const d=b.map((v,i)=>v-a[i]),dd=d.reduce((s,v)=>s+v*v,0),t=dd?Math.max(0,Math.min(1,p.reduce((s,v,i)=>s+(v-a[i])*d[i],0)/dd)):0;return Math.hypot(...p.map((v,i)=>v-a[i]-t*d[i]));};
export function bezier(c){const out=[[...c[0]]];function add(c,depth=0){if(Math.max(dist(c[1],c[0],c[3]),dist(c[2],c[0],c[3]))<=PLAN.chordTolerance){out.push([...c[3]]);return;}if(depth===16)throw Error('Flatness unresolved');const a=mid(c[0],c[1]),b=mid(c[1],c[2]),d=mid(c[2],c[3]),e=mid(a,b),f=mid(b,d),m=mid(e,f);add([c[0],a,e,m],depth+1);add([m,f,d,c[3]],depth+1);}add(c);return out;}
// Bound the largest circular stock (outer first bend), not only divider.
const n=Math.ceil(ANGLE/(2*Math.acos(1-PLAN.chordTolerance/(RAD+PLAN.outOffset))));
export const arcStepsPerHalf=n;
export const frames=Array.from({length:2*n+1},(_,i)=>frame(i/(2*n)));
export const paths=[ [...frames.map(f=>f.p),...bezier(PLAN.tail).slice(1),[1.42,.22,4.85]], [[1.35,.22,2.75],[1.35,.22,3.35]], [[2.33,.22,1.35],...frames.map(f=>f.p.map((v,i)=>v+PLAN.outOffset*f.n[i])),...bezier(PLAN.outTail).slice(1),[1.92,.22,4.85]] ];
const f=frame(.35),o=frame(.5);
export const mounts=[[1.9,.22,3],f.p,[1.42,.22,4.70],[1.35,.22,2.75],[1.35,.22,3.10],[2.33,.22,1.35],[2.33,.22,3],o.p.map((v,i)=>v+.43*o.n[i]),[1.92,.22,4.70]];
export const saveFrame=(()=>{let lo=0,hi=1;for(let i=0;i<60;i++){const t=(lo+hi)/2,f=frame(t);if(f.p[2]+.215*f.n[2]<3.6)lo=t;else hi=t;}const t=(lo+hi)/2,f=frame(t);return{parameter:t,center:[-(f.p[0]+.215*f.n[0]),0,f.p[2]+.215*f.n[2]],down:[-f.t[0],0,f.t[2]],cross:[f.n[0],0,-f.n[2]],note:'Geometry alignment proposal only. Existing static cam/rod/unfinished bracket and same finite earned strength/conditions; no moving actuator added.'};})();
