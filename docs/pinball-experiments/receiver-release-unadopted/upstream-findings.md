# Remaining upstream routes: event-aligned saved-trace comparison

No new simulation or geometry. upstream-analysis.json retains old/new35,40,45,60 BOTH sides: exact coil shot, first nonfloor/nonbat contact and adjacent states, first vz sign reversal, minZ and linearly interpolated firstZ2.84 crossing. Time below is ticks since actual coil, not since spawn/capture. Source hash remains e8280a5a6a8cf1dcbb7aa570606ef4c2a0e8f2d9fd5bf7305315f2c7a8eb7e45.

## Four additional misses are not one failure mechanism

|Case|Accepted|Candidate|Interpretation|
|---|---|---|---|
|35 left/right|first contact central bumper33ticks; minZ−1.899/−2.085|sling8ticks, reversal9; minZ2.834 both|Early lower-field interception, far from z−1 threshold. Not insufficient launch or missing coil.|
|40 right|central bumper32ticks, minZ−1.715|sling8ticks, continues diagonally across table, opposing target32ticks, reversal33; minZ−.01252|Sling redirects the shot into a second obstacle; not an immediate blocked mouth.|
|60 left|right target26ticks, reversal27; eventual minZ−1.08675|right target27ticks, reversal28; minZ−.94106|Same broad target region, changed impact point/return. Only .05894 short of diagnostic threshold; not proof that central access is physically sealed.|

35left candidate first hit p(−1.02313,.17133,2.83396), v(+4.0988,0,−21.3475); next p(−.92461,.16998,2.86438),v(+11.8067,0,+3.9862). Actual sling capsule center(−1.07596,.22,2.69004). Mirrored35right goes v(−4.1009,0,−21.3486)→(−11.8823,0,+3.1894). Accepted passes this region untouched and reaches bumper center(0,.34,−2.15).

40right candidate grazes sling at p(.92905,.17127,2.75231), then arrives at opposing left target at32ticks: p(−1.65277,.17042,−.01252),v(−12.5967,0,−12.7558), contact centers near(−1.78972,.42,−.07472) and(−1.78124,.42,−.06624). Next v(+5.2938,0,+5.4157). Successful40left ALSO contacts the sling first, but crosses to the differently placed right bank and eventually reaches−1.11999. Consequently “any sling contact fails” is false; subsequent asymmetric table geometry matters.

60left accepted first target center(1.04972,.42,−.94972), hit p(.97623,.17082,−.82394); next v(−12.0443,0,+1.2251), later travels past−1.0. Candidate contacts target center(1.08402,.42,−.98402), p(.86893,.17079,−.94106); next v(−7.1934,0,+6.5382), never crosses−1.0. Successful60right reaches the left bank atZ−1.867. This does not justify removing a target just to turn a near-threshold count green.

## World translation versus recovered local launch

Exact coil source p shifts about±.150 with almost unchanged source vx/vz (e.g.35left old−1.03961→new−1.18966, vx2.80996→2.80827). At firstZ2.84 crossing the corresponding absoluteX values are:

|Delay|Accepted |X| left/right|Candidate |X| left/right|
|---:|---|---|
|35|.873705/.873742|1.023846/1.023695|
|40|.792761/.792818|.942922/.942742|
|45|.703562/.703648|.853763/.853534|
|60|.352538/.352715|.502887/.502489|

These are interpolated centers, not contact points/TOIs. The approx .15 outward shift is already present before the first new contact. 35/40 enter the unchanged sling's sphere-contact region;45 both pass it and first contact the central bumper, reaching−1.632. The data distinguish restored bat-relative capture/rolling from world-space clearance. A proposed sling/receiver translation must also preserve target/ramp/lane/support relationships and all input directions: translating one collider is not a demonstrated solution. No collision-free counterfactual was run.

## Design evidence, not a prescribed edit

The narrow support problem is no longer the sole design issue. First decide whether to retain the outer pivot/world-shifted launch, or restore a world-space receiving/striking datum while keeping valid receiver and support geometry. If the outer pivot is retained, the real sling boundary, active rubber/switch/kicker and downstream target routes require joint review using sphere sweeps over the full fixed input family. Do not tune force or select only a favorable delay.35 is a clear early interception;40 is a glancing redirection plus opposing-bank collision;60left is a target-response/near-threshold outcome, not the same obstruction.

Stored normal impulses can be zero despite trajectory change; no exact substep impulse attribution is claimed. contact.dist is not independent final penetration. All successful-side controls remain in JSON. This bounded geometric evidence does not qualify natural arrival frequency, continuous aiming, full games or safety, and does not repair known bat/rail static overlap.
