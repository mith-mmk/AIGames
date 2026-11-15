import fs from 'node:fs';
import {LOWER_LAYOUT,lowerLanePaths,TABLE} from '../../../web/js/pinball/layout.mjs';
import {sampleRamp,rampSupportStations,WIRE_TAIL,RAMP_POINTS} from '../../../web/js/pinball/ramp-geometry.mjs';
const variant=process.env.MODE||'stable';
const study=variant==='v2'?await import('../../../web/js/pinball/left-lane-study.mjs'):null;
const rows=sampleRamp();const data={variant,sourceBase:'c87f117',ballRadius:TABLE.ballRadius,paths:lowerLanePaths(-1),sling:LOWER_LAYOUT.slingVertices.map(([x,z])=>[-x,z]),sensor:{center:[-LOWER_LAYOUT.inlaneSensor[0],LOWER_LAYOUT.inlaneSensor[1],LOWER_LAYOUT.inlaneSensor[2]],half:[.125,.20,.04],score:100},pivot:LOWER_LAYOUT.flipperPivot.map((v,i)=>i===0?-v:v),wire:rows.filter(r=>r.p.z>.7&&r.p.x<0).map(r=>r.p.toArray()),wireEnd:RAMP_POINTS.at(-1),wireTangent:[1,0,WIRE_TAIL.exitSlope],supports:rampSupportStations(rows).filter(m=>m.x<0&&m.z>.7),drainZ:LOWER_LAYOUT.drainZ,save:study?.SAVE||{x:-2.10,bodyZ:3.78,trigger:{x:[-2.62,-2.08],z:[3.45,3.72]},legacyImpulse:true},frameParts:study?.FRAME_PARTS||[],labels:LOWER_LAYOUT.laneInserts};
fs.writeFileSync(new URL('./'+variant+'.json',import.meta.url),JSON.stringify(data,null,2));
