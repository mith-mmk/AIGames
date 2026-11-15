# Plunger fit preflight — rejected isolated prototype

This experiment is not accepted for production integration. Production source and physics were unchanged. No gameplay integration, natural-play rerun, or phone verification was performed.

## Implemented scope

The isolated prototype replaces the buried mount with a bored foot, narrower bearing webs, an annular bearing boss, and four washer/head/shank attachment stacks. A smaller, shorter knob preserves its front seat, shaft axis, tip datum, pull travel and spring kinematics. Existing cabinet obstacles remain intact.

The prototype exports 22 exact fixed-surface triangle meshes for a future contact integration. These are not installed in production physics. Annular parts are not replaced by bore-filling convex hulls. Adding their exposed contacts would explicitly change the gameplay contact contract.

## Limited checks that passed

- 101 pull samples retain the original tip, ferrule, shaft, moving spring seat and both springs' geometry and motion.
- Knob envelope clearance: board .0125, left shooter rail .0165, right shooter rail .0115, front timber .0100 table units. These checks alone do not establish installed fit.
- Fixed-part shaft-axis ray remains unobstructed; mounting geometry and triangle budget checks pass.
- Actual full-table 45-degree rendering: 486,180 triangles, 600 draw calls, zero page errors. Browser-only module substitution produced the retained screenshots without modifying production files.

## Exact installed-fit failures

The targeted narrow-phase check uses actual cabinet triangle meshes against 99 convex pieces derived from the moving geometry: separate lathe-interval frusta for the cap and shaft, annular sectors for the band, and individual knurl boxes. It does not convexify the whole knob. Across 101 poses and 5,468 queries, it confirms:

| Actual cabinet obstacle | Pull | Maximum reported penetration |
| --- | ---: | ---: |
| Right apron wing | .68 | .04700017 |
| Front hazard apron | .37 | .02833676 |
| Folded apron front | .86 | .02935993 |
| Front folded cross-rail | 1.00 | .00592671 |

Exact contact points and moving-part identifiers are retained in narrowphase.json. The board-fastener head and shank were AABB candidates but produced no narrow-phase witness. The shaft produced no collision witness. Rod shortening is therefore not established as necessary for clearance; it is only an optional cap-enclosure design choice if a shorter cap is adopted.

The earlier broad-phase audit is retained as diagnostic evidence, not the basis for rejecting these four confirmed intersections. The limited validator's pass does not override the installed narrow-phase failures.

## Existing shooter stop and bounded next proposal

The existing unrendered front-stop collider occupies X[2.26,2.80], Y[-.1,.7], Z[5.82,5.98] and conflicts with the knob sweep. Verified visible front timber occupies approximately X[-2.91,2.91], Y[-1.4,.28], Z[6.15,6.31]. A proposed shooter-section replacement X[2.26,2.80], Y[-1.4,.28], Z[6.15,6.31] would match a real subset of that timber. It is an explicit contact-contract change, not a physics-invariant repair, and does not resolve the apron/cross-rail failures by itself.

A coherent next experiment must reform, rather than remove, the right apron channel and refine the cap around the actual cross-rail. Aligning the channel inside the inner rail's right face near X2.395 and reducing/tapering the cap rear are bounded candidates, not validated fixes. Shared render/contact geometry and the visible front-stop contract must be addressed together. Existing shooter/return regressions, all 54 natural-play cases, and new elevated/returned-ball tests are mandatory before adoption.

## Archive and portable replay

The bundled baseline-original.txt contains exact source bytes from commit 71245b2; generate.py verifies its SHA-256. baseline-plunger.mjs adjusts only import paths. Other dependencies remain repository-relative, including vendor Three.js/Rapier, cabinet/layout and the full app. Use the historical base checkout for fully historical reproduction.

From repository root:

```sh
python3 docs/pinball-experiments/plunger-fit-preflight/generate.py
node docs/pinball-experiments/plunger-fit-preflight/validate.mjs
node docs/pinball-experiments/plunger-fit-preflight/installed-audit.mjs
node docs/pinball-experiments/plunger-fit-preflight/narrowphase.mjs
# Optional actual rendering:
node docs/pinball-experiments/plunger-fit-preflight/capture.cjs
```

All generated outputs go to artifacts/pinball/plunger-fit-replay, not this archive. Validators use the archived prototype; the generator emits an identical prototype into the replay directory. Archive preparation reran the static and narrow-phase scripts and verified five outputs byte-for-byte against the original experiment, as recorded in replay-verification.json. Disposable replay outputs were then moved to Trash.

manifest.json identifies source/evidence hashes. The regeneratable fixed-contact-surfaces.json is omitted from this archive to avoid duplication; validate.mjs recreates it, and its exact hash is recorded. Three selected original screenshots and render.json retain actual rendering evidence. An additional independent run of the archived renderer reproduced render.json exactly (486180 triangles,600 calls, no browser errors); its disposable image outputs were moved to Trash.

## Unverified limits

No gameplay with the new fixed contacts, no elevated/returned-ball simulation, no complete continuous all-parts collision proof, and no phone test. The narrow-phase evidence is targeted to the listed cabinet obstacles and sampled poses. These are authored visual dimensions, not manufacturer measurements. The prototype remains rejected as-is.
