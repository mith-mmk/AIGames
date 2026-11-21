const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/karakuri.html');
  await page.waitForSelector('canvas'); await page.waitForSelector('[data-part]');
  fs.mkdirSync('artifacts/karakuri', { recursive: true });
  await page.screenshot({ path: 'artifacts/karakuri/initial.png' });
  await page.locator('#run').click();
  await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'failed');
  assert.match(await page.locator('#status').innerText(), /ハンドル/);
  await page.screenshot({ path: 'artifacts/karakuri/failure.png' });
  await page.locator('#reset').click();
  await page.waitForTimeout(200);
  await page.locator('[data-part="small"]').click();
  await page.keyboard.press('ArrowRight'); assert.match(await page.locator('#selection').innerText(), /-4.8, 3.0/);
  await page.keyboard.press('ArrowLeft');
  const project = async (x, y, z) => page.evaluate(async ([x, y, z]) => {
    const THREE = await import('/js/vendor/three-0.180.0/three.module.min.js');
    const r = document.querySelector('canvas').getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(42, r.width / r.height, .1, 100);
    camera.position.set(Math.sin(.18) * Math.cos(.85) * 18, Math.sin(.85) * 18, Math.cos(.18) * Math.cos(.85) * 18);
    camera.lookAt(0, .4, 0); camera.updateMatrixWorld();
    const p = new THREE.Vector3(x, y, z).project(camera);
    return { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 };
  }, [x, y, z]);
  const from = await project(-5, .6, 3); const to = await project(-3.4, .6, 0);
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 15 }); await page.mouse.up();
  assert.match(await page.locator('#selection').innerText(), /小歯車（-3.4, 0.0）/);
  // Solve exclusively through the same visible controls available to a player.
  const moves = { small: [0, 0], large: [1, -15], belt: [-5, -15], rail: [-6, -15] };
  for (const [id, [dx, dz]] of Object.entries(moves)) {
    await page.locator(`[data-part="${id}"]`).click();
    for (let i = 0; i < Math.abs(dx); i++) await page.locator(`[data-move="${Math.sign(dx)},0"]`).click();
    for (let i = 0; i < Math.abs(dz); i++) await page.locator(`[data-move="0,${Math.sign(dz)}"]`).click();
    if (id === 'belt' || id === 'rail') for (let i = 0; i < 3; i++) await page.locator('#rotate').click();
  }
  await page.screenshot({ path: 'artifacts/karakuri/assembled.png' });
  await page.locator('#run').click(); assert.equal(await page.locator('#rotate').isDisabled(), true);
  assert.equal(await page.locator('[data-move="1,0"]').isDisabled(), true);
  await page.locator('#slow').click(); await page.waitForTimeout(500); await page.locator('#slow').click();
  await page.waitForFunction(() => ['success', 'failed'].includes(document.querySelector('#status').dataset.state));
  assert.equal(await page.locator('#status').getAttribute('data-state'), 'success', await page.locator('#status').innerText());
  await page.screenshot({ path: 'artifacts/karakuri/success.png' });
  await page.locator('#reset').click(); await page.locator('#run').click();
  await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'success');
  await page.locator('#reset').click(); await page.locator('[data-part="rail"]').click(); await page.locator('#rotate').click(); await page.locator('#run').click();
  await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'failed');
  assert.match(await page.locator('#status').innerText(), /レール/);
  await page.locator('#reset').click();
  const canvas = page.locator('canvas'); const beforeCamera = await canvas.screenshot();
  const blank = await project(0, .02, -3); await page.mouse.move(blank.x, blank.y); await page.mouse.down(); await page.mouse.move(blank.x + 90, blank.y + 20, { steps: 8 }); await page.mouse.up(); await page.mouse.wheel(0, 180); await page.waitForTimeout(200);
  assert.notDeepEqual(await canvas.screenshot(), beforeCamera);
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200);
  await page.screenshot({ path: 'artifacts/karakuri/mobile.png', fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/karakuri/browser-results.json', JSON.stringify({
    browser: await browser.version(), host: 'NERO / Windows', completed: new Date().toISOString(),
    externalNetworkBlocked: true, javascriptErrors: errors,
    checks: ['initial failure', 'keyboard movement with button focus', '3D drag and snap', 'assembly with visible controls', 'running edit lock', 'slow', 'success', 'replay after success', 'reversed rail failure', 'reset after failure', 'camera orbit and zoom', '390px resize without horizontal overflow']
  }, null, 2) + '\n');
  console.log('Browser: initial failure, 3D drag/snap + visible-control solution, running lock, slow, success, replay, reversed rail failure, reset, camera orbit/zoom, mobile resize passed.');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
