# Timestamped flipper input candidate

Branch: `pinball/timed-input-20261116`, based on `649b9d4` (the separately
validated low-fps frame-time candidate). Not deployed to Sites.

## Reproduced problem, distinct from weak rebound

Headless Chrome received trusted keyboard and pointer down/up events. Each
record includes DOM event timestamp, delivery performance.now, physics input,
fixed-step elapsed time and actual flipper angles. Native RAF callbacks were
selectively skipped for 60/15/10 fps; no physics speed multiplier or ball fixture
was used. The ball remained ready in the shooter: this measures input and
actuator response, NOT ball-contact force or the user's device.

Requested taps were 30ms and holds 250ms; actual timestamp intervals are in the
JSON and are not exactly the requested duration. Four repetitions for each of
keyboard-left and pointer-right produce eight conditions per duration/fps.

- Baseline: all eight short taps registered at 60fps. At 15fps three of eight,
  and at 10fps four of eight, never supplied `true` to physics and produced no
  flipper motion. All 24 long holds registered.
- Some baseline short taps that did register were stretched to a whole rendered
  frame, fully raising the bat at 10fps. Merely latching a press for one render
  frame would preserve that duration error.
- Final candidate: all 24 short taps and all 24 long holds supplied input and
  moved the flipper. No page errors. These are bounded observations, not a
  statistical estimate of missed human taps.

## Limited implementation

Capture held-state transitions at DOM `event.timeStamp` in the performance clock.
Split the existing bounded frame interval at those transitions; pass only each
segment's actual duration/state to unchanged fixed-step physics. No collision,
coil, restitution, geometry, scoring or ball-position change. Multiple keys or
pointers remain combined by the existing held sets, so key repeat creates no
new edge. Pause/restart/focus-loss reset pending history.

The 100ms catch-up limit is retained. Older transitions determine the state at
the start of that window but expired taps are not replayed as delayed kicks.
Invalid/out-of-range event timestamps fall back to processing time; preservation
of delivery-delayed duration is not guaranteed in that fallback path.

## Busy renderer check

An 80ms main-thread busy loop was scheduled while browser key down/up commands
were sent about 30ms apart without awaiting the first command response. In the
final eight observations, DOM stamps stayed ~31.9–32.4ms apart while handlers
arrived 0–0.1ms apart. Seven taps remained represented in physics and produced
motion. One tap was delivered about 119ms after keyup and fell outside the
existing 100ms catch-up window, so it was dropped. The first run similarly
registered 7/8 with one ~123ms-late delivery; both are retained, not hidden.
This is synthetic workload, not a representative hardware performance test.

## Verification

- Seven focused timeline/real-physics tests cover in-frame taps, simultaneous
  sides, repeated downs, future release, stale events, reset, invalid times,
  residual accumulator and release exactly at a frame end.
- Existing browser regression passed: launch, controls, pause/restart, mobile
  viewport, blur, context restoration, reload and an unassisted three-ball
  gameover (three launches, 25.258 simulated seconds).
- Existing control browser passed actual keyboard left/right and touch
  capture/release/refire; a keyboard shot traversed the ramp, returned to the
  cradle and refired the SAME ball. These tests explicitly use incoming-ball
  placement fixtures; they are not natural-launch reachability probabilities.
- Read-only independent review checked lifecycle, caps, accumulator and event
  timestamp amendment; no remaining implementation blocker reported within
  this scope. Full final regression result is recorded below once complete.

## Limits / evidence interpretation

The original subjective weak-contact complaint is NOT declared solved. Physical
phone behavior, human aimability, audible feedback and representative GPU load
are unverified. Existing frame-level sound edge detection is unchanged; very
short press/release pairs may still lack a flipper sound. Fixed-step quantization
remains, so sub-8.33ms taps are not guaranteed. No claim of universal trajectory
or low-fps survival equivalence is made by these selected browser checks.

`baseline.json` and `busy-first.json` used a capture/microtask recorder whose
`events[].state` can precede the app handler. That field is not an outcome;
use event timestamps, physics inputs and angles. The final `candidate.json`
and `busy.json` recorder runs at window bubble after app handlers.

Replay from repository root:

```
node --test web/js/pinball/flipper-input.test.mjs
node scripts/pinball-short-input-browser.cjs
node scripts/pinball-busy-input-browser.cjs
npm run test:pinball
node scripts/pinball-browser.cjs
node scripts/pinball-control-browser.cjs
```

The diagnostic scripts write under ignored `artifacts/pinball/`; copy retained
outputs before rerunning. Browser timing is nondeterministic: compare actual
event/step records rather than assuming identical tap placement on every run.
