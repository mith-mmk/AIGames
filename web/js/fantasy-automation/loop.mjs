/** Browser-independent fixed-step clock. Rendering never owns simulation time. */
export class FixedStepLoop {
  constructor({ step, render, stepSeconds = 1 / 20, maxSteps = 8 }) {
    if (typeof step !== 'function' || typeof render !== 'function') {
      throw new TypeError('step and render must be functions');
    }
    if (!Number.isFinite(stepSeconds) || stepSeconds <= 0) {
      throw new RangeError('stepSeconds must be finite and positive');
    }
    if (!Number.isSafeInteger(maxSteps) || maxSteps <= 0 || !Number.isFinite(stepSeconds * maxSteps)) {
      throw new RangeError('maxSteps must be a positive safe integer with a finite time budget');
    }
    this.step = step;
    this.render = render;
    this.stepSeconds = stepSeconds;
    this.maxSteps = maxSteps;
    this.accumulator = 0;
  }

  advance(elapsedSeconds) {
    // Discard time from a long suspension rather than causing a catch-up spiral.
    const elapsed = Number.isFinite(elapsedSeconds) && elapsedSeconds > 0
      ? Math.min(elapsedSeconds, this.stepSeconds * this.maxSteps)
      : 0;
    this.accumulator += elapsed;
    // A small tolerance prevents decimal rounding from losing a boundary tick.
    const steps = Math.min(this.maxSteps, Math.floor(this.accumulator / this.stepSeconds + 1e-9));
    for (let index = 0; index < steps; index += 1) {
      this.step(this.stepSeconds);
    }
    this.accumulator = Math.max(0, this.accumulator - steps * this.stepSeconds);
    const alpha = this.accumulator / this.stepSeconds;
    this.render(alpha);
    return { steps, alpha };
  }

  reset() {
    this.accumulator = 0;
  }
}
