# Left long-lane and frame-support prototypes: not adopted

Base runtime: `c87f117a9c5f5cfab33e4817b8b720a790ab8b0e` (runtime identical to adopted `1ba467c`). Neither prototype changes production. This packet preserves two isolated implementations, not a completed mechanical redesign.

## Decision

V2 has a clear floor-level OUT route and working local legacy-save returns, but fails to preserve the complete game. Full regression is **200/212**, including two genuine same-ball ramp-return/capture failures. In 54 identically controlled games, ramp traversals fall **61 to 15**. The new IN route also misses its old sensor. These failures prohibit adoption; higher aggregate score is not an adequate substitute for the lost route and control behavior.

The original reference still calls for better integrated low supports, long readable paired lanes, credible mechanisms and matching contact geometry. The previous gear printing is not mechanical completion. Neither this packet nor the static geometry proves structural strength or physical safety.

## Implemented structures

- Left divider starts at X -2.30, with a radius .995374870 arc joining the exact old receiver tail. Both original flipper pivots, bat dimensions and 23 tail points remain unchanged.
- Left OUT follows the cabinet side, then a .430 offset arc and a tangent quadratic to the old outer tail at Z 4.30.
- New lane attachment parts share their box/cylinder definitions between meshes and contacts. Rendering uses 24-sided cylinder approximations, not exact analytical round surfaces.
- V1 moves support row 240 onto an actual exterior frame plate/top strap/drop clamp with its crosshead extended to the frame. V2 also moves row 192. The required two-support set was derived from a scan of all left supports, rather than successive arbitrary changes. The closest untouched upstream support is separated from the route by .107476 in Z even after adding its largest foot radius and ball radius.
- V2 has 1484 colliders and 54 shared attachment meshes/contact parts. Actual mesh/contact centers agree within about 2.22e-7. Right paths and mounts, old lower constants and retained old left mounts are unchanged.
- Save axis moves to X -2.515, body center Z 2.75, trigger X (-2.575,-2.455), Z (2.42,2.69). The original charge, tilt and direct impulse law remains. This is a placement experiment, **not a finite-work physical actuator**. Its old visual housing still lacks contact; making that floor housing solid would block the lane. A real actuator needs a genuine board opening and a passive uncharged route.

## Static and local dynamic results

V1 source SHA256: `b016fbb1dfe6a09ad06787548d224c6909deddadd179019579bdf343b37ba576`.
V2 source SHA256: `07a6cbc5fc9d4dce4ea1d40d859340c6b56c63e52a16d09fc9dc9380da9d9607`.

V1's intended OUT centerline overlaps the retained row-192 post by up to .03699985. This is not a proof that the entire lane is impassable: actual fixture balls can deflect around it. V2 removes that particular conflict. Its 757 floor centerline samples are all legal, minimum query gap +.0208006. A query-based between-sample bound estimates +.0163693, but query numerical error is not independently bounded. This is not an all-lateral-position or airborne-clearance guarantee. Existing elevated crossheads remain real obstacles.

Paired fixtures use identical world creation order and retain old coordinates as well as new ones:

- Original-coordinate/new-coordinate OUT diagnostic: 20 legal starts in each version, no stalls or live ball-position resets. V2 fires four new-OUT charged cases; old X -2.12 now belongs to IN and no longer fires. Coordinate meaning changed, so the count alone is not a save regression measure.
- Five fixed OUT positions by four speeds, charged/uncharged, plus ten tilt cases: 50 legal starts in baseline and V2. Charged return 20/20 in both, with one event each; no uncharged/tilted activation, stalls or live resets. “Return” here means at least .5 upstream from the firing point. It does not prove natural mission earning or equal game-wide rescue ability.
- Old capture starts at X +/-1.72, Y .18, Z 2.8, with release delays 30..70 in steps of 5 and 80..84: 28/28 capture in both; left refire 11/14 and right 8/14 in both, with identical successful delay sets. Capture timing and subsequent trajectories differ. This coarse sample does not establish a continuous aiming range.
- New IN entrance X -2.12, Z 1.1, speeds .2/2/4/8: only speed 2 settles into a held capture, then refires. The other three touch/cross the held bat and drain. All four miss the unchanged old IN sensor. By contrast, the old capture-position fixture produces IN events in all four cases. Existing narrow-fixture success therefore does not establish the new upstream route.
- Natural launch .55/.65/.75/.85/.925/1 reaches the field and drains in both. Weak .1 returns to the shooter and can relaunch without repositioning. Higher-power scores/trajectories differ.

