# Joint upper lane d971: unadopted

This packet reconstructs an isolated prototype exactly. Six local launch powers improved, but the whole candidate remains **162 PASS /45 FAIL out of207 unchanged tests**. Dense568 completed and did not qualify adoption. Production was not changed.

## Frozen design

Source SHA256: `d971a4257f41512487cdf88ac9bfd9fc3f5208fd1223bf7e052a13edade98fac`. It reconstructs from immutable5891 through the adjacent `straight-shooter-roof-unadopted` and94ea packets, using accepted base `884960985a413986d57aff0c2280e59a7be79dcf`.

Right bar: center(1.875,.23,−4.45), yaw−45°, unchanged length.90/radius.035. Its ends/mounts and C sensor/lamp/label share one definition. Other bars and lane IDs0..2 remain; sensorY.04..36,100point rewards, mission and finite earned-save conditions are unchanged. Eight visible mounts gain matching cylinder contact. Visible roof24/bar4 stocks use physical capsule parts, including rounded ends. The roof path,16.316735° chord joint and all forces/keys/solver remain unchanged.

Three existing modules change and one common geometry module is added;36 modules remain byte-identical to5891. Whole-long-lane bats, board, ramp, shooter and lower geometry are inherited. Stable `79d7b91a8a71f6c010722ab65a6200459253c902`, including prior0b75 OUT arrows and a separate stable-only roof correction, is **not mixed in**. Its207-test pass is not a candidate pass.

## Static and visual limits

- Rotation at old barZ−4.55 was rejected before assembly: conservative same-height ball reserve with the r.055 mount was−.007360953. The preserved selected Z+.10 proposal gives+.088306435 under that comparison, not all-height safety.
- No-step assembly:1588 colliders/59 attachments. Ground-lane path lower bounds: +.079735/+.131288/+.156923.
- An initial roof-to-C witness penetrated the retained roof by.048883 and remains explicitly INVALID in `static/static.json`. A later geometry-derived shoulder witness gives+.028234. Neither is a natural trajectory or runtime guide.
- Installed45°:490204 triangles/567 calls, below500000; page errors0. Actual shared parameters/vertices agree within about2.6e−7; polygon facets are not analytic surface identity.
- Reference remains unmet: exposed crossheads, left wire/label occlusion, large bats, broad margins and incomplete static save. Inherited prototype OUT arrows still point upstream; the separate stable fix does not excuse these two failures.

## Diagnostics

All fixed powers.55/.65/.75/.85/.925/1 reach the field and ordinary drain; weak.1 return/relaunch remains. The5891 maximum-power bar-return failure is resolved in these six observations. All24 legal actual-frame ground fixtures score once. Three C+.43 edge starts overlap the bar by−.01691673 and were NOT run or moved. Limited OUT fixtures drain; one earned charge fires once then drains. The stronger existing earned upfield-return gate fails. One fixed legal high-shooter start drains in111 ticks, not a whole-high-route guarantee.

Full regression used all37 current pinball test files, hash-identical before/after, including the new stable-only roof test. **207 total,162 pass,45 fail,0 skipped/cancelled, exit1.** Classification:28 layout/representation/API contracts,9 observed functional gates,3 mixed old-route/behavior contracts,3 geometry margins,2 visible directions. All remain FAIL. The fixed-coordinate/API differences require meaningful new contracts, not blindly changed expectations.

Functional failures include earned return, natural ramp→wire→capture/refire, release timing,2.7second play versus3 minimum, and4 contacts versus16 in a20-ball central distribution. The profile-derived65% test has no recorded coil drive despite upfield final velocity; both profile and length use shared1.65, so no old-profile mismatch is claimed. Full failed assertions/stacks and interpretation are in `full/classification.json`. Raw207 TAP stays at its hash-referenced artifact path. No full5891 suite was duplicated, so every inherited failure cannot be attributed to the new bar. This is the pinball Node corpus, not all games; lint was not run. Concurrent work makes duration unsuitable as a benchmark.

Dense568 compares accepted884/d971, delays30..100 inclusive at1tick, both sides, ascending/descending in separate processes. All starts legal, all quiet capture, one real coil each, reset0. Success isZ<−1, not ramp completion.

| Geometry | Left/71 | Right/71 | Longest left run | Longest right run |
|---|---:|---:|---|---|
| Accepted884 |41|41|32–56:25 points/200ms|32–70:39 points/316.67ms|
| d971 |21|25|92–100:9 points/66.67ms, censored at100|64–87:24 points/191.67ms|

Both orders agree on classifications. Actual normalized along differs: accepted≈.173–.686 versus d971≈.171–.535; releaseX≈±1.054 versus±1.618. Thus narrower sampled runs in this fixed domain do **not** prove narrower coverage over every possible input. No adaptive extension or sub-tick continuity proof was performed.

Per order, candidate left endpoints:43drain/27held/1same-ball-ready-shooter; right49/21/1. Shooter cases left69/right87 first satisfyZ<−1, so success count alone is insufficient. No nonbat-quiet or still-playing time-cap endpoint was observed. Raw provisional labels are preserved and derived summaries correct them from saved phase/ball/position. Each geometry has2 of142 paired traces with capture/p/v differences despite identical classifications, so generic bit determinism is not claimed.

All568 scalar case records, actual along/aim/world positions and trace hashes are in `dense/cases.jsonl`;≈99MB gzip traces are excluded. Full natural54, completed five elevated no-false-award traversals, reference, physical-phone/human play and adoption remain unqualified. The elevated test aborts at zero ramp traversals; unchanged sensor height alone is not a completed-route proof.

## Safe recovery

From repository root, with existing vendors and pinned Git history:

```sh
node docs/pinball-experiments/upper-lane-joint-unadopted/restore.mjs --verify-only
node docs/pinball-experiments/upper-lane-joint-unadopted/restore.mjs --output artifacts/pinball/upper-lane-joint-recovered-d971a4
node --import ./artifacts/pinball/upper-lane-joint-recovered-d971a4/loader.mjs docs/pinball-experiments/upper-lane-joint-unadopted/verify-recovered-assembly.mjs
```

Use exactly one loader: candidate `loader.mjs`,5891 `baseline-loader.mjs`, or884 `accepted-loader.mjs`. Recovery yields12 files by running unchanged original build bytes through bounded in-memory capture. It checks source, generated, packet, dependency, vendor and base hashes; no install, network, checkout or production replacement occurs. Exact existing files are reused; differing bytes, symlinks, wrong-depth/nondirectory outputs and original freeze destinations are rejected. Verify-only writes no artifact files. Do not run archived builds directly in original directories.

`verification.json` records exact12-file recovery, idempotence0writes/12reuses,9 refusal cases,1588-collider no-step assembly,108 unchanged original freeze files and empty production diff. Verification temporary outputs went to Trash. `final-verification.json` records the final packet check after dense results. Raw maps/images/traces/TAP are hash references only; failed TAP snippets remain for audit.

`diagnostic-summary.json` is the final machine-readable status. Historical `payload/` and `local/` reports retain their earlier checkpoint statements; this final record supersedes not-yet-run claims with207 failed regression and completed dense568. Source/build bytes, production and test expectations remain unchanged; no commit was made in this operation.
