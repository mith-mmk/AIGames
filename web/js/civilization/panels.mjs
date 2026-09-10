import {
  BUILDINGS, GOVERNMENTS, IMPROVEMENTS, PROJECTS, RESOURCES, RULES_VERSION,
  TECHS, TERRAIN, UNITS,
} from './data.mjs';
import { UNIT_ART, CITY_ART, unitStateLabel, unitIsSpent } from './unit-art.mjs';
import { SHORTCUT_HELP } from './keyboard.mjs';

const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const button = (text, action, className = '') => {
  const node = el('button', text, className);
  node.type = 'button';
  if (action) node.addEventListener('click', action);
  return node;
};
const row = (label, value) => {
  const node = el('div', undefined, 'brief-row');
  node.append(el('span', label), el('b', value));
  return node;
};
const section = (title) => el('h3', title);
const nameOf = (collection, id) => collection?.[id]?.label ?? id ?? '—';
const number = (value, fallback = '—') => Number.isFinite(value) ? String(value) : fallback;
const turns = (value, reason) => value === null || value === undefined
  ? (reason ? '停止中（' + reasonLabel(reason) + '）' : '—')
  : String(value) + 'ターン';
const reasonLabel = (reason) => ({
  NO_SURPLUS: '食料余剰なし',
  NO_QUEUE: '生産未設定',
  DISORDER: '暴動',
  NO_PRODUCTION: '生産力なし',
  TREASURY_SHORTAGE: '国庫不足',
  NO_CONNECTION: '経路未接続',
  WAR: '戦争で停止',
  ROUTE_BROKEN: '経路切断',
  INSOLVENT: '国庫不足',
  GOVERNMENT_TRANSITION: '政治体制の移行中',
  POPULATION_REQUIRED: '人口不足',
  CONNECTION_BROKEN: '経路切断',
  AGREEMENT_EXPIRED: '交易協定の失効',
  CITY_LOST: '都市の喪失',
}[reason] || reason || '—');
const treatyLabel = (kind) => ({
  peace: '和平',
  openBorders: '通行権',
  tradeAgreement: '交易協定',
  alliance: '同盟',
  exchange: '交換',
}[kind] || kind);
const otherParty = (treaty, civId) => treaty.civAId === civId ? treaty.civBId : treaty.civAId;
const normalizeX = (width, x) => ((x % width) + width) % width;
const distance = (view, a, b) => Math.max(
  Math.min(Math.abs(a.x - b.x), view.world.width - Math.abs(a.x - b.x)),
  Math.abs(a.y - b.y),
);
const adjacentTiles = (view, point) => {
  const ids = new Set();
  const result = [];
  for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
    if (!dx && !dy) continue;
    const y = point.y + dy;
    if (y < 0 || y >= view.world.height) continue;
    const x = normalizeX(view.world.width, point.x + dx);
    const tile = view.world.tiles[y * view.world.width + x];
    if (tile && !ids.has(tile.id)) {
      ids.add(tile.id);
      result.push(tile);
    }
  }
  return result.sort((a, b) => a.id - b.id);
};
const isLandTile = (tile) => tile?.visibility === 'visible'
  && TERRAIN[tile.terrainId] && !TERRAIN[tile.terrainId].water
  && tile.terrainId !== 'mountain';
const definitionFor = (item) => item.kind === 'unit'
  ? UNITS[item.definitionId]
  : item.kind === 'building'
    ? BUILDINGS[item.definitionId]
    : PROJECTS[item.definitionId];
const unlocked = (definition, techIds) => Boolean(
  definition && (!definition.requires || techIds.includes(definition.requires)),
);

function unitImage(unit, className = 'unit-thumbnail') {
  const image = el('img', undefined, className + (unitIsSpent(unit) ? ' spent' : ''));
  image.src = UNIT_ART[unit.typeId].url;
  image.alt = ''; image.draggable = false;
  return image;
}

function selectedUnitCard(unit, city) {
  const card = el('div', undefined, 'selected-unit-card');
  card.append(unitImage(unit, 'unit-portrait'));
  const meta = el('div', undefined, 'selected-unit-meta');
  meta.append(el('strong', nameOf(UNITS, unit.typeId)),
    el('span', unitStateLabel(unit), 'unit-state'),el('span',`現在地 ${unit.x}, ${unit.y}`,'unit-position'),
    el('span', `${unit.hp} / ${UNITS[unit.typeId].hp} HP · ${number(unit.movementLeft)} / ${UNITS[unit.typeId].movement} 移動`));
  const meter = el('progress', undefined, 'unit-hp');
  meter.max = UNITS[unit.typeId].hp; meter.value = unit.hp;
  meter.setAttribute('aria-label', '残りHP');
  meta.append(meter); card.append(meta);
  if (city && !unit.transportedByUnitId) meta.append(el('span', `${city.name}に駐留`, 'garrison-tag'));
  return card;
}

function unitStackButton(game, selectedId, unit, suffix = '') {
  const item = button('', () => game.selectUnit(unit.id),
    'stack-item' + (selectedId === unit.id ? ' selected' : ''));
  item.append(unitImage(unit));item.setAttribute('aria-pressed',String(selectedId === unit.id));
  const meta = el('span', undefined, 'stack-meta');
  meta.append(
    el('b', nameOf(UNITS, unit.typeId) + suffix),
    el('small', number(unit.hp) + ' HP · '
      + number(Math.max(0, Math.round(unit.movementLeft * 10) / 10)) + ' 移動 · '
      + unitStateLabel(unit)),
  );
  item.append(meta);
  return item;
}

function appendTransportActions(game, view, actions, unit) {
  if (!unit || unit.ownerId !== view.self.id) return;
  const definition = UNITS[unit.typeId];
  if (unit.transportedByUnitId) {
    const transport = view.units.find((candidate) => candidate.id === unit.transportedByUnitId);
    if (!transport) return;
    if (transport.movementLeft <= 0) {
      actions.append(el('small', '下船には輸送船の移動力が必要です'));
      return;
    }
    const shores = adjacentTiles(view, transport).filter(isLandTile);
    if (!shores.length) actions.append(el('small', '隣接する上陸可能な岸がありません'));
    for (const shore of shores) actions.append(button(
      '下船 ' + shore.x + ',' + shore.y,
      () => game.command({
        type: 'unit.unload', unitId: unit.id, to: { x: shore.x, y: shore.y },
      }),
      'command',
    ));
    return;
  }
  if (definition?.domain === 'land') {
    const unitTile = view.world.tiles[unit.y * view.world.width + unit.x];
    const transports = view.units.filter((candidate) => candidate.ownerId === view.self.id
      && (UNITS[candidate.typeId]?.capacity || 0) > 0
      && unit.movementLeft > 0 && candidate.movementLeft > 0
      && distance(view, unit, candidate) <= 1
      && (distance(view, unit, candidate) === 0
        || (isLandTile(unitTile)
          && view.world.tiles[candidate.y * view.world.width + candidate.x]?.terrainId === 'coast'))
      && view.units.filter((cargo) => cargo.transportedByUnitId === candidate.id).length
        < UNITS[candidate.typeId].capacity);
    for (const transport of transports.sort((a, b) => a.id.localeCompare(b.id))) {
      actions.append(button(
        nameOf(UNITS, transport.typeId) + 'に乗船',
        () => game.command({
          type: 'unit.board', unitId: unit.id, transportUnitId: transport.id,
        }),
        'command',
      ));
    }
  }
  if ((definition?.capacity || 0) > 0) {
    const transportTile = view.world.tiles[unit.y * view.world.width + unit.x];
    const cargo = view.units.filter((candidate) => candidate.transportedByUnitId === unit.id);
    const candidates = view.units.filter((candidate) => candidate.ownerId === view.self.id
      && candidate.id !== unit.id && !candidate.transportedByUnitId
      && unit.movementLeft > 0 && candidate.movementLeft > 0
      && UNITS[candidate.typeId]?.domain === 'land' && distance(view, unit, candidate) <= 1
      && (distance(view, unit, candidate) === 0
        || (transportTile?.terrainId === 'coast'
          && isLandTile(view.world.tiles[candidate.y * view.world.width + candidate.x]))));
    actions.append(row('積載', String(cargo.length) + ' / ' + String(definition.capacity)));
    for (const candidate of candidates.sort((a, b) => a.id.localeCompare(b.id))) {
      actions.append(button(
        nameOf(UNITS, candidate.typeId) + 'を積載',
        () => game.command({
          type: 'unit.board', unitId: candidate.id, transportUnitId: unit.id,
        }),
        'command',
      ));
    }
  }
}

