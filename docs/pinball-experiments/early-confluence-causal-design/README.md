# Early confluence: bounded causal/design milestone

**No new geometry/trigger candidate, no adoption, no production edits.** Work tree base68766c6 contains adopted bumper/flipper supports. All lane comparisons deliberately use frozen696c646 baseline and early-confluence source map523bce, excluding later support changes. The original early-confluence failed gates remain failures. No full54, full regression or actual-phone/human validation here.

## Conclusions first

1. Keeping common body/collider identities does not restore the old ramp result. Ordered diagnostic still fails original release82 and loses84 in the additional timing probe. First tick difference is not an observed new-guide collision. Measured mass, inertia, launch, gravity, CCD and materials do not explain it. Do not call this a proven solver bug or keep retrying arbitrary orders.
2. A floor switch bounded by actual new OUT rails can classify recorded arrivals without widening a magic world-X gate. This remains a design proposal, explicitly different from the old any-inside/y<.5 contract. It cannot fix the existing uncollided housing/rod, which intersect every missed-save trajectory.
3. Render growth is principally per-segment capsule stock, not real supports. Preserve supports and contact geometry. Batching alone reduces calls, not triangles.
4. Next work should prioritize a robust ramp/receiver acceptance margin and a physically retracted/contacting save mechanism with an explicit capability comparison. No further order retries, arbitrary trigger expansion or geometry tuning was performed.

## Frozen maps and ordering control

- Original baseline map SHA256 `ad77ee2048258420be753421a54bfdef22cae2d386e893864d8aea67a59bcd85`.
- Original early-confluence map SHA256 `523bce979d5a3adc53ec0531a7ad8766650f3b6004a63512dbd86480cc6412e8`.
- Ordered diagnostic map SHA256 `67fa19af22c9e92c24311cdc475a2574b5795be341fd176324a64e4e9c2bab12`.

Exact inventory comparison:1,373 common colliders,223 new candidate colliders,7 removed baseline colliders. No rigid bodies added/removed. The diagnostic constructs the complete baseline in original order, including ball/reset and existing final attachments; appends223 candidate colliders; then removes7 obsolete shapes. Common handles are retained. Every created world asserts final candidate collider multiset equality (shape, position, rotation, sensor, friction, restitution, parent and event identity). New shapes are196 capsules,21 cylinders,6 boxes, including one sensor. It retains baseline renderer and is intentionally unsuitable for adoption. This is an insertion/removal-lifecycle control, not proof of pure insertion-order causality.

Original archived upper-lanes/ramp target bodies and all preceding histories execute unchanged. Upper-lanes has28 preceding game worlds; ramp has15 plus3 standalone worlds. Both baseline80–84 pass. Original candidate and ordered control pass80/81 and fail82 traversal; assertions abort83/84. Instrumentation changes only test-registration import; later tests are not scheduled. Configuration audit separately executes the entire original upper-lanes file, observing rather than changing state.

Additional identical ascending75–90 protocol (separate fresh process per map), with unchanged launch/capture/release/refire inputs:

- Baseline ramp/capture/refire intervals:76–78,80–84.
- Original candidate:76–78,80–81,83–84.
- Ordered control:76–78,80–81,83 only.

82 remains a new hole; ordered control additionally loses84. These integer samples are not mathematical continuous-aim proof or a replacement for original failed tests. No force/key/score/test expectation changed.

## First divergence and configuration audit

At matched upper-lanes world30 (release82), all three complete built configs, launch records and tick0 state/config are exactly equal. Default launch power1, identical p/v/spin and flipper poses. Actual ball mass.07999999821186066; principal inertia.0005832000751979649 on each axis; damping.1199999973/.150000006; CCD enabled, softCCD0; inverse mass12.5. Gravity=(0,−97.46939904187322,7.218402925910572), timestep.008333333767950535,8 solver iterations, maxCCDsubsteps1. Shapes/materials/combine rules for ball and both floor cuboids match. Explicit integration/inertia getters were audited in fresh worlds as a supplement; values exactly match across maps. Built gravityScale0 changes identically on launch. `contract-analysis.json` contains selected matched configs and equality checks; full raw configs are compressed.

Baseline versus either candidate first differs at tick1 in vz:−22.720407485961914 versus−22.72040557861328, while position/spin still match. Recorded contact is only unchanged floor: normal impulse.0682242811 versus.0698573887, same normal and separation. Original candidate versus ordered remains physically identical through tick563; first difference tick564 during release. Both original-history families show this pattern. No attribution to a specific new-guide hit, particular solver defect or altered force is justified.

Exact-shape `Collider.projectPoint` queries screened all222 added solids against measured ball-center endpoint segments for boot ticks0–2, subtracting r.135. Sampling≤.001, with conservative nearest-sample distance bound.0005. Worst sphere clearance4.292736951 (linear-segment conservative bound4.292236951); nearest is the new divider capsule around(−1.90,.22,3.30549). No broad misplaced added solid is near the boot sweep. This bounds linear interpolation of measured endpoints, not an unseen nonlinear CCD trajectory. Sensor excluded from solid screen. No world stepping in this screen.

## Rail-relative detector design, not implementation

