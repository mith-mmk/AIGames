# Candidate B: swept-normal bumper browser QA

**Unadopted candidate**, production unchanged (baseline 04a4939). Only physics.mjs was intercepted in a dedicated Chrome session. Archived loader invoked with SWEEP_MODE=restitution; served-source.json records baseline/candidate hashes, candidate-physics.mjs is the actual served output. No position/velocity fixtures, no direct control/state injection. Wrappers only observe original methods. Other regression/Node tests are not part of this packet.

## Results
- Ordinary .75 adaptive game: 44.531 s wall, 3-ball gameover, score3250; 4 awarded natural bumper contacts.
- Ordinary 1.0 adaptive game: 59.449 s wall, 3-ball gameover, score6500; 9 awarded natural bumper contacts.
- Both games and mobile page: zero page exceptions. No persistent stopped ball prevented either game finishing. Held-flipper capture is still intentional and not a failed collision.
- First .75 bumper b2 t11.48333, ball1: swept normal (-.522221,.852810); pre-impulse outward -15.276654 → +8.554924, expected .56 reflection +8.554926. Velocity (-4.592262,-20.725397) → (-17.037613,-.401585), in x/z. +100 and visualHit +1; screenshot visibly shows ring and +100.
- These are actual normal-input contacts, not fixture starts. Before/after velocity is synchronous around game hit handling, AFTER the solver step; preWorld separately records pre-solver state. Summary normals reconstructed from recorded endpoints/collider dimensions (center coordinates rounded to authored precision), not injected into gameplay.
- Screenshot timing and browser event scheduling affect paths. No matched-trajectory A/B or claim that scores prove improvement. Human subjective feel, physical phone, sound listening and universal no-tunneling guarantees remain unverified.

## 390 × 844 touch emulation
Touch hold/release launches; pause clears held flags and freezes physics time across250ms; resume returns playing; restart restores ready/ball1/score0/no held inputs/pull0. All five checks pass (mobile.json). Selected screenshots visually inspected; controls visible. This is desktop Chrome touch emulation, not a physical phone.

## Replay and provenance
From repo root: `node docs/pinball-experiments/swept-bumper-browser/replay.cjs`. Saved loader local to packet; source path adaptation only. Replay creates a fresh unique ignored `artifacts/pinball/swept-bumper-browser-replay-*` folder, no-clobber leaf mkdir. It does not overwrite this packet. Browser and server close normally. Changing source anchors/runtime may require a new reviewed replay; this is not a universal regression suite.

Raw evidence: artifacts/pinball/swept-bumper-browser-replay-2026-11-16T01-26-19-734Z. Original input script/run log: artifacts/pinball/swept-bumper-browser-04a4939. Full frame samples and contact logs included, with input actions in results.json. No commit performed.