export function renderSelection(game, view) {
  const selected = game.uiState.selected;
  const tile = view?.world?.tiles?.find((candidate) => candidate.id === selected.tileId);
  const title = document.querySelector('#selected-title');
  const subtitle = document.querySelector('#selected-subtitle');
  const summary = document.querySelector('#tile-summary');
  const stack = document.querySelector('#stack-list');
  const actions = document.querySelector('#selection-actions');
  const stackDetails = document.querySelector('#stack-details');
  title.textContent = '未選択';
  subtitle.textContent = 'マップ上の都市か部隊を選択してください';
  summary.replaceChildren();
  stack.replaceChildren();
  actions.replaceChildren();
  stackDetails.hidden = true;
  if (!tile) return;

  const city = view.cities?.find((candidate) => candidate.id === selected.cityId)
    || (tile.cityId && view.cities?.find((candidate) => candidate.id === tile.cityId));
  const units = (tile.unitIds || []).map(
    (id) => view.units?.find((unit) => unit.id === id),
  ).filter(Boolean);
  title.textContent = city
    ? city.name
    : nameOf(TERRAIN, tile.terrainId) + ' · ' + tile.x + ', ' + tile.y;
  subtitle.textContent = city
    ? '人口 ' + city.population + ' · ' + (city.ownerId === view.self.id ? '自文明' : '既知の都市')
    : tile.visibility === 'visible' ? '可視領域' : '記憶された領域';
  const facts=el('details',undefined,'selection-extra');facts.append(el('summary','タイルの地形・資源'));
  facts.append(
    row('地形', nameOf(TERRAIN, tile.terrainId)),
    row('視界', tile.visibility === 'visible' ? '現在可視' : '記憶'),
  );
  const portraitUnit = view.units?.find(unit => unit.id === selected.unitId);
  if (portraitUnit) {
    title.textContent = nameOf(UNITS,portraitUnit.typeId);
    subtitle.textContent = `${city && !portraitUnit.transportedByUnitId ? city.name + 'に駐留 · ' : ''}現在地 ${portraitUnit.x}, ${portraitUnit.y}`;
    summary.append(selectedUnitCard(portraitUnit, city));
  }
  else facts.open=true;
  if (tile.resourceId) facts.append(row('資源', nameOf(RESOURCES, tile.resourceId)));
  if (tile.routeId) facts.append(row('交通', tile.routeId === 'railroad' ? '鉄道' : '道路'));
  if (tile.landUseId) facts.append(row('土地改良', tile.landUseId === 'mine' ? '鉱山' : '灌漑'));
  summary.append(facts);
  stackDetails.hidden = !units.length;
  document.querySelector('#stack-summary').textContent = `${city ? '都市内の駐留部隊' : '同じタイルの部隊'} ${units.length}`;

  for (const unit of units) {
    stack.append(unitStackButton(game, selected.unitId, unit));
    const cargo = view.units.filter((candidate) => candidate.transportedByUnitId === unit.id);
    for (const loaded of cargo.sort((a, b) => a.id.localeCompare(b.id))) {
      stack.append(unitStackButton(game, selected.unitId, loaded, '（積載中）'));
    }
  }
  const selectedUnit = view.units?.find((unit) => unit.id === selected.unitId);
  const moveBanner=game.root.querySelector('#movement-status');
  if(moveBanner){moveBanner.hidden=game.uiState.inputMode!=='move';moveBanner.textContent=game.uiState.movePlan?`目的地 ${game.uiState.movePlan.to.x}, ${game.uiState.movePlan.to.y} ｜ Enterで確定・Escで取消`:'移動先をクリックして確認 → Enterで確定 ｜ Escで取消';}
  if (selectedUnit?.ownerId === view.self.id) {
    actions.append(button('現在地 [L]',()=>game.centerSelected(),'command'));
    const plan=game.uiState.movePlan;
    if(plan&&plan.unitId===selectedUnit.id){
      const box=el('section',undefined,'move-plan');const nowPath=plan.preview.path.filter(step=>step.arrivalRound<=view.turn.round);const end=nowPath.at(-1)||selectedUnit;
      box.append(el('strong',`${plan.kind==='attack'?'攻撃':'移動'}先 ${plan.to.x}, ${plan.to.y}`),el('p',`出発 ${selectedUnit.x}, ${selectedUnit.y} → 今ターン ${end.x}, ${end.y}`));
      if(plan.kind==='path'&&nowPath.length<plan.preview.path.length){
        const toggle=el('input');toggle.type='checkbox';toggle.checked=plan.continue;toggle.addEventListener('change',()=>game.setContinueMove(toggle.checked));
        const label=el('label');label.append(toggle,document.createTextNode('次の手番も自動で移動する'));box.append(label,el('small','オフなら今ターンに進める地点で終了します。'));
      }
      if(plan.kind==='attack')box.append(el('p',`予測勝率 ${Math.round((plan.preview.winChance||0)*100)}%`));
      const confirm=button(plan.kind==='attack'?'攻撃を確定 [Enter]':'移動を確定 [Enter]',()=>game.confirmMove(),'command primary');
      confirm.dataset.requiresMovement=String(!plan.continue&&!nowPath.length);confirm.disabled=confirm.dataset.requiresMovement==='true';
      box.append(confirm,button('取消 [Esc]',()=>game.cancelSelection(),'command'));actions.append(box);
    }

    if (!selectedUnit.transportedByUnitId) {
      const move=button(game.uiState.inputMode==='move'?'移動取消 [M]':'移動 [M]',()=>game.beginMove(),'command primary');move.setAttribute('aria-pressed',String(game.uiState.inputMode==='move'));actions.append(move);
      if(selectedUnit.order?.type==='path'){actions.append(el('small',`経路移動中・残り${selectedUnit.order.path.length}マス`));actions.append(button('経路を解除 [W]',()=>game.commandSelected('unit.wake'),'command'));}
    }
    for (const [label, type] of [
      ['待機', 'unit.wait'], ['防御', 'unit.fortify'], ['休眠', 'unit.sleep'], ['起床', 'unit.wake'],
    ]) actions.append(button(
      label, () => game.command({ type, unitId: selectedUnit.id }), 'command',
    ));
    if (selectedUnit.typeId === 'settler' && !selectedUnit.transportedByUnitId) {
      actions.append(button('都市を建設', () => game.foundCity(), 'command primary'));
    }
    if (selectedUnit.typeId === 'worker' && !selectedUnit.transportedByUnitId) {
      for (const [id, label] of [
        ['road', '道路'], ['railroad', '鉄道'], ['irrigation', '灌漑'], ['mine', '鉱山'],
      ]) actions.append(button(
        label,
        () => game.command({
          type: 'unit.improve', unitId: selectedUnit.id, improvementId: id,
        }),
        'command',
      ));
    }
    appendTransportActions(game, view, actions, selectedUnit);
  }
  if (city?.ownerId === view.self.id && !selectedUnit) {
    actions.append(button('都市詳細を開く', () => {
      game.selectCity(city.id);
      game.openDialog('city');
    }, 'command primary'));
  }
}

