/** Match the physics catch-up budget without slowing ordinary 10–20 fps frames.
 * Long stalls intentionally discard excess wall time: no unbounded catch-up.
 * A zero previous timestamp is the app's restart/visibility reset sentinel.
 */
export function pinballFrameDelta(time, previous) {
  if (!Number.isFinite(time) || !Number.isFinite(previous) || previous === 0) return 0;
  return Math.min(Math.max((time - previous) / 1000, 0), .1);
}
