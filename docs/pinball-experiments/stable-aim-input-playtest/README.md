# Stable browser ramp aiming and right-side routes

2026-11-15, hadrianus, branch `pinball/0.1.0`, tested HEAD `20294ae42afb64085aca7a81d9ece4cb243e82db`. Production runtime remains `71245b26bbc4d72c364d395b21b58b933bba4675`. No production changes. Two targeted browser attempts and one approved observation-only original-controller prefix; no further variants.

## Result

**Ordinary Chrome mouse/keyboard inputs completed the ramp three times.** The first elevated exit physically returned the same ball onto the floor and left flipper. Separately, RIGHT OUT was confirmed in the unchanged original legal-controller creation order; prior legal-controller RIGHT IN descent was recovered from existing evidence.

Coverage:

- Actual browser ramp: three complete traversals, first exit/return traced and screenshots inspected.
- Browser LEFT IN/OUT and LEFT SAVE: already confirmed by prior stable-route packet; this packet does not repeat that claim as a new test.
- Browser RIGHT IN/OUT: still unverified. Both new attempts had no qualifying right lower floor-corridor samples.
- Legal-controller RIGHT IN: confirmed from prior full trace, no rerun.
- Legal-controller RIGHT OUT: new complete descent/drain, seven-world original prefix matched baseline.
- Physical phone, human aiming difficulty and contact-driven save mechanism: unverified. The save remains an area-triggered impulse.

No production fix was needed for the successful browser ramp. Automation success does not establish that aiming is easy for a person.

## Why the prior browser and legal-controller paths differed

The earlier browser .85/82 catch began near z3.881; the successful legal-controller first catch was near z3.809. Browser observations are normally two 120Hz physics ticks per rendered frame, not one. The prior browser release lasted .700s / 84 observed ticks, not nominal 82. Its first settled cradle was RIGHT; the legal run's first ramp came from an incoming LEFT shot. Those are different control situations.

Launch initial states also differ independently of timing: direct legal `launch(.85)` follows reset at p(2.53,.175,4.425), zero spin/velocity, no plunger pull. Browser charging physically retracts the stop and enables gravity. New attempt1's actual release was p(2.53,.173198,4.455342), pre-release vz+.552864, spin x4.120576, pull.85. Launch sets vz−20 but preserves that position/spin. Attempt2's .75 launch used p(2.53,.173276,4.450887), pre-release vz+.510692, spin x3.805024, pull.75; launched vz−18. Do not attribute different trajectories solely to renderer timing or an engine bug.

Telemetry wrappers only observe original launch and strike calls. They do not inject controls or change physics. Mouse drag launches and actual Z / key events are the only game controls. Per-frame samples, input edges, settled positions, spin, plunger state, actual coil contacts and shot parameters are archived.

## Two evidence-selected attempts

1. Power .85, catch threshold advanced from z3.75 to3.65, nominal release80 ticks. Finished three balls at53.242 simulation seconds /3525 points, no ramp. Four settled cradles were RIGHT; measured releases were82 ticks (.6833s), producing vx approximately−18.56/vz−26.05. LEFT contacts were near the tip (along.72–.96), sending the ball too laterally for the demonstrated ramp line. Merely compensating catch latency did not create a left cradle.
2. Prior .75/44 telemetry had two genuine LEFT settled cradles. Preserve that launch/catch/right-release strategy, change only LEFT nominal release to80 ticks. Measured LEFT releases were80–82 ticks (.667–.683s), RIGHT46 ticks (.383s). Three browser ramps completed at29.775s,37.492s and78.225s. The planned90s wall-time cap ended with ball1 still playing, score12600, moving normally; **this attempt did not reach gameover**. It was not extended.

The second result's legacy `delay:44` filename/field describes its base/right-side delay. Actual strategy is left80/right44, clearly recorded in `timing-and-launch-analysis.json` and the replay source. This is not an exact universal82-tick aiming law.

### First browser ramp and return

