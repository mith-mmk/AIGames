const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto('http://127.0.0.1:4173/karakuri.html'); await page.waitForSelector('[data-part]');
  for (const [id, dx] of Object.entries({ small: 8, large: 1, belt: -5, rail: -6 })) {
    await page.locator(`[data-part="${id}"]`).click();
    for (let i = 0; i < Math.abs(dx); i++) await page.locator(`[data-move="${Math.sign(dx)},0"]`).click();
    for (let i = 0; i < 15; i++) await page.locator('[data-move="0,-1"]').click();
    if (['belt', 'rail'].includes(id)) for (let i = 0; i < 3; i++) await page.locator('#rotate').click();
  }
  fs.mkdirSync('artifacts/karakuri/contact', { recursive: true });
  const prefix = process.argv[2] || 'before';
  if (prefix !== 'before') await page.evaluate(async () => {
    const THREE = await import('/js/vendor/three-0.180.0/three.module.min.js');
    const original = THREE.Scene.prototype.updateMatrixWorld;
    window.contactAudit = { samples: 0, minimumGap: Infinity, collisions: [], liftMin: Infinity, liftMax: -Infinity };
    THREE.Scene.prototype.updateMatrixWorld = function(force) {
      original.call(this, force); const scene = this;
      const audit = window.contactAudit;
      const marble = scene.getObjectByName('marble'), plate = scene.getObjectByName('lift-platform');
      if (!marble || !plate) return;
      audit.samples++; const ball = marble.getWorldPosition(new THREE.Vector3());
      const plateBox = new THREE.Box3().setFromObject(plate);
      audit.liftMin = Math.min(audit.liftMin, plateBox.min.y); audit.liftMax = Math.max(audit.liftMax, plateBox.max.y);
      scene.traverse(mesh => {
        if (!mesh.isMesh || mesh === marble || mesh === plate || !mesh.visible) return;
        if (plateBox.intersectsBox(new THREE.Box3().setFromObject(mesh))) audit.collisions.push(`lift intersects ${mesh.name || mesh.geometry.type}`);
      });
      scene.traverse(mesh => {
        if (!['lift-platform', 'rail-floor', 'rail-marker', 'rail-guard'].includes(mesh.name)) return;
        const p = mesh.geometry.parameters, local = mesh.worldToLocal(ball.clone());
        const nearest = new THREE.Vector3(THREE.MathUtils.clamp(local.x, -p.width / 2, p.width / 2), THREE.MathUtils.clamp(local.y, -p.height / 2, p.height / 2), THREE.MathUtils.clamp(local.z, -p.depth / 2, p.depth / 2));
        const gap = local.distanceTo(nearest) - .18;
        audit.minimumGap = Math.min(audit.minimumGap, gap);
        if (gap < -.000001) audit.collisions.push(`marble intersects ${mesh.name}: ${gap}`);
      });
    };
  });
  await page.locator('#slow').click(); await page.locator('#run').click();
  await page.waitForTimeout(11500); await page.screenshot({ path: `artifacts/karakuri/contact/${prefix}-lift.png` });
  if (prefix !== 'before') {
    await page.locator('#reset').click(); await page.waitForTimeout(150);
    await page.screenshot({ path: 'artifacts/karakuri/contact/after-mid-lift-reset.png' });
    await page.locator('#run').click(); await page.waitForTimeout(11500);
  }
  await page.waitForTimeout(1800); await page.screenshot({ path: `artifacts/karakuri/contact/${prefix}-release.png` });
  await page.waitForTimeout(3000); await page.screenshot({ path: `artifacts/karakuri/contact/${prefix}-rail.png` });
  if (prefix !== 'before') {
    await page.locator('#slow').click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'success');
    await page.locator('#reset').click();
    await page.locator('[data-part="rail"]').click(); await page.locator('#rotate').click();
    await page.locator('#run').click();
    await page.waitForFunction(() => document.querySelector('#status').dataset.state === 'failed');
    await page.screenshot({ path: 'artifacts/karakuri/contact/after-failure.png' });
    await page.locator('#reset').click();
    const audit = await page.evaluate(() => window.contactAudit);
    assert(audit.samples > 100); assert.deepEqual(audit.collisions, []);
    fs.writeFileSync('artifacts/karakuri/contact/render-contact-results.json', JSON.stringify(audit, null, 2) + '\n');
    console.log(`Rendered contact audit: ${audit.samples} frames, minimum gap ${audit.minimumGap}, no marble/platform penetrations.`);
  }
  await browser.close(); console.log(`Contact screenshots: ${prefix}`);
})().catch(e => { console.error(e); process.exit(1); });
