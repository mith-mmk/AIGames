# One earned-save actuator proposal — design only

No source, geometry, physics trial or production change. This is separate from rejected C/receiver routes and from rail/heel or sling investigations. Reference art suggests a mechanical side kicker but does not define its internals, stroke, force or dimensions. Numbers below are explicit design estimates, not recovered reference CAD or approved safety thresholds.

## Conclusion and changed contract

Propose one finite-mass, single-axis sliding cam/rod assembly, driven only through a bounded actuator and real Rapier contact. Do NOT add the old direct ball impulse. Keeping the existing static picture and animating an unrelated rod is not this proposal.

Retain mission earning, at most one stored charge, tilt guard, one consumed charge per firing, no new points, fixed mounted direction and no reposition/rescue. The exact current result velocity (transverse0, upstream12, unchangedY) is an implementation law, not a user-specified constant. It cannot be promised for a finite-mass inclined contact shoe at every incident state. The parent permits comparison of a real actuator against that capability, provided ability is not lost and power is not unfairly increased. This is the necessary behavioral change to qualify, not silently hide.

## Current source contract

physics.mjs currently tests left position x(-2.62,-2.08),z(3.45,3.72),y<.5 and vz>0. If not tilted and a charge exists, state.onEvent(side-save) consumes it and increments uses once, then the ball receives mass*(-vx,0,-12-vz). There is no actual shoe-contact requirement in accepted gameplay. game-state.mjs initializes side charges0; workshop mission completion sets charge1; side-save sets0 and increments uses. This is distinct from center-save, which starts charged and has its own condition.

C/receiver replace the detector with local coordinates and actual static-cam contact, rotate the same horizontal kick to their mounted axis, but keep cam/rod static. Their fixed relocated axis is not inherited by this independent proposal. First design at accepted left OUT station, keeping accepted board/lane/upper/shooter/bats. If the required swept assembly cannot fit there, stop and report the occupied geometry; do not import C lane relocation to make it fit.

## Mechanical arrangement, one candidate

- Fixed drive axis: accepted upstream -Z, horizontal, not ball-relative. A prismatic guide constrains the moving rod and shoe along this axis. Coil housing and guide bearings are fixed; cam, rod and slider are one rigid body or a fully constrained rigid assembly.
- Initial dimensional study: retain the C-style low shoe envelope across.160/along.220, floor.040 and crest.060, with a proposed total longitudinal stroke.060. Park at the downstream end; energized travel is upstream. These are a starting packaging envelope only. The crest must not quietly be made taller or span the whole OUT to gain purchase. Resting low hump and all swept points need actual legal uncharged traversal tests; the old static envelope already intersects a floor-height centerline and is not certified clear.
- Continuous rod from shoe to underboard driver, with the actual swept slot/opening represented consistently where it crosses the board. The board/slot/support edges cannot create a ball-catching hole or invisible bridge. A compliant seal or floor insert, if needed, must be real shared geometry rather than deleting collisions.
- Coil mounted by a real bracket joining both studs and housing/bearings. Current separate studs at across±.100,r.016 do not touch housingr.055:gap.029. Use a connected fixed yoke with real fasteners and sufficient underboard clearance, not visual proximity. Bracket dimensions await installed packaging, not an assumed safe footprint.
- Hard travel stops and a passive return spring/damper under the board. Meshes derive directly from physical slider position; no independent time-based stroke animation. Show fixed coil/bracket and moving rod/shoe separately. Contact/spring reaction must be physically transmitted; circular mock nuts alone are not full construction.

The sloped low shoe transfers some vertical momentum. ZeroY impulse and exact transverse cancellation are therefore not retained guarantees. If the real shoe launches the ball over the divider, stalls weak entrants, or cannot return them upstream without excess energy, reject this one candidate rather than changing lanes or strength opportunistically.

## Single power source and accounting

