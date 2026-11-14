# Whole long-lane diagnostic freeze

**Not adopted. Not a safety PASS.** The one source map is frozen for independent geometry/render review and limited contact diagnosis. Production remains accepted `884960985a413986d57aff0c2280e59a7be79dcf`; repository HEAD is `891ae621f7d822dcb2c3d66ea1247fa4f4c97bb5`.

- Source SHA256: `94ea51ffb02ae7d030f79ade9f05d02eeeaf73da088ea83b8d518253624d0c03`.
- Baseline map SHA256: `2b7d62fa4930d9c988615e52076a062ccf9333c529d17a5f4064667c2fb32199`.
- Run from repository root with **only** `node --import ./artifacts/pinball/whole-long-lane-891ae62/loader.mjs <diagnostic.mjs>`. Do not chain a previous experiment loader. Browser review must route the same source map.
- `manifest.json` lists every source hash and 12 changed / 27 byte-identical accepted modules. `dependencies.json` records current build-input/vendor bytes, not an assumed prior dependency list.
- `build.mjs` reproduces the map from accepted Git bytes and the listed two historical edit-list inputs, local geometry and helper. It is a build provenance script, not a safe recovery wrapper: do not rerun over this freeze. A later recovery packet must redirect output and verify hashes before writing.

## Fixed whole layout and shared construction

Board X[-3.23,3.65], Z[-5.75,6.15], width6.88/length11.90, centerX.21. Pivots ±1.90/Y.27/Z4.45. Bat length1.65, half-width.14, heel-back.06. Shared-profile rest central gap1.0488634. Central gap was not constrained to the accepted value. This choice preserves neither old difficulty nor old aiming merely by construction; it requires play comparisons.

Divider starts at |X|2.30/Z1.35. Its long upper section is followed by the fixed two-arc receiver connection (R1.2703545, angle37.859511°) to |X|1.765226423/Y.22/Z4.009302855, then its heel tail. The lower inner begins only after the sling at Z2.75 and ends Z3.20. Broad slings, targets, robot, rollover bars/sensors and field-exit datums stay at accepted positions. The design retains ground-entry S to left wire flow, not a different return topology.

Rail render and contacts use the same capsule chords. The accepted outer shooter octagonal cross-section is explicitly replaced by the shared round capsule surface, rather than retaining a hidden old collider. Shaft radius.018 reaches Y[-.18,.22]; washer Y[-.152,-.140], nut[-.174,-.152]. These are below the real board bottom-.14, not buried above it. Board bores are not modeled. Left ramp columns X-3.12 and actual crossheads connect to the ramp; right columns now attach at the actual curved shooter-inner rail X at each support Z.

Wire rows share a Hermite tail from old parameter.8 to (-2.06,.44,2.75), with geometric exit tangent (.28426466,0,.95874585). Render, contacts, supports and terminal sensor derive from those rows. Terminal sensor center(-1.98040590,.58,3.01844884). Natural flight, terminal crossing and capture are unproved.

Shooter axis2.93. Its inner uses a long shallow two-arc connection from X2.75/Z.50 to X2.35/Z-3.10 and the old open end Z-3.90. Outer-to-inner normal axis spacing.455, radii.060/.045, nominal bare surface width.350. Roof begins at(2.805,.23,-4.15) and physically meets the outer end; corresponding backplate is extended. Later roof/bar/field datums are retained. The first roof direction changes from16.949° to21.092°; no natural launch success is inferred. Old front/rod/stop Z positions remain, with shooter X translation only.

## One early OUT curve, replacing the failed late throat

The `late-out-throat-failure/` snapshot preserves source4c586a and its negative floor-throat result. The new source changes only two virtual modules from4c: shared geometry and shared lower helper.

OUT follows the previous offset until divider bend parameter.40, then a single tangent Bezier with first handle.25 ends vertically at |X|2.57/Z4.85. Left departure(2.497909499,.22,3.307558322); right(2.515179592,.23,3.317645139). The third control is(2.57,Y,4.30). Actual existing OUT shafts/underside fixings follow the new curve; none are silently omitted. Exact divider-vs-OUT chord/cap minimum surface gaps are left.389880269 and right.384985828, respectively .119880269/.114985828 beyond ball diameter.270. These bare pair gaps do not certify every support or natural trajectory.

Save is mounted at the actual left OUT median at Z3.60: center(-2.144892599,0,3.60), down(.146668949,0,.989185635). Visible cam, rod, colliders, detector frame and finite earned action share that fixed axis. Same speed12 contract, charge count and earned conditions; no ball-relative aiming. The cam is still static, top.060 versus board.040. Moving actuation and coil bracket closure are unfinished. Low-speed uncharged traversal remains required.

## Right fork is reachable from above

