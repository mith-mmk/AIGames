# Save prearming safety contract — design only

Separate **spatial fit**, **visual/reference fit**, and **safe actuation**. The archived vertical fork has conditional static packaging, requires replacement of old housing/rod, and remains a tall reference departure. None of that proves safe deployment, contact firing or preserved play. This follow-up changes no geometry, force, controller input or production source. Its only new gameplay run is an observation-only original54 audit on frozen71245b2.

## New measured facts

Every byte of the54-case result equals the prior baseline, including all54 records:61 ramps,284 controller shots,0 stalls and0 live resets. Eight charges earned; three used. Events are recorded before/after the original onEvent, with saves captured **before the original impulse**.

| Case ordinal | Earn tick | Save tick | Earn→save | Ball |
| --- | ---: | ---: | ---: | ---: |
|18|6842|7110|2.233333s|3→3|
|38|5836|7766|16.083333s|3→3|
|44|9904|12640|22.800000s|3→3|

All eight observed earning positions are outside the static deployment swept volume. This is an opportunity to consider prearming, not proof a finite deployment or long armed hold is safe. Full trajectories between earning and the last120-tick arrival windows were not recorded; reverse/high-ball/other passages during those intervals remain unknown.

Case43 earns at tick12583 on ball2. Drain at18678 changes ball2→3 while charge stays1; final gameover at20648 still has charge1. Ordinary drain/reset must not erase stored charge or manufacture another one. No tilt or pause occurred in this natural audit; those conditions below are source-derived and untested.

Within the three arrival windows, linear within-step estimates give only **.016768/.019470/.019408s** from centerZ3.32 to sphere-front contact with the working faceZ3.54. These are not actuation deadlines guaranteed by dynamics. All120 prior ticks already had charge1. The observed prefix before first sampled deployment-volume occupancy is approximately.9917s, but endpoint emptiness is not a continuous safe-motion certificate.

## Source lifecycle to retain

After the first three-bumper mission, four target/bank contacts while workshop is active complete workshop and assign charge1. Workshop occurs once in the bounded per-game mission sequence. Save acceptance consumes it, increments uses once, awards no new points. Tilt and pause reject events; tilt does not erase charge. Ordinary drain preserves mission/charge; resetBall clears tilt but not charge. Full restart resets mission and charge0. Same-ball shooter return is not a new ball or a charge refund.

The source can call resetBall repeatedly in ready state; the controller must react to genuine lifecycle transitions, not treat each method call as permission to refill energy or teleport hardware. The audited controller observed162 reset calls, one after each drain; repeated-ready behavior and restart handling were not exercised here.

## Independent safety gates, in priority order

**1. Prearm/deploy permission.** Require stored charge, valid ready/playing lifecycle, no tilt/pause/gameover, mechanism homed/held at verified stops and a complete empty deployment sweep with enough conservative arrival margin for bounded motion and stopping. Recheck during motion. A clear point at earning is insufficient. Do not deploy through a ball, including an airborne one, or assume a late Z3.32 detector gives enough time. Prearming must not consume the gameplay charge. Prolonged armed occupancy must preserve both routes, reverse passages and passive play across all eight earned cases, including unused and carried charges.

**2. One actual-contact firing transaction.** Require armed working pose, valid incoming contact on the upstream strike face of either pad, downstream approach relative to the mounted face, charge1 and valid lifecycle. Top/side/back contact, parked-pad contact and mere trigger overlap do not qualify. Validate drive readiness/budget, accept one side-save event, latch a unique game/ball/stroke identity and start one physical stroke atomically. Repeated manifolds/both-pad reports cannot start another stroke. No automatic refund or retry after a fired stroke misses. Only motor force on the finite-mass assembly may transfer energy; remove the old direct ball impulse in a future physical-actuator candidate.

**3. Tilt/fault/withdrawal safety.** Cutting positive drive is necessary but leaves a physical obstacle. Immediate lifting can strike a contacting ball. Resolve this conflict with a demonstrated controlled/passive withdrawal or yielding behavior; do not use the existing1.5s tilt drain/reset to conceal a jam. No new positive firing work after tilt. Residual momentum, springs and gravity can still hit the ball and must be measured. A budget/stop/joint fault must not trigger a teleport or hidden rescue. After a normal stroke, verify ball separation and the withdrawal sweep before lifting; return longitudinally only under similarly checked conditions.

**4. Pause/reset consistency.** Pause freezes bodies, motor integration, timers, stored energy and latches on simulation time, with no wall-clock stroke completion. Resume revalidates the gate. Ball transition may require safe homing, but logical unused charge persists. Full restart creates a new game epoch with charge0 and explicit safe initialization; it must not leak old stroke momentum or free energy into the new ball. No pose reset through a live ball.

**5. Force/work/energy budget.** Select and document actual assembly masses/inertias, joint limits/stops, force/torque limits, drive duration and positive-work limits before power. Installed Rapier motor stiffness/damping is not a demonstrated force cap. Audit explicit force applied to the slider and actual displacement; no ball velocity/position correction. Count deployment, holding, strike, lifting/retraction, spring preload, residual kinetic energy and gravity. Positive-work accounting cannot silently net away braking/regeneration to refill a stroke budget.

For illustration only, lifting moving mass.08 by.27 stores **2.105339 energy units** under this table's gravity; actual moving mass is not selected. Lowering can release that energy before firing. The old kick targets5.76 horizontal ball-energy units; in these three saved cases its instantaneous horizontal additions are4.695272/4.934106/4.952415. These are comparison references, not motor budgets or a requirement that a physical striker reproduce exact−12 velocity. Compare useful return capability and total ball/assembly energy without unfair extra power, including vertical/spin/potential changes and numerical residuals. The earlier96-force/11.52-work illustration is not a validated setting.

## Next tests, not performed

First implement/check state-machine invariants, physical stops/holding and passive deployment/withdrawal/tilt faults with no energized save. Then one bounded contact-transfer comparison, preserving measured incoming states and both routes. Only after that: unchanged aim tests plus adjacent timing interval, whole regressions and natural play. Visual/reference and device/performance checks remain separate. No powered mechanism, prearming controller, tilt recovery, pause/restart trial or additional geometry was run here.

## Evidence / reproduction

`evidence/earning-observations.json.gz` preserves all54 observed lifecycle summaries and exact earn/save snapshots. `timing-and-source-evidence.json` contains selected states, source hashes, cross-ball carry evidence and offline calculations. `natural-comparison.json` verifies byte/deep equality against the existing baseline, which is reused rather than duplicated.

From repo root:

```
python3 docs/pinball-experiments/save-prearming-contract/restore.py artifacts/pinball/save-contract-restored
python3 artifacts/pinball/save-contract-restored/analyze.py
```

This restores recorded observations and recomputes evidence without another gameplay run. It reuses the vertical-fork frozen runtime payload and prior natural baseline/windows. Optional observation-only replay, with unchanged controller/world order:

```
D=artifacts/pinball/save-contract-restored
node --import ./$D/loader.mjs $D/observe-earning.mjs $D/natural54.json
python3 $D/compare.py
python3 $D/analyze.py
```

No installed-actuator simulation is hidden in these commands. Exact frozen audit source and dependency hashes are included/referenced. Restore refuses an existing destination. Temporary verification copies were moved to Trash. No commit/push by this worker.