Use a dynamic slider with finite mass, joint limits and bounded drive force/work, not an arbitrarily positioned kinematic surface with unlimited contact work. Read motor/joint/contact APIs against installed Rapier before implementation. Actuator drive acts on slider only. Remove the old ball.applyImpulse for this mechanism. No setLinvel/setTranslation on the live ball, no second impulse disguised as a correction.

For the accepted ball mass.08, the old direct kick's horizontal kinetic-energy target is .5*.08*12²=5.76. At incident horizontal speed(vx,vz), its instantaneous horizontal energy change is .5*m*(144-vx²-vz²), which may be negative. This is not permission to inject5.76 on top of the incident energy. The old kick also removes transverse momentum and can dissipate a fast arrival; a passive guide plus finite actuator may behave differently.

Before implementation select a finite motor force, stroke duration, slider mass and energy reservoir as one documented design, not a sweep seeking a pass. All mechanical energy sources count: drive work, preloaded spring release and residual slider kinetic energy. Retraction must not add a second useful hit. Compare actual ball energy/momentum transfer to the accepted operation over matched legal incoming states, including vertical/angular energy and actual tilt/gravity potential where relevant. Motor reservoir and positive work bounds prevent hidden unlimited drive, while measured ball outcomes determine whether effective power is excessive or ability is lost. Numerical tolerances must come from time-step/contact-resolution evidence, not acceptance-driven widening. No force value is approved by this document.

## State/charge/contact contract

States: idle/charged-ready → contact-eligible firing → coast/retract → ready. An energized stroke requires genuine incoming shoe contact and downstream approach at the mounted station, not merely entry into a large trigger box. One firing latch identifies the stroke and ball; repeated manifolds, grazing contact and delayed frames cannot consume multiple charges or fire again. Consume the existing charge/event exactly once when physical drive begins. Retain the old mission earn and tilt rules; no charge refund merely because the kick misses.

Uncharged contacts are passive only. Reverse-travel contact does not energize. Tilt disables new drive; any already-moving mechanism must settle without another powered hit. Pause freezes physical state rather than completing animation in wall-clock time. Restart/ball transition resets latch/counters and returns the mechanism safely when no live ball is in the swept volume; it must not teleport through a contacting live ball. Reset energy/spring state must not create a free kick. A new charge earned while retracting cannot bypass the ready/contact requirement. Dispose must free the additional bodies/joints with the world.

## Required comparison, prior to adoption

1. Packaging: actual installed source and shared mesh/collider slot, mounts, stops, rod and bracket. Full swept envelope against board, OUT rails, wire/support and ball. Same real geometry through every stroke phase. No cutaway claimed as installed clearance.
2. Passive cases: both OUT sides with charges0, slow/near-rest/reverse/glancing entries, top/grazing shoe contact, rail-contact combinations. No new stalls, pinches, escape route or artificial reset. The .020 crest cannot be assumed benign.
3. Power cases: same legal approach positions/velocities/spins in old and new, including weak, ordinary and high-energy states. Record incoming/outgoing 3D velocity/spin, transmitted impulse/contact normals, slider pose/speed, motor work, spring and total mechanism energy, ball total-energy change, upstream distance, adjacent rail hits, event count and charge consumption. Preserve invalid starts explicitly; do not move them into a success.
4. One-use lifecycle: no charge, one charge, repeated contact, tilt, pause/resume, restart and subsequent ordinary game. Demonstrate no double drive from motor plus old impulse, spring return or residual slider motion. Fixture-granted charge is not natural earning proof.
5. Natural workshop earning→OUT arrival→single save→field return and ordinary uncharged drain, same-ball progression, center-save independence and equal-or-better meaningful control/aim outcomes. Full regressions/render budget and device/human limits follow only after the local gates.

No test passes, dimensions proven safe, restored-fixture reachability, physical-phone or human-play claim here. This proposal needs finite-power/packaging decisions and an authorized artifact implementation before it can be independently adopted. Failure to fit accepted OUT or preserve ability without excess power is a real stop condition, not permission to mix upstream variants.
