/** Front-pop UPGRADE and a separate glancing lane-B drive. */
export class UpperShotChallenge {
  constructor() { this.time = 0; this.completions = 0; this.resetRun(); }
  resetRun() { this.spinnerAt = -Infinity; }
  advanceTime(dt) { this.time += dt; }
  onEvent(event) {
    if (event.type === 'spinner') {
      this.spinnerAt = event.forward ? this.time : -Infinity;
      return false;
    }
    const age = this.time - this.spinnerAt;
    if (['bumper','bank','target','sling','ramp','loop','scoop','inlane','rollover'].includes(event.type)) this.resetRun();
    if (!event.forward || age < 1/120 - 1e-9) return false;
    let shot=false;
    if (event.type === 'bumper' && event.part === 'b2' && event.front && age <= 1.6)
      shot='upgrade';
    if (event.type === 'rollover' && event.lane === 1 && age <= 2.5)
      shot='drive';
    if (shot) this.completions++;
    return shot;
  }
}
