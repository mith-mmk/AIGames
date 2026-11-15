# Stable IN / OUT / LEFT SAVE / ramp reachability

2026-11-15, hadrianus, branch pinball/0.1.0. Tested HEAD `f0c5f62d822ff7f210a4e103e5b25733b574454e`; runtime remains `71245b26bbc4d72c364d395b21b58b933bba4675`. No production edits.

## Result and important limits

Ordinary Chrome keyboard/mouse inputs reached a descending LEFT IN return, uncharged LEFT OUT drain, and naturally earned LEFT SAVE that physically returned the same ball upfield. No persistent trap or gameplay blocker found. Three bounded browser attempts all finished three balls naturally. None reached the ramp, so browser ramp accessibility remains unverified and aiming difficulty is a practical limit of this controller test, not proof of a broken ramp.

One separate, fresh-world legal physics-controller run completed the ramp twice and returned the first ball through the left wire exit into the flipper area. This is not a browser-input pass, a physical phone test, human-play evaluation, or exact reproduction of original natural54 creation history.

## Actual browser input

Chrome headless, 1280×1000, top view. Launch via pointer drag of75/92.5/85px (75%/92.5%/85% nominal); catch/reflip via ordinary Z and / key events. Read-only per-frame positions guided the controller. No teleports, forced drains, game-state setters, simulation-speed override or nudge. The controller approximates the existing catch/release strategy in wall-clock browser operation; it is not frame-exact natural54. Screenshots introduce ordinary event-loop timing differences.

- .75/44-style release: GAME OVER at simulation64.958s, score5325, CENTER SAVE1, LEFT SAVE1, ramp0.
- .925/60-style release: GAME OVER46.608s, score3850, ramp0.
- .85/82-style release: GAME OVER33.808s, score2300, CENTER SAVE1, ramp0.
- No JavaScript page errors. This run did not independently inventory console/resource errors; the prior stable-input packet identified favicon404s.

### LEFT IN: physical descending return, not just an event

An initial upstream INLANE crossing at21.808s is not the descending-flow proof. The following actual descending sequence is:

-21.908s: x−1.745, y.169, z3.151.
-21.958s: x−1.710, y.169, z3.405.
-22.058s: x−1.476, y.170, z3.720.
-22.158s: x−1.126, y.170, z3.913.
-22.208s: x−.959, y.170, z4.013; then flipper-area contact reverses motion upstream.

The approach passes between the left IN inner rail (x−1.35) and divider (near x−1.90), then follows the curved return into the left flipper. The initial screenshot is explicitly an upstream approach image; the complete subsequent descending position record is in `route-windows.json`, not inferred from the screenshot/event alone.

### LEFT OUT: uncharged drain

Ball1, side charge0:31.608s x−2.182/z3.218 →31.708s x−2.121/z3.634 →31.808s x−2.046/z4.090 →31.908s x−1.955/z4.586 →32.008s ready on ball2. This path is between the divider and outer rail, then continues to the drain outside the flipper. Screenshot `p0.75-d44-out-approach-left.png` visibly shows the ball in that OUT corridor. No intervention caused the drain.

### LEFT SAVE: earned, consumed once, same ball physically returned

Earned at58.725s on ball3 through MISSION CLEAR / サイドを点検 / LEFT SAVE READY, charge1. At61.742s ball3 descends at x−2.051/z3.487, vz+4.186. At61.775s x−2.089/y.170/z3.493, vz−11.871, charge0, use1. Same ball3 remains playing:

-62.275s: x−2.141/z−.548.
-62.775s: x−2.257/z−2.045.
-63.275s: x−2.364/z−2.212.

It subsequently descends again and game ends64.958s. Thus the save does not consume a ball and does return it upfield. Current save is an area-triggered impulse, not a proven physical contact actuator; structural mechanism goals remain unfinished. Screenshot capture can lag the sampled event: the save image already shows the returning ball while HUD displays another recent award. Position/charge history is the precise evidence.

Right IN/OUT passages were not positively verified in these bounded browser sessions. No expansion solely to cover both sides was performed.

## Separate legal physics-controller ramp evidence

One fresh process/world, power.85 / release82, original controller logic at1/120s. No fixture-start injection or charge override. `liveResets=0`, no stall, three-ball gameover82.783s, score5175, two completed ramps. Original natural54 .85/82 world had different creation history and 11 ramps; these results are deliberately not asserted equal.

First full traversal on ball1:

-9.833s: entrance x2.122/y.508/z−.077, gate1.
-13.175s: rear elevated path x.447/y.699/z−4.649, gate2.
-16.150s: left exit x−1.712/y.566/z3.050, completed ramp, +300.
-16.358s: floor return x−1.582/y.172/z3.706.
-16.558s: left flipper approach x−1.169/y.171/z3.894.
-17.358s: settled near x−.553/y.171/z3.832, same ball1.

The full 0–17.5s trajectory, inputs and states are archived compressed, proving natural launch through elevated route and return rather than only an event count. A second completion occurs24.167s; complete raw run is also archived as `controller-full-samples.json.gz`. No rendered ramp screenshot is claimed for this Node run.

## Reproduce and evidence

From repository root:

- `node docs/pinball-experiments/stable-route-playtest/browser-replay.cjs`
- `node docs/pinball-experiments/stable-route-playtest/controller-replay.mjs`

Both write into fresh timestamped ignored `artifacts/pinball/` directories; an existing leaf directory raises an error instead of clobbering evidence. Browser replay has three 90s maximum attempts. Browser trajectories will vary with timing. The archived scripts alter output setup only, plus the controller's descriptive method label; their gameplay input logic is unchanged from the executed versions. Syntax-checked, not rerun after packaging.

Original exact scripts, full traces and logs: ignored `artifacts/pinball/routes-realinput-f0c5f62/` (~6.4MB). `manifest.json` hashes original scripts/raw results, runtime sources, and packet files. Original controller raw output inherited a stale54-case method string from the source; `controller-result.json` changes that description only, preserving numeric results. This correction is explicit, not a claimed54-case execution.

## Coverage at a glance

- Browser LEFT IN: descending return to flipper confirmed.
- Browser LEFT OUT: uncharged drain confirmed.
- Browser LEFT SAVE: earned, consumed once, same-ball upfield return confirmed.
- Browser RIGHT IN/OUT: not positively verified.
- Browser ramp: not reached in three bounded attempts.
- Legal fresh-world physics controller ramp: two complete routes, first exit/return traced.
- Physical phone, human aiming difficulty, physical-contact save actuator: unverified.

All three browser per-frame traces and the full controller trace are archived compressed.
