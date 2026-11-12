# Pinball original specification audit (2026-11-12)

Source: user-provided “3Dピンボール 技術設計・ゲーム企画”, 429 lines, read in full from original attachment. This is a status audit, not a replacement specification. The original target remains authoritative except where the user's later direction changes priority.

## Version truth

- Deployed Site source: `0f3bfec495f527fb07f0d7f9cf76eda6c7ceb0b0`; AIGames corresponding correction: `3da6867`.
- Local pending patch: more tilted front view, beginner return guides/softer dynamics, 16 tests, browser tests. Not deployed as of this audit.
- No semantic game release was established. Calling this “0.2 complete” or “1.0” would be incorrect. It is a partial 0.1 prototype plus selected 0.2 features, with touch/UI work pulled forward.

## Requirement / evidence / status

| Original requirement | Current evidence | Status / difference |
| --- | --- | --- |
| Three.js + WebGL2 + Rapier | app.mjs, vendored Three/Rapier, physics.mjs | Implemented |
| TypeScript + Vite, Vitest | Plain .mjs, existing static build, node:test + Playwright | Architecture deviation, not completed |
| Physics determines ball; renderer follows | app.frame reads game.ballPosition | Implemented |
| Independent event bus / rule engine | physics.hit directly calls state.award with point constants | Partial separation only; no typed event bus |
| Common PinballComponent and scene JSON | construction embedded in assets/physics classes | Not implemented |
| 0.55m x1.15m,27mm ball,80g,6.5deg,120Hz | dimensions x10, mass .08, tilt6.5, fixed120Hz | Scaled coordinate system; local pending patch applies .65 downhill rolling/gameplay factor |
| Kinematic flipper first, motor comparison later | Rapier kinematic rotations, speed limit | Basic implemented; cradle/deadflip/pass/aim validation absent |
| CCD and high-speed scenarios | CCD enabled, numerical contact tests | Basic implemented; no exhaustive real-device performance guarantee |
| Charging plunger / Space release; mobile slide | Fixed launch on Space/button click; API power parameter only | Missing charging and slide interaction |
| Nudge A/D/W and TILT | No handlers/rules | Not implemented |
| Bumpers, slings, drop targets | Bumper/sling responses, static continuous target banks | Basic collisions/scoring; no drop/reset target behavior |
| Ramps, wire lanes, holes | Both ramps removed after wedge defects; no hole | Not implemented in current playable version |
| 3 balls, score, pause, restart | game-state.mjs and HTML controls | Implemented |
| Multipliers, combos, bonus, mission/challenge | Fixed hit points only | Not implemented |
| Extra ball, multiball, save high score | Single rigid body and in-memory score only | Not implemented |
| Keyboard/touch/gamepad | Keyboard and two touch buttons | Keyboard/touch partial; no gamepad, no mobile slider |
| Overhead, angled, follow cameras/zoom | Overhead + fixed front angle | Two views only; no follow/zoom |
| PBR/env/shadows/bloom/lighting animation | PBR, baked env, shadow | No selective bloom, hit lighting or animated score |
| WebAudio/glTF models | No audio; procedural mesh assets | Missing audio/glTF pipeline |
| Mobile adaptive quality,60fps | DPR cap and fixed shadow map | No adaptive tiers; no physical phone FPS validation |
| 0.5 editor/multiple JSON tables/settings | Single hardcoded table | Not implemented |

## Latest user changes and precedence

1. Component art is postponed; playable game takes priority, and Site delivery was requested.
2. Left-edge trapping and side-drain difficulty must be fixed before calling the game playable. Ramps are deferred, not treated as completed.
3. User wants a real-machine tilted view. The local patch addresses framing while preserving a top view.
4. User newly requests upper top lanes/rollovers, a functioning spinner, clear backglass score and a kickback mechanism. These are pending. Current spinner is only a pass-through score sensor plus static art, not a mechanically or visually rotating spinner. Current top-right HTML score is not a backglass.
5. User asks where the original plan went. New feature work is paused for this reconciliation. Do not silently replace the original milestone plan with the simplified prototype.

## Recommended resumption order