export function renderBriefs(view, game) {
  const cityBox = game.root.querySelector('#city-brief');
  const unitBox = game.root.querySelector('#unit-brief');
  const tabs = game.root.querySelector('#roster-tabs');
  const paging = game.root.querySelector('#roster-paging');
  const cities = view.cities.filter(city => city.ownerId === view.self.id);
  const units = view.units.filter(unit => unit.ownerId === view.self.id);
  const tab = game.uiState.rosterTab || 'units';
  cityBox.replaceChildren(); unitBox.replaceChildren(); tabs.replaceChildren(); paging.replaceChildren();
  cityBox.hidden = tab !== 'cities'; unitBox.hidden = tab !== 'units';
  for (const [id, label, total] of [['cities', '都市', cities.length], ['units', '部隊', units.length]]) {
    const toggle = button(`${label} ${total}`, () => game.setRosterTab(id), tab === id ? 'active' : '');
    toggle.setAttribute('aria-pressed', String(tab === id)); tabs.append(toggle);
  }
  const all = tab === 'cities' ? cities : units;
  const pageSize = 3; const pages = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.max(0, Math.min(pages - 1, game.uiState.rosterPages?.[tab] || 0));
  const box = tab === 'cities' ? cityBox : unitBox;
  if (!all.length) box.append(el('p', tab === 'cities' ? '都市を建設してください' : '部隊はありません', 'brief-empty'));
  for (const item of all.slice(page * pageSize, (page + 1) * pageSize)) {
    if (tab === 'cities') {
      const city = item; const current = city.productionQueue[0];
      const card = button('', () => { game.selectCity(city.id); game.renderer.centerOn(city.x,city.y); game.drawMap(); }, 'roster-card');
      const image = el('img'); image.src = CITY_ART.url; image.alt = '';
      const info = el('span'); info.append(el('b', city.name), el('small', `人口 ${city.population} · ${current ? definitionFor(current)?.label : '生産未設定'}`));
      card.append(image, info); card.classList.toggle('selected', city.id === game.uiState.selected.cityId); box.append(card);
    } else {
      const unit = item;
      const city = cities.find(city => city.x === unit.x && city.y === unit.y);
      const transport = unit.transportedByUnitId && view.units.find(item => item.id === unit.transportedByUnitId);
      const location = transport ? `${nameOf(UNITS,transport.typeId)}に積載` : city ? `${city.name}に駐留` : `${unit.x},${unit.y}`;
      const card = button('', () => { game.selectUnit(unit.id); game.centerSelected(); }, 'roster-card');
      const info = el('span'); info.append(el('b', nameOf(UNITS,unit.typeId)), el('small', `${location} · ${unitStateLabel(unit)}`));
      card.append(unitImage(unit),info); card.classList.toggle('selected', unit.id === game.uiState.selected.unitId); box.append(card);
    }
  }
  const previous = button('‹', () => game.setRosterPage(page - 1)); previous.disabled = page === 0; previous.setAttribute('aria-label','一覧の前ページ');
  const next = button('›', () => game.setRosterPage(page + 1)); next.disabled = page >= pages - 1; next.setAttribute('aria-label','一覧の次ページ');
  const jump = el('select'); jump.setAttribute('aria-label', tab === 'cities' ? '都市一覧のページ' : '部隊一覧のページ');
  for (let index = 0; index < pages; index++) { const option=el('option', `${index + 1} / ${pages}`);option.value=String(index);option.selected=index===page;jump.append(option); }
  jump.addEventListener('change', () => game.setRosterPage(Number(jump.value)));
  paging.append(previous, jump, next, el('small', `${all.length ? page * pageSize + 1 : 0}–${Math.min(all.length,(page + 1) * pageSize)} / ${all.length}件`));
}
function tileYield(tile) {
  const terrain = TERRAIN[tile.terrainId] || {};
  const resource = RESOURCES[tile.resourceId] || {};
  const landUse = IMPROVEMENTS[tile.landUseId] || {};
  const route = IMPROVEMENTS[tile.routeId] || {};
  return {
    food: (terrain.food || 0) + (resource.food || 0) + (landUse.food || 0),
    production: (terrain.production || 0) + (resource.production || 0)
      + (landUse.production || 0),
    trade: (terrain.trade || 0) + (resource.trade || 0) + (landUse.trade || 0)
      + (route.trade || 0) + (tile.river ? 1 : 0),
  };
}

