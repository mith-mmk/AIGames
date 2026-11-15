# Stable pinball: real-input browser playtest

Tested 2026-11-15 on hadrianus, repository `/Users/tsaito/Projects/AIGames`, branch `pinball/0.1.0`, initial HEAD `c92c4ad66db3a74ff21e1969b338a918393cc8bb`. Adopted production runtime is `71245b2`; later HEAD changes during this test were documentation only.

## Result

No blocking gameplay failure found in these bounded sessions. Two three-ball games reached GAME OVER naturally, and clicking the visible restart button reset to ball 1 / score 0. No production edits, teleports, state setters, forced drains, or accelerated physics steps were used.

- Chrome desktop 1440×1000, Playwright ordinary keyboard input; real-time rendered physics.
- Weak launch: held SPACE 100ms, displayed 9%, naturally returned to shooter within 2s. Ball number stayed 1 and score 0.
- Medium launch: 600ms, displayed 50%, naturally returned within 4s. Ball number stayed 1 and score 0.
- Strong launch: 1300ms, displayed 100%, entered the playfield and scored.
- P pause while both Z and / held: ball position identical before and after 1s pause. Released both keys during pause, resumed with P: both controls released, ball continued. No stuck held-key state.
- No-flipper game: 3 full-strength launches; GAME OVER in 28.844s including launch holds; score 1725; CENTER SAVE used once.
- Repeated-flipper game: both keys down 140ms then up, followed by 360ms wait; 3 launches; GAME OVER in 40.190s including launch holds; score 2450; CENTER SAVE used once. Repeated key control remained responsive.
- Clicked GAME OVER's visible restart button: ready, ball 1, score 0, both flippers released. Then successfully launched again via touch.
- At 390×844, CDP touch emulation: held the launch button 1300ms, then 20 simultaneous two-finger flipper press/release cycles (180ms down, 250ms up). Both controls read pressed during contact and released afterward. Natural scoring and CENTER SAVE occurred. Document width 390px; all three controls within viewport, 47px high. Settled screenshot inspected.
- Full-strength launch briefly dwelled around x≈2.04/z≈−0.69 for about 2s, then continued naturally. No persistent trap or recovery intervention observed. This does not establish that every possible trap is absent.

## Specific coverage limits

CENTER SAVE was naturally observed in both completed games and touch play. Top rollover scoring, SLING and BANK events were also naturally observed. Specific IN/OUT channel traversal, LEFT SAVE, ramp traversal and their detailed geometry were not positively identified in this session. Do not treat their appearance in screenshots as functional verification. No artificial-fixture results are included. Nudge recovery was not needed or tested. Mobile means Chrome touch emulation, not a physical phone. These are automated input sessions, not human playability evaluation.

## Errors and approximate performance

Zero JavaScript page errors. Two console 404s occurred: a focused reproduction captured both as `/favicon.ico`; no gameplay asset failure found. `extra.json` preserves the exact URLs/errors.

A separate 180-frame 390px ready-state sample measured mean 16.63ms, p95 16.70ms, max 16.80ms (~60fps), 560 draw calls and 482,676 triangles. This is a narrow headless-Chrome local sample, not an isolated benchmark, physical-mobile result, or active-game performance guarantee. Other analysis work ran on the machine during parts of the overall test.

## Evidence and reproduction

Selected images: `desktop-ready.png`, `repeated-flippers-gameover.png`, `mobile-playing.png`, `mobile-ready-settled.png`. `summary.json` preserves the key measured outcomes. Full telemetry and additional images are local, ignored under `artifacts/pinball/realinput-c92c4ad/` (~6.4MB).

From repository root: `node docs/pinball-experiments/stable-real-input-playtest/play.cjs`. Requires installed Playwright and Google Chrome. The script starts a private localhost server, uses `?test=1` only to read telemetry, performs ordinary keyboard/CDP touch events, and writes a report and screenshots into a fresh ignored `artifacts/pinball/stable-input-replay-<timestamp>/` directory. Creation fails rather than reusing an existing output directory, so replay never overwrites this archived evidence. Each whole-game loop is capped at 100 real seconds. It does not modify production game files. Avoid running it in parallel with production edits; review emitted outcomes rather than assuming exit success proves all coverage.

`manifest.json` records SHA-256 hashes of all other packet files, plus the original executed script and raw-results references. The archived replay script changes only source-root/output-path setup from the executed original: web assets resolve from repository root, and output uses a fresh ignored no-clobber directory. The input sequence is unchanged. No replay was run for this packaging adaptation; `node --check` was used.
