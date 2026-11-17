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

### Candidate 8: formed housing and legacy-path compatibility (pending final audit)

Candidate 7 did **not** pass the full suite. The subsequent fixes are physical, not weaker legacy assertions:

- U center X=-1.675 and radius=.425 align the outlet at lane A's existing X=-1.25. Its original 27 ground-entry cases are preserved.
- The rear gap filler is now a closed crowned housing, with a smooth rising upper surface, rolled U lip and countersunk fixing stock. Rendering and contact share the exact geometry, with three material groups. The flush `A RETURN` marker identifies the destination without another raised obstacle.
- The former strongly curved outer mouth obstructed the left OUT kickback. A straight outer approach with a limited .015 flare preserves that uphill path; the original inner curve still aims right-bat shots. A .07 flare was rejected because it narrowed the gap to the existing wire support at Z=.7725.
- The traversal corridor is derived from both real wall contours, not a fixed distance from the old symmetric centerline. Ordered mouth/apex/A gates, height checks, reverse and timeout rejection remain.
- A self-crossing first segment in the scoop support and a zero-thickness rear edge in the upper support were found by new mesh tests. All loop contact pieces must now be finite, outward, closed and free of zero-area triangles.
- A broad upper backing created a narrow passage beside the bumpers. A short partial backing instead made a gravitational pocket where it joined the oppositely sloped carrier rail. The current solution is a thin continuous case, X=-1.90..-.72, rear edge Z=-2.45..-2.31, with a top descending laterally .28→.17. The original 80 slow support fixtures, including unchanged skip counts, passed this case before the final rear-housing material-group reorder. Re-run them in the final full suite.

The artificial angled mouth fixtures are not all equivalent to actual bat shots. On the current outer approach, speed 18 at offsets -.025/0/.025 and speed 22 at offset +.025 return to a **normal drain**; speed 22 at offsets -.025/0 and speed 26 at all three offsets complete. Both outcomes require no playing-state position reset, no out-of-bounds drain and no local oscillation. This classification changes only the new experimental fixtures. The old kickback, ramp, target, support and beginner tests remain unchanged. Five adjacent actual right-flipper release timings after the explicitly positioned cradle must still complete independently.

Candidate 8 needs its own independent drop, airborne, natural-game and visual results. Candidate 7's successful natural games are historical evidence, not acceptance of the changed geometry.


Candidate 8's final physics/code result was **276/276 full tests passed**, ESLint zero errors with three pre-existing CSS warnings. Independent natural games completed without new traps. It was nevertheless **not accepted for publication**: real Chrome desktop/mobile review found the rectangular outer footprint still read as a plate with an arc highlight, and the small outlet text was illegible at normal play size.

### Candidate 9: actual horseshoe outer silhouette (pending acceptance)

Only the rear housing and flush outlet graphics change from the candidate 8 physics baseline. The solid outer boundary is now a half ellipse, not a rectangular back/parallel sides hidden by trim. Its X radius is the U exterior radius plus .017; its Z radius is derived from the shared cabinet rear inner face minus the .009 rolled hem. The outermost hem thus meets the cabinet at its central rear point, while both sides curve toward open field. Crown height, including trim, remains below the shared cabinet wall top. Both inner and outer rolled edges and the closed shell are in the shared contact mesh. The outlet uses two broad brass chevrons and a large round A insert, flush to the playfield, instead of a tiny text label.

The newly opened rear-side wedges require new ground/airborne drop queries and natural gameplay evidence. Candidate 8 results are not silently reused for the changed outer shell. Mesh integrity, old lane/ramp tests, real bat timings and the full suite must run again before publication, followed by native-size visual review.


Candidate 9 final scoring contract: the first traversal switch is the shared narrow throat at (-2.10, -.70), upward direction, with center half-width .18 minus ball radius .135 plus .012 contact tolerance. Simply crossing the wide mouth is insufficient. Both an aimed bat shot and a legitimate left OUT kickback can earn the same U→A passage score after this throat; reverse throat crossings cancel the traversal. This changes only the new loop detector, not kickback forces or any legacy physics assertions. The final candidate also moves both fixing seats into the wider central arc so the complete hardware silhouette fits the ellipse rather than protruding beyond it. After these final changes, loop/gimmicks/upper-lanes focused tests passed 19/19; independent evidence must identify this final source hash.
