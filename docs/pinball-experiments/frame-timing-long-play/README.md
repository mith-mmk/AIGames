# Low-frame-rate extended legal-input comparison

Runtime base: `167c918`, branch `pinball/frame-timing-20261116`. No new runtime
change, no rebound-force/geometry tuning and no Sites deployment in this pass.

## Method

Run from repository root, each mode in its own fresh Node process:

```
node scripts/pinball-low-fps-audit.mjs artifacts/pinball/low-fps-legacy.json legacy
node scripts/pinball-low-fps-audit.mjs artifacts/pinball/low-fps-candidate.json candidate
```

Sixteen ordered conditions per mode: 60/20/15/10 fps, launch powers .75/1,
release delays 44/82 simulation ticks. Only normal launch and left/right input;
no synthetic ball placement, velocity/score injection or live position rescue.
The existing legal-input controller is observed once per nominal render frame;
catch/release durations are measured in simulation time, not frame counts.
Legacy reproduces the old 50 ms frame cap; candidate uses `pinballFrameDelta`.
Both share exactly the same physics runtime, collider construction and condition
order. Each game has a 180 nominal wall-second budget. `wallSeconds` is generated
from frame count / fps, not measured execution time. This is a headless physics/input
comparison, NOT actual browser rendering, GPU pressure or a human player.

## Results

- All 16 games finished in each mode, with three balls, nonzero scores, zero
  detected stalls and zero live position resets.
- At 60 and 20 fps, all eight complete records match exactly after excluding
  only the `mode` label. This includes trajectories' aggregate outcomes,
  scores, elapsed times, shots, contacts, saves and ramp counts.
- At 15 fps legacy physics/nominal-wall time is .75; at 10 fps it is .5. Candidate is
  approximately 1 at both rates (within one fixed physics tick).
- At 15/10 fps the candidate reached a ramp in 7/8 conditions, totaling seven
  traversals, versus 0/8 on legacy. This small fixed-controller sample does
  NOT establish a difficulty or success probability.
- Individual scores and survival times are not uniformly improved: 4/8 low-fps
  candidate conditions have lower scores. For example,
  15 fps / .75 power / 82 delay score falls 1925 → 975 and simulation lifetime
  changes 38.05 → 43.60 seconds. 10 fps / 1 power / 82 delay score falls
  3500 → 2425 and lifetime changes 52.70 → 48.70 seconds. Do not substitute
  aggregate score or ramp counts for universal playability acceptance.

These are diagnostic observations, not 16 asserted test passes. The timing
defect is corrected within these tested bounds. Input remains sampled
at render rate, so this does not solve input latency or guarantee brief taps are
captured. Previously rejected bumper-force candidates remain rejected. Physical
phones, real low-performance rendering, sound and subjective contact feel remain
unverified. Existing bounded browser results are in `../frame-timing/README.md`.

## Evidence integrity

`legacy.json` and `candidate.json` contain all rows. `manifest.json` records
runtime/script hashes. A preliminary diagnostic used a frame-count-based hold
threshold; it was discarded and is deliberately NOT used in this comparison.
The two archived runs use the corrected simulation-time hold threshold.