function cityAllocation(game, view, city, content) {
  const controls = el('div', undefined, 'citizen-controls');
  const specialistInputs = {};
  for (const [key, label] of [
    ['scientist', '科学者'], ['taxCollector', '徴税人'], ['entertainer', '芸人'],
  ]) {
    const input = el('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(city.population);
    input.step = '1';
    input.value = String(city.specialists?.[key] || 0);
    specialistInputs[key] = input;
    const wrapper = el('label', label + ' ');
    wrapper.append(input);
    controls.append(wrapper);
  }

  const tileList = el('div', undefined, 'citizen-tiles');
  tileList.setAttribute('aria-label','都市周囲のタイル。北が上、東が右');
  const checks = []; const locks = [];
  const usedByOtherCity = new Set(view.cities.filter(
    candidate => candidate.ownerId === view.self.id && candidate.id !== city.id,
  ).flatMap(candidate => candidate.workedTileIds || []));
  const glyphs={grassland:'♧',plains:'〰',forest:'♣',hills:'⌒',mountain:'▲',desert:'☀',tundra:'❄',coast:'≈',ocean:'≈'};
  for (let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++) {
    if(Math.abs(dx)===2&&Math.abs(dy)===2)continue;
    const x=normalizeX(view.world.width,city.x+dx);const y=city.y+dy;
    const card=el('article',undefined,'citizen-tile');
    card.style.gridColumn=String(dx+3);card.style.gridRow=String(dy+3);tileList.append(card);
    if(y<0||y>=view.world.height){card.classList.add('unavailable');card.append(el('span','地図の外'));continue;}
    const id=y*view.world.width+x;const tile=view.world.tiles[id];
    const center=dx===0&&dy===0;const unknown=tile.visibility==='unexplored';
    card.dataset.terrain=unknown?'unknown':tile.terrainId;
    const heading=el('div',undefined,'citizen-tile-heading');
    const icon=el('span',center?'▣':glyphs[tile.terrainId]||'·','terrain-glyph');icon.setAttribute('aria-hidden','true');
    heading.append(icon,el('strong',center?'都市中心':unknown?'未探索':nameOf(TERRAIN,tile.terrainId)),el('small',`${x},${y}`));card.append(heading);
    if(!unknown){const yields=tileYield(tile);const yieldRow=el('div',undefined,'tile-yields');
      for(const [key,label] of [['food','食'],['production','生'],['trade','交']])yieldRow.append(el('span',`${label} ${yields[key]}`,`yield-${key}`));card.append(yieldRow);
      if(tile.resourceId)card.append(el('small',nameOf(RESOURCES,tile.resourceId),'tile-resource'));
    }
    if(center){card.classList.add('city-center');const image=el('img');image.src=CITY_ART.url;image.alt='';card.prepend(image);card.append(el('span','自動収穫','tile-work-state'));continue;}
    const check=el('input');check.type='checkbox';check.value=String(id);check.checked=(city.workedTileIds||[]).includes(id);check.disabled=unknown||usedByOtherCity.has(id);
    check.setAttribute('aria-label',`配置 ${x},${y} ${unknown?'未探索':nameOf(TERRAIN,tile.terrainId)}`);
    const lock=el('input');lock.type='checkbox';lock.value=String(id);lock.checked=(city.lockedTileIds||[]).includes(id);lock.disabled=!check.checked||check.disabled;lock.setAttribute('aria-label',`固定 ${x},${y}`);
    const workLabel=el('label');const state=el('span','配置');workLabel.append(check,state);
    const lockLabel=el('label');lockLabel.append(lock,document.createTextNode('固定'));
    const actions=el('div',undefined,'tile-work-controls');actions.append(workLabel,lockLabel);card.append(actions);
    const refresh=()=>{card.classList.toggle('is-worked',check.checked);card.classList.toggle('is-locked',lock.checked);card.classList.toggle('unavailable',check.disabled);state.textContent=check.checked?'配置中':'配置可能';};
    card.addEventListener('click',event=>{if(check.disabled||event.target.closest('label,input'))return;check.checked=!check.checked;check.dispatchEvent(new Event('change'));});
    if(check.disabled)card.append(el('small',unknown?'探索後に利用可能':'他都市が利用中','tile-work-state'));
    check.addEventListener('change',()=>{lock.disabled=!check.checked||check.disabled;if(!check.checked)lock.checked=false;refresh();refreshCount();});
    lock.addEventListener('change',()=>{refresh();refreshCount();});refresh();checks.push(check);locks.push(lock);
  }
  const counter = el('p', '', 'allocation-count');
  const apply = button('市民配置を適用', null, 'pill');
  const readSpecialists = () => Object.fromEntries(Object.entries(specialistInputs).map(
    ([key, input]) => [key, Math.max(0, Number.parseInt(input.value, 10) || 0)],
  ));
  const refreshCount = () => {
    const worked = checks.filter((check) => check.checked).length;
    const specialists = Object.values(readSpecialists()).reduce((sum, value) => sum + value, 0);
    const total = worked + specialists;
    counter.textContent = '配置 ' + total + ' / 人口 ' + city.population
      + '（都市中心は別に自動収穫）';
    apply.disabled = total !== city.population;
  };
  for (const input of Object.values(specialistInputs)) input.addEventListener('input', refreshCount);
  apply.addEventListener('click', () => {
    const workedTileIds = checks.filter((check) => check.checked).map(
      (check) => Number(check.value),
    );
    const lockedTileIds = locks.filter((lock) => lock.checked).map(
      (lock) => Number(lock.value),
    );
    game.command({
      type: 'city.allocate',
      cityId: city.id,
      workedTileIds,
      lockedTileIds,
      specialists: readSpecialists(),
    });
  });
  refreshCount();
  const legend=el('div',undefined,'allocation-legend');
  for(const [style,label] of [['worked','● 配置中'],['available','○ 配置可能'],['locked','◆ 固定'],['unavailable','× 利用不可']])legend.append(el('span',label,style));
  content.append(section('市民配置'),el('p','北 ↑　東 →　中央がこの都市。周囲のタイルをクリックして市民を配置します。','allocation-guide'),legend,tileList,controls,counter,apply,el('p','食＝食料・生＝生産・交＝交易。固定すると自動配置でも維持します。','allocation-guide'));
}

function cityQueue(game, view, city, content) {
  const queue = el('div', undefined, 'production-queue');
  if (!city.productionQueue.length) queue.append(el('p', '生産は未設定です。'));
  city.productionQueue.forEach((item, index) => {
    const definition = definitionFor(item);
    const itemRow = el('div', undefined, 'brief-row');
    const current = item.progress || 0;
    const required = Math.max(1, Math.round((definition?.cost || 0) * view.config.speed));
    const detail = el('span');
    detail.append(
      el('b', String(index + 1) + '. ' + nameOf(
        item.kind === 'unit' ? UNITS : item.kind === 'building' ? BUILDINGS : PROJECTS,
        item.definitionId,
      )),
      el('small', '進捗 ' + current + ' / ' + required
        + (index === 0 ? ' · +' + number(city.forecast?.production?.perRound, '0') + '/ターン' : '')
        + (item.repeat ? ' · 反復' : '')),
    );
    const controls = el('span');
    const up = button('↑', () => game.command({
      type: 'city.queue', cityId: city.id, action: 'move', itemId: item.id, toIndex: index - 1,
    }), 'pill');
    up.disabled = index === 0;
    const down = button('↓', () => game.command({
      type: 'city.queue', cityId: city.id, action: 'move', itemId: item.id, toIndex: index + 1,
    }), 'pill');
    down.disabled = index === city.productionQueue.length - 1;
    controls.append(
      up,
      down,
      button('削除', () => game.command({
        type: 'city.queue', cityId: city.id, action: 'remove', itemId: item.id,
      }), 'pill'),
      button(item.repeat ? '反復解除' : '反復', () => game.command({
        type: 'city.queue',
        cityId: city.id,
        action: 'setRepeat',
        itemId: item.id,
        repeat: !item.repeat,
      }), 'pill'),
    );
    itemRow.append(detail, controls);
    queue.append(itemRow);
  });

  const add = el('select');
  const option = (kind, id, definition) => {
    const node = el('option', (kind === 'unit' ? '部隊: ' : kind === 'building' ? '施設: ' : '事業: ')
      + definition.label + ' · ' + Math.max(1, Math.round(definition.cost * view.config.speed)));
    node.value = kind + ':' + id;
    node.disabled = !unlocked(definition, view.self.knownTechIds)
      || (kind === 'building' && city.buildingIds.includes(id));
    add.append(node);
  };
  Object.entries(UNITS).forEach(([id, definition]) => option('unit', id, definition));
  Object.entries(BUILDINGS).forEach(([id, definition]) => option('building', id, definition));
  Object.entries(PROJECTS).forEach(([id, definition]) => option('project', id, definition));
  const addButton = button('生産を追加', () => {
    const [kind, definitionId] = add.value.split(':');
    game.command({
      type: 'city.queue',
      cityId: city.id,
      action: 'append',
      item: { kind, definitionId, repeat: false },
    });
  }, 'pill');
  const availableOption = [...add.options].find((item) => !item.disabled);
  if (availableOption) add.value = availableOption.value;
  const refreshAdd = () => {
    addButton.disabled = city.productionQueue.length >= 5
      || !add.value || add.selectedOptions[0]?.disabled;
  };
  add.addEventListener('change', refreshAdd);
  refreshAdd();
  content.append(section('生産キュー'), queue, add, addButton);
}

function cityDialog(game, view, content) {
  const city = view.cities?.find((candidate) => candidate.id === game.uiState.selected.cityId)
    || view.cities?.find((candidate) => candidate.ownerId === view.self.id);
  if (!city || city.ownerId !== view.self.id) {
    content.append(el('p', '自文明の都市を選択してください。'));
    return;
  }
  const rename=el('form',undefined,'city-rename');const nameLabel=el('label','都市名');const nameInput=el('input');
  nameInput.value=city.name;nameInput.maxLength=40;nameInput.required=true;nameInput.setAttribute('aria-label','都市名');nameLabel.append(nameInput);
  const renameButton=button('名前を変更',null,'command');renameButton.type='submit';const renameError=el('span','','form-error');renameError.setAttribute('role','status');
  rename.append(nameLabel,renameButton,renameError);content.append(rename);
  rename.addEventListener('submit',event=>{event.preventDefault();const name=nameInput.value.trim();if(!name||Array.from(name).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127)){renameError.textContent='都市名を1〜40文字で入力してください';return;}game.command({type:'city.rename',cityId:city.id,name});});
  const layout=el('div',undefined,'city-management');const allocation=el('section',undefined,'city-allocation');const overview=el('aside',undefined,'city-overview');
  const portrait=el('div',undefined,'city-portrait');const cityImage=el('img');cityImage.src=CITY_ART.url;cityImage.alt='城壁に囲まれた都市';portrait.append(cityImage,el('span',`${city.x}, ${city.y} · 人口 ${city.population}`));overview.append(portrait);
  const forecast = city.forecast;
  overview.append(
    section(city.name + ' · 人口 ' + city.population),
    row('食料', number(forecast?.food?.current) + ' / ' + number(forecast?.food?.threshold)
      + ' · 差引 ' + number(forecast?.food?.net) + ' · '
      + turns(forecast?.food?.turns, forecast?.food?.reason)),
    row('生産', number(forecast?.production?.current) + ' / '
      + number(forecast?.production?.required) + ' · +'
      + number(forecast?.production?.perRound, '0') + ' · '
      + turns(forecast?.production?.turns, forecast?.production?.reason)),
    row('交易配分', '税 ' + number(forecast?.trade?.tax) + ' · 科学 '
      + number(forecast?.trade?.science) + ' · 娯楽 ' + number(forecast?.trade?.luxury)),
    row('幸福', '幸福 ' + number(forecast?.happiness?.happy) + ' · 中立 '
      + number(forecast?.happiness?.content) + ' · 不満 ' + number(forecast?.happiness?.unhappy)),
    row('幸福内訳', '娯楽 ' + number(forecast?.happiness?.entertainment)
      + ' · 政治 ' + number(forecast?.happiness?.government)
      + ' · 戦争負担 ' + number(forecast?.happiness?.warWeariness)),
    row('施設・都市維持費', number(forecast?.upkeep)),
    row('文化', number(forecast?.culture?.selfTotal) + ' / '
      + number(forecast?.culture?.threshold) + ' · +'
      + number(forecast?.culture?.perRound, '0') + '/ターン'),
  );
  if (city.disorder) overview.append(el('p', '暴動中: 生産・税・研究は停止し、食料だけ処理されます。', 'form-error'));

  const focus = el('select');
  for (const [id, label] of [
    ['balanced', '均衡'], ['growth', '成長'], ['production', '生産'], ['research', '研究'],
  ]) {
    const option = el('option', label);
    option.value = id;
    option.selected = city.focus === id;
    focus.append(option);
  }
  focus.addEventListener('change', () => game.command({
    type: 'city.setFocus', cityId: city.id, focus: focus.value,
  }));
  const focusRow = row('自動配置方針', '');
  focusRow.lastChild.replaceWith(focus);
  overview.append(focusRow);
  cityAllocation(game, view, city, allocation);
  layout.append(allocation,overview);content.append(layout);
  cityQueue(game, view, city, content);
  content.append(
    section('完成済み施設'),
    el('p', city.buildingIds.length
      ? city.buildingIds.map((id) => nameOf(BUILDINGS, id)).join('、')
      : '施設はまだありません。'),
  );
}

