# Stable contact-feel observation

User feedback: 「あたり判定が弱い気がする」. Tested local AIGames HEAD `a1fb6bde4f6992ea549a14c7edfc098460c51168`, production runtime `71245b26bbc4d72c364d395b21b58b933bba4675`, hadrianus Chrome. This is a local browser reproduction of the stable game, not a test on a physical phone or a human evaluation of the hosted Site.

## Finding

No collision tunneling was reproduced in the inspected natural-contact windows. Active flipper hits are strong; continuously raised flippers catch and hold rather than automatically re-fire. Bumpers visibly react and push outward. Wall rebound and sling impulse are materially softer than an active flipper, making them plausible contributors to the reported weak feel, but these observations alone do not establish a collision bug or justify changing all restitution values.

No runtime changes were made. In particular, the existing hold/capture contract was preserved.

## Two bounded ordinary-input conditions

1. 75% pointer-drag launch and adaptive normal Z / catches, nominal LEFT80/RIGHT44 release timing; 60s cap. Final score2075, still playing. 27 flipper collision callbacks, 78 sling callbacks and2 bumper callbacks. Callbacks include repeated/cooldown contacts; these are not all unique scored hits.
2. Full-power launch with both flippers continuously held; 35s cap. Ball1/score400, settled on right flipper. Two flipper callbacks and one bumper callback; no additional coil impulse while held.

No ball placement, velocity/state fixture, artificial drain or simulation-speed override. Read-only wrappers call the original world.step/hit/strike/launch functions unchanged and record before/after snapshots. Screenshots and polling can alter ordinary input timing. The raw frame/contact arrays preserve those exact runs.

## Concrete contact evidence

### Active flipper versus held capture

At7.033s in condition1, right flipper is rising. Velocity immediately before the game-side contact impulse is(vx,vz)=(-.710,+6.537); afterward(-23.675,-21.528), horizontal speed32. One coil impulse is recorded. This is a strong return, not a missed hit.

In condition2 both flippers are already raised at8.025s, so `rising=false` and coil counts remain[0,0]. Ball contact is physically resolved and by11.008s it is held at(x1.0552,y.1712,z4.0582), planar speed approximately.00015. Both inputs remain true. That reproduces the appearance of little rebound when holding continuously, but it is the intended cradle/capture behavior. Releasing controls only at the end of the run begins lowering the flippers; do not mistake the final released snapshot for the long held state.

### Bumpers

Three naturally reached bumper contacts across the two runs all scored100 and queued a visual hit. Outward planar velocity across the game-side impulse:

-Condition1,52.917s,b2: −13.8304 →+6.0000.
-Condition1,54.725s,b1: −2.8672 →+6.0000.
-Condition2,1.900s,b1: −3.7817 →+6.0000.

`p1-d0-contact-bumper.png` visibly shows a yellow expanding ring and+100 label/HUD. Therefore missing bumper feedback was not reproduced. This is a minimum outward-speed rule, not a guarantee that total speed increases on every impact. Sound was not listened to or perceptually evaluated.

### Slings

At7.100s, a scored sling callback adds planar velocity(+1.34875,+1.80094), magnitude2.25, and awards25/queues a visual hit. The screenshot confirms SLING+25. At that moment the incoming ball was already fast, so the extra impulse is small relative to a speed32 flipper shot. Multiple callbacks at the same time are suppressed by cooldown and do not all add force/score. This supports a bounded game-feel tuning discussion, not enlarging hitboxes without further evidence.

### Wall

A genuine left cabinet wall contact near collider x−2.8:

-55.408s: ball x−2.5536, vx−3.7804.
-55.425s: ball x−2.6165, vx−3.7722.
-55.442s: ball x−2.5989, vx+1.0141.

It stays inside and reverses direction, but the normal component is strongly damped. This contact window does not show tunneling. Some collision-start callbacks occur before the next solver response, so callback velocity alone must not be called the final rebound; the subsequent frame window is included. `static` callback totals also include floor/rails and must not all be labeled wall hits.

## Timing and visual scope

Measured physics elapsed / wall elapsed:

-60.200 /60.205s,3527 frame observations.
-35.025 /35.028s,2102 observations.

No overall slow motion appeared in these runs. Other focused tests ran concurrently, so these are diagnostic local ratios, not an isolated FPS benchmark or evidence about the user's device. The renderer's low-FPS behavior remains a separate possible explanation for a slow-feeling session.

Selected active/held flipper, sling and bumper screenshots were inspected. Still images cannot establish every short-lived flash or perceived audio strength. No universal no-tunneling claim, physical-phone pass, or human game-feel rating is made.

## Evidence / replay

From repository root: `node docs/pinball-experiments/stable-contact-feel/replay.cjs`.

The archived replay uses a fresh timestamped ignored `artifacts/pinball/contact-feel-replay-*` output directory, refusing an existing leaf. Input and observer logic are unchanged from the executed script; output routing only was adapted and syntax checked. No replay after packaging.

Exact originals/logs remain at `artifacts/pinball/contact-feel-20261115T231114/`. Compressed complete contacts and frame traces, selected windows and summary are included. `manifest.json` records hashes for original evidence, packet and runtime sources. Parent coordinates any proposed feel adjustment and regression checks; this packet makes no production change.
