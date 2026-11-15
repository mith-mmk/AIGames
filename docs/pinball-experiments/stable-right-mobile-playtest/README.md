# Stable right-route attempts and interrupted mobile input

Tested on hadrianus at HEAD `5330d0782f292d2736c8af77807eade5320fe63b`, branch `pinball/0.1.0`. Production runtime remains `71245b26bbc4d72c364d395b21b58b933bba4675`. No production edits, geometry variants or fixtures.

## Findings

No new reproducible production defect found. New interruption/resize checks passed. **Actual-browser RIGHT IN/OUT remain unverified** after the two bounded attempts. Their previous legal-controller evidence remains valid but is not promoted to browser coverage.

Actual window blur is also unverified: dedicated headless and visible Chrome test windows both remained `document.hidden=false` and emitted no blur/visibilitychange events when Playwright created/activated another tab. The focus assertion failed. This is an observed automation limitation, not evidence that the game's blur handler is broken. No synthetic event was used to claim a real-focus pass. Both dedicated browsers were closed; existing user tabs were not accessed.

## Two targeted browser games

Ordinary pointer-drag launch and Z / key input, with read-only launch/shot/frame telemetry. Strategies were selected from preserved legal RIGHT OUT .55/80 and RIGHT IN .85/82 cases. Nominal80-tick releases allow the previously measured browser-frame overhead; this is not exact fixed-tick replay or matching world history.

- Power.55 / nominal80: natural three-ball GAME OVER43.025 simulation seconds, score1700, one CENTER SAVE. The safety bound of three zero-score same-ball shooter returns did not trigger.
- Power.85 / nominal80: natural GAME OVER72.592s, score5050, one CENTER SAVE. LEFT SAVE earned but not used. Neither attempt completed a ramp; earlier actual-browser ramp successes are not invalidated by these different trajectories.
- Both traces contain zero floor samples in the broad right corridor x(1.48,2.4), z(2.9,4.5), y<.3. Thus no specific right route is claimed.
- No JavaScript page errors. Resource/console errors were not comprehensively collected here.

No further games or controller sweeps were run. Mobile checks below used one short fresh launch to exercise interruption recovery, not an additional route-coverage game.

## New focused mobile-emulation evidence

390×844 Chrome CDP touch emulation. Touch charging/cancel and two-finger flippers use actual touch events. Pause/restart also use keyboard shortcuts or ordinary mouse UI clicks: these are mixed-input desktop-emulation checks, not proof of native phone gestures or mobile OS interruption behavior.

- Touch cancellation during charging clears ownership/power and remains ready without firing.
- Pause while charging, release while paused, resume: remains ready, charge canceled, no accidental shot.
- Restart while charging and both flippers held: ball1, score0, no charge owner and both controls released. Releasing the old touch/keys does not fire.
- A subsequent full-strength touch launch succeeds.
- Pause during simultaneous flipper touches: ball position stays identical for500ms; releasing touches while paused clears both controls; resume returns to playing with neither held.
- A naturally triggered CENTER SAVE keeps use1/charge0 and the same ball across pause/resume. No replenishment or extra consumption.

The first focused scripts stopped on the unavailable real-blur assertion. `headless-focus-results.json` and `visible-focus-results.json` preserve those failures and the preceding successful cancel checks. A separate remainder script skipped that unavailable check and completed the previously unexecuted tests. No successful blur result is claimed.

## Landscape and return

While both flipper touches were held, resized to844×390, released them, then returned to390×844. Both controls were false after release and after portrait return. Landscape document width844 equals viewport width; all three controls are within the viewport:

- Left x602–666.86, y288–359.
- Launch x671.86–760.14, y288–359.
- Right x765.14–830, y288–359.

The inspected landscape screenshot shows the entire playfield and reachable controls. The status panel is intentionally vertically scrollable at this height, so its lower text is not all visible simultaneously; this is not described as all-HUD-content-visible. Portrait return is also inspected. Physical orientation events, safe areas and actual-phone touch behavior remain untested.

## Evidence and reproduction

From repository root:

- `node docs/pinball-experiments/stable-right-mobile-playtest/browser-replay.cjs`
- `node docs/pinball-experiments/stable-right-mobile-playtest/mobile-replay.cjs`
- Optional diagnostic: `node docs/pinball-experiments/stable-right-mobile-playtest/focus-probe.cjs`

The focus probe can exit with an assertion failure in this automation environment; inspect whether actual focus events occurred before interpreting it. It includes charging cancellation checks before the probe. Browser replay caps each target at90 seconds and can stop .55 after three unproductive same-ball returns. All scripts create fresh timestamped ignored output folders and fail rather than reuse an existing leaf. Input logic is unchanged from executed originals; only output routing was adapted. Syntax checked, not rerun after packaging.

Exact scripts/results and raw logs remain under ignored `artifacts/pinball/right-mobile-20261115T220224/`. Compressed browser frame traces, input/launch/shot records, mobile state comparisons and selected screenshots are archived here. `manifest.json` records original and packet SHA-256 hashes. Human playability, physical-phone behavior, actual browser right routes and true focus interruption remain explicit coverage limits.

## Current regression recheck

The unchanged runtime was rechecked: the Node runner finished with224/224 tests passed, zero failures/cancellations/skips (140.868s). These include fixture-based tests and do not extend browser-route coverage. ESLint returned0 errors and3 existing CSS baseline-feature warnings. Full logs and `regression.json` are preserved. After the Node summary, the enclosing shell failed because its result variable was named zsh’s reserved `status`; the test process exit code was not separately captured. The complete runner summary, rather than the shell exit, is the evidence for the224 passing tests. No production fix or test-expectation change was made.
