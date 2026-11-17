# Approachable play, 2026-11-17

Source baseline: `41e28e9e1eedd7f61a214150d2a2bdbcc2cfab6f`, also Site version 22. User reports games end too quickly.

## Diagnosis and bounded change
90 legal-input baseline games: six launch powers × three input phases × five policies (none, both held, both pulsed, alternate, position-reactive). No ball injection, score changes or live rescue. Drain lanes are an **approximation** from the most recent outer-lane region in the previous two simulation seconds, not exact collider attribution. Separate out-of-bounds records use real boundary coordinates.

All 54 unassisted balls drained through center in under ten simulated seconds; median attempt 7.825 s. Pulse lost 17/54 and alternate 27/54 under ten seconds. Both held preserved a cradle in all 18 games through the 180 s cap: explain hold/release/refire rather than teach repeated panic tapping.

The browser now starts in やさしい (relaxed). Each numbered ball gets one normal-drain replay within its initial ten **active simulation** seconds, and center save is replenished to one on the next numbered ball. It does not replenish on replay or shooter return. Replay is manual, at most three saves per game; TILT and escapes are excluded. Ready and paused time do not consume the allowance. Saved drains reset multiplier but retain score/mission progress. No geometry, collision, force, restitution, launch, flipper strength or scoring constants changed. Existing standard rules remain selectable; selection resets the game, returns keyboard focus, and is not persisted. Core API default remains standard for existing callers.

## Comparison
90 relaxed games with identical input schedules; 72 post-change standard games (hold omitted in repeated compatibility run).

| policy | baseline median full game s | relaxed median full game s | baseline ramps | relaxed ramps |
|---|---:|---:|---:|---:|
| none |23.825|49.804|0|0|
| pulse |35.658|49.646|6|9|
| alternate |31.075|44.421|3|6|
| reactive |66.425|68.008|6|6|

Both-held stays held to 180 s in both modes, no drains or saves. All other games end naturally within the cap. These are automated policies, not measured human difficulty or wall-clock timing. Reactive/none/hold offsets are duplicate deterministic controls, not independent users. Standard results match baseline exactly for seconds, score, ramps, phase, launch count and return count in all 72 compared games.

There are **four out-of-bounds observations** (two unique deterministic paths, one repeated three times) in both standard and relaxed, at the same coordinates/times. These pre-existing escapes are not rescued or hidden and remain a separate physical-boundary defect. No new escape cases in this sample.

## Verification and limitations
- 242/242 pinball unit/physics tests; zero lint errors, three pre-existing CSS feature warnings. Includes finite save count, expiry boundary, pause/ready, shooter return, TILT/escape exclusion, multiplier and initial trajectory equality.
- Chrome actual launch/input/pause/restart, mobile dual touch, blur, WebGL context restoration, reload passed. Natural unassisted default-mode browser game: six launches, ~51.25 simulation seconds, gameover.
- New browser checks: default relaxed, difficulty reset and keyboard focus, natural drain to BALL SAVE HUD, 390px mobile layout and two-finger controls. Mobile and desktop screenshots inspected. No physical-phone or human playtest.
- Existing real keyboard/touch fixture-based cradle/release/scoring test passed; physical elevated ramp crest/exit/recapture/second shot passed with `PINBALL_RAMP_RELEASE_MS=650`. Original 675 ms browser wait failed twice. The script now exposes this parameter; this is a timing-sensitive aiming fixture, not proof of a broad human ramp timing window. Do not call the original fixed timing test passed. Both failures preceded any save; game geometry/shot constants unchanged.
- Repository-wide unrelated game suite not run. No universal human-playability or mechanical/reference completion claim.

Run `npm run test:pinball`, `node scripts/pinball-difficulty-audit.mjs`, `PINBALL_DIFFICULTY=relaxed node scripts/pinball-difficulty-audit.mjs output.json`, `node scripts/pinball-difficulty-browser.cjs`, `PINBALL_RAMP_RELEASE_MS=650 node scripts/pinball-control-browser.cjs`.
