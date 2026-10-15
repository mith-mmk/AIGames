/* global __dirname, process */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const crypto = require('node:crypto');

(async () => {
  const root = path.resolve(__dirname, '..');
  const built = process.argv.includes('--built');
  const directory = path.join(root, built ? '.pages-dist' : 'web');
  const output = path.join(root, 'artifacts/fantasy-automation/phase4', built ? 'touch-built' : 'touch-source');
  fs.mkdirSync(output, { recursive: true });
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.mjs': 'text/javascript' };
  const server = http.createServer((request, response) => {
    const file = path.resolve(directory, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, data) => error ? response.writeHead(404).end() : response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(data));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const checks = [], errors = [], failedRequests = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.FANTASY_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    for (const width of [1440, 390, 320]) {
      const touch = width < 600;
      const page = await browser.newPage({ viewport: { width, height: touch ? 844 : 900 }, isMobile: touch, hasTouch: touch });
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) failedRequests.push(response.url()); });
      const action = name => page.locator(`[data-action="${name}"]:visible`).first();
      const activate = locator => touch ? locator.tap() : locator.click();
      const shot = name => page.screenshot({ path: path.join(output, `${name}-${width}.png`) });
      const fits = async selector => {
        const rect = await page.locator(selector).evaluate(node => { const b = node.getBoundingClientRect(); return { x: b.x, right: b.right, y: b.y, bottom: b.bottom, width: innerWidth, height: innerHeight }; });
        assert(rect.x >= 0 && rect.right <= rect.width && rect.y >= 0 && rect.bottom <= rect.height, `${selector} fits ${width}px`);
        return rect;
      };
      await page.goto(`http://127.0.0.1:${server.address().port}/fantasy-automation.html`);
      await page.locator('canvas').waitFor();
      await activate(page.locator('[data-speed="0"]'));
      await activate(page.locator('#quickbar [data-action="golem-guide-open"]'));
      const guide = await fits('#golem-guide'); await shot('golem-guide');
      await activate(action('golem-guide-close'));
      await activate(page.locator('#quickbar [data-action="build-open"]'));
      await page.locator('#build-search').fill('ゴーレム');
      assert.equal(await page.locator('[data-build]:visible').count(), 2);
      const lockedPrice = await page.locator('[data-build="golemForge"] .build-cost').textContent();
      assert(lockedPrice.length > 0 && !lockedPrice.includes('未解放'));
      const catalog = await fits('.build-dock'); await shot('catalog-golem');
      await activate(action('build-close'));
      await activate(action('guide-action'));
      await page.waitForFunction(() => document.querySelector('#guide-target')?.dataset.screenX !== undefined);
      const point = await page.locator('#guide-target').evaluate(node => ({ x: Number(node.dataset.screenX), y: Number(node.dataset.screenY) }));
      const pick = () => touch ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
      await pick();
      await page.waitForFunction(() => document.querySelector('#guide-card')?.dataset.guideId !== 'miner');
      await pick();
      await page.locator('#selection-panel:not([hidden])').waitFor();
      assert.match(await page.locator('#selection-title').textContent(), /採掘機/);
      const stock = () => page.locator('.resource-strip').textContent();
      const before = await stock();
      const requestRemoval = async () => {
        if (touch) await action('remove').tap();
        else { await page.locator('canvas').focus(); await page.keyboard.press('Delete'); }
        await page.locator('#demolition-dialog[open]').waitFor();
        assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'remove-cancel');
      };
      await requestRemoval();
      const dialog = await fits('#demolition-dialog'); await shot('delete-confirm');
      await activate(action('remove-cancel'));
      assert.equal(await stock(), before);
      assert.match(await page.locator('#selection-title').textContent(), /採掘機/);
      await requestRemoval(); await page.keyboard.press('Escape');
      assert.equal(await page.locator('#demolition-dialog').evaluate(node => node.open), false);
      assert.equal(await stock(), before);
      await requestRemoval(); await activate(action('remove-confirm'));
      assert.equal(await page.locator('#selection-panel').isVisible(), false);
      assert.equal(await page.locator('#demolition-dialog').evaluate(node => node.open), false);
      await shot('removed');
      checks.push({ width, input: touch ? 'actual touchscreen taps' : 'mouse and Delete', guide, catalog, dialog, lockedPrice, cancelPreservesStock: true, escapePreservesStock: true, confirmRemovesSelected: true });
      await page.close();
    }
    assert.deepEqual(errors, []); assert.deepEqual(failedRequests, []);
    const runtimeSHA256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, 'js/fantasy-automation/runtime/app.js'))).digest('hex');
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ mode: built ? 'built' : 'source', runtimeSHA256, checks, pageErrors: errors, failedRequests }, null, 2) + '\n');
    console.log(`Fantasy actual touch QA passed (${built ? 'built' : 'source'}): 1440/390/320, search, guide, cancel/Escape/confirm.`);
  } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
