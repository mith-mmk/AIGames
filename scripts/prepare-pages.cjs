const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'web');
const output = path.join(root, '.pages-dist');
const runtime = new Set(['.html', '.css', '.js', '.mjs', '.json', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.ico', '.ogg', '.mp3', '.wav', '.woff', '.woff2', '.ttf']);
const copied = [];
function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlink excluded from publication: ${file}`);
    if (entry.isDirectory()) { visit(file); continue; }
    if (/\.test\.|-build\.|^package(?:-lock)?\.json$/.test(entry.name)) continue;
    if (!runtime.has(path.extname(file)) && !/^(LICENSE(?:\..*)?|DATA_README\.md)$/.test(entry.name)) continue;
    const relative = path.relative(source, file), target = path.join(output, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(file, target); copied.push(relative.replaceAll('\\', '/'));
  }
}
// The fixed output is inside this checkout and contains only generated publication files.
if (path.dirname(output) !== root || path.basename(output) !== '.pages-dist') throw new Error('Unsafe output directory');
fs.rmSync(output, { recursive: true, force: true }); fs.mkdirSync(output); visit(source);
fs.copyFileSync(path.join(root, 'LICENSE'), path.join(output, 'LICENSE'));
fs.writeFileSync(path.join(output, '.nojekyll'), '');
const revision = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
fs.writeFileSync(path.join(output, 'migration-ready.json'), JSON.stringify({ site: 'AIGames', schema: 1, revision }) + '\n');
for (const relative of copied.filter(file => /\.(html|css)$/.test(file))) {
  const text = fs.readFileSync(path.join(output, relative), 'utf8');
  const expressions = relative.endsWith('.css') ? [/url\(["']?([^"')]+)["']?\)/g] : [/(?:src|href)=["']([^"']+)["']/g];
  for (const expression of expressions) for (const match of text.matchAll(expression)) {
    const url = match[1].split(/[?#]/)[0];
    if (!url || /^(?:[a-z]+:|\/\/)/i.test(url)) continue;
    // Homepage navigation is deliberate; runtime resources must stay self-contained.
    if (url === '/script/' || url === 'https://mith-mmk.github.io/script/') continue;
    if (url.startsWith('/')) throw new Error(`Root resource/navigation needs review: ${relative}: ${url}`);
    const target = path.resolve(path.dirname(path.join(output, relative)), url);
    if (!target.startsWith(output + path.sep) && target !== output) throw new Error(`Path escapes publication: ${relative}: ${url}`);
    if (!fs.existsSync(target)) throw new Error(`Missing published dependency: ${relative}: ${url}`);
  }
}
for (const relative of copied.filter(file => /\.(js|mjs)$/.test(file))) {
  const text = fs.readFileSync(path.join(output, relative), 'utf8');
  for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*\()["'](\.[^"']+)["']/g)) {
    const target = path.resolve(path.dirname(path.join(output, relative)), match[1]);
    if (!target.startsWith(output + path.sep) || !fs.existsSync(target)) throw new Error(`Missing module: ${relative}: ${match[1]}`);
  }
  for (const match of text.matchAll(/(?:fetch\s*\(|(?:ASSET_ROOT|ASSET_PATH|ASSET_BASE|STAGE_ROOT)\s*=\s*)["'](\.\/assets\/[^"']+)["']/g)) {
    if (!fs.existsSync(path.join(output, match[1]))) throw new Error(`Missing asset path: ${relative}: ${match[1]}`);
  }
  if (relative === 'js/rougelike-codex.js') {
    const catalog = text.match(/const ASSET_FILES = \{([\s\S]*?)\};/)[1];
    for (const match of catalog.matchAll(/:\s*"([^"]+)"/g)) {
      if (!fs.existsSync(path.join(output, 'assets/rougelike/codex', match[1]))) throw new Error(`Missing Rogue texture: ${match[1]}`);
    }
  }
}
console.log(`Pages prepared: ${copied.length + 2} runtime/license files; HTML/CSS, module imports, asset roots, literal fetches and Rogue textures verified.`);
