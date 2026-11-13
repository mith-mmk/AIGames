# ROBOBUDDY reference acceptance — 2026-11-13

**Status: working checkpoint, not complete.** The newly supplied portrait ROBOBUDDY reference was downloaded through Library and visually compared with the installed game. The earlier Pinball Star arrangement is not treated as an equivalent reference. Reference likeness is an acceptance gate, not an optional polish step.

## Implemented in this checkpoint

- Replaced the old small round mascot print with a large silver screen-faced robot, cyan eyes/heart, peace-sign hand and blue city background. The artwork is board-registered ink, not extra collision geometry. It retains the actual drain opening.
- Added a supported backglass with speakers, title, city print and live score/ball display. Display updates are cached and follow the same state as the HUD.
- Added formed metal collection-apron wings, service panels, fasteners and an open V throat. The active drain and both outlane outlets remain open. Silver/black cabinet rails, hazard edges and the rear power-tower assembly replace the previous maroon presentation.
- Added separate gear-shaped bumper-cap medallions and an annular light diffuser, retaining housings, skirts, rings and underboard mechanisms. Silver/yellow flippers and framed sling covers retain their prior separate rubber, shafts, pivots and actuation.
- Restored distinct IN and OUT passages, using one `lowerLanePaths` definition for rendered rail centerlines and physics. The OUT mouth has .31 clear width for a .27-diameter ball. IN routes return to the flippers; OUT routes drain naturally unless the existing earned kickback fires. There is no live ball-position reset to rescue those fixtures.
- Added legible colored IN/OUT lane inserts. Existing mission rules, launch power control, same-ball shooter return, sound and event animation logic are retained.

## Evidence and its limits

- Full repository `npm test` passed, including 122 pinball tests at the integration checkpoint; final focused rerun passed 123/123 after the variable-length cabinet regression was added. CSS retains three existing baseline-compatibility warnings. The final verification log identifies the exact last run.
- Real Chrome standard test passed launch/input/pause/restart, mobile viewport, context restoration and reload. The unassisted three-ball fixture ended normally; it is not a human difficulty evaluation.
- Real keyboard and CDP touch tests verify hold/release/aimed reflip, scored upfield shots, complete ramp return, recapture and a second shot. The former450ms fixture became a lower cross-table shot with the new geometry; aimed shots now use the tested700ms release. Tests wait on simulated game time, not rendering-dependent wall time. Upfield traversal and later ramp-exit scoring are latched on the same ball instead of incorrectly requiring them simultaneously. The original failure trace is retained separately.
- Actual Rapier incoming-ball fixtures produced accepted bumper/sling/target events, scores 100/25/75, and nonzero moving-ring/kicker/hinge motion. These fixtures place the initial incoming ball; they do not inject a hit or a score.
- Component review produces top, 45-degree, side, underside, mounted-fixture and moving images for eight parts. Static parts mark motion as non-applicable. A standalone mounting fixture does not prove installed-game clearance.
- Installed-review images cover top/45/side and a separately labeled cabinet-hidden cutaway. Ordinary side views keep genuine occlusion. The camera test covers desktop1440×1000 and mobile390×844; no physical smartphone performance or touch-hardware test is claimed.
- Score presentation check feeds an accepted game-state event and checks state/HUD/backglass equality. It is separate from the physical scoring test.
- Mechanism references and estimated dimensions are documented in `pinball-mechanical-rebuild.md`. This is not manufacturer CAD, and no new dimension in this checkpoint is presented as measured hardware.

Reproduce with `npm test`, `node scripts/pinball-browser.cjs`, `node scripts/pinball-installed-mechanics.cjs`, `node scripts/pinball-component-review.cjs flipper bumper sling target plunger ramp wireform cabinet`, and `node scripts/pinball-reference-review.cjs`. Local evidence lives under `artifacts/pinball/`; no supplied reference image is embedded into the distributed game.

## Still failing the completion gate

1. **Right S-ramp and left wire return:** The current safe broad upper loop is not the reference S silhouette. Seventy-two curve/bank/grade/width candidates were rejected after physical traversal failures. No appearance-only S curve, hidden floor or forced routing was retained. The existing shared physical/display centerline still passes six speed/offset traversal fixtures and five cradle/refire timing fixtures. A redesigned continuous route with tested transitions is the next substantial task.
2. **Sling proportions and lower composition:** The current safe .40-wide sling is still too narrow/tall. Broader candidates obstructed the center-shot corridor or reduced the incoming gap below the .32 requirement. This needs coordinated relocation of rails, sling and flipper approach, not a larger cover over a narrow passage.
3. **Left bank:** Three mini bumpers from the older Pinball Star variant remain where this reference shows a two-target bank; upper-left target count/placement also differ. They are not relabeled as visually faithful targets.
4. **Reference fidelity and background:** The central robot, cabinet and backglass are closer but not an exact match. The surrounding workroom remains; it is not the reference's futuristic city setting. Reference-themed MULTI BALL/EXTRA BALL/JACKPOT print does not imply those unimplemented rules exist.
5. **Mechanical/device limits:** Standups are not drop targets. Powered trough-to-shooter transfer is not modeled; glass is present but hidden in gameplay. The mobile mascot can be partly occluded by the new backbox. Mobile text is small, and real-phone GPU performance and human playability remain unverified.

No completion statement should be made until these failures are resolved and the current version has been visually compared again. The test suite passing establishes the tested game contracts, not reference likeness.
