// Physical inputs map to named controller actions here, outside the state classes.
export function bindInput(app, ui) {
  const controller = new AbortController(), signal = controller.signal;
  const on = (id, action) => ui.get(id).addEventListener('click', () => app.action(action), { signal });
  on('undo', 'undo'); on('reset', 'reset'); on('hint', 'hint'); on('next', 'next');
  ui.get('open-stages').addEventListener('click', () => ui.toggleStages(), { signal });
  ui.get('stage-list').addEventListener('click', event => {
    const button = event.target.closest('[data-stage]'); if (button) app.selectStage(Number(button.dataset.stage));
  }, { signal });
  ui.get('mirror-targets').addEventListener('click', event => {
    const button = event.target.closest('[data-mirror]'); if (button && !button.disabled) app.rotate(Number(button.dataset.mirror));
  }, { signal });
  ui.get('rotate-selected').addEventListener('click', () => app.rotate(Number(ui.get('mirror-select').value)), { signal });
  ui.get('viewport').addEventListener('click', event => app.point(event.clientX, event.clientY), { signal });
  return () => controller.abort();
}
