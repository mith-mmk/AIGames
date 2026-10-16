export interface WorldInputActions {
  pick(event: PointerEvent): { x: number; z: number } | null;
  onPick(x: number, z: number, event: PointerEvent): void;
  onHover(x: number, z: number): void;
  pan(dx: number, dy: number): void;
  rotate(delta: number): void;
  zoom(delta: number): void;
}

/** Physical input only. Game commands belong to the application. */
export class WorldInput {
  private canvas: HTMLCanvasElement;
  private actions: WorldInputActions;
  private abort = new AbortController();
  private pointer: { id: number; button: number; x: number; y: number } | null = null;
  private lastCell = '';
  private keys = new Set<string>();
  private blocked = false;
  private touches = new Map<number, { x: number; y: number }>();
  private tap: { id: number; x: number; y: number; moved: boolean } | null = null;
  private touchGesture = false;
  private suppressMouseUntil = 0;

  constructor(canvas: HTMLCanvasElement, actions: WorldInputActions) {
    this.canvas = canvas;
    this.actions = actions;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '工房の地図。1本指タップで配置・選択、2本指で移動とピンチ拡縮。右ドラッグまたは WASD で移動、中ドラッグまたは QE で回転');
    canvas.style.touchAction = 'none';
    const options = { signal: this.abort.signal };
    canvas.addEventListener('pointerdown', event => this.pointerDown(event), options);
    canvas.addEventListener('pointermove', event => this.pointerMove(event), options);
    canvas.addEventListener('pointerup', event => this.pointerUp(event), options);
    canvas.addEventListener('pointercancel', event => this.pointerUp(event, true), options);
    canvas.addEventListener('lostpointercapture', event => this.captureLost(event), options);
    canvas.addEventListener('click', event => {
      if (performance.now() < this.suppressMouseUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
    }, options);
    canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      if (this.blocked) return;
      this.actions.zoom(Math.sign(event.deltaY) * 0.12);
    }, { ...options, passive: false });
    canvas.addEventListener('keydown', event => this.keyDown(event), options);
    window.addEventListener('keyup', event => this.keys.delete(event.code), options);
    window.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch' && event.target !== this.canvas && this.touches.size) { this.tap = null; this.touchGesture = true; }
    }, options);
    canvas.addEventListener('blur', () => this.resetPointers(), options);
    window.addEventListener('blur', () => this.resetPointers(), options);
    window.addEventListener('resize', () => this.resetPointers(), options);
  }

  private pointerDown(event: PointerEvent): void {
    if (this.blocked) return;
    if (event.pointerType === 'touch') {
      event.preventDefault(); this.canvas.focus({ preventScroll: true });
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.canvas.setPointerCapture(event.pointerId);
      if (this.touches.size === 1) { this.tap = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }; this.touchGesture = false; }
      else { this.touchGesture = true; this.tap = null; }
      return;
    }
    if (performance.now() < this.suppressMouseUntil || this.touches.size) return;
    if (this.pointer || event.button > 2) return;
    event.preventDefault();
    this.canvas.focus({ preventScroll: true });
    this.canvas.setPointerCapture(event.pointerId);
    this.pointer = { id: event.pointerId, button: event.button, x: event.clientX, y: event.clientY };
    this.lastCell = '';
    if (event.button === 0) this.pickCell(event);
  }

  private pickCell(event: PointerEvent): void {
    const cell = this.actions.pick(event);
    if (!cell) return;
    const key = `${cell.x},${cell.z}`;
    if (key === this.lastCell) return;
    const previous = this.lastCell.split(',').map(Number);
    this.lastCell = key;
    // Fast pointer movement must still lay a continuous, cardinal belt path.
    if (event.type === 'pointermove' && previous.length === 2) {
      let [x, z] = previous;
      while (x !== cell.x) { x += Math.sign(cell.x - x); this.actions.onPick(x, z, event); }
      while (z !== cell.z) { z += Math.sign(cell.z - z); this.actions.onPick(x, z, event); }
    } else this.actions.onPick(cell.x, cell.z, event);
  }

  private pointerMove(event: PointerEvent): void {
    if (this.blocked) return;
    if (event.pointerType === 'touch') {
      if (!this.touches.has(event.pointerId)) return;
      event.preventDefault();
      const before = [...this.touches.values()].slice(0, 2);
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (this.touches.size >= 2) {
        const after = [...this.touches.values()].slice(0, 2);
        const oldDistance = Math.hypot(before[1].x - before[0].x, before[1].y - before[0].y);
        const distance = Math.hypot(after[1].x - after[0].x, after[1].y - after[0].y);
        this.actions.pan((after[0].x + after[1].x - before[0].x - before[1].x) / 2, (after[0].y + after[1].y - before[0].y - before[1].y) / 2);
        this.actions.zoom(Math.max(-0.35, Math.min(0.35, Math.log(Math.max(8, oldDistance) / Math.max(8, distance)))));
      } else if (this.tap && Math.hypot(event.clientX - this.tap.x, event.clientY - this.tap.y) > 8) this.tap.moved = true;
      if (!this.touchGesture) { const cell = this.actions.pick(event); if (cell) this.actions.onHover(cell.x, cell.z); }
      return;
    }
    if (this.pointer?.id === event.pointerId) {
      const dx = event.clientX - this.pointer.x;
      const dy = event.clientY - this.pointer.y;
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      if (this.pointer.button === 2) this.actions.pan(dx, dy);
      else if (this.pointer.button === 1) this.actions.rotate(-dx * 0.009);
      else this.pickCell(event);
    }
    const cell = this.actions.pick(event);
    if (cell) this.actions.onHover(cell.x, cell.z);
  }

  private pointerUp(event: PointerEvent, cancelled = false): void {
    if (event.pointerType === 'touch') {
      if (!this.touches.has(event.pointerId)) return;
      event.preventDefault();
      const tap = this.tap;
      const commit = !this.blocked && !cancelled && !this.touchGesture && this.touches.size === 1 && tap?.id === event.pointerId && !tap.moved && Math.hypot(event.clientX - tap.x, event.clientY - tap.y) <= 8;
      this.touches.delete(event.pointerId); this.tap = null;
      if (cancelled) this.touchGesture = true;
      if (!this.touches.size) this.touchGesture = false;
      this.suppressMouseUntil = performance.now() + 700;
      if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
      if (commit) { const cell = this.actions.pick(event); if (cell) { this.actions.onHover(cell.x, cell.z); this.actions.onPick(cell.x, cell.z, event); } }
      return;
    }
    if (this.pointer?.id !== event.pointerId) return;
    this.pointer = null;
    this.lastCell = '';
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  }

  private captureLost(event: PointerEvent): void {
    if (this.touches.delete(event.pointerId)) { this.tap = null; this.touchGesture = this.touches.size > 0; this.suppressMouseUntil = performance.now() + 700; }
    if (this.pointer?.id === event.pointerId) { this.pointer = null; this.lastCell = ''; }
  }

  private resetPointers(): void {
    this.keys.clear(); this.tap = null; this.touchGesture = false;
    const ids = [...this.touches.keys(), ...(this.pointer ? [this.pointer.id] : [])];
    if (this.touches.size) this.suppressMouseUntil = performance.now() + 700;
    this.touches.clear(); this.pointer = null; this.lastCell = '';
    for (const id of ids) if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
  }

  private keyDown(event: KeyboardEvent): void {
    if (this.blocked) return;
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'].includes(event.code)) return;
    event.preventDefault();
    this.keys.add(event.code);
  }

  update(seconds: number): void {
    if (this.blocked) return;
    const dt = Math.min(0.1, seconds);
    const horizontal = Number(this.keys.has('KeyA')) - Number(this.keys.has('KeyD'));
    const vertical = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    if (horizontal || vertical) this.actions.pan(horizontal * dt * 400, vertical * dt * 400);
    const rotation = Number(this.keys.has('KeyQ')) - Number(this.keys.has('KeyE'));
    if (rotation) this.actions.rotate(rotation * dt * 1.2);
  }

  setBlocked(blocked: boolean): void {
    this.blocked = blocked;
    if (!blocked) return;
    this.resetPointers();
  }

  dispose(): void {
    this.abort.abort();
    this.resetPointers();
  }
}
