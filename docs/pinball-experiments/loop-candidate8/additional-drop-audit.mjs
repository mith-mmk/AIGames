import fs from 'node:fs';import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=process.env.PINBALL_SOURCE_ROOT||fileURLToPath(new URL('../../../',import.meta.url));
const output=process.argv[2]||'/tmp/loop-independent-drops.json';
const {PinballPhysics}=await import(root+'/web/js/pinball/physics.mjs');
const R=(await import(root+'/web/js/vendor/rapier3d-0.17.3/rapier.mjs')).default;
const files=['physics.mjs','loop.mjs','layout.mjs','scoop.mjs','game-state.mjs','missions.mjs'];const source=Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(root+'/web/js/pinball/'+f)).digest('hex')]));
const fixtures=[];
for(const [x,z]of[[-1.7,1.7],[-1.7,1.8],[-1.65,1.9],[-2.05,1.2],[-2.05,1.4],[-1.35,1.5]])for(const [vx,vz]of[[0,-.6],[.6,0]])fixtures.push({name:'mouth-side-'+x+','+z+':'+vx+','+vz,p:{x,y:.175,z},v:{x:vx,y:0,z:vz}});
for(const [x,z]of[[-1.5,.3],[-1.3,.1],[-1.9,-2.2],[-1.6,-2.2],[-1,-2.2],[-2.4,-3.5],[-1,.01],[-1.7,-5.5],[-2.1,-5.3]])fixtures.push({name:'support-top-drop-'+x+','+z,p:{x,y:1.7,z},v:{x:0,y:-1,z:0}});
const rows=[];
for(const fixture of fixtures){const g=await PinballPhysics.create({difficulty:'relaxed'});g.launch();const drains=[],events=[];const drain=g.state.drain.bind(g.state);g.state.drain=(info)=>{drains.push({time:g.time,info,position:{...g.ballPosition},velocity:{...g.ball.linvel()}});return drain(info);};const event=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const ok=event(e);if(ok)events.push({time:g.time,event:e});return ok;};let overlaps=[];g.world.forEachCollider(c=>{if(c.handle===g.ballCollider.handle||c.isSensor())return;const h=c.contactShape(new R.Ball(.135),fixture.p,{x:0,y:0,z:0,w:1},0);if(h&&h.distance<-.001)overlaps.push({handle:c.handle,distance:h.distance});});
 if(overlaps.length){rows.push({...fixture,invalidInitialOverlap:overlaps});g.dispose();continue;}
 g.ball.setTranslation(fixture.p,true);g.ball.setLinvel(fixture.v,true);const recent=[];let still=0,maxStill=0,last={...g.ballPosition},trap=null;
 for(let tick=0;tick<7200&&g.state.phase==='playing';tick++){g.step(1/120);const p=g.ballPosition,v=g.ball.linvel();if(tick>=6000)recent.push({...p});still=!g.scoopHeld&&Math.hypot(v.x,v.y,v.z)<.08&&Math.hypot(p.x-last.x,p.z-last.z)<.001?still+1:0;maxStill=Math.max(still,maxStill);last={...p};if(still>=360){trap={tick,p:{...p},v:{...v}};break;}}
 const envelope=recent.length?Object.fromEntries(['x','y','z'].map(k=>[k,[Math.min(...recent.map(p=>p[k])),Math.max(...recent.map(p=>p[k]))]])):null;const row={...fixture,drains,events,envelope,unresolved:g.state.phase==='playing',phase:g.state.phase,seconds:g.time,trap,maxStill,final:{...g.ballPosition},velocity:{...g.ball.linvel()}};rows.push(row);console.log(JSON.stringify(row));g.dispose();fs.writeFileSync(output,JSON.stringify({source,method:'Injected non-overlapping drop/slow fixtures, neutral controls; not natural play. Trap=3 seconds speed<.08 without scoop hold.',rows},null,2));}

fs.writeFileSync(output,JSON.stringify({source,method:'Injected drop/slow fixtures, not natural play. Initial overlaps skipped; trap=3 seconds speed<.08 without scoop hold.',rows},null,2));
