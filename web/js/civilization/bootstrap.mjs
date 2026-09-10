import { RULES_VERSION } from './data.mjs';
import { CivilizationGame, bindCivilizationEvents } from './game.mjs';

const root = document.querySelector('#chronicle-app');
if (root) {
  const game = new CivilizationGame(root);
  bindCivilizationEvents(game);
  const params = new URLSearchParams(location.search);
  if (params.has('seed')) {
    root.querySelectorAll('.preset').forEach(button=>button.classList.remove('active'));
    const size = `${params.get('width') || 64}x${params.get('height') || 40}`;
    if ([...root.querySelector('#map-size').options].some((option) => option.value === size)) root.querySelector('#map-size').value = size;
    if (params.has('civ')) root.querySelector('#civ-count').value = String(Math.max(2, Math.min(8, Number(params.get('civ')) || 6)));
    if (['0.6', '1', '1.5'].includes(params.get('speed'))) root.querySelector('#game-speed').value = params.get('speed');
    if (['continents', 'archipelago'].includes(params.get('map'))) root.querySelector('#map-type').value = params.get('map');
    if (params.has('rounds')) root.querySelector('#round-limit').value = String(Math.max(120, Math.min(1000, Number(params.get('rounds')) || 400)));
    const seed = Number(params.get('seed')); if (Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff) root.querySelector('#seed-input').value = String(seed);
  }
  // Keep the overlay visible until the player explicitly starts a chronicle.
  if(params.has('rulesVersion')&&Number(params.get('rulesVersion'))!==RULES_VERSION){game.incompatibleRules=true;root.querySelector('#start-error').textContent='共有URLのルール版が一致しません';root.querySelector('#start-button').disabled=true;}
  void game.prepareAssets();
}
