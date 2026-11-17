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
    await page.waitForFunction(()=>window.__pinball?.game);
    assert.equal(await page.evaluate(()=>window.__pinball.game.state.difficulty),'relaxed');
    await page.locator('#difficulty').selectOption('standard');
    await page.locator('#difficulty').selectOption('relaxed');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'table');
    await page.keyboard.down('Space');await page.waitForTimeout(1300);await page.keyboard.up('Space');
    await page.waitForFunction(()=>window.__pinball.game.state.phase==='playing');
    await page.keyboard.down('KeyZ');await page.waitForTimeout(200);
    assert.equal(await page.evaluate(()=>window.__pinball.state.left),true);await page.keyboard.up('KeyZ');
    await page.locator('nav [data-restart]').click();
    await page.locator('#table').focus();
    // Observe an untouched, natural launch through the real frame loop.
    await page.keyboard.down('Space');await page.waitForTimeout(1300);await page.keyboard.up('Space');
    await page.waitForFunction(()=>window.__pinball.game.state.ballSaved,{},{timeout:45000});
    assert.equal(await page.evaluate(()=>window.__pinball.game.state.ballNumber),1);
    assert.match(await page.locator('#phase').textContent(),/同じ球/);
    await page.screenshot({path:path.join(output,'difficulty-desktop.png')});
    await page.setViewportSize({width:390,height:844});await page.waitForTimeout(700);
    await page.screenshot({path:path.join(output,'difficulty-mobile.png')});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#difficulty').selectOption('standard');
    await page.locator('#difficulty').selectOption('relaxed');
    assert.equal(await page.evaluate(()=>window.__pinball.game.state.ballSaveUses),0);
    const cdp=await page.context().newCDPSession(page),left=await page.locator('#left').boundingBox(),right=await page.locator('#right').boundingBox();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:left.x+left.width/2,y:left.y+left.height/2},{id:2,x:right.x+right.width/2,y:right.y+right.height/2}]});
    await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>window.__pinball.state.left&&window.__pinball.state.right));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>!window.__pinball.state.left&&!window.__pinball.state.right));
    console.log('PASS default relaxed, difficulty restart, keyboard focus, natural saved drain UI, mobile dual touch, responsive layout');
  } finally {await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