function researchDialog(game, view, content) {
  const activeId = view.self.research?.activeTechId;
  const activeProgress = view.self.research?.progressByTech?.find(
    (item) => item.techId === activeId,
  )?.points || 0;
  content.append(
    section('研究 · ' + nameOf(TECHS, activeId)),
    row('現在の進捗', activeId
      ? activeProgress + ' / ' + Math.max(1, Math.round(TECHS[activeId].cost * view.config.speed)) + ' · +'
        + number(view.self.forecast?.researchPerRound, '0') + '/ターン'
      : '研究対象を選択してください'),
  );
  const grid = el('div', undefined, 'tech-grid');
  for (const [id, tech] of Object.entries(TECHS)) {
    const known = view.self.knownTechIds?.includes(id);
    const locked = tech.requires.some((required) => !view.self.knownTechIds?.includes(required));
    const progress = view.self.research?.progressByTech?.find(
      (item) => item.techId === id,
    )?.points || 0;
    const required = Math.max(1, Math.round(tech.cost * view.config.speed));
    const card = button('', () => {
      if (!known && !locked) game.command({ type: 'civ.selectResearch', techId: id });
    }, 'tech-card' + (locked ? ' locked' : '') + (id === activeId ? ' active' : ''));
    card.disabled = known || locked;
    card.append(
      el('b', tech.label),
      el('small', tech.era + ' · ' + progress + ' / ' + required + ' RP'),
      el('small', locked
        ? '前提: ' + tech.requires.map((required) => nameOf(TECHS, required)).join('、')
        : known ? '研究済み' : tech.description),
    );
    grid.append(card);
  }
  content.append(grid);
}

