# Upper connector: one dimensional proposal, not implemented

Accepted runtime8849609 and unadopted source94ea51 remain unchanged. HEAD4f4170a. This is a source/geometry comparison, not a new source-map freeze or a successful launch result. Calculations are in dimensions.json; measure.mjs uses existing source only and creates no collider world.

## Observed cause, not an inferred roof collision

The independently observed .55 launches reproduced all first203 saved p/v samples exactly in both layouts. In94ea, first outer-connector contact is tick61–62, near segment center(3.106218,.23,−.800990), then inner contact tick75–76 near(2.532703,.23,−1.380655). Candidate vx changes0→−1.297→−2.387 and vz−6.713→−6.369→−5.834 around the first deflection. It does not touch the roof or a column before turning on the floor at tick197, p≈(2.543665,.171232,−4.177123). The old layout reaches the roof from tick149 and proceeds to Z−4.641886. The new turning point is still+.046330 from the first roof capsule after sphere expansion. Moving the roof alone would not isolate this earlier connector difference.

Evidence: ../whole-long-lane-local-891ae62/launch55-findings.md, launch55-contact-summary.json and launch55-contact-manifest.json. Zero-impulse contact records do not establish a CCD explanation. Contact impulses and p/v changes show direction/speed change; they are not a complete energy accounting.

## One minimum shape change

Use the existing right OUT branching point as the curved shooter's downstream datum:

- Connector start Z+.50→+2.45; end remains X2.35/Z−3.10.
- Same inward displacement.40 and two tangent circular arcs. R8.20→19.3515625; ideal maximum angle12.680383→8.244596°.
- Curve length3.629557→5.569199. The larger length mostly replaces existing straight stock; excess over the corresponding Z run decreases.029557→.019199. It is not an extra1.94 units added to the full launch distance.
- Same normal axis separation.455, inner/outer radii.045/.060 and chord tolerance.0005. Each complete inner/outer path still24 segments. Exact finite-chord/cap bare minimum surface gap.349990, ball-diameter reserve+.079990. Floor Y.175 pairwise center width+.096516. These are bare-pair dimensions, not a complete installed proof.
- The ideal precontact straight-ray estimate changes the normal angle from8.263472° to5.426164° and contact Z from−.717054 to+.594724. This is an illustrative circular-surface calculation at fixed Y.175, not a predicted engine trajectory or loss reduction percentage. An earlier contact also occurs at a different speed.

The implementation scope, if pursued, is the shared upper geometry's two datum values startZ/run. Derived inner/outer rails and three right ramp support positions change together. No launch/strike function, force, restitution, friction, solver, shooter axis, plunger, roof, backing, bar/sensor, longbat, lower receiver or wire change is proposed.

## Shared OUT and support effects

Right OUT's upper boundary is the same shooter-inner stock; it cannot be treated as unchanged. With actual chords at Z1.35, X2.75→2.718334912, horizontal bare gap.385→.353334912. Exact divider-to-inner finite-segment minimum is .352730018, reserve beyondD.270 is+.082730018. At fixed diagnostic start sectionZ1.55, innerX2.728651059 and horizontal baregap.363651059. The OUT join at(2.75,.23,2.45) stays exact, and its downstream curve/high-contact fixture region stays geometrically unchanged. The narrowest side effect occurs upstream near the divider's inlet cap, not at the lower tail.

The three derived right support columns, caps, feet and crossheads move with the inner stock:

- Row37/Z−.87839159: X2.63291602→2.47821722 (−.15469879).
- Row57/Z−1.83114132: X2.44910260→2.39166966 (−.05743294).
- Row78/Z−2.83623417: X2.35464213→2.35186429 (−.00277784).

No support is removed. Nominal columnR.037, cap/footR.040 and crossheadR.034 are retained. Crossheads continue to the unchanged actual ramp seats. Bare rail margins alone do not qualify those full-height joins or the ramp exterior. The right upper blank area and existing reference discrepancies are not fixed by this proposal.

## Required comparison before adoption

1. Assemble an isolated single source; check actual support/foot/cap/crosshead/ramp clearances at all reachable heights, rail tangent/cap continuity, shared OUT inlet and fixed .55 source hash. Confirm exact unchanged functions and lower geometry.
2. Compare ordinary .55 from actual installed shooter, observing the same first203ticks and subsequent end state: outer/inner impacts, roof/bar interaction, maximum upstream reach and same-ball return. Do not repair success with a force change or alternate start.
3. Compare unchanged six powers and weak.1 return/relaunch, then the affected right OUT inlet/uncharged/earned behavior. Natural rail-top and field-return accessibility remain separate from start legality.
4. Keep the longbat/reference/continuousaim qualification failures separate. An upper-connector improvement could be retained as a component result in the wide-table study, but cannot by itself qualify the whole94ea layout or be transplanted into the narrow accepted table without its shared width/shooter/support contract.

No new runtime shape, world stepping, test expectation, source freeze or production edit was performed for this proposal.
