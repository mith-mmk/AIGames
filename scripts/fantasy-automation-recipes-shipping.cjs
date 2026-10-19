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
  const output = path.join(root, 'artifacts/fantasy-automation/recipes-shipping', built ? 'built' : 'source');
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
    const menu = async () => { if (!await page.locator('.game-menu').evaluate(n => n.open)) await page.locator('.game-menu > summary').click(); };
    const closeMenu = async () => { if (await page.locator('.game-menu').evaluate(n => n.open)) await action('menu-close').click(); };
    const read = () => page.evaluate(() => new Promise((resolve, reject) => {
      const o = indexedDB.open('aigames-fantasy-automation', 1); o.onerror = () => reject(o.error);
      o.onsuccess = () => { const db = o.result, request = db.transaction('saves').objectStore('saves').get('workshop'); request.onsuccess = () => { db.close(); resolve(request.result); }; };
    }));
    const save = async () => { await menu(); await action('save').click(); await page.waitForFunction(() => [...document.querySelectorAll('#game-message,#guide-feedback')].some(n => n.textContent.includes('保存しました'))); await closeMenu(); return read(); };
    const put = state => page.evaluate(state => new Promise((resolve, reject) => {
      const o = indexedDB.open('aigames-fantasy-automation', 1); o.onupgradeneeded = () => o.result.createObjectStore('saves'); o.onerror = () => reject(o.error);
      o.onsuccess = () => { const db = o.result, tx = db.transaction('saves', 'readwrite'); tx.objectStore('saves').put(state, 'workshop'); tx.oncomplete = () => { db.close(); resolve(); }; };
    }), state);
    const load = async state => { await put(state); await menu(); await action('load').click(); await page.waitForFunction(() => [...document.querySelectorAll('#game-message,#guide-feedback')].some(n => n.textContent.includes('再開しました'))); await closeMenu(); };
    const choose = async kind => { await page.locator('#quickbar [data-action="build-open"]').click(); await page.locator('[data-category="all"]').click(); await page.locator('#build-search').fill(''); await page.locator(`[data-build="${kind}"]`).click(); };
    const point = (x, z) => page.evaluate(async ({ x, z }) => {
      const T = await import('three'), b = document.querySelector('canvas').getBoundingClientRect(), a = b.width / b.height;
      const c = new T.OrthographicCamera(-11 * a, 11 * a, 11, -11, .1, 150); c.position.set(13 + Math.sin(Math.PI / 4) * 25, 29, 16 + Math.cos(Math.PI / 4) * 25); c.lookAt(13, 0, 16); c.updateMatrixWorld();
      const p = new T.Vector3(x, 0, z).project(c); return { x: b.x + (p.x + 1) * b.width / 2, y: b.y + (1 - p.y) * b.height / 2 };
    }, { x, z });
    const cell = async (x, z, touch = false) => { const p = await point(x, z); if (touch) await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y); };
    const shot = name => page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true });
    const record = text => { checks.push(text); console.log(text); };
    const boot = async (width = 1440) => {
      page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600 });
      page.on('pageerror', error => errors.push(error.message)); page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) failures.push(response.url()); });
      await page.goto(url); await page.locator('canvas').waitFor(); await page.locator('[data-speed="0"]').click(); await action('guide-close').click();
    };


    for (const width of [390, 320]) {
      await boot(width); assert.equal(await page.locator('[data-build]').count(), 15);
      await choose('delivery'); await cell(17, 19, true); await cell(17, 19, true);
      await page.locator('#shipping-source').selectOption('inventory'); await page.locator('#shipping-resource').selectOption('wood'); await page.locator('#shipping-amount').fill('30');
      assert.match(await page.locator('#shipping-quote').textContent(), /売却 30個.*＋30/);
      await action('dispatch').tap(); let value = await save(); assert.equal(value.market.coins, 30); assert.equal(value.inventory.wood, 4);
      await action('buy-iron').tap(); value = await save(); assert.equal(value.market.coins, 0); assert.equal(value.inventory.ingot, 21);
      await page.locator('#shipping-resource').selectOption('ingot'); await page.locator('#shipping-amount').fill('1'); await action('dispatch').tap();
      value = await save(); assert.equal(value.market.coins, 10); assert.equal(value.delivered, 0); assert.equal(value.inventory.ingot, 20);
      await page.locator('#shipping-amount').fill('20'); await action('dispatch').tap(); value = await save(); assert.equal(value.inventory.ingot, 0); assert.equal(value.market.coins, 210);
      assert(await action('dispatch').isDisabled()); await action('dispatch').evaluate(b => b.click()); assert.equal((await save()).market.coins, 210);
      await action('buy-iron').tap(); await choose('belt'); await cell(16, 19, true); await page.locator('#quickbar [data-action="undo-build"]').tap();
      value = await save(); assert.equal(value.inventory.ingot, 1); assert.equal(value.inventory.wood, 4); assert.equal(value.market.coins, 180);
      await cell(17, 19, true); await shot(`manual-trading-${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      record(`${width}px: 15 catalog entries; real touch sales, purchase, quoted allocation, empty-stock repeat rejection and full belt undo preserve quantities`);
      await page.close();
    }

    await boot();
    for (const [kind, x, z] of [['miner',12,16],['belt',13,16],['smelter',14,16],['belt',15,16],['delivery',16,16],['generator',12,18],['wire',12,17],['wire',13,17],['wire',14,17],['lumber',9,18],['belt',10,18],['belt',11,18]]) { await choose(kind); await cell(x,z); }
    await action('cancel').click(); await cell(12,18); await page.locator('[data-feed-resource="wood"]').click(); await cell(16,16);
    await page.locator('#shipping-amount').fill('1'); await page.locator('[data-speed="2"]').click(); await page.waitForFunction(() => !document.querySelector('[data-action="dispatch"]').disabled, undefined, { timeout: 45000 }); await page.locator('[data-speed="0"]').click();
    let value = await save(); assert.equal(value.delivered,0); assert(value.buildings.find(b=>b.kind==='delivery').input.length>=1); await shot('first-arrival-waits');
    await action('dispatch').click(); value = await save(); assert.equal(value.delivered,1); assert.equal(value.market.coins,0);
    await page.locator('#shipping-amount').fill('9'); await page.locator('[data-speed="2"]').click(); await page.waitForFunction(() => !document.querySelector('[data-action="dispatch"]').disabled, undefined, { timeout: 45000 }); await page.locator('[data-speed="0"]').click();
    await action('dispatch').click(); value = await save(); assert.equal(value.delivered,10); assert.equal(value.market.coins,0); assert(!value.research.unlocked.includes('crystals'));
    assert.match(await page.locator('#shipping-quests').textContent(), /結晶加工.*研究可能/); await shot('request-reward-preview');
    await page.locator('#shipping-controls [data-action="technology-open"]').click(); await page.locator('[data-research="crystals"]').click(); await action('technology-close').click();
    assert.match(await page.locator('#game-message').textContent(), /解放.*魔晶採掘機.*精製魔晶レシピ/); await shot('specific-research-reward'); value = await save(); assert(value.research.unlocked.includes('crystals'));
    record('Fresh workshop: an actual mining/refining/fuel line stocks goods without consuming them; explicit manual shipping fulfills ten ingots; research remains an explicit action with named unlocks');

    const old = JSON.parse(fs.readFileSync(path.join(root,'artifacts/fantasy-automation/phase4/fixtures/world-awakened-ready.json')));
    await load(old); assert.deepEqual(await read(),old); const migrated=await save(); assert.equal(migrated.version,5); assert.deepEqual(migrated.market,{coins:0,sold:{}}); assert.deepEqual(migrated.inventory,old.inventory); assert.deepEqual(migrated.stats,old.stats);
    const aliases={crystalRefiner:'smelter',runeCarver:'assembler',frameForge:'assembler',golemForge:'assembler',portalForge:'assembler',seedLoom:'alchemyLab'};
    for (const b of old.buildings) { const a=migrated.buildings.find(a=>a.id===b.id); assert.equal(a.kind,aliases[b.kind]||b.kind); for(const k of ['x','z','direction','input','output','reserved','progress','working'])assert.deepEqual(a[k],b[k]); }
    record('Genuine historical v4: load leaves the IndexedDB slot untouched, then explicit v5 save keeps IDs, work, stock, research and production statistics, with zero retroactive currency');
    const funded=structuredClone(migrated); for(const key of Object.keys(funded.inventory))funded.inventory[key]=1000; await load(funded);
    const cells=new Set(funded.buildings.map(b=>`${b.x},${b.z}`)), free=[]; for(let z=12;z<=20;z++)for(let x=12;x<=18;x++)if(!cells.has(`${x},${z}`))free.push([x,z]);
    for (const [index,kind,recipe] of [[0,'smelter','crystal'],[1,'assembler','golem'],[2,'alchemyLab','worldSeed']]) {
      await choose(kind); await page.locator('#build-recipe-select').selectOption(recipe); await cell(...free[index]); const placed=await save(); const b=placed.buildings.find(b=>b.x===free[index][0]&&b.z===free[index][1]); assert.equal(b.kind,kind); assert.equal(b.recipe,recipe);
      await action('cancel').click(); await cell(...free[index]); assert.match(await page.locator('#selection-title').textContent(), new RegExp({'crystal':'精製魔晶','golem':'ゴーレム','worldSeed':'世界樹の種'}[recipe])); await shot(`common-${kind}`);
    }
    await cell(...free[1]); const before=await save(); await page.locator('#recipe-select').selectOption('sword'); await page.locator('#recipe-select').selectOption('golem'); const after=await save(); assert.deepEqual(after.inventory,before.inventory);
    const invalid=structuredClone(after), assembler=invalid.buildings.find(b=>b.x===free[1][0]&&b.z===free[1][1]); assembler.input=[{resource:'golemFrame',automated:true}]; await load(invalid); await cell(...free[1]); await page.locator('#recipe-select').selectOption('sword'); await page.waitForTimeout(200);
    const retained=await save(); assert.equal(retained.buildings.find(b=>b.id===assembler.id).recipe,'golem'); assert.deepEqual(retained.inventory,invalid.inventory); assert.deepEqual(retained.buildings.find(b=>b.id===assembler.id).input,assembler.input);
    record('Three common machines select unlocked products before placement and after placement; incompatible-stock switches reject without changing resources');
    await page.reload(); await page.locator('canvas').waitFor(); await page.locator('[data-speed="0"]').click(); await action('guide-close').click(); await load(retained); assert.deepEqual(await save(),retained);
    record('Reload and explicit resume preserve the canonical factory and shipping account exactly');
    assert.deepEqual(errors,[]); assert.deepEqual(failures,[]); fs.rmSync(path.join(output,'failure.png'),{force:true});
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({mode:built?'built':'source',checks,runtimeSHA256:crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,'js/fantasy-automation/runtime/app.js'))).digest('hex'),pageErrors:errors,failedRequests:failures,physicalIOS:'not tested; Chromium touch emulation only'},null,2)+'\n');
    console.log('Recipes and manual shipping browser QA passed.');
  } catch (error) { if(page) await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{}); throw error; }
  finally { await browser?.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
