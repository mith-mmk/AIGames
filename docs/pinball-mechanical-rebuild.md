# Pinball mechanical rebuild audit

## Historical baseline and status (superseded by integration checkpoint)

The baseline audit, requirement matrix and prototype notes below are retained as historical findings. Statements such as “no integration,” “all incomplete,” and “pending integrated clearance” describe that earlier checkpoint, not the current implementation. See the current integration checkpoint at the end for verified changes and remaining limits. This distinction does not declare all acceptance gates complete.

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

## Current integration checkpoint — 2026-11-13

The reusable mechanical builders now replace the corresponding primary constructors in `assets.mjs` and `playfield-parts.mjs`; the former `WorkshopPartsDetail` overlay is no longer built. This checkpoint records inspected integration and test evidence, not production approval or full completion. The coordinating worker's final browser and regression acceptance pass is still in progress.

### Installed construction and motion

- **A, flippers:** Separate tapered bat/rubber, shaft, bearing, mount and underboard solenoid/linkage are installed. The shared contact profile supplies the tapered Rapier hull. The moving assembly follows the physical angle, while mounts remain fixed.
- **B, pop bumpers:** Both full-size and mini models use separate housing, translucent lens, skirt, strike ring, pull rods and underboard actuation. Accepted physical hits drive bounded skirt/ring movement.
- **C, slings:** Grooved posts, rubber loop, cover, articulated kicker, coil/plunger and switch parts replace the old assembly. Physics and resting rubber use the shared contact path; accepted hits drive the visual linkage.
- **D/E, ramp and wire return:** The rise has a visibly thick acrylic floor/walls, joints, transitions, external supports and continuous underframe. The return uses two supporting rails and two containment rails with matched capsule contacts, not an invisible supporting floor. The gameplay-critical low anti-trap base remains visibly represented. Tests cover ground clearance, actual traversal and same-ball cradle/refire.
- **F, targets:** Individual standup faces, brackets, hinges and return springs replace the bank-wide visual/contact shell. Per-target contact IDs drive the struck target's deflection and light; these remain standups, not drop targets. Existing bank scoring cooldown is retained.
- **G, plunger:** Rod, tip, knob, guide and continuous compression spring move coherently. A kinematic stop follows the pull and safely returns on cancellation. Review found that an earlier immediate stop reset could strand the ball behind it; the fix passes the exact reproduction and a dedicated regression. Launch force remains the game's tested velocity assignment, not a simulated spring impulse.
- **H, cabinet/playfield:** The thick board has an actual drain opening, with cabinet rails, mounts, apron and trough construction. The printed surface preserves the opening. Glass exists but is hidden by default for gameplay visibility. A powered trough feed and full physical ball-serving mechanism are not modeled.

Rigid meshes are batched within their own assembly frames. Controller-owned meshes and moving groups retain their identities; hit events are consumed once and shared by mechanics and bumper effects.

### Verification and evidence scope

- Independent current-snapshot Node regression: **100/100 tests pass**, including ramp traversal, cradle/refire, shooter return, cancelled pull, trap checks, scoring and component lifecycle tests. ESLint reports no errors and three existing CSS baseline warnings. A further final combined acceptance run is in progress.
- The coordinating worker reports real Chrome ball-contact → accepted score → mechanical motion checks for `b0`, `s1` and `right-side:1`. These are contact-driven checks, not only direct animation calls.
- The coordinating worker reports actual keyboard/touch control tests with explicitly placed incoming-ball fixtures, plus ramp/refire checks. These fixtures establish repeatable control cases; they do not imply an entirely unassisted natural-play sequence.
- Installed desktop and top images in `artifacts/pinball/parts-mechanical-batched-*.png` were independently inspected. Final installed images and metrics are under `parts-mechanical-final-*`. Historical component images may show earlier geometry, including a solid ramp return; do not present those older captures as current route evidence without regenerating them.
- Recorded desktop render count: **632 draw calls, 348,211 triangles**. Mobile viewport: **573 draw calls, 342,547 triangles**. Recorded Chrome animation-frame intervals: median **16.7 ms**, p95 **≤16.8 ms**. These are headless Chrome rAF observations, not GPU timings or a physical-phone performance measurement.

### Remaining limits and acceptance

All unsourced dimensions, tolerances, travel and mechanical proportions remain table-local estimates. The models are not manufacturer CAD or certified engineering assemblies. Several contacts intentionally simplify the moving visual hardware; the tests establish game behavior, not a complete rigid-body simulation of every spring and fastener. The powered trough feed is absent, glass is hidden by default, and final browser/regression acceptance remains pending. Preserve these limits in any final handoff rather than treating the historical audit's replacement as proof of production readiness.

## Final automated acceptance (2026-11-13)

The integrated replacement passed full repository `npm test`, built-runtime Chrome smoke, keyboard/touch flipper capture and ramp-return/refire, plunger power/weak return/cancellation, nudge/TILT and multiplier browser checks. Physical incoming-ball fixtures verified accepted bumper/sling/target contact -> score -> nonzero mechanism movement. These are automated Chrome tests, not human playtesting or a physical-phone GPU measurement.

Final cabinet inspection exposed a batching visibility regression. Panels now retain independent visibility, with a new regression. Final draw counts are 635 desktop and 576 mobile, below the 650 target; triangles remain about 348k / 343k. Standalone ramp/wire images were refreshed for the genuine floorless return. Actual installed top/45/side images and separately labeled cabinet-hidden cutaway-side inspection images are available under artifacts/pinball/installed-review. Ordinary side images intentionally retain real occlusion by the cabinet.

The game preserves logical drain/serve; powered trough-to-shooter transfer is not simulated. Glass is modeled but hidden in the normal playing view. Dimensions remain estimated, and this is a mechanically structured game model rather than a manufacturing replica. These limits must accompany delivery.
