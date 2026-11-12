const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,'../artifacts/pinball');
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const ctx=await browser.newContext({viewport:{width:720,height:960},hasTouch:true,recordVideo:{dir:out,size:{width:720,height:960}}});
 const page=await ctx.newPage(),results=[];
 const sample=()=>page.evaluate(()=>{const a=window.__pinball,g=a.game;return {time:g.time,p:{...g.ballPosition},v:{...g.ball.linvel()},phase:g.state.phase,metrics:g.metrics,input:{left:a.state.left,right:a.state.right}};});
 try{
 await page.goto(`http://127.0.0.1:${server.address().port}/pinball.html?test=1`);await page.waitForFunction(()=>window.__pinball?.game);
 for(const side of [-1,1]){
  const key=side<0?'KeyZ':'Slash';await page.keyboard.press('KeyR');await page.keyboard.press('Space');await page.keyboard.down(key);await page.waitForTimeout(300);
  // Explicit incoming-ball fixture. Capture/hold/release/reflip use physics and real browser key events.
  await page.evaluate(side=>{const g=window.__pinball.game;g.state.kickbackCharges=0;g.ball.setTranslation({x:side*.85,y:.18,z:3.15},true);g.ball.setLinvel({x:0,y:0,z:2},true);},side);
  await page.waitForTimeout(3200);const held=await sample();await page.waitForTimeout(1500);const still=await sample();
  assert.equal(still.phase,'playing');assert.ok(Math.hypot(still.p.x-held.p.x,still.p.z-held.p.z)<.03,JSON.stringify({held,still}));
  await page.screenshot({path:path.join(out,`cradle-${side<0?'left':'right'}.png`)});
  await page.keyboard.up(key);await page.waitForTimeout(450);await page.keyboard.down(key);let shot;
  for(let i=0;i<40;i++){shot=await sample();if(shot.p.z<2.8&&shot.v.z<0)break;await page.waitForTimeout(10);}
  assert.ok(shot.p.z<2.8&&shot.v.z<-5,JSON.stringify(shot));await page.waitForFunction(()=>window.__pinball.game.state.rollovers[1],{},{timeout:4000});await page.screenshot({path:path.join(out,`central-B-${side<0?'left':'right'}.png`)});results.push({side,held,still,shot,centralB:true});await page.keyboard.up(key);
 }
 // Real touch events (not manually setting game input), including simultaneous capture and release.
 await page.setViewportSize({width:390,height:844});await page.keyboard.press('KeyR');await page.locator('#launch').click();
 const cdp=await ctx.newCDPSession(page),b=await page.locator('#left').boundingBox(),touch={x:b.x+b.width/2,y:b.y+b.height/2,id:1};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});await page.waitForTimeout(300);
 await page.evaluate(()=>{const g=window.__pinball.game;g.state.kickbackCharges=0;g.ball.setTranslation({x:-.85,y:.18,z:3.15},true);g.ball.setLinvel({x:0,y:0,z:2},true);});
 await page.waitForTimeout(3200);const held=await sample();assert.equal(held.input.left,true);await page.screenshot({path:path.join(out,'cradle-touch.png')});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(450);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});let shot;
 for(let i=0;i<40;i++){shot=await sample();if(shot.p.z<2.8&&shot.v.z<0)break;await page.waitForTimeout(10);}
 assert.ok(shot.p.z<2.8&&shot.v.z<-5,JSON.stringify(shot));await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForFunction(()=>window.__pinball.game.state.rollovers[1],{},{timeout:4000});await page.screenshot({path:path.join(out,'central-B-touch.png')});results.push({touch:true,held,shot,centralB:true});
 // Left cradle -> timed shot -> complete physical ramp return. No entry teleport.
 await page.setViewportSize({width:720,height:960});await page.keyboard.press('KeyR');await page.locator('#launch').click();await page.keyboard.down('KeyZ');await page.waitForTimeout(300);
 await page.evaluate(()=>{const g=window.__pinball.game;g.state.kickbackCharges=0;g.ball.setTranslation({x:-.85,y:.18,z:3.15},true);g.ball.setLinvel({x:0,y:0,z:2},true);});
 await page.waitForTimeout(3200);await page.keyboard.up('KeyZ');await page.waitForTimeout(690);await page.keyboard.down('KeyZ');
 const rampTrace=[];let rear=false,exit=false;
 for(let i=0;i<240;i++){const s=await sample();rampTrace.push(s);if(!rear&&s.p.y>.6&&s.p.z< -3){rear=true;await page.screenshot({path:path.join(out,'ramp-keyboard-crest.png')});}if(rear&&s.p.x< -.4&&s.p.z>3.1&&s.p.y<.4)exit=true;await page.waitForTimeout(20);}
 assert.ok(rear&&exit,'real keyboard ramp traversal failed');await page.waitForTimeout(1200);const recaptured=await sample();assert.ok(Math.hypot(recaptured.v.x,recaptured.v.z)<.05);await page.screenshot({path:path.join(out,'ramp-return-cradle.png')});await page.keyboard.up('KeyZ');await page.waitForTimeout(500);await page.keyboard.down('KeyZ');await page.waitForTimeout(180);const secondShot=await sample();assert.equal(secondShot.metrics.coilImpulses[0],2);await page.keyboard.up('KeyZ');results.push({ramp:true,rear,exit,recaptured,secondShot,trace:rampTrace});
 }finally{await ctx.close();const video=await page.video().path();fs.writeFileSync(path.join(out,'control-input-evidence.json'),JSON.stringify({method:'Automated real keyboard/touch events with explicitly positioned incoming fixtures; not human playtest or physical phone',results,video},null,2));console.log(JSON.stringify({results:results.map(({trace,...r})=>({...r,traceSamples:trace?.length})),video}));await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
