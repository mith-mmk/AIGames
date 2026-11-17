# Candidate 9 FINAL independent audit

Fresh simulations against the final half-ellipse rear housing, hardware seats and throat-crossing scoring contract. Module hashes in each JSON identify the tested source. Prefinal simulations are not used as final evidence. Physics and acceptance tests are unchanged by this audit.

## Injected fixtures

- `drop.json`: original14 starts, 12valid +2 initial-overlap skips. 11normal drains, one known high-airborne exterior escape. No new trap.
- `additional-drop.json`: 12mouth/sling slow approaches +9support-top drops. All support drops and6mouth approaches drain normally. The remaining6 reproduce the old left-sling interior resting defect, already compared with unchanged baseline in `../loop-independent/baseline-sling-slow.json`; these are explicitly failures, not passes.
- `housing.json`: 8airborne drops plus18ground approach attempts, covering the new half-ellipse rear center, wedges, outer hem and ends. 23valid starts all drain normally, no out-of-bounds or trap. Three left-end slow starts overlap an existing solid and are explicit skips.

Every initial position is queried for intersection against actual world colliders. Fixture limit60seconds; `unresolved` and last10second position envelope supplement the continuous-low-speed detector to reveal local oscillation. All valid non-baseline-trap fixtures exit before timeout.

The old high-airborne outside start (-2.57,1.7,-2.7) escapes also on unchanged main; it is not counted as success. Drain reasons and pre-reset state are recorded, so no out-of-bounds reset masquerades as normal exit. Both old baseline defects remain visible.

## Natural-control audit (FINAL)

`natural.json`: fresh process, nine worlds in listed order, relaxed mode, powers .55/.75/.95 × pulse offsets0/17/41. Ordinary launch plus both flippers `(tick+offset)%72<24`; all input changes, accepted events, runtime hashes and drain reasons recorded.

**6/9 games complete the loop, 10 traversals.** All nine finish; all28 drains are normal, with no out-of-bounds, stationary trap or timeout. Last world .95/41 lights all right targets at tick8055 on its final ball, but does not collect afterward. Lit reward is not demonstrated by this baseline run.

Final scoring begins at the physical throat crossing (-2.10,-.70), not the wider mouth, so legitimate U traversals entered through the saved-side-ball route can count. The rear turn and exit gates still must follow in order. Counts cannot be directly treated as geometric usability improvements over candidate8's mouth-start contract.

## Bounded single-nudge exploration

`nudge-audit.mjs` replays every preceding game in a new process before the final .95/41 game. It issues **at most one ordinary `g.nudge()`**, equivalent to pressing N, after legitimate target lighting plus a chosen delay. Candidate delays:0/.25/.5/1/1.5/2seconds, stopping on success. No state injection, added balls, hidden impulse, or tilt bypass. Velocity before/after, tilt state and input tick are recorded alongside the full launch/flipper history. A successful condition requires a complete-prefix replay.

### Successful lit-collector sequence, independently replayed

The fourth bounded condition, **one N-key nudge exactly1second after lighting**, succeeds. Exploration stopped there;1.5/2second conditions were not run. Earlier delays0/.25/.5 did not collect.

In final world9 (.95/41):
- tick8055 (67.125s): third right target lights collector.
- tick8175 (68.125s): one ordinary nudge returns success, tilt remains false.
- tick8715 (72.625s): physical scoop entry, **1000points**, collections1, targets reset, side-save charge1. Same ball3 is held.
- tick8811 (73.425s): physical ejection after .8s, still ball3, forward velocity z≈5.9984.
- Game finishes at92.283333s; all drains normal, no trap.

`nudge-delay-1.json` is the first successful full run. `nudge1-replay.json` independently repeats all nine worlds in a fresh process and adds hold/ejection observations. Every input, event and final position matches the first success; runtime hashes match. First8world input/event histories also exactly match the baseline. `verify-collection-proof.mjs` asserts these equalities and the reward, charge, reset, same-ball hold/ejection, no tilt and normal end; its passing result is `collection-verification.json`.

```
NUDGE_DELAY=1 node docs/pinball-experiments/loop-candidate9/nudge-audit.mjs /tmp/nudge-proof.json
node docs/pinball-experiments/loop-candidate9/verify-collection-proof.mjs
```

**Limitation:** this success has the complete preceding8world history. It is not yet a one-world browser-restart recipe or human-play demonstration. No preceding-game history is omitted, and no score, target flag, ball position or extra ball is injected. This proves the full target-light-collect reward loop is physically reachable with ordinary controls on the final candidate9 runtime.

## Full regression

Frozen runtime `19cbe816f7368f68439fbdaa460f71ecdf13a3d3`: `npm run test:pinball` completed with 278/278 tests passing (453412 ms), then ESLint reported 0 errors and the 3 pre-existing CSS baseline warnings. See `full-regression.log`.
