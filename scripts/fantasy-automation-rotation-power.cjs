/* global __dirname, process */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');

(async () => {
  const root = path.resolve(__dirname, '..'), built = process.argv.includes('--built');
  const directory = path.join(root, built ? '.pages-dist' : 'web');
  const runtimeSHA256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, 'js/fantasy-automation/runtime/app.js'))).digest('hex');
  const output = process.env.FANTASY_QA_OUTPUT ? path.resolve(root, process.env.FANTASY_QA_OUTPUT) : path.join(root, 'artifacts/fantasy-automation/rotation-power', built ? 'built' : 'source');
  fs.mkdirSync(output, { recursive: true });
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  const server = http.createServer((request, response) => {
    const file = path.resolve(directory, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => error ? response.writeHead(404).end() : response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(data));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page; const errors = [], failures = [], checks = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.FANTASY_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const url = `http://127.0.0.1:${server.address().port}/fantasy-automation.html`;
    const action = name => page.locator(`[data-action="${name}"]:visible`).first();
    const menu = async () => { if (!await page.locator('.game-menu').evaluate(n => n.open)) await page.locator('.game-menu > summary').tap(); };
    const closeMenu = async () => { if (await page.locator('.game-menu').evaluate(n => n.open)) await action('menu-close').tap(); };
    const read = () => page.evaluate(() => new Promise((resolve, reject) => {
      const o = indexedDB.open('aigames-fantasy-automation', 1); o.onerror = () => reject(o.error);
      o.onsuccess = () => { const db = o.result, request = db.transaction('saves').objectStore('saves').get('workshop'); request.onsuccess = () => { db.close(); resolve(request.result); }; };
    }));
    const save = async () => { await menu(); await action('save').tap(); await page.waitForFunction(() => [...document.querySelectorAll('#game-message,#guide-feedback')].some(n => n.textContent.includes('保存しました'))); await closeMenu(); return read(); };
    const put = state => page.evaluate(state => new Promise((resolve, reject) => {
      const o = indexedDB.open('aigames-fantasy-automation', 1); o.onupgradeneeded = () => o.result.createObjectStore('saves'); o.onerror = () => reject(o.error);
      o.onsuccess = () => { const db = o.result, tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(state, 'workshop'); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), state);
    const load = async state => { await put(state); await menu(); await action('load').tap(); await page.waitForFunction(() => [...document.querySelectorAll('#game-message,#guide-feedback')].some(n => n.textContent.includes('再開しました'))); await closeMenu(); };
    const choose = async kind => { await page.locator('#quickbar [data-action="build-open"]').tap(); await page.locator('[data-category="all"]').tap(); await page.locator('#build-search').fill(''); await page.locator(`[data-build="${kind}"]`).tap(); };
    const point = (x, z) => page.evaluate(async ({ x, z }) => {
      const T = await import('three'), b = document.querySelector('canvas').getBoundingClientRect(), a = b.width / b.height;
      const c = new T.OrthographicCamera(-11 * a, 11 * a, 11, -11, .1, 150); c.position.set(13 + Math.sin(Math.PI / 4) * 25, 29, 16 + Math.cos(Math.PI / 4) * 25); c.lookAt(13, 0, 16); c.updateMatrixWorld();
      const p = new T.Vector3(x, 0, z).project(c); return { x: b.x + (p.x + 1) * b.width / 2, y: b.y + (1 - p.y) * b.height / 2 };
    }, { x, z });
    const cell = async (x, z, touch = false) => { const p = await point(x, z); if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); };
    const shot = name => page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    const record = text => { checks.push(text); console.log(text); };
    const boot = async (width = 1024, height = 768) => {
      page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
      page.on('pageerror', error => errors.push(error.message)); page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) failures.push(response.url()); });
      await page.goto(url); await page.locator('canvas').waitFor(); await page.locator('[data-speed="0"]').tap(); await action('guide-close').tap();
    };
    const camera = () => page.locator('canvas').evaluate(n => ({ target:n.dataset.cameraTarget, bearing:n.dataset.cameraBearing, extent:n.dataset.cameraExtent }));
    const turn = async delta => page.locator(`[data-turn="${delta}"]`).tap();
    const heading = () => page.locator('#direction-select').inputValue();
    const strokeButton = async cancel => {
      const b=await page.locator('[data-turn="1"]').boundingBox(), client=await page.context().newCDPSession(page), x=b.x+b.width/2,y=b.y+b.height/2;
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+4,y:y+3}]});
      await client.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});await client.detach();await page.waitForTimeout(80);
    };
    for(const [width,height] of [[1024,768],[768,1024],[390,844]]) {
      await boot(width,height);const originalCamera=await camera();
      await choose('miner');await turn(-1);assert.equal(await heading(),'0');
      for(let i=0;i<3;i++)await turn(1);assert.equal(await heading(),'3');
      await page.locator('#direction-select').selectOption('1');await cell(12,16,true);await cell(12,16,true);
      assert.match(await page.locator('#direction-title').textContent(),/選択中: 採掘機/);
      const before=await save();await turn(1);await turn(1);await turn(-1);assert.equal(await heading(),'2');
      const after=await save();assert.equal(after.buildings[0].direction,2);assert.deepEqual(after.inventory,before.inventory);assert.equal(after.buildings.length,1);
      await choose('smelter');await cell(14,16,true);await cell(14,16,true);
      assert.match(await page.locator('#direction-title').textContent(),/選択中: 製錬炉/);
      const start=Number(await heading());await strokeButton(false);assert.equal(Number(await heading()),(start+1)%4);
      const unchanged=await heading();await strokeButton(true);assert.equal(await heading(),unchanged);
      for(let i=0;i<4;i++)await turn(1);assert.equal(await heading(),unchanged);
      await page.locator('canvas').focus();await page.keyboard.press('r');assert.equal(Number(await heading()),(Number(unchanged)+1)%4);
      await page.locator('#direction-select').selectOption('1');assert.deepEqual(await camera(),originalCamera);
      for(const button of await page.locator('.direction-buttons button').all()) {const b=await button.boundingBox();assert(b.width>=100&&b.height>=56);}
      await shot(`rotation-${width}`);
      const state=await save();assert.equal(state.buildings.length,2);assert.equal(state.buildings.find(b=>b.kind==='miner').direction,2);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.reload();await page.locator('canvas').waitFor();await page.locator('[data-speed="0"]').tap();await action('guide-close').tap();
      await load(state);assert.deepEqual(await save(),state);
      record(`${width}x${height}: real touch build heading, selected miner and smelter rotation, 4px finger jitter, cancellation, four rapid turns, R, camera isolation and exact save/resume passed`);
      await page.close();
    }

    await boot();const seeded=await save();seeded.terrain[16*Math.sqrt(seeded.terrain.length)+17]='ore';await load(seeded);
    await choose('generator');await cell(8,16,true);const gen=(await save()).buildings[0];
    const previewAndPlace = async (x,z,expectedId) => {
      await choose('wire');const p=await point(x,z),client=await page.context().newCDPSession(page);
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});
      await page.waitForFunction(({x,z})=>document.querySelector('canvas').dataset.powerPreviewCell===`${x},${z}`,{x,z});
      const data=await page.locator('canvas').evaluate(n=>({...n.dataset}));
      assert.equal(data.powerRange,'3');assert.equal(data.powerLinkDistance,'3');assert.equal(data.powerRangeCells,'25');assert(data.powerPreviewLinks.split(',').includes(`${expectedId}:3`));
      assert.equal(data.powerPreviewState,'empty');await shot(`power-preview-${x}-${z}`);
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();
      const state=await save();return state.buildings.find(b=>b.x===x&&b.z===z);
    };
    const bridge=await previewAndPlace(11,16,gen.id);const last=await previewAndPlace(14,16,bridge.id);
    await choose('miner');await cell(17,16,true);await action('cancel').tap();await cell(8,16,true);await page.locator('[data-feed-resource="wood"]').tap();
    await page.locator('[data-speed="2"]').tap();await page.waitForFunction(()=>Number(document.querySelector('#power-count').textContent.split('/')[0])>0,undefined,{timeout:20000});await page.waitForTimeout(1200);await page.locator('[data-speed="0"]').tap();
    let state=await save();assert((state.stats.produced.ore||0)>=1);assert(state.buildings.find(b=>b.id===gen.id).energy<30);
    await cell(14,16,true);await page.waitForFunction(()=>document.querySelector('canvas').dataset.powerPreviewState==='energized');await shot('chain-powered');
    await cell(11,16,true);await action('remove').tap();await action('remove-confirm').tap();await cell(14,16,true);
    await page.waitForFunction(()=>document.querySelector('canvas').dataset.powerPreviewState==='disconnected');
    const broken=await save(),stopped=broken.buildings.find(b=>b.kind==='miner');
    await page.locator('[data-speed="2"]').tap();await page.waitForTimeout(600);await page.locator('[data-speed="0"]').tap();state=await save();
    assert.equal(state.buildings.find(b=>b.kind==='miner').progress,stopped.progress);assert.deepEqual(state.stats.produced,broken.stats.produced);await shot('chain-disconnected');
    await page.reload();await page.locator('canvas').waitFor();await page.locator('[data-speed="0"]').tap();await action('guide-close').tap();await load(state);assert.deepEqual(await save(),state);
    await choose('wire');await cell(11,16,true);await page.locator('[data-speed="2"]').tap();await page.waitForTimeout(1200);await page.locator('[data-speed="0"]').tap();
    const resumed=await save();assert((resumed.stats.produced.ore||0)>(state.stats.produced.ore||0));await cell(14,16,true);await shot('chain-reconnected');
    assert.equal(resumed.version,5);assert.equal(resumed.market.coins,0);assert.equal(resumed.delivered,0);
    record('Actual fuel generates mana across two three-cell pole gaps to a miner nine cells away; preview matches links and supply. Removing bridge stops work, save/resume preserves the broken grid, rebuilding resumes production without currency or shipments');
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    fs.rmSync(path.join(output,'failure.png'),{force:true});
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({mode:built?'built':'source',runtimeSHA256,checks,pageErrors:errors,failedRequests:failures,physicalIPad:'not tested; Chromium touch emulation only'},null,2)+'\n');
    console.log('Rotation and ranged power browser QA passed.');
  } catch(error) {if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
  finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
