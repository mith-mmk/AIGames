# Bumper rebound investigation: rejected candidate

User report: collision response feels weak in the Sites trial. Baseline AIGames a1fb6bd, production runtime71245b2. No production change or Sites redeployment. This packet preserves an isolated response candidate, not an adopted fix.

## Findings

Ordinary browser input confirmed a strong rising-flipper hit (about32 speed), low-energy held-flipper capture, accepted bumper and sling contacts with score/visual response, and a wall-direction reversal with substantial damping. No tunneling was reproduced in those limited observations. See adjacent stable-contact-feel and bumper-candidate-browser packets for screenshots, inputs and before/after velocities. This is automated local browser QA, not a human or physical-phone test, nor authenticated postdeployment replay.

The bumper's existing minimum-outward-speed logic runs at a CCD contact event that can precede the later passive restitution response. In isolated artificial fixtures at incident speeds6/12/24, all three become outward6. This explains a specific loss of high-speed rebound energy, not every possible weak-contact report. A normal browser high-speed bumper contact also had inward13.83045 become outward6. Walls and held flippers deliberately have lower restitution; captured balls must not automatically refire.

Candidate: preserve the current averaged-restitution rebound component when it exceeds the powered minimum. Geometry, collider order, inputs, scoring and save code unchanged. Artificial12/24 cases become6.7133/13.4266; no next-tick double rebound observed. Normal browser candidate contact inward11.957 became6.6959 with score/visual response. Browser trajectories are not matched-input deterministic comparisons.

## Rejection

Stable focused checks:38/38 pass, exit0. Current lint exits0 with three pre-existing CSS baseline warnings. Candidate full suite:223/224 pass, exit1. Failure is lower-layout's five-adjacent-shot same-ball contract after recapture and refire: ball2 instead of ball1. No assertion was weakened.

Separate same-world-order refire diagnostic confirms the mechanism matters: after the common capture state, baseline keeps ball1 for all5 conditions; candidate drains to ready ball2 for all5. In this fresh-world diagnostic release80 already misses the ramp in BOTH versions (world-history sensitivity);81–84 each traverse once. Do not present this diagnostic as the exact full-suite world history or conceal the baseline miss. The compared capture states are identical; the later bumper response changes survival.

Natural54 legal-controller sessions: both54 finished,0 stalls,0 zero scores,0 live-position resets. Baseline→candidate score169700→176775, ramps61→57, bumper events235→270, controller release stages284→289; actual coil events815→814. Examples of worse conditions: .925/84 score7775→4000, release stages12→7; .85/44 release stages5→1. Out-of-board escapes are not independently measured by this audit. Aggregate increases do not override the targeted loss of same-ball survival. No human-difficulty claim.

Decision: reject this simple high-speed increase. Keep published gameplay unchanged. Next work must assess contact-specific rebound direction/energy against same-ball refire and natural play before further tuning; do not compensate with automatic rescues, narrow timing gates, or relaxed tests. This investigation does not resolve the user's overall impression, and mechanical/reference completeness remains outstanding.

## Replay / evidence

fixtures.md describes the deliberately isolated fixtures and their limits (including high-speed held-flipper contact that passes behind the bat in a gravity-free elevated fixture, not proof of natural tunneling). proposed.patch is the unadopted production diff. bumper-loader.mjs applies its numerical formula in memory; source files remain unmodified. probe.mjs and refire-diagnostic.mjs import the current repo runtime; use the recorded baseline revision in a separate worktree for historical replay. Set CONTACT_OUT/DIAG_OUT to NEW destinations to avoid overwriting evidence. Run loader explicitly via --loader. The preserved natural source is a snapshot for provenance, not a path-independent executable. Original scripts/pinball-playability-audit.mjs plus the loader reproduce the natural audit with fresh output paths. Logs and complete JSON are preserved; no full pass claimed for the rejected candidate.
