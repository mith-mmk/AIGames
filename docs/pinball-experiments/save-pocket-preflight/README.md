# Side-save pocket preflight: rejected before actuation

Production remains71245b2. This packet is a measured design rejection, not a new gameplay feature or a completed save mechanism.

## Real baseline use and two routes

An observation-only wrapper replays the unchanged54-case natural-input controller. Every complete result and the summary exactly match the adopted baseline:61 ramp traversals,54 games finished, zero stalls/live-position resets. Three games naturally earned and used the side save, all on ball3:

- Power.75/release44: pre-impulse position(−2.160506,.169598,3.458377), velocity(.715210,approximately0,5.109468).
- Power.925/release60: position(−2.150989,.169937,3.472837), velocity(.733907,approximately0,4.484277).
- Power.925/release84: position(−2.132035,.170001,3.476735), velocity(.045956,approximately0,4.493051).

All three are between the existing outer rail and IN divider. The current direct impulse cancels lateral velocity and reverses longitudinal velocity to approximately−12 without changing the spin. This is an observed implementation contract, not proof of a real contact actuator. The observation windows contain120 prior discrete steps, the triggering step and119 following steps. They are not swept-volume certification or a counterfactual powered-shoe simulation.

Existing legal uncharged OUT fixtures also follow an outer route. Their initial legality is recorded, and both routes must be considered. A proposal fitted only to the natural inner route would not demonstrate preservation of the outer route. Conversely, those synthetic fixtures should not be mislabeled as the actual three naturally earned saves.

## One parked primitive, exact contact gate

The prior lateral-deployment concept parked a face at X[−2.695,−2.395],Y[.09,.26],Z[3.54,3.58], then proposed a lateral travel.42 and upstream stroke.12. Only the parked face was constructed: one closed12-triangle cuboid, using the same dimensions and placement for the Rapier cuboid and rendered mesh. No rail opening, bridge, carriage, motor, force or production change was built after this first gate failed.

At actual saved positions from20 legal uncharged stable OUT cases,14 spheres intersect that parked primitive. A conservative inner cuboid, inset.01 on every boundary, still intersects12 cases. The worst core witness center is(−2.502411,.170822,3.575541), signed Rapier contact distance−.129459. This is not merely a corner-rounding issue. The constructed shape is an unrounded box, not a finished rounded shoe; the inner-core result also excludes edge treatments confined to the removed.01 boundary shell, not every conceivable shape.

The rejected early-confluence geometry has0/20 sampled parked intersections, but its lane changes are not adopted and retain ramp timing/control failures. That apparently free pocket cannot be imported into the stable game as an independent improvement. Stable historical physics/layout/ramp source identity is checked explicitly in the gate script.

The three actual-earned save windows have0 parked-face intersections, with minimum sampled surface gaps approximately.11329/.11809/.13547. This does not negate the outer-route obstruction. Stable fixture samples are spaced.1s; candidate samples are1/120s. A detected overlap is an exact static witness. Absence of sampled overlap does not prove continuous clearance. No trajectories were rerun against the shoe and no dynamic success is claimed.

## Disposition and next constraint

Reject this lateral parked position before tuning power or finishing its support assembly. Preserve both incoming/return corridors and the existing lower layout while assessing a different retraction direction. A possible next study is vertical parking with its lower face aboveY.35, but that has not been modeled or approved as feasible: the overhead frame, ramp/wire return, airborne ball, deployment sweep and contact timing must all clear. A floor slot is not assumed invisible or harmless.

Any later physical drive must use actual shared mesh/contact geometry, finite moving mass, constrained motion and bounded energy. Installed Rapier0.17.3 joint declarations expose motor configuration and limits but no max-force setter; stiffness/damping alone is not a proven force/work cap. Audit actual actuator work rather than adding a second ball impulse. Retain earned charge, tilt, one-shot use, passive drain, pause/restart and same-ball progression. Existing matched-history timing failures and adjacent aim-range comparison remain independent adoption gates.

No new full regression or phone test was needed to reject this isolated static primitive. The stable runtime is unchanged; the prior224-test pass is not presented as validation of an actuator. No powered-mechanism performance budget, actual-phone or human-play claim. Overall pinball remains unfinished.

## Reproduction and evidence

From the repository root:

- `node docs/pinball-experiments/save-pocket-preflight/scripts/parked-shoe-gate.mjs`
- `node docs/pinball-experiments/save-pocket-preflight/scripts/visual.cjs`
- `node docs/pinball-experiments/save-pocket-preflight/natural/observe.mjs artifacts/pinball/natural-save-replay/natural54.json`

Static replay reads the existing compressed fixture packet under early-confluence-unadopted and the natural observations in this packet. It writes artifacts/pinball/save-pocket-replay. The portable replay was executed and every static case, inner-core result and natural classification matched the original exactly. Natural replay uses the current runtime; use71245b2 for this recorded baseline. Its default observation output is artifacts/pinball/natural-save-replay (override with PINBALL_SAVE_OBSERVE_OUT). Preserve existing outputs before rerunning.

Static images show stable assets with a red rejected primitive, cyan outer-route witness and gold inner-route natural-save markers. These are table-local inspection images, not active play, not a completed actuator and not multiple simultaneous live balls. Source, results and file hashes accompany the packet.
