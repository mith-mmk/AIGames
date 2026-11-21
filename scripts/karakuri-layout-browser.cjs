const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4173/karakuri.html'); await page.waitForSelector('[data-part]'); await page.locator('#stage').selectOption('9');
  await page.evaluate(async () => {
    const THREE = await import('/js/vendor/three-0.180.0/three.module.min.js');
    const original = THREE.PerspectiveCamera.prototype.updateMatrixWorld;
    THREE.PerspectiveCamera.prototype.updateMatrixWorld = function(force) { original.call(this, force); window.renderedCamera = this; };
  });
  const checks = [];
  for (const width of [1440, 900, 800, 390, 320]) {
    await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 }); await page.waitForTimeout(150);
    const result = await page.evaluate(async () => {
      const THREE = await import('/js/vendor/three-0.180.0/three.module.min.js');
      const points = [[-6.1, .6, 0], [4.65, 1.2, 0], [.9, 2.35, 0], [2.8, 1.8, 0]].map(p => new THREE.Vector3(...p).project(window.renderedCamera));
      return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, inFrame: points.every(p => Math.abs(p.x) < .96 && Math.abs(p.y) < .96), distance: window.renderedCamera.position.length() };
    });
    assert.equal(result.overflow, false, JSON.stringify(result)); assert.equal(result.inFrame, true, JSON.stringify(result)); checks.push(result);
  }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
  const before = await page.evaluate(() => window.renderedCamera.position.length());
  await page.locator('#zoom-in').click(); await page.waitForTimeout(100); assert(await page.evaluate(() => window.renderedCamera.position.length()) < before);
  await page.locator('#zoom-out').click(); await page.waitForTimeout(100);
  await page.locator('#stage').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/karakuri/campaign/mobile-framed.png', fullPage: true });
  fs.writeFileSync('artifacts/karakuri/campaign/layout-results.json', JSON.stringify({ checks, zoomButtons: 'passed', cameraTargets: ['handle', 'bell', 'lift', 'rail'] }, null, 2) + '\n');
  await browser.close(); console.log('Layout passed: 1440/900/800/390/320px, mechanism endpoints in frame, no overflow, zoom buttons.');
})().catch(e => { console.error(e); process.exit(1); });
