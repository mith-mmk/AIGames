const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { installContactAudit } = require('./karakuri-contact-audit.cjs');

(async () => {
  const { STAGES } = await import('../web/js/karakuri-levels.mjs');
  const { Workshop } = await import('../web/js/karakuri-core.mjs');
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', r => new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort());
  await page.goto('http://127.0.0.1:4173/karakuri.html'); await page.waitForSelector('[data-part]');
  await installContactAudit(page);
  fs.mkdirSync('artifacts/karakuri/campaign', { recursive: true });
  const configure = async (selector, value) => {
    for (let i = 0; i < 4 && await page.locator(selector).getAttribute('data-value') !== String(value); i++) await page.locator(selector).click();
    assert.equal(await page.locator(selector).getAttribute('data-value'), String(value));
  };
  const selection = async () => {
    const text = await page.locator('#selection').innerText();
    const p = text.match(/（(-?[\d.]+), (-?[\d.]+)）.*向き (\d+)/);
    assert(p, text); return { x: Number(p[1]), z: Number(p[2]), angle: Number(p[3]) };
  };
  const assemble = async index => {
    const s = STAGES[index].solution;
    await configure('#ratio', s.radius); await configure('#belt-mode', s.beltMode); await configure('#delay', s.delay);
    if (STAGES[index].idler) await configure('#idler-toggle', s.idler);
    const fixture = new Workshop(index);
    for (const key of ['radius', 'beltMode', 'delay', 'idler']) fixture.configure(key, s[key]);
    for (const p of fixture.parts.filter(p => p.enabled !== false)) {
      await page.locator(`[data-part="${p.id}"]`).click();
      const current = await selection(), target = fixture.targets()[p.id];
      const dx = Math.round((target.x - current.x) / .2), dz = Math.round((target.z - current.z) / .2);
      for (let i = 0; i < Math.abs(dx); i++) await page.keyboard.press(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      for (let i = 0; i < Math.abs(dz); i++) await page.keyboard.press(dz > 0 ? 'ArrowDown' : 'ArrowUp');
      for (let i = 0; i < 4 && (await selection()).angle !== 0; i++) await page.locator('#rotate').click();
    }
  };
  const trial = async expected => {
    await page.locator('#run').click();
    assert.equal(await page.locator('#rotate').isDisabled(), true);
    await page.waitForFunction(() => ['success', 'failed'].includes(document.querySelector('#status').dataset.state), null, { timeout: 45000 });
    assert.equal(await page.locator('#status').getAttribute('data-state'), expected, await page.locator('#status').innerText());
  };
  for (let index = 0; index < STAGES.length; index++) {
    assert.equal(await page.locator('#stage').inputValue(), String(index));
    await assemble(index); await trial('success');
    await page.locator('#stage').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/karakuri/campaign/stage-${String(index + 1).padStart(2, '0')}-success.png`, fullPage: true });
    await page.locator('#reset').click(); await page.locator('[data-part="rail"]').click(); await page.locator('#rotate').click();
    await trial('failed'); assert.match(await page.locator('#status').innerText(), /レール/);
    await page.locator('#reset').click(); await page.locator('#fresh').click();
    assert.equal(await page.locator('#status').getAttribute('data-state'), 'edit');
    await assemble(index); await trial('success');
    console.log(`Chrome stage ${index + 1}/10: success, reversed rail, reset, retry passed.`);
    if (index < 9) await page.locator('#next').click(); else assert.equal(await page.locator('#next').isVisible(), false);
  }
  assert.match(await page.locator('#progress-label').innerText(), /10 \/ 10/);
  const firstAudit = await page.evaluate(() => window.campaignAudit);
  assert.equal(Object.keys(firstAudit.byStage).length, 10); assert.deepEqual(firstAudit.collisions, []); assert.equal(firstAudit.maxRoots, 1);
  for (const entry of Object.values(firstAudit.byStage)) { assert(entry.frames > 100); assert(entry.states.includes('success')); assert(entry.states.includes('failed')); }
  await page.locator('#stage').selectOption('0'); assert.equal(await page.locator('#stage').inputValue(), '0');
  assert.equal(await page.locator('#status').getAttribute('data-state'), 'edit');
  await page.reload(); await page.waitForSelector('[data-part]');
  assert.match(await page.locator('#progress-label').innerText(), /10 \/ 10/);
  // Resume auditing after reload and exercise a visible timing failure.
  // A fresh audit checks the extra timing trial after reload.
  await installContactAudit(page);
  await page.locator('#stage').selectOption('4');
  const defaultFixture = new Workshop(4);
  for (const id of ['rail']) {
    await page.locator(`[data-part="${id}"]`).click(); const current = await selection();
    const target = defaultFixture.targets()[id];
    for (let i = 0; i < Math.round((current.x - target.x) / .2); i++) await page.keyboard.press('ArrowLeft');
    for (let i = 0; i < 15; i++) await page.keyboard.press('ArrowUp');
    for (let i = 0; i < 4 && (await selection()).angle !== 0; i++) await page.locator('#rotate').click();
  }
  await trial('failed'); assert.match(await page.locator('#status').innerText(), /門に着いた/);
  await page.screenshot({ path: 'artifacts/karakuri/campaign/gate-failure.png', fullPage: true });
  await page.locator('#reset').click(); await assemble(4); await trial('success');
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/karakuri/campaign/mobile.png', fullPage: true });
  const audit = await page.evaluate(() => window.campaignAudit);
  assert.deepEqual(errors, []); assert.deepEqual(audit.collisions, []);
  const result = { browser: await browser.version(), date: new Date().toISOString(), networkBlocked: true, javascriptErrors: errors, campaign: firstAudit, extraTimingTrial: audit };
  fs.writeFileSync('artifacts/karakuri/campaign/browser-results.json', JSON.stringify(result, null, 2) + '\n');
  console.log('Chrome campaign complete: all 10 solutions/failures/retries, next/back, persisted progress, gate failure, resize.');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
