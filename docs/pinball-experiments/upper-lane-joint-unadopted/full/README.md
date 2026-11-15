# d971: full unchanged pinball regression

**FAILED:207 tests,162 pass,45 fail,0 skipped/cancelled.** Classification does not change these counts or qualify adoption. The run used all37 current pinball test files and only the frozen d971 loader. No source/test/fixture/expectation edits or successful-case substitutions were made.

- Start HEAD:e283fc7439c6d8d1395247462bd357987efb54d1. End HEAD:79d7b91a8a71f6c010722ab65a6200459253c902 (separate stable roof preservation).
- Source:d971a4257f41512487cdf88ac9bfd9fc3f5208fd1223bf7e052a13edade98fac, unchanged throughout.
- All37 test files hash-identical before/after. geometry-budget.test.mjs SHA:d6f6393e76c428606e6e502cec15ffd3cd735449ef9f9463398bc009308be6be.
- Inventory includes the newly added207th stable-only closed-roof test. It expects a3-stock stable mesh name/axes; candidate has24stocks under a different name. This failure is not a measured render-budget exceedance.
- Original artifact full.tap SHA:cf0456bb5c20c3932af930fd51da0e1859f5010f49ed3b678e96c0c7206db1d7. Duration118.59seconds, with separate stable work potentially concurrent; not a benchmark.

## What failed

classification.json retains every failing assertion/stack, its source location and a specific interpretation. Group totals are28 changed/inconsistent layout, representation or API contracts;3 mixed old-route/behavior contracts;9 observed functional gates;3 geometric-margin gates;2 visible-direction gates. Every one remains a FAIL.

Clear contract differences include omitted cabinet centerX+.21 in standalone fixtures, old mount coordinates, singular vsarray outer-rail API, old shooter X2.45..2.70, old RAMP_POINTS endpoint versus relocated actual wire tail, C sensorZ−4.45 versus old−4.55, and old rendering vertex/count assumptions. These require new meaningful contracts and installed verification, not blindly changing expected numbers. Several old fixed OUT coordinates no longer represent the same channel; their playing/flipper-contact results are retained separately rather than labeled safe OUT passes.

Meaningful whole-candidate deficits include:
- Earned side-save passes firing/vz<−10, then fails actual upfield return. The local fired-once-and-drained observation does not meet this stronger existing requirement.
- Natural31-power progression includes2.7second play, violating the existing minimum3seconds. Later duration/reactive assertions were not reached.
- Central20-ball distribution produces4 physical contacts versus required16, showing a capture/difficulty change for that distribution.
- Existing release timing and natural ramp→wire→capture/refire sequences fail. Release80 has rampTraversals0; the five elevated no-false-award route test therefore aborts before proving its no-award claims.
- Nominal root shot corridor and conservative sling/inlane margin fail. The latter is.257024 versusrequired.320, not by itself proof of actual sphere pinching.
- Projected wire/full-sling lateral reserve is.001319677 versusrequired.025; earlier vertical checks pass. Do not turn that projected failure into an unsupported claim of3D penetration.
- Both OUT canvas arrows still point upstream in this884-derived prototype. Stable0b75 correction is not part of its source. No rendering-only correction was mixed into this freeze.

## Scope and remaining checks

This is the complete existing pinball Node test corpus, not all games in npm test. The equivalent test:pinball pipeline stops before eslint on this unit-test failure, so lint was not run or claimed passed. Some broad natural-launch/session tests do pass; all162 names are saved, but no local success overrides the45 failures.

This run cannot isolate which deficits are inherited from whole-long-lane/5891 versus introduced by d971; no duplicate full5891 run was requested. Six-power/weak local success is valuable but narrower. Dense continuous aiming, full natural54 and adoption are not certified by this report. Existing high-route false-award coverage remains incomplete until actual traversals succeed.

TAP-REFERENCE.json points to the full original output by path/size/hash; raw TAP is not duplicated in this packet. invocation.json records exact command, before-hashes and the new stable test diff; result.json records after-hashes and exit1. No temporary build tree was generated. Only these persistent result artifacts were written; production and frozen sources were not edited.
