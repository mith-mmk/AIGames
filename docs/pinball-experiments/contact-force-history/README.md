# Contact force history D: not adopted

Production and Sites remain unchanged at the stable runtime. This artifact-only proposal fixes the observation gap in previous C, but fails the natural-gameplay gate. It is not a shipping implementation or a claim that the user's subjective contact weakness is resolved.

## Mechanism and evidence

The ball requests Rapier contact-force events. Collision-start arms a bumper activation after the existing cooldown; the queued positive solver-force event consumes it once. Force direction is oriented by collider order, projected horizontally, and only the deficit to the existing minimum speed 6 is added after passive restitution. No new gain, hidden collider, ball-position rescue, restitution multiplier, or control changes.

Collision ends remove pending entries **after** force events. Thus start at tick 0 and end+force at tick 1 still powers the low-speed bumper. `force-event-proof.mjs` verifies this in an isolated Rapier world with both collider construction orders; passive speed is about 3.36. The temporary event is read only inside its callback.

`force-fixtures.json` uses actual isolated production contacts, zero gravity, and synthetic ball placement. At incoming normal speeds 6/12/24, one powered activation yielded outgoing 6/6.70658/13.41316 respectively, with no extra high-speed boost. This is not ordinary gameplay. `lifecycle.mjs` checks reset, restart, tilt, pause, and separation without a positive force; no stale kick. The prototype skips inward post-solver velocity and ignores degenerate horizontal normals. Cap/oblique/multiple-contact contracts need more qualification before any future adoption. Dispose cleanup was not added to production because no production code was changed.

## Gates

- Original five synthetic refire conditions: all retain the same ball; delays81–84 retain initial ramp traversal, delay80 retains baseline initial no-ramp result.
- Unmodified full existing tests: **223 passed / 1 failed**. Failure is the direct `hit()` assertion expecting immediate bumper impulse without a solver collision (`gimmicks.test.mjs:43`). Solver-first semantics deliberately do not provide it. This test was NOT weakened or relabeled as a pass. Full aggregate `npm test` was not run; pinball lint passed with existing warnings.
- Natural54 legal-input controller: 54 finished, zero stalled/zero-score/live-reset. But ramp-reaching sessions **21→7**, total ramps **61→15**, score **169700→156150**, shots **284→165**. Rejected despite fixing low-speed observation. The baseline was reused with matching runtime and controller hashes, not re-executed. These counts measure fixed-input runs, not a human difficulty probability or an aim-window estimate.
- No browser, physical phone, or human test of D; no deployment.

Conclusion: reliable resolved-contact history is available, but restoring passive solver response substantially changes trajectories that the current table/controller relies upon. It is not sufficient to improve contact timing alone. Another force gain sweep would conceal that design tradeoff. Any next change must assess table reachability alongside contact feel; the current stable version remains in place.

## Reproduce

All scripts use paths relative to an artifact directory at depth three. Copy this directory to `artifacts/pinball/contact-force` in the repository, then:

```
node artifacts/pinball/contact-force/force-event-proof.mjs
CONTACT_OUT=force-fixtures.json node --loader ./artifacts/pinball/contact-force/force-loader.mjs artifacts/pinball/contact-force/fixture-probe.mjs
node --loader ./artifacts/pinball/contact-force/force-loader.mjs artifacts/pinball/contact-force/lifecycle.mjs
DIAG_OUT=force-refire.json.gz node --loader ./artifacts/pinball/contact-force/force-loader.mjs artifacts/pinball/contact-force/diagnostic.mjs
node --loader ./artifacts/pinball/contact-force/force-loader.mjs scripts/pinball-playability-audit.mjs artifacts/pinball/contact-force/natural54.json
node --loader ./artifacts/pinball/contact-force/force-loader.mjs --test web/js/pinball/*.test.mjs
```

The last command is expected to fail the one immediate-hit assertion. Full refire traces are compressed to avoid redundant large text files. No retained Event object outlives its callback.