The strip between OUT tail and shooter-inner is **not** a floor-level ball route: maximum floor-center interval is -.063335808. It is also **not sealed or inaccessible**. A falling sphere can bridge the two real rail surfaces. The outside-shooter reserve is a different route and does not resolve this branch.

`../whole-long-lane-static-891ae62/installed-out-bridge-check.json` evaluates the actual installed capsules, without adding/removing colliders or stepping the world. Across1713 Z samples the contact solution has other fixed-member clearance at least+.040673603 and ideal contact-normal tangent gravity component at least+1.904686. Intended-contact numerical penetration reaches-4.3678e-7. These sampled geometric results do not prove frictional motion, junction stability or natural escape.

`high-contact-fixture.json` in that directory fixes one diagnostic start before execution: p=(2.640349081573,.377746895196,3.317645139336), zero v/spin, no input, dt1/120, maximum1800ticks/15seconds. It is the contact solution at the predefined OUT departure, raised Y+.005 only for positive initial clearance. Actual all-fixed minimum clearance+.003990362. No successful-start search was performed. Observe OUT axis end Z4.85, sphere-inflated cap end5.03, and ordinary drain5.05, all contacts and persistent low speed. No rescue/reset is authorized to turn a stop into a pass. Natural accessibility and downstream behavior remain independent tests.

## Static results and limits

- Ordinary engine assembly:1581 colliders,59 mechanism attachment parts. No world step was run in this work.
- Shared bat contact minimum+.06593357; eight actual moving-mesh convex envelopes over541 poses minimum+.06590718. Subtracting nearest-pose rotational displacement.00164910 gives+.06425808 for the tested lower rail/attachment set, with query error separate. This is not an all-cabinet swept-volume certificate.
- Receiver target is derived from actual shared bat surface plus ball radius, not from a chosen quiet trace forced into place. Ideal ball center(-1.616902454,.175,4.009302855), bat-local u.454610851. The matched normalized inward X distance.17157427 is a design goal. Actual rail and bat contact normals differ; natural equilibrium/refire remain unproved.
- `initial-column-failure/` retains d2ae6a with right curved-shooter support penetration-.099519. The right-column correction is shared with crossheads, feet and caps.
- `late-out-throat-failure/` retains4c586a: left floor-center interval+.00312559, right-.00605130. Same-height surface width alone was not used as a full3D impossibility claim.
- Previous continuous ground witnesses: left exterior bound+.01650075, right exterior outside shooter+.00040185, upper shooter+.00776628, IN approach+.02650485. They describe explicit sampled polylines with distance-error bounds, not natural trajectories. The right fork is separate. Current moved OUT supports/cam require updated local witness review; do not silently transfer all old path results.

The strike and launch functions, game-state and plunger-input source remain byte-identical. Longer bat geometry still changes contact leverage, normalized aim location and world shot paths under those same formulas. Keys, force coefficients, solver, gravity, ball mass, restitution/friction are not tuned. Source geometry contracts change ready/playing out-of-bounds from±3.2 to[-3.68,4.10] (board edges+.45) and shooter-return X from(2.45,2.70) to(2.85,3.10), preserving the previous Y/Z/direction conditions. Ordinary drainZ5.05, phase/reset counts and scores are not broadened.

No full202, natural54, continuous aim, natural wire/capture, human PC/mobile or new six-power launch run is claimed. Independent contact diagnosis and render review may append separate results without changing this source. Wide/asymmetric composition, right upper blank space, conspicuous crossheads/bat, wire-over-ink, heel curvature, apron fitting and static save remain visible reference concerns. The reference image is perspective artwork, not CAD. The new source has not yet earned adoption.

## Final main-OUT static supplement

`../whole-long-lane-static-891ae62/main-out-check.json` uses the actual new OUT median and every fixed non-sensor collider (only floor contact excluded). Right floor-level continuous center-polyline lower bound+.051064066. A left geometric polyline rising .021 over the .020 cam step has lower bound+.000547999; it proves an available geometric route only, not passive low-speed motion. No curve is injected into gameplay.

All fixed-height negative queries are retained. Left floor Y.175 intersects the intended cam by-.019999999; Y.195 only touches its top. At Z2.75 the real wire crosshead centered(-2.59,.38,2.75) intersects a sphere at median X-2.48348546/Y.22 by-.009000014, and at Y.35 by-.134999993. Thus ground passage exists but elevated space is not uniformly free. The upper Y.575 line also intersects wire/support members. These are not hidden or removed to make the test pass. Ball rebound/falling interactions remain natural-play checks.

An independent fixed elevated-contact trial was reported to drain normally after112ticks, with post-step capsule penetration down to-.00345817. Its exact report belongs to `../whole-long-lane-high-contact-891ae62/`, not to this static calculation. One initial condition draining does not establish natural reachability or safety of all high falls. No source changed after that trial.
