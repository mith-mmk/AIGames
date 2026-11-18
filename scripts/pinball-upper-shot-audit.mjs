import fs from 'node:fs';
const { PinballPhysics } = await import(process.argv[3] || '../web/js/pinball/physics.mjs');
const rows=[];
for(const speed of [8,12,16,22,28])for(const aimX of [-1.6,-.9,0,.7,1.5]) {
 const g=await PinballPhysics.create();g.launch();g.state.kickbackCharges=0;
 g.ball.setTranslation({x:0,y:.175,z:2.0},true);
 const dx=aimX,dz=-3.35,length=Math.hypot(dx,dz);g.ball.setLinvel({x:dx/length*speed,y:0,z:dz/length*speed},true);
 const events=[],track=[];const onEvent=g.state.onEvent.bind(g.state);g.state.onEvent=e=>{const ok=onEvent(e);if(ok)events.push({type:e.type,lane:e.lane,target:e.targetId,t:+g.time.toFixed(3),score:g.state.score});return ok;};
 let minZ=2,maxY=0;
 for(let t=0;t<720&&g.state.phase==='playing';t++){g.step(1/120,{left:false,right:false});const p=g.ballPosition;minZ=Math.min(minZ,p.z);maxY=Math.max(maxY,p.y);if(t%8===0)track.push([+p.x.toFixed(3),+p.y.toFixed(3),+p.z.toFixed(3)]);if(t>30&&p.z>2&&g.ball.linvel().z>0)break;}
 rows.push({speed,aimX,minZ,maxY,events,track});g.dispose();
}
const result={method:'Positioned physical entry shots from (0,.175,2), fixed angle/speed; no flipper input, not human gameplay',rows};
fs.writeFileSync(process.argv[2]||'/tmp/upper-shots.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(rows.map(({track,...r})=>r),null,2));
