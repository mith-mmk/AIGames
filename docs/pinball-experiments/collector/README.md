# Collector legal-input audit

These are deterministic controller runs, not human-play difficulty evidence. All
ball movement comes from the actual physics and legal launch/flipper controls.
No position, velocity, score, target, or mission-state injection is used.

Run from the repository root:

```sh
node scripts/pinball-collector-audit.mjs /tmp/collector-pulse.json
AUDIT_MODE=cradle AUDIT_POWERS=.95 AUDIT_OFFSETS=44,49,60,66,68,69,80,82,84 node scripts/pinball-collector-audit.mjs /tmp/collector-cradle.json
```

Every game uses relaxed difficulty and stops on gameover or 180 simulated seconds.
The pulse schedule holds both flippers while `(tick + offset) % 72 < 24`, with
120 ticks per second. Powers are `.55,.75,.95,1`, offsets `0,17,41`. The cradle
controller catches naturally returning balls, waits 48 settled ticks, releases
for `offset` ticks, then fires. Its complete controller is in the script.

## Results

- 12 pulse games: 13 natural scoop captures; 0 lit collections.
- 9 cradle games: 56 natural scoop captures; 0 lit collections.
- Power `.55`, pulse offset `17`: captures at 18.025 and 21.125 seconds.
- Power `.95`, cradle release `49`: 47 natural captures over 180 seconds, showing
  a repeatable return and re-shot route. This is not a guarantee of human aiming.
- Power `.75`, pulse offset `41`: right target 2 at 29.9583 seconds, target 1 at
  62.5167 seconds (and another target 2 contact in that same physics step).
- Power `1`, pulse offset `41`: right target 0 at 18.0083 seconds.

All three target switches are therefore reachable separately, but these runs did
**not** demonstrate all three followed by a lit scoop collection in one game.
Rule tests for collection are distinct from this still-unverified full play loop.
Full event positions and timestamps are retained in the adjacent JSON files.

Physics changes can alter these schedules and require fresh runs; these results
are for the centered scoop at x=0, z=.45, not the earlier x=.72 installation.

## Scope of this increment

Adds one genuine open-front service scoop, its short timed hold and ejection,
three distinct target switches to light a repeatable collection reward, a precise
launch skill shot and differentiated sound. Existing elevated ramp, missions,
rollover saves, multiplier and controls remain. Mission selection, wormhole
routing and an additional loop are not implemented in this increment.

The first prototype at x=.72 formed a real wedge against the existing ramp at
x=1.2337,z=.5563; regression tests rejected it. The accepted center placement
is x=0. Likewise the first full-height guard interfered with existing upper
hardware approach fixtures; only the lower sides are raised in the final design.
No ball-search teleport or extra unearned save conceals these issues.
