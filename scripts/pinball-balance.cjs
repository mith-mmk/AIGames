// Reproducible keyboard-policy statistics. This is not a human difficulty rating.
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{execFileSync}=require('node:child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),dir=path.join(root,'web/js/pinball'),ref=process.argv[2];
 const data=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
 const read=n=>ref?execFileSync('git',['show',`${ref}:web/js/pinball/${n}`],{cwd:root,encoding:'utf8'}):fs.readFileSync(path.join(dir,n),'utf8');
 const vendors=s=>s.replace(/(["'])\.\.\/vendor\/([^"']+)\1/g,(_,q,p)=>JSON.stringify(pathToFileURL(path.join(root,'web/js/vendor',p)).href));
 const layout=data(vendors(read('layout.mjs'))),ramp=data(vendors(read('ramp-geometry.mjs'))),rules=data(read('game-state.mjs'));
 const source=vendors(read('physics.mjs')).replace(/(["'])\.\/layout\.mjs\1/g,JSON.stringify(layout)).replace(/(["'])\.\/ramp-geometry\.mjs\1/g,JSON.stringify(ramp)).replace(/(["'])\.\/game-state\.mjs\1/g,JSON.stringify(rules));
 const {PinballPhysics}=await import(data(source)),results=[];
 for(let phase=0;phase<12;phase++){
  const g=await PinballPhysics.create();g.launch();let previous,lanes=[0,0,0],relaunches=0,idle=0,maxIdle=0,lastVelocity;const onEvent=g.state.onEvent.bind(g.state);
  g.state.onEvent=e=>{const result=onEvent(e);if(result&&e.type==='rollover')lanes[e.lane]++;return result;};
  for(let tick=0;tick<120*90&&g.state.ballNumber===1&&g.state.phase!=='gameover';tick++){
   if(g.state.phase==='ready'){g.launch();relaunches++;}
   const p=g.ballPosition;previous={...p};const pulse=(tick+phase*3)%45<15;
   g.step(1/120,{left:p.x<0&&p.z>3.2&&pulse,right:p.x>=0&&p.z>3.2&&pulse});
   lastVelocity={...g.ball.linvel()};idle=Math.hypot(lastVelocity.x,lastVelocity.y,lastVelocity.z)<.05?idle+1:0;maxIdle=Math.max(maxIdle,idle);
  }
  results.push({phase,duration:g.time,drained:g.state.ballNumber>1,exit:previous,lastVelocity,maxIdleSeconds:maxIdle/120,relaunches,sideDrain:g.state.ballNumber>1&&Math.abs(previous.x)>1.9,lanes,returns:g.upfieldReturns,score:g.state.score});g.dispose();
 }
 const summary={revision:ref||'working tree',policy:'Default launch; 12 fixed pulse phases, 15/45 ticks on relevant side below z3.2; capped90s; not human playtest',drains:results.filter(r=>r.drained).length,sideDrains:results.filter(r=>r.sideDrain).length,returns:results.reduce((n,r)=>n+r.returns,0),lanes:[0,1,2].map(i=>results.reduce((n,r)=>n+r.lanes[i],0)),durations:results.map(r=>Number(r.duration.toFixed(2)))};
 const out=path.join(root,'artifacts/pinball',ref?'balance-baseline.json':'balance-current.json');fs.writeFileSync(out,JSON.stringify({summary,results},null,2));console.log(JSON.stringify({summary,out}));
})().catch(e=>{console.error(e);process.exit(1);});
