# Left U-loop experiment (not published)

The rejected designs below are historical evidence through commit `f590247`. They are **not** acceptance results for the later relocated-target layout. The old diagnostic imports its checkout’s code and must therefore run in a clean historical worktree, not against the newest experimental geometry.

```sh
git worktree add --detach ../pinball-loop-rejected f590247
cd ../pinball-loop-rejected
node scripts/pinball-loop-candidate-audit.mjs
```

The updated historical diagnostic refuses other commits or modified physical source. Its expected exit status is failure, because that historical candidate was rejected.

## Rejected full-length guide

This experiment is isolated from the published pinball. Do not promote it merely because an injected entry fixture completes.

The initial straight mouth at (-2.22, 0.40) completed all 12 positioned ground-entry fixtures (speeds 14/18/22/26, offsets -0.025/0/+0.025). Three speed-10 shots rolled back and drained normally. The existing ramp and lower-layout regression groups passed all 24 tests. However, a right-flipper cradle fixture with releases from 35 through 110 ticks did not reach the loop mouth.

A curved mouth beginning at (-1.82, 0.80), blending to (-2.22, -0.50), was then tested. Right-cradle releases 77, 79, 81 and 82 ticks entered the first gate but did not complete. Worse, genuine launch/flipper-input games found permanent stops between the new guide's outer face and the existing left-middle standup assembly.

Reproduction: new process; separate worlds in this order: relaxed difficulty, launch power 0.55, both flippers pulsed for `(tick + offset) % 72 < 24`, offsets 0 then 17. Relaunch whenever the normal state becomes ready; do not inject ball coordinates or modify score/state. At 180 seconds both games remained playing, with more than 144 seconds of near-zero velocity:

- Offset 0: x=-1.881229043006897, y=0.1712702214717865, z=-0.30955830216407776.
- Offset 17: x=-1.7479113340377808, y=0.17126822471618652, z=0.2670462727546692.

The entrance change created a physical pocket, not a low-speed scoring bug. No teleport or velocity rescue was added. The full-length candidate is rejected.

Further concern: the outer U arc leaves less than a ball diameter against the rear cabinet. An airborne ball could land in that gap. Any successor must have real visible backing that closes this inaccessible pocket, and must pass airborne exterior-entry testing.

## Upper-only successor

Work in progress, not accepted. Remove the new lower rails beside the left-middle standup assemblies. Try a short guide beginning above those targets, using the existing left cabinet as the outer guide until the rear U-turn. Close the rear U/cabinet pocket with a visible solid backing. This must still demonstrate repeatable real flipper shots and a genuine launch-to-loop completion, not only positioned entry fixtures.

### Upper-only result: rejected / design on hold

The successor removes all new guides below Z=-2.60. A short inner folded guide leads to the U-turn; the existing cabinet bounds the outer straight. Only the upper half-circle has a new outer wall. A visible steel solid fills the narrow space between the outer U and the rear cabinet. The folded mounting foot is part of the exact closed wall contact mesh; the previous visual-only flange/screw set was removed.

This avoids claiming a lower standup pocket is solved by rescue code. It does **not** yet form a usable shot:

- Positioned upper entry at x=-2.22, y=.175, z=-2.65: speed 14 completed; speed 10 reached stage 2 but did not pass the exit gate; speed 20 reached only stage 1 before returning/draining.
- Positioned right cradle: start x=1.6, y=.18, z=2.8 with downhill speed 2, hold right for 500 ticks, release 72 through 88 ticks inclusive, then hold right. All 17 conditions reached no loop entry gate and completed no loop.
- No successful natural launch-to-loop trajectory has been demonstrated for the upper-only candidate.
- Exterior airborne/trap verification, a complete regression suite, visual/browser verification, and final triangle-budget acceptance were **not** run for this rejected successor. Existing loop unit fixtures still reflect an earlier path and are not a passing release gate.

Reproduce the focused diagnosis from this experimental checkout:

```sh
node scripts/pinball-loop-candidate-audit.mjs
```

The script deliberately exits with failure because the candidate is not accepted. It prints individual results and clearly distinguishes injected fixtures from natural gameplay. Do not weaken the acceptance criteria to publish this layout.

**Decision:** preserve the published v24 physical table and ship the independent mission work separately. Pause the loop design rather than adding invisible guidance, teleporting the ball, or claiming unreachable geometry is a game feature. A future attempt needs an explicitly designed shot entrance with adequate physical room, potentially a deliberate layout revision, before detailed modeling or scoring integration.


## Relocated-target candidate (current, acceptance pending)

This is a separate layout, not a claim that the rejected designs passed. The mouth is centered at (-1.235, 1.40), inner width .64, with a left/up tangent derived from the measured right-flipper shot bundle. It narrows smoothly into the left loop. The two left-middle standup centers move to (-1.35, -.55) and (-1.35, -1.20), preserving their face angle. Their endpoint definition is a.z=-.225, b.z=-1.525 because the two centers are at one-quarter and three-quarters of that segment.

All folded guide feet share the physical closed mesh. The rear U/cabinet gap has real visible backing. Long exterior-guide gaps, wire support interactions and natural gameplay are independent acceptance checks; entry success does not establish their safety.

The three loop gates use actual crossing segments and tangent-normal sections. The return gate is in existing lane A, not the narrow U itself. Its allowed center half-width is .625 minus rail radius .035 minus ball radius .135 minus safety margin .01 = .445. This wider A region is allowed only after the U apex has been traversed. Airborne, reverse, timeout, neighboring-lane and off-route passages are rejected.

Current focused checks:

```sh
node --test web/js/pinball/loop.test.mjs
node --test web/js/pinball/ramp.test.mjs web/js/pinball/lower-layout.test.mjs web/js/pinball/reference-targets.test.mjs
```

The first group explicitly labels positioned mouth/cradle setups. Five adjacent right-flipper timings must complete using normal flipper motion after the initial fixture setup, with no playing-state position resets. This remains distinct from a full natural-launch game. The existing ramp, return/refire and individual target regression groups passed 34/34 on the relocated layout before the final A-gate dimensional correction. The latter changes scoring detection only, not collision geometry.

Publication remains blocked until the exterior/airborne trap audit, natural launch-to-loop proof, complete regression suite and visual review agree. Do not use the historical rejected-candidate script as this candidate’s acceptance gate.

### Current physical refinement (candidate 7, still pending acceptance)

The straight channel moved from x=-2.22 to -2.10, with U radius .40. Independent geometric bounds show no straight position can leave a ball-width passage on both sides: the wire support side requires center >= -2.127, while the upper carrier side would require center <= -2.378. Thus the carrier-side pocket is deliberately occupied by a visible common support, not represented as an accessible alley. The upper support is one sloping rear service plate; its left edge is outside the guide contact face, at x=-1.90. An earlier coincident edge at -1.92 interrupted otherwise valid loop shots and was rejected. The scoop-side common support has a continuous diagonal rear edge ending at the right rear of the scoop. Airborne drops onto this support remain an independent acceptance check.

The middle standups move a further .10 toward the center to leave a ball-width gap beside the guide. Their ornamental spanning bar has been replaced by individual fittings recessed within the existing strike-box envelopes, so the open inter-target gap has no visual-only brass obstacle. No new contact handles are inserted for these fittings.

Candidate 7 passes the nine positioned mouth shots and five adjacent right-cradle release timings. The previous candidate 6 passed twelve legal drop/slow fixtures without a three-second stop; two historical starts now overlap the deliberate support and are not counted as passes. Candidate 7 requires its own independent audit, additional support-top drops, and natural launch proof. These preliminary numbers do not imply publication readiness.
