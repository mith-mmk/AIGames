# The seven marked board corrections

This supersedes the v28 concept-art placement pass. The seven marks were
resolved against the original 536×843 in-game screenshot in 「配置修正依頼」
(SHA256 `940306eeb27429028e29e7b1c83da23899f2552834d2f7a7127869cc256e7e2f`).
The private image is not included in the source or site. Coordinates are for
locating existing parts in that screenshot, not positions of final parts.

| Mark | Identified part | Installed change |
|---|---|---|
| 73.3%, 62.5% | Right triangular sling | Both sling centers move toward the player from z 2.07 to 3.06 beside the real IN crossing at z 3.19. The inboard powered faces and passive outboard lane faces use the visible stock; the feet are sealed. |
| 48.1%, 36.0% | Space in front of the two rear pops | Retain the front circular bumper added in v28 and its bounded anti-cycling return. |
| 96.0%, 61.5% | Outer board edge | Board width 5.50 → 6.04: one .27 ball diameter on each side. Solid wall, floor, shooter lane, art and camera frame share the revised width. The shooter barrel remains .37 wide between stock axes. |
| 32.8%, 35.3% | Upper three yellow stand-ups | Remove the entire group and its backing, not just the display faces. |
| 29.4%, 43.8% | Lower yellow stand-ups | Change two to three at the same left-side station group, leaving reachable faces and clearance to the loop and scoop. |
| 37.2%, 50.4% | Service scoop to the left of the robot art | Compact .60 × .50 chamber, relocated upfield relative to v28. Keep a .48 open mouth, physical hold and ejection; the upstream deflector sheds the ball rather than creating a flat backstop. |
| 28.1%, 22.6% | Unreachable upper-left loop/return | Widen the ground entrance from .36 to .42, move its lower approach upfield, connect the rear turn to A and move the three upper rollover lanes right. |

Fixed physics probes are separate from natural-input games. The local
lower/side sample included 37 legal starts (three intentionally invalid
controls in solid stock), 18 IN-to-bat approaches and six powered sling
contacts. Those starts and six whole games with three plunger powers and
ordinary repeating bat input in both difficulties had no sustained stop,
out-of-bounds drain, or live position reset. Specific test captures identified
and eliminated the right ramp-side and left bank/scoop wedges introduced while
widening. This does not certify every possible trajectory or human difficulty.

The narrow ground left loop, elevated S with wire return, straight UPGRADE
through the spinner, and the deep B route reward different actual contacts.
Easy keeps the shallower slope and rest stance and preserves limited rescue
with a real open center drain. No score, ball position, or rotation is
teleported to complete an attack.
