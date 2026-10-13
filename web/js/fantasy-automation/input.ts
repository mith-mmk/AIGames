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

  constructor(canvas: HTMLCanvasElement, actions: WorldInputActions) {
    this.canvas = canvas;
    this.actions = actions;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '工房の地図。右ドラッグまたは WASD で移動、中ドラッグまたは QE で回転');
    canvas.style.touchAction = 'none';
    const options = { signal: this.abort.signal };
    canvas.addEventListener('pointerdown', event => this.pointerDown(event), options);
    canvas.addEventListener('pointermove', event => this.pointerMove(event), options);
    canvas.addEventListener('pointerup', event => this.pointerUp(event), options);
    canvas.addEventListener('pointercancel', event => this.pointerUp(event), options);
    canvas.addEventListener('lostpointercapture', () => { this.pointer = null; this.lastCell = ''; }, options);
    canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      this.actions.zoom(Math.sign(event.deltaY) * 0.12);
    }, { ...options, passive: false });
    canvas.addEventListener('keydown', event => this.keyDown(event), options);
    window.addEventListener('keyup', event => this.keys.delete(event.code), options);
    canvas.addEventListener('blur', () => this.keys.clear(), options);
    window.addEventListener('blur', () => { this.keys.clear(); this.pointer = null; }, options);
  }

  private pointerDown(event: PointerEvent): void {
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

  private pointerUp(event: PointerEvent): void {
    if (this.pointer?.id !== event.pointerId) return;
    this.pointer = null;
    this.lastCell = '';
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
  }

  private keyDown(event: KeyboardEvent): void {
    if (!['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE'].includes(event.code)) return;
    event.preventDefault();
    this.keys.add(event.code);
  }

  update(seconds: number): void {
    const dt = Math.min(0.1, seconds);
    const horizontal = Number(this.keys.has('KeyA')) - Number(this.keys.has('KeyD'));
    const vertical = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
    if (horizontal || vertical) this.actions.pan(horizontal * dt * 400, vertical * dt * 400);
    const rotation = Number(this.keys.has('KeyQ')) - Number(this.keys.has('KeyE'));
    if (rotation) this.actions.rotate(rotation * dt * 1.2);
  }

  dispose(): void {
    this.abort.abort();
    this.keys.clear();
    this.pointer = null;
  }
}
