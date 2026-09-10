import { UNITS, BUILDINGS, PROJECTS, TECHS } from './data.mjs';
import { UNIT_ART } from './unit-art.mjs';

const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const definition = item => ({ unit: UNITS, building: BUILDINGS, project: PROJECTS }[item.kind] || {})[item.definitionId];
function action(game, label, callback, unavailable = false) {
  const button = element('button', label, 'queue-action');
  button.type = 'button'; button.dataset.gameCommand = 'true'; button.dataset.unavailable = String(unavailable);
  button.disabled = unavailable || game.busy || game.animations.playing;
  button.addEventListener('click', callback);
  return button;
}
function progress(current, required, label) {
  const meter = element('progress'); meter.max = Math.max(1, required); meter.value = current;
  meter.setAttribute('aria-label', label); return meter;
}

export function renderMainBar(game, view) {
  const production = game.root.querySelector('#production-bar');
  const research = game.root.querySelector('#research-bar');
  production.replaceChildren(); research.replaceChildren();
  const cities = view.cities.filter(city => city.ownerId === view.self.id);
  const city = cities.find(city => city.id === game.uiState.productionCityId)
    || cities.find(city => city.id === view.self.capitalCityId) || cities[0];
  const heading = element('div', undefined, 'queue-heading');
  heading.append(element('strong', '⚒ 生産キュー'));
  if (!city) {
    production.append(heading, element('span', '都市を建設すると生産できます', 'queue-empty'));
  } else {
    const chooseCity = element('select'); chooseCity.setAttribute('aria-label', '生産を表示する都市');
    for (const candidate of cities) {
      const option = element('option', candidate.name); option.value = candidate.id; option.selected = candidate.id === city.id; chooseCity.append(option);
    }
    chooseCity.addEventListener('change', () => { game.uiState.productionCityId = chooseCity.value; game.update(); });
    const manage = element('button', '都市管理', 'queue-link');
    manage.addEventListener('click', () => { game.selectCity(city.id); game.openDialog('city'); });
    heading.append(chooseCity, element('span',`${city.productionQueue.length} / 5件`,'queue-count'), manage);
    const items = element('div', undefined, 'queue-items');
    if (!city.productionQueue.length) items.append(element('span', '未設定', 'queue-empty'));
    city.productionQueue.forEach((item, index) => {
      const chip = element('span', undefined, 'queue-chip' + (index === 0 ? ' current' : ''));
      const label = `${index === 0 ? '現在' : index + 1} ${definition(item)?.label || item.definitionId}${item.repeat ? ' ↻' : ''}`;
      if(item.kind==='unit'){const image=element('img');image.src=UNIT_ART[item.definitionId].url;image.alt='';chip.append(image);}
      chip.append(element('span', label));
      const remove = action(game, '×', () => game.command({ type: 'city.queue', cityId: city.id, action: 'remove', itemId: item.id }));
      remove.setAttribute('aria-label', `${index + 1}番目の${definition(item)?.label}を生産キューから削除`); chip.append(remove); items.append(chip);
    });
    const forecast = city.forecast?.production;
    const detail = element('div', undefined, 'queue-progress');
    if (forecast?.required) {
      detail.append(progress(forecast.current, forecast.required, `${city.name}の生産進捗`),
        element('span', `${forecast.current} / ${forecast.required} · ${forecast.turns == null ? ({POPULATION_REQUIRED:'人口が不足',DISORDER:'暴動中',INSOLVENT:'国庫不足',GOVERNMENT_TRANSITION:'体制移行中'}[forecast.reason]||'生産停止') : `あと${forecast.turns}ターン`}`));
    } else detail.append(element('span', `生産 +${forecast?.perRound || 0}/T`));
    const choices = element('select'); choices.setAttribute('aria-label', '生産キューに追加する対象');
    for (const [kind, catalog] of Object.entries({ unit: UNITS, building: BUILDINGS, project: PROJECTS })) {
      for (const [id, target] of Object.entries(catalog)) {
        if (target.requires && !view.self.knownTechIds.includes(target.requires)) continue;
        if (kind === 'building' && city.buildingIds.includes(id)) continue;
        const option = element('option', `${target.label} · ${Math.max(1, Math.round(target.cost * view.config.speed))}`);
        option.value = `${kind}:${id}`; choices.append(option);
      }
    }
    if ([...choices.options].some(option => option.value === game.uiState.productionChoice)) choices.value = game.uiState.productionChoice;
    choices.addEventListener('change', () => { game.uiState.productionChoice = choices.value; });
    const add = action(game, '追加', () => {
      const [kind, definitionId] = choices.value.split(':');
      game.command({ type: 'city.queue', cityId: city.id, action: 'append', item: { kind, definitionId, repeat: false } });
    }, !choices.options.length || city.productionQueue.length >= 5);
    add.setAttribute('aria-label', '生産キューへ追加');
    detail.append(choices, add); production.append(heading, items, detail);
  }

  const activeId = view.self.research.activeTechId;
  const active = TECHS[activeId];
  const points = view.self.research.progressByTech.find(item => item.techId === activeId)?.points || 0;
  const required = active ? Math.max(1, Math.round(active.cost * view.config.speed)) : 0;
  const rate = view.self.forecast?.researchPerRound || 0;
  const researchHeading = element('div', undefined, 'queue-heading');
  researchHeading.append(element('strong', '✦ 研究'), element('b', active?.label || '未選択'));
  const allocation=element('button',`科学配分 ${view.self.rates.science}％`,'science-allocation');
  allocation.title='交易の科学配分。クリックして国家運営で変更';allocation.addEventListener('click',()=>game.openDialog('nation'));researchHeading.append(allocation);
  const tree = element('button', '技術一覧', 'queue-link'); tree.addEventListener('click', () => game.openDialog('research')); researchHeading.append(tree);
  const researchProgress = element('div', undefined, 'queue-progress');
  researchProgress.append(progress(points, required, '現在の研究進捗'),
    element('span', active ? `${points} / ${required} RP${rate ? ` · あと${Math.ceil(Math.max(0, required - points - (view.self.research.overflow || 0)) / rate)}ターン` : ' · 停止中'}` : '研究対象を選択してください'),element('b',`+${rate} RP/ターン`,'science-income'));
  const researchChoices = element('select'); researchChoices.setAttribute('aria-label', '研究する技術');
  for (const [id, tech] of Object.entries(TECHS)) {
    if (view.self.knownTechIds.includes(id) || !tech.requires.every(id => view.self.knownTechIds.includes(id))) continue;
    const option = element('option', tech.label); option.value = id; researchChoices.append(option);
  }
  const chosenId = game.uiState.researchChoice || activeId;
  if ([...researchChoices.options].some(option => option.value === chosenId)) researchChoices.value = chosenId;
  researchChoices.addEventListener('change', () => { game.uiState.researchChoice = researchChoices.value; });
  const researchControl = element('div', undefined, 'queue-controls');
  researchControl.append(researchChoices, action(game, active ? '研究を変更' : '研究開始', () => game.command({ type: 'civ.selectResearch', techId: researchChoices.value }), !researchChoices.options.length));
  const sources=view.self.forecast?.researchSources||{};
  const breakdown=[['base','都市基礎'],['trade','交易'],['specialists','専門家'],['buildings','施設'],['technology','技術']].filter(([key])=>['base','trade'].includes(key)||sources[key]).map(([key,label])=>`${label} ${sources[key]||0}`).join(' ＋ ');
  const detail=element('span',breakdown,'science-breakdown');detail.title=`毎ターンの研究力の内訳：${breakdown}。都市基礎は1都市につき1RP。暴動・体制移行中は停止。`;
  researchControl.append(detail);
  research.append(researchHeading, researchProgress, researchControl);
}
