import * as T from "../vendor/three-0.180.0/three.module.min.js";
import { LOWER_LAYOUT } from "./layout.mjs";

// Table-local artistic estimates shared by rendering and physics, not measured
// manufacturer dimensions. Chord approximation error is < .001 at default size.
export const FLIPPER_CONTACT = Object.freeze({ bottom: -.109, top: .034 });
export const PLUNGER_CONTACT = Object.freeze({ restZ: 4.20, pullTravel: .32 });
export function flipperProfile({length=LOWER_LAYOUT.flipperCenter+LOWER_LAYOUT.flipperHalfLength,
  halfWidth=LOWER_LAYOUT.flipperHalfWidth,
  heelBack=LOWER_LAYOUT.flipperHalfLength-LOWER_LAYOUT.flipperCenter,
  inset=halfWidth*.035-.004, samples=40}={}) {
  if (![length,halfWidth,heelBack,inset].every(Number.isFinite) || length<halfWidth*3 ||
    halfWidth<=0 || heelBack<=0 || heelBack>halfWidth || inset>=halfWidth*.6 ||
    !Number.isInteger(samples) || samples<8) throw new RangeError("Invalid flipper contact profile");
  const heelX=halfWidth-heelBack, tipX=length-halfWidth*.6;
  const a=Math.acos((halfWidth-halfWidth*.6)/(tipX-heelX));
  const points=[];
  for (const [cx,r,start,end] of [[tipX,halfWidth*.6-inset,a,-a],
    [heelX,halfWidth-inset,-a,a-Math.PI*2]]) {
    for (let i=0;i<=samples;i++) {
      const angle=start+(end-start)*i/samples;
      points.push([cx+r*Math.cos(angle),r*Math.sin(angle)]);
    }
  }
  return points;
}
export function flipperContactVertices(options={}) {
  const scale=(options.height??.29)/.29;
  if (!Number.isFinite(scale) || scale<=0) throw new RangeError("Invalid flipper height");
  const points=flipperProfile(options);
  return new Float32Array([FLIPPER_CONTACT.bottom,FLIPPER_CONTACT.top]
    .flatMap(y=>points.flatMap(([x,z])=>[x,y*scale,z])));
}
// Existing banks retain their shared score cooldown. Select the actual struck
// standup by projecting the physical ball contact onto the mounted bank.
export function targetContactId(bank,point) {
  const dx=bank.b[0]-bank.a[0], dz=bank.b[2]-bank.a[2];
  const t=Math.max(0,Math.min(1,((point.x-bank.a[0])*dx+(point.z-bank.a[2])*dz)/(dx*dx+dz*dz)));
  return `${bank.key}:${Math.min(bank.count-1,Math.floor(t*bank.count))}`;
}

export function slingRubberLoop(points, height=.22) {
  const p=points.map(q=>[...q]);
  const area=p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0);
  if(p.length!==3 || Math.abs(area)<.0001)throw new RangeError("Sling requires three noncollinear posts");
  if(area<0)p.reverse();
  const loop=[];
  for(let i=0;i<3;i++) {
    const a=p[(i+2)%3],b=p[i],c=p[(i+1)%3];
    let start=Math.atan2(-(b[0]-a[0]),b[1]-a[1]),end=Math.atan2(-(c[0]-b[0]),c[1]-b[1]);
    while(end<start)end+=Math.PI*2;
    for(let j=0;j<=10;j++) {
      const angle=start+(end-start)*j/10;
      loop.push([b[0]+.047*Math.cos(angle),height,b[1]+.047*Math.sin(angle)]);
    }
    loop.push([(b[0]+c[0])/2+.047*Math.cos(end),height,(b[1]+c[1])/2+.047*Math.sin(end)]);
  }
  return loop;
}
export function slingContactPoints(points,height=.22) {
  const curve=new T.CatmullRomCurve3(slingRubberLoop(points,height).map(p=>new T.Vector3(...p)),true,"centripetal");
  // Subdivide only curved spans: straight runs do not need dozens of capsules.
  const out=[curve.getPoint(0).toArray()];
  function append(a,b,pa,pb,depth=0) {
    const mid=(a+b)/2,pm=curve.getPoint(mid),chord=pa.clone().add(pb).multiplyScalar(.5);
    if(depth<7 && pm.distanceTo(chord)>.0015) {
      append(a,mid,pa,pm,depth+1);append(mid,b,pm,pb,depth+1);
    } else out.push(pb.toArray());
  }
  for(let i=0;i<36;i++)append(i/36,(i+1)/36,curve.getPoint(i/36),curve.getPoint((i+1)/36));
  return out;
}

