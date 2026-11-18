/** A center shot must physically pass the spinner, then reach lane B. */
export class UpperShotChallenge {
  constructor() { this.time = 0; this.completions = 0; this.resetRun(); }
  resetRun() { this.spinnerAt = -Infinity; }
  advanceTime(dt) { this.time += dt; }
  onEvent(event) {
    if (event.type === 'spinner') { this.spinnerAt = this.time; return false; }
    const age = this.time - this.spinnerAt;
    // A bumper or bank deflection is not a clean aimed drive. The left loop
    // and elevated ramp also keep their own rewards, not this straight shot.
    if (['bumper','bank','target','sling','ramp','loop','scoop','inlane'].includes(event.type)) this.resetRun();
    if (event.type !== 'rollover') return false;
    this.resetRun();
    if (event.lane !== 1 || age < .06 || age > 2.5) return false;
    this.completions++;
    return true;
  }
}
