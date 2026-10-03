const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..'), published = path.join(root, '.pages-dist');
const homepage = path.resolve(process.env.HOMEPAGE_CHECKOUT || path.join(root, '../homepage'));
const evidence = path.join(root, 'artifacts/migration');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
let ready = true;
const server = http.createServer((req, res) => {
  let url; try { url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (!ready && url === '/AIGames/migration-ready.json') { res.writeHead(404).end(); return; }
  const base = url.startsWith('/AIGames/') ? published : homepage;
  let file = path.resolve(base, '.' + (base === published ? url.slice('/AIGames'.length) : url));
  if (file !== base && !file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => err ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data));
});
(async () => {
  let browser;
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    // Existing Rogue Dungeon uses Three 0.180 on CDN; mirror the same version for repeatable offline QA.
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/*', route => {
      const name = path.basename(new URL(route.request().url()).pathname);
      route.fulfill({ path: path.join(root, 'web/js/vendor/three-0.180.0', name), contentType: 'text/javascript' });
    });
    const page = await context.newPage(), errors = [], missing = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('/migration-ready.json')) missing.push(response.url()); });
    fs.mkdirSync(evidence, { recursive: true });
    await page.goto(origin + '/');
    await page.locator('a[href="/AIGames/"]').click();
    assert.equal(new URL(page.url()).pathname, '/AIGames/');
    await page.locator('a[href="rubiks_cube_random_initial.html"]').click();
    assert.equal(await page.locator('.cubie').count(), 27);
    const before = await page.locator('#cube').getAttribute('style'), rect = await page.locator('#scene').boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down();
    await page.mouse.move(rect.x + rect.width / 2 + 90, rect.y + rect.height / 2 + 40, { steps: 8 }); await page.mouse.up();
    assert.notEqual(await page.locator('#cube').getAttribute('style'), before);
    await page.locator('#scrambleBtn').click(); assert(await page.locator('#resetBtn').isDisabled());
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Scrambled', { timeout: 20000 });
    await page.screenshot({ path: path.join(evidence, 'rubik-scrambled.png') });
    await page.locator('#solveBtn').click();
    await page.waitForFunction(() => document.querySelector('#status').textContent === 'Solved', { timeout: 25000 });
    assert(await page.evaluate(() => ['n-x1', 'n-x-1', 'n-y1', 'n-y-1', 'n-z1', 'n-z-1'].every(cls => new Set([...document.querySelectorAll('.' + cls)].map(face => face.style.background)).size === 1)));
    await page.screenshot({ path: path.join(evidence, 'rubik-solved.png') });
    await page.locator('#resetBtn').click(); assert.equal(await page.locator('#status').innerText(), 'Randomized');
    await page.setViewportSize({ width: 390, height: 844 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.locator('#resetBtn').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(evidence, 'rubik-mobile.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('a[href="index.html"]').click(); await page.locator('a[href="https://mith-mmk.github.io/script/"]').evaluate(a => a.href = '/script/');
    await page.locator('a[href="/script/"]').click(); assert.equal(new URL(page.url()).pathname, '/script/');
    assert.equal(await page.locator('a[href="/AIGames/"]').count(), 1);
    await page.goto(origin + '/AIGames/rougelike-copilot.html');
    await page.locator('[data-class="warrior"]').click(); await page.waitForSelector('#rl-game:not(.hidden)');
    await page.waitForFunction(() => Number(document.querySelector('#rl-hp')?.textContent) > 0);
    await page.keyboard.press('ArrowUp'); await page.screenshot({ path: path.join(evidence, 'rogue-started.png') });
    await page.goto(origin + '/AIGames/karakuri.html'); await page.waitForSelector('[data-part]');
    assert.equal(await page.locator('#stage option').count(), 10);
    for (let index = 0; index < 10; index++) {
      await page.locator('#stage').selectOption(String(index)); await page.locator('#run').click();
      await page.waitForFunction(() => Number(document.querySelector('#clock').textContent.match(/[\d.]+/)[0]) > 0);
      await page.locator('#reset').click(); assert.equal(await page.locator('#status').getAttribute('data-state'), 'edit');
    }
    await page.locator('#stage').selectOption('2'); await page.locator('#belt-mode').click(); await page.locator('#run').click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'success');
    const saved = await page.evaluate(() => localStorage.getItem('karakuri-progress'));
    assert(saved.includes('2'));
    await page.screenshot({ path: path.join(evidence, 'karakuri-subpath.png') });
    const redirects = [];
    for (const file of fs.readdirSync(path.join(homepage, 'script/vibe')).filter(file => file.endsWith('.html'))) {
      const testPage = await context.newPage();
      await testPage.goto(origin + '/script/vibe/' + file + '?migration=1&name=%E7%8E%89#section');
      const target = '/AIGames/' + (file === 'index.html' ? '' : file);
      await testPage.waitForURL(url => url.pathname === target);
      const url = new URL(testPage.url()); assert.equal(url.search, '?migration=1&name=%E7%8E%89'); assert.equal(url.hash, '#section');
      redirects.push(file); await testPage.close();
    }
    await page.goto(origin + '/script/vibe/rubiks_cube_random_initial.html');
    await page.waitForURL('**/AIGames/rubiks_cube_random_initial.html');
    assert.equal(await page.evaluate(() => localStorage.getItem('karakuri-progress')), saved);
    ready = false;
    await page.goto(origin + '/script/vibe/rubiks_cube_random_initial.html?unpublished=1#keep');
    await page.waitForTimeout(350); assert(new URL(page.url()).pathname.startsWith('/script/vibe/'));
    assert.equal(await page.locator('.cubie').count(), 27); assert.equal(await page.locator('#status').innerText(), 'Randomized');
    const noJS = await browser.newContext({ javaScriptEnabled: false }), fallback = await noJS.newPage();
    await fallback.goto(origin + '/script/vibe/rubiks_cube_random_initial.html');
    assert(await fallback.locator('noscript a[href="/AIGames/rubiks_cube_random_initial.html"]').isVisible()); await noJS.close();
    ready = true;
    const files = fs.readdirSync(published, { recursive: true }).filter(file => fs.statSync(path.join(published, file)).isFile());
    const checked = await page.evaluate(async files => Promise.all(files.map(async file => { const response = await fetch('/AIGames/' + file.replaceAll('\\', '/')); return { file, status: response.status, type: response.headers.get('content-type') }; })), files);
    assert(checked.every(file => file.status === 200));
    assert(checked.filter(file => file.file.endsWith('.mjs')).every(file => file.type === 'text/javascript'));
    assert(!files.some(file => /\.test\.|-build\.|package(?:-lock)?\.json|node_modules|\.git/.test(file)));
    assert.deepEqual(errors, []); assert.deepEqual(missing, []);
    const result = { browser: browser.version(), date: new Date().toISOString(), localMount: '/AIGames/', runtimeFiles: checked.length, redirectPages: redirects, queryHashPreserved: true, unpublishedFallback: true, noscriptFallback: true, sameOriginProgressPreserved: true, rubik: 'drag/scramble/solve/uniform faces/reset/mobile', rogue: 'warrior started and key input', karakuri: '10 selections/start/reset + stage 3 success', externalThree: 'same-version 0.180 local mirror; public CDN availability not proved', javascriptErrors: errors, missingResponses: missing };
    fs.writeFileSync(path.join(evidence, 'browser-results.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