## Full regression and 54-game comparison

Fresh baseline: 212/212. V2: 200 pass, 12 fail, no skip/cancel. Lint of all 39 virtual runtime source files has zero errors and the same three pre-existing CSS warnings as baseline. All failed assertions remain failed, with no expectation edits.

Two functional failures occur after a real ramp traversal, when the same ball drains instead of being recaptured. The original start is legal. Remaining failures concern structure counts, old fixtures/coverage and old OUT coordinates that now lie in IN. Some old save fixtures physically overlap new attachment parts, so those failures cannot substitute for tests of the relocated save. See `evidence/regression-summary.json` and the unchanged test log for exact assertions and classifications.

54 games use the existing fixed-input controller, six launch powers and nine release delays, with the same 180-second cap and case order. This is scripted control, not a human difficulty rating.

| Measure | Baseline | V2 |
| --- | ---: | ---: |
| Finished games | 54 | 54 |
| Stalls / live resets / zero-score games | 0 / 0 / 0 | 0 / 0 / 0 |
| Ramp traversals | 61 | 15 |
| Controller release-stage entries | 284 | 207 |
| Actual coil events | 815 | 805 |
| Aggregate score | 169700 | 174225 |

Ramp counts by launch power .55/.65/.75/.85/.925/1 are 13/7/4/14/18/5 before and 1/6/4/0/2/2 after. The .85 group never reaches the controller's settled-release stage. The preserved flippers and tail do not preserve incoming speed, direction or return behavior. No single causal explanation is asserted for all 54 cases.

## Visual and browser checks

Seven matched views were captured for each prototype/baseline: installed 45/10/90 degrees, lower closeup/side/underside, and 390px mobile viewport. V2 actual installed 45-degree render: 472764 triangles, 763 calls (baseline 450844 / 685). Runtime browser errors were absent. The new frame is connected visually, but exposed transverse beams, asymmetric paths, inherited heel overlap and misregistered lane printing/sensor remain. The view is not reference-complete.

V2 also passed real scripted desktop keyboard and mobile CDP touch launch/flipper controls, pause/resume and restart. Mobile viewport screenshots and emulated touch are not physical-phone testing. Human play, physical devices and mobile performance remain untested.

## Reproduction and preservation

`node docs/pinball-experiments/left-lane-frame-unadopted/restore.mjs --variant v2 --verify-only`

Use `--variant v1` for the initial support version. To reconstruct a fresh isolated snapshot, replace `--verify-only` with `--output artifacts/pinball/your-new-name`. The tool reconstructs the exact baseline from the immutable Git commit, overlays only changed modules and verifies exact source-map and vendor hashes. It refuses production paths, original frozen destinations, invalid options and differing existing output files. It does not execute archived build scripts or apply the candidate to production.

Restored `loader.mjs` and `baseline-loader.mjs` can be used with Node `--import` for repository tests. The V2 loader was adjusted only for the restored directory depth; its source map remains byte-identical. Both variants passed exact reconstruction and idempotence checks. Restored V2 assembled 1484 actual colliders without stepping. Temporary restored copies were moved to Trash.

Compact evidence retains all scenario rows while omitting large traces and repeated manifold data. Original trace/image/source locations, byte counts and hashes are in `evidence-references.json`; those raw files are not embedded here. Archived QA scripts in `evidence/` retain their original artifact-relative paths and are provenance, not automatically executed restore payloads. The natural controller is the repository script at the base commit. No fresh continuous dense scan or ramp-entry-120 run was made after V2 failed its full same-ball return gate; those are still required for any later adoption.

Next work should address the incoming IN/ramp-return velocity and receiver relationship, and relocate a real visible IN detector to the actual route. Do not fix only the score detector and treat that as resolving the failed capture or the 61-to-15 ramp reduction. Keep stable gameplay intact while evaluating the next isolated change.
