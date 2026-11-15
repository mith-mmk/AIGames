# One continuous receiver hypothesis: rejected before dynamics

Base repository3568d1b446ff2e4830e986e975f837432f0e6bd8. Geometry input is the already frozen welded candidate2d9c3a9cae7eba29d21dc755645c752e2b23345d0a64de01b1f4750bdeef611e, not later working-tree bumper changes. This is a bounded static design study only. No runtime source map, production geometry, force law, input, score rule or test expectation was changed.

## Single derived shape

The causal study measured a useful speed2 long-IN socket contact normal but also showed that this socket spoiled wire return. Rather than retain an accidental fastener contact, this hypothesis moves that horizontal turning direction into continuous receiver rail stock.

Hold ball radius.135, rail stock radius.020 and rail centerY.22. Project the measured speed2 poststep socket normal into XZ; use its horizontal direction and the measured ball center to derive one prospective centerline station. This is a geometric hypothesis from a poststep state, not a proven collision-state inverse solution: the socket is cylindrical and the proposed rail is round, so vertical normal/contact behavior is not identical.

- Unchanged upstream connection: (−1.949781697,.22,3.642145618).
- Derived stationJ: (−1.737752483,.22,3.767442606).
- Unchanged downstream line connection: (−1.58,.22,3.857317073).
- Slopes dz/dx: upstream.851144749, J.288547378, downstream.487804878.

Two cubic Hermite spans join those stations, with matching tangent atJ. Each is represented by32 capsule segments, with the same prospective centerline/radius intended for rendering and contacts. The finite stock approximation is not an exact smooth analytical surface. All other rail portions, stud support, sensor and bat laws are held fixed in this hypothesis. No new socket, hidden collider, force correction or score-based rescue is introduced.

## Static rejection

Twelve recorded successful-return/recapture histories, including saved baseline lower/physics histories and the recovered common-state return, provide13268 center samples. Linear interpolation between recorded frames is spaced at most.001. The lower80 record includes recapture without a completed ramp; not every source is a full wire traversal. Sphere-to-capsule distances use analytical segment distance minus(.135+.020). No physics solver is run.

The screening rule compares newly added penetration against the **existing guide's penetration at the same recorded center**, rather than incorrectly requiring all historical guide contacts to be clear. This is a conservative preflight guard for this small patch, not a necessary condition for every future successful guided return.

- Worst added penetration: **.0115107066**, baseline physics83 tick1193. Recorded center(−1.615018138,.171640324,3.676335326) is clear of the old guide by+.0000428229, but the proposed guide gap is−.0115107066.
- Recovered common-state return tick19: old gap−.0003114762, proposed gap−.0108408821, adding **.0105294058**.

Thus copying the long-IN turning tangent into this smooth local rail would encroach on return paths that already work. The idea is rejected **before** creating a runtime candidate. Initial capture, new entrance4speeds, common-state dynamics and original-history ramp/upper-lanes gates were **not run for this rejected shape**; none may be reported as passing. No full54 or additional geometry trial was made.

These are sampled piecewise-linear envelopes, not exact substep trajectories, structural-strength calculations or a theorem that all local rail designs fail. Existing negative guide gaps remain observed solver/contact penetration, not new evidence of a support defect.

## Dimensional conflict at the intended tangent

Using the allowed-distance envelope (the smaller of.155 and the old guide's centerline distance at each sample):

- StationJ itself retains minimum+.005321284 relative margin.
- A straight continuation with the requested tangent enters a forbidden return envelope after only **.009545271** along the guide.
- For a circle turning toward+Z fromJ, a conservative whole-circle clearance condition across these samples bounds centerline radius to **R≤.032643820**.
- This hypothesis's outgoing Hermite curvature radius atJ is **.138034346**.

The circle calculation is |Q−(J+R·N)|−R≥r_effective in XZ, where r_effective incorporates height and the existing-guide penetration allowance. It is conservative for a finite arc and neither proves that no other spline exists nor guarantees that such a tight arc can connect both endpoints. The bound is only1.63 times the.020 stock radius; it does not establish manufacturability, adequate ball steering, or success of a sharp replacement bend. No tighter bend was tried to chase the fixtures.

## Next scope needed, not implemented

A tiny smooth tangent patch at the former socket is insufficient under the retained return envelope. A next receiver design should treat long-IN approach and wire-return guidance together over a broader region, with actual incoming states, common visible/contact stock and connected supports. It may need earlier long-IN steering and a deliberately designed downstream receiver response, rather than preserving the old tail centerline and expecting fastener removal alone to recover play.

An upstream-IN-only change cannot by itself repair the old capture→release81 history: that original fixture starts atX−1.6/Z2.8 and never travels through the upstream long-IN bend. Any broader candidate must therefore preserve the old timing protocols while qualifying both incoming routes. Altering return contact is not automatically forbidden, but it would require direct dynamic proof of capture/refire rather than claiming the old successful sweep remains untouched. Bats, force/input/score laws and original test conditions stay fixed. No new design dimensions or implementation are approved by this rejection packet.

## Reproduce without large raw traces or working-tree modules

`node docs/pinball-experiments/left-receiver-feasibility-rejected/reproduce.mjs`

`node docs/pinball-experiments/left-receiver-feasibility-rejected/reproduce-constraints.mjs`

Both commands read compact embedded geometry/contact/position-segment inputs, recompute the exact stored reports and assert equality. They write nothing and do not import the working-tree game or create a physics world. inputs/return-sweeps.json.gz preserves only relevant original frame endpoint positions/stages; evidence-references.json retains original source paths, byte counts and SHA256. The original artifact scripts are preserved in scripts/ for provenance; portable reproduce scripts are the supported standalone checks. Selected shape points, all12 sweep summaries, target contact and exact dimensional bounds are retained in evidence/.

No production or unrelated bumper files were read into the geometry input or edited. No commit/push is part of this packet.
