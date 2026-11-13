const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,'../artifacts/pinball/installed-review');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((q,r)=>{const f=path.resolve(root,'.'+new URL(q.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return r.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return r.writeHead(404).end();r.setHeader('Content-Type',{'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css'}[path.extname(f)]||'application/octet-stream');r.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(`http://127.0.0.1:${server.address().port}/pinball.html?test=1`);await page.waitForFunction(()=>window.__pinball?.game);await page.evaluate(()=>window.__pinball.renderer.setAnimationLoop(null));const results=[];
 // Use the installed layout. A camera or contact fixture must not keep checking
 // the old part position after a valid reference-driven relocation.
 const views=await page.evaluate(async()=>{
   const {LOWER_LAYOUT:lower,BUMPERS,TARGET_BANKS}=await import('/js/pinball/layout.mjs');
   return [['flipper',[-lower.flipperPivot[0],.2,lower.flipperPivot[2]],3],['bumper',[BUMPERS[0].x,.2,BUMPERS[0].z],3.8],['sling',[lower.slingCenter[0],.2,lower.slingCenter[1]],3],
    ...TARGET_BANKS.map(b=>[`target-${b.key}`,[(b.a[0]+b.b[0])/2,.3,(b.a[2]+b.b[2])/2],3]),
    ['plunger',[2.53,.175,4.7],3],['ramp',[1.3,.5,-2],6],['wire',[-1.9,.7,1.2],5],['cabinet',[0,-.4,4.8],7]];
 });
 for(const [name,center,distance] of views)for(const view of ['top','45','side','cutaway-side']){
   await page.evaluate(async({center,distance,view})=>{
     const a=window.__pinball,T=await import('/js/vendor/three-0.180.0/three.module.min.js');a.board.updateMatrixWorld(true);const c=new T.Vector3(...center);
     a.assets.mechanical.cabinet.setInspectionMode(view==='cutaway-side'?'cutaway':'assembled');a.assets.mechanical.cabinet.root.visible=view!=='cutaway-side';
     const offset=view==='top'?new T.Vector3(0,1,.001):view==='45'?new T.Vector3(1,Math.SQRT2,1):new T.Vector3(1,.04,0);
     a.camera.zoom=1;a.camera.updateProjectionMatrix();a.camera.position.copy(c).add(offset.normalize().multiplyScalar(distance));a.camera.position.applyMatrix4(a.board.matrixWorld);a.camera.up.set(0,1,0).transformDirection(a.board.matrixWorld);a.camera.lookAt(c.applyMatrix4(a.board.matrixWorld));a.camera.updateMatrixWorld(true);a.renderer.render(a.scene,a.camera);
   },{center,distance,view});await page.screenshot({path:path.join(out,`${name}-installed-${view}.png`)});
 }
 const fixtures=await page.evaluate(async()=>{
   const {LOWER_LAYOUT:lower,BUMPERS,TARGET_BANKS}=await import('/js/pinball/layout.mjs');
   const {targetFrontNormal}=await import('/js/pinball/mechanical-contact.mjs');
   const fixtures=BUMPERS.map((b,i)=>({name:`bumper-${i}`,kind:'bumper',key:`b${i}`,p:[b.x,.18,b.z+.70],v:[0,0,-5]}));
   for(const side of [-1,1]){
     const vertices=lower.slingVertices.map(([x,z])=>[side*x,z]),centroid=[side*lower.slingCenter[0],lower.slingCenter[1]];
     const edges=vertices.map((a,i)=>{const b=vertices[(i+1)%3],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];let n=[dz/length,-dx/length];if((mid[0]-centroid[0])*n[0]+(mid[1]-centroid[1])*n[1]<0)n=n.map(x=>-x);return{length,mid,n};}).sort((a,b)=>b.length-a.length);
     const {mid,n}=edges[0];fixtures.push({name:`sling-${side}`,kind:'sling',key:`s${side}`,p:[mid[0]+n[0]*.40,.18,mid[1]+n[1]*.40],v:[-n[0]*5,0,-n[1]*5]});
   }
   for(const b of TARGET_BANKS){const dx=b.b[0]-b.a[0],dz=b.b[2]-b.a[2],normal=targetFrontNormal(b);for(let i=0;i<b.count;i++){const t=(i+.5)/b.count,x=b.a[0]+dx*t,z=b.a[2]+dz*t;fixtures.push({name:`target-${b.key}-${i}`,kind:'target',key:b.key,targetId:`${b.key}:${i}`,p:[x+normal[0]*.50,.24,z+normal[1]*.50],v:[-normal[0]*5,0,-normal[1]*5]});}}
   return fixtures;
 });
 for(const fixture of fixtures){const result=await page.evaluate(({name,kind,key,targetId,p,v})=>{
   const a=window.__pinball,g=a.game;g.restart();a.assets.resetMechanics();g.launch(1);g.ball.setTranslation({x:p[0],y:p[1],z:p[2]},true);g.ball.setLinvel({x:v[0],y:v[1],z:v[2]},true);let event;const observed=[];
   for(let i=0;i<120;i++){g.step(1/120,{});const hits=g.takeVisualHits();a.assets.updateMechanics(1/120,hits,{flipperAngles:g.flipperAngles,pullPower:g.plungerPull});observed.push(...hits);event=hits.find(h=>targetId?h.targetId===targetId:h.key===key);if(event)break;}
   const m=a.assets.mechanical,part=kind==='bumper'?m.bumpers.get(event?.key):kind==='sling'?m.slings.get(event?.key):m.targets.get(event?.targetId);
   const movement=kind==='bumper'?part?.striker?.position.y:kind==='sling'?part?.kicker?.rotation.x:part?.pivot?.rotation.x;
   return{name,kind,key,targetId,p,v,event:event??null,observed,score:g.state.score,movement};
 },fixture);results.push(result);}
 fs.writeFileSync(path.join(out,'physical-event-evidence.json'),JSON.stringify({method:'Layout-derived explicit incoming ball fixtures, actual Rapier contacts, no injected scoring or visual hit events. Tests every installed pop, sling and standup.',errors,results},null,2));console.log(JSON.stringify(results));
 assert.deepEqual(errors,[]);
 for(const result of results){assert.ok(result.event,`${result.name} actual contact missing; observed ${JSON.stringify(result.observed)}`);assert.ok(Math.abs(result.movement)>1e-6,`${result.name} mechanism did not move`);assert.ok(result.score>0,`${result.name} failed to score`);}
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
