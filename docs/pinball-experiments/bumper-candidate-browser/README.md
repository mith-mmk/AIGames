# Isolated bumper candidate: ordinary browser comparison

**Unadopted candidate. Production and Sites runtime were not changed by this test.** Baseline AIGames HEAD a1fb6bd, stable runtime71245b2. Parent owns adoption/regression decisions.

Only the response for `js/pinball/physics.mjs` was intercepted in a dedicated local Chrome session. Exact source replacement matches `artifacts/pinball/contact-strength-a1fb6bd/bumper-loader.mjs`. No on-disk production source edit, fixture, teleport or injected control. `served-source.json` records both SHA-256 hashes and exact text replacement.

## What changes

Old bumper code guarantees outward speed at least6. Candidate also preserves the restitution-derived outgoing component when incoming normal speed is high: target=max(6, −outward ×.56), where.56 is the average of bumper restitution.90 and ball restitution.22. For contacts already moving outward faster than the target, neither version adds a braking impulse. Threshold for a difference is incoming normal speed greater than10.7143.

`outward` here means the velocity immediately before the game-side bumper impulse, after the current world step and potentially earlier contact callbacks. It is not mislabeled as untouched pre-solver incident velocity. Both pre-world and pre/post-game-impulse vectors are preserved.

## Natural-contact measurements

Baseline ordinary-input contacts:

- b2 at52.917s: before−13.83045 →after+6.00000. Candidate formula would target7.74505 at that same state; this is a calculation, not a matched replay.
- b1 at54.725s: before−2.86722 →after+6.00000. Candidate would not change it.
- Held condition b1 at1.900s: before−3.78172 →after+6.00000. Candidate would not change it.

Candidate adaptive condition reached a naturally incoming high-speed b2 hit at11.467s: **−11.95699 →+6.69591**, matching .56×11.95699. At that same state the old rule would yield+6. This confirms the candidate branch operates during ordinary browser play, but the increase is only.69591 here. It does not prove that the user's overall weak-contact impression is resolved.

All observed scored bumper contacts still award100 and queue their visual hit. The inspected candidate screenshot visibly shows the ring and+100 label; its HUD already advanced to a subsequent BANK award during capture. See `comparison.json` for every measured contact, including the candidate held-condition low-speed contact.

## Same input policy, not matched trajectory

The original two input policies were reused unchanged:

1. 75% pointer-drag launch; adaptive Z / catches, LEFT80/RIGHT44 nominal release;60s bound.
2. Full-power launch; hold both flippers continuously;35s bound.

Ordinary browser scheduling/screenshot latency causes paths to diverge, including before the first candidate-changing bumper collision. Therefore score, duration and route differences are not causal A/B performance results:

- Baseline adaptive:60s cap, still playing,2075 points, one completed ramp.
- Candidate adaptive: natural three-ball GAME OVER43.875 simulation seconds,1000 points, no completed ramp.
- Both held conditions: ball1/400 points; captured on right flipper, no active coil impulses. Candidate at35.158s is near x1.0553/z4.0582 with speed nearly0. This is the existing cradle contract, not a stall defect or an automatic re-fire behavior.

No observed new persistent trap or JavaScript error in these bounded runs. This is not full regression coverage or proof against all tunneling. Walls, slings, flipper capture, feedback and sound were not changed. Sound was not perceptually evaluated. Human/physical-phone feel remains unverified.

Timing data are preserved, but concurrent testing and observer overhead mean these are not isolated FPS benchmarks.

## Reproduction / provenance

From repository root: `node docs/pinball-experiments/bumper-candidate-browser/replay.cjs`.

The replay requires the expected original bumper text; it fails if that source is no longer present. It intercepts only physics.mjs and writes to a fresh ignored timestamped folder without reusing an existing leaf. Archived adaptation is output routing only; syntax checked, not rerun after packaging.

Exact executed originals/logs: `artifacts/pinball/contact-feel-candidate-20261115T231542/`. Baseline: `artifacts/pinball/contact-feel-20261115T231114/` and sibling `stable-contact-feel` packet. `manifest.json` hashes executed scripts, comparison sources, candidate loader, served-source identity and archived evidence. Browser/server were closed after the two conditions. No commit or publication performed by this QA worker.