function nationDialog(game, view, content) {
  const rates = view.self.rates || { tax: 40, science: 40, luxury: 20 };
  const forecast = view.self.forecast || {};
  content.append(
    section('国家運営'),
    row('交易総量', number(forecast.grossTrade)),
    row('次ターン国庫', number(view.self.treasury) + ' → '
      + number((view.self.treasury || 0) + (forecast.netGold || 0))),
    row('維持費', number(forecast.upkeep) + '（都市 '
      + number(forecast.upkeepBreakdown?.cities, '0') + '・施設 '
      + number(forecast.upkeepBreakdown?.buildings, '0') + '・部隊 '
      + number(forecast.upkeepBreakdown?.units, '0') + '）'),
  );
  for (const [key, label] of [['tax', '税収'], ['science', '研究'], ['luxury', '娯楽']]) {
    const range = el('input');
    range.type = 'range';
    range.min = '0';
    range.max = '100';
    range.step = '10';
    range.value = String(rates[key]);
    const control = el('label', label + ' ' + rates[key] + '%');
    range.addEventListener('input', () => {
      control.firstChild.textContent = label + ' ' + range.value + '%';
    });
    range.addEventListener('change', () => game.setRates(key, Number(range.value)));
    content.append(control, range);
  }
  content.append(section('政治体制'));
  if (view.self.government.pendingId) content.append(el(
    'p',
    nameOf(GOVERNMENTS, view.self.government.pendingId) + 'へ移行中 · 残り'
      + view.self.government.transitionRoundsLeft + 'ターン',
  ));
  for (const [id, government] of Object.entries(GOVERNMENTS)) {
    const control = button(
      government.label + ' · 交易×' + government.tradeMultiplier + ' · 幸福'
        + government.happiness + ' · 無料部隊' + government.freeUnits,
      () => game.command({ type: 'civ.changeGovernment', governmentId: id }),
      'pill',
    );
    control.disabled = id === view.self.government.currentId
      || Boolean(government.requires && !view.self.knownTechIds?.includes(government.requires))
      || Boolean(view.self.government.pendingId);
    content.append(control);
  }
  chronicle(view, content);
}

function eventDescription(view, item) {
  const city = view.cities.find((candidate) => candidate.id === item.entityId);
  const unit = view.units.find((candidate) => candidate.id === item.entityId);
  const entity = city?.name || (unit ? nameOf(UNITS, unit.typeId) : '');
  const labels = {
    'game.started': '年代記を開始',
    'game.loaded': '年代記を読込',
    'game.finished': '勝利条件が確定',
    'turn.ended': '手番終了',
    'city.founded': '都市建設',
    'city.captured': '都市占領',
    'city.grew': '都市成長',
    'city.starved': '飢餓で人口減少',
    'production.completed': '生産完了',
    'tech.completed': '技術研究完了',
    'government.changed': '政治体制変更',
    'government.transition': '政治体制の移行開始',
    'civ.insolvent': '国庫不足',
    'civ.eliminated': '文明滅亡',
    'combat.resolved': '戦闘',
    'unit.captured': '民間部隊を捕獲',
    'unit.sank': '艦船沈没',
    'unit.boarded': '乗船',
    'unit.unloaded': '下船',
    'improvement.completed': '土地改良完成',
    'war.declared': '宣戦布告',
    'treaty.proposed': '条約提案',
    'treaty.accepted': '条約承認',
    'treaty.rejected': '条約拒否',
    'treaty.expired': '条約失効',
    'trade.opened': '交易路開設',
    'trade.closed': '交易路閉鎖',
    'space.launched': '宇宙船発射',
  };
  let detail = entity;
  if (item.type === 'combat.resolved') {
    detail = '攻撃側損害 ' + number(item.data?.attackerDamage, '0')
      + ' / 守備側損害 ' + number(item.data?.defenderDamage, '0')
      + ' / ' + (item.data?.attackerWon ? '攻撃側勝利' : '守備側勝利');
  } else if (item.type === 'production.completed') {
    detail = entity + ' · ' + nameOf(
      { ...UNITS, ...BUILDINGS, ...PROJECTS },
      item.data?.definitionId,
    );
  } else if (item.type === 'tech.completed') {
    detail = nameOf(TECHS, item.entityId);
  } else if (item.type === 'city.grew' || item.type === 'city.starved') {
    detail = entity + ' · 人口 ' + number(item.data?.population);
  } else if (item.type === 'civ.insolvent') {
    detail = '収入 ' + number(item.data?.gold) + ' / 維持費 ' + number(item.data?.upkeep);
  } else if (item.type === 'space.launched') {
    detail = '第' + number(item.data?.arrivalRound) + 'ラウンド到達予定';
  } else if (item.type === 'city.founded') {
    detail = item.data?.name || entity;
  }
  return (labels[item.type] || item.type) + (detail ? ' · ' + detail : '');
}

function chronicle(view, content) {
  content.append(section('年代記'));
  const log = el('div', undefined, 'chronicle-list');
  const events = [...(view.chronicle || [])].sort(
    (a, b) => b.round - a.round || String(b.id).localeCompare(String(a.id)),
  ).slice(0, 60);
  if (!events.length) log.append(el('p', '記録はまだありません。'));
  for (const item of events) log.append(row(
    '第' + item.round + 'ラウンド',
    eventDescription(view, item),
  ));
  content.append(log);
}

function techChecklist(ids, name, selected = []) {
  const fieldset = el('fieldset', undefined, 'tech-offer');
  fieldset.append(el('legend', name));
  const inputs = [];
  for (const id of ids) {
    const input = el('input');
    input.type = 'checkbox';
    input.value = id;
    input.checked = selected.includes(id);
    const label = el('label');
    label.append(input, document.createTextNode(' ' + nameOf(TECHS, id)));
    fieldset.append(label);
    inputs.push(input);
  }
  if (!ids.length) fieldset.append(el('small', '選択できる技術はありません'));
  return { fieldset, values: () => inputs.filter((input) => input.checked).map((input) => input.value) };
}

function treatyTerms(treaty, selfId) {
  const selfIsA = treaty.civAId === selfId;
  const offeredGold = selfIsA ? treaty.terms.goldFromA : treaty.terms.goldFromB;
  const requestedGold = selfIsA ? treaty.terms.goldFromB : treaty.terms.goldFromA;
  const offeredTechs = selfIsA ? treaty.terms.techIdsFromA : treaty.terms.techIdsFromB;
  const requestedTechs = selfIsA ? treaty.terms.techIdsFromB : treaty.terms.techIdsFromA;
  const parts = [];
  if (offeredGold) parts.push('自国金 ' + offeredGold);
  if (requestedGold) parts.push('相手金 ' + requestedGold);
  if (offeredTechs?.length) parts.push('自国技術 ' + offeredTechs.map((id) => nameOf(TECHS, id)).join('・'));
  if (requestedTechs?.length) parts.push('相手技術 ' + requestedTechs.map((id) => nameOf(TECHS, id)).join('・'));
  return parts.join(' / ') || '追加条件なし';
}

