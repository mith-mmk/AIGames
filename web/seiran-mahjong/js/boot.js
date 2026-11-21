// HTML is only the browser host. Even loading/error/retry screens are painted on canvas.
const version='0.186.1',cdn=`https://cdn.jsdelivr.net/npm/three@${version}/`,local=new URL('../vendor/three/',import.meta.url).href;
const boot=document.createElement('canvas');document.body.append(boot);const ctx=boot.getContext('2d');
let failed=null;
function paint(){const dpr=Math.min(devicePixelRatio||1,2),w=document.body.clientWidth,h=document.body.clientHeight;boot.width=w*dpr;boot.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#081f1c';ctx.fillRect(0,0,w,h);ctx.fillStyle='#f0ce81';ctx.textAlign='center';ctx.font='bold 30px sans-serif';ctx.fillText('翠嵐麻雀',w/2,h/2-32);ctx.fillStyle='#e5eee2';ctx.font='14px sans-serif';ctx.fillText(failed?'読み込みに失敗しました。タップで再読み込み。':'卓を準備しています…',w/2,h/2+9,Math.max(1,w-32));if(failed){ctx.font='12px sans-serif';ctx.fillText(String(failed.message).slice(0,90),w/2,h/2+40,Math.max(1,w-32));}}
paint();window.addEventListener('resize',paint);
let root=cdn;
// Local/offline use is immediate. Hosted builds prefer the pinned CDN and fall back to identical bundled files.
if(['localhost','127.0.0.1','[::1]'].includes(location.hostname))root=local;
else try{const response=await fetch(`${cdn}build/three.module.js`,{signal:AbortSignal.timeout(3500),cache:'force-cache'});if(!response.ok)throw Error(response.status);}catch{root=local;}
const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports:{three:root+'build/three.module.js','three/addons/':root+'examples/jsm/'}});document.head.append(map);
try{boot.remove();window.removeEventListener('resize',paint);await import('./app.js');}
catch(error){console.error(error);failed=error;document.body.querySelectorAll('canvas').forEach(c=>c.remove());document.body.append(boot);paint();boot.tabIndex=0;boot.onclick=()=>location.reload();boot.onkeydown=e=>{if(e.key==='Enter')location.reload();};window.addEventListener('resize',paint);}
