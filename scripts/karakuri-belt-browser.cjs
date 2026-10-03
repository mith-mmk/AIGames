const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { installContactAudit } = require('./karakuri-contact-audit.cjs');
(async () => {
  const { Workshop } = await import('../web/js/karakuri-core.mjs');
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await page.goto('http://127.0.0.1:4173/karakuri.html'); await page.waitForSelector('[data-part]');
  await installContactAudit(page);
  await page.evaluate(async () => {
    const THREE = await import('/js/vendor/three-0.180.0/three.module.min.js');
    const cameraUpdate = THREE.PerspectiveCamera.prototype.updateMatrixWorld, sceneUpdate = THREE.Scene.prototype.updateMatrixWorld;
    THREE.PerspectiveCamera.prototype.updateMatrixWorld = function(force) { cameraUpdate.call(this, force); window.beltCamera = this; };
    THREE.Scene.prototype.updateMatrixWorld = function(force) { sceneUpdate.call(this, force); window.beltScene = this; };
  });
  fs.mkdirSync('artifacts/karakuri/belt', { recursive: true });
  const project = async (x, z) => page.evaluate(async ([x, z]) => {
    const THREE = await import('/js/vendor/three-0.180.0/three.module.min.js'), r = document.querySelector('canvas').getBoundingClientRect();
    const p = new THREE.Vector3(x, .15, z).project(window.beltCamera);
    return { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 };
  }, [x, z]);
  const snapshot = async ghost => page.evaluate(ghost => {
    let group;
    if (ghost) group = window.beltScene.getObjectByName('belt-ghost');
    else window.beltScene.traverse(o => { if (o.userData.id === 'belt') group = o; });
    return group ? { x: group.position.x, z: group.position.z, angle: group.rotation.y, length: group.userData.length } : null;
  }, ghost);
  const options = async (id, value) => { for (let i = 0; i < 4 && await page.locator(id).getAttribute('data-value') !== String(value); i++) await page.locator(id).click(); };
  const assembleExceptBelt = async index => {
    const g = new Workshop(index), s = g.stage.solution;
    await options('#ratio', s.radius); await options('#belt-mode', s.beltMode); await options('#delay', s.delay); if (g.stage.idler) await options('#idler-toggle', s.idler);
    for (const key of ['radius', 'beltMode', 'delay', 'idler']) g.configure(key, s[key]);
    for (const p of g.parts.filter(p => p.id !== 'belt' && p.enabled !== false)) {
      await page.locator(`[data-part="${p.id}"]`).click();
      const text = await page.locator('#selection').innerText(), pos = text.match(/（(-?[\d.]+), (-?[\d.]+)）/), t = g.targets()[p.id];
      const dx = Math.round((t.x - Number(pos[1])) / .2), dz = Math.round((t.z - Number(pos[2])) / .2);
      for (let i = 0; i < Math.abs(dx); i++) await page.keyboard.press(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      for (let i = 0; i < Math.abs(dz); i++) await page.keyboard.press(dz > 0 ? 'ArrowDown' : 'ArrowUp');
      for (let i = 0; i < 4 && !/向き 0°/.test(await page.locator('#selection').innerText()); i++) await page.locator('#rotate').click();
    }
    return g;
  };
  const connect = async () => {
    await page.locator('[data-part="belt"]').click(); await page.locator('#belt-axis-list [data-axis="large"]').click();
    await page.locator('#belt-axis-list [data-axis="lift"]').hover(); await page.waitForTimeout(80);
    assert.equal(await page.locator('#belt-feedback').getAttribute('data-valid'), 'true');
    const preview = await snapshot(true); await page.locator('#belt-axis-list [data-axis="lift"]').click();
    assert.equal(await page.locator('#belt-feedback').getAttribute('data-anchors'), 'large|lift'); assert.deepEqual(await snapshot(false), preview);
  };
  const trial = async expected => { await page.locator('#run').click(); await page.waitForFunction(() => ['success', 'failed'].includes(document.querySelector('#status').dataset.state), null, { timeout: 45000 }); assert.equal(await page.locator('#status').getAttribute('data-state'), expected, await page.locator('#status').innerText()); };
  const orbit = async (dx, dy, wheel) => {
    await page.locator('[data-part="small"]').click(); await page.waitForTimeout(120); const p = await project(0, -3.3);
    await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.mouse.move(p.x + dx, p.y + dy, { steps: 10 }); await page.mouse.up(); if (wheel) await page.mouse.wheel(0, wheel); await page.waitForTimeout(150);
  };
  const dragResults = [];
  for (let profile = 0; profile < 3; profile++) {
    await page.locator('#fresh').click(); const g = await assembleExceptBelt(0);
    if (profile === 1) await orbit(100, -55, 600);
    if (profile === 2) await orbit(-220, 140, -1200);
    await page.locator('[data-part="small"]').click(); await page.waitForTimeout(120);
    const from = await project(1, 3), target = g.targets().belt, to = await project(target.x + .3, .2);
    const before = await snapshot(false);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 15 });
    assert.equal(await page.locator('#belt-feedback').getAttribute('data-pair'), 'large|lift'); assert.equal(await page.locator('#belt-feedback').getAttribute('data-valid'), 'true');
    const preview = await snapshot(true); assert(preview);
    await page.screenshot({ path: `artifacts/karakuri/belt/drag-preview-${profile + 1}.png` });
    if (profile === 1) {
      await page.keyboard.press('Escape'); await page.mouse.up(); assert.deepEqual(await snapshot(false), before); assert.equal(await snapshot(true), null);
      await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 10 });
    }
    await page.mouse.up(); assert.deepEqual(await snapshot(false), preview); assert.equal(await page.locator('#belt-feedback').getAttribute('data-anchors'), 'large|lift');
    dragResults.push({ profile, slightlyOffset: [.3, .2], previewMatchesDrop: true, autoRotated: true });
  }
  await orbit(120, -85, 600);
  // A wrong candidate remains a deliberate puzzle choice, and invalid ones never replace an installed belt.
  await page.locator('[data-part="belt"]').click(); const installed = await snapshot(false);
  await page.locator('#belt-axis-list [data-axis="small"]').click(); await page.locator('#belt-axis-list [data-axis="lift"]').hover();
  assert.equal(await page.locator('#belt-feedback').getAttribute('data-valid'), 'false');
  await page.locator('#belt-axis-list [data-axis="lift"]').click(); assert.deepEqual(await snapshot(false), installed);
  await page.locator('#belt-cancel').click(); assert.equal(await snapshot(true), null);
  await page.locator('#belt-axis-list [data-axis="small"]').click(); await page.locator('#belt-axis-list [data-axis="large"]').click();
  assert.equal(await page.locator('#belt-feedback').getAttribute('data-anchors'), 'large|small'); await trial('failed'); assert.match(await page.locator('#status').innerText(), /ベルト/);
  await page.locator('#reset').click(); await connect(); await trial('success'); await page.locator('#reset').click();
  // Partial selection and previews are discarded by pointer cancellation, reset and stage changes.
  await page.locator('[data-part="belt"]').click(); await page.locator('#belt-axis-list [data-axis="large"]').click();
  await page.locator('canvas').dispatchEvent('pointercancel', { pointerId: 1 }); assert.equal(await page.locator('#belt-cancel').isVisible(), false);
  await page.locator('#belt-axis-list [data-axis="large"]').click(); await page.locator('#reset').click(); assert.equal(await page.locator('#belt-cancel').isVisible(), false);
  await page.locator('#belt-axis-list [data-axis="large"]').click(); await page.locator('#stage').selectOption('1'); assert.equal(await snapshot(true), null);
  for (let index = 0; index < 10; index++) {
    await page.locator('#stage').selectOption(String(index)); await assembleExceptBelt(index); await connect();
    if (index === 2) {
      await page.locator('#rotate').click(); assert.equal(await page.locator('#belt-feedback').getAttribute('data-anchors'), ''); await connect();
      await page.locator('#belt-mode').click(); await trial('failed'); assert.match(await page.locator('#status').innerText(), /逆向き/);
      await page.locator('#reset').click(); await page.locator('#belt-mode').click();
    }
    await trial('success'); console.log(`Chrome two-axis belt: stage ${index + 1}/10 succeeded.`);
  }
  await page.locator('#reset').click(); await page.locator('[data-part="belt"]').click();
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200);
  await connect(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/karakuri/belt/after-mobile.png', fullPage: true });
  const audit = await page.evaluate(() => window.campaignAudit); assert.deepEqual(audit.collisions, []); assert.deepEqual(errors, []);
  fs.writeFileSync('artifacts/karakuri/belt/browser-results.json', JSON.stringify({ browser: await browser.version(), date: new Date().toISOString(), dragResults, all10TwoAxisSolutions: true, wrongPairFailure: true, invalidOverlapRejected: true, cancelResetStageSwitch: true, rotateCrossRetry: true, mobile: true, javascriptErrors: errors, contactAudit: audit }, null, 2) + '\n');
  await browser.close(); console.log('Belt UI complete: three camera profiles, offset drop/preview equality, cancellation, wrong/invalid pairs, all 10 solutions, rotate/cross/retry, mobile, contact audit.');
})().catch(e => { console.error(e); process.exit(1); });