function diplomacyDialog(game, view, content) {
  content.append(section('外交評議会'));
  const others = (view.civilizations || []).filter((civ) => civ.id !== view.self.id);
  if (!others.length) content.append(el('p', '接触済みの文明はありません。'));
  for (const civ of others) {
    const relation = relationWithView(view, civ.id);
    const box = el('section', undefined, 'diplomacy-card');
    box.append(
      section(civ.name),
      row('状態', relation?.atWar ? '戦争中' : '平時'),
      row('関係値', number(relation?.value)),
    );
    const treatyActions = el('div', undefined, 'action-grid');
    for (const [kind, label] of [
      ['peace', '和平提案'], ['openBorders', '通行権提案'],
      ['tradeAgreement', '交易協定'], ['alliance', '同盟提案'],
    ]) treatyActions.append(button(label, () => game.command({
      type: 'diplomacy.propose',
      targetCivId: civ.id,
      kind,
      terms: { goldFromA: 0, goldFromB: 0, techIdsFromA: [], techIdsFromB: [] },
    }), 'pill'));
    treatyActions.append(button('宣戦布告', () => game.declareWar(civ.id), 'pill'));
    box.append(treatyActions);

    const giveGold = el('input');
    giveGold.type = 'number';
    giveGold.min = '0';
    giveGold.max = String(Math.max(0, view.self.treasury || 0));
    giveGold.value = '0';
    const receiveGold = el('input');
    receiveGold.type = 'number';
    receiveGold.min = '0';
    receiveGold.value = '0';
    const ownTechs = techChecklist(
      [...view.self.knownTechIds].sort((a, b) => nameOf(TECHS, a).localeCompare(nameOf(TECHS, b))),
      '自国から渡す技術',
    );
    const requestedTechs = techChecklist(
      Object.keys(TECHS).filter((id) => !view.self.knownTechIds.includes(id))
        .sort((a, b) => nameOf(TECHS, a).localeCompare(nameOf(TECHS, b))),
      '相手へ求める技術（保有状況は非公開）',
    );
    const goldControls = el('div', undefined, 'exchange-gold');
    const giveLabel = el('label', '自国から渡す金 ');
    giveLabel.append(giveGold);
    const receiveLabel = el('label', '相手へ求める金 ');
    receiveLabel.append(receiveGold);
    goldControls.append(giveLabel, receiveLabel);
    box.append(
      section('金・技術交換'),
      goldControls,
      ownTechs.fieldset,
      requestedTechs.fieldset,
      button('交換を提案', () => game.command({
        type: 'diplomacy.propose',
        targetCivId: civ.id,
        kind: 'exchange',
        terms: {
          goldFromA: Math.max(0, Number.parseInt(giveGold.value, 10) || 0),
          goldFromB: Math.max(0, Number.parseInt(receiveGold.value, 10) || 0),
          techIdsFromA: ownTechs.values(),
          techIdsFromB: requestedTechs.values(),
        },
      }), 'pill'),
    );
    content.append(box);
  }

  content.append(section('条約提案'));
  const proposals = (view.treaties || []).filter((treaty) => treaty.status === 'proposed')
    .sort((a, b) => a.id.localeCompare(b.id));
  if (!proposals.length) content.append(el('p', '保留中の提案はありません。'));
  for (const treaty of proposals) {
    const incoming = treaty.proposedByCivId !== view.self.id;
    const civ = view.civilizations.find((candidate) => candidate.id === otherParty(treaty, view.self.id));
    const item = el('div', undefined, 'brief-row');
    const description = el('span');
    description.append(
      el('b', (civ?.name || otherParty(treaty, view.self.id)) + ' · ' + treatyLabel(treaty.kind)),
      el('small', treatyTerms(treaty, view.self.id)),
    );
    item.append(description);
    if (incoming) {
      const controls = el('span');
      controls.append(
        button('承認', () => game.command({
          type: 'diplomacy.respond', treatyId: treaty.id, accept: true,
        }), 'pill'),
        button('拒否', () => game.command({
          type: 'diplomacy.respond', treatyId: treaty.id, accept: false,
        }), 'pill'),
      );
      item.append(controls);
    } else item.append(el('b', '回答待ち'));
    content.append(item);
  }

  const myCities = view.cities?.filter((city) => city.ownerId === view.self.id) || [];
  const knownDestinations = view.cities?.filter((city) => city.ownerId !== view.self.id) || [];
  content.append(section('都市交易路'));
  if (!myCities.length || myCities.length + knownDestinations.length < 2) {
    content.append(el('p', '交易元と既知の交易先が必要です。'));
  } else {
    const origin = el('select');
    const destination = el('select');
    const open = button('交易路を開く', () => game.command({
      type: 'trade.open',
      originCityId: origin.value,
      destinationCityId: destination.value,
    }), 'pill');
    for (const city of myCities) {
      const option = el('option', city.name + '（自国）');
      option.value = city.id;
      origin.append(option);
    }
    const refreshDestinations = () => {
      const previous = destination.value;
      destination.replaceChildren();
      for (const city of [...myCities, ...knownDestinations].filter(
        (candidate) => candidate.id !== origin.value,
      )) {
        const option = el('option', city.name
          + (city.ownerId === view.self.id ? '（自国）' : '（既知相手）'));
        option.value = city.id;
        destination.append(option);
      }
      if ([...destination.options].some((option) => option.value === previous)) {
        destination.value = previous;
      }
      open.disabled = !destination.value;
    };
    origin.addEventListener('change', refreshDestinations);
    refreshDestinations();
    content.append(origin, destination, open);
  }
  for (const route of (view.tradeRoutes || []).filter(
    (item) => item.ownerCivId === view.self.id,
  )) {
    const from = view.cities.find((city) => city.id === route.originCityId);
    const to = view.cities.find((city) => city.id === route.destinationCityId);
    const item = el('div', undefined, 'brief-row');
    item.append(
      el('span', (from?.name || route.originCityId) + ' → ' + (to?.name || route.destinationCityId)),
      el('b', route.status === 'active'
        ? '稼働中'
        : '停止中（' + reasonLabel(route.suspendedReason) + '）'),
      button('閉じる', () => game.command({
        type: 'trade.close', tradeRouteId: route.id,
      }), 'pill'),
    );
    content.append(item);
  }
}

function relationWithView(view, civId) {
  return view.relations?.find((relation) => (
    relation.civAId === view.self.id && relation.civBId === civId
  ) || (
    relation.civBId === view.self.id && relation.civAId === civId
  ));
}

function victoryDialog(view, content, game) {
  const victory = view.self.victory || {};
  const space = victory.space || view.spacePrograms?.find(
    (program) => program.civId === view.self.id,
  ) || { components: { structure: 0, propulsion: 0, support: 0 } };
  const components = space.components || { structure: 0, propulsion: 0, support: 0 };
  const ready = view.self.knownTechIds.includes('spaceflight')
    && components.structure >= 3 && components.propulsion >= 2 && components.support >= 1
    && space.launchedRound === null;
  content.append(
    section('勝利への道'),
    row('征服勝利', '残る他文明 ' + number(victory.conquest?.remainingCivilizations, '0')),
    el('p', '都市も開拓者も失った全文明を滅亡させると達成します。'),
    section('宇宙到達勝利'),
    row('構造体', number(components.structure, '0') + ' / 3'),
    row('推進装置', number(components.propulsion, '0') + ' / 2'),
    row('生命維持装置', number(components.support, '0') + ' / 1'),
  );
  if (space.launchedRound !== null) {
    content.append(row(
      '宇宙船',
      '第' + space.launchedRound + 'ラウンド発射 · 第' + space.arrivalRound + 'ラウンド到達予定',
    ));
  } else {
    const launchButton = button('宇宙船を発射', () => game.command({ type: 'space.launch' }), 'pill');
    launchButton.disabled = !ready;
    content.append(launchButton, el(
      'p',
      ready
        ? '全条件を満たしています。'
        : '宇宙飛行の研究と、都市での構造体3・推進装置2・生命維持装置1の完成が必要です。',
    ));
  }

  content.append(
    section('文化勝利'),
    row('条件達成都市', number(victory.culture?.qualifiedCities, '0')
      + ' / ' + number(victory.culture?.requiredCities, '3')),
  );
  for (const city of view.cities.filter((candidate) => candidate.ownerId === view.self.id)) {
    content.append(row(
      city.name,
      number(city.forecast?.culture?.selfTotal, '0') + ' / '
        + number(victory.culture?.threshold, city.forecast?.culture?.threshold || 3000)
        + ' · 文化大事業'
        + (city.greatWorkCivIds?.includes(view.self.id) ? '完成' : '未完成'),
    ));
  }
  content.append(
    el('p', '自文明がその都市で生み出した文化だけを数え、条件を満たす3都市それぞれに文化大事業が必要です。'),
    section('スコア勝利'),
  );
  const score = victory.score || view.self.score || {};
  for (const [key, label] of [
    ['population', '人口'], ['technology', '技術'], ['development', '都市発展'],
    ['culture', '文化'], ['space', '宇宙事業'],
  ]) content.append(row(label, number(score[key], '0')));
  content.append(
    row('総合', number(score.total, '0')),
    el('p', '第' + view.config.maxRounds + 'ラウンド終了時、総合点首位の文明が勝利します。'),
  );
  if (view.turn.status === 'finished') content.append(el(
    'p',
    'ゲーム終了 · ' + ({
      conquest: '征服勝利', space: '宇宙到達勝利', culture: '文化勝利', score: 'スコア勝利',
    }[view.turn.victoryType] || view.turn.victoryType) + ' · 勝者 '
      + view.turn.winnerCivIds.join('・'),
    'form-error',
  ));
}

