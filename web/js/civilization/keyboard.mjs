/** Screen-relative directions for an isometric map. */
export const UNIT_STEP_KEYS = Object.freeze({
  Numpad7: [-1, 0], Numpad8: [-1, -1], Numpad9: [0, -1],
  Numpad4: [-1, 1], Numpad6: [1, -1],
  Numpad1: [0, 1], Numpad2: [1, 1], Numpad3: [1, 0],
});

export const SHORTCUT_HELP = Object.freeze([
  ['M', '移動先の指定／取消'], ['テンキー 1〜9（5以外）', '画面方向に1マス移動'],
  ['Enter', '移動を確定／次の対応'], ['N', '次の対応待ち部隊・都市'], ['Shift + Enter', 'ターン終了'],
  ['Space / テンキー5', '選択部隊を待機'], ['F', '防御'], ['S', '休眠'], ['W', '起床・継続命令を解除'],
  ['B', '開拓者で都市建設'], ['C', '都市管理'], ['R', '研究'], ['D', '外交'],
  ['V', 'ミニマップ表示切替'], ['Home', '首都へ移動'], ['L', '選択部隊へ移動'], ['矢印キー', '地図をパン'],
  ['+ / −', '地図を拡大／縮小'], ['Ctrl + S', '手動保存'], ['Ctrl + O', '保存データを開く'],
  ['H / ?', '操作ガイド'], ['Esc', '移動指定・選択・ダイアログの取消'],
]);

export function handleGameKey(game, event) {
  if (event.isComposing || event.defaultPrevented) return;
  const editable = event.target?.closest?.('input:not([type="checkbox"]):not([type="radio"]),select,textarea,[contenteditable="true"]');
  if (editable) return;
  if (event.key === ' ' && event.target?.closest?.('input[type="checkbox"],input[type="radio"]')) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    if (game.dialogKind) game.closeDialog(); else game.cancelSelection();
    return;
  }
  if (!game.view || game.dialogKind || game.uiState.screen !== 'game'
    || !game.root.querySelector('#start-screen').classList.contains('hidden')) return;
  const key = event.key.toLowerCase();
  if (event.ctrlKey || event.metaKey) {
    if (!event.altKey && !event.shiftKey && ['s', 'o'].includes(key)) {
      event.preventDefault();
      if (!event.repeat) { if (key === 's') void game.saveManual(); else game.openDialog('saves'); }
    }
    return;
  }
  if (event.altKey) return;
  // Keep native button activation and normal Tab navigation available.
  if (event.target?.closest?.('button,a') && ['Enter', ' '].includes(event.key) && !event.shiftKey && !game.uiState.movePlan) return;
  const pan = { ArrowLeft: [80, 0], ArrowRight: [-80, 0], ArrowUp: [0, 80], ArrowDown: [0, -80] };
  const step = UNIT_STEP_KEYS[event.code];
  if (step) { event.preventDefault(); if (!event.repeat) game.moveSelectedBy(...step); return; }
  if (pan[event.key]) { event.preventDefault(); game.panMap(...pan[event.key]); return; }
  if (['+', '=', '-', '_'].includes(key)) { event.preventDefault(); game.zoomMap(['+', '='].includes(key) ? 1.12 : .9); return; }
  const actions = {
    m: () => game.beginMove(), n: () => game.nextPending(),
    enter: () => event.shiftKey ? game.endTurn() : game.uiState.movePlan ? game.confirmMove() : game.nextPending(),
    ' ': () => game.commandSelected('unit.wait'),
    f: () => game.commandSelected('unit.fortify'), s: () => game.commandSelected('unit.sleep'),
    w: () => game.commandSelected('unit.wake'), b: () => game.foundCity(),
    c: () => game.openDialog('city'), r: () => game.openDialog('research'), d: () => game.openDialog('diplomacy'),
    v: () => game.toggleMiniMap(), home: () => game.centerCapital(), l: () => game.centerSelected(),
    h: () => game.openDialog('help'), '?': () => game.openDialog('help'),
  };
  const action = event.code === 'Numpad5' ? () => game.commandSelected('unit.wait') : actions[key];
  if (action) { event.preventDefault(); if (!event.repeat) action(); }
}
