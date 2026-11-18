/* Browser smoke test; optional environment: AQUARIUM_SHOTS (screenshot directory). */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright");

async function main() {
    const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg" };
    const root = path.resolve(__dirname, process.argv.includes("--built") ? "../.pages-dist" : "../web");
    const server = http.createServer((req, res) => {
        const file = path.resolve(root, "." + new URL(req.url, "http://localhost").pathname);
        if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
        fs.readFile(file, (error, data) => error ? res.writeHead(404).end() :
            res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }).end(data));
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const url = origin + "/evolution-aquarium.html";
    const output = process.env.AQUARIUM_SHOTS;
    if (output) fs.mkdirSync(output, { recursive: true });
    let browser;
    const errors = [];
    const record = page => {
        page.on("pageerror", error => errors.push(error.message));
        page.on("response", response => {
            if (response.status() >= 400 && !response.url().endsWith("/favicon.ico")) errors.push(response.url());
        });
    };
    const snapshot = async (locator, name) => locator.screenshot(output ? { path: path.join(output, name) } : {});
    try {
        browser = await chromium.launch({
            headless: true,
            executablePath: process.env.AQUARIUM_CHROME || undefined,
            args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
        });
        const desktop = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce" });
        record(desktop);
        await desktop.goto(url);
        await desktop.waitForFunction(() => document.querySelector("#population").textContent === "48");
        assert.equal(await desktop.locator("#fallback").isHidden(), true, "Real WebGL is required for default view");
        assert.equal(await desktop.locator("#lab-status").getAttribute("data-state"), "paused");
        const gl = await desktop.locator("#tank").evaluate(canvas => canvas.getContext("webgl2")?.getParameter(7938));
        assert.match(gl, /WebGL 2/);
        if (output) await desktop.screenshot({ path: path.join(output, "desktop.png"), fullPage: true });
        const tank = desktop.locator("#tank");
        const before = await snapshot(tank, "tank.png");
        const rect = await tank.boundingBox();
        await desktop.mouse.move(rect.x + rect.width * 0.54, rect.y + rect.height * 0.54);
        await desktop.mouse.down();
        await desktop.mouse.move(rect.x + rect.width * 0.65, rect.y + rect.height * 0.60, { steps: 6 });
        await desktop.mouse.up();
        await desktop.waitForTimeout(450);
        assert.notDeepEqual(await tank.screenshot(), before, "Drag must change the camera");
        await desktop.locator("#camera").click();
        await desktop.waitForTimeout(500);
        // Tap sample points at world-fish height until raycasting selects an actual mesh.
        const currentTank = await tank.boundingBox();
        let picked = false;
        for (let y = 0.40; y <= 0.70 && !picked; y += 0.035) {
            for (let x = 0.18; x <= 0.8 && !picked; x += 0.035) {
                await desktop.mouse.click(currentTank.x + currentTank.width * x, currentTank.y + currentTank.height * y);
                picked = (await desktop.locator("#fish-picker").inputValue()) !== "";
            }
        }
        assert.ok(picked, "A visible fish must be selectable by 3D raycasting");
        assert.match(await desktop.locator("#fish-detail").textContent(), /個体 #\d+/);
        await desktop.locator("#fish-picker").selectOption("1");
        assert.equal(await desktop.locator("#fish-detail .fish-trait").count(), 9);
        await desktop.locator("#step").click();
        assert.equal(await desktop.locator("#elapsed").textContent(), "0:01");
        await desktop.locator("[data-preset=cold]").click();
        assert.equal(await desktop.locator("#temperature").inputValue(), "13");
        assert.equal(await desktop.locator("[data-preset=cold]").getAttribute("aria-pressed"), "true");
        await desktop.locator("[data-preset=predators]").click();
        assert.equal(await desktop.locator("#predator-count").inputValue(), "2");
        await desktop.locator("#predator-count").fill("4");
        assert.equal(await desktop.locator("#predator-count-value").textContent(), "4 匹");
        await desktop.locator("#speed").selectOption("8");
        await desktop.locator("#pause").click();
        await desktop.waitForFunction(() => Number(document.querySelector("#births").textContent) > 0, null, { timeout: 20000 });
        await desktop.locator("#pause").click();
        assert.notEqual(await desktop.locator("#generation").textContent(), "G01");
        await desktop.locator("#trait-chart").selectOption("hue");
        assert.equal(await desktop.locator("#distribution .hist-bin").count(), 10);
        assert.equal(await desktop.locator("#lineages .lineage-row").count(), 8);
        const seed = await desktop.locator("#seed").textContent();
        await desktop.locator("#reset").click();
        assert.equal(await desktop.locator("#seed").textContent(), seed);
        assert.equal(await desktop.locator("#population").textContent(), "48");
        assert.equal(await desktop.locator("#elapsed").textContent(), "0:00");
        await desktop.locator("#reroll").click();
        assert.notEqual(await desktop.locator("#seed").textContent(), seed);
        if (output) await snapshot(tank, "tank-predators.png");
        await tank.evaluate(canvas => canvas.getContext("webgl2").getExtension("WEBGL_lose_context").loseContext());
        await desktop.locator("#fallback").waitFor({ state: "visible" });
        assert.equal(await desktop.locator("#camera").isDisabled(), true);
        await desktop.locator("#step").click();
        assert.equal(await desktop.locator("#elapsed").textContent(), "0:01");

        const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" });
        record(mobile);
        await mobile.goto(url);
        await mobile.waitForFunction(() => document.querySelector("#population").textContent === "48");
        assert.equal(await mobile.locator("#fallback").isHidden(), true);
        if (output) await mobile.screenshot({ path: path.join(output, "mobile.png"), fullPage: true });
        for (const width of [390, 320]) {
            await mobile.setViewportSize({ width, height: 844 });
            assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
            await mobile.locator("#step").tap();
        }
        assert.equal(await mobile.locator("#elapsed").textContent(), "0:02");
        await mobile.locator("#fish-picker").selectOption("1");
        assert.match(await mobile.locator("#fish-detail").textContent(), /個体 #001/);

        if (process.argv.includes("--built")) {
            await desktop.goto(origin + "/index.html");
            const catalogCard = desktop.locator('a[href="evolution-aquarium.html"]');
            assert.equal(await catalogCard.count(), 1);
            assert.equal(await catalogCard.locator("img").evaluate(img => img.complete && img.naturalWidth > 0), true);
            await catalogCard.click();
            await desktop.waitForURL(url);
        }
        assert.deepEqual(errors, []);
        console.log("Aquarium smoke passed: desktop WebGL, camera, fish picking, presets, time controls, charts, seed resets, context loss and mobile 390/320px.");
    } finally {
        await browser?.close();
        await new Promise(resolve => server.close(resolve));
    }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
