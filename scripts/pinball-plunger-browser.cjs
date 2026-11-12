const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,'../artifacts/pinball');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r)); const browser=await chromium.launch({channel:'chrome',headless:true});
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});const page=await ctx.newPage(),errors=[],results=[];page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>({phase:window.__pinball.game.state.phase,ball:window.__pinball.game.state.ballNumber,power:window.__pinball.plunger.power,owner:window.__pinball.plunger.owner}));
 const reset=async()=>{await page.locator('nav [data-restart]').click();await page.waitForFunction(()=>!document.querySelector('#launch').disabled);await page.locator('#launch').focus();};
 try {
 await page.goto(`http://127.0.0.1:${server.address().port}/pinball.html?test=1`);await page.waitForFunction(()=>window.__pinball?.game);
 // Record launches without replacing the physics implementation.
 await page.evaluate(()=>{const g=window.__pinball.game,launch=g.launch.bind(g);window.launches=[];g.launch=p=>{const ok=launch(p);if(ok)window.launches.push({power:p,speed:-g.ball.linvel().z});return ok;};});
 for (const hold of [120,600,1250]) {
  await reset();await page.keyboard.down('Space');await page.waitForTimeout(hold);assert.equal((await state()).phase,'ready');
  if(hold===600)await page.screenshot({path:path.join(out,'plunger-half-mobile.png')});
  await page.keyboard.up('Space');assert.equal((await state()).phase,'playing');
  results.push(await page.evaluate(()=>window.launches.at(-1)));
  if(hold===120){await page.waitForFunction(()=>window.__pinball.game.state.returnedShooter,{},{timeout:20000});assert.equal((await state()).ball,1);}
 }
 assert.ok(results[0].speed<results[1].speed-4 && results[1].speed<results[2].speed-4);
 for(const cancel of ['pause','restart','blur']) {
  await reset();const count=await page.evaluate(()=>window.launches.length);await page.keyboard.down('Space');await page.waitForTimeout(200);
  if(cancel==='pause')await page.keyboard.press('KeyP');
  if(cancel==='restart')await page.keyboard.press('KeyR');
  if(cancel==='blur')await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await page.keyboard.up('Space');assert.equal(await page.evaluate(()=>window.launches.length),count);assert.equal((await state()).owner,null);
 }
 // Space on another focused control must keep its native meaning.
 await reset();await page.locator('#left').focus();await page.keyboard.down('Space');assert.equal(await page.evaluate(()=>window.__pinball.state.left),true);assert.equal((await state()).owner,null);await page.keyboard.up('Space');
 // Actual touch input: pull up, reduce charge, release. No time charging after drag.
 await reset();const cdp=await ctx.newCDPSession(page),b=await page.locator('#launch').boundingBox(),t={x:b.x+b.width/2,y:b.y+b.height/2,id:1};
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...t,y:t.y-80}]});await page.waitForTimeout(100);
 assert.ok(Math.abs((await state()).power-.8)<.02);
 await page.screenshot({path:path.join(out,'plunger-drag-mobile.png')});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...t,y:t.y-40}]});await page.waitForTimeout(100);
 assert.ok(Math.abs((await state()).power-.4)<.02);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal((await state()).phase,'playing');
 await reset();const count=await page.evaluate(()=>window.launches.length);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[t]});await page.waitForTimeout(200);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal((await state()).owner,null);assert.equal(await page.evaluate(()=>window.launches.length),count);
 assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const evidence={method:'Automated Chrome keyboard and CDP touch events, real physics; no physical phone/human test',results,checks:['release-only','weak same-ball return','pause/restart/blur cancel','focused flipper Space','touch drag decrease','touch cancellation'],launches:await page.evaluate(()=>window.launches)};
 fs.writeFileSync(path.join(out,'plunger-input-evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
 } finally {await ctx.close();await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
