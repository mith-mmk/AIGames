/* global __dirname, process */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

(async () => {
  const root = path.resolve(__dirname, '..'), built = process.argv.includes('--built');
  const directory = path.join(root, built ? '.pages-dist' : 'web');
  const runtimeSHA256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, 'js/fantasy-automation/runtime/app.js'))).digest('hex');
  const output = path.join(root, 'artifacts/fantasy-automation/recipes-shipping/onboarding', built ? 'built' : 'source');
  fs.mkdirSync(output, { recursive: true });
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
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
  let browser, page;
  const errors = [], badRequests = [], actions = [], checks = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.FANTASY_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const monitor = target => {
      target.on('pageerror', error => errors.push(error.message));
      target.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) badRequests.push(response.url()); });
    };
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } }); monitor(page);
    await page.goto(url); await page.waitForSelector('#guide-card');
    await page.screenshot({ path: path.join(output, 'first-screen.png'), fullPage: true });
    const card = page.locator('#guide-card');
    const markerPoint = async target => {
      const marker = target.locator('#guide-target');
      await marker.waitFor({ state: 'visible' });
      const point = { x: Number(await marker.getAttribute('data-screen-x')), y: Number(await marker.getAttribute('data-screen-y')) };
      assert(Number.isFinite(point.x) && Number.isFinite(point.y), 'Map guide publishes its actual visible target');
      const viewport = target.viewportSize();
      assert(point.x > 0 && point.x < viewport.width && point.y > 0 && point.y < viewport.height, 'Guide target is on screen');
      const hit = await target.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest('#world, #guide-target')), point);
      assert(hit, 'Guide target is clickable without being covered by UI');
      return point;
    };
    let rotatedWrong = false, fixedRotation = false, cutWire = false, repairedWire = false, wirePoint = null;
    let repairStep = null;
    for (let iteration = 0; iteration < 80; iteration += 1) {
      await card.waitFor({ state: 'visible' });
      const mode = await card.getAttribute('data-guide-mode');
      const id = await card.getAttribute('data-guide-id');
      const text = await card.innerText();
      actions.push({ id, mode, text });
      assert(['build', 'rotate', 'feed', 'run', 'ship', 'recipe', 'done'].includes(mode), `Recognizable guide mode: ${mode}`);
      const cta = page.locator('[data-action="guide-action"]');
      if (mode === 'done') break;
      if (mode === 'build') {
        await cta.click();
        await page.waitForTimeout(80);
        const point = await markerPoint(page);
        if ((await page.locator('#guide-step-target').innerText()).includes('魔力導線') && !wirePoint) wirePoint = point;
        if (!rotatedWrong && /採掘機|製錬炉/.test(text)) {
          await page.locator('#world canvas').focus();
          await page.keyboard.press('KeyR');
          rotatedWrong = true;
        }
        await page.mouse.click(point.x, point.y);
        if (cutWire && id === repairStep) repairedWire = true;
      } else if (mode === 'rotate') {
        await cta.click();
        await page.locator('#selection-panel [data-action="rotate"]').click();
        fixedRotation = true;
        await page.screenshot({ path: path.join(output, 'rotation-repair.png'), fullPage: true });
      } else if (mode === 'feed') {
        assert(text.includes('木材'), 'Guide explicitly explains the fuel to supply');
        await cta.click();
        await page.locator('[data-feed-resource="wood"]').click();
      } else if (mode === 'ship') {
        await cta.click(); await page.locator('[data-action="dispatch"]').click();
      } else if (mode === 'recipe') { await cta.click();
      } else if (mode === 'run') {
        await cta.click();
        if (wirePoint && !cutWire) {
          await page.waitForFunction(() => Number(document.querySelector('#power-count')?.textContent.split('/')[0].trim()) > 0, undefined, { timeout: 30000 });
          await page.locator('[data-speed="0"]').click();
          await page.locator('[data-action="cancel"]:visible').first().click();
          await page.mouse.click(wirePoint.x, wirePoint.y);
          assert((await page.locator('#selection-title').innerText()).includes('魔力導線'), 'Select the wire learned from the guide, without solution coordinates');
          await page.keyboard.down('KeyX');
          await page.mouse.click(wirePoint.x, wirePoint.y);
          await page.keyboard.up('KeyX');
          if(await page.locator('#demolition-dialog').isVisible())await page.locator('[data-action="remove-confirm"]').click();
          cutWire = true;
          await page.waitForFunction(() => document.querySelector('#guide-card')?.getAttribute('data-guide-mode') === 'build');
          repairStep = await card.getAttribute('data-guide-id');
          await page.screenshot({ path: path.join(output, 'wire-repair-guidance.png'), fullPage: true });
        } else {
          await page.waitForFunction(() => document.querySelector('#guide-card')?.getAttribute('data-guide-mode') === 'ship' || Number(document.querySelector('#delivered-count')?.textContent) >= 1, undefined, { timeout: 60000 });
        }
      }
      await page.waitForTimeout(180);
    }
    assert(rotatedWrong && fixedRotation, 'A wrong placement direction gets an actionable recovery guide');
    assert(cutWire && repairedWire, 'Breaking a live power connection gets an actionable replacement guide');
    assert.equal(await card.getAttribute('data-guide-mode'), 'done');
    assert(Number(await page.locator('#delivered-count').innerText()) >= 1, 'Following only guide DOM earns the first automatic ingot');
    await page.locator('[data-speed="0"]').click();
    await page.screenshot({ path: path.join(output, 'first-ingot.png'), fullPage: true });
    checks.push('Guide-only first automatic ingot; intentional wrong rotation repair; live wire cut and recovery');

    await page.locator('[data-action="guide-close"]').click();
    assert(await card.isHidden(), 'Guide can be dismissed for free construction');
    await page.locator('[data-action="build-open"]:visible').first().click();
    await page.locator('[data-category="logistics"]').click();
    await page.locator('[data-build="belt"]:visible').click();
    const beforeWood = Number(await page.locator('.resource-strip [data-resource="wood"]').innerText());
    const bounds = await page.locator('#world canvas').boundingBox();
    await page.mouse.click(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.65);
    assert(Number(await page.locator('.resource-strip [data-resource="wood"]').innerText()) < beforeWood, 'Ordinary free construction remains available after the guide');
    await page.keyboard.press('Escape');
    if (!await page.locator('.game-menu').evaluate(node => node.open)) await page.locator('.game-menu > summary').click();
    await page.locator('[data-action="guide-open"]').click();
    assert(await card.isVisible());
    assert.equal(await page.locator('.game-menu').evaluate(node => node.open), false, 'Reopening guide closes the menu');
    checks.push('Close guide; free construction; reopen from menu');

    const menu = async () => {
      if (!await page.locator('.game-menu').evaluate(node => node.open)) await page.locator('.game-menu > summary').click();
    };
    const readSavedFactory = () => page.evaluate(() => new Promise((resolve, reject) => {
      const open = indexedDB.open('aigames-fantasy-automation', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const database = open.result;
        const request = database.transaction('saves', 'readonly').objectStore('saves').get('workshop');
        request.onsuccess = () => { database.close(); resolve(request.result); };
        request.onerror = () => { database.close(); reject(request.error); };
      };
    }));
    const saveFactory = async () => {
      await menu();
      await page.locator('[data-action="save"]').click();
      await page.waitForFunction(() => [...document.querySelectorAll('#game-message, #guide-feedback')].some(node => node.textContent.includes('保存しました')));
      return readSavedFactory();
    };
    const existingFactory = await saveFactory();
    for (let count = 0; count < 5; count += 1) {
      await page.locator('[data-action="guide-close"]').click();
      assert(await card.isHidden());
      await menu(); await page.locator('[data-action="guide-open"]').click();
      assert(await card.isVisible());
      assert.equal(await page.locator('.game-menu').evaluate(node => node.open), false);
      assert.deepEqual(await saveFactory(), existingFactory, 'Showing or hiding guidance preserves the existing paused factory');
    }
    await page.reload(); await page.waitForSelector('#guide-card');
    await page.locator('[data-speed="0"]').click();
    await menu(); await page.locator('[data-action="load"]').click();
    await page.waitForFunction(() => [...document.querySelectorAll('#game-message, #guide-feedback')].some(node => node.textContent.includes('再開しました')));
    await page.locator('[data-action="guide-close"]').click();
    await menu(); await page.locator('[data-action="guide-open"]').click();
    assert.deepEqual(await saveFactory(), existingFactory, 'Reload and explicit load retain every existing item and progress field');
    checks.push('Five guide close/open repetitions preserve exact saved state; reload and load preserve existing factory');

    for (const width of [390, 320]) {
      const mobile = await browser.newPage({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); monitor(mobile);
      await mobile.goto(url); await mobile.waitForSelector('#guide-card');
      const layout = await mobile.evaluate(() => {
        const card = document.querySelector('#guide-card').getBoundingClientRect();
        const cta = document.querySelector('[data-action="guide-action"]').getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth, cardLeft: card.left, cardRight: card.right,
          ctaOnScreen: cta.top >= 0 && cta.bottom <= innerHeight, ctaHeight: cta.height };
      });
      assert.equal(layout.overflow, false);
      assert(layout.cardLeft >= 0 && layout.cardRight <= width);
      assert(layout.ctaOnScreen && layout.ctaHeight >= 44, 'The next action is visible and touchable without knowing to scroll');
      await mobile.screenshot({ path: path.join(output, `first-screen-${width}.png`), fullPage: true });
      await mobile.locator('[data-action="guide-action"]').tap();
      await mobile.waitForTimeout(80);
      const point = await markerPoint(mobile);
      const oldId = await mobile.locator('#guide-card').getAttribute('data-guide-id');
      await mobile.touchscreen.tap(point.x, point.y);
      await mobile.waitForFunction(id => document.querySelector('#guide-card')?.getAttribute('data-guide-id') !== id, oldId);
      for (let step = 0; step < 50; step += 1) {
        const mode = await mobile.locator('#guide-card').getAttribute('data-guide-mode');
        if (mode === 'done') break;
        const cta = mobile.locator('[data-action="guide-action"]');
        if (mode === 'build') {
          await cta.tap(); await mobile.waitForTimeout(80);
          const point = await markerPoint(mobile);
          if ((await mobile.locator('#guide-step-target').innerText()).includes('木材採取場')) {
            await mobile.screenshot({ path: path.join(output, `fuel-target-${width}.png`), fullPage: true });
          }
          await mobile.touchscreen.tap(point.x, point.y);
        } else if (mode === 'feed') {
          await cta.tap();
          await mobile.locator('[data-feed-resource="wood"]').tap();
        } else if (mode === 'ship') {
          await cta.tap(); await mobile.locator('[data-action="dispatch"]').tap();
        } else if (mode === 'recipe') { await cta.tap();
        } else if (mode === 'run') {
          await cta.tap();
          await mobile.waitForFunction(() => document.querySelector('#guide-card')?.getAttribute('data-guide-mode') === 'ship' || Number(document.querySelector('#delivered-count')?.textContent) >= 1, undefined, { timeout: 60000 });
        } else if (mode === 'rotate') {
          await cta.tap(); await mobile.locator('#selection-panel [data-action="rotate"]').tap();
        } else throw new Error(`Unknown mobile guide mode: ${mode}`);
        await mobile.waitForTimeout(180);
      }
      assert.equal(await mobile.locator('#guide-card').getAttribute('data-guide-mode'), 'done');
      assert(Number(await mobile.locator('#delivered-count').innerText()) >= 1);
      await mobile.locator('[data-speed="0"]').tap();
      await mobile.screenshot({ path: path.join(output, `guide-completed-${width}.png`), fullPage: true });
      checks.push({ width, ...layout, guideThroughFirstIngotAndAutomaticFuel: 'touch passed; every target on screen and uncovered' });
      await mobile.close();
    }
    assert.deepEqual(errors, []); assert.deepEqual(badRequests, []);
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ runtimeSHA256, mode: built ? 'built' : 'source', browser: await browser.version(),
      approach: 'Only visible guide text/actions and projected map markers. No solution coordinates, game-state injection, or game global access.',
      checks, actions, pageErrors: errors, failedRequests: badRequests }, null, 2) + '\n');
    for (const name of ['failure.png', 'failure.json']) fs.rmSync(path.join(output, name), { force: true });
    console.log(`Fantasy onboarding QA passed (${built ? 'built' : 'source'}): guide-only first ingot, repairs, free mode, 390/320 touch.`);
  } catch (error) {
    if (page) await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
    fs.writeFileSync(path.join(output, 'failure.json'), JSON.stringify({ error: String(error), actions, checks, pageErrors: errors, failedRequests: badRequests }, null, 2) + '\n');
    throw error;
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
