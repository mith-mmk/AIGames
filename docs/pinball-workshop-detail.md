# Chappy workshop scenery refinement

## Scope and design basis

User requested the background receive the same structural refinement as the pinball hardware. This is scenery work, not a gameplay or collision change. The inspected mechanical concept supplies framed windows, warm task lamps, tools, machined equipment and a populated inventor workshop. The inspected Chappy concept supplies the pale repaired screen-face robot, cyan expression and heart, yellow ear accents and DIY character. It is not a license to replace that identity with generic green machinery.

## Quality gates

- Replace block-like workbench props with recognizable constructed assemblies, not color-only upgrades.
- Keep scenery outside the playable board's sightlines; check default, top,45degree and low10degree views and mobile390x844.
- Show attachments, joints and material contrasts; unknown dimensions remain artistic estimates.
- Separate static scenery from physics. No new scoring, collisions or moving game mechanisms implied by decoration.
- Capture installed closeups and compare with the prior version. Keep geometry finite and avoid hidden per-frame generation.
- Target whole scene under750 draw calls and500k triangles. Record rAF observations honestly as headless Chrome timing, not a real-phone GPU benchmark.
- Existing launch, flipper, scoring and game progression must remain functional before publishing.

## Baseline

Mechanical-parts version745a4e7, private Site version16. Existing background has shallow rectangular benches, simple cylinder lamps, flat wall/window panels and a basic robot. Prior whole-game performance635 desktop draw calls and576 mobile draw calls, about348k/343k triangles.

Implementation and final validation are pending; this document does not claim completion.

## Implemented and validated (2026-11-13)

Replaced the shallow bench/background props with framed planked cabinets and drawers, screw vises, hinged spring task lamps, shaped hand tools, a finned repair motor, labeled jar shelving, stone arch/mullion windows, mortared brick relief and bolted/braced beams. The screen-face Chappy keeps its pale shell/cyan smile/heart but now has a recessed curved lens/rim, shell seams, vents, fasteners, joint collars, fingers, wrench, cables and hinged boots. Rear machine detailing is installed visibly on the room wall with stand-off brackets; the old hidden board decoration stays hidden to preserve playing clearance. Scene mechanisms are static decoration, not a simulated motor or pressure system.

Independent review found the tool rack had no support; it now has floor-contact feet, continuous uprights and front/rear/anti-racking braces, with a geometry regression. Existing physics, gameplay modules and table layout were not changed.

Validation: 104/104 pinball tests passed; scenery support/ownership/finite-geometry tests passed after the rack fix; no lint errors (three existing CSS baseline warnings). Actual Chrome game smoke and built runtime cover launch/input/pause/restart/mobile/context recovery. Inspected desktop1440x1000/mobile390x844, top/45degree/10degree and installed workshop closeups. Final normal-frame budgets: desktop544calls381751triangles, mobile522calls382499triangles, down from635/576 drawcalls. 90-frame headless rAF median/p95 about16.7ms, not physical-phone GPU proof.

Limits: workshop remains stylized rather than photoreal; dimensions are artistic estimates. Mobile preserves full-size playfield and therefore crops side benches/mascot, while central Chappy art and name remain. No real phone/human playtest claimed. Evidence is under artifacts/pinball/parts-workshop-final-*, workshop-workshop-final-*, and workshop-closeup-final-*.
