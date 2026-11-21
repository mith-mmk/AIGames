const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

// Expose the app only in the test response. Stop automatic frames after startup
// so each screenshot and framebuffer check uses exactly the requested camera.
(async () => {
  const browser = await chromium.launch({
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/rome-320-app.js', async route => {
      const response = await route.fetch();
      const body = (await response.text())
        .replace('const romaExperience = new Rome320Experience',
          'const romaExperience = window.__romeTest = new Rome320Experience')
        .replace('requestAnimationFrame(animate);',
          'if (!ready) requestAnimationFrame(animate);');
      await route.fulfill({ response, body });
    });
    await page.goto('http://127.0.0.1:4173/rome-320.html');
    await page.waitForFunction(() => window.romaReady === true, null, { timeout: 120000 });
    await page.waitForSelector('#loading', { state: 'hidden' });
    const results = [];
    for (const [name, distance, target, polar] of [
      ['max-out', 10000, [-366, 24, 290], 1.1],
      ['min-in', 80, [-366, 24, 290], 1.1],
      ['panned-horizon', 10000, [3900, 24, 4100], Math.PI * 0.455],
      ['mobile-overhead', 10000, [-3900, 24, -3800], 0.04],
    ]) {
      if (name === 'mobile-overhead') {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('#light-mode').click();
      }
      const result = await page.evaluate(({ distance, target, polar }) => {
        const { camera, controls, renderer, scene } = window.__romeTest;
        controls.enableDamping = false;
        controls.target.set(...target);
        camera.position.set(
          target[0] + distance * Math.sin(polar) * Math.sin(0.65),
          target[1] + distance * Math.cos(polar),
          target[2] + distance * Math.sin(polar) * Math.cos(0.65),
        );
        controls.update();
        renderer.render(scene, camera);
        const gl = renderer.getContext();
        const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
        const pixels = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let black = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i] < 3 && pixels[i + 1] < 3 && pixels[i + 2] < 3) black++;
        }
        return { blackPixels: black, pixelCount: width * height,
          actualDistance: camera.position.distanceTo(controls.target),
          quality: window.romaDiagnostics().quality };
      }, { distance, target, polar });
      const screenshot = `artifacts/rome-320-zoom-${name}-after.png`;
      await page.screenshot({ path: screenshot });
      results.push({ name, ...result, screenshot });
      console.log(JSON.stringify(results.at(-1)));
      assert.ok(result.blackPixels / result.pixelCount < 0.001,
        `${name}: black background must cover less than 0.1% of the framebuffer`);
      assert.ok(Math.abs(result.actualDistance - distance) < 1);
    }
    // Exercise the actual wheel handler as well as the endpoint camera states.
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, -1200);
    const wheelDistance = await page.evaluate(() => {
      const { camera, controls } = window.__romeTest;
      return camera.position.distanceTo(controls.target);
    });
    assert.ok(wheelDistance < 10000, 'wheel zoom must move the camera inward');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.resolve('artifacts/rome-320-zoom-browser-results.json'),
      JSON.stringify({ browser: await browser.version(), errors, wheelDistance, results }, null, 2) + '\n');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