function settingsDialog(game, view, content) {
  const config = view.config;
  const effects = el('label', undefined, 'effects-setting');
  const checkbox = el('input');checkbox.type = 'checkbox';checkbox.checked = game.animations.enabled;
  checkbox.addEventListener('change', () => game.setEffectsEnabled(checkbox.checked));
  effects.append(checkbox, el('span', 'ユニットの移動・戦闘・選択演出'));
  content.append(section('表示'), effects, el('p', '演出をオフにしてもゲームの進行や結果は変わりません。'));
  content.append(
    section('現在の年代記'),
    row('マップ', config.width + ' × ' + config.height),
    row('地形', config.mapType === 'archipelago' ? '群島' : '大陸'),
    row('文明数', String(config.civilizationCount)),
    row('速度', String(config.speed) + '×'),
    row('上限', String(config.maxRounds) + 'ラウンド'),
    row('シード', String(config.seed)),
    row('ルール版', String(RULES_VERSION)),
    el('p', '開始済みの年代記では設定を変更できません。新規開始画面で設定を選び直してください。'),
    button('新しい年代記の設定', () => game.showSetup(), 'pill'),
  );
}

function saveDialog(game, content) {
  content.append(section('保存データ'));
  const list = el('div');
  content.append(list);
  game.store.list().then((slots) => {
    if (!slots.length) {
      list.append(el('p', '保存データはありません。'));
      return;
    }
    for (const slot of slots) {
      const item = el('div', undefined, 'brief-row');
      item.append(el('span', slot.label + ' · 第' + (slot.round ?? '—') + 'ラウンド'));
      const controls = el('span');
      controls.append(
        button('読込', async () => {
          try {
            const snapshot = await game.store.read(slot.slotId);
            if (!snapshot) throw new Error('保存データが見つかりません');
            game.init({ snapshot });
            game.update('保存データを読み込みました');
          } catch (error) {
            game.updateNotice('読込に失敗しました: ' + error.message);
          }
        }, 'pill'),
        button('削除', async () => {
          if (!window.confirm('この保存データを削除しますか？')) return;
          try {
            await game.store.remove(slot.slotId);
            game.updateNotice('保存データを削除しました');
            game.openDialog('saves');
          } catch (error) {
            game.updateNotice('削除に失敗しました: ' + error.message);
          }
        }, 'pill'),
      );
      item.append(controls);
      list.append(item);
    }
  }).catch((error) => game.updateNotice('保存一覧を取得できません: ' + error.message));
}

function helpDialog(content) {
  content.append(section('キーボードショートカット'));
  const shortcuts=el('div',undefined,'shortcut-list');for(const [key,label] of SHORTCUT_HELP)shortcuts.append(row(key,label));content.append(shortcuts,el('p','入力欄での文字入力中はショートカットを実行しません。テンキーは画面上の方向に対応します。'));

  content.append(
    section('地図と部隊'),
    el('p', '左クリックで都市・部隊を選択します。Mで移動指定に切り替え、目的地をクリックし、経路を見てEnterで確定します。右クリックでも経路確認に進めます。自動継続は選んだ場合だけ実行します。移動後は部隊の現在地を表示し、Lで部隊へ戻れます。中ボタンドラッグで地図を動かし、ホイールで拡大縮小します。Enterは次の対応、Spaceは選択部隊の待機、Escは取消です。経路移動は未知の敵を見つけると停止します。'),
    section('人口と食料'),
    el('p', '都市中心は自動収穫し、人口と同じ人数を周囲20タイルか科学者・徴税人・芸人へ配置します。人口1につき食料2を消費し、余剰を備蓄して成長します。不足時は備蓄を使い、尽きると人口が減ります。'),
    section('幸福と維持費'),
    el('p', '人口、娯楽、施設、政治体制、戦争負担から幸福を計算します。不満が限界を超えると暴動となり、生産・税・研究が停止します。都市・施設・部隊の維持費を国庫から払い、不足時は停止理由が表示されます。'),
    section('生産と土地改良'),
    el('p', '都市は最大5件の生産キューを持ち、順番変更・削除・部隊の反復生産ができます。完成時の余剰は次へ繰り越します。労働者は複数ターンかけて道路・鉄道と灌漑・鉱山を建設し、交通と収益の改良は共存できます。'),
    section('研究と政治'),
    el('p', '技術には前提があり、研究対象を変えても技術ごとの進捗を保持します。交易は税・科学・娯楽へ10%刻み、合計100%で配分します。政治体制の変更には標準2ターンかかります。'),
    section('外交と交易'),
    el('p', '接触した文明へ和平・通行権・交易協定・同盟・金や技術の交換を提案できます。戦争状態と関係値は別です。都市交易路は道路または海路の接続が必要で、各都市3本まで。戦争や経路切断中は停止します。'),
    section('陸海戦'),
    el('p', '戦闘はHP、攻防、地形、防御姿勢、都市施設、経験で解決します。都市に戦闘可能な守備隊が残る間は占領できません。陸上部隊は沿岸で輸送船へ積載し、船に隣接する可視の陸地へ下船します。'),
    section('4つの勝利'),
    el('p', '征服は他文明の全滅、宇宙は部品完成後の発射と到達、文化は自文明文化が閾値以上で文化大事業を完成した3都市、スコアは最終ラウンドの人口・技術・都市発展・文化・宇宙事業の総合首位で達成します。同ラウンド複数達成はスコアで決め、同点は共同勝利です。'),
  );
}

export function renderDialog(game, view, kind, content) {
  content.replaceChildren();
  content.closest('.dialog-card')?.classList.toggle('city-dialog',kind==='city');
  if (kind === 'city') cityDialog(game, view, content);
  else if (kind === 'research') researchDialog(game, view, content);
  else if (kind === 'nation') nationDialog(game, view, content);
  else if (kind === 'diplomacy') diplomacyDialog(game, view, content);
  else if (kind === 'victory') victoryDialog(view, content, game);
  else if (kind === 'settings') settingsDialog(game, view, content);
  else if (kind === 'saves') saveDialog(game, content);
  else helpDialog(content);
}
