import{registerHooks}from'node:module';import{execFileSync}from'node:child_process';
registerHooks({load(u,c,next){const r=next(u,c),key=u.split('/AIGames/')[1];if(!key?.startsWith('web/js/pinball/')||!key.endsWith('.mjs'))return r;let s=execFileSync('git',['show','c1f7aeb:'+key],{encoding:'utf8'});
if(key.endsWith('/ramp-geometry.mjs')){
 s=`import{designPose}from'${new URL('./route.mjs',import.meta.url).href}';import{MOUTH}from'${new URL('./receiver.mjs',import.meta.url).href}';\n`+s;
 s=s.replace('export const RAMP_POINTS = Object.freeze([','const ROUTE_POINTS = Object.freeze([').replaceAll('RAMP_POINTS.map(','ROUTE_POINTS.map(');
 const at=s.indexOf('// The prefix remains');s=s.slice(0,at)+`export const RAMP_POINTS=Object.freeze(ROUTE_POINTS.map((p,i)=>i===0?MOUTH.toArray():p));\n`+s.slice(at);
 s=s.replace('function rampPose(curve,parameter) {','function originalRampPose(curve,parameter) {');const mark=s.indexOf('export function sampleRampPose');s=s.slice(0,mark)+`function rampPose(curve,u){return designPose(t=>originalRampPose(curve,t),u);}\n`+s.slice(mark);
 s=s.replace('Math.min(rows[i].p.y,rows[i+1].p.y)<.46','Math.min(rows[i].p.y,rows[i+1].p.y)<.382');
 s=s.replace("const elevated=rows.filter((r,i)=>(r.p.y>=.46||r.p.x<0)","const elevated=rows.filter((r,i)=>(i>=37||r.p.x<0)");
 const at2=s.indexOf('  const wire=rows.slice',s.indexOf('export function rampUndersideParts'));s=s.slice(0,at2)+`
  // Connected side bearers replace the low underfloor stock, not its function.
  for(const [side,sign] of [['left',-1],['right',1]]){
   const front=rows[25],rear=rows[37],leg=rows[34],foot=new T.Vector3(sign<0?1.45:1.88,.055,leg.p.z);
   const top=foot.clone().setY(leg.p.y-.036),outside=point(leg,side,sign*.08,-.036);
   add(side+'-open-front-side-bearer','underframe',rows.slice(25,38).map(r=>point(r,side,sign*.08,.025)),.028,'chrome');
   add(side+'-open-front-foot','underframe',[foot.clone().addScaledVector(up,-.0125),foot.clone().addScaledVector(up,.0125)],.06,'brass');
   add(side+'-open-front-leg','underframe',[foot,top],.037,'chrome');
   add(side+'-open-front-crosshead','underframe',[top,outside,point(leg,side,sign*.08,.025)],.018,'brass');
   add(side+'-open-front-mount','underframe',[point(front,side,-sign*.03,-.030),point(front,side,sign*.08,-.030),point(front,side,sign*.08,.025)],.012,'brass');
   add(side+'-open-rear-mount','underframe',[point(rear,side,-sign*.045,-.065),point(rear,side,sign*.08,-.065),point(rear,side,sign*.08,.025)],.018,'brass');
  }
`+s.slice(at2);
}
if(key.endsWith('/physics.mjs')){
 s=`import{installReceiver}from'${new URL('./receiver.mjs',import.meta.url).href}';\n`+s;
 s=s.replace('      const sling = slingContactPoints(', '      if(side===1){installReceiver(this);continue;}\n      const sling = slingContactPoints(');
}
if(key.endsWith('/playfield-parts.mjs')){
 s=`import{buildReceiver}from'${new URL('./receiver.mjs',import.meta.url).href}';\n`+s;
 s=s.replace('  sling(side) {', `  sling(side) {if(side===1){const part=buildReceiver(this.a.materials);this.a.root.add(part.root);this.a.mechanical.slings.set('s1',part);return;}`);
}
if(key.endsWith('/ramp-base.mjs')){
 s=s.replace("    quad(a.right, o, b.right, q, 'outer-top', new T.Vector3(0, 1, 0));","    quad(a.right, down(a.right), b.right, down(b.right), 'right-skirt', left.clone().negate());");
 s=s.replace("    quad(o, down(o), q, down(q), 'outer-wall', new T.Vector3(1, 0, 0));",'');
 s=s.replace("    quad(down(a.right), down(o), down(b.right), down(q), 'bottom', new T.Vector3(0, -1, 0));",'');
 s=s.replace("    quad(r.right, down(r.right), o, down(o), 'endcap', outward);",'');
 s=s.replace("'outer-top': 'divider-base-top',", "'right-skirt': 'right-low-base-skirt',");
 s=s.replace('[last.left, last.right, new T.Vector3(2.35, last.p.y, last.p.z)]','[last.left, last.right]');
}
if(key.endsWith('/layout.mjs'))s=s.replace('a: [.80,.22,-1.25], b: [1.35,.22,-.70]','a: [.40,.22,-1.25], b: [.95,.22,-.70]');
r.source=s;return r;}});
