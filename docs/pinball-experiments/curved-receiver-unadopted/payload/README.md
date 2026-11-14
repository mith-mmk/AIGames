# Curved receiver comparison freeze

**One isolated candidate, not adopted. No production or existing test changes. No dynamics performed during construction.** Baseline 884960985a413986d57aff0c2280e59a7be79dcf (202 tests); repository HEAD eaf9be3a21bf5f09b1d17e277198e13dd9aead3f.

Source SHA256: `613f54747cc4fbbf66ee8c1cedbe4ff64c99271ee5cd17697c28ea381eb1ace0`.

Run one loader only: `node --import ./artifacts/pinball/curved-receiver-eaf9be3/loader.mjs <diagnostic-script>`.
Accepted comparison reads this directory's `baseline-sources.json` with a separate baseline loader. Never stack previous experimental loaders. Build is idempotent and refuses differing frozen outputs. Geometry is fixed; add reports separately rather than tuning this source.

## Scope and mechanical intent

- Restore accepted pivot ±1.25/Y.27/Z4.45 and world-space shot datum. Same bat, angles, sling, targets, upper launch, shooter, board, ramp, wire, keys, force formulas, solver and materials. Rest projected central gap returns to about .590694, not because that gap is a user requirement, but to separate the previous outward-shifted world-route regression.
- Divider: two analytic arcs from (1.90,.22,3.00) to (1.201035,.22,4.066487), R .5815550707, maximum tangent angle66.480865°. Preserve a receiver-location reference, not an assumed identical arrival/equilibrium. Old quiet saved sphere rail normal differs by about1.54°.
- Downstream divider tail is a separate Bezier to (1.42,.22,4.40), then4.85. It clears the real swept bat rather than repeating the old solid penetration.
- Initial retained inner endpoint(1.35,3.35) failed: axis gap .255501, floor-center deficit .041147. Preserve initial design/results in ../curved-receiver-static-eaf9be3/initial-*. The authorized replacement retains (1.35,2.75)→(1.35,3.10), then bends through controls(1.35,3.145),(1.31,3.20) to(1.27,3.20). Support remains at3.10, not a new post at the free exit.
- OUT uses true normal offset .430 on the two-arc portion, then a separate tail to(1.92,4.40), then4.85. **Offset .430 is not the tail's minimum width.** Actual sampled-stock pair minimum axis .32668544, solid surface gap .28668544, only .01668544 over ball diameter .270 at rail height.
- Nine throughboard support stations per side. Shafts Y−.180..+.220, washers−.152..−.140, nuts−.174..−.152. These reach the real underside−.140; board bores and manufacturing strength remain incomplete details.
- Existing C static-save helper bytes unchanged. New curve aligns visible cam/rod, actual contact, detector and fixed impulse axis together at X−1.842372/Z3.600, down=(.753244,0,.657742). Same finite speed12/earned/charge contract. No stronger kick or new rescue. Static cam/rod and missing coil bracket remain unfinished; this is not the moving-actuator proposal.

## Static evidence and limits

Actual source assembly:1615colliders,276lower capsules,62attachments,cam10mesh/hull vertices. Paths/mounts equal the reviewed plan exactly. Mesh/contact center errors≤1.96e−7, rail center/length≤2.36e−7; cam vertices exact. Thirty-four original modules byte-identical to8849609 (33runtime plus unused test helper). physics.mjs equals prior receiver physics bytes; save helper equals original C bytes. Altered runtime modules: layout, physics, playfield-parts, plus virtual lower-c-study.

The separate static audit queries actual shared bat and conservative convex envelopes of8actual moving meshes through541poses. Minimum shared contact gap+.073642, actual rubber hull+.073611; old same query−.058009. Independent midpoint-grid plus rotational-displacement bound gives+.071491, excluding numerical-query error. This does not certify omitted fixed underboard parts, strength or manufacturing.

Corrected IN has sampled all-height lower-guide corridor and inner/divider finite-stock minimum .418956. Saved accepted shots afterrepress first15ticks have point gaps rail+.015943/shaft+.232748; independent whole-segment checks rail+.012753/shaft+.225674. These are old trace queries, not new dynamics.

Wire-end XZ column(±1.72,3.00), sphere center height .175..575 has lower-only minimum+.024916. This is not a predicted fall or a natural wire arrival test.

A naive same-Bezier-parameter midpoint through the OUT tail is **invalid** (floor gap−.001641; rail height−.008392). Its negative record is retained. A separate offline geometric witness at2mm-model Z increments has a continuous piecewise-linear clearance lower bound+.011709 at floor center and+.006000 at rail height against the reviewed lower rails/shafts. This only establishes geometric room. The witness is NOT in the runtime source, not an initial ball trajectory, not an autoaim path, and gives no natural-speed/traversal guarantee. Natural OUT must use legal predeclared starts and ordinary physics.

## Comparison gates

1. Independent installed45/10/top/mobile reference review and≤500000triangles. The strong66°S, receiver→outward tail, short inherited labels and cam crossing require honest visual review; reference artwork is not CAD. Long reference-like bands are not qualified by this freeze.
2. Natural6powers .55/.65/.75/.85/.925/1 andweak.1 same-ball return/relaunch; unchanged upper still compared.
3. Same fixed36 release30..70step5, both sides, capture/actual rolling-u range/pose/coil/first support/rail/sling/target contact. Accepted14/18, prior receiver10/18 are benchmarks, not goals to meet by changing timing or force.
4. Legal OUT uncharged low speed, one fixture charge, then natural earned/reentry when justified. Narrow tail and static mechanism remain limits. No midpoint-start repair or forced traversal.
5. Natural wire→IN, center save/drain, continuous aiming and difficulty; only if prior gates warrant it, natural54 and full202. None performed in this construction task.

Static evidence lives in ../curved-receiver-static-eaf9be3 and independent ../curved-receiver-independent-eaf9be3. The fixed plan is copied byte-for-byte into this packet and embedded in the source map; original static-only comments retain their provenance. No runtime imports those analysis directories. `verify-assembly.mjs` is an audit-only script that compares against the static plan.
