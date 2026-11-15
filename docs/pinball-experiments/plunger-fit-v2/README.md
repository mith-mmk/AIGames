# Plunger fit v2 — rejected functional candidate

Do not adopt this candidate. Sampled static fit and rendering improved, but correctly registered runtime tests show gameplay regressions. Production source is unchanged. The frozen candidate was not repaired after failure, including its lint error.

## Identity and restoration

Runtime baseline: 71245b2. Archive starting checkout: 8e73a0a. Exact full commit IDs and file hashes are in manifest.json.

Frozen runtime-source-map.json SHA-256:
022605fdccd86d5514c6d34820e3edda1d3d1980c577ae0f05eccff85cb92690

The source map contains exact candidate module sources. loader.mjs is the original asynchronous-hook loader, unchanged. baseline-sources.json records exact original bytes of the four existing production modules; the candidate helper did not exist in production. replay-payload.tar.gz preserves the complete non-image working payload, including original scripts, local import-adjusted modules, source maps, fixed-contact surfaces and actual-app nearfield snapshot. No production file needs to be overwritten to replay it.

candidate-preflight.mjs is a path-adapted copy of the exact original in evidence/. It verifies the frozen hash, verifies the active class has candidate contacts, and wraps existing world creation to assert 26 added contacts. It creates no extra world, preserving creation order. natural54.mjs changes only the original controller's import paths. elevated.mjs changes only its output destination. Exact originals are retained in evidence/ or the payload.

## What was attempted

A bored mounting foot and bearing cradle replace buried/intersecting supports. The right apron channel edge is reformed to X≈2.387 while preserving bolts, insets and folds. The cap is tapered around the actual front cross-rail; shaft length, tip datum, travel, spring kinematics and launch/control methods remain unchanged. A stripe material offset removes coplanar flicker without changing geometry.

Physics deliberately changes: the old unrendered front stop is replaced by a real front-timber subsection at Z[6.15,6.31]. Twenty-six fixed trimeshes append after historical bodies and fasteners. Apron/cross-rail contacts use exact rendered surfaces clipped to X≥2.315 without new closure faces; the full plunger mounting surfaces are retained. This is not physics-invariant.

Moving ball contact remains the original tip only. Knob, shaft, ferrule, spring seat and springs still lack ball contacts. This candidate never established whole-plunger render/contact matching or natural inaccessibility of those moving surfaces.

## Valid results and rejection

Correct `--loader` registration plus the active-runtime/contact-count preflight produced:

- Full suite: 224 tests, 220 passed, four failed.
- One failure is the explicit collider-inventory contract: 1,406 rather than 1,380, exactly the 26 appended contacts. It is not evidence that the remaining assertions in that aborted test passed.
- Three failures are functional: release timing 83 fails required real ramp traversal in physics.test.mjs, ramp.test.mjs and upper-lanes.test.mjs. These cannot be dismissed as inventory changes.
- Natural54: completed sessions 54→53, ramps 61→48, controller release-stage entries (“shots”) 284→218. The unfinished .65-power/82-delay session is still playing at the180-second cap with15 ramps and22 release-stage entries; it is not stalled. The unfinished count alone is not classified as failure. Live resets remain zero. These deterministic fixed-input sessions are not human difficulty or physical-phone evidence.
- Corrected elevated diagnostics at Y.48: all 20 initial states are legal against actual solids. Baseline has 20 behind-tip stalls; candidate has 18 stalls and two drains, with zero same-ball returns. This is an inherited unresolved problem, not a successful return mechanism. States are artificially injected; no natural-reachability claim is made.
- Lint: four mapped modules pass; the helper fails one unused `T` import. Exact output is in evidence/candidate-lint.json. The frozen source was not modified to hide the error.

Static evidence remains valid within its scope: 101 sampled poses, zero geometric/physics fit witnesses, 19,491 mesh and 15,655 physics queries, and 89,824 conservative spring checks with explicit original support-contact exemptions. It is not a continuous all-motion proof. Actual rendering: 486,180 triangles, 600 calls, zero page errors. Three selected actual screenshots are retained. The original render.json inherited stale v1 wording about unchanged physics. Its capture code actually routes the full candidate map, including physics; original capture did not directly record the26-contact count. A separate later browser probe confirms active candidate physics and26 contacts under the same hash (evidence/browser-runtime-probe.json). Production files remained unchanged throughout. The original report is retained, not silently rewritten. These passes do not override the functional rejection.

## Excluded runs and diagnostic correction

Initial use of `--import loader.mjs` loaded the file without registering its exported asynchronous hooks. Those runs exercised baseline, not the candidate. Partial suite/natural runs were interrupted, and even the completed elevated run is excluded. Their logs/summaries are retained only under invalid-import/. The large invalid trace remains in the original artifacts folder; its hash is recorded, not treated as valid candidate evidence.

The initial Y.55 elevated series also cannot establish safe passage: for downstream Z it lies outside the existing `inShooter` condition Y<.5, causing immediate drain-rule exits. The corrected Y.48 series supersedes that interpretation. Both valid diagnostic records are retained with their original labels.

## Portable reproduction

Run on the recorded baseline checkout, with its existing dependencies. Commands below do not edit production files. Restore exact static scripts and payload to a disposable artifacts directory. Restoration refuses an existing target instead of overwriting diagnostics:

```sh
python3 docs/pinball-experiments/plunger-fit-v2/restore-replay.py
node artifacts/pinball/plunger-fit-v2-replay/validate.mjs
node artifacts/pinball/plunger-fit-v2-replay/narrowphase.mjs
# Optional rendering, same isolated substitutions:
node artifacts/pinball/plunger-fit-v2-replay/capture.cjs
```

Correct candidate runtime registration and verification:

```sh
node --loader ./docs/pinball-experiments/plunger-fit-v2/loader.mjs --import ./docs/pinball-experiments/plunger-fit-v2/candidate-preflight.mjs --test web/js/pinball/*.test.mjs
node --loader ./docs/pinball-experiments/plunger-fit-v2/loader.mjs --import ./docs/pinball-experiments/plunger-fit-v2/candidate-preflight.mjs docs/pinball-experiments/plunger-fit-v2/natural54.mjs artifacts/pinball/plunger-fit-v2-replay/candidate-natural54.json
MODE=candidate048 HEIGHT=.48 EXPECTED_CONTACTS=26 node --loader ./docs/pinball-experiments/plunger-fit-v2/loader.mjs --import ./docs/pinball-experiments/plunger-fit-v2/candidate-preflight.mjs docs/pinball-experiments/plunger-fit-v2/elevated.mjs
```

Using `--import` for the preflight is intentional; it does not replace `--loader` for loader registration. For baseline controls omit both flags and use a separate process. The static scripts' saved reports may still say gameplay pending because they were captured before parent functional validation; this rejection report and the valid functional logs are the final outcome.

No geometry iteration, state/score/input workaround, test weakening or production adoption followed these failures. No physical phone test was performed.

Archive preparation verified exact payload restoration, byte-identical static/narrow-phase results, correct loader/preflight activation and existing-target refusal. Disposable replay outputs were moved to Trash. The supplemental browser probe can be rerun with node docs/pinball-experiments/plunger-fit-v2/browser-runtime-probe.cjs; its new output goes to artifacts/pinball/plunger-fit-v2-browser-probe.json, leaving archived evidence unchanged.
