# Early S-confluence: unadopted

One bounded candidate, no production changes or expectation/force/key/score tuning. Base is **696c646c5843f7b5db3179c170347e57a9c85e73**, including the adopted bumper mount, excluding later flipper underside commit6b44fe. Frozen source-map SHA256: **523bce979d5a3adc53ec0531a7ad8766650f3b6004a63512dbd86480cc6412e8**. Prior late tangent patch rejection remains valid; this is a different, earlier confluence, not an adjustment to that patch.

## Result and failed gates

- New IN mouth(-2.12,.175,1.1), speeds .2/2/4/8: detection, held capture and actual-coil refire **4/4**. At2/4/8 the existing sling activates before IN, so this is not passive-guide-only recovery. Baseline same coordinate was OUT, not a same-lane baseline. Old capture-start fixtures retain baseline2/4 success (.2/2), not4/4. Same-state wire return checkpoint matches baseline exactly, including p/v/spin/contact state; final state also matches exactly. Local recovery does not prove whole-game invariance.
- Unchanged original ramp and upper-lanes target bodies: baseline80–84 pass; candidate80/81 pass and **82 fails ramp traversal**. Original abort means83/84 unexecuted there. Preceding worlds preserved: upper-lanes28 game worlds; ramp15 game worlds plus3 standalone worlds. Only test registration import is redirected to observation, and tests after target are not scheduled. This is not a full regression run.
- Additional frozen-geometry probe: delays75..90, ascending identical world creation protocol in separate processes. Ramp/recapture/refire success intervals all coincide: baseline **76–78,80–84**; candidate **76–78,80–81,83–84**. Candidate82 is a genuine new hole, not a shifted equal-width interval. Both also fail75,79,85–90. Integer-adjacent samples do not establish continuous timing or human difficulty. This probe does not replace the original failed assertions.
- OUT/save50: all50 starts legal, no stalls/live resets. Charged non-tilted fixtures **11/20 save and return upstream .5**, versus baseline20/20. All nine misses remain charged and drain. Uncharged/tilted do not activate save. Separate OUT20: new centerX−2.515 uncharged4/4 drain; charged3/4 save (speed.2 misses); tilted no activation. OldX−2.12 is now IN, all8 normal starts detect IN and no side-save.
- Render budget **fails**: installed45 candidate501,936 triangles /897 calls versus exact696c646 baseline454,132/688. Existing budget500,000 triangles already exceeded before later flipper changes. No new full54/full regression/lint/actual phone/human tests; no adoption.

## Geometry and feasibility

Divider startsX−2.30,Z1.35, straight to2.35, then paired circular arcsR.50/theta53.13degrees toX−1.90,Z3.15; original receiver downstream remains. OUT uses true normal offset.43, tightest inside radius.07, not horizontal-offset pinching. Replaces support192 with a shared8-part frame; retains row240. Four r.010 board-to-guide studs with flush bearing seats and underside washer/nut, and two wall rail seats give26 new shared parts. Definition/source map specifies dimensions and placements. This is geometric load-path construction, not strength certification; inherited stable mounts/contact omissions remain.

Old measured late-confluence wire/entry separation atZ3.45 is .1164–.2708, below .310 required for a .020 separator between two r.135 swept spheres. AtZ3.25 worstspeed8 margin only.0096. This bounds those measured paths, not every possible spline. Earlier S candidate screens12 saved return sweeps plus original capture81 with zero additional guide penetration; minimum new-support clearance on capture.35749 and return.51739. Collider queries include full sphere/support geometry, not just centerline.

Intended offset.18 route is NOT universally clear:79/899 IN samples clip rounded sling, worst−.008232. Separate cross-section screen81 sections×Y.169/.175 found a legal offset at every section; fixed offset.16 minclearance+.010973. Offset.15 min+.001583, .17 min+.001347, .18 invalid32/162 sections. OUT899 route samples clear, min+.036001. These route/cross-section clearance values exclude sensors, the ball itself, and intended floor collider (cuboid centerY−.04). AtY.169 the sphere is below nominal resting centerY.175; positive obstacle clearance does not mean zero floor penetration. These finite geometric checks are not proof a highspeed ball follows that corridor.26 new-part mesh/collider matching includes actual center/shape checks; polygonal rendered stock versus analytic collider approximation remains.

## Why nine charged OUT cases miss

