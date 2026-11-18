# Restore the requested ROBOBUDDY placement

The November 13 2026 `ロボバディ・ピンボールの未来都市(1).png` plate
(1087 × 1447; SHA256 `5eee331823a5b995cce694626ad331c9ac71aa1f3872a5aa5e02e4b8c7bd1027`)
and published v27's actual 90° view were inspected. The original artwork is
private review input and is not an asset in this repository or in the Site.

| Part | Reference / v26 datum | v27 deviation | This correction |
|---|---|---|---|
| Three upper bumpers | Two rear, one front center | Removed front bumper; pushed rear pair outward | Shared render/collider centers restore (-.78,-3.15), (+.78,-3.15), (0,-2.15) |
| Lower slings | Broad mirrored triangular faces alongside center | Short, narrow outline | Restore (1.83,1.10), (1.88,2.45), (1.10,2.65) and mirror across table; same actual solid stock and powered inner edge |
| Left 3+2 yellow / right 3 red | Asymmetric banks next to the wire and S | No v27 location change | Keep shared endpoints; do not add an untested pinch between a target and the ramp |
| IN/OUT / flippers | Separate returns and drains | Shorter than concept | Retain real separation and shift the tapered divider tip .01 downstream for clearance with the full sling outline |

The visible three-pop triangle stays intact. Only near-axis strikes on the
back side of the center pop get a bounded asymmetric kick so the ball does
not cycle between the back and front pop. No target coordinate, ball
relocation, or invisible blocker is used. Nine placed return starts clear
the upper zone in 0.87–7.55 s, with exact-axis cases 2.27–3.91 s (v26's
exact-axis comparison remained above the center for 30 s). These are
explicit local physics starts, not observed frequencies in human games.

A straight upstream aim through the physical spinner into the front pop
now qualifies for UPGRADE +350. A glancing physical spinner→B path still
qualifies for CENTER DRIVE +350. They require distinct contacts; back
strikes, reversed traversals, or intervening mechanisms do not qualify.
Ground left LOOP and the right elevated S retain different outcomes.
A real standard right bat at a 49-tick release reaches B; at the same
warm-up and capture setup, Easy's 51-tick release hits UPGRADE. These
fixtures start with a single declared incoming ball placement. After that
the same ball moves only through simulated contacts and ordinary held/released
flipper inputs. Easy's slope, bat stance, and limited save rules are unchanged.

This restores the documented positions of the parts moved in v27, not a
claim of an exact reconstruction of the perspective illustration. The full
wire path, ramp supports, red-bank silhouette and lane lengths still differ
from the concept as recorded in the historical reference acceptance notes.
