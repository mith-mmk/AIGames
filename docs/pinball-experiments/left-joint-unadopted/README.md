# Welded left joint and confluence IN: not adopted

Frozen source SHA256 `2d9c3a9cae7eba29d21dc755645c752e2b23345d0a64de01b1f4750bdeef611e`, based on V2 `07a6cbc5…`; baseline c87f117 has the stable 1ba467c runtime. Production and test expectations remain unchanged. This packet records a failed isolated proposal, not a finished mechanism or reference match.

## Decision and distinct results

- **Local same-state return recovered:** with the saved legal wire-return p/v/spin and held bat pose, this candidate captures and refires (actual coil [1,0], no live reset). Checkpoint matches the earlier socket-disabled control. This does not restore engine contact caches or prove all histories equivalent.
- **Detection recovered, upstream capture did not:** the moved IN sensor detects all four long-mouth speeds (.2/2/4/8), but **0/4** settle into held capture; all touch bats and drain. The old capture-position starts detect and capture **4/4**, then refire. V2 had captured long-mouth speed2, so there is a remaining/regressed physical approach problem. Detection is not mechanical completion.
- **Full unchanged regression: 199/212 pass, 13 fail.** Three genuine release81 ramp-traversal failures occur in physics, ramp and upper-lanes tests. The lower-layout five same-ball timings pass, but do not waive the separate histories. The other ten failures concern two structural counts, four old fixtures now penetrating solids and four old OUT coordinates now in IN. All13 gates remain failures; classification is not a revised pass count.
- **Natural54:** stable61 ramps, V2 15, socket-disabled diagnostic33, real welded candidate27. Every group finishes54 sessions without stalls/live resets/zero-score games. The candidate has238 controller release-stage entries versus stable284/V2 207/diagnostic277. Aggregate score178250 is not grounds for adoption, especially after detector coverage changed. Same controller and case order are not a guarantee of engine-history independence or human difficulty.
- **Socket-disabled33 is diagnostic only:** it leaves visible metal without contact. It demonstrates that one socket contributes to the loss, not that it explains all loss, nor that disabled contacts are an acceptable implementation.
- **Save50:** all starts valid; charged20/20 upstream returns of at least.5, no uncharged/tilted activation, no stalls/live resets. These synthetic charge fixtures do not prove natural earning or a finite-work actuator.
- **OUT20:** all20 valid, no stall/reset. New OUT X−2.515 uncharged4/4 drains with no events; charged4/4 saves and returns>.5. Tilt suppresses activation. Old X−2.12 is now IN: eight normal starts detect IN, never save, eventually drain. Coordinate contracts are explicitly different.
- **Launch:** all six powers.55/.65/.75/.85/.925/1 access the field and eventually drain. Weak.1 returns the same ball to the shooter, then relaunches with position unchanged by launch. Not a human-play result.
- **Lint:**39 runtime modules/CSS, zero errors, three pre-existing CSS warnings.

## Geometry and detector contracts

Only the V2 join mount and left IN sensor/printing changed. A welded r.012 through-stud intersects the unchanged r.020 rail, connects through a board-flush bearing endingY.04 to an underside washer and retaining nut. All four replacement solids have shared mesh/contact definitions; no contact is disabled. Threads/weld microgeometry and structural strength are not simulated. Both flippers, old tail23, right geometry, force laws, input and score laws stay unchanged.

Static actual-collider screening of23 saved initial capture/return histories found a worst piecewise-linear lower clearance estimate+.00450808. This is neither old-rail exclusion-volume containment nor a substep collision guarantee; solver contacts and changed world ordering still matter. OUT757 sampled centerline points remain legal, worst+.03046434. All54 authored frame/lane meshes map to contacts. Full reports explain query/interpolation limitations.

The left IN detector moves to (−1.62,.20,3.55), half-size(.125,.20,.04), after the observed route confluence. One existing event key retains collision-start,100×multiplier,.16s cooldown and no direction restriction. Matching insert and IN legend/ink move. Ball centers aboveY.535 cannot overlap this sensor; lower airborne arrival remains possible as with the original height. Reverse/repeated crossings, all OUT lateral extremes and airborne bypass are not comprehensively qualified.

