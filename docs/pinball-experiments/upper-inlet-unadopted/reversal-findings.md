# One .925 reversal classification

Authorized one replay through first vz>=0, with preceding .55/.65/.75/.85 worlds and their original complete first-launch runs. Every target p/v sample0–91 matches prior saved trace exactly. Segment instrumentation only labels existing returned colliders; no creation order, shape or input changed. Actual manifold contactIDs/centers/rotations/normals/dist/impulses are in reversal-925.json. Empty broadphase manifolds are retained raw but are NOT counted as actual contact.

## Sequence

First nonfloor points at tick44 are multiple neighboring outer capsules. At44 vz−15.4155. Tick45 inner contacts, vx−6.1996/vz−12.4267. Tick46 outer, vx+4.6760/vz−9.3322. Tick47 inner, vx−5.5107/vz−1.4853. Tick48 vx+1.5347/vz−2.2160 and stored nonempty manifold is floor only. These alternating side contacts coincide with the major early loss of forward motion, before any roof/bar/upper exit.

At50 two outer capsules have positive saved impulses.163224/.118231, floor.162406. Their normals are(.844405,.319998,−.429629) and(.915287,.326222,−.236281), raw API order as saved; flipped flag retained rather than treating raw normals as ball-force direction automatically. Tick53 two inner capsules carry.082963/.023672, floor.110273. Later the ball slows upstream to vz−.0327155 at90.

First positive vz occurs91, p(2.787552,.171160,−2.955962), v(.000250,−.000006,.001047). Two neighboring inner capsules centered(2.626548,.23,−2.899933) and(2.635569,.23,−2.878481) carry impulses.001538/.002501. Raw normals≈(.869244,−.326997,−.370793), floor impulse.074422. This is a small reversal after earlier severe slowing, not a single large backward kick at91. No nonempty case/moved-support contact was found before reversal. The ball then returned in the original complete trace; no permanent loop is established by one return.

## Interpretation limits

Strong forward motion is degraded during alternating neighboring inner/outer capsule contact. Narrow ground-sphere clearance and multiple contacts are plausible contributors, not isolated causes proven by this one replay. Several44–48 rail manifolds have zero stored normal impulse despite substantial p/v change. Poststep manifold snapshots cannot allocate all CCD/substep/tangential effects, so they do not prove zero rail influence or a floor-only cause. contact.dist is not independent final geometry penetration.

Accepted outer is an8-sided Tube convex hull, newouter ideal round capsules of nominalradius.06. Maximum radial difference .06−.06cos(pi/8)=.004567, inradius.055433. The path and cross-section representation both changed. This confound is documented and not declared the sole cause. No variant/control to isolate it was run. Inner radius.045/axis spacing.37 leaves same-height planar width.265, and the ball center lies below rail axes; these nominal numbers alone do not prove a 3D wedge or safety.

Major first-launch regression remains. No geometry/solver/force sweep or full regression. Accepted production unchanged.
