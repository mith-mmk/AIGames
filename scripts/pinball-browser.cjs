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
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/pinball.html`);
    await page.waitForFunction(
      () => document.querySelector("#message").textContent === "",
    );
    await page.screenshot({ path: path.join(output, "full.png") });
    for (const name of ["機構の接写", "真上", "全景"]) {
      await page.getByRole("button", { name, exact: true }).click();
      assert.match(
        await page
          .getByRole("button", { name, exact: true })
          .getAttribute("class"),
        /selected/,
      );
    }
    await page.locator("#tour").click();
    assert.equal(
      await page.locator("#tour").getAttribute("aria-pressed"),
      "true",
    );
    await page.waitForTimeout(500);
    await page.locator("#tour").click();
    assert.equal(
      await page.locator("#tour").getAttribute("aria-pressed"),
      "false",
    );
    await page.locator("#left").focus();
    await page.keyboard.down("Space");
    assert.equal(
      await page.locator("#left").getAttribute("aria-pressed"),
      "true",
    );
    await page.keyboard.up("Space");
    assert.equal(
      await page.locator("#left").getAttribute("aria-pressed"),
      "false",
    );
    const left = await page.locator("#left").boundingBox();
    await page.mouse.move(left.x + left.width / 2, left.y + left.height / 2);
    await page.mouse.down();
    await page.locator("#right").focus();
    await page.keyboard.down("Space");
    assert.equal(await page.locator("#left").getAttribute("aria-pressed"), "true");
    assert.equal(await page.locator("#right").getAttribute("aria-pressed"), "true");
    await page.keyboard.up("Space");
    await page.mouse.up();
    assert.equal(await page.locator("#left").getAttribute("aria-pressed"), "false");
    await page.locator("#table").click();
    await page.keyboard.down("KeyZ");
    await page.waitForTimeout(120);
    await page.keyboard.up("KeyZ");
    await page.keyboard.press("KeyC");
    await page.getByRole("button", { name: "機構の接写" }).click();
    await page.screenshot({ path: path.join(output, "detail.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "全景", exact: true }).click();
    await page.screenshot({ path: path.join(output, "mobile.png") });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.reload();
    await page.waitForFunction(
      () => document.querySelector("#message").textContent === "",
    );
    assert.equal(
      await page.locator("#tour").getAttribute("aria-pressed"),
      "false",
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: WebGL boot, cameras, path toggle, keyboard, mobile overflow, reload; screenshots " +
        output,
    );
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