export function plungerContactVertices() {
  const profile=[[.081,-.04],[.101,-.031],[.108,-.015],[.108,.026],[.09,.04]];
  return new Float32Array(profile.flatMap(([r,z])=>Array.from({length:32},(_,i)=>{
    const a=i*Math.PI/16;return [r*Math.cos(a),r*Math.sin(a),z];
  }).flat()));
}

// Visual estimates shared by the installed meshes and static strike surfaces.
export function targetDimensions(bank) {
  return {width:bank.width??Math.hypot(bank.b[0]-bank.a[0],bank.b[2]-bank.a[2])/bank.count*.84,height:bank.height??.30,depth:bank.depth??.085};
}
export function targetContactBoxes({width,height,depth}) {
  const cy=.115+.055+height/2;
  return [
    [width/2+.006,height/2+.006,depth/2+.006,cy,-depth*.15],
    [width*.435+.003,height*.435+.003,.009,cy,depth*.35+.006],
    [width*.365+.002,height*.38+.002,.006,cy,depth*.35+.018],
  ];
}

export function targetFaceAngle(bank) {
 return bank.faceAngle??-Math.atan2(bank.b[2]-bank.a[2],bank.b[0]-bank.a[0]);
}
export function targetFrontNormal(bank) {
 const angle=targetFaceAngle(bank);return [Math.sin(angle),Math.cos(angle)];
}


// Formed carrier with individual moving-face apertures; no open rear ball pocket.
// Dimensions are visual estimates. Geometry itself is also the collision source.
export function targetCarrierParts(bank) {
 if(bank.count!==3)return [];
 const d=targetDimensions(bank),length=Math.hypot(bank.b[0]-bank.a[0],bank.b[2]-bank.a[2]);
 const span=length*2/3+d.width+.10,top=.17+d.height+.045;
 function rect(w,h,r,x=0,y=0){const p=new T.Shape(),l=x-w/2;p.moveTo(l+r,y);p.lineTo(l+w-r,y);p.quadraticCurveTo(l+w,y,l+w,y+r);p.lineTo(l+w,y+h-r);p.quadraticCurveTo(l+w,y+h,l+w-r,y+h);p.lineTo(l+r,y+h);p.quadraticCurveTo(l,y+h,l,y+h-r);p.lineTo(l,y+r);p.quadraticCurveTo(l,y,l+r,y);return p;}
 function piece(inset,depth,z,open){const left=-span/2+inset,right=span/2-inset,bottom=.40+inset,upper=top-inset,edge=.032;
 let shape;
 if(open){shape=new T.Shape();shape.moveTo(left,bottom);shape.lineTo(left,upper-.025);shape.quadraticCurveTo(left,upper,left+.025,upper);shape.lineTo(right-.025,upper);shape.quadraticCurveTo(right,upper,right,upper-.025);shape.lineTo(right,bottom);shape.lineTo(right-edge,bottom);shape.lineTo(right-edge,upper-edge);shape.lineTo(left+edge,upper-edge);shape.lineTo(left+edge,bottom);shape.closePath();}
 else shape=rect(span-inset*2,top-.40-inset*2,.025,0,.40+inset);
 const geometry=new T.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:3,curveSegments:12});geometry.translate(0,0,z);return geometry;}
 const parts=[
 {name:'formed-silver-aperture-carrier',material:'chrome',geometry:piece(0,.025,-.15,true)},
 {name:'black-inset-aperture-bezel',material:'dark',geometry:piece(.012,.009,-.122,true)},
 {name:'sealed-rear-service-plate',material:'steel',geometry:piece(.004,.018,-.177,false)},
 ];
 for(let i=0;i<3;i++){const x=((i+.5)/3-.5)*length,stem=new T.CylinderGeometry(.012,.012,.44,12);stem.translate(x,.20,-.16);parts.push({name:'carrier-stud',material:'steel',geometry:stem});}
 const rail=new T.CapsuleGeometry(.045,span-.09,6,16);rail.rotateZ(Math.PI/2);rail.translate(0,.17,-.16);parts.push({name:'continuous-rounded-rear-mount-rail',material:'steel',geometry:rail});
 return parts;
}
