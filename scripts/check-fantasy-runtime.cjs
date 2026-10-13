const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const relative = 'web/js/fantasy-automation/runtime/app.js';
// The standalone web/ distribution must contain the same bundle as a fresh build.
execFileSync('git', ['ls-files', '--error-unmatch', relative], { cwd: root, stdio: 'pipe' });
const digest = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
const shipped = digest();
if (!process.env.npm_execpath) throw new Error('Run with npm run check:fantasy-runtime');
execFileSync(process.execPath, [process.env.npm_execpath, 'run', 'build:fantasy'], { cwd: root, stdio: 'inherit' });
if (digest() !== shipped) throw new Error('Distribution JavaScript was stale. Commit the rebuilt runtime/app.js together with its TypeScript source.');
console.log('Tracked distribution JavaScript matches the TypeScript/Vite build.');
