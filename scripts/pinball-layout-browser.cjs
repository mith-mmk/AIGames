const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {chromium}=require('playwright');

async function main() {
  const url=process.env.PINBALL_QA_URL;
  if(!url) throw new Error('Set PINBALL_QA_URL to a served pinball page');
  const out=process.env.PINBALL_QA_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'pinball-layout-browser-'));
  fs.mkdirSync(out,{recursive:true});
  const executablePath=process.env.PINBALL_BROWSER_EXECUTABLE;
  const browser=await chromium.launch(executablePath ? {
    executablePath, headless:true,
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader'],
  } : {channel:'chrome',headless:true});
  const errors=[];
  const capture=(page,name)=>page.screenshot({path:path.join(out,name+'.png'),timeout:45000});
  const state=(page)=>page.evaluate(()=>{
    const {game,state}=window.__pinball;
    return {phase:game.state.phase, difficulty:game.state.difficulty, ball:game.state.ballNumber,
      score:game.state.score, left:state.left,right:state.right,p:{...game.ballPosition}};
  });
  const connect=async viewport=>{
    const page=await browser.newPage({viewport,hasTouch:viewport.width<500});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(new URL('?test=1',url).toString());
    await page.waitForFunction(()=>window.__pinball?.game,{},{timeout:45000});
    assert.equal((await state(page)).difficulty,'relaxed');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    return page;
  };
  try {
    const pc=await connect({width:1440,height:1000});
    assert.match(await pc.locator('#kickback').innerText(),/OUT SAVE 1 \/ 1/);
    await capture(pc,'desktop-oblique');
    await pc.getByRole('button',{name:'真上',exact:true}).click();
    await capture(pc,'desktop-top');
    await pc.getByRole('button',{name:'プレイ',exact:true}).click();
    await pc.locator('#difficulty').selectOption('standard');
    assert.equal((await state(pc)).difficulty,'standard');
    assert.doesNotMatch(await pc.locator('#kickback').innerText(),/OUT SAVE/);
    await pc.locator('#difficulty').selectOption('relaxed');
    assert.equal(await pc.evaluate(()=>document.activeElement.id),'table');
    await pc.keyboard.down('Space');await pc.waitForTimeout(1000);await pc.keyboard.up('Space');
    await pc.waitForFunction(()=>window.__pinball.game.state.phase==='playing');
    await pc.keyboard.down('KeyZ');await pc.keyboard.down('Slash');
    assert.equal(await pc.locator('#left').getAttribute('aria-pressed'),'true');
    assert.equal(await pc.locator('#right').getAttribute('aria-pressed'),'true');
    await pc.keyboard.up('KeyZ');await pc.keyboard.up('Slash');
    await pc.locator('#pause').click();
    assert.equal((await state(pc)).phase,'paused');
    const p=(await state(pc)).p;await pc.waitForTimeout(150);assert.deepEqual((await state(pc)).p,p);
    await pc.locator('#pause').click();
    await pc.locator('nav [data-restart]').click();
    assert.deepEqual(((s)=>[s.phase,s.ball,s.score])(await state(pc)),['ready',1,0]);

    const mobile=await connect({width:390,height:844});
    await capture(mobile,'mobile-oblique');
    await mobile.getByRole('button',{name:'真上',exact:true}).click();
    await capture(mobile,'mobile-top');
    const cdp=await mobile.context().newCDPSession(mobile);
    const point=async(id)=>{const r=await mobile.locator('#'+id).boundingBox();return{id:id==='left'?1:2,x:r.x+r.width/2,y:r.y+r.height/2};};
    const launch=await mobile.locator('#launch').boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:launch.x+launch.width/2,y:launch.y+launch.height/2,id:1}]});
    await mobile.waitForTimeout(1050);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await mobile.waitForFunction(()=>window.__pinball.game.state.phase==='playing');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:await Promise.all([point('left'),point('right')])});
    assert.ok(((s)=>s.left&&s.right)(await state(mobile)));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    assert.ok(((s)=>!s.left&&!s.right)(await state(mobile)));
    await capture(mobile,'mobile-playing');
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({pass:'desktop and emulated mobile input, launch, ready, pause, difficulty, responsive, views',output:out}));
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
