# Candidate 8 independent audit

All results were newly simulated against the candidate 8 frozen runtime. Runtime module hashes are embedded in each JSON; no candidate 7 success is reused as candidate 8 evidence. Physics and acceptance tests were not edited by this audit.

## Injected fixture clearance

`drops.json`: 14 original starts, 12 non-overlapping and 2 explicit skips. Eleven normal drains, no newly stationary or locally oscillating loop trap. One exterior high drop (-2.57,1.7,-2.7) escapes; it reproduces the baseline escape at the same .358333 s (position/velocity differ slightly, so this is not an exact trajectory replay), previously recorded in `../loop-independent/baseline-outside-drop.json`, and is **not** counted as a pass.

`additional.json`: 12 previously query-selected low-speed mouth/sling approaches, plus 9 airborne drops onto new support/crown surfaces, including scoop backstop (-1,1.7,.01) and rear crown (-1.7,1.7,-5.5), (-2.1,1.7,-5.3). All initial placements are checked anew for solid overlap. All 9 support drops and 6 mouth approaches drain normally. The other 6 mouth approaches settle inside the old left sling, exactly matching candidate 7 and the baseline example in `../loop-independent/baseline-sling-slow.json`. These known baseline failures remain visible in the data, not relabeled passes.

Fixture limit is 60 seconds. In addition to 3 seconds continuously below speed .08 (outside scoop hold), an `unresolved` flag and last-10-second position envelope detect sustained local oscillation that can evade a velocity threshold. No new candidate-8 fixture remains locally oscillating at the timeout. This finite fixture audit is not proof that every physical trajectory is safe.

Scripts keep injection-based probes separate from natural controls. Drain reasons and pre-reset positions/velocities distinguish ordinary exits from out-of-bounds resets. Ordinary kickback/sling events are preserved in the log.

## Natural controls

`natural.json`: nine consecutive newly created worlds, powers .55/.75/.95 × offsets 0/17/41, relaxed mode, only ordinary launches and both-flipper pulse `(tick+offset)%72<24`, fixed120Hz. Source hashes, all input transitions/launches, accepted events and drain reasons are retained. Maximum180 seconds per game.

- **5/9 games complete the loop, 8 traversals total.**
- All nine games finish; **28 drains, all normal**. No out-of-bounds, stationary trap or timeout in these games.
- Natural scoop captures: 6. One game (.95/41) legitimately lights all three right targets on its last ball, but does not subsequently collect; **lit reward remains unproved on candidate8**.
- Candidate7 had 8/9 loop-success games with this bot; the changed candidate8 geometry has 5/9. These are mechanical reachability samples, not a statistically meaningful or human difficulty rating.

The first world .55/0 completes the loop at tick3822 (31.85s), ball (-1.25188,.17095,-4.36638), scoring300 points, and finishes at90.983333s. `fresh-replay.json` repeats only that game in a new process: every input, event, final state and source hash exactly matches. No preceding world history is required for this success.

```
AUDIT_POWERS=.55 AUDIT_OFFSETS=0 node docs/pinball-experiments/loop-candidate8/natural-audit.mjs /tmp/loop-fresh.json
```

No injected-fixture result is represented as natural play, and no bot run is represented as manual desktop/mobile usability verification.
