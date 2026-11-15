# Bounded floor-overlap cause isolation

No production edits, no adoption. Frozen v2 map SHA256 `022605fdccd86d5514c6d34820e3edda1d3d1980c577ae0f05eccff85cb92690`; archived in sibling `plunger-fit-v2`. Baseline runtime was HEAD8e73a0a (subsequent9436067 docs-only). Exact input hashes in inputs.json. No engine/force/key/material/timing changes.

## Facts and conclusion

Main floor box centerZ−.35, halfZ5.35 covers [−5.7,5.0]. Shooter box centerZ5.2 halfZ.9 covers [4.3,6.1]. Both topY.04, thickness.16. Shooter's X strip lies within main floor; boot center(2.53,.175,4.425) lies in overlapping area. Thus duplicate floor volume exists.

Single diagnostic control shortens shooter box to centerZ5.55, halfZ.55, coverage[5.0,6.1]. It keeps main floor, upper plane, outer extent, collider count/order and a touching seam with no geometric gap. It changes the physical decomposition and broadphase bounds; it is not proposed for adoption.

Original ramp prelude and target execute through node:test. Nine tests including the target; original previous standalone/world creations execute unchanged. Target records80..84 in original ascending order. Normal suite aborts at first failed assertion. No extra game world is created by instrumentation. Use **--loader**, not an inert --import of exported hooks.

| protocol | 80 |81|82|83|84 |
|---|---|---|---|---|---|
| baseline overlap |pass|pass|pass|pass|pass|
| v2 overlap |pass|pass|pass|FAIL|not executed|
| baseline trim |pass|pass|pass|pass|pass|
| v2 trim |pass|pass|pass|pass|FAIL|
| v2 overlap diagnostic continuation |pass|pass|pass|retained FAIL|FAIL|

The continuation explicitly logs83 failure and continues its existing loop through finally/dispose before84. It does not mark83 passing and is not a passing regression suite. No force/state/fixture substitution. This ramp target tests traversal/ball1/no reset, not full capture/refire.

Baseline versus v2 overlap has bit-identical p/v/spin/state through ticks0–563 in every observed target world. First physical difference tick564 is left flipper collider1356 plus main floor0, at approximately(−1.0531,.1712,4.2614), nowhere near shooter floor. Vx afterstep .6236362457 versus .6251721382; floor impulse .0508425087 versus .0507786870. Both prior states identical. Boot firststep mainfloor impulse is identical .0233982336; shooterfloor pair has zero manifold points afterstep. This snapshot does not expose every internal CCD/substep contact.

With trim, baseline and v2 remain identical only through268; first difference269 occurs at left cradle, mainfloor plus flipper/guide contacts. 83 recovers but84 fails. Initial launch changes from overlap in BOTH variants (e.g. boot afterstep Z4.23389530→4.23388672), so recovery is not causal proof of a duplicate-floor defect. Differences did not vanish after removing overlap.

**Conclusion:** duplicate floor can influence numerical trajectory but is neither established as the sole v2 regression cause nor a valid fix. First divergence is still remote common multi-contact response. The earlier archived early-confluence study had first difference at tick1; that is a different candidate/history, NOT generalized to this v2 comparison. No unobserved solver defect is asserted. Further geometry variants/retries were not attempted.

## Reproduce

Run `python3 docs/pinball-experiments/plunger-floor-causality/restore.py` from the matching source checkout. This validates all baseline pinball .mjs hashes and restores the unchanged v2 map from its sibling archive.

For each VARIANT=baseline/candidate and FLOOR=overlap/trim, use a fresh process:

```
VARIANT=candidate FLOOR=overlap node --loader ./artifacts/pinball/plunger-floor-causality/loader.mjs --test web/js/pinball/ramp.test.mjs
```

The explicitly nonpassing83 continuation additionally sets `CONTINUE83=1`. Scripts write raw gzip traces only to artifacts. results.json preserves world order and outcomes; selected-traces.json preserves boot/first-difference/neighborhood/final state and contact manifolds plus full raw-trace SHA256. Full raw traces remain in artifacts, not duplicated into docs. No browser/human/phone evidence claimed.

Observation limitation: contactPairsWith/contactPair are read-only query APIs, but this packet does not independently prove instrumentation has zero engine-cache effect. The existing uninstrumented corrected --loader full-suite log already failed83, agreeing with this reproduction; there is no new full unobserved four-way run. Failure84 is established by the explicit original `natural release 84 did not traverse` assertion, not by final ramp count (which reset may clear). The continuation preserves83 as a logged failure, not a new accepted expectation.
