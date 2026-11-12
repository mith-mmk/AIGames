const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
(async () => {
  const root = path.resolve(__dirname, ".."),
    dir = path.join(
      root,
      process.argv.includes("--built") ? ".pages-dist" : "web",
    );
  const output = path.join(root, "artifacts/pinball");
  fs.mkdirSync(output, { recursive: true });
  const server = http.createServer((req, res) => {
    const file = path.resolve(
      dir,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!file.startsWith(dir + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404).end();
        return;
      }
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".mjs": "text/javascript",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
        }[path.extname(file)] || "application/octet-stream",
      );
      res.end(data);
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  let browser;
  try {
    browser = await chromium.launch({
      channel: process.env.PINBALL_BROWSER_CHANNEL || "chrome",
      headless: true,
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 }, hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/pinball.html?test=1`);
    await page.waitForFunction(() => window.__pinball?.game, { timeout: 30000 });
    await page.waitForFunction(() => document.querySelector("#table").dataset.phase === "ready");
    const metrics = await page.locator("#table").evaluate(c => ({ drawCalls: Number(c.dataset.drawCalls), triangles: Number(c.dataset.triangles) }));
    assert.ok(metrics.drawCalls < 1000 && metrics.triangles < 500000);
    console.log("Render budget", metrics);
    await page.screenshot({ path: path.join(output, "full.png") });
    await page.keyboard.down("Space"); await page.waitForTimeout(1250); await page.keyboard.up("Space");
    await page.waitForFunction(() => window.__pinball.game.state.phase === "playing");
    await page.waitForTimeout(1500);
    await page.keyboard.down("KeyZ"); await page.keyboard.down("Slash");
    await page.waitForTimeout(150);
    assert.equal(await page.locator("#left").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#right").getAttribute("aria-pressed"), "true");
    await page.keyboard.up("KeyZ"); await page.keyboard.up("Slash");
    await page.locator("#pause").focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__pinball.game.state.phase === "paused");
    const paused = await page.evaluate(() => window.__pinball.game.ballPosition);
    await page.waitForTimeout(300);
    assert.deepEqual(await page.evaluate(() => window.__pinball.game.ballPosition), paused);
    await page.locator("#pause").click();
    await page.screenshot({ path: path.join(output, "playing.png") });
    for (const name of ["真上", "プレイ"]) await page.getByRole("button", { name, exact: true }).click();
    await page.getByRole("button", { name: "真上", exact: true }).click();
    await page.screenshot({ path: path.join(output, "detail.png") });
    await page.locator("nav [data-restart]").click();
    assert.equal(await page.evaluate(() => window.__pinball.game.state.score), 0);
    assert.equal(await page.evaluate(() => window.__pinball.game.state.phase), "ready");
    // Real-time browser input: beginner pulses both flippers while the renderer runs.
    await page.waitForFunction(()=>!document.querySelector("#launch").disabled); await page.locator("#launch").focus(); await page.keyboard.down("Space"); await page.waitForTimeout(1250); await page.keyboard.up("Space");
    for (let pulse=0;pulse<8;pulse++) {
      await page.keyboard.down("KeyZ"); await page.keyboard.down("Slash");
      await page.waitForTimeout(120);
      await page.keyboard.up("KeyZ"); await page.keyboard.up("Slash");
      await page.waitForTimeout(280);
    }
    await page.screenshot({path:path.join(output,"active-play.png")});
    await page.locator("nav [data-restart]").click();
    // Verify visible rule feedback through actual lane/spinner/save physics.
    await page.waitForFunction(()=>!document.querySelector("#launch").disabled); await page.locator("#launch").focus(); await page.keyboard.down("Space"); await page.waitForTimeout(1250); await page.keyboard.up("Space");
    await page.evaluate(()=>{ const g=window.__pinball.game; g.ball.setTranslation({x:-1.25,y:.18,z:-4.9},true);g.ball.setLinvel({x:0,y:0,z:4},true); });
    await page.waitForFunction(()=>window.__pinball.game.state.rollovers[0]);
    assert.match(await page.locator("#rollovers").textContent(), /A ●/);
    await page.evaluate(()=>{ const g=window.__pinball.game; g.ball.setTranslation({x:0,y:.18,z:-1.7},true);g.ball.setLinvel({x:0,y:0,z:4},true); });
    await page.waitForFunction(()=>window.__pinball.game.spinnerSpeed>0);
    await page.evaluate(()=>{ const g=window.__pinball.game; g.ball.setTranslation({x:0,y:.18,z:4.53},true);g.ball.setLinvel({x:0,y:0,z:3},true); });
    await page.waitForFunction(()=>window.__pinball.game.state.kickbackUses===1);
    await page.waitForFunction(()=>document.querySelector("#kickback").textContent.includes("0 / 1"));
    await page.screenshot({path:path.join(output,"backglass-active.png")});
    await page.locator("nav [data-restart]").click();
    // Controlled return fixture verifies UI and same-ball relaunch from its real location.
    await page.waitForFunction(()=>!document.querySelector("#launch").disabled); await page.locator("#launch").focus(); await page.keyboard.down("Space"); await page.waitForTimeout(1250); await page.keyboard.up("Space");
    await page.evaluate(()=>{const g=window.__pinball.game;g.ball.setTranslation({x:2.53,y:.18,z:4.58},true);g.ball.setLinvel({x:0,y:0,z:2},true);});
    await page.waitForFunction(()=>window.__pinball.game.state.returnedShooter);
    assert.equal(await page.evaluate(()=>window.__pinball.game.state.ballNumber),1);
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(()=>window.__pinball.game.ballPosition.z>4.6));
    await page.waitForFunction(()=>!document.querySelector("#launch").disabled); await page.locator("#launch").focus(); await page.keyboard.down("Space"); await page.waitForTimeout(1250); await page.keyboard.up("Space");
    assert.equal(await page.evaluate(()=>window.__pinball.game.state.ballNumber),1);
    await page.waitForFunction(()=>window.__pinball.game.ball.linvel().z<0);
    await page.locator("nav [data-restart]").click();
    // Continuous unassisted game: actual physics, no manual relocation or state drain calls.
    const continuous = await page.evaluate(() => {
      const g = window.__pinball.game; g.restart(); let steps = 0, launches = 0;
      while (g.state.phase !== "gameover" && steps < 120 * 180) {
        if (g.state.phase === "ready") { g.launch(); launches++; }
        g.step(1/120, {left:false,right:false}); steps++;
        if (g.state.lastEvent === "BALL SEARCH") throw new Error("Rescue masked a trapped ball");
      }
      return {phase:g.state.phase, ballNumber:g.state.ballNumber, launches, seconds:steps/120};
    });
    assert.equal(continuous.phase, "gameover"); assert.equal(continuous.ballNumber,3); assert.ok(continuous.launches>=3); // Returned shooter balls can be re-launched without consuming a ball.
    console.log("Unassisted continuous game", continuous);
    await page.locator("#gameover [data-restart]").click();
    // Force physical drains (not state calls) to verify UI transitions for all three balls.
    for (let n = 1; n <= 3; n++) {
      await page.waitForFunction(()=>!document.querySelector("#launch").disabled); await page.locator("#launch").focus(); await page.keyboard.down("Space"); await page.waitForTimeout(1250); await page.keyboard.up("Space");
      await page.evaluate(() => {
        const game = window.__pinball.game;
        game.ball.setTranslation({x:0,y:.2,z:4.8}, true);
        game.ball.setLinvel({x:0,y:0,z:2}, true);
      });
      await page.waitForFunction(n => window.__pinball.game.state.phase === (n === 3 ? "gameover" : "ready"), n);
    }
    await page.locator("#gameover").waitFor({state:"visible"});
    await page.locator("#gameover [data-restart]").click();
    assert.equal(await page.evaluate(() => window.__pinball.game.state.ballNumber), 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "プレイ", exact: true }).click();
    await page.screenshot({ path: path.join(output, "mobile.png") });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.waitForFunction(()=>!document.querySelector("#launch").disabled); await page.locator("#launch").focus(); await page.keyboard.down("Space"); await page.waitForTimeout(1250); await page.keyboard.up("Space");
    await page.waitForFunction(() => window.__pinball.game.state.phase === "playing");
    const left = await page.locator("#left").boundingBox();
    await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2); await page.mouse.down();
    await page.locator("#right").focus(); await page.keyboard.down("Space");
    assert.equal(await page.locator("#left").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#right").getAttribute("aria-pressed"), "true");
    await page.keyboard.up("Space"); await page.mouse.up();
    await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    await page.waitForFunction(() => window.__pinball.game.state.phase === "paused");
    await page.evaluate(() => {
      const ext = document.querySelector("#table").getContext("webgl2").getExtension("WEBGL_lose_context");
      ext.loseContext(); setTimeout(() => ext.restoreContext(), 500);
    });
    await page.waitForFunction(() => document.querySelector("#message").textContent.includes("中断"));
    await page.waitForFunction(() => document.querySelector("#message").textContent === "");
    assert.equal(await page.evaluate(() => window.__pinball.game.state.phase), "paused");
    await page.screenshot({ path: path.join(output, "restored.png") });
    const slider=await page.locator("#view-angle").boundingBox();
    await page.touchscreen.tap(slider.x+slider.width*.75,slider.y+slider.height/2);
    const touched=await page.evaluate(()=>window.__pinball.viewAngle);
    assert.ok(touched>60&&touched<90);
    await page.locator("#view-angle").focus();await page.keyboard.press("ArrowLeft");
    assert.equal(await page.evaluate(()=>window.__pinball.viewAngle),touched-1);
    await page.locator("#view-angle").evaluate(e=>{e.value="10";e.dispatchEvent(new Event("input",{bubbles:true}));});
    assert.equal(await page.evaluate(()=>window.__pinball.viewAngle),10);
    await page.screenshot({path:path.join(output,"camera-side.png")});
    await page.locator("#view-angle").evaluate(e=>{e.value="90";e.dispatchEvent(new Event("input",{bubbles:true}));});
    await page.screenshot({path:path.join(output,"camera-top.png")});
    await page.locator("#view-angle").evaluate(e=>{e.value="37";e.dispatchEvent(new Event("input",{bubbles:true}));});
    await page.reload(); await page.waitForFunction(() => window.__pinball?.game);
    assert.equal(await page.evaluate(()=>window.__pinball.viewAngle),37);
    assert.equal(await page.evaluate(() => window.__pinball.game.state.phase), "ready");
    assert.deepEqual(errors, []);
    console.log("PASS: actual physics launch, input, pause, restart, mobile, blur, context restoration, reload");
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
