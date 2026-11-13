/* global __dirname, process */
/* Standalone review: not part of the published game. Views are evidence, not an automatic aesthetic pass. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'../web'),out=path.resolve(__dirname,'../artifacts/pinball/component-review');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{if(req.url.startsWith('/__component_review__')){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Component review</title>');}const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html'}[path.extname(f)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});
 try{const page=await browser.newPage({viewport:{width:900,height:800}});await page.goto(`http://127.0.0.1:${server.address().port}/__component_review__?glyph=${process.argv[2]||"wrench"}`);
 const parts=['target'];const metrics=[];
 for(const part of parts){await page.evaluate(async part=>{
 const processGlyph=new URLSearchParams(location.search).get('glyph')||'wrench';document.body.replaceChildren();document.body.style.margin='0';
 const T=await import('/js/vendor/three-0.180.0/three.module.min.js');const {WorkshopAssets}=await import('/js/pinball/assets.mjs');
 const files={flipper:['flipper','MechanicalFlipper'],bumper:['bumper','MechanicalBumper'],sling:['sling-target','MechanicalSling'],target:['sling-target','MechanicalTarget'],plunger:['plunger','MechanicalPlunger'],ramp:['ramp-wire','MechanicalRamp'],wireform:['ramp-wire','MechanicalWireform'],cabinet:['cabinet','MechanicalCabinet']};
 const [file,name]=files[part],module=await import(`/js/pinball/components/${file}.mjs`);const {LOWER_LAYOUT}=await import('/js/pinball/layout.mjs');
 const materials=new WorkshopAssets().materials,options={materials};
 // Match installed overrides and shared geometry; the fixture is NOT an installed-game clearance test.
 if(part==='flipper')options.materials={...materials,rubber:materials.flipperRubber,cream:materials.chrome};
 if(part==='bumper')options.materials={...materials,bumperEnamel:materials.chrome,bumperPlastic:materials.brass};
 if(part==='sling'){
   options.materials={...materials,jade:materials.chrome,rubber:materials.flipperRubber};
   options.points=LOWER_LAYOUT.slingVertices.map(([x,z])=>[x-LOWER_LAYOUT.slingCenter[0],z-LOWER_LAYOUT.slingCenter[1]]);
   options.rubberHeight=.22;options.coverHeight=.43;
 }
 if(part==='target'){options.width=.32;options.height=.50;options.glyph=processGlyph;options.materials={...materials,red:processGlyph==='wrench'?materials.flipperRubber:materials.red,cream:processGlyph==='wrench'?materials.flipperRubber:materials.red};}
 const component=new module[name](options);
 const scene=new T.Scene();scene.background=new T.Color('#182333');scene.add(component.root);scene.add(new T.HemisphereLight(0xeaf7ff,0x5d4635,1.6));const key=new T.DirectionalLight(0xffeedb,2.5);key.position.set(3,5,4);scene.add(key);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setSize(900,800);renderer.setPixelRatio(1);document.body.append(renderer.domElement);const studio=new T.Scene();studio.background=new T.Color(0x6c7889);for(const [x,y,z,w,h] of [[-3,3,0,2,6],[3,2,2,2,4],[0,5,0,5,3]]){const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);}const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio).texture;
 const box=new T.Box3().setFromObject(component.root),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z)*1.35;
 const camera=new T.OrthographicCamera(-span*.5625,span*.5625,span*.5,-span*.5,.01,100);
 const floor=new T.Mesh(new T.BoxGeometry(span*1.8,.09,span*1.8),new T.MeshStandardMaterial({color:0x253c52,roughness:.7}));floor.position.set(center.x,box.min.y-.06,center.z);floor.visible=false;scene.add(floor);
 window.review={part,component,renderer,scene,camera,center,span,floor,T};
 },part);
 for(const view of ['top','45','side','underside','mounted-fixture','moving']){const stats=await page.evaluate(view=>{const r=window.review,{T,center:c,span:s}=r;r.floor.visible=view==='mounted-fixture';const v=view==='top'?[0,1,.001]:view==='underside'?[1,-Math.SQRT2,1]:view==='side'?((r.component.root.name.includes('plunger')||r.component.root.name.includes('target'))?[1,.015,0]:[0,.015,1]):[1,Math.SQRT2,1];r.camera.position.copy(c).add(new T.Vector3(...v).normalize().multiplyScalar(s*3));r.camera.lookAt(c);if(view==='moving'){r.component.setAngle?.(.65);r.component.setPull?.(.8);r.component.hit?.();r.component.update?.(.035);}r.renderer.render(r.scene,r.camera);return{view,evidenceScope:'standalone component; mounted-fixture is not whole-game mounting proof',motionApplicable:!['ramp','wireform','cabinet'].includes(r.part),calls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,parameters:r.component.parameters||r.component.dimensions||null};},view);await page.screenshot({path:path.join(out,`reference-${process.argv[2]||'wrench'}-${part}-${view}.png`)});metrics.push({part,...stats});}
 await page.evaluate(()=>window.review.renderer.dispose());}
 fs.writeFileSync(path.join(out,`reference-${process.argv[2]||'wrench'}-metrics.json`),JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