- Preserve pending base-play patch, then agree on its status as a partial prototype.
- Establish shared table/component geometry and separate physics events from scoring rules to prevent repeated render/collider divergence.
- Finish 0.1 controls: charge/release plunger, nudge/TILT and aiming/saving checks.
- Implement the user's latest classic-table priorities (top lanes/rollovers, spinner, readable backglass, explicit kickback charge/use), with actual collision/scoring and regression tests.
- Reintroduce ramps only with traversability and underside-clearance tests. Then proceed through remaining 0.2/0.3/0.4 items instead of marking them done by appearance.

## Follow-up implementation checkpoint

On pinball/0.1.0 the following latest requests are now implemented and tested: three upper physical lane dividers plus one-shot rollover detection/ABC completion; visible sensor-driven spinner rotation/decay; camera-independent readable backglass with score/ball/ABC/center-save state; one initial center-save charge recharged by ABC, consumed by a real impulse without teleportation. This is a center saver, not a conventional side outlane kickback, and the spinner is not a freely simulated rigid-body wheel. Scoring/progression now pass through state.onEvent with event-ID deduplication, an incremental separation step rather than the full typed EventBus/PinballComponent architecture.

The earlier audit rows describe the pre-checkpoint version. TypeScript/Vite, charged plunger, nudge/TILT, proper ramp return, advanced modes and persistence remain incomplete. No milestone is declared complete by these additions.

## Lower-playfield and camera correction

Giant filled return wedges were a failed design: they buried slings, pinched held flippers and diverted live-browser balls outside reachable flippers. They are removed, not merely restyled. Renderer and collision code now consume shared LOWER_LAYOUT rail, sling, pivot and blade geometry. The center saver triggers below the blades and arcs beyond them; return-angle speed is limited independently. A novice powered-coil correction requires a real pressed-blade contact and a cooldown; it never relocates the ball or acts off-collider.

The reference's lower architecture (compact slings, narrow inlane rails, separated flippers and open floor) is restored in simplified procedural form. Elaborate upper ramps, machine details and room art remain deferred; the implementation is not a visual replica of the generated concept.

Camera is perspective, initially56 degrees from horizontal, with10–90 degree continuous slider and optional saved angle. Near-side viewing is for inspection, not guaranteed competitive readability. The cabinet is fitted from its actual corners for each aspect ratio.

## Reference placement and cradle checkpoint

The generated reference is not replaced by the simplified prototype. Its rear pair/front-center bumper triangle and asymmetric left upper, left side and right angled target banks now use shared collision/render endpoints. The lower inlane bends toward the pivot rather than cutting across beneath the sling. Its minimum curved-sling clearance is 0.353 table units, versus the 0.27 ball diameter. Target-bank clearance against the shooter divider was tested and widened to avoid a sub-diameter pocket.

Stationary raised flippers no longer fire on every contact. Powered assistance requires actual contact while the blade is rising. Controlled incoming fixtures naturally cradle on both sides, then release and reflip with different trajectories at 0.5/0.6-second release intervals. Browser keyboard and touch-event recordings reproduce capture/hold/reflip; these are automated fixtures, not human-playtest or physical-phone validation. Full motor/coil fidelity, dead flips and advanced passing remain unverified. Bumper response preserves tangent velocity instead of replacing all velocity, avoiding a repeated upper-loop defect after the layout change.

The reference's S-shaped upper ramp and separate left wire lane remain incomplete until physical traversal, underside clearance and return-feed tests pass; an experimental isolated module is not production completion.

## Physical ramp reintegration (latest checkpoint)

A shared continuous triangle-mesh deck and rails now form a right entrance, rear curve and left return. The entrance moved upstream of the sling to provide an actual shot line. Low underside space is closed by visible solid base geometry; a local beveled outer base seals the sub-ball-width gap beside the shooter divider. Ground balls are not teleported and ramp collision is not switched off according to ball height. The right target bank moved inward for real ball clearance.

The powered rising-blade approximation now derives strength from contact position and angular speed, capped consistently with the world speed limit32. It remains a game approximation for a rectangular paddle, not a validated motor simulation. Five cradle-release timings reach and traverse the ramp via an actual flipper shot. Browser keyboard input reproduces a held ball, shot, complete ramp traversal and return to the left cradle. Incoming fixture placement is explicit; it is not a claim of a human playtest.

Reference differences remain: the left return is a transparent trough rather than the separate wire-lane construction; the upper curve is simplified; robot body art, target mechanisms, original materials/details and physical spinner remain incomplete. Shared placement/route improvement does not mean visual reference fidelity is complete.
