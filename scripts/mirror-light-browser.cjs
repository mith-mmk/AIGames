const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

(async () => {
  const root = path.resolve(__dirname, '..'), output = path.join(root, 'artifacts/mirror-light');
  fs.mkdirSync(output, { recursive: true });
  const built = process.argv.includes('--built'), directory = path.join(root, built ? '.pages-dist' : 'web');
  assert(fs.existsSync(path.join(directory, 'mirror-light.html')), 'Build first with npm run build:pages');
  const types = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };
  const server = http.createServer((request, response) => {
    const file = path.resolve(directory, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, content) => {
      if (error) response.writeHead(404).end();
      else response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/mirror-light.html`;
  let browser;
  try {
    const executablePath = process.env.MIRROR_BROWSER_EXECUTABLE || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const { LEVELS } = await import(pathToFileURL(path.join(root, 'web/js/mirror-light/levels.mjs')));
    const { solveLevel } = await import(pathToFileURL(path.join(root, 'web/js/mirror-light/core.mjs')));
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage(), errors = [], badRequests = [], checks = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) badRequests.push(response.url()); });
    const state = () => page.locator('#status').getAttribute('data-state');
    const moves = () => page.locator('#moves').getAttribute('data-moves');
    const select = async (p, id, touch = false) => {
      const open = p.locator('#open-stages');
      if (await open.getAttribute('aria-expanded') === 'false') await (touch ? open.tap() : open.click());
      const stage = p.locator(`[data-stage="${id}"]`); await (touch ? stage.tap() : stage.click());
      await p.waitForTimeout(40);
    };
    await page.goto(url); await page.waitForSelector('canvas'); await page.waitForSelector('[data-mirror]');
    assert(await page.locator('#render-message').isHidden());
    await page.screenshot({ path: path.join(output, 'desktop-stage01.png'), fullPage: true });
    // Keyboard activation, three hint tiers, victory, undo after victory, reset.
    for (let n = 1; n <= 3; n++) { await page.locator('#hint').click(); assert((await page.locator('#hint-text').textContent()).includes(`${n}/3`)); }
    const first = page.locator('[data-mirror="0"]'); await first.focus(); await page.keyboard.press('Enter');
    assert.equal(await state(), 'won'); assert.equal(await moves(), '1');
    await page.locator('#undo').click(); assert.notEqual(await state(), 'won'); assert.equal(await moves(), '0');
    await first.click(); await page.locator('#next').click(); assert((await page.locator('#stage-title').textContent()).startsWith('02'));
    for (const level of LEVELS) {
      await select(page, level.id);
      const solution = solveLevel(level);
      for (const index of solution.best.actions) await page.locator(`[data-mirror="${index}"]`).click();
      assert.equal(await state(), 'won', `Desktop stage ${level.id}`); assert.equal(Number(await moves()), solution.minimum);
      assert.equal(await page.locator('[data-fixed="true"]').count(), level.mirrors.filter(m => m.fixed).length, 'Victory must retain silver vs fixed-gold labels');
      assert(await page.locator('#success').isVisible());
      if (level.id === 10) await page.screenshot({ path: path.join(output, 'desktop-stage10-cleared.png'), fullPage: true });
      await page.locator('#undo').click(); assert.notEqual(await state(), 'won');
      await page.locator('#reset').click(); assert.equal(await moves(), '0');
      assert.deepEqual(await page.locator('[data-mirror]').evaluateAll(elements => elements.map(e => Number(e.dataset.orientation))), level.mirrors.map(m => m.orientation));
      checks.push({ mode: 'desktop', stage: level.id, minimum: solution.minimum, solveUndoReset: 'passed' });
    }
    // Independent 3D picking: click the physical mirror below its DOM label.
    await select(page, 1);
    const label = await page.locator('[data-mirror="0"]').boundingBox();
    await page.mouse.click(label.x + label.width / 2, label.y + label.height / 2 + 24);
    assert.equal(await state(), 'won', 'Clicking the physical 3D mirror rotates it');
    await page.locator('#reset').click();
    const hashes = [];
    for (let n = 0; n < 4; n++) {
      await page.waitForTimeout(120);
      hashes.push(crypto.createHash('sha256').update(await page.locator('canvas').screenshot()).digest('hex'));
    }
    assert.equal(new Set(hashes).size, 1, 'The idle board must stay visually stable');
    // WebGL loss retains the current puzzle and recovers the same rendering.
    await page.evaluate(async () => {
      const extension = document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context');
      if (!extension) throw new Error('Context-loss test extension unavailable');
      extension.loseContext(); await new Promise(resolve => setTimeout(resolve, 100)); extension.restoreContext();
    });
    await page.waitForFunction(() => document.querySelector('#render-message').hidden);
    assert.equal(await moves(), '0');
    await page.reload(); await page.waitForSelector('[data-mirror]');
    assert((await page.locator('#progress').textContent()).includes('10 / 10'));

    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const mobile = await mobileContext.newPage(); mobile.on('pageerror', error => errors.push(error.message));
    await mobile.goto(url); await mobile.waitForSelector('[data-mirror]');
    for (const width of [390, 320]) {
      await mobile.setViewportSize({ width, height: 844 });
      for (const level of LEVELS) {
        await select(mobile, level.id, true);
        const layout = await mobile.evaluate(() => {
          const board = document.querySelector('#playfield').getBoundingClientRect();
          const buttons = [...document.querySelectorAll('[data-mirror]')].map(b => ({ id: b.textContent, rect: b.getBoundingClientRect(), disabled: b.disabled }));
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            inFrame: buttons.every(({ rect }) => rect.left > board.left && rect.right < board.right && rect.top > board.top && rect.bottom < board.bottom),
            individuallyTargetable: buttons.every(({ rect, id, disabled }) => disabled || document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.textContent === id),
            overlaps: buttons.some((a, i) => buttons.slice(i + 1).some(b => a.rect.left < b.rect.right - .5 && a.rect.right > b.rect.left + .5 && a.rect.top < b.rect.bottom - .5 && a.rect.bottom > b.rect.top + .5)),
          };
        });
        assert.equal(layout.overflow, false); assert.equal(layout.inFrame, true);
        assert.equal(layout.individuallyTargetable, true, `Mirror labels need distinct tap centers: ${width}px stage ${level.id}`);
        assert.equal(layout.overlaps, false, `Mirror labels overlap: ${width}px stage ${level.id}`);
        if (width === 390 && level.id === 8) await mobile.screenshot({ path: path.join(output, 'mobile-stage08.png'), fullPage: true });
        if (width === 320 && level.id === 10) await mobile.screenshot({ path: path.join(output, 'mobile-stage10.png'), fullPage: true });
        const solution = solveLevel(level);
        for (const index of solution.best.actions) await mobile.locator(`[data-mirror="${index}"]`).tap();
        assert.equal(await mobile.locator('#status').getAttribute('data-state'), 'won');
        assert.equal(Number(await mobile.locator('#moves').getAttribute('data-moves')), solution.minimum);
        if (width === 320 && level.id === 10) await mobile.screenshot({ path: path.join(output, 'mobile-stage10-cleared.png'), fullPage: true });
        await mobile.locator('#undo').tap(); assert.notEqual(await mobile.locator('#status').getAttribute('data-state'), 'won');
        await mobile.locator('#reset').tap(); assert.equal(await mobile.locator('#moves').getAttribute('data-moves'), '0');
        checks.push({ mode: 'touch', width, stage: level.id, ...layout, solveUndoReset: 'passed' });
      }
    }
    await mobile.locator('.help summary').tap();
    for (const control of ['undo', 'reset', 'hint', 'mirror-select', 'rotate-selected']) {
      assert((await mobile.locator(`#${control}`).boundingBox()).height >= 44, `${control}: minimum 44px alternative controls`);
    }
    await mobile.locator('#mirror-select').selectOption('0'); await mobile.locator('#rotate-selected').tap();
    assert.equal(await mobile.locator('#moves').getAttribute('data-moves'), '1');

    // Storage denied and WebGL unavailable: the readable DOM controls still play.
    const fallbackContext = await browser.newContext();
    await fallbackContext.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.startsWith('webgl') ? null : original.call(this, type, ...args); };
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } });
    });
    const fallback = await fallbackContext.newPage(); await fallback.goto(url);
    assert(await fallback.locator('#render-message').isVisible());
    await fallback.locator('#rotate-selected').click(); assert.equal(await fallback.locator('#status').getAttribute('data-state'), 'won');
    assert((await fallback.locator('#progress').textContent()).includes('保存不可'));
    // Existing top-page links still navigate; Rome remains available and unmodified.
    await page.goto(url.replace('mirror-light.html', 'index.html'));
    assert.equal(await page.locator('a[href="rome-320.html"]').count(), 1);
    assert.equal(await page.locator('a[href="karakuri.html"]').count(), 1);
    await page.locator('a[href="mirror-light.html"]').click(); await page.waitForSelector('canvas');
    assert.deepEqual(errors, []); assert.deepEqual(badRequests, []);
    fs.writeFileSync(path.join(output, built ? 'browser-built-results.json' : 'browser-results.json'), JSON.stringify({
      source: built ? '.pages-dist' : 'web', browser: await browser.version(),
      checks, keyboard: 'passed', physicalMirrorPicking: 'passed', hints: '3 tiers passed',
      nextStage: 'passed', idleFrameHashes: hashes, webglContextRecovery: 'passed',
      savedProgressReload: 'passed', deniedStorageAndWebglFallback: 'passed',
      accessible44pxControls: 'passed', navigation: 'passed', pageErrors: errors, badRequests,
    }, null, 2) + '\n');
    console.log(`Mirror Garden browser QA passed: ${checks.length} solved stages, 1440/390/320px, touch, keyboard, Undo/Reset, hints, stable frames, context recovery, fallback and saved progress (${built ? 'built' : 'source'}).`);
  } finally {
    await browser?.close(); await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
