const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{execFileSync}=require('node:child_process');
(async()=>{
 const root=process.cwd(),out=path.join(root,'artifacts/pinball/lower-rail-closed-replay/preview');fs.mkdirSync(out,{recursive:true});
 const git=f=>execFileSync('git',['show','172b821:'+f],{cwd:root,maxBuffer:32*1024*1024});
 const sources=JSON.parse(fs.readFileSync('docs/pinball-experiments/lower-rail-closed-stock/payload/sources.json','utf8'));
 fs.writeFileSync(path.join(out,'served-candidate-sources.json'),JSON.stringify(sources));
 const oldSources={}; const cache=new Map(),errors=[];
 const server=http.createServer((req,res)=>{
   let pathname=new URL(req.url,'http://localhost').pathname;const match=pathname.match(/^\/(stable|baseline|candidate)\/(.*)$/);if(!match)return res.writeHead(404).end();
   const mode=match[1],rel=match[2];if(rel==='component'){res.setHeader('Content-Type','text/html');return res.end('<html><title>Support comparison</title></html>');}
   if(rel.includes('..'))return res.writeHead(403).end();
   try{let body;
     if(mode==='candidate'&&sources['web/'+rel])body=sources['web/'+rel];else if(mode==='baseline'&&oldSources['web/'+rel])body=oldSources['web/'+rel].replaceAll('/candidate/','/baseline/');
     else{if(!cache.has(rel))cache.set(rel,git('web/'+rel));body=cache.get(rel);}
     res.setHeader('Content-Type',{'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.wasm':'application/wasm'}[path.extname(rel)]||'application/octet-stream');res.end(body);
   }catch(e){res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{
   for(const mode of['baseline','candidate']){
     const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:1});
     page.on('pageerror',e=>errors.push({mode,error:String(e)}));
     await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
     await page.goto('http://127.0.0.1:'+server.address().port+'/'+mode+'/pinball.html?test=1');
     await page.waitForFunction(()=>window.__pinball?.game);await page.waitForTimeout(500);
     await page.evaluate(()=>window.__pinball.renderer.setAnimationLoop(null));
     for(const angle of[45,10,90]){
       await page.locator('#view-angle').evaluate((e,a)=>{e.value=a;e.dispatchEvent(new Event('input',{bubbles:true}));},angle);
       const r=await page.evaluate(()=>{const a=window.__pinball;a.renderer.render(a.scene,a.camera);return {triangles:a.renderer.info.render.triangles,calls:a.renderer.info.render.calls};});
       await page.screenshot({path:path.join(out,mode+'-installed-'+angle+'.png')});results.push({mode,view:'installed-'+angle,...r});
     }
     await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);
     await page.locator('#view-angle').evaluate(e=>{e.value=45;e.dispatchEvent(new Event('input',{bubbles:true}));});
     await page.evaluate(()=>{const a=window.__pinball;a.renderer.render(a.scene,a.camera);});
     await page.screenshot({path:path.join(out,mode+'-mobile-390.png')});
     await page.setViewportSize({width:1200,height:900});await page.waitForTimeout(700);await page.evaluate(()=>window.scrollTo(0,0));
     for(const view of ['lower-left-top','lower-left-end','lower-right-end']){
       await page.evaluate(view=>{const a=window.__pinball,c=a.camera;c.zoom=1;c.up.set(0,1,0);const side=view==='lower-right-end'?1:-1;const t={x:side*1.5,y:.22,z:4};const p=a.board.localToWorld(c.position.clone().set(t.x,t.y,t.z));const dir=view==='lower-left-top'?[0,2.8,.1]:[side*.5,.6,1.6];c.position.copy(p).add(c.position.clone().set(...dir));c.lookAt(p);c.fov=48;c.updateProjectionMatrix();c.updateMatrixWorld(true);a.renderer.render(a.scene,c);},view);
       await page.screenshot({path:path.join(out,mode+'-'+view+'.png')});
     }
     await page.close();
   }
   fs.writeFileSync(path.join(out,'evidence.json'),JSON.stringify({baseline:'172b821 stable',candidate:'closed lower rail capsule stock',results,errors,scope:'Installed views and closeups; no geometry hidden or inspection lighting added. Desktop/mobile emulation, not physical phone or strength certification.'},null,2));
   console.log(JSON.stringify({out,errors,results},null,2));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
