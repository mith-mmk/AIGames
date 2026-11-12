const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,'../artifacts/pinball');
 const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'}[path.extname(file)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const ctx=await browser.newContext({viewport:{width:720,height:960},recordVideo:{dir:out,size:{width:720,height:960}}});
 const page=await ctx.newPage();const trace=[];
 await page.goto(`http://127.0.0.1:${server.address().port}/pinball.html?test=1`);await page.waitForFunction(()=>window.__pinball?.game);
 await page.keyboard.press('Space');let leftUntil=0,rightUntil=0;const start=Date.now();
 while(Date.now()-start<30000){
  const s=await page.evaluate(()=>{const g=window.__pinball.game;return {time:g.time,p:g.ballPosition,v:g.ball.linvel(),phase:g.state.phase,score:g.state.score,ball:g.state.ballNumber,metrics:g.metrics};});trace.push(s);
  if(s.phase==='gameover')break;
  if(s.phase==='ready'){await page.locator('#launch').click();}
  const now=Date.now();if(s.p.z>3.25&&s.v.z>0){if(s.p.x<=0&&now>leftUntil+180)leftUntil=now+110;if(s.p.x>=0&&now>rightUntil+180)rightUntil=now+110;}
  if(now<leftUntil)await page.keyboard.down('KeyZ');else await page.keyboard.up('KeyZ');
  if(now<rightUntil)await page.keyboard.down('Slash');else await page.keyboard.up('Slash');
  await page.waitForTimeout(40);
 }
 await page.keyboard.up('KeyZ');await page.keyboard.up('Slash');await page.screenshot({path:path.join(out,'rally-final.png')});
 await ctx.close();const video=await page.video().path();fs.writeFileSync(path.join(out,'rally-trace.json'),JSON.stringify({method:'Automated browser keyboard timing, not human playtest',samples:trace},null,2));
 console.log(JSON.stringify({video,trace:path.join(out,'rally-trace.json'),seconds:(Date.now()-start)/1000,last:trace.at(-1)}));await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
