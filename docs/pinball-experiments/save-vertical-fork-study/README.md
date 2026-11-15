# Vertical split-face fork: conditional static packaging study

One isolated prototype on frozen runtime **71245b26bbc4d72c364d395b21b58b933bba4675**. No production edits, new lane shape, powered motion, joint simulation, score/input/force changes or adoption. Both stable OUT routes are retained. This does not import rejected early-confluence geometry.

## Decision

**Parked packaging is spatially plausible over the checked evidence, but this is not yet an operational or visually accepted mechanism.** The original housing and rod must be replaced: deployed fork geometry intersects those two visible decorative objects. Nothing was hidden or silently removed for the checks or screenshots. No other installed physical collider/rendered-surface intersection was found in tested poses or exact translation envelopes.

Deployment is unsafe while either route is occupied. Its swept volume overlaps16/20 sampled legal outer histories and all3 naturally earned inner-save windows. These are static interference checks, not simultaneous-motion tests. Do not infer safe deployment from a late sensor or treat motion as instantaneous. All actuator, charge/tilt lifecycle, holding, retraction, hard-stop, strength and gameplay acceptance work remains.

## One concrete geometry

All33 parts are closed, unrounded cuboids generated from one definition for Three meshes and Rapier contacts:396 triangles. Eight fixed frame parts bear on the existing metal cabinet boundary cap,18 stroke-carriage/guide pieces and7 lifting-fork pieces. Dimensions are table-local world units, not manufacturer measurements.

- Outer faceX[−2.69,−2.35], inner faceX[−2.25,−1.98]; both thicknessZ[3.54,3.58]. The .10 gap leaves the existing curved rail between routes intact.
- Working faceY[.09,.26]; parked lift.27 givesY[.36,.53], above the nominal floor-ball top.31. No floor opening or shutter assumed.
- Shared crossbarY[.35,.38] working/[.62,.65] parked, joined to pads by actual hangers.
- Two square rods, side.016, run through square guide openings.028 wide: nominal side clearance.006. Rod tops reachY1.01 parked.
- Two stroke rails have .030-square stock inside hollow four-piece carriages with .038-square opening: nominal side clearance.004. The real void is preserved; no solid block masquerades as a bearing bore.
- Proposed upstream stroke.12. Fixed gantry spansX[−2.85,−1.94], with wall uprights atZ3.32/3.72 and top membersY[.73,.76]. Feet startY.385 on the existing metal cap. Connected geometry is a proposed welded load path, not a weld/cap strength certification.

Guide play, gravity sag, deflection, friction, limits and load reactions are not simulated. Actuator bodies, springs and positive mechanical stops are not included, so a later operational prototype must package them before any powered trial. No claim that joint stiffness imposes a force/work cap.

## Measured checks

Existing solids: exact Rapier shape queries. Visible hardware: exact transformed triangle surfaces, not signed-volume containment tests. Translation envelopes are exact AABB unions because these parts translate on one axis without rotation. Self-sweep checks cover lifting fork versus stationary guides/frame and complete strike assembly versus fixed frame. Same-group welded/touching subassemblies are excluded from self-collision failures.

- Installed geometry:6 reported intersections, all inner-pad versus old save housing/rod in deployed/deployment/strike envelopes. Housing distance≈−.010; rod≈−.080. These are explicit replacement obligations, not omitted failures.
- Other installed physical/render surfaces:0 detected intersections. Pose and internal-guide sweep interference:0 detected.
- Working longitudinal pad sweep versus unchanged physical rails: minimum separation **.014913883 outer**, **.017290920 inner**. No rail cut or hidden opening.
- Parked sphere checks:0 intersections across20 legal uncharged outer fixtures,3 actual-earned inner-save windows and5 complete stable ramp/wire/capture histories80–84. Minimum sampled sphere-to-prototype gaps **.054177603**, **.065255440**, **.237230424**, respectively.
- Exact linear sphere casts between recorded endpoints also found0 parked intersections in all28 histories. Fixture teleports were not joined: full-history casts use only each original step's before/after pair. Outer fixtures are coarse.1s samples; their cast lines are interpolation, not proof of the unseen nonlinear trajectory. No continuous-dynamics or exhaustive high-ball claim.
- Deployment sweep overlaps16 outer cases and all3 natural cases; none of the5 sampled ramp/wire histories. The4 unhit coarse outer cases are not a safety guarantee. Powered strike contact is intentionally a different question from empty-space deployment.

The natural windows include the original save impulse, so they establish existing route evidence, not success of this mechanism. Natural charge timing, deployment lead time and high-ball exclusion still need a stateful physical test. Atvz≈4.48–5.11, a ball center crossingZ3.32 has its front near3.455, leaving only roughly.02s to a face at3.54. Prearmed deployment may be necessary, but is neither implemented nor proven safe. Charge must be earned, at most one stored, consumed once on actual authorized firing; tilt and ball/restart/pause transitions must not create free strikes.

## Visual and performance evidence

`images/app45-parked.png` is the **actual frozen app** via window.__pinball.board, normal45 camera/lighting, ROBOBUDDY/backbox and normal setup. Camera counts484,148→484,544 triangles and600→633 calls. This is only a static overlay accounting result, not device performance or a full budget/regression pass.

Other selected close-ups are explicitly the standalone WorkshopAssets assembly, not the app composition. All legacy geometry remains visible. The tall gantry and rods are a major departure from the reference's low left hardware. **Reference fit is unmet.** Do not remove supports merely to improve its appearance. No actual phone/human test.

## Reproduce and inspect

From repo root:

```
python3 docs/pinball-experiments/save-vertical-fork-study/restore.py artifacts/pinball/vertical-fork-restored
node --import ./artifacts/pinball/vertical-fork-restored/loader.mjs artifacts/pinball/vertical-fork-restored/study.mjs
```

Restore refuses existing destinations and verifies the packet. It restores the exact runtime map and shared geometry. The portable study only changes input routing: it reuses existing compressed outer/natural/82 inputs in neighboring experiment packets, plus exact position-only extracts for80/81/83/84. No duplicated full traces. Original input hashes and external packet paths are recorded. Those sibling packets are required.

`visual.cjs` can reproduce screenshots with installed Playwright/Chrome and git71245b2; output follows the restored directory. It does not alter runtime files. `evidence/result.json` is the complete report; primitive inventory, bounds, source hashes and selected witnesses are embedded. Verification includes independent restored replay equality and source-map identity. Temporary replay copies were moved to Trash.

## Next bounded scope

No more shapes were tried. If this architecture is pursued, first reconcile its large visible departure and explicitly replace old save decoration. Then specify physical stops/actuator/support capacity within measured packaging, prearming/deployment occupancy interlocks and bounded slider force/work accounting. Only afterward test passive route preservation, real contact transfer, lifecycle and the unchanged original aim tests plus adjacent timing range. Whole regressions, natural play, rendering/reference and device checks must pass before adoption. Static packaging is not permission to narrow the aim range or add hidden impulses.
