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
  const output = path.join(root, 'artifacts/fantasy-automation/recovery', built ? 'built' : 'source');
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
    const stock = () => page.locator('.resource-strip').textContent();
    const record = text => { checks.push(text); console.log(text); };
    const boot = async (width = 1440) => {
      page = await browser.newPage({ viewport: { width, height: width < 600 ? 844 : 900 }, isMobile: width < 600, hasTouch: width < 600 });
      page.on('pageerror', error => errors.push(error.message)); page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) failures.push(response.url()); });
      await page.goto(url); await page.locator('canvas').waitFor(); await page.locator('[data-speed="0"]').click(); await action('guide-close').click();
    };

    for (const width of [390, 320]) {
      await boot(width); await choose('belt');
      const original = await stock(), camera = await page.locator('canvas').evaluate(n => ({ extent: Number(n.dataset.cameraExtent), target: n.dataset.cameraTarget }));
      const client = await page.context().newCDPSession(page);
      const touch = (type, points) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([id, x, y]) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 })) });
      const a = width * .3, b = width * .7, y = 490;
      await touch('touchStart', [[1, a, y]]); await page.waitForTimeout(120); assert.equal(await stock(), original, 'First contact must not spend construction stock');
      await touch('touchStart', [[1, a, y], [2, b, y]]);
      await touch('touchMove', [[1, a - 20, y + 20], [2, b + 25, y + 20]]);
      await touch('touchMove', [[1, a - 30, y + 30], [2, b + 35, y + 30]]); await touch('touchEnd', []);
      assert.equal(await stock(), original); const changed = await page.locator('canvas').evaluate(n => ({ extent: Number(n.dataset.cameraExtent), target: n.dataset.cameraTarget }));
      assert(changed.extent < camera.extent); assert.notEqual(changed.target, camera.target);
      await page.locator('canvas').dispatchEvent('pointerdown', { pointerId: 99, pointerType: 'mouse', button: 0, clientX: width / 2, clientY: y });
      await page.locator('canvas').dispatchEvent('pointerup', { pointerId: 99, pointerType: 'mouse', button: 0, clientX: width / 2, clientY: y });
      assert.equal(await stock(), original); assert.equal((await save()).buildings.length, 0);
      await touch('touchStart', [[3, a, y]]); await touch('touchMove', [[3, b, y + 20]]); await touch('touchEnd', []);
      await touch('touchStart', [[4, a, y]]); await touch('touchCancel', []); assert.equal((await save()).buildings.length, 0);
      await shot(`pinch-no-build-${width}`);
      await menu(); await action('camera').click(); await closeMenu();
      await cell(17, 19, true); const placed = await save(); assert.equal(placed.buildings.length, 1); assert.equal(placed.inventory.ingot, 19);
      await page.locator('#quickbar [data-action="undo-build"]').tap(); const undone = await save(); assert.equal(undone.buildings.length, 0); assert.equal(undone.inventory.ingot, 20); assert.equal(undone.inventory.wood, 40);
      await page.locator('[data-action="undo-build"]').evaluate(button => { button.click(); button.click(); }); assert.equal((await save()).inventory.ingot, 20);
      const legacyBelt = structuredClone(placed); legacyBelt.inventory.wood = 0; legacyBelt.inventory.ingot = 0; legacyBelt.inventoryItems = [];
      legacyBelt.buildings[0].item = { resource: 'ore', automated: true }; legacyBelt.buildings[0].beltProgress = .2;
      await load(legacyBelt); assert.deepEqual(await read(), legacyBelt); assert.equal(await page.locator('[data-action="undo-build"]').isDisabled(), true);
      await page.locator('#quickbar [data-action="cancel"]').evaluate(button => button.click()); await cell(17, 19, true);
      await page.locator('#selection-panel [data-action="remove"]').tap(); await page.locator('#demolition-dialog[open]').waitFor();
      assert.match(await page.locator('#demolition-summary').textContent(), /全額/); await shot(`old-save-belt-recovery-${width}`);
      await action('remove-cancel').tap(); assert.equal((await save()).inventory.ingot, 0);
      await page.locator('#selection-panel [data-action="remove"]').tap(); await action('remove-confirm').tap(); const recovered = await save();
      assert.equal(recovered.inventory.ingot, 1); assert.equal(recovered.inventory.wood, 1); assert.equal(recovered.inventory.ore, 1); assert.equal(recovered.buildings.length, 0);
      assert.deepEqual(recovered.stats, legacyBelt.stats); assert.equal(recovered.inventoryItems.filter(i => i.resource === 'ore' && i.handled).length, 1);
      await choose('belt'); await cell(17, 19, true); assert.equal((await save()).inventory.ingot, 0);
      await shot(`repaired-belt-${width}`); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      record(`${width}px: native two-touch pinch/pan and cancel cause zero builds; compatibility pointer is suppressed; tap/undo refunds once; an old zero-iron save recovers and rebuilds its belt`);
      await page.close();
    }

    await boot(); const initial = await save(); await choose('smelter'); await cell(14, 16); await page.locator('#quickbar [data-action="undo-build"]').click();
    const kitUndo = await save(); assert.equal(kitUndo.kits.smelter, 1); assert.deepEqual(kitUndo.inventory, initial.inventory);
    await choose('smelter'); await cell(14, 16); await choose('generator'); await cell(12, 18); await action('cancel').click();
    await cell(14, 16); assert.match(await page.locator('#selection-title').textContent(), /製錬炉/); assert.match(await page.locator('#furnace-role').textContent(), /鉄鉱石2.*魔力5/); await shot('smelter-role');
    await cell(12, 18); assert.match(await page.locator('#selection-title').textContent(), /魔力発生炉/); assert.match(await page.locator('#furnace-role').textContent(), /木材1.*魔力30/); await shot('generator-role');
    await page.locator('#quickbar [data-action="build-open"]').click(); await page.locator('[data-category="all"]').click();
    assert.equal(await page.locator('[data-build="smelter"] .furnace-smelter').count(), 1); assert.equal(await page.locator('[data-build="generator"] .furnace-generator').count(), 1);
    await page.locator('#build-search').fill('炉'); await shot('furnace-catalog'); await action('build-close').click();
    await page.locator('canvas').focus(); await page.keyboard.down('x'); await cell(14, 16); await page.keyboard.up('x');
    await page.locator('#demolition-dialog[open]').waitFor(); await page.keyboard.press('Escape'); assert.equal((await save()).buildings.length, 2);
    await action('cancel').click(); await cell(17, 19); assert.equal(await page.locator('#selection-panel').isVisible(), false);
    await page.locator('#selection-panel [data-action="remove"]').evaluate(button => button.click()); await cell(14, 16);
    await page.locator('#demolition-dialog[open]').waitFor(); await action('remove-cancel').click(); assert.equal((await save()).buildings.length, 2);
    record('Desktop: real kits return as kits; furnace names, input/output diagrams, icons and models differ; X and remove-mode both require cancellable confirmation');

    const old = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/fantasy-automation/phase4/before/golem-active-v3.json')));
    await load(old); assert.deepEqual(await read(), old); const migrated = await save(); assert.equal(migrated.version, 4);
    assert.deepEqual(migrated.inventory, { ...old.inventory, essence: 0, portalCore: 0, worldSeed: 0 });
    assert.deepEqual(migrated.buildings.map(b => [b.id, b.kind]), old.buildings.map(b => [b.id, b.kind]));
    await page.locator('#quickbar [data-action="golem-guide-open"]').click(); assert.match(await page.locator('#golem-guide-detail').textContent(), /魔力発生炉|木材|補給/); await shot('legacy-golem-guide');
    record('A genuine historical v3 slot migrates only on explicit save; resources and equipment IDs are unchanged and the golem guide remains available');
    assert.deepEqual(errors, []); assert.deepEqual(failures, []);
    fs.rmSync(path.join(output, 'failure.png'), { force: true });
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ mode: built ? 'built' : 'source', checks, runtimeSHA256: crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, 'js/fantasy-automation/runtime/app.js'))).digest('hex'), pageErrors: errors, failedRequests: failures, physicalIOS: 'not tested; Chromium CDP touch sequences and unit pointer events only' }, null, 2) + '\n');
    console.log('Touch/recovery browser QA passed.');
  } catch (error) { if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {}); throw error; }
  finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
