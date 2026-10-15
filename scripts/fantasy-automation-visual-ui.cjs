/* global __dirname, process */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

(async () => {
  const root = path.resolve(__dirname, '..');
  const before = process.argv.includes('--before'), built = process.argv.includes('--built');
  const directory = path.join(root, built ? '.pages-dist' : 'web');
  const runtimeSHA256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory,'js/fantasy-automation/runtime/app.js'))).digest('hex');
  const output = path.join(root, 'artifacts/fantasy-automation/visual-ui', before ? 'before' : built ? 'built' : 'source');
  if (before && fs.existsSync(path.join(output, 'metadata.json'))) throw new Error('Before evidence is immutable; use a separate evidence directory.');
  fs.mkdirSync(output, { recursive: true });
  execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
    import fs from 'node:fs';import {Simulation} from './web/js/fantasy-automation/simulation.ts';import {validateSave} from './web/js/fantasy-automation/storage.ts';
    const output=process.argv[1],baseline=JSON.parse(fs.readFileSync('artifacts/fantasy-automation/technology/source/available.json','utf8'));
    const save=(name,sim)=>fs.writeFileSync(output+'/'+name+'.json',JSON.stringify(validateSave(sim.snapshot())));
    const iron=new Simulation();iron.restore(baseline);for(let n=0;n<20000 && iron.state.delivered<100;n++)iron.step();save('iron100',iron);
    const jam=new Simulation();jam.restore(baseline);jam.command({type:'remove',id:jam.state.buildings.find(b=>b.kind==='delivery').id});for(let n=0;n<600;n++)jam.step();save('jam',jam);
    const directions=new Simulation();directions.restore(baseline);for(const [direction,x,z] of [[0,17,16],[1,18,16],[2,17,17],[3,18,17]]){const r=directions.command({type:'build',kind:'belt',x,z,direction});if(!r.ok)throw new Error(r.reason);}save('directions',directions);
    const chest=new Simulation();chest.restore(JSON.parse(fs.readFileSync('artifacts/fantasy-automation/technology/source/advanced.json','utf8')));save('storage',chest);
  `, output], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const fixture = name => JSON.parse(fs.readFileSync(path.join(output, name + '.json'), 'utf8'));
  const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
  const server = http.createServer((request, response) => {
    const file = path.resolve(directory, '.' + new URL(request.url, 'http://localhost').pathname);
    if (!file.startsWith(directory + path.sep)) { response.writeHead(403).end(); return; }
    fs.readFile(file, (error, content) => error ? response.writeHead(404).end() : response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }).end(content));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser, page;
  const errors = [], requests = [], checks = [];
  try {
    browser = await chromium.launch({ executablePath: process.env.FANTASY_BROWSER_EXECUTABLE || '/usr/bin/chromium', headless: true,
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400 && !response.url().endsWith('favicon.ico')) requests.push(response.url()); });
    const action = name => page.locator(`[data-action="${name}"]:visible`).first();
    const menu = async () => { if (!await page.locator('.game-menu').evaluate(node => node.open)) await page.locator('.game-menu > summary').click(); };
    const closeMenu = async () => { if (await page.locator('.game-menu').evaluate(node => node.open)) await action('menu-close').click(); };
    const put = state => page.evaluate(state => new Promise((resolve, reject) => {
      const open = indexedDB.open('aigames-fantasy-automation', 1);
      open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains('saves')) open.result.createObjectStore('saves'); };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => { const db = open.result, tx = db.transaction('saves', 'readwrite');tx.objectStore('saves').put(state, 'workshop');
        tx.oncomplete = () => { db.close(); resolve(); };tx.onerror = () => { db.close(); reject(tx.error); }; };
    }), state);
    const load = async state => { await put(state);await menu();await action('load').click();
      await page.waitForFunction(() => [...document.querySelectorAll('#game-message,#guide-feedback')].some(node => node.textContent.includes('再開しました')));await closeMenu();if(await page.locator('[data-action=guide-close]').isVisible())await page.locator('[data-action=guide-close]').click(); };
    const cell = async (x, z, click = true) => {
      const point = await page.evaluate(async ({ x, z }) => { const THREE = await import('three');const b = document.querySelector('canvas').getBoundingClientRect();
        const a = b.width / b.height, c = new THREE.OrthographicCamera(-11*a,11*a,11,-11,.1,150);
        c.position.set(13+Math.sin(Math.PI/4)*25,29,16+Math.cos(Math.PI/4)*25);c.lookAt(13,0,16);c.updateMatrixWorld();
        const p = new THREE.Vector3(x,0,z).project(c);return {x:b.x+(p.x+1)*b.width/2,y:b.y+(1-p.y)*b.height/2}; }, {x,z});
      if(click)await page.mouse.click(point.x, point.y);else await page.mouse.move(point.x,point.y);
    };
    await page.goto(`http://127.0.0.1:${server.address().port}/fantasy-automation.html`);
    await page.waitForSelector('canvas');await page.locator('[data-speed="0"]').click();
    await page.screenshot({ path: path.join(output, 'initial.png'), fullPage: true });
    const close = page.locator('[data-action="guide-close"]');if(await close.isVisible())await close.click();
    await load(fixture('storage'));await cell(11,13);
    await page.screenshot({ path: path.join(output, 'storage.png'), fullPage: true });
    await load(fixture('iron100'));
    await page.screenshot({ path: path.join(output, 'iron100.png'), fullPage: true });
    await load(fixture('jam'));await cell(15,16);
    await page.screenshot({ path: path.join(output, 'jam.png'), fullPage: true });
    await load(fixture('directions'));
    await page.screenshot({ path: path.join(output, 'directions.png'), fullPage: true });
    if (!before) {
      const read = () => page.evaluate(() => new Promise((resolve,reject)=>{const o=indexedDB.open('aigames-fantasy-automation',1);o.onerror=()=>reject(o.error);o.onsuccess=()=>{const db=o.result,r=db.transaction('saves').objectStore('saves').get('workshop');r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>reject(r.error)}}));
      const save = async () => {await menu();await action('save').click();await page.waitForFunction(()=>[...document.querySelectorAll('#game-message,#guide-feedback')].some(n=>n.textContent.includes('保存しました')));await closeMenu();return read();};
      const capture = async name => page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
      const choose = async kind => {if(!await page.locator('.build-dock').isVisible())await action('build-open').click();for(const category of await page.locator('[data-category]').all()){await category.click();if(await page.locator(`[data-build="${kind}"]`).isVisible()){await page.locator(`[data-build="${kind}"]`).click();return}}throw new Error('Unknown build kind '+kind)};
      const select = async (x,z) => {if(await action('cancel').isVisible())await action('cancel').click();await cell(x,z);await page.waitForSelector('#selection-panel:not([hidden])');};
      const transfer = (side,resource='wood')=>page.locator(`[data-transfer="${side}"][data-resource="${resource}"]`);
      const count = async (side,resource='wood') => Number(await transfer(side,resource).locator('.slot-count').textContent());
      const chest = s => s.buildings.find(b=>b.x===11&&b.z===13);
      const stock = s => (s.inventory.wood||0)+s.buildings.reduce((n,b)=>n+[...b.input,...b.output,...(b.reserved||[]),...(b.item?[b.item]:[]),...(b.golemWorker?[b.golemWorker]:[])].filter(i=>i.resource==='wood').length,0);
      const record = label=>{checks.push(label);console.log(label)};
      await load(fixture('storage'));await select(11,13);await page.locator('[data-transfer-mode="one"]').click();
      const initial=await save(),wood=stock(initial);assert.equal(await count('withdraw'),20);
      await transfer('withdraw').click();assert.equal(await count('withdraw'),19);assert.equal(await count('deposit'),1);
      await transfer('deposit').click();assert.equal(await count('withdraw'),20);
      await transfer('withdraw').focus();await page.keyboard.press('Enter');assert.equal(await count('withdraw'),19);assert.equal(await transfer('withdraw').evaluate(n=>n===document.activeElement),true);await page.keyboard.press('Space');assert.equal(await count('withdraw'),18);assert.equal((await save()).tick,initial.tick);await transfer('withdraw').focus();
      const dir=await page.locator('canvas').getAttribute('data-selected-direction');await page.keyboard.press('r');assert.equal(await page.locator('canvas').getAttribute('data-selected-direction'),dir);
      await transfer('withdraw').click({modifiers:['Shift']});assert.equal(await count('withdraw'),0);assert.equal(await count('deposit'),20);
      await action('deposit-all').click();assert.equal(await count('withdraw'),20);
      await page.locator('[data-transfer-mode="all"]').click();await transfer('withdraw').click();assert.equal(await count('withdraw'),0);await transfer('deposit').click();assert.equal(await count('withdraw'),20);
      await action('withdraw-all').click();assert.equal(await count('deposit'),20);await action('deposit-all').click();
      const transferred=await save();assert.equal(stock(transferred),wood);assert.equal(chest(transferred).input.length,20);assert.equal(chest(transferred).input.every(i=>i.handled),true);assert.equal(transferred.tick,initial.tick);
      await capture('chest-icons');record('Icon one/all/Shift/Enter transfers preserve stock and tick; retrieved items remain handled; keyboard focus survives updates');
      await load(transferred);await select(11,13);assert.equal(await count('withdraw'),20);assert.deepEqual(await save(),transferred);record('Chest icon edits save and restore exactly');

      // Capacity fixture uses only commands: actual research, build, manual gathering, and deposits.
      const fullFile=path.join(output,'full-chest.json');
      execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`import fs from 'node:fs';import {Simulation} from './web/js/fantasy-automation/simulation.ts';import {validateSave} from './web/js/fantasy-automation/storage.ts';const sim=new Simulation();sim.restore(JSON.parse(fs.readFileSync(process.argv[1],'utf8')));for(const command of [{type:'research',id:'logistics'},{type:'build',kind:'storage',x:17,z:16,direction:0}]){const r=sim.command(command);if(!r.ok)throw Error(r.reason)}const b=sim.state.buildings.find(b=>b.kind==='storage');while(sim.state.inventory.wood<33)sim.command({type:'gatherWood'});sim.command({type:'feed',id:b.id,resource:'wood',amount:32});fs.writeFileSync(process.argv[2],JSON.stringify(validateSave(sim.snapshot())));`,path.join(output,'iron100.json'),fullFile],{cwd:root});
      await load(JSON.parse(fs.readFileSync(fullFile)));await select(17,16);assert.equal(await count('withdraw'),32);assert.equal(await transfer('deposit').isDisabled(),true);assert.equal(await action('deposit-all').isDisabled(),true);const full=await save();await transfer('deposit').evaluate(n=>n.click());assert.deepEqual(await save(),full);await capture('chest-full');record('Full 32-slot chest disables overflow; repeated disabled activation does not duplicate items');

      await load(fixture('directions'));await action('build-open').click();const beforeModal=await save();await cell(19,18);assert.deepEqual(await save(),beforeModal);await action('build-close').click();
      await action('build-open').click();await page.locator('[data-category="extraction"]').click();await page.locator('#registration-slot').selectOption('0');await page.locator('[data-register="lumber"]').click();
      const preference=await page.evaluate(()=>JSON.parse(localStorage.getItem('aigames-workshop-ui-v1')));assert.equal(preference.quickSlots[0],'lumber');await capture('category-catalog');await action('build-close').click();await page.locator('[data-quick="0"]').click();assert.match(await page.locator('#build-context').textContent(),/木材採取/);await action('cancel').click();
      await save();await page.reload();await page.locator('[data-speed="0"]').click();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('aigames-workshop-ui-v1'))),preference);await menu();await action('load').click();await closeMenu();await page.locator('canvas').focus();await page.keyboard.press('1');assert.match(await page.locator('#build-context').textContent(),/木材採取/);await action('cancel').click();record('Category catalog blocks world clicks; star registration persists after reload and works with quick-slot click and key 1');
      await load(fixture('directions'));
      for(const [direction,x,z] of [[0,17,16],[1,18,16],[2,17,17],[3,18,17]]){await select(x,z);await page.waitForFunction(d=>document.querySelector('canvas').dataset.selectedDirection===String(d),direction);assert.equal(await page.locator('canvas').getAttribute('data-selected-direction'),String(direction));await capture('direction-'+direction);}
      await action('cancel').click();const beforeGhost=await save();await choose('miner');await page.locator('canvas').focus();await cell(17,19,false);await page.waitForFunction(()=>document.querySelector('canvas').dataset.ghostValid==='false');await capture('ghost-invalid');assert.deepEqual(await save(),beforeGhost);await choose('belt');await page.locator('canvas').focus();await cell(17,19,false);await page.waitForFunction(()=>document.querySelector('canvas').dataset.ghostValid==='true');await capture('ghost-valid');
      for(let d=0;d<4;d++){await page.mouse.move(700,650);await page.waitForFunction(()=>document.querySelector('canvas').dataset.ghostDirection!==undefined);const current=Number(await page.locator('canvas').getAttribute('data-ghost-direction'));for(let r=0;r<(d-current+4)%4;r++)await page.keyboard.press('r');await page.waitForFunction(d=>document.querySelector('canvas').dataset.ghostDirection===String(d),d);await cell(17+d%2,19+Math.floor(d/2));}
      const rotations=await save();for(let d=0;d<4;d++)assert.equal(rotations.buildings.find(b=>b.x===17+d%2&&b.z===19+Math.floor(d/2))?.direction,d);await action('cancel').click();await capture('directions');record('Four existing and four preview/place cardinal directions match saved simulation directions');
      await load(fixture('jam'));await select(15,16);await page.waitForFunction(()=>document.querySelector('canvas').dataset.selectedPorts!==undefined);const ports=await page.locator('canvas').getAttribute('data-selected-ports');assert.match(ports,/missing|full/);const flow=await page.locator('canvas').getAttribute('data-selected-flow-progress');await page.waitForTimeout(500);assert.equal(await page.locator('canvas').getAttribute('data-selected-flow-progress'),flow);const paused=await save();await load(paused);await select(15,16);assert.deepEqual(await save(),paused);await capture('jam');record('Blocked output glyph and flow progress remain stable while paused; jam save/load preserves items and timing');

      const statusFile=path.join(output,'logistics-statuses.json');execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',`import fs from 'node:fs';import {Simulation} from './web/js/fantasy-automation/simulation.ts';import {validateSave} from './web/js/fantasy-automation/storage.ts';const sim=new Simulation();sim.restore(JSON.parse(fs.readFileSync(process.argv[1],'utf8')));const cmd=c=>{const r=sim.command(c);if(!r.ok)throw Error(r.reason)};cmd({type:'research',id:'logistics'});while(sim.state.inventory.wood<60)cmd({type:'gatherWood'});for(const [kind,x,z,direction] of [['storage',19,16,0],['wire',17,18,0],['belt',17,15,0]])cmd({type:'build',kind,x,z,direction});cmd({type:'feed',id:sim.state.buildings.find(b=>b.x===19&&b.z===16).id,resource:'wood',amount:32});for(const [x,z] of [[18,16],[17,17]])cmd({type:'feed',id:sim.state.buildings.find(b=>b.x===x&&b.z===z).id,resource:'ingot',amount:1});fs.writeFileSync(process.argv[2],JSON.stringify(validateSave(sim.snapshot())));`,path.join(output,'directions.json'),statusFile],{cwd:root});await load(JSON.parse(fs.readFileSync(statusFile)));for(const [x,z,status] of [[18,16,'full'],[17,17,'incompatible'],[17,16,'connected']]){await select(x,z);await page.waitForFunction(status=>document.querySelector('canvas').dataset.selectedPorts?.includes(status),status);await capture('ports-'+status)}record('Actual command-created full chest, wrong-material wire, and connected belt expose distinct logistics glyphs');
      await load(fixture('iron100'));assert.match(await page.locator('#objective-title').textContent(),/物流/);await action('technology-open').click();await page.locator('[data-research="logistics"]').click();assert.match(await page.locator('#objective-title').textContent(),/結晶|魔晶/);await page.locator('[data-research="crystals"]').click();assert.match(await page.locator('#objective-title').textContent(),/組立|剣|魔晶/);assert.equal(await page.locator('[data-research="assembly"]').isDisabled(),true);await capture('iron100-next-goal');await action('technology-close').click();record('Iron 100 replaces completed milestone with research next goals; unmet automatic crystal production cannot be skipped');

      const legacy=JSON.parse(fs.readFileSync(path.join(root,'artifacts/fantasy-automation/visual-ui/before/iron100.json')));await load(legacy);assert.deepEqual(await read(),legacy);const migrated=await save();assert.equal(migrated.version,3);assert.equal(migrated.tick,legacy.tick);assert.equal(migrated.buildings.length,legacy.buildings.length);record('Legacy v2 is read without rewriting the saved slot; explicit save migrates to v3 while retaining clock and buildings');
      await load(JSON.parse(fs.readFileSync(path.join(root,'artifacts/fantasy-automation/stage3/mastery.json'))));await action('technology-open').click();await page.locator('[data-research="mastery"]').click();assert.match(await page.locator('#objective-title').textContent(),/魔導核|ルーン/);await page.locator('[data-research="runecraft"]').click();assert.match(await page.locator('#objective-title').textContent(),/ゴーレム|躯体/);assert.doesNotMatch(await page.locator('#objective-title').textContent(),/延べ棒.*100/);await capture('rune-next-goal');await action('technology-close').click();
      await load(JSON.parse(fs.readFileSync(path.join(root,'artifacts/fantasy-automation/stage3/golemcraft-ready.json'))));await action('technology-open').click();await page.locator('[data-research="golemcraft"]').click();assert.match(await page.locator('#objective-title').textContent(),/ゴーレム|自動/);assert.doesNotMatch(await page.locator('#objective-title').textContent(),/延べ棒.*100/);await capture('golem-next-goal');await action('technology-close').click();record('Actual iron-10 stage-three fixtures continue rune/golem objectives after research and never fall back to iron 100');
      const active=JSON.parse(fs.readFileSync(path.join(root,'artifacts/fantasy-automation/stage3/golem-active.json')));await load(active);await select(11,17);
      assert.match(await page.locator('#relay-worker').textContent(),/ゴーレム/);await page.locator('[data-relay-policy="materials"]').click();const material=await save();assert.equal(material.buildings.find(b=>b.kind==='golemRelay').golemPolicy,'materials');await page.locator('[data-relay-policy="fuel"]').click();const fuel=await save();const relay=fuel.buildings.find(b=>b.kind==='golemRelay');assert.deepEqual(relay.golemWorker,active.buildings.find(b=>b.kind==='golemRelay').golemWorker);assert.equal(relay.golemCooldown,19);await load(fuel);await select(11,17);assert.deepEqual(await save(),fuel);
      await capture('golem-active');await page.locator('[data-speed="2"]').click();
      const deadline=Date.now()+85000;let live;do{await page.waitForTimeout(1500);await page.locator('[data-speed="0"]').click();live=await save();if(live.stats.golemFuelTransfers>=20)break;await page.locator('[data-speed="2"]').click();}while(Date.now()<deadline);
      assert.ok(live.stats.golemFuelTransfers>=20,'Actual relay fuel transfers reach 20');assert.ok(live.stats.produced.sword>fuel.stats.produced.sword,'Old sword factory continues while relay works');assert.ok(live.stats.produced.golem>=fuel.stats.produced.golem);await action('technology-open').click();assert.equal(await page.locator('[data-research="sanctuary"]').isDisabled(),false);await page.locator('[data-research="sanctuary"]').click();const sanctuary=await save();assert.ok(sanctuary.research.unlocked.includes('sanctuary'));await capture('sanctuary-researched');await action('technology-close').click();record('Actual automated relay reaches 20 untouched-wood fuel transfers while sword production continues; policies/worker/route/cooldown survive exact save and sanctuary is researched through UI');
      fs.writeFileSync(path.join(output,'live-golem.json'),JSON.stringify(sanctuary,null,2)+'\n');
      await select(10,17);await page.locator('[data-transfer-mode="one"]').click();for(let n=0;n<3;n++)await transfer('deposit','ingot').click();await select(11,17);await page.locator('[data-relay-policy="materials"]').click();const beforeMaterials=await save();await page.locator('[data-speed="2"]').click();await page.waitForTimeout(2300);await page.locator('[data-speed="0"]').click();const afterMaterials=await save();fs.writeFileSync(path.join(output,'materials-golem.json'),JSON.stringify(afterMaterials,null,2)+'\n');assert.ok(afterMaterials.stats.golemTransfers>beforeMaterials.stats.golemTransfers);assert.equal(afterMaterials.stats.golemFuelTransfers,beforeMaterials.stats.golemFuelTransfers);assert.equal(afterMaterials.buildings.find(b=>b.kind==='golemRelay').golemRoute.resource,'ingot');await capture('golem-materials');await load(afterMaterials);await select(11,17);assert.deepEqual(await save(),afterMaterials);record('Materials policy carries real player-deposited ingots, preserves fuel-credit count, and saves its actual worker route exactly');
      for(const width of [320,390,1440]){await page.setViewportSize({width,height:width===1440?900:844});await page.waitForFunction(()=>{const b=document.querySelector('canvas').getBoundingClientRect();return Math.abs(b.width-innerWidth)<=1&&Math.abs(b.height-innerHeight)<=1});await capture('responsive-'+width);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await action('build-open').click();await capture('catalog-'+width);await action('build-close').click();}
      const desktop=page;page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))requests.push(r.url())});await page.goto(`http://127.0.0.1:${server.address().port}/fantasy-automation.html`);await page.locator('[data-speed="0"]').tap();await load(fixture('storage'));await menu();await action('camera').tap();await closeMenu();await select(11,13);await page.locator('[data-transfer-mode="one"]').tap();await transfer('withdraw').tap();assert.equal(await count('withdraw'),19);await capture('touch-chest-390');await page.close();page=desktop;record('390px touch icon withdraw transfers exactly one item');
      record('320/390/1440 canvas dimensions follow viewport, catalog remains accessible, and document has no horizontal overflow');
      assert.deepEqual(errors,[]);assert.deepEqual(requests,[]);fs.rmSync(path.join(output,'failure.png'),{force:true});
      fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({completed:new Date().toISOString(),checks,pageErrors:errors,failedRequests:requests,initialGolemFuel:fuel.stats.golemFuelTransfers,finalGolemFuel:sanctuary.stats.golemFuelTransfers,swordProducedDuringRelay:sanctuary.stats.produced.sword-fuel.stats.produced.sword},null,2)+'\n');
    }
    assert.deepEqual(errors, []);assert.deepEqual(requests, []);
    fs.writeFileSync(path.join(output, 'metadata.json'), JSON.stringify({ captured: new Date().toISOString(), runtimeSHA256, source: directory, checks: before ? ['Initial view', 'Actual storage inventory', 'Actual 100 automatic iron deliveries', 'Blocked output belt', 'Four cardinal belt directions'] : checks, pageErrors: errors, failedRequests: requests }, null, 2)+'\n');
    console.log(before ? 'Visual UI before capture completed.' : 'Visual UI source/built QA passed: '+checks.length+' checks.');
  } catch(error) {if(page)await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
  finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
