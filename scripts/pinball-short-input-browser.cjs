// Diagnostic only: trusted browser input against RAF-paced app frames.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,'../artifacts/pinball/short-input');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});const results=[];
 try{for(const fps of [60,15,10]){
  const page=await browser.newPage({viewport:{width:720,height:960}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(fps=>{const native=window.requestAnimationFrame.bind(window);let last=0;window.requestAnimationFrame=callback=>{const run=t=>{if(t-last>=1000/fps-.2){last=t;callback(t);}else native(run);};return native(run);};},fps);
  await page.goto(`http://127.0.0.1:${server.address().port}/pinball.html?test=1`);await page.waitForFunction(()=>window.__pinball?.game);
  await page.evaluate(()=>{
   const a=window.__pinball,g=a.game;window.__inputTrace={events:[],steps:[]};
   for(const type of ['keydown','keyup','pointerdown','pointerup'])window.addEventListener(type,e=>{const entry={type,at:performance.now(),stamp:e.timeStamp,trusted:e.isTrusted,code:e.code,target:e.target.id};entry.state={left:a.state.left,right:a.state.right};window.__inputTrace.events.push(entry);},{capture:false});
   const step=g.step.bind(g);g.step=(dt,input)=>{const row={at:performance.now(),dt,input:{...input},before:[...g.flipperAngles],simBefore:g.time};const ret=step(dt,input);row.after=[...g.flipperAngles];row.simAfter=g.time;window.__inputTrace.steps.push(row);return ret;};
  });
  for(const duration of [30,250])for(const kind of ['keyboard','pointer'])for(let repeat=0;repeat<4;repeat++){
   await page.waitForTimeout(250);
   const start=await page.evaluate(()=>({at:performance.now(),event:window.__inputTrace.events.length,step:window.__inputTrace.steps.length}));
   if(kind==='keyboard')await page.keyboard.down('KeyZ');else{const b=await page.locator('#right').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();}
   await page.waitForTimeout(duration);
   if(kind==='keyboard')await page.keyboard.up('KeyZ');else await page.mouse.up();
   await page.waitForTimeout(250);
   const trace=await page.evaluate(start=>({events:window.__inputTrace.events.slice(start.event),steps:window.__inputTrace.steps.slice(start.step)}),start);
   const side=kind==='keyboard'?'left':'right',index=kind==='keyboard'?0:1;
   results.push({fps,duration,kind,repeat,observedTrue:trace.steps.some(s=>s.input[side]),maxAngularMotion:Math.max(0,...trace.steps.map(s=>Math.abs(s.after[index]-s.before[index]))),...trace});
  }
  results.push({fps,errors});await page.close();
 }}finally{fs.writeFileSync(path.join(out,'observations.json'),JSON.stringify({method:'Chrome headless trusted keyboard and mouse pointer events; native RAF callbacks selectively skipped to pace the app. Actual event/step performance.now times recorded. Ready ball in shooter, no incoming-ball or collision fixture. Tests actuator/input visibility, not contact strength, human taps, phone hardware or GPU load.',results},null,2));await browser.close();server.close();}
 console.log(JSON.stringify(results.filter(x=>x.kind).map(({events,steps,...r})=>({...r,eventDuration:events.length>=2?events[events.length-1].at-events[0].at:null})),null,2));
})().catch(e=>{console.error(e);process.exit(1);});