LEFT settled release began at24.492s near x−1.05445/y.17119/z4.05786. The actual assisted contact was x−.68003/y.17109/z4.48381, along.499975, vx+18.59174/vz−26.04436.

-25.425s: ramp entrance x1.883/y.471/z.012, first elevated gate.
-26.875s: rear x.449/y.699/z−4.684, second gate.
-29.775s: exit x−1.708/y.552/z3.073, RAMP+300, ball1.
-29.942s: floor x−1.615/y.172/z3.521.
-30.275s: left flipper area x−1.075/y.171/z3.938.
-30.442s: x−.856/y.171/z3.970, moving upstream again, same ball1.

The three `browser-ramp-*.png` images visibly show entrance, rear elevated route and exit. Screenshots can lag the sampled event; the exit screenshot already displays an INLANE award. `browser-first-ramp-return.json` provides precise positions through the entire shot/return.

## RIGHT IN: existing legal-controller evidence

Read from the previously archived fresh-world .85/82 full trace, not another run. The initial upstream rows are not the descent proof. Tick3700 (30.842s) p(1.703,.1702,3.0809) descends →tick3720 (1.673,3.6486) →3730 (1.464,3.7408) →3740 (1.265,3.8483) →3750 (1.058,3.9388) →3760 (.896,3.980), then longitudinal velocity reverses. `prior-legal-right-in-window.json` preserves the surrounding samples. This is the right IN corridor and curved return into the flipper, not a claim of browser reachability.

## RIGHT OUT: one unchanged original54 observation prefix

The observer imported `scripts/pinball-playability-audit.mjs` unchanged and preserved all world creation/input order. It stopped only after the first qualifying world's normal completion/disposal. Ordinals0–6 match archived baseline phase/ball/time/score/ramp/save counts and all physics metrics exactly. The original no-live-position-reset assertion remained active. No fixture, state setter, altered strategy or random sweep.

Found on ordinal6, power.55/release80, ball1:

-56.767s: x2.16620/y.17091/z3.30788, vz+2.39309.
-57.025s: x2.05080/y.17053/z4.06044.
-57.267s: x1.87478/y.16995/z5.02640, still ball1/playing.
-57.275s: normal ready/ball2, score unchanged2450, no save.

The original target game later completed149.900s/6425 points/4 ramps, matching baseline. The pass stopped there; it did not run all54 worlds.

Sphere classification used installed `lowerLanePaths(1)`, ball radius.135 and rail radius.020. All54 sampled centers from z3.308 through4.770 lie between the divider and outer rail. Minimum sphere gap to divider+.104695; outer-rail minimum−.000193 is a shallow sampled contact overlap, **not a claim of strictly positive clearance**. The route is not the shooter lane (x2.53). Full approach/drain and classifier output are included; this is sampled geometry, not swept-volume certification.

## Reproduction and provenance

Run from repository root:

- `node docs/pinball-experiments/stable-aim-input-playtest/attempt1-replay.cjs`
- `node docs/pinball-experiments/stable-aim-input-playtest/attempt2-replay.cjs`
- `node docs/pinball-experiments/stable-aim-input-playtest/right-out-observer.mjs`
- `node docs/pinball-experiments/stable-aim-input-playtest/classify-right-out.mjs docs/pinball-experiments/stable-aim-input-playtest/right-out-window.json`

Replay/observer outputs use fresh timestamped ignored `artifacts/pinball/` directories, with non-clobbering leaf creation. Classifier only prints. Requires repository dependencies; browser scripts require Google Chrome. Browser trajectories can vary with timing; compare measured outcomes, not script exit status alone. The observer verifies original prefix summaries and stops on mismatch.

Exact executed originals remain in ignored `artifacts/pinball/aim-input-20261115T090150/`, `aim-input-20261115T090408/`, and `right-out-observe-20261115T0907/`. Archived replay changes are output routing only; classifier output routing is read-only. Syntax checked, not rerun after packaging. `manifest.json` hashes packet files, executed scripts/raw evidence, prior RIGHT IN source and unchanged controller/runtime sources. Full browser traces are compressed; no production edits or new physical-phone/human test.
