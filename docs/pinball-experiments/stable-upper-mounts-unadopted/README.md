# Stable upper mount trials: not adopted

Two minimal physical-support experiments were built directly from stable `79d7b91a8a71f6c010722ab65a6200459253c902`. Neither is adopted. They do not inherit the widened board, long bats or relocated lanes of the earlier whole-layout prototypes. A separate bar-only closed-render correction preserves the original physics and original full-height visible mounts; that production work was separately adopted as `adb035e6697bf58c115ac51e255fc61b810a0424` with 208/208 full npm tests passing, and is not included here.

## Verified defect and maintained scope

The original four upper bars have physical capsules, but their eight visible brass mounting cylinders have no separate corresponding contacts. Sixteen lateral ground-sphere approaches can overlap visible mount envelopes by .010 while keeping a bounded +.017715 clearance from the existing collision solids. This is a geometric mismatch, not a claim that every approach occurs during natural play.

Both trials retain the four bar axes/radii, all three ground sensors, roof, shooter, board, lower lanes, flippers, forces, keys, rules and solver settings. The original 1380 public collider records remain an exact prefix. Render controls are separate maps with unchanged physics. Capsule-stock rendering closes the bar ends; polygonal facets remain approximations of analytical surfaces.

## Full-height mount trial

Variant `full`, source `aa38cedbfaf11e098385708956e264691a65e63c594b38f4be134aa651d3a534`, adds eight actual cylinders at the original visible dimensions: radius .055, height .23, center Y .12. Assembly has 1388 colliders.

- Existing tests: **203/207 pass, four failures**, no skipped/cancelled tests. Entry repetition: **120/120**.
- The failures concern normal launch score, a repeated-shooter return in the 90-launch test, the shortest 31-power play duration (2.475 seconds against a >3 second contract), and the .925 top-lane requirement.
- The original six-power family reaches the field and drains; weak return/relaunch and the original three upper-lane tests pass. These do not erase the failures above.
- Exact .925 comparison: baseline and render control are identical. Candidate follows them through tick70, then the newly real right rear mount carries an impulse .704555 and redirects the ball away from lane2. The old lane2 award is lost. This is a real functional regression, not merely a changed score total.

## Stepped mount trial

Variant `stepped`, source `61e4f76a0594d56ca1b3b614e4ef70f2e202637f7e968a637e58565cda38f63f`, replaces each visible full-height post with a real low flange (radius .055, Y .005–.060) and stem (radius .020, Y .060–.235). Matching sixteen cylinder contacts are appended, giving 1396 colliders. The flange, stem and bar form a continuous connection; strength and manufacturing are not certified.

- Existing tests: **207/207 pass**, no skipped/cancelled tests. Entry repetition **120/120**. An isolated additional actual-assembly QA test also passes; the proposed physical integration patch was never applied to production. These are not a production 208-test pass.
- Original six natural powers, weak same-ball return/relaunch, 27 legal ground passes, and all five 80–84 ramp/wire non-award traversals pass. The .925 lane2 award returns at the original 1.25 seconds.
- Actual installed views: **451868 triangles / 691 calls**, no browser errors. Sixteen visible cylinders match contact centers and dimensions within 9.56e−8; original collider prefix and sensors remain unchanged.
- Real browser-input smoke passes desktop keyboard launch/flippers and mobile-viewport CDP touch launch/flippers, pause/resume/restart. No injected ball state, force override or physical-device/human-play claim.

### Conditional geometric analysis

For a sphere center Y≥.170, the added finite-cylinder exclusion sections fit inside the existing bar endpoint sphere's exclusion section. Installed-float minimum reserve is +.00405944953. This is a sufficient geometric containment statement for nonpenetrating states, not solver-response equivalence.

Browser observations below .170 were preserved. A separately labeled post-observation analytic supplement gives actual-pose sufficient threshold Y=.160179439092. The observed desktop/mobile heights .167421743/.168954402 still have positive stem reserves +.00306287/+.00366110. The original .170 certificate was not rewritten, and no universal trajectory-height guarantee is claimed.

### Paired fixed 54-game result and rejection reason

Stable and stepped candidate were run fresh in separate processes with the same original powers, timing controls and 180-second cap. Both complete **54/54 games**, with no recorded cap, stall, zero-score game or live position reset. Meaningful same-ball ramp completion, capture and real coil refiring remain observable.

| Measurement | Stable | Stepped |
|---|---:|---:|
| Ramp completions | 61 | 45 |
| Subsequent same-ball capture + real coil | 60 | 45 |
| Subsequent ball reaches Z<−1 | 54 | 43 |
| Left / right real coils | 397 / 418 | 350 / 402 |

The maximum-power group changes from five ramps to zero; .925 changes from eighteen to five. Other power groups also change. Equal termination rates and passing regression tests do not establish equal difficulty or preserve this natural-play distribution. The physical change remains **unadopted** for that reason.

A bounded .925 replay confirms a direct contact difference. At tick71, the ball already penetrates the old bar's finite surface by .03416; it also overlaps the newly real stem/flange by .03581/.01208. At tick72 the new surfaces carry loads .142339/.214893 and the trajectory diverges. Baseline and render control remain identical. The observed minimum Y .16410 is below the original .170 certificate but above the supplemental threshold: **deep penetration of the original bar**, rather than height alone or remote solver ordering, permits additional surfaces to participate. This one replay does not causally explain all 54 changed trajectories. No friction, force, score or solver adjustment was used to hide the difference.

## Exact recovery and evidence

`variants.json` pins the original Git base, changed module snapshots, loader/build metadata, vendor hashes and exact serialized source-map hashes. Recovery reconstructs the immutable Git baseline and overlays exact preserved module bytes, separately for the render control and physical candidate. It does not execute the archived build script, check out a branch, install dependencies, access the network or modify production. Original build bytes are retained only as provenance.

From repository root:

```sh
node docs/pinball-experiments/stable-upper-mounts-unadopted/restore.mjs --variant full --verify-only
node docs/pinball-experiments/stable-upper-mounts-unadopted/restore.mjs --variant stepped --output artifacts/pinball/upper-mount-recovered-stepped
node --import ./artifacts/pinball/upper-mount-recovered-stepped/loader.mjs docs/pinball-experiments/stable-upper-mounts-unadopted/verify-assembly.mjs 1396
```

Use exactly one of the restored `loader.mjs`, `render-loader.mjs`, or `baseline-loader.mjs`. Full-height assembly expects1388; stepped expects1396. Restored original files match their archived bytes exactly, including source maps and metadata. Eleven files per variant, fresh restoration, idempotent zero-write reuse, ten refusal checks and actual no-step assembly were verified. Both original freeze directories remained unchanged. Verification-generated directories and temporary scripts were moved to Trash. See `verification.json`.

Output is restricted to a direct `artifacts/pinball/name` directory. Original frozen destinations, differing existing files, symlinks and non-directory paths are refused. `--verify-only` writes nothing. Do not run the archived build directly against its original fixed output directory.

Compact reports are preserved under `evidence/`; `evidence-references.json` records hashes of all reviewed raw traces, logs, images and scripts instead of duplicating large files. Historical reports retain their checkpoint wording; this README supplies the final unadopted decision. Reference-wide completion, real-phone performance, human play, and resolution of original high-speed penetration remain open.
