/* Standalone review: not part of the published game. Views are evidence, not an automatic aesthetic pass. */
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
 const root=path.resolve(__dirname,'../web'),out=process.env.PINBALL_REVIEW_OUT?path.resolve(process.env.PINBALL_REVIEW_OUT):path.resolve(__dirname,'../artifacts/pinball/component-review');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{if(req.url==='/__component_review__'){res.setHeader('Content-Type','text/html');return res.end('<!doctype html><title>Component review</title>');}const f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep))return res.writeHead(403).end();fs.readFile(f,(e,b)=>{if(e)return res.writeHead(404).end();res.setHeader('Content-Type',{'.mjs':'text/javascript','.js':'text/javascript','.html':'text/html'}[path.extname(f)]||'application/octet-stream');res.end(b);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({channel:'chrome',headless:true});
 try{const page=await browser.newPage({viewport:{width:900,height:800}});await page.goto(`http://127.0.0.1:${server.address().port}/__component_review__`);
 const parts=process.argv.slice(2);if(!parts.length)parts.push('flipper','bumper','sling','target','plunger','ramp','wireform','cabinet');const metrics=[];
 for(const part of parts){await page.evaluate(async part=>{
 document.body.replaceChildren();document.body.style.margin='0';
 const T=await import('/js/vendor/three-0.180.0/three.module.min.js');const {WorkshopAssets}=await import('/js/pinball/assets.mjs');
 const files={flipper:['flipper','MechanicalFlipper'],bumper:['bumper','MechanicalBumper'],sling:['sling-target','MechanicalSling'],target:['sling-target','MechanicalTarget'],plunger:['plunger','MechanicalPlunger'],ramp:['ramp-wire','MechanicalRamp'],wireform:['ramp-wire','MechanicalRamp'],cabinet:['cabinet','MechanicalCabinet']};
 const [file,name]=files[part],module=await import(`/js/pinball/components/${file}.mjs`);const {LOWER_LAYOUT,TARGET_BANKS}=await import('/js/pinball/layout.mjs');
 const {targetDimensions}=await import('/js/pinball/mechanical-contact.mjs');
 const materials=new WorkshopAssets().materials,options={materials};
 // Match installed overrides and shared geometry; the fixture is NOT an installed-game clearance test.
 if(part==='flipper')options.materials={...materials,rubber:materials.flipperRubber,cream:materials.chrome};
 if(part==='bumper')options.materials={...materials,bumperEnamel:materials.chrome,bumperPlastic:materials.brass};
 if(part==='sling'){
   options.materials={...materials,jade:materials.chrome,rubber:materials.flipperRubber};
   options.points=LOWER_LAYOUT.slingVertices.map(([x,z])=>[x-LOWER_LAYOUT.slingCenter[0],z-LOWER_LAYOUT.slingCenter[1]]);
   options.rubberHeight=.22;options.coverHeight=LOWER_LAYOUT.slingCoverHeight;
 }
 if(part==='target'){const bank=TARGET_BANKS[0];Object.assign(options,targetDimensions(bank),{glyph:bank.glyph});options.materials={...materials,cream:materials.flipperRubber,red:materials.flipperRubber};}
 const component=new module[name](options);
 if(part==='sling' && component.parameters.coverHeight!==LOWER_LAYOUT.slingCoverHeight)throw new Error('Review fixture must use installed cover height');
 if(part==='wireform'){
   // Review the installed route's actual open return, not an unrelated default curve.
   for(const child of [...component.root.children])if(child.name!=='true-paired-wire-return'&&child.name!=='perimeter-posts-and-continuous-underframe')component.root.remove(child);
   const frame=component.root.getObjectByName('perimeter-posts-and-continuous-underframe');
   if(frame)for(const child of [...frame.children]){const bounds=new T.Box3().setFromObject(child);if(bounds.max.x>0)frame.remove(child);}
 }
 const scene=new T.Scene();scene.background=new T.Color('#182333');scene.add(component.root);scene.add(new T.HemisphereLight(0xeaf7ff,0x5d4635,1.6));const key=new T.DirectionalLight(0xffeedb,2.5);key.position.set(3,5,4);scene.add(key);
 const renderer=new T.WebGLRenderer({antialias:true});renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.setSize(900,800);renderer.setPixelRatio(1);document.body.append(renderer.domElement);const studio=new T.Scene();studio.background=new T.Color(0x6c7889);for(const [x,y,z,w,h] of [[-3,3,0,2,6],[3,2,2,2,4],[0,5,0,5,3]]){const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);}const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio).texture;
 const box=new T.Box3().setFromObject(component.root),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z)*1.35;
 const camera=new T.OrthographicCamera(-span*.5625,span*.5625,span*.5,-span*.5,.01,100);
 const floor=new T.Mesh(new T.BoxGeometry(span*1.8,.09,span*1.8),new T.MeshStandardMaterial({color:0x253c52,roughness:.7}));floor.position.set(center.x,box.min.y-.06,center.z);floor.visible=false;scene.add(floor);
 window.review={part,component,renderer,scene,camera,center,span,floor,T};
 },part);
 const reviewViews=['top','45','side','underside','mounted-fixture','moving'];if(part==='cabinet')reviewViews.push('cutaway-side','underside-open','trough-cutaway','glass-cover');
 for(const view of reviewViews){const stats=await page.evaluate(view=>{
 const r=window.review,{T}=r;
 r.floor.visible=view==='mounted-fixture';
 r.component.setInspectionMode?.((view==='cutaway-side'||view==='trough-cutaway')?'cutaway':view==='underside-open'?'underside':'assembled');
 r.component.setGlassVisible?.(view==='glass-cover');
 if(view==='moving'){r.component.setAngle?.(.65);r.component.setPull?.(.8);r.component.hit?.();r.component.update?.(.035);}
 const v=view==='top'?[0,1,.001]:(view==='underside'||view==='underside-open'||view==='trough-cutaway')?[1,-Math.SQRT2,1]:(view==='side'||view==='cutaway-side')?((r.component.root.name.includes('plunger')||r.component.root.name.includes('target')||r.component.root.name.includes('cabinet'))?[1,.015,0]:[0,.015,1]):[1,Math.SQRT2,1];
 r.camera.position.copy(r.center).add(new T.Vector3(...v).normalize().multiplyScalar(r.span*3));r.camera.lookAt(r.center);
 r.component.root.updateMatrixWorld(true);r.camera.updateMatrixWorld(true);
 // Fit vertices of visible meshes, not the longest world axis. Unreferenced
 // vertex entries and draw ranges are conservatively included.
 // Keep the entire visible component, including moving parts and cutaway remnants.
 // The optional studio floor is not component geometry and must not drive fit.
 const projected=new T.Box3(),point=new T.Vector3(),instance=new T.Matrix4(),matrix=new T.Matrix4();let vertices=0,meshes=0;
 r.component.root.traverseVisible(object=>{
  if(!object.isMesh||!object.geometry?.attributes.position)return;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  if(materials.every(material=>material?.visible===false))return;
  meshes++;const positions=object.geometry.attributes.position;
  for(let copy=0;copy<(object.isInstancedMesh?object.count:1);copy++){
   if(object.isInstancedMesh){object.getMatrixAt(copy,instance);matrix.multiplyMatrices(object.matrixWorld,instance);}else matrix.copy(object.matrixWorld);
   matrix.premultiply(r.camera.matrixWorldInverse);
   for(let i=0;i<positions.count;i++){point.fromBufferAttribute(positions,i).applyMatrix4(matrix);projected.expandByPoint(point);vertices++;}
  }
 });
 if(projected.isEmpty())throw new Error(`No visible component geometry: ${r.part}/${view}`);
 const size=projected.getSize(new T.Vector3()),middle=projected.getCenter(new T.Vector3()),aspect=900/800,margin=1.12;
 const height=Math.max(size.y,size.x/aspect,.01)*margin,width=height*aspect;
 // Translate in the image plane without changing the chosen viewing direction.
 r.camera.position.add(new T.Vector3(middle.x,middle.y,0).applyQuaternion(r.camera.quaternion));
 r.camera.left=-width/2;r.camera.right=width/2;r.camera.top=height/2;r.camera.bottom=-height/2;
 r.camera.near=Math.max(.001,-projected.max.z-r.span);r.camera.far=-projected.min.z+r.span;
 r.camera.updateProjectionMatrix();r.camera.updateMatrixWorld(true);
 // Independently project again through the final camera to catch centering,
 // transform, aspect and near/far mistakes rather than asserting the fit formula.
 const finalBounds=new T.Box3();let clippedVertices=0;
 r.component.root.traverseVisible(object=>{
  if(!object.isMesh||!object.geometry?.attributes.position)return;
  const materials=Array.isArray(object.material)?object.material:[object.material];
  if(materials.every(material=>material?.visible===false))return;
  const positions=object.geometry.attributes.position;
  for(let copy=0;copy<(object.isInstancedMesh?object.count:1);copy++){
   if(object.isInstancedMesh){object.getMatrixAt(copy,instance);matrix.multiplyMatrices(object.matrixWorld,instance);}else matrix.copy(object.matrixWorld);
   for(let i=0;i<positions.count;i++){
    point.fromBufferAttribute(positions,i).applyMatrix4(matrix).project(r.camera);finalBounds.expandByPoint(point);
    if(![point.x,point.y,point.z].every(Number.isFinite)||Math.max(Math.abs(point.x),Math.abs(point.y),Math.abs(point.z))>1)clippedVertices++;
   }
  }
 });
 const pixelBounds={left:(finalBounds.min.x+1)*450,right:(finalBounds.max.x+1)*450,top:(1-finalBounds.max.y)*400,bottom:(1-finalBounds.min.y)*400};
 const clipped=clippedVertices>0;
 if(clipped)throw new Error(`Component clipped: ${r.part}/${view}`);
 const cutaway=['cutaway-side','underside-open','trough-cutaway'].includes(view);
 const evidenceScope=r.part==='wireform'?'isolated return and left support subset; other ramp parts removed; not installed clearance proof':cutaway?'inspection cutaway with explicitly removed cabinet panels; not the assembled exterior':'standalone component; mounted-fixture is not whole-game mounting proof';
 document.querySelector('[data-review-label]')?.remove();const label=document.createElement('div');label.dataset.reviewLabel='';label.textContent=`${r.part} · ${view} · ${r.part==='wireform'?'isolated return fixture':cutaway?'inspection cutaway':'standalone fixture'}${view==='moving'&&['ramp','wireform','cabinet'].includes(r.part)?' (static mechanism)':''} · not installed clearance proof`;
 Object.assign(label.style,{position:'fixed',bottom:'8px',left:'12px',color:'#eaf3ff',font:'12px sans-serif',background:'#182333dd',padding:'5px 8px',pointerEvents:'none'});document.body.append(label);
 r.renderer.render(r.scene,r.camera);
 return{view,evidenceScope,motionApplicable:!['ramp','wireform','cabinet'].includes(r.part),fit:{method:'visible mesh vertices projected into the selected camera plane',margin,meshes,vertices,pixelBounds,widthPixels:pixelBounds.right-pixelBounds.left,heightPixels:pixelBounds.bottom-pixelBounds.top,clippedVertices,clipped},calls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,parameters:r.component.parameters||r.component.dimensions||null};
 },view);await page.screenshot({path:path.join(out,`${part}-${view}.png`)});metrics.push({part,...stats});}
 await page.evaluate(()=>window.review.renderer.dispose());}
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
