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
