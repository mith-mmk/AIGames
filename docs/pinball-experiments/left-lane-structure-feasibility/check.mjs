import fs from 'node:fs';
import * as T from '../../../web/js/vendor/three-0.180.0/three.module.min.js';
import {lowerLanePaths,LOWER_LAYOUT} from '../../../web/js/pinball/layout.mjs';
import {slingContactPoints} from '../../../web/js/pinball/mechanical-contact.mjs';
import {sampleRamp,rampSupportStations,rampWireRails,WIRE_START_FRACTION} from '../../../web/js/pinball/ramp-geometry.mjs';
const old=lowerLanePaths(-1)[0],join=old[21],next=old[22],t=new T.Vector3(...next).sub(new T.Vector3(...join)).normalize();
const angle=Math.atan2(t.x,t.z),r=(2.30+join[0])/(1-Math.cos(angle)),startZ=join[2]-r*Math.sin(angle),cx=-2.30+r;
const arc=Array.from({length:257},(_,i)=>{const a=angle*i/256;return [cx-r*Math.cos(a),.22,startZ+r*Math.sin(a)];});
const candidate=[[-2.30,.22,1.35],...arc,...old.slice(22)];
function segdist(p1,q1,p2,q2){const d1=q1.clone().sub(p1),d2=q2.clone().sub(p2),r=p1.clone().sub(p2),a=d1.dot(d1),e=d2.dot(d2),f=d2.dot(r),c=d1.dot(r),b=d1.dot(d2),den=a*e-b*b;let s=den?Math.max(0,Math.min(1,(b*f-c*e)/den)):0,tt=(b*s+f)/e;if(tt<0){tt=0;s=Math.max(0,Math.min(1,-c/a));}else if(tt>1){tt=1;s=Math.max(0,Math.min(1,(b-c)/a));}return p1.clone().addScaledVector(d1,s).distanceTo(p2.clone().addScaledVector(d2,tt));}
const vectors=p=>p.map(p=>new T.Vector3(...p));
function minPair(a,b,ra,rb){a=vectors(a);b=vectors(b);let min=Infinity,indices;for(let i=1;i<a.length;i++)for(let j=1;j<b.length;j++){const d=segdist(a[i-1],a[i],b[j-1],b[j])-ra-rb;if(d<min){min=d;indices=[i-1,j-1];}}return {min,indices};}
const sling=slingContactPoints(LOWER_LAYOUT.slingVertices.map(([x,z])=>[-x,z]));
const rows=sampleRamp(),stations=rampSupportStations(rows),wires=rampWireRails(rows.slice(Math.round((rows.length-1)*WIRE_START_FRACTION)));
const atZ=z=>z<=startZ?-2.30:cx-Math.sqrt(r*r-(z-startZ)**2);
const out={join,next,tangent:t.toArray(),radius:r,startZ,angleDegrees:angle*180/Math.PI,joinError:Math.hypot(...arc.at(-1).map((v,i)=>v-join[i])),analyticTangentDot:t.dot(new T.Vector3(Math.sin(angle),0,Math.cos(angle))),arcChordError:r*(1-Math.cos(angle/512)),oldTailPointsUnchanged:old.length-21,newPortionVsSling:minPair(candidate.slice(0,258),sling,.020,.025),newPortionVsWire:wires.map(w=>minPair(candidate.slice(0,258),w.map(p=>p.toArray()),.020,.018)),lastSupport:stations.at(-1),atSupportZ:{x:atZ(3),bareRailToPostSurface:(-2.65-atZ(3))*-1-.020-.037},frame:{wallX:[-2.87,-2.73],wallY:[-.05,.385],timberX:[-2.91,-2.75],timberTop:.28,proposedFootAtMinus285:[-2.935,-2.765]},straightOutBareSurfaceWidth:2.73-2.30-.020,straightOutFloorCenterWidth:2.73-.135-(2.30+Math.sqrt(.155**2-.045**2)),straightOutWithCapFloorCenterWidth:2.73-.135-(2.30+.065+Math.sqrt(.135**2-.0325**2)),crossheadGroundVerticalGap:.38-.034-(.04+.27),limits:['Arc is feasibility mathematics, not installed candidate','No clamp or wall bracket design generated','No dynamic or whole-world sphere-path proof','Sling/wire distances cover proposed new divider only, not unchanged tail defects']};
console.log(JSON.stringify(out,null,2));// Read-only: stdout is the fresh measurement; the recorded JSON is not overwritten.
