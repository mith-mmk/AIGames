/* global __dirname, process */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');

(async () => {
  const root = path.resolve(__dirname, '..');
  const before = process.argv.includes('--before'), built = process.argv.includes('--built');
  const directory = path.join(root, built ? '.pages-dist' : 'web');
  const output = path.join(root, 'artifacts/fantasy-automation/ipad-touch', before ? 'before' : built ? 'built' : 'after');
  fs.mkdirSync(output, { recursive: true });
  const runtimeSHA256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, 'js/fantasy-automation/runtime/app.js'))).digest('hex');
  const cssSHA256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, 'css/fantasy-automation.css'))).digest('hex');
  if (before) {
    assert.equal(runtimeSHA256, '8c60d08622923bebb75b64abd3ec07ef5c702d6403ea083dca4db6a57a197ac3', 'Before screenshots require the unmodified d708526 runtime');
    assert.equal(cssSHA256, '82a86b5f08a78a8a5544765af1eb341c4a28361eb219b9fa30c94b54395a079a', 'Before screenshots require the unmodified d708526 stylesheet');
  }
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
  const server = http.createServer((request, response) => {
    const file = path.resolve(directory, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => error ? response.writeHead(404).end() : response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(data));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page;
  const errors = [], failures = [], checks = [], measurements = [];
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
    const save = async () => { await menu(); await action('save').tap(); await page.waitForFunction(() => document.querySelector('#game-message').textContent.includes('保存しました')); await closeMenu(); return read(); };
    const point = (x, z) => page.evaluate(async ({ x, z }) => {
      const T = await import('three'), b = document.querySelector('canvas').getBoundingClientRect(), a = b.width / b.height;
      const c = new T.OrthographicCamera(-11 * a, 11 * a, 11, -11, .1, 150); c.position.set(13 + Math.sin(Math.PI / 4) * 25, 29, 16 + Math.cos(Math.PI / 4) * 25); c.lookAt(13, 0, 16); c.updateMatrixWorld();
      const p = new T.Vector3(x, 0, z).project(c); return { x: b.x + (p.x + 1) * b.width / 2, y: b.y + (1 - p.y) * b.height / 2 };
    }, { x, z });
    const cell = async (x, z) => { const p = await point(x, z); await page.touchscreen.tap(p.x, p.y); };
    const shot = async name => { await page.waitForTimeout(250); return page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true }); };
    const record = text => { checks.push(text); console.log(text); };
    const direction = async value => { await page.locator(`[data-direction="${value}"]`).tap(); assert.equal(await page.locator(`[data-direction="${value}"]`).getAttribute('aria-pressed'), 'true'); };
    const swipe = async locator => {
      const b = await locator.boundingBox(), client = await page.context().newCDPSession(page);
      const x = b.x + b.width / 2, y = b.y + b.height - 45;
      await client.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{x,y}] });
      for (let i=1; i<=8; i++) { await client.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{x,y:y-i*Math.min(28,(b.height-100)/8)}] }); await page.waitForTimeout(20); }
      await client.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await page.waitForTimeout(300); await client.detach();
    };
    for (const [label, width, height] of [['landscape',1024,768],['portrait',768,1024]]) {
      page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true });
      page.on('pageerror', error => errors.push(error.message)); page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) failures.push(response.url()); });
      await page.goto(url); await page.locator('canvas').waitFor(); await page.locator('[data-speed="0"]').tap(); await action('guide-close').tap();
      await page.locator('[data-quick="1"]').tap(); await cell(13,16); await shot(`${label}-build`);
      if (before) {
        await page.locator('#quickbar [data-action="rotate"]').tap(); await cell(14,16);
        await action('cancel').tap(); await cell(13,16); await shot(`${label}-selected`);
        await menu(); await shot(`${label}-menu`);
        measurements.push({ label, targets: await page.locator('.game-menu > summary, .menu-actions button, #quickbar [data-action="rotate"], .selection-actions [data-action="rotate"]').evaluateAll(nodes => nodes.map(n => { const b=n.getBoundingClientRect(); return { text:n.textContent, width:b.width, height:b.height, fontSize:getComputedStyle(n).fontSize }; })) });
        await closeMenu(); assert.equal((await save()).buildings.length,2);
      } else {
        assert.equal(await page.locator('[data-build]').count(),15);
        await direction(0); await direction(0); await cell(14,16); await cell(15,16);
        await direction(3); await cell(14,17);
        let value = await save();
        assert.deepEqual(value.buildings.map(b=>[b.x,b.z,b.direction]), [[13,16,1],[14,16,0],[15,16,0],[14,17,3]]);
        const inventory = structuredClone(value.inventory);
        await page.locator('[data-direction="1"]').waitFor({state:'visible'});
        const canvasPoint = await point(16,18), controlBox = await page.locator('[data-direction="1"]').boundingBox();
        const contacts = [{id:1,...canvasPoint},{id:2,x:controlBox.x+controlBox.width/2,y:controlBox.y+controlBox.height/2}];
        const client = await page.context().newCDPSession(page);
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[contacts[0]]});
        await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:contacts});
        await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[contacts[0]]});
        await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await client.detach();
        assert.equal((await save()).buildings.length,4);
        await shot(`${label}-repeated-placement`);
        await action('cancel').tap(); await cell(13,16);
        assert.match(await page.locator('#direction-title').textContent(), /選択ベルト/);
        await direction(3); await direction(2); await direction(0);
        await page.keyboard.press('r'); assert.match(await page.locator('#direction-current').textContent(), /東/);
        await direction(2); await action('close-panel').tap();
        assert(await page.locator('.selection-panel').evaluate(n=>n.classList.contains('is-collapsed')));
        await shot(`${label}-selected`);
        await action('close-panel').tap(); assert(!await page.locator('.selection-panel').evaluate(n=>n.classList.contains('is-collapsed')));
        value = await save(); assert.equal(value.buildings[0].direction,2); assert.deepEqual(value.inventory,inventory);
        assert.deepEqual(value.buildings.slice(1).map(b=>b.direction),[0,0,3]);
        record(`${label}: direct headings, repeated placement, same-heading idempotency, selected-only rotation, R key, collapse/reopen and canvas+UI multitouch; no extra placement or material cost`);

        await page.locator('[data-quick="1"]').tap(); await menu(); await cell(16,17);
        measurements.push({label:`${label}-menu`,targets:await page.locator('.game-menu > summary, .menu-actions button').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return {text:n.textContent,width:b.width,height:b.height,fontSize:getComputedStyle(n).fontSize};}))});
        for(const b of await page.locator('.menu-actions button').all()) {const box=await b.boundingBox();assert(box.width>=48 && box.height>=48);}
        await shot(`${label}-menu`);
        await page.locator('#main-help > summary').tap(); await swipe(page.locator('.menu-body'));
        assert(await page.locator('.menu-body').evaluate(n=>n.scrollTop>0));
        assert(await action('menu-close').evaluate(n=>{const b=n.getBoundingClientRect();return n.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}));
        await shot(`${label}-menu-scroll`); await closeMenu();
        assert.equal((await save()).buildings.length,4);
        for (let i=0;i<3;i++) { await menu(); await closeMenu(); }
        await menu(); await action('build-open').tap(); assert(!await page.locator('.game-menu').evaluate(n=>n.open));
        await swipe(page.locator('.build-dock'));
        assert(await page.locator('.build-dock').evaluate(n=>n.scrollTop>0));
        await page.locator('[data-category="logistics"]').tap();
        await page.locator('[data-build="belt"]').tap(); await cell(16,17);
        value = await save(); assert.equal(value.buildings.length,5);
        assert.equal(value.inventory.wood,inventory.wood-1); assert.equal(value.inventory.ingot,inventory.ingot-1);
        await menu(); await action('camera').tap(); assert(!await page.locator('.game-menu').evaluate(n=>n.open));
        await page.locator('[data-action="technology-open"]:visible').first().tap(); await swipe(page.locator('#technology-panel')); await action('technology-close').tap();
        await direction(1); await shot(`${label}-build`);
        measurements.push({ label, targets: await page.locator('.game-menu > summary, .direction-buttons button').evaluateAll(nodes => nodes.map(n => { const b=n.getBoundingClientRect(); return { text:n.textContent, width:b.width,height:b.height,fontSize:getComputedStyle(n).fontSize }; })) });
        for (const b of await page.locator('.game-menu > summary, .direction-buttons button').all()) { const box=await b.boundingBox(); assert(box.width>=48 && box.height>=48); }
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.setViewportSize({width:height,height:width}); await direction(0); await page.setViewportSize({width,height}); await direction(2);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        value = await save(); assert.equal(value.buildings.length,5); assert.equal(value.delivered,0); assert.equal(value.market.coins,0);
        await page.reload(); await page.locator('canvas').waitFor(); await page.locator('[data-speed="0"]').tap(); await action('guide-close').tap();
        await menu(); await action('load').tap(); await page.waitForFunction(()=>document.querySelector('#game-message').textContent.includes('再開しました')); await closeMenu();
        assert.deepEqual(await save(),value);
        record(`${label}: menu gates map taps; touch scroll preserves reachable close; catalog category/select and technology close work; orientation resize and v5 save/resume preserve all five belts`);
      }
      await page.close();
    }
    if (!before) for (const width of [390,320]) {
      page = await browser.newPage({viewport:{width,height:844},isMobile:true,hasTouch:true});
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(url); await page.locator('canvas').waitFor(); await page.locator('[data-speed="0"]').tap(); await action('guide-close').tap();
      await page.locator('[data-quick="1"]').tap(); await direction(0); await cell(13,16); await direction(3); await cell(14,16);
      await cell(13,16); await direction(2);
      assert.match(await page.locator('#direction-title').textContent(),/選択ベルト/);
      const heading=await page.locator('.selection-heading').boundingBox(),header=await page.locator('.workshop-top').boundingBox();
      assert(heading.y>=header.y+header.height);
      await shot(`narrow-${width}-selected`);
      await page.locator('#quickbar [data-action="build-open"]').tap();
      const catalog=await page.locator('.build-dock').boundingBox(); assert(catalog.y>=header.y+header.height);
      await shot(`narrow-${width}-catalog`); await action('build-close').tap();
      await menu(); await shot(`narrow-${width}-menu`); await closeMenu();
      const value=await save(); assert.equal(value.buildings.length,2); assert.deepEqual(value.buildings.map(b=>b.direction),[2,3]);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      record(`${width}px: touch placement and selected heading, unobstructed panel heading, menu open/close/save, no viewport overflow`);
      await page.close();
    }
    assert.deepEqual(errors, []); assert.deepEqual(failures, []);
    fs.rmSync(path.join(output,'failure.png'),{force:true});
    fs.writeFileSync(path.join(output,'results.json'), JSON.stringify({ baseline:before, runtimeSHA256, cssSHA256, measurements, checks, errors, failures, physicalIPad:'not tested; Chromium touch emulation only' }, null, 2)+'\n');
    console.log(JSON.stringify({ output, measurements, checks }));
  } catch (error) { if (page) await page.screenshot({ path:path.join(output,'failure.png'), fullPage:true }).catch(()=>{}); throw error; }
  finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode=1; });
