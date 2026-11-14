// Redistribute the existing gravitational drop across the flat rear joint.
// K is gz/(-gy) for this table's reduced rolling-gravity model, rounded to the
// measured reference components. Preserve these qualified values; a test checks
// TABLE.tilt against the ratio rather than silently changing the physical route.
export const RAMP_DESCENT = Object.freeze({
  start:112/240, end:136/240, arcSamples:4096,
  gravityRatio:7.218403/97.469399, endpointBlendLength:.15
});
export const RAMP_HANDOFF = Object.freeze({start:100/240,level:112/240,end:124/240,height:.017});
const {start:A,end:B,arcSamples:N,gravityRatio:K,endpointBlendLength:D}=RAMP_DESCENT;
const cache=new WeakMap();

function state(curve) {
  if(cache.has(curve))return cache.get(curve);
  const arc=[0];
  let previous=curve.getPoint(A);
  for(let i=1;i<=N;i++) {
    const p=curve.getPoint(A+(B-A)*i/N);
    arc.push(arc.at(-1)+Math.hypot(p.x-previous.x,p.z-previous.z));
    previous=p;
  }
  const start=curve.getPoint(A),end=curve.getPoint(B);
  const ta=curve.getTangent(A),tb=curve.getTangent(B);
  const a=(-ta.y+K*ta.z)/Math.hypot(ta.x,ta.z);
  const b=(-tb.y+K*tb.z)/Math.hypot(tb.x,tb.z);
  const H0=start.y-K*start.z,H1=end.y-K*end.z,L=arc.at(-1);
  // Each endpoint blends to the middle slope with equal-area smoothstep.
  // Solve its slope from the fixed total drop, not a trial velocity target.
  const m=(H0-H1-D*(a+b)/2)/(L-D);
  const result={arc,a,b,H0,H1,L,m};
  cache.set(curve,result);
  return result;
}

export function descentInfo(curve) {
  const {arc,...info}=state(curve);
  return {...info,arcSamples:arc.length,endpointBlendLength:D};
}

export function descentPose(curve,u) {
  const p=curve.getPoint(u),t=curve.getTangent(u);
  if(u<=A||u>=B)return {p,t};
  const s=state(curve),q=(u-A)/(B-A)*N,j=Math.floor(q);
  const distance=s.arc[j]+(s.arc[j+1]-s.arc[j])*(q-j);
  const integral=x=>x*x*x-.5*x*x*x*x;
  let drop,slope;
  if(distance<D) {
    const v=distance/D;
    drop=s.a*distance+(s.m-s.a)*D*integral(v);
    slope=s.a+(s.m-s.a)*v*v*(3-2*v);
  } else if(distance>s.L-D) {
    const v=(distance-s.L+D)/D;
    drop=D*(s.a+s.m)/2+s.m*(s.L-2*D)+s.m*(distance-s.L+D)+(s.b-s.m)*D*integral(v);
    slope=s.m+(s.b-s.m)*v*v*(3-2*v);
  } else {
    drop=D*(s.a+s.m)/2+s.m*(distance-D);
    slope=s.m;
  }
  p.y=s.H0-drop+K*p.z;
  const lo=Math.max(0,u-.0001),hi=Math.min(1,u+.0001);
  const derivative=curve.getPoint(hi).sub(curve.getPoint(lo)).multiplyScalar(1/(hi-lo));
  derivative.y=-slope*Math.hypot(derivative.x,derivative.z)+K*derivative.z;
  return {p,t:derivative.normalize()};
}

// Raise the real sheet above the off-center paired-rail support envelope.
// The rails and their underframe use the lower common profile at the joint;
// this is a visible material step, not an invisible floor or a velocity boost.
export function handoffLift(u) {
  const {start:a,level:b,end:c,height:h}=RAMP_HANDOFF;
  if(u<=a||u>c)return {height:0,derivative:0};
  if(u>=b)return {height:h,derivative:0};
  const v=(u-a)/(b-a);
  return {height:h*v*v*(3-2*v),derivative:h*6*v*(1-v)/(b-a)};
}