Every-tick repeat preserves the original50 outcomes exactly (excluding trace sampling). All nine start atZ1.1 inside intended OUT mouth, move continuously through its approach, and remain between interpolated rail/divider centerlines at all sampledZ1.35–3.72 ticks. They are not late injections behind a moved rail, not old-IN coordinate fixtures, and not airborne bypasses. All crossZ3.45–3.72 near floorY.170 with positivevz, but X remains greater than−2.08. The unchanged save law requires centerX between−2.62 and−2.08, Y<.5 and forward motion. It is a coordinate gate, not a contact sensor. WindowX spans−2.079158 through−2.006810 across misses; closestcase is only.000842 beyond the boundary. No eligible trigger sample occurs. Compact per-case states in `evidence/save-classification.json` show the exact windows. Centerline lane classification is not a claim of zero sphere penetration/contact.

Misses (X:start speed): −2.545:2/4/8; −2.515:.2; −2.485:4/8; −2.46:2/4/8. Baseline same-coordinate fixtures save20/20, but its rail geometry differs. These are genuine coverage failures along this new OUT route with synthetically supplied charge. Natural earning and a naturally played approach have not been established. A later design must register physical route, visible save housing and trigger together, rather than simply claim all charged failures came from invalid fixtures or enlarge a trigger arbitrarily.

## History/causality limits and next scope

First candidate/baseline original-history physical divergence is boot tick1: vz−22.72040557861328 vs−22.720407485961914 (~1.9e−6), before these fixture routes. Delay82 release shot vx18.43730356/vz−26.07230726 versus baseline18.43843675/−26.07210528. Candidate enters stage1 but never reaches stage2. Shared-state recovery cannot explain or excuse this new ramp hole. No particular new rail contact, solver bug or changed force is proven causal. Preserve original-history and adjacent-range evidence in any later proposal; do not relabel historical80–84 as a fixed user timing requirement, nor replace the failed82 test with another passing delay.

Next scope must jointly resolve save route/housing/detection, preserve a connected useful timing range, and reduce render complexity while retaining real supports/contact stock. The sling-assisted IN recovery and tight .07 inside curvature need explicit acceptance/review. No additional random geometry variants or54 were run.

## Visual incompleteness

Parent inspected installed45/closeup against neon reference: existing right short lane, short diagonal lower receiver, exposed crosshead, heel overlap and mismatched OUT print/save housing remain. Early bend lies near/under sling instead of producing reference long parallel lower lanes. IN label/insert needs registered-flow review; old save body occludes OUT printing. No full-reference match claim. Mobile390 image is only a screenshot, not actual phone performance/readability validation. Selected images use exact696c646 map, not current6b44fe.

## Restore and reproduce

From repo root, run `python3 docs/pinball-experiments/early-confluence-unadopted/restore.py artifacts/pinball/early-confluence-restored`. It refuses an existing destination, verifies all packet hashes, restores maps/scripts and checks decoded payload hashes. Root-relative imports work at this artifacts/pinball depth. Do not write these maps into production. Runtime dependency hashes are recorded separately; prior raw sweep inputs needed by static.mjs are referenced in its script and raw reference index, so rebuilding static requires those historical artifacts. Frozen results are independently preserved compressed.

Use **--import**, not --experimental-loader:

```
D=artifacts/pinball/early-confluence-restored
MODE=candidate node --import ./$D/diagnostic-loader.mjs $D/in-control.mjs
MODE=candidate FAMILY=ramp node --import ./$D/diagnostic-loader.mjs --test web/js/pinball/ramp.test.mjs
MODE=candidate FAMILY=upper-lanes node --import ./$D/diagnostic-loader.mjs --test web/js/pinball/upper-lanes.test.mjs
MODE=candidate node --import ./$D/diagnostic-loader.mjs $D/dense-timing.mjs
MODE=candidate node --import ./$D/diagnostic-loader.mjs $D/save-sweep.mjs
MODE=candidate node --import ./$D/diagnostic-loader.mjs $D/save-sweep-detailed.mjs
MODE=candidate node --import ./$D/diagnostic-loader.mjs $D/out-compare.mjs
MODE=candidate OUTPUT_DIR=$D node --import ./$D/diagnostic-loader.mjs $D/replay-control.mjs
```

Repeat MODE=baseline for paired protocol. Original test bodies are archived and compared byte-for-byte with696c646, so current production expectations are not used or changed. `build.mjs` is historical construction provenance with prior-frame dependency, not the restoration path. `evidence-references.json` hashes all original artifacts, including omitted full traces. Selected original82 and dense82 traces and full local save/common-state records are included compressed. Verification records a rejected wrong-loader detailed attempt transparently; its outputs were Trashed and are not evidence.

The historical replay-control script retains a generic socket-disabled limitation string from its earlier diagnostic. In these baseline/candidate runs `disabledCollider` is null: no contact is disabled. Read mode and actual disabledCollider fields rather than treating that inherited string as an action performed here.
