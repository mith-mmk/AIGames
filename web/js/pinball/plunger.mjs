// One owner per pull prevents key repeats or a second touch from firing twice.
export class Plunger {
  constructor() { this.cancel(); }
  begin(owner, now) {
    if (this.owner !== null) return false;
    this.owner = owner; this.started = now; this.power = 0; this.dragging = false;
    return true;
  }
  update(now) {
    if (this.owner !== null && !this.dragging) this.power = Math.min(1, Math.max(0, (now - this.started) / 1200));
    return this.power;
  }
  drag(owner, distance) {
    if (this.owner !== owner || Math.abs(distance) < 6 && !this.dragging) return;
    this.dragging = true; this.power = Math.min(1, Math.max(0, distance / 100));
  }
  release(owner, now) {
    if (this.owner !== owner) return null;
    const power = this.update(now); this.cancel(); return power;
  }
  cancel() { this.owner = null; this.started = 0; this.power = 0; this.dragging = false; }
}

export function bindPlunger(game, button) {
  let startY = 0;
  const begin = owner => {
    if (game.game?.state.phase === "ready") game.plunger.begin(owner, performance.now());
  };
  const release = owner => {
    const power = game.plunger.release(owner, performance.now());
    if (power !== null && game.game?.state.phase === "ready") game.launch(power);
  };
  const cancel = () => game.plunger.cancel();
  button.addEventListener("pointerdown", e => {
    if (e.button !== 0 || game.plunger.owner !== null) return;
    startY = e.clientY; begin(`p${e.pointerId}`);
    button.setPointerCapture(e.pointerId);
  });
  button.addEventListener("pointermove", e => game.plunger.drag(`p${e.pointerId}`, startY - e.clientY));
  button.addEventListener("pointerup", e => release(`p${e.pointerId}`));
  for (const event of ["pointercancel", "lostpointercapture"]) button.addEventListener(event, e => {
    if (game.plunger.owner === `p${e.pointerId}`) cancel();
  });
  button.addEventListener("blur", cancel);
  // Native activation is deliberately suppressed: firing happens only on release.
  button.addEventListener("click", e => e.preventDefault());
  window.addEventListener("keydown", e => {
    const focused = e.target instanceof HTMLElement ? e.target.closest("button,a,summary,input,textarea,select,[contenteditable]") : null;
    if (e.defaultPrevented || (focused && focused !== button)) return;
    if (e.code !== "Space" && !(e.code === "Enter" && focused === button)) return;
    e.preventDefault(); if (!e.repeat) begin(e.code);
  });
  window.addEventListener("keyup", e => {
    if (game.plunger.owner !== e.code) return;
    e.preventDefault(); release(e.code);
  });
}
