/* global __dirname, process */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

(async () => {
  const root = path.resolve(__dirname, '..'), built = process.argv.includes('--built');
  const directory = path.join(root, built ? '.pages-dist' : 'web');
  const output = path.join(root, 'artifacts/fantasy-automation/technology', built ? 'built' : 'source');
  fs.mkdirSync(output, { recursive: true });
  // Fixtures are produced by the actual pure simulation; no browser game global is exposed.
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import fs from 'node:fs';
    import { Simulation } from './web/js/fantasy-automation/simulation.ts';
    import { validateSave } from './web/js/fantasy-automation/storage.ts';
    import { swordFactory } from './web/js/fantasy-automation/newsystems.test.ts';
    const output = process.argv[1];
    const basic = new Simulation();
    const placements = [['miner',12,16],['belt',13,16],['smelter',14,16],['belt',15,16],['delivery',16,16],['generator',12,18],['wire',12,17],['wire',13,17],['wire',14,17],['lumber',9,18],['belt',10,18],['belt',11,18]];
    for(const [kind,x,z] of placements) { const result=basic.command({type:'build',kind,x,z,direction:1});if(!result.ok)throw new Error(result.reason); }
    for(let tick=0;tick<80*20;tick++)basic.step();
    fs.writeFileSync(output+'/available.json',JSON.stringify(validateSave(basic.snapshot())));
    for(const facility of basic.state.buildings){const excess=facility.input.length+(facility.reserved?.length||0)-8;if(excess>0)basic.command({type:'collect',id:facility.id,amount:excess});}
    const legacy=basic.snapshot();legacy.version=1;delete legacy.stats;delete legacy.research;delete legacy.inventoryItems;delete legacy.pendingCrystalCells;
    for(const resource of ['rawCrystal','crystal','sword','runeCore','golemFrame','golem'])delete legacy.inventory[resource];
    legacy.terrain=legacy.terrain.map(tile=>tile==='crystal'?'grass':tile);
    for(const facility of legacy.buildings){facility.input=[...(facility.reserved||[]),...facility.input];delete facility.reserved;delete facility.recipe;delete facility.splitCursor;for(const item of [...facility.input,...facility.output,...(facility.item?[facility.item]:[])])delete item.handled;}
    fs.writeFileSync(output+'/legacy.json',JSON.stringify(legacy));
    fs.writeFileSync(output+'/legacy-migrated.json',JSON.stringify(validateSave(legacy)));
    const advanced=swordFactory();
    for(let tick=0;tick<120*20;tick++)advanced.step();
    const state=advanced.snapshot();
    for(const facility of state.buildings){facility.x+=8;facility.z+=12;}
    state.terrain=Array(1024).fill('grass');
    for(const facility of state.buildings){if(facility.kind==='miner')state.terrain[facility.z*32+facility.x]='ore';if(facility.kind==='crystalMiner')state.terrain[facility.z*32+facility.x]='crystal';}
    state.buildings.push({id:state.nextId++,kind:'splitter',x:16,z:17,direction:1,input:[],output:[],reserved:[],progress:0,working:false,energy:0,status:'搬送品待ち',item:null,beltProgress:0,splitCursor:0});
    fs.writeFileSync(output+'/advanced.json',JSON.stringify(validateSave(state)));
  `, output], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const fixture = name => JSON.parse(fs.readFileSync(path.join(output, name + '.json'), 'utf8'));
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  const server = http.createServer((request, response) => {
    const file = path.resolve(directory, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, content) => error ? response.writeHead(404).end() : response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(content));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/fantasy-automation.html`;
  let browser, page;
  const errors = [], badRequests = [], checks = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.FANTASY_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) badRequests.push(response.url()); });
    await page.goto(url); await page.waitForSelector('[data-action="technology-open"]');
    await page.locator('[data-speed="0"]').click();
    const action = name => page.locator(`[data-action="${name}"]:visible`).first();
    const menu = async () => { if (!await page.locator('.game-menu').evaluate(node => node.open)) await page.locator('.game-menu > summary').click(); };
    const closeGuide = async () => { if (await action('guide-close').isVisible()) await action('guide-close').click(); };
    const chooseBuild = async kind => {
      if (!await page.locator('.build-dock').isVisible()) await action('build-open').click();
      const categories = page.locator('[data-category]');
      for (let index = 0; index < await categories.count(); index += 1) {
        await categories.nth(index).click(); const choice = page.locator(`[data-build="${kind}"]:visible`);
        if (await choice.count()) { await choice.click();return; }
      }
      throw new Error(`Building category missing ${kind}`);
    };
    const readSlot = () => page.evaluate(() => new Promise((resolve, reject) => {
      const open = indexedDB.open('aigames-fantasy-automation', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => { const db = open.result; const request = db.transaction('saves').objectStore('saves').get('workshop');
        request.onsuccess = () => { db.close(); resolve(request.result); }; request.onerror = () => { db.close(); reject(request.error); }; };
    }));
    const save = async () => { await menu(); await action('save').click();
      await page.waitForFunction(() => [...document.querySelectorAll('#game-message,#guide-feedback')].some(node => node.textContent.includes('保存しました'))); return readSlot(); };
    const put = state => page.evaluate(state => new Promise((resolve, reject) => {
      const open = indexedDB.open('aigames-fantasy-automation', 1);
      open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('saves')) open.result.createObjectStore('saves'); };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => { const db = open.result, tx = db.transaction('saves', 'readwrite');tx.objectStore('saves').put(state, 'workshop');
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onerror = () => { db.close(); reject(tx.error); }; };
    }), state);
    const load = async state => { if (state) await put(state); await menu(); await action('load').click();
      await page.waitForFunction(() => [...document.querySelectorAll('#game-message,#guide-feedback')].some(node => node.textContent.includes('再開しました'))); };
    const tree = async () => { if (!await page.locator('#technology-panel').isVisible()) { await menu(); await action('technology-open').click(); } };
    const closeTree = async () => { if (await page.locator('.game-menu').evaluate(node => node.open)) await action('menu-close').click(); await action('technology-close').click(); };
    const cell = async (x, z) => {
      const point = await page.evaluate(async ({ x, z }) => { const THREE = await import('three'); const b = document.querySelector('canvas').getBoundingClientRect();
        const aspect = b.width / b.height, camera = new THREE.OrthographicCamera(-11 * aspect, 11 * aspect, 11, -11, .1, 150);
        camera.position.set(13 + Math.sin(Math.PI / 4) * 25, 29, 16 + Math.cos(Math.PI / 4) * 25);camera.lookAt(13, 0, 16);camera.updateMatrixWorld();
        const p = new THREE.Vector3(x, 0, z).project(camera);return { x: b.x + (p.x + 1) * b.width / 2, y: b.y + (1 - p.y) * b.height / 2 }; }, { x, z });
      await page.mouse.click(point.x, point.y);
    };
    await closeGuide(); await tree();
    assert.equal(await page.locator('[data-tech="basic"]').getAttribute('data-tech-status'), 'unlocked');
    for (const id of ['logistics', 'crystals', 'assembly', 'mastery']) assert.equal(await page.locator(`[data-tech="${id}"]`).getAttribute('data-tech-status'), 'locked');
    await page.locator('[data-track="assembly"]').click();
    assert((await page.locator('#tracked-goal').innerText()).includes('魔導剣'));
    await page.screenshot({ path: path.join(output, 'tree-initial.png'), fullPage: true });
    await closeTree();
    await chooseBuild('storage');
    assert(await page.locator('#technology-panel').isVisible(), 'Locked facility leads to its visible research requirements');
    assert.equal((await save()).buildings.length, 0, 'UI research interactions do not place buildings through the overlay');
    await closeTree();
    checks.push('Visible initial graph states; tracking; locked facility opens tree without leaking canvas input');

    const legacy = fixture('legacy'); await load(legacy);
    assert.deepEqual(await readSlot(), legacy, 'Loading old save does not overwrite the IndexedDB slot');
    const migrated = await save(); assert.deepEqual(migrated, fixture('legacy-migrated'));
    assert.equal(migrated.version, 3);
    checks.push('Real legacy workshop retains ticks/items/progress/power; old slot unchanged until explicit save');

    await load(fixture('available')); await tree();
    for (const id of ['logistics', 'crystals']) assert.equal(await page.locator(`[data-tech="${id}"]`).getAttribute('data-tech-status'), 'available');
    await page.locator('[data-research="logistics"]').click(); await page.locator('[data-research="crystals"]').click();
    assert.equal(await page.locator('[data-tech="logistics"]').getAttribute('data-tech-status'), 'unlocked');
    assert.equal(await page.locator('[data-tech="crystals"]').getAttribute('data-tech-status'), 'unlocked');
    await page.screenshot({ path: path.join(output, 'tree-branches-researched.png'), fullPage: true });
    await closeTree();

    await load(fixture('advanced')); await closeGuide();
    if (await page.locator('.game-menu').evaluate(node => node.open)) await action('menu-close').click();
    assert.match(await page.locator('#objective-title').innerText(), /魔導剣|量産/, 'Advanced workshop shows its current sword-production research goal');
    await tree(); assert.equal(await page.locator('[data-tech="mastery"]').getAttribute('data-tech-status'), 'available');
    await page.locator('[data-track="mastery"]').click();
    await closeTree();
    const before = await save();
    await action('menu-close').click();
    await page.locator('[data-speed="2"]').click();
    // Measure a fresh full simulation minute in the browser, not lifetime delivery or a prefilled counter.
    const start = before.tick;
    let after;
    for (let elapsed = 0; elapsed < 50; elapsed += 1) {
      await page.waitForTimeout(1000);
      after = await save();
      if (after.tick - start >= 1200) break;
    }
    await page.locator('[data-speed="0"]').click(); after = await save();
    const elapsedTicks = after.tick - start, produced = after.stats.produced.sword - before.stats.produced.sword;
    const rate = produced * 1200 / elapsedTicks;
    const rolling = after.stats.recentSwordTicks.filter(tick => tick > after.tick - 1200 && tick <= after.tick).length;
    assert(elapsedTicks >= 1200 && rate >= 10, `Actual browser production ${produced} swords / ${elapsedTicks / 20}s = ${rate}/min`);
    assert(rolling >= 10, `The exact rolling 60 game seconds contain ${rolling} automatic sword completions`);
    assert(after.stats.delivered.sword > before.stats.delivered.sword);
    await action('menu-close').click();
    await page.screenshot({ path: path.join(output, 'automatic-sword-factory.png'), fullPage: true });
    await tree(); await page.locator('[data-research="mastery"]').click();
    assert.equal(await page.locator('[data-tech="mastery"]').getAttribute('data-tech-status'), 'unlocked');
    await page.screenshot({ path: path.join(output, 'tree-mastery.png'), fullPage: true });
    await closeTree();
    checks.push({ automaticSwordProduction: produced, elapsedGameSeconds: elapsedTicks / 20, measuredSwordsPerGameMinute: rate, rollingSwordsInExact60GameSeconds: rolling, mastery: 'researched through real UI' });

    await cell(11, 13);
    assert((await page.locator('#selection-title').innerText()).includes('収納箱'));
    assert((await page.locator('#storage-capacity').innerText()).includes('32'));
    const stored = await save(); await action('menu-close').click();
    if (!await page.locator('#advanced-collect').evaluate(node => node.open)) await page.locator('#advanced-collect > summary').click();
    await page.locator('#collect-resource').selectOption('wood'); await page.locator('#collect-amount').fill('1');
    await action('collect-count').click();
    const collected = await save();
    assert.equal(collected.inventory.wood, stored.inventory.wood + 1);
    assert(collected.inventoryItems.some(item => item.resource === 'wood' && item.automated && item.handled));
    await action('menu-close').click(); await cell(14, 17);
    const deliveryText = await page.locator('#selection-panel').innerText();
    assert(deliveryText.includes('鉄の延べ棒') && deliveryText.includes('魔導剣'));
    checks.push('Storage UI explicitly shows finite 32 slots and withdrawal retains handled provenance; delivery names its two goods');

    await action('close-panel').click(); await menu(); await action('menu-close').click();
    assert.equal(await page.locator('.game-menu').evaluate(node => node.open), false);
    await menu();
    await page.locator('#main-help > summary').click();
    await page.locator('#main-help [data-action="help-close"]').click();
    assert.equal(await page.locator('#main-help').evaluate(node => node.open), false);
    await action('menu-close').click();
    if (!await page.locator('.build-dock').isVisible()) await action('build-open').click();
    await action('build-close').click(); assert(await page.locator('#build-reopen').isVisible());
    await action('build-open').click();
    const saved = await save();
    await page.reload(); await page.waitForSelector('canvas'); await page.locator('[data-speed="0"]').click();
    await closeGuide(); await load(); assert.deepEqual(await save(), saved);
    checks.push('Menu/build panels close and reopen; progressed sword factory survives reload/load exactly');
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 }); await tree();
      await page.waitForFunction(()=>{const b=document.querySelector('canvas').getBoundingClientRect();return Math.abs(b.width-innerWidth)<=1&&Math.abs(b.height-innerHeight)<=1});
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(output, `tree-${width}.png`), fullPage: true });
      await closeTree();
    }
    assert.deepEqual(errors, []); assert.deepEqual(badRequests, []);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ mode: built ? 'built' : 'source', browser: await browser.version(), checks, pageErrors: errors, failedRequests: badRequests }, null, 2) + '\n');
    for (const name of ['failure.png', 'failure.json']) fs.rmSync(path.join(output, name), { force: true });
    console.log(`Technology browser QA passed (${built ? 'built' : 'source'}): ${rate.toFixed(2)} automatic swords/game minute, research, storage, save migration and panel controls.`);
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), checks, pageErrors: errors, failedRequests: badRequests }, null, 2) + '\n'); throw error;
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
