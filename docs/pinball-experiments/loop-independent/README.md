# Independent candidate 3 clearance audit

Rejected as-is: five non-overlapping injected fixtures settle into physical wedges.
This is adversarial placement/drop testing, **not evidence of natural launch reachability**.
The source hashes in `candidate3-drops.json` identify the tested runtime files.
No production files were changed. The baseline main is unaffected.

Three distinct wedge types:
- Outside left drops x=-2.57, y=1.7 at z=-4.9 and -3.8: outer loop wall against existing x=-2.65 wire/ramp support and foot. Stops near (-2.499,-4.296), (-2.537,-3.569).
- Rear drop (-1.3,1.7,-5.55): inner loop wall against the end of the upper-left target carrier capsule. Stops near (-1.888,-2.286).
- Slow approaches (-1.75,.175,-.55/-1.2), velocity (0,0,.3): inner loop wall against scoop left cheek. Stops near (-1.414,.332).

`candidate3-trap-contacts.json` contains static closest-contact queries at each resulting rest position. Every wedge has both obstructions and floor touching. The trap criterion is 360 consecutive 120Hz ticks below speed .08 without scoop holding; recorded final speeds are effectively zero.

The initial runner attempted 14 fixtures. Its incremental file contains the 13 valid initial placements. The last fixture (-1.7,.175,1.1) was skipped for initial overlap and omitted by the original incremental writer; the saved replay now also emits final skipped rows. Do not count a skipped fixture as passing.

Eight valid fixtures reached `ready`; this alone is not proof of ordinary drain (event reasons were not captured). The five stationary failures are the actionable result. The ground position is set only once per fixture, with no later ball correction.

Replay from repository root:
```
node docs/pinball-experiments/loop-independent/drop-audit.mjs /tmp/loop-drops.json
```
Only run against a frozen candidate and compare source hashes. Changes need a fresh audit, natural-control tests, and ordinary ramp/scoop/target regressions.

## Candidate 7 (full walls, repositioned targets and physical pocket backings)

`candidate7-drops.json`: 14 fixed fixtures, 12 valid + 2 initial-overlap skips. The moved solid support now occupies the original slow-start at (-1.75,.175,-.55), so this is deliberately a skip, not a pass. Eleven valid fixtures drained normally. The exterior high drop at (-2.57,1.7,-2.7) escaped; `baseline-outside-drop.json` confirms the exact same time (.358333 s), escape position and velocity on unchanged main. It is a known baseline high-airborne vulnerability, not a passing containment case.

`candidate7-additional.json`: 12 non-overlapping low-speed, two-direction mouth/sling probes plus six support-top drops. Six mouth probes drift into the **existing left sling interior**, resting near (-1.2868,.1712,2.4952). `baseline-sling-slow.json` reproduces the first probe on unchanged main with the exact same tick 553, rest position and velocity. `candidate7-sling-contacts.json` confirms these touch old sling segments, not loop hardware. They are recorded failures, not new-loop failures and not erased from totals. The other six mouth probes and all six support-top drops drain normally.

`candidate7-scoop-backstop.json` adds the explicit drop (-1,1.7,.01) at the common support/backstop intersection. Normal drain after 5.325 s, maximum stationary interval 3 ticks.

The additional probes were selected using ball-shape contact queries, after initial guesses collided with visible sling solids. The saved additional script contains the final selected points and still checks every start for overlap. None of the tested new loop pockets retains a ball in candidate 7; this finite audit does not prove every possible trajectory safe. Physics drain reason and pre-reset positions/velocities are recorded, including ordinary kickback events.

### Natural launch audit

`candidate7-natural.json`: fresh process, nine worlds in the recorded order, relaxed difficulty, powers .55/.75/.95 × pulse offsets 0/17/41. Only ordinary launch and flipper inputs; no ball/state injection. All launches and input transitions, runtime source hashes, accepted events and drain reasons are recorded.

- Loop completion: **8/9 games, 11 traversals**.
- All nine games finish. All **29 drains are normal**, no out-of-bounds drains and no five-second stationary trap.
- Natural scoop capture: 3/9 games, 5 captures total.
- Three distinct right targets light the collector in the .75/0 game, but it does not collect afterward. **Lit collection reward is not proved on candidate 7.** Do not transfer the old v24 proof to this changed geometry.

The **first world** .55/0 completes a loop at tick 3923 (32.691667 s), at (-1.26564,.17075,-4.44461), awarding 300 points. It finishes at 51.958333 s. `candidate7-fresh-replay.json` repeats only this game in a second fresh process; every input, event, final state and source hash exactly matches the first run. Thus this particular success requires no preceding world history.

Reproduce the fresh-world success:
```
AUDIT_POWERS=.55 AUDIT_OFFSETS=0 node docs/pinball-experiments/loop-independent/natural-audit.mjs /tmp/loop-fresh.json
```
The bot strategy is both flippers on for ticks 0–23 of every 72-tick cycle, at 120 Hz; launch power .55 whenever ready. This verifies natural mechanical reachability, not manual usability or mobile-device play quality.

### Bounded lit-collector follow-up

`lit-switch-audit.mjs` replays the first three preceding worlds, then the .75/0 game. Its lighting happens on the **third and last ball**, so changing the next launch power cannot help without adding an unauthorized ball. Instead it switches the legal flipper pulse phase immediately on lighting; the planned offsets are 8, 17 and 41, each in a fresh process with the same complete preceding input history. This is a small reachability probe, not a difficulty adjustment.

All three bounded lit-switch runs finished with normal drains, no stationary trap, and **zero lit collections**. Their final durations were 71.758333 s (offset 8), 74.658333 s (17), and 81.533333 s (41). The offset 41 variant adds another loop but does not collect the lit scoop. Full histories are `candidate7-lit-offset-{8,17,41}.json`. Exploration stops here; the new geometry's combined target-light-collect reward remains unproved despite separately demonstrated lighting and natural scoop capture.
