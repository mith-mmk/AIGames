# Secondary underboard observation: unimplemented, unrelated to lane causality

Read-only inspection of the stable full-size MechanicalBumper and cabinet identified mounting geometry issues. Source: components/bumper.mjs buildUnderboard, components/cabinet.mjs boardThickness.18, assets.mjs installation. Source hashes are in evidence-references.json. These findings were not a lane-control experiment and no bumper source was edited.

At installed rootY0/fullsize, the board occupiesY[−.14,.04]. Measured feet union bboxY[−.055500,−.030500] and screwsY[−.06,0] lie inside that board. Individual feet are centeredX±.235 with halfwidth.055; the central bracket reachesX±.063, leaving a.117 gap to each foot. The proposed load path is therefore not visibly connected as installed.

A possible later local proposal, **not implemented or validated**, is a common plate under the board, topY−.14/bottom−.156, width.58 and Z roughly[−.08,.18], with the bracket top ending at the plate rather than inside the board. Existing two moving rodsX±.254 need holes of at least radius.020; the central skirt-switch stem/leaf needs elongated relief. These are draft fit dimensions, not structural-strength certification. Keep existing rod/yoke/coil stroke unchanged and inspect the full motion envelope, fastening/load path and clearances before choosing a design.

Scope is the full-size installed model. MINI_BUMPERS is currently empty; do not uniformly scale an underboard mounting plate for future mini models without a separate installation analysis.

The existing physics bumper is a full cylinder radius.40/halfheight.32 centeredY.34 (Y.02–.66), while visible cap/skirt/ring profiles vary with height and animation. Fixing an underside mounting plate would **not** fix that inherited render/contact mismatch or complete the bumper. A later accepted change requires shared contact geometry where appropriate, unchanged behavior checks, underside/multiview inspection and full baseline regression. No blanket match or physical-device claim is made.