## Visual/input evidence and inherited limitations

Selected baseline/candidate installed45, lower closeup and390px screenshots are in images/. Actual candidate installed45:472764 triangles/763 calls (stable450844/685). No browser runtime errors recorded. Desktop keyboard and mobile CDP touch launch/flippers/pause/resume/restart pass. **Physical phones, human play, real-phone readability/performance remain untested.**

The OUT print still crosses the actual rail, heel overlap remains, exposed crossheads and broad reference silhouette/detail differences persist. The reference has long parallel IN/OUT below the sling and broader mechanical flipper bases; the candidate remains materially different. Its moved IN legend sits near the elevated wire/sling instead of a long lower lane. Low support crosshead bars remain exposed rather than integrated like the reference brackets. Left IN printing was relocated, not visually certified. Historical visible mount/contact omissions and nonphysical save housing/direct impulse remain inherited flaws. The reference is not completed by this change.

browser-original.json preserves stale copied labels (“adb035e”, “sling gear”, “roof”). browser-provenance.json corrects only provenance: actual visual.cjs used c87f117 baseline and served-candidate-sources.json exactly matches the frozen2d9c map. The original evidence is not silently rewritten.

## Reproduce safely from repository root

1. `node docs/pinball-experiments/left-joint-unadopted/restore.mjs --verify-only`
2. `node docs/pinball-experiments/left-joint-unadopted/restore.mjs --output artifacts/pinball/joint-recovered`
3. `node --import ./artifacts/pinball/joint-recovered/loader.mjs --test web/js/pinball/*.test.mjs`
4. `node artifacts/pinball/joint-recovered/lint.mjs`
5. For local fixtures: `MODE=joint node --import ./artifacts/pinball/joint-recovered/loader.mjs artifacts/pinball/joint-recovered/in-arrival.mjs`; substitute save-sweep.mjs, launch.mjs or out-compare.mjs. Shots use `MODE=joint ORDER=asc` with shots.mjs.
6. Same-state: `OUTPUT_DIR=artifacts/pinball/joint-recovered node --import ./artifacts/pinball/joint-recovered/loader.mjs artifacts/pinball/joint-recovered/replay-control.mjs candidate` (refuses an existing result).
7. Natural54: `node --import ./artifacts/pinball/joint-recovered/loader.mjs artifacts/pinball/joint-recovered/natural54.mjs artifacts/pinball/joint-recovered/natural54.json`.
8. Browser/input: `node artifacts/pinball/joint-recovered/visual.cjs` and `node artifacts/pinball/joint-recovered/input.cjs` using already installed Playwright/Chrome. No installation is performed by restore.

Use baseline-loader.mjs for baseline simulations. For the **diagnostic only**, restore V2 using the previous left-lane-frame-unadopted packet, then preload its loader and this packet's restored disable-one-socket.mjs before natural54.mjs. The diagnostic correctly refuses the real welded candidate, which has no matching socket. Never apply it to production.

Restore verifies packet/vendor hashes and decompresses exact source bytes; it rejects production paths, original frozen names, symlinks and existing output directories. It rebases archived script output/source paths only and never executes scripts. Run scripts only in a fresh recovered directory: some legacy analysis scripts overwrite their result files. static.mjs then verify.mjs reproduce the static assembly screens. swept-check.mjs additionally requires the original raw trace paths listed in evidence-references.json; these large histories are intentionally not embedded. Archived scripts retain their original bytes in scripts/, including stale browser labels; restored scripts are path-rebased copies.

Compact evidence preserves all scenario results, events and selected states while dropping large traces/manifold histories. evidence-references.json retains original paths, sizes and SHA256 for omitted raw evidence. Validation verifies exact restoration without rerunning the long dynamic experiments. No commit or push is performed by this packet.

## Proposed next investigation, not executed

Before another geometry edit, separate pre-release cradle/launch-vector changes from later ramp contacts in the failed release81 histories. Compare the same world-creation order and sensor-only versus stud-only causal controls. Local recovered common-state return does not explain the full game. None of those new controls or further edits were performed in this packet.
