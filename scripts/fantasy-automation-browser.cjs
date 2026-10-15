/* global __dirname, process */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');

(async () => {
  const root = path.resolve(__dirname, '..');
  const built = process.argv.includes('--built');
  const directory = path.join(root, built ? '.pages-dist' : 'web');
  const output = path.join(root, 'artifacts/fantasy-automation', built ? 'built' : 'source');
  fs.mkdirSync(output, { recursive: true });
  assert(fs.existsSync(path.join(directory, 'fantasy-automation.html')), 'Game entry missing; build first for --built');
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
  const server = http.createServer((request, response) => {
    const file = path.resolve(directory, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, content) => {
      if (error) response.writeHead(404).end();
      else response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/fantasy-automation.html`;
  let browser;
  try {
    const executablePath = process.env.FANTASY_BROWSER_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const errors = [], requests = [], checks = [];
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const monitor = target => {
      target.on('pageerror', error => errors.push(error.message));
      target.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) requests.push(response.url()); });
    };
    monitor(page);
    const action = name => page.locator(`[data-action="${name}"]:visible`).first();
    const dismissGuide = async () => { const close = page.locator('[data-action="guide-close"]'); if (await close.count() && await close.isVisible()) await close.click(); };
    const chooseBuild = async kind => {
      if (!await page.locator('.build-dock').isVisible()) await action('build-open').click();
      const categories = page.locator('[data-category]');
      for (let index = 0; index < await categories.count(); index += 1) {
        await categories.nth(index).click();
        const choice = page.locator(`[data-build="${kind}"]:visible`);
        if (await choice.count()) { await choice.click(); return; }
      }
      throw new Error(`Building category missing ${kind}`);
    };
    const menu = async () => {
      if (!await page.locator('.game-menu').evaluate(node => node.open)) await page.locator('.game-menu > summary').click();
    };
    const readSave = () => page.evaluate(() => new Promise((resolve, reject) => {
      const open = indexedDB.open('aigames-fantasy-automation', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const database = open.result;
        const request = database.transaction('saves', 'readonly').objectStore('saves').get('workshop');
        request.onsuccess = () => { database.close(); resolve(request.result); };
        request.onerror = () => { database.close(); reject(request.error); };
      };
    }));
    const save = async () => {
      await menu();
      await action('save').click();
      await page.waitForFunction(() => document.querySelector('#game-message')?.textContent.includes('保存しました'));
      if (await page.locator('.game-menu').evaluate(n=>n.open)) await action('menu-close').click();
      return readSave();
    };
    const load = async () => {
      await menu();
      await action('load').click();
      await page.waitForFunction(() => document.querySelector('#game-message')?.textContent.includes('再開しました'));
      if (await page.locator('.game-menu').evaluate(n=>n.open)) await action('menu-close').click();
    };
    const cellPoint = async (x, z) => page.evaluate(async ({ x, z }) => {
        const THREE = await import('three');
        const bounds = document.querySelector('#world canvas').getBoundingClientRect();
        const extent = 11, aspect = bounds.width / bounds.height;
        const camera = new THREE.OrthographicCamera(-extent * aspect, extent * aspect, extent, -extent, 0.1, 150);
        camera.position.set(13 + Math.sin(Math.PI / 4) * 25, 29, 16 + Math.cos(Math.PI / 4) * 25);
        camera.lookAt(13, 0, 16); camera.updateMatrixWorld();
        const projected = new THREE.Vector3(x, 0, z).project(camera);
        return { x: bounds.x + (projected.x + 1) * bounds.width / 2, y: bounds.y + (1 - projected.y) * bounds.height / 2 };
      }, { x, z });
    const clickCell = async (x, z) => {
      const point = await cellPoint(x, z);
      await page.mouse.click(point.x, point.y);
    };
    await page.goto(url);
    await page.waitForSelector('#world canvas');
    await dismissGuide();
    assert.equal(await page.title(), 'AI Games');
    await page.locator('[data-speed="0"]').click();
    const initial = await save();
    assert(initial && initial.version === 3);
    // Real canvas picking builds a belt; menus must not accidentally build cells.
    const canvas = page.locator('#world canvas');
    const box = await canvas.boundingBox();
    assert(box.width > 0 && box.height > 0);
    await chooseBuild('belt');
    await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.48);
    await action('cancel').click();
    const placed = await save();
    assert.equal(placed.buildings.length, initial.buildings.length + 1, 'Canvas click places one belt');
    await load();
    const roundtrip = await save();
    assert.deepEqual(roundtrip, placed, 'Paused factory survives an exact save/load roundtrip');
    for (let index = 0; index < 5; index += 1) { await load(); assert.deepEqual(await save(), placed); }
    checks.push('canvas placement; five repeated exact paused save/load operations');

    const original = placed.buildings[0];
    await clickCell(original.x, original.z);
    await page.keyboard.press('KeyR');
    assert.equal((await save()).buildings[0].direction, (original.direction + 1) % 4, 'R rotates selected facility');
    await page.keyboard.down('Shift');
    await clickCell(original.x, original.z);
    await page.keyboard.up('Shift');
    await clickCell(8, 14);
    await action('cancel').click();
    const copied = await save();
    assert.equal(copied.buildings.length, 2);
    assert.equal(copied.buildings[1].kind, original.kind);
    assert.equal(copied.buildings[1].direction, (original.direction + 1) % 4, 'Shift copies the selected facility direction');
    await clickCell(8, 14);
    await page.keyboard.down('KeyX');
    await clickCell(8, 14);
    await page.keyboard.up('KeyX');
    assert.equal((await save()).buildings.length, 1, 'X plus click removes only the selected facility');
    await chooseBuild('belt');
    const start = await cellPoint(10, 14), end = await cellPoint(12, 14);
    await page.mouse.move(start.x, start.y); await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 1 }); await page.mouse.up();
    await action('cancel').click();
    const dragged = await save();
    assert.equal(dragged.buildings.length, 4, 'Fast drag creates three continuous belt cells');
    assert.deepEqual(dragged.buildings.slice(1).map(value => [value.x, value.z]), [[10, 14], [11, 14], [12, 14]]);
    checks.push('R rotation; Shift copy; X removal; fast continuous belt drag');

    await page.locator('[data-speed="2"]').click();
    await page.waitForTimeout(300);
    await page.locator('[data-speed="0"]').click();
    let progressed = await save();
    assert(progressed.tick > dragged.tick, '2x speed advances simulation');
    await load();
    await page.waitForTimeout(120);
    assert.deepEqual(await save(), progressed, 'Pause preserves tick and item state');
    await page.reload();
    await page.waitForSelector('#world canvas');
    await dismissGuide();
    await page.locator('[data-speed="0"]').click();
    await load();
    assert.deepEqual(await save(), progressed, 'Reload and explicit resume restore the exact factory');
    checks.push('2x progression; pause; reload and persisted resume');

    // Build the documented starter entirely through palette/canvas interaction.
    await menu();
    page.once('dialog', dialog => dialog.accept());
    await action('new').click();
    await dismissGuide();
    await page.locator('[data-speed="0"]').click();
    await page.locator('.game-menu > summary').click();
    const starter = [
      ['miner', 12, 16], ['belt', 13, 16], ['smelter', 14, 16], ['belt', 15, 16], ['delivery', 16, 16],
      ['generator', 12, 18], ['wire', 12, 17], ['wire', 13, 17], ['wire', 14, 17],
      ['lumber', 9, 18], ['belt', 10, 18], ['belt', 11, 18],
    ];
    for (const [kind, x, z] of starter) {
      await chooseBuild(kind);
      await clickCell(x, z);
    }
    await action('cancel').click();
    const constructed = await save();
    assert.equal(constructed.buildings.length, starter.length, 'All twelve facilities built through real UI inputs');
    assert.deepEqual(constructed.buildings.map(value => [value.kind, value.x, value.z]), starter);
    assert.equal(constructed.inventory.wood, 23);
    assert.equal(constructed.inventory.ingot, 12);
    await page.locator('.game-menu > summary').click();
    await page.screenshot({ path: path.join(output, 'starter-constructed.png'), fullPage: true });
    await page.locator('[data-speed="2"]').click();
    await page.waitForFunction(() => Number(document.querySelector('#delivered-count')?.textContent) >= 1, undefined, { timeout: 30000 });
    await page.locator('[data-speed="0"]').click();
    progressed = await save();
    assert(progressed.delivered >= 1, 'Real UI factory autonomously mines, transports, smelts and delivers');
    assert(progressed.buildings.find(value => value.kind === 'generator').input.length >= 1, 'Wood harvesting supplies the magic furnace');
    await page.locator('.game-menu > summary').click();
    await page.screenshot({ path: path.join(output, 'starter-producing.png'), fullPage: true });
    checks.push({ realUiStarter: '12 facilities built with initial resources; automatic fuel/mining/smelting/delivery passed', delivered: progressed.delivered, tick: progressed.tick });

    // Camera controls and resize affect presentation, never the paused game state.
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(box.x + box.width * 0.7, box.y + box.height * 0.53, { steps: 5 });
    await page.mouse.up({ button: 'right' });
    await page.mouse.wheel(0, -180);
    await page.keyboard.press('KeyQ');
    await menu();
    await action('camera').click();
    assert.deepEqual(await save(), progressed);
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await page.waitForFunction(() => {
        const bounds = document.querySelector('#world canvas').getBoundingClientRect();
        return Math.abs(bounds.width - innerWidth) <= 1 && Math.abs(bounds.height - innerHeight) <= 1;
      });
      const layout = await page.evaluate(() => {
        const canvas = document.querySelector('#world canvas');
        const bounds = canvas.getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth, canvasWidth: bounds.width, canvasHeight: bounds.height,
          paletteCount: document.querySelectorAll('[data-build]').length };
      });
      assert.equal(layout.overflow, false, `No horizontal overflow at ${width}px`);
      assert(Math.abs(layout.canvasWidth - width) <= 1);
      assert(Math.abs(layout.canvasHeight - (width === 1440 ? 900 : 844)) <= 1);
      assert.equal(layout.paletteCount, 16);
      await page.screenshot({ path: path.join(output, `viewport-${width}.png`), fullPage: true });
      checks.push({ width, ...layout });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(async () => {
      const canvas = document.querySelector('#world canvas');
      const gl = canvas.getContext('webgl2');
      const extension = gl?.getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('WEBGL_lose_context unavailable');
      extension.loseContext();
      await new Promise(resolve => setTimeout(resolve, 100));
      extension.restoreContext();
    });
    await page.waitForTimeout(300);
    assert.deepEqual(await save(), progressed, 'Context recovery preserves simulation');
    await page.screenshot({ path: path.join(output, 'context-restored.png'), fullPage: true });
    checks.push('camera controls; WebGL context loss/recovery');

    // Inject a valid storage fixture, then exercise the application's validation/load/save path.
    const fixture = structuredClone(progressed);
    const belt = fixture.buildings.find(value => value.kind === 'belt');
    belt.item = { resource: 'ore', automated: true }; belt.beltProgress = 0.25;
    fixture.buildings.push({ id: fixture.nextId++, kind: 'smelter', x: 20, z: 20, direction: 1,
      input: [], reserved: [{ resource: 'ore', automated: true }, { resource: 'ore', automated: false }], output: [], recipe: 'ingot',
      progress: 0.4, working: true, energy: 0, status: '稼働中', item: null, beltProgress: 0 });
    fixture.buildings.push({ id: fixture.nextId++, kind: 'generator', x: 20, z: 21, direction: 1,
      input: [], reserved: [{ resource: 'wood', automated: true }], output: [], progress: 10, working: true,
      energy: 20, pendingEnergy: 10, status: '完成魔力を保持中', item: null, beltProgress: 0 });
    await page.evaluate(state => new Promise((resolve, reject) => {
      const open = indexedDB.open('aigames-fantasy-automation', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const database = open.result;
        const transaction = database.transaction('saves', 'readwrite');
        transaction.objectStore('saves').put(state, 'workshop');
        transaction.oncomplete = () => { database.close(); resolve(); };
        transaction.onerror = () => { database.close(); reject(transaction.error); };
      };
    }), fixture);
    await load();
    assert.deepEqual(await save(), fixture);
    checks.push('IndexedDB exact item/progress/provenance/pending energy roundtrip through UI');

    const deniedContext = await browser.newContext();
    await deniedContext.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { value: { open() { throw new DOMException('Storage denied', 'SecurityError'); } } });
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
    });
    const fallback = await deniedContext.newPage(); monitor(fallback);
    await fallback.goto(url);
    await fallback.locator('.game-menu > summary').click();
    await fallback.locator('[data-action="save"]').click();
    await fallback.waitForTimeout(100);
    assert((await fallback.locator('#game-ui').textContent()).includes('保存できません') || (await fallback.locator('#game-ui').textContent()).includes('WebGL'));
    await fallback.screenshot({ path: path.join(output, 'fallback.png'), fullPage: true });
    checks.push('denied storage and unavailable WebGL keep Japanese controls readable');
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify({ mode: built ? 'built' : 'source', browser: await browser.version(), checks, pageErrors: errors, failedRequests: requests }, null, 2) + '\n');
    console.log(`Fantasy automation browser checks passed (${built ? 'built' : 'source'}): placement, persistence, repeated controls, resize, context recovery, fallback.`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