StationZ3.32 is the existing lamp station and a straight part of the new OUT corridor. Divider centerX−1.90, outer rail centerX−2.33, stockr.020 give inner-face footprintX[−2.31,−1.92]. Proposed switch is flush with actual board topY.04, so a r.135 ball must reach centerY≤.175 and remain above the board underside classification; unlike the oldY<.5 gate, this excludes airborne bypass. The initial exploratory raised-top.058 assumption was discarded in favor of actual board-top flush geometry; no physical variant was built for either.

Proposed rule: swept forward crossing of this rail-relative station; center belongs between OUT rail inner faces; sphere reaches the flush floor footprint; existing charge>0, tilt guard, event consumption and upstream impulse remain unchanged for a detector-only comparison. Keep one stored earned charge, consume once through existing side-save event, do not double-award or change power. A moving-contact actuator would be a separately specified and validated behavioral contract and must not add the old direct impulse as well.

Offline recorded crossings:20/20 candidate charged mouth fixtures satisfy this strip, all8 recorded IN fixtures excluded, and recorded common-state wire return excluded by lane ownership. Explicit INX−1.72, outsideX−2.5, airborneY.21 and reversevz−2 predicate checks are excluded. Air/reverse checks are predicate-level examples, not new dynamic tests. Charge is synthetically supplied, not proof of natural earning. Repeated crossing/tilt/charge lifecycle implementation is untested because no detector was implemented.

The same strip covers only1/20 baseline same-coordinate first crossings: baseline approaches mostly run outside its outer rail, while new route bends between outer rail and divider. Baseline trace samples are.1s and interpolated; candidate is everytick. The old wide gate covers different physical routes. Do not call a new single footprint baseline-equivalent or count baseline misses under this proposed rule as regression tests. Forward crossing also differs from legacy activation for an initial state already inside a zone. Strip depth, switch mechanics, shared visible contact geometry and acceptance of these contract changes remain unresolved.

## Housing and actuator boundary

Root exact rendered-triangle audit is preserved in `housing/`: rounded housing boundsX[−2.225,−1.975],Y[.035,.165],Z[3.57,3.99] (bevel expands nominal dimensions); rodY[.07,.19]. Every recorded window in all9 missed cases intersects BOTH meshes as r.135 spheres. Housing center-to-surface-minus-radius minima≈−.129..−.130; rod worst−.134607. This is surface intersection, not signed volume penetration or physical simulation. Those visible objects have no corresponding contacts. Detector coverage alone cannot make the save mechanically complete.

Prior design-only proposal for a bounded-contact, finite-mass retracted actuator is included, unimplemented. Root low-shoe preflight is conditional: a convex contact at/below crestY.060 touching centerY.175 has normalY≥.85185 and horizontal normal≤.52378. Illustrative friction cone cases warn against promising the old purely horizontal velocity change with a low fixed shoe. They ignore simultaneous contacts, finite-duration gravity, spin and changing contact states. These are not a runtime result, selected material, universal no-go theorem or approved dimensions. This diagnostic keeps impulse unchanged; no actuator was implemented.

## Render accounting

Unbatched source meshes: baseline1,607 /471,132 triangles; candidate1,818 /518,936. Exact delta47,804 equals installed45 triangle delta (454,132→501,936), though absolute unbatched counts differ from rendered/culling/batching counts. Left rail changes52 two-point TubeGeometry segments×16 triangles to246 closed capsule segments×192: **+46,400 triangles (97.1% of growth)**. New frame/stud/seat solids contribute2,076; replaced old support/mount fittings subtract672: net+1,404. Existing right rails remain52×16.

Current capsule stock12 radial/4 cap uses192 triangles per segment. Helper supports merging several capsules, but candidate invokes it per segment. A later local same-material merge can preserve exact vertices and solids while reducing calls; it cannot meet triangle budget alone. Any later radius-aware local tessellation proposal must quantify inscribed/silhouette deviation, remain closed and correspond to actual capsule stock. Do not change global wire/shooter tessellation or remove supports to pass. No such optimization implemented.

## Restore / reproduce

Run from repo root:

```
python3 docs/pinball-experiments/early-confluence-causal-design/restore.py artifacts/pinball/confluence-ordered-restored ordered
python3 docs/pinball-experiments/early-confluence-causal-design/restore.py artifacts/pinball/confluence-original-restored original
D=artifacts/pinball/confluence-ordered-restored
MODE=candidate FAMILY=upper-lanes node --import ./$D/diagnostic-loader.mjs --test web/js/pinball/upper-lanes.test.mjs
MODE=candidate FAMILY=ramp node --import ./$D/diagnostic-loader.mjs --test web/js/pinball/ramp.test.mjs
MODE=candidate node --import ./$D/diagnostic-loader.mjs $D/dense-timing.mjs
MODE=candidate node --import ./$D/archived-loader.mjs --import ./$D/config-hook.mjs --test web/js/pinball/upper-lanes.test.mjs
MODE=candidate node --import ./$D/archived-loader.mjs $D/settings.mjs
```

Repeat with original-restored and/or MODE=baseline. MODE=candidate means the selected restoration variant, identified in restored-variant.json. No production files overwritten. Restore verifies hashes and refuses existing targets. Archived loader reads exact local test-sources regardless of current production tests. Original scripts/config-loader retain historical paths; use archived-loader for independent config reproduction. Historical analysis/build/inventory scripts reference original artifacts; their compact results and hashes are preserved without requiring a rerun. Dependency hashes and selected82/84 raw traces included. Full other traces remain artifact references. No need to rerun long diagnostics merely to review this packet.
