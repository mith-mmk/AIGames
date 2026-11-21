const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const evidence = path.join(root, process.env.CATALOG_EVIDENCE || 'artifacts/catalog');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg' };
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/AIGames/')) return res.writeHead(404).end();
    const relative = url.pathname.slice('/AIGames/'.length) || 'index.html';
    const file = path.resolve(root, '.pages-dist', relative);
    if (!file.startsWith(path.join(root, '.pages-dist') + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (err, data) => err ? res.writeHead(404).end() : res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }).end(data));
});
(async () => {
    let browser;
    try {
        fs.mkdirSync(evidence, { recursive: true });
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));
        page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
        const url = `http://127.0.0.1:${server.address().port}/AIGames/`;
        await page.goto(url);
        const cards = page.locator('.game-card');
        assert.equal(await cards.count(), 23);
        const baseline = execFileSync('git', ['show', 'origin/main:web/index.html'], { cwd: root, encoding: 'utf8' });
        const original = baseline.includes('class="game-card"')
            ? await page.evaluate(html => [...new DOMParser().parseFromString(html, 'text/html').querySelectorAll('.game-card')].map(el => ({ href: el.querySelector('a').getAttribute('href'), title: el.querySelector('h2').textContent, fields: [...el.querySelectorAll('.description,.card-meta')].map(part => part.textContent.replace(/\s/g, '')) })), baseline)
            : [...baseline.matchAll(/<li><a href=["']([^"']+)["']>(.*?)<\/a>(.*?)(?=<li>|<!--)/gs)].map(([, href, title, tail]) => ({ href, title, text: tail.replace(/<\/li>/g, '').replace(/\s/g, '') }));
        assert.ok(original.length >= 22);
        const current = await cards.evaluateAll(elements => elements.map(el => ({ href: el.querySelector('a').getAttribute('href'), title: el.querySelector('h2').textContent, text: el.querySelector('.card-body').textContent.replace(/\s/g, '') })));
        for (const old of original) {
            const card = current.find(item => item.href === old.href);
            assert.ok(card, old.href);
            assert.equal(card.title, old.title);
            if (old.fields) {
                for (const field of old.fields) assert.ok(card.text.includes(field), old.title);
                continue;
            }
            const parts = old.text.match(/^(\d{4}\/\d{2}\/\d{2})?(.*?)\((by.*?)\)$/);
            assert.ok(parts, old.title);
            for (const value of parts.slice(1).filter(Boolean)) assert.ok(card.text.includes(value), `${old.title}: ${value}`);
        }
        const titles = () => page.locator('.game-card:visible h2').allTextContents();
        assert.equal((await titles())[0], '翠嵐麻雀 — 3D自動卓');
        for (const order of ['newest', 'oldest']) {
            await page.locator('#sort-order').selectOption(order);
            const dates = await cards.evaluateAll(els => els.map(el => el.dataset.date));
            assert.deepEqual(dates.slice(-2), ['', '']);
            const dated = dates.filter(Boolean);
            assert.deepEqual(dated, [...dated].sort((a, b) => order === 'oldest' ? a.localeCompare(b) : b.localeCompare(a)));
            const names = await titles();
            assert.ok(names.indexOf('ブロック崩し') < names.indexOf('+3 Game'));
        }
        await page.locator('#sort-order').selectOption('name');
        const named = await titles();
        assert.deepEqual(named, [...named].sort(new Intl.Collator('ja', { numeric: true, sensitivity: 'base' }).compare));
        await page.locator('#title-search').fill('ＲＯＧＵＥ');
        assert.equal((await titles()).length, 2);
        await page.locator('#genre-filter').selectOption('パズル');
        assert.equal((await titles()).length, 0);
        assert.ok(await page.locator('#empty-state').isVisible());
        assert.equal(await page.locator('#result-count').textContent(), '0 / 23件の作品');
        await page.locator('button[type=reset]').focus();
        await page.keyboard.press('Enter');
        assert.equal((await titles()).length, 23);
        assert.equal(await page.locator('#sort-order').inputValue(), 'newest');
        await page.locator('#title-search').focus();
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'genre-filter');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'sort-order');
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.className), 'game-link');
        await page.mouse.click(20, 20);
        for (const width of [1440, 768, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            for (const image of await page.locator('.game-card img').all()) await image.scrollIntoViewIfNeeded();
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.waitForFunction(() => [...document.images].every(img => img.complete && img.naturalWidth > 0));
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
            await page.screenshot({ path: path.join(evidence, `catalog-${width}.png`), fullPage: width === 390 });
        }
        assert.deepEqual(errors, []);
        const noJs = await browser.newPage({ javaScriptEnabled: false });
        await noJs.goto(url);
        assert.equal(await noJs.locator('.game-card:visible').count(), 23);
        assert.equal(await noJs.locator('#catalog-controls').isVisible(), false);
        const results = { originalEntriesRetained: original.length, total: 23, widths: [1440, 768, 390, 320], tests: ['dates and stable ties', 'name sort', 'NFKC title search', 'AND genre filter', 'zero results/count', 'keyboard reset and tab order', 'all images loaded', 'no horizontal overflow', 'no JavaScript fallback', 'AIGames subpath'], errors };
        fs.writeFileSync(path.join(evidence, 'browser-results.json'), JSON.stringify(results, null, 2) + '\n');
        console.log(JSON.stringify(results));
    } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
