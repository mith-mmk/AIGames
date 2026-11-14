const assert=require('node:assert/strict');
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,'../artifacts/pinball/responsive-audit');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{const p=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(p,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css'}[path.extname(p)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{for(const [width,height]of[[320,568],[360,640],[390,844],[430,932],[844,390]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:1}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${server.address().port}/pinball.html?test=1`);await page.waitForFunction(()=>window.__pinball?.game);await page.waitForTimeout(250);
  const state=await page.evaluate(()=>{const rect=s=>{const e=document.querySelector(s),r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};return{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,canvas:rect('#table'),panels:Object.fromEntries(['.backglass','.camera-control','nav','#phase'].map(s=>[s,rect(s)])),controls:Object.fromEntries(['#left','#right','#launch'].map(s=>[s,rect(s)]))};});
  console.log(JSON.stringify(state));
  assert.equal(state.scrollWidth,state.width,'no horizontal overflow');
  const overlaps=(a,b)=>Math.min(a.right,b.right)>Math.max(a.x,b.x)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y)+1;
  for(const [name,r]of Object.entries(state.controls)){assert.ok(r.x>=0&&r.right<=width&&r.y>=0&&r.bottom<=height,name+' stays onscreen');assert.ok(r.width>=44&&r.height>=44,name+' touch area');}
  const panels=Object.entries({...state.panels,...state.controls});for(let i=0;i<panels.length;i++)for(let j=i+1;j<panels.length;j++)assert.ok(!overlaps(panels[i][1],panels[j][1]),panels[i][0]+' overlaps '+panels[j][0]);
  assert.deepEqual(errors,[]);
  await page.screenshot({path:path.join(out,`${width}x${height}.png`)});const hud=await page.locator('.backglass').evaluate(e=>{e.scrollTop=e.scrollHeight;const a=e.getBoundingClientRect(),b=document.querySelector('#multiplier-progress').getBoundingClientRect();return{clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,scrollTop:e.scrollTop,multiplierVisible:b.top>=a.top&&b.bottom<=a.bottom};});assert.ok(hud.multiplierVisible,'scroll reveals multiplier progress');if(hud.scrollTop)await page.screenshot({path:path.join(out,`${width}x${height}-hud-scrolled.png`)});results.push({...state,hud,errors});await page.close();
 }
 fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({method:'Chrome mobile viewport/touch emulation only, not physical phones or Safari.',results},null,2));console.log(JSON.stringify(results));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
