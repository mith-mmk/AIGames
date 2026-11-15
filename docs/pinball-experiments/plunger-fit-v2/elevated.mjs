import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import {PinballPhysics} from '../../../web/js/pinball/physics.mjs';
const mode=process.env.MODE||'baseline',height=Number(process.env.HEIGHT||.55),cases=[];
const specs=[... [4.9,5.15,5.4,5.65].flatMap(z=>[[0,-2],[0,2],[-1,0],[1,0]].map(([vx,vz])=>({x:2.53,y:height,z,vx,vy:-2,vz}))),...[2.46,2.60].flatMap(x=>[0,3].map(vz=>({x,y:height,z:5.35,vx:0,vy:-2,vz})))];
for(const spec of specs){const g=await PinballPhysics.create();if(process.env.EXPECTED_CONTACTS!==undefined&&((g.plungerFitContacts?.length)||0)!==Number(process.env.EXPECTED_CONTACTS))throw Error('Wrong active runtime contact count');g.launch(1);g.state.kickbackCharges=0;const start={x:spec.x,y:spec.y,z:spec.z},v={x:spec.vx,y:spec.vy,z:spec.vz},overlaps=[];
g.world.forEachCollider(c=>{if(c.handle===g.ballCollider.handle||c.isSensor())return;const hit=c.contactShape(g.ballCollider.shape,start,{x:0,y:0,z:0,w:1},0);if(hit&&hit.distance< -1e-5)overlaps.push({handle:c.handle,distance:hit.distance});});
g.ball.setTranslation(start,true);g.ball.setLinvel(v,true);g.ball.setAngvel({x:0,y:0,z:0},true);const frames=[],contacts=new Set();let lastMotion=0;
for(let tick=0;tick<960&&g.state.phase==='playing';tick++){g.step(1/120);const p=g.ballPosition,v=g.ball.linvel();if(Math.hypot(v.x,v.y,v.z)>.03)lastMotion=tick;
for(const part of g.plungerFitContacts||[])g.world.contactPair(g.ballCollider,part.collider,m=>{if(m.numContacts())contacts.add(part.name);});
frames.push({tick,p:{...p},v:{...v},phase:g.state.phase,ball:g.state.ballNumber});}
const end=frames.at(-1);cases.push({spec,initialOverlaps:overlaps,initialLegal:overlaps.length===0,final:end,settledFor:(frames.length-1-lastMotion)/120,stalledBehindTip:end?.phase==='playing'&&end.p.z>4.9&&(frames.length-1-lastMotion)>240,contacts:[...contacts],frames});g.dispose();}
const out=new URL('../../../artifacts/pinball/plunger-fit-v2-replay/',import.meta.url);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(new URL(mode+'-elevated.json.gz',out),gzipSync(JSON.stringify({method:'20 explicitly injected elevated diagnostic states, no claim of natural reachability. Zero artificial save charges. Eight-second limit, no rescue. Legal starts checked against actual solids. StalledBehindTip means >2s speed≤.03 behindZ4.9 while still playing.',cases})));
const summary=cases.map(({frames,...r})=>r);fs.writeFileSync(new URL(mode+'-elevated-summary.json',out),JSON.stringify(summary,null,2));console.log(JSON.stringify({mode,cases:cases.length,initialLegal:cases.filter(c=>c.initialLegal).length,stalledBehindTip:cases.filter(c=>c.stalledBehindTip).length,returned:cases.filter(c=>c.final?.phase==='ready'&&c.final.ball===1).length,drained:cases.filter(c=>c.final?.ball>1).length}));
