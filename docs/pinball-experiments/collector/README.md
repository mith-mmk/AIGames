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

Verified against runtime commit `475390a` with the final scoop at x=-.90, z=.45,
and original cabinet collider registration preserved before the ball. All 21
games reached gameover within the 180-second cap.

- 12 pulse games: 4 natural scoop captures; 0 lit collections.
- 9 cradle games: 10 natural scoop captures; 0 lit collections.
- Power `.55`, pulse offset `17`: capture at 10.2667 seconds.
- Power `.95`, cradle release `66`: five captures at 12.75, 14.6083, 19.0167,
  26.5917 and 31.85 seconds. These require real return and re-shot inputs.
- Power `.75`, pulse offset `41`: right target 1 at 10.2167 seconds, target 2 at
  30.325 seconds and target 0 at 58.1083 seconds. All three light in one game.
- Power `.95`, pulse offset `0`: targets 2 and 0, then a scoop capture at 22.9667
  seconds. Only two targets were lit, so this correctly grants the unlit reward.

All three target switches and completion of their light set are naturally
reachable. These runs did **not** demonstrate a lit scoop collection after that
completion in the same game. Rule tests for collection are distinct from this
still-unverified full play loop. These results do not establish human difficulty,
phone responsiveness, or Space Cadet-equivalent completeness.
Full event positions and timestamps are retained in the adjacent JSON files.

Physics changes can alter these schedules and require fresh runs. These final
results replace the earlier centered-scoop and x=-.72 trial measurements.

## Scope of this increment

Adds one genuine open-front service scoop, its short timed hold and ejection,
three distinct target switches to light a repeatable collection reward, a precise
launch skill shot and differentiated sound. Existing elevated ramp, missions,
rollover saves, multiplier and controls remain. Mission selection, wormhole
routing and an additional loop are not implemented in this increment.

The first prototype at x=.72 formed a real wedge against the existing ramp at
x=1.2337,z=.5563; regression tests rejected it. The center placement x=0
obstructed existing refire and upper-lane routes. Moving to x=-.72 still blocked
the recatch/refire route at its right cheek. The final x=-.90, z=.45 placement
passed the unchanged lower-layout, support, ramp and upper-lane route checks.
Likewise the first full-height guard interfered with existing upper hardware
approach fixtures; only the lower sides are raised in the final design. The
original three cabinet collider allocations are retained and the two extensions
are appended after the original ball, avoiding registration-order trajectory
regressions.
No ball-search teleport or extra unearned save conceals these issues.

## Browser review

On hadrianus Chrome, the final physical placement (runtime 475390a) rendered at
1144×728 desktop and 390×844 mobile-width viewports. Oblique and top views showed
an open scoop mouth and no obvious overlap with installed target banks or rails.
Launch and reset worked on both widths. The earlier desktop HUD overlap was
corrected by reserving the phase/control rail; 1144×600 was also checked on the
same CSS revision. The scoop objective is placed near the top of the backglass
so the new goal does not require scrolling to discover.

The cloud browser could not create a WebGL context (GL_RENDERER=Disabled); it
was not counted as a successful rendering test. Mobile-width checks are not
physical-phone/two-finger evidence. Context restoration, blur, and a browser
fixture of lit-target collection were not rerun in this revision.
