# Plunger v2: bounded collider cause isolation

No production/engine changes, no adoption, no commit. Base c92c4ad (runtime71245b2). Fixed original ramp test prelude/order and default solver. Physics evidence is a bounded regression diagnostic, not full gameplay qualification.

## Predeclared controls and result

Six fresh processes: baseline twice; full frozen v2 twice; frontstop-only once; appended26-only once. Each runs the unchanged first8 ramp tests, then original80–84 natural traversal family until its first assertion failure. No dummy shapes, altered lifecycle, extra world, input change or solver sweep. All variant sources are frozen in `*-sources.json`; unchanged repository inputs are hashed.

- Each baseline repeat has identical complete per-tick states, pair enumeration, manifolds and descriptors for all80–84.
- Each v2 repeat is likewise identical for80–83;83 fails original traversal assertion, so84 is not executed in this packet.
- **26 additions only exactly match baseline full traces and common descriptors for80–84; all pass.**
- **Frontstop replacement only exactly matches full v2 traces for80–83, including83 failure.**
- Repetition establishes reproducibility for this fixed process/world protocol, not universal determinism across other world histories/machines.

The diagnostic split preserves actual creation position: replacement cuboid is made in build() at historical handle5;26 contacts append after historical ball/reset/outerrail/fasteners. No create/remove reorder. Baseline versus front-only descriptors differ only for cuboid5. Geometry: center(2.53,.30,5.90),half(.27,.40,.08) becomes center(2.53,−.56,6.23),half(.27,.84,.08); materials unchanged.

## Where the first difference occurs

All baseline/v2 observed physical state is identical through tick563. First difference tick564 is a common left-flipper plus floor response. Before: p(−1.053059459,.171168104,4.261418343),v(.007627351,4.19e−9,1.421253085),spin(10.6764593,−.00978487,−.05729670). Active pairs are [1356 flipper,0 mainfloor] in BOTH variants, one point each.

After baseline/v2:
- vx .623636246 / .625172138; vz .136976257 / .137863398.
- Flipper normal(.510093510,0,−.860118926) / (.510093451,0,−.860118985); impulse .120708860 / .120701276; separation−.004542485 /−.004542783.
- Floor normal(0,1,0) both; impulse .050842509 / .050778687; separation−.003532529 /−.003532350.

These are **poststep** manifolds and impulses; changed manifold values may be consequences of internal substep divergence. They do not establish which internal operation differed first.

Enumerated potential-pair order already differs at tick0, but only in pairs with zero contact points: baseline [1359,0,7,1], v2 [1359,7,0,1]. Tick563 complete observed manifold records match. First nonempty pair-order difference is later (83:637; other delays632/626), AFTER physical divergence564. Therefore an observed active pair reversal at564 is NOT the mechanism.

No nonempty contact with frontstop5 occurs through564. Minimum sphere-to-box surface distance across recorded before/after endpoints is1.260 baseline or1.590 v2. This is endpoint evidence, not an unexposed internal CCD sweep proof. Ball has been explicitly placed at the unchanged IN fixture after30 ticks by the original test; no added diagnostic placement occurs.

## Causal interpretation and limits

Within this factorial split, remote **frontstop bounds/placement change**, not the26 additions, is sufficient and associated with the entire v2 regression trajectory. Common handle preservation does not prevent it. Potential-pair enumeration changes before physical state changes, supporting sensitivity of collision pipeline organization to distant shape bounds. It does not prove broadphase ordering, solver constraint sorting, SIMD grouping, warm-start state or a specific engine defect as the internal cause. Public poststep APIs do not expose that internal schedule. No unmeasured global configuration difference is asserted.

The earlier early-confluence packet's tick1 difference and previous floor-trim control are separate protocols/candidates; do not generalize their first-divergence times. Floor trim did not remove differences and is not adopted. Existing uninstrumented corrected full suite also failed83; read-only contact queries are not independently proven cache-neutral by this packet.

Gameplay first: retain playable accepted runtime. Appended26-only has bounded traversal compatibility evidence, **not** full physics/visual acceptance: it retains the old mismatched frontstop and is not proposed as a decorative-only workaround. Do not preserve arbitrary old timing at all costs, but any later real front-boundary redesign must qualify a robust aiming interval and natural gameplay before replacing stable play. No promising accepted physical fix emerged here, so no adjacent-range sweep or further variant was run. This stops at a reproducible causal boundary.

## Replay and evidence

`python3 docs/pinball-experiments/plunger-order-isolation/restore.py` validates baseline input hashes and restores to `artifacts/pinball/plunger-order-isolation`. All destinations preflight; conflicting files are refused before any write. Identical files remain. Results are never restored/overwritten by this script.

Run each process separately, e.g.:
```
VARIANT=baseline REPEAT=1 node --loader ./artifacts/pinball/plunger-order-isolation/loader.mjs --test web/js/pinball/ramp.test.mjs
```
Use baseline/v2 with REPEAT1/2, front-only/additions-only with REPEAT1. Redirect to a fresh log filename. Observer refuses existing result outputs; use a fresh REPEAT label for a new replay. `analysis.json`, `split-proof.json`, `selected-traces.json`, full console logs, source snapshots and raw-trace hashes preserve evidence. Raw full gzipped traces remain artifacts. No human/real-phone claims.

Source boundary: source research supplied the npm0.17.3 build's [pinned Cargo.lock](https://github.com/dimforge/rapier.js/blob/1a9d5225fbaa7dc320e43011c56bbf0fbafe6b91/Cargo.lock#L1041-L1044), identifying Rust Rapier0.26.1, not Rust0.17.3. The [JS changelog](https://github.com/dimforge/rapier.js/blob/master/CHANGELOG.md#0150-06-march-2025) distinguishes standard and deterministic builds. [Official determinism guidance](https://rapier.rs/docs/user_guides/javascript/determinism/) concerns the same simulation under specified conditions; it does not promise identical trajectories after changing a scene. These references do not establish the internal source-level cause of this measured difference.

The archived observer adds an output-only no-clobber startup guard after the recorded runs; stepping and queries are unchanged. Existing artifact scripts differ by that guard, so default restore correctly refuses them. Use e.g. `python3 docs/pinball-experiments/plunger-order-isolation/restore.py plunger-order-replay` for a fresh directory, then use that path in --loader. No result file is replaced.
