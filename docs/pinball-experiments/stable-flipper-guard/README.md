# Flipper guard: ordinary browser observation (04a4939)

No runtime changes. Two normal Chrome keyboard/mouse games; no state/velocity/position fixtures. Existing adaptive catch/release policy, left release nominal 80 ticks, right 44. Power .75 and 1.0. Real launcher charging state differs from immediate Node launches. Read-only wrappers call original methods unchanged; screenshots can delay input polling. This is automated desktop play, not human/physical-phone evidence.

## Findings
- 59 strike calls: 20 fired, 22 cooldown, 17 not-rising, **0 velocity-guard**. The observed play does not establish a weak rising hit caused by `v.z <= -8`; it does not establish that this can never occur.
- All 20 actual shots had angular speed 12 rad/s; planar output speed 25.9373–32. No gain or guard change justified by these observations.
- .75: 47.643 s wall, gameover after 3 balls, score 2300. 1.0: 26.959 s wall, gameover after 3 balls, score 2425. Both page-error arrays empty. 60 s was only a per-game upper bound.
- .75 at t18.53333: along=1, incoming (vx=-.9604,vz=6.5510), outgoing (vx=-30.8339,vz=-8.5600), speed32, coil fired. This is a mostly lateral shot from contact-local direction, not weak total speed or a skipped coil. Whether it feels weak to a human remains unknown.
- .75 at t9.68333: right heel-ish along=.247386, incoming (-1.39465,-.82789), outgoing (-5.55437,-25.33556), speed25.9373, coil fired. At t21.85 left along=.518971, incoming (4.32503,-4.04054), outgoing (19.37498,-25.46782), speed32.
- Duplicate post-fire calls can already have vz<-8 but are rejected by the earlier cooldown branch. Example .75 t7.08333 first fired then cooldown at the same physics time. Do not count these as velocity-guard failures.
- Not-rising contacts are kept separate. Example .75 t8.275: angular speed0, held both keys, no extra coil. The existing held-flipper capture contract remains unchanged.

## Evidence / replay
`summary.json` has selected before/after states, coil counts, angles, angular speed, derived along, recent keyboard events and shot directions. Complete strike observations and frame trajectories are gzip JSON. `secondsSinceLatestRecordedKeydown` is derived from the last four recorded key events only and null if absent; not wall-clock latency. No new physics assumptions were injected.

Screenshots show states shortly after first flipper contact, not the exact physics tick; velocities come from synchronous wrappers. Selected screenshots were visually inspected. Browser and HTTP server closed normally.

From repo root: `node docs/pinball-experiments/stable-flipper-guard/replay.cjs`. Each replay writes a fresh timestamped ignored `artifacts/pinball/flipper-guard-replay-*` directory using no-clobber mkdir; it never overwrites this packet. Raw original: `artifacts/pinball/flipper-guard-replay-2026-11-16T01-21-52-343Z/`; generator/run log: `artifacts/pinball/flipper-guard-04a4939/`.
