const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');

(async () => {
  const root = path.resolve(__dirname, '..');
  const option = name => process.argv[process.argv.indexOf(name) + 1];
  const directory = path.resolve(process.argv.includes('--directory') ? option('--directory') : path.join(root, 'web'));
  const prefix = process.argv.includes('--base-path') ? option('--base-path') : '/AIGames/';
  assert(/^\/[a-zA-Z0-9/_-]*\/$/.test(prefix) || prefix === '/', 'Use an absolute slash-terminated base path');
  const label = process.argv.includes('--label') ? option('--label') : 'distribution';
  assert(/^[a-z0-9-]+$/.test(label));
  const output = path.join(root, 'artifacts/fantasy-automation/distribution');
  fs.mkdirSync(output, { recursive: true });
  const required = ['fantasy-automation.html', 'css/fantasy-automation.css', 'js/fantasy-automation/runtime/app.js', 'js/vendor/three-0.180.0/three.module.min.js', 'js/vendor/three-0.180.0/three.core.min.js', 'js/vendor/three-0.180.0/LICENSE'];
  required.forEach(file => assert(fs.existsSync(path.join(directory, file)), `Distribution missing ${file}`));
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!pathname.startsWith(prefix)) { response.writeHead(404).end(); return; }
    const file = path.resolve(directory, pathname.slice(prefix.length));
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, content) => {
      if (error) response.writeHead(404).end();
      else response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(content);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.FANTASY_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [], failures = [], loaded = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      const pathname = new URL(response.url()).pathname;
      if (pathname.endsWith('favicon.ico')) return;
      loaded.push(pathname);
      if (response.status() >= 400) failures.push({ path: pathname, status: response.status() });
    });
    const url = `http://127.0.0.1:${server.address().port}${prefix}fantasy-automation.html`;
    await page.goto(url);
    await page.waitForSelector('#world canvas');
    assert.equal(await page.title(), 'AI Games');
    assert.equal(await page.locator('[data-build]').count(), 7);
    await page.locator('[data-speed="0"]').click();
    await page.locator('[data-build="belt"]').click();
    const rect = await page.locator('#world canvas').boundingBox();
    await page.mouse.click(rect.x + rect.width * 0.52, rect.y + rect.height * 0.48);
    await page.waitForFunction(() => document.querySelector('[data-resource="ingot"]')?.textContent === '19');
    assert.equal(await page.locator('[data-resource="wood"]').textContent(), '39');
    await page.locator('[data-action="cancel"]').click();
    await page.screenshot({ path: path.join(output, `${label}.png`), fullPage: true });
    assert.deepEqual(errors, []); assert.deepEqual(failures, []);
    for (const file of required.filter(file => !file.endsWith('LICENSE'))) assert(loaded.includes(prefix + file), `Browser did not load ${file}`);
    fs.writeFileSync(path.join(output, `${label}.json`), JSON.stringify({ basePath: prefix, browser: await browser.version(), checkedFiles: required,
      bundleSHA256: crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, required[2]))).digest('hex'),
      requiresBuildToServe: false, canvasPlacement: 'passed', pageErrors: errors, failedRequests: failures,
      loadedPaths: [...new Set(loaded)] }, null, 2) + '\n');
    console.log(`Standalone distribution passed: ${label}, ${prefix}, all runtime dependencies loaded; canvas construction works.`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
