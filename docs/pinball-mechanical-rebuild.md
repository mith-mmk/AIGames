# Pinball mechanical rebuild audit

## Baseline and status

Read-only source audit performed against branch `pinball/0.1.0`, baseline commit `8aab73c`. The repository's `AGENTS.md` applies. This document records requirements and review gates, not a claim that the rebuild is complete.

All requirement groups A–H are **incomplete**. Four standalone model files are in progress, as reported by the coordinating worker. There is no new assets integration or Site yet. Standalone previews, including mounted fixtures, do not establish actual installed-playfield validation.

## Sources and dimensional confidence

- [Stern Jaws LE/Premium manual, pages 46–49](https://www.sternpinball.com/wp-content/uploads/2024/02/Jaws_LE_Pre_web.pdf). The coordinating worker reports rendering and visually viewing these pages. This audit worker has not independently viewed those renders. Use the manual as assembly reference, not proof that this fictional table reproduces its geometry or dimensions.
- [Existing assets](../web/js/pinball/assets.mjs), [surface-detail overlay](../web/js/pinball/parts-detail.mjs), [playfield parts](../web/js/pinball/playfield-parts.mjs), [decorative mechanisms](../web/js/pinball/mechanisms.mjs).
- [Layout](../web/js/pinball/layout.mjs), [physics](../web/js/pinball/physics.mjs), [active ramp](../web/js/pinball/ramp-geometry.mjs), [application binding](../web/js/pinball/app.mjs), [plunger input](../web/js/pinball/plunger.mjs), [bumper effects](../web/js/pinball/bumper-effects.mjs).

The current ball diameter is 0.27 game units. Comparing it to a real 26.9875 mm pinball does **not** establish a consistent scale for every existing object. Any inferred conversion, clearance, wall thickness, fastener size, motion travel, or timing is an **estimate** unless supported by a specific source dimension. Parameters must label their provenance and distinguish existing gameplay constraints from measured physical dimensions.

## Requirement matrix

| Group | Required mechanical structure | Baseline shortcomings | Status and completion evidence |
| --- | --- | --- | --- |
| A: Flippers | Rounded tapered bat, separate rubber, shaft, bearing, mount and engraving | Tapered extrusion exists, but rubber is a solid full-body extrusion under a scaled duplicate shell. No complete shaft/bearing/mount. Label is a texture plane. Collider is rectangular; visual and physical pivot heights differ. | Incomplete. Show separate fixed mount and moving shaft/bat, rest/full stroke/recovery, profile-to-collider overlay and actual installed clearance. |
| B: Pop bumpers | Cap, housing, ring, moving skirt, support and translucent lens, contact-driven movement | Stacked primitive shapes; overlay squashes the old sphere. Lens is opaque. Existing feedback is a score sprite and expanding ring, not mechanical action. Root-batched fittings cannot follow moving parts. Mini bumpers also need replacement. | Incomplete. Show skirt/ring actuation, fixed supports, lens construction, reset and actual ball-triggered motion for both sizes. |
| C: Slings | Posts, rubber, kicker, plastic, bolts and hit movement | Rubber/posts/plate exist, but kicker is a static bar. Every perimeter segment activates physics. Added plates are overlays. | Incomplete. Show articulated kicker, rubber/contact relationship, fixed plastic/supports and accepted-hit animation without duplicate score. |
| D: Ramps | Continuous floor, walls, supports, joints and entrance/exit transitions | Active route uses zero-thickness surfaces and near-invisible floor/walls. Structural support and joints are absent. Trap-prevention skirts/nose are gameplay-critical. | Incomplete. Show thickness, anchored supports and continuous transitions; validate the actual ball along the full route and below it. |
| E: Wireforms | Actual paired ball-supporting wires, supports and fixings | Elevated top rails and sparse vertical rods sit above an almost invisible supporting floor. They are not a pair of lower ball-support wires. | Incomplete. Show two supporting wires, cross ties/fixings, ball seating and uninterrupted route. Any simplified collider must be documented and aligned. |
| F: Targets | Face thickness/plate, metal bracket, hinge, spring, motion and lighting; drop only for actual drop targets | Boxes on posts, one bank-wide capsule, no per-target IDs/motion/spring or controlled hit light. Current targets are standups. | Incomplete. Show standup deflection/recovery and per-target event mapping. Do not silently convert to drop targets. |
| G: Plunger | Rod, continuous coil, guide, knob, compression and recovery | Spring is disconnected toruses. HUD moves rod/knob while head and spring stay fixed. Release directly assigns ball velocity. | Incomplete. Show coherent pull/compression/release linkage, full recovery and shooter alignment. Retain launch semantics until a separately tested physics change. |
| H: Playfield/cabinet | Thick board, walls, metal rails, mounts, glass, drain and trough | Thick boxes and rails exist, but not a complete glass/mount/drain/trough assembly. Visual board extends beyond the physical floor termination. Rear gears are decoration. | Incomplete. Show actual openings, anchored assemblies and installed ball/drain clearance; decorative rear machinery does not satisfy this group. |

## Ownership and replacement interfaces

`parts-detail.mjs` explicitly implements manufactured surface detail only. It preserves primary shapes and merges most fittings into table-root batches. This is not a structural replacement and is unsuitable for independently moving subassemblies.

1. Establish shared parameters for local origins, mounting planes, contact envelopes, motion limits and estimated dimensions. Preserve current placements and route until collision changes pass regression tests.
2. Give each reusable component a model builder returning a root, explicit moving-part handles, a state setter and disposal ownership. Separate parameters, model geometry, controller and Rapier adapter. Do not combine moving parts with stationary table-root batches.
3. Replace the original constructors in `assets.build()` and remove the corresponding overlay builders. Do not conceal old shells inside new ones.
4. Maintain compatibility aliases during migration: `assets.flippers`, `plungerRod`, `plungerKnob`, `spinnerPivot`, `laneLamps`, `missionLamps` and `sideSaveLamp`.
5. Route direct transforms in `app.mjs` through controllers. Flippers should follow the physical angle, not an independently interpolated second angle.
6. Extend accepted physical-hit events to sling and individual target IDs. Consume the event queue once and fan out to animation/effects, preserving cooldown and scoring behavior. The current visual-hit queue only emits bumper events.
7. Split ramp parameters/sampling from rendering and Rapier construction. `ramp-geometry.mjs` is active; `assets.ramp()`, `layout.RAMP` and `PlayfieldParts.upperRamp()` are not the active route.
8. Preserve or replace the ramp's low-gap blocking geometry deliberately. Removing skirts and the nose without retesting can reintroduce traps.

## Review gates

### Before integration

- Every group A–H requires isolated top, 45-degree and side images plus a movement sequence where applicable. A static ramp/wireform/cabinet requires a ball traversal or clearance sequence rather than fictitious mechanism movement.
- Each required subpart must be identifiable. Unknown dimensions and inferred tolerances must be explicitly marked estimated.
- Capture rest, full action and recovery. Fixed mounts remain fixed, moving components stay attached and reset returns to baseline.
- A standalone mounted fixture is useful assembly evidence, **not** an installed-playfield screenshot. Do not label it as actual installation validation. A staged playfield preview can test placement before production integration, but must likewise be labeled as staging.
- Record which gates have evidence; unrendered code or a successful import is not visual approval.

### Integration and gameplay acceptance

- Use the same component builders in previews and the actual game. Provide actual installed-playfield top/45-degree/side images after staging review and integration.
- No superseded primary shell or detail overlay remains for a replaced component.
- Drive action from accepted physical events. Animation alone must not create scores or kicks.
- Compare colliders and rendered contact surfaces with an overlay. A proposed initial contact-face tolerance is 0.02 game units, an engineering estimate requiring review rather than a sourced physical specification.
- Check all route clearances against the 0.27-game-unit ball, with an explicit margin. Verify ramp entrance/exit continuity, seated wireform ball support and absence of ball-blocking support pillars.
- Preserve same-ball ramp traversal, cradle/return, shooter return, drain and trap regression behavior. Run `npm run test:pinball` and the browser playtest, including actual ball traversal rather than a posed ball alone.
- Record mesh/triangle/draw-call counts and frame timing relative to baseline. No unbounded per-hit allocations.

## Suggested priority

First establish the reusable interfaces and review harness. Rebuild moving mechanisms A/B/C/G, then F; rebuild D/E together; complete H and integrated clearance testing. All groups remain required. Added fasteners or rear decoration cannot substitute for functional construction.

## First prototype checkpoint (not integrated)

Standalone A/B/C/F/G builders now exist under `web/js/pinball/components/`. Review script `scripts/pinball-component-review.cjs` produces top, 45-degree, side, mounted-fixture and action frames. The fixture is deliberately **not** called installed-table validation. There is no runtime replacement or Site deployment in this checkpoint.

Observed prototype changes: flipper has separate tapered bat, continuous rubber belt, shaft and fixed bearing; bumper has fixed housing and independent ring/two pull-rods/skirt; sling has grooved posts, rubber loop, linked kicker and raised plastic; target has a thick strike face, hinge and spring; plunger has a continuous compression helix, hollow guide and moving rod/tip. These are upper-mechanism prototypes; full under-table solenoids/linkages are not yet modeled. All A–H remain incomplete against final acceptance.

Independent review found and prompted fixes for opposing sling/rubber movement, owned resource disposal, and an incorrectly end-on plunger side view. Current integration blockers: rectangular flipper contact box versus tapered visible tip/height; old fixed shooter stop versus visibly retracting tip; collision-event binding for sling/targets; actual installed clearance and game performance. Engraving visibility is under correction. New finite-geometry/lifecycle tests pass but cannot certify aesthetics or ball contact.

### Sourced dimensional references

These seller measurements describe specific replacement parts, not universal dimensions or this table's established scale:

- [Standard ball 1-1/16 inch](https://www.pinballlife.com/1-116-pinball-standard-size.html) = 26.9875 mm.
- [20-10110-5 bat](https://www.actionpinball.com/parts.php?item=20-10110-5): nominal 3 inch; pivot-to-tip distance unverified.
- [38-6519-6 rubber](https://www.marcospecialties.com/pinball-parts/38-6519-6): unstretched 1.5 inch ID, .5 inch height; stretched contour/thickness unverified.
- [545-5197-00 body](https://www.actionpinball.com/parts.php?item=545-5197-00): cap hole spacing 1-3/8 inch; body diameters unverified.
- [500-6139-02 target](https://www.actionpinball.com/parts.php?item=500-6139-02): 1 inch square face; current artistic target is not that exact product.
- [Shooter rod](https://www.pinballlife.com/williamsballyjjp-round-shooter-plunger-rod.html): 7-3/4 inch usable length, not pull stroke.

Stern manual p5 recommends 6.5 degrees pitch; p70 overall cabinet extents are not playfield dimensions. Manufacturer exploded diagrams p46–49 were downloaded, rendered and actually inspected locally. Product photographs were not successfully retrieved by the research worker, and are not claimed as inspected. Model dimensions remain estimates except explicitly sourced facts above.

### Review iteration notes

- Corrected flipper engraving: the core had covered the recessed lettering bed; structural recess is now visible in top and 45-degree images.
- Rejected first ramp support layout because the left elevated loop floated. Revised to distributed supports and continuous underfloor bearers. New supports have **not** passed integrated route clearance.
- Rejected first cabinet because tall walls concealed the board; revision keeps the carcass below the mounting plane. Final integrated view remains pending.
- Captures use exact 45-degree elevation, separate longitudinal side views for plunger/target, and a studio reflection environment so chrome is not judged from black reflections. These lights are review fixtures, not proof that the production lighting already works.
- Static assemblies do not get a fictitious “moving” acceptance image. They still need real ball-traversal evidence.
- Draw counts are not yet optimized: standalone ramp 141 meshes and cabinet around 127 meshes. Batch static geometry within each rigid assembly before production integration and measure desktop/mobile frame times. Do not silently trade away required visible structure.
