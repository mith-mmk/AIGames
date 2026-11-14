# Curved receiver static independent review

Scope: dimensioned static plan only, not an installed runtime replacement. Accepted HEAD eaf9be3 has runtime 8849609. No production source, expectation, solver, force or geometry edits. No dynamics, physical-phone or human-play qualification.

Reviewed fixed plan: ../curved-receiver-static-eaf9be3/plan.mjs SHA256 824163d6c3c9b0ee44a29c08c0716c40052ff7cbb241852c4e326d645e38ea4c. Original failed inner remains in initial-plan.mjs. These checks used the fixed dimensions directly.

## Moving bat and fixed supports

sweep.mjs builds an independent zero-gravity Rapier world without PinballPhysics or stepping. It uses the actual eight vertically relevant MechanicalFlipper moving-mesh convex envelopes plus the shared contact hull. Nine higher moving meshes are excluded only because their complete Y intervals stay above every proposed rail/support for all yaw. Hulls conservatively fill holes, so they cannot excuse an overlap. Both sides follow mirrored geometry; the isolated calculation uses the left side.

270 midpoint poses across [-.60,.48] use .004rad cells. Each mesh's maximum pivot radius bounds motion between an arbitrary pose and its nearest midpoint by 2*r*sin(.001). Actual mesh minimum +.07376919 occurs at rubber / divider segment49, angle .478. Subtracting the corresponding .00227820 motion bound leaves +.07149099 over the full angular interval. Shared-contact lower bound +.07150813. This is a geometric interpolation bound conditional on Rapier contact-query accuracy, not a formal engine error certificate or an energized mechanism test. It independently supports removal of the old rail-through-bat overlap without needing to pretend discrete samples cover all angles.

## Pairwise sphere-expanded passages

gaps.mjs computes exact finite segment-to-segment distances for every pair of chord segments, not only corresponding stations or sphere-center samples. At floor center Y=.175, a radius .135 sphere against radius .020 stock at Y=.220 needs projected axis separation 2*sqrt(.155^2-.045^2)=.2966479395. At rail height the requirement is .310.

- Original inner/divider minimum axes .2555005432: ground center-space gap -.0411473963, rail-height -.0544994568. Original configuration is not accepted as a passage.
- Revised inner/divider minimum axes .4189562455: ground center-space +.1223083060, rail-height +.1089562455. The shortened, inward-curved inner removes that particular closed throat.
- Divider/OUT tail minimum axes .3266854397, between divider segment51 and OUT segment42. Solid surface separation .2866854397. Ground center-space +.0300375002; rail-height +.0166854397. The tail does NOT maintain .430 normal spacing globally. The +.030 ground result exceeds .030 by only .0000375; do not claim a robust .030 margin to an ideal curve or other tolerance. These numbers describe the actual fixed chord geometry.
- This pairwise result does not prove connected free space amid all hardware, nor natural traversal at speed. The separate static audit’s separately recorded optimized OUT witness reports a continuous piecewise-linear existence lower bound +.01170888 at ground / +.00600009 at rail height against new lower parts only. Its midpoint-tail path is actually invalid; an alternate geometric witness is not a new physical guide or promised trajectory.

## Surrounding solids: distinguish the categories

surroundings.mjs queries all 1263 accepted fixed, nonsensor colliders except the lower .020 rails replaced by this plan. It adds 276 candidate rail capsules and 54 attachment cylinders, without stepping. Correct final output includes parentless fixed colliders. The first diagnostic extraction accidentally selected zero parented fixed objects; that diagnostic was corrected before any results were claimed.

No new inner-rail overlap with accepted fixed geometry was found. Its closest recorded obstacle is the floor, surface separation about .160. This is a solid-to-solid result, not ball-route qualification. Upper/shooter production geometry remains unchanged in this static plan.

26 negative pairs are categorised rather than combined into a gameplay-failure count:
- 18 new support shafts intersect the uncut board floor. Their shafts pass through the board and washers/nuts are below it, but actual bores and fastening detail remain unrepresented. This is a fixed mounting-detail issue, not evidence of a ball passing through the board.
- Six right OUT capsule segments overlap the fixed shooter-divider capsule. The straight x2.33/Y.22 OUT against x2.35/Y.23,r.045 shooter boundary already overlaps in accepted geometry; the new branch peels inward earlier. Worst reported gap about -.0426354. This is fixed-stock joint/union detail, not moving-part interference. Retaining an old overlap does not make the construction complete.
- Two right OUT shaft tops intersect that fixed shooter boundary, gap about -.0347915. These are proposed fixed joins and need shared external-surface/attachment treatment before a finished mechanical claim.

None of those fixed-joint/bore observations alone blocks a bounded route diagnostic. No new support/moving-bat interference was found by the separate sweep. Full flipper underboard linkage and complete board machining are not certified by this moving-group test.

## Saved shots, floor and wire limits

saved-shot-segments.json independently checks all finite segments between saved accepted positions from repress through +15 ticks for 18 shot records, using the candidate rails. Minimum sphere/rail gap +.01275314 (left, delay30), smaller than the separate static audit’s point-only +.01594303. Conservatively enclosing shaft cylinders with radius .018 capsules gives minimum +.22567442. This confirms only geometric clearance of those saved piecewise-linear paths. New capture position, actual intertick motion, collision response and shot success have not been recomputed.

The separate static audit’s wire vertical XZ column has minimum +.02491609 against lower parts near Y=.22. A vertical column is not the wire tangent or natural descent. The wire/upper/shot handoff must still be checked in the frozen installed source and bounded actual trajectories. Nothing here licenses hidden guides or forced centerline motion.

## Reference and visual scope

The current reference artifacts/reference/current-reference.png was re-opened and inspected. It shows long, relatively straight lower IN/OUT bands, broad slings, visible separate passages and outer mounting details. It does not specify exact CAD radii or ball-flow mechanics.

The fixed plan has divider radius .58155507 and maximum tangent rotation 66.4809 degrees before its return/heel tail, with additional outward recovery near the bat. That is a substantial curved lower guide, not evidence that the reference's long visual lane bands are reproduced. Radius, lane widths and stroke cannot be inferred as exact reference measurements. The static plan has no installed drawing/ink/material/budget result yet; full installed top/45/mobile/side visual comparison remains pending. Do not claim reference improvement from clearance alone. The save remains a separate unfinished static mechanism; the earned-save actuator proposal remains design-only and is not implemented here.

Conclusion: the revised source has no newly demonstrated solid/moving-bat collision and fixes the original inner throat obstruction. It is suitable for further bounded route/installed-image diagnosis, not adoption. OUT tail margin, natural IN capture, wire handoff, new shot response, shared fixed joins, mounting bores and visual lane proportions remain explicit checks. No new shape variant was introduced by this review.
