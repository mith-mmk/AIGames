# Upper inlet returning to the accepted exit — unadopted artifact

Baseline c1f7aeb, documentation HEAD3989bfe. This is **upper-only**, not a new lower-lane solution or production candidate approval. Inputs, forces, existing materials, solver and all test expectations remain unchanged.

## One physical connection
The lower straight shooter is shifted+.40 to axis2.93. Instead of shifting the roof/rollover group, a two-arc S connector returns it to accepted axis2.53 at z-3.90. Roof segments, all four ground-rollover bars, three sensors and their graphics remain at their accepted coordinates.

Endpoint separation .40 in X and1.60 in Z gives two equal circular arcs:
R=(1.60²+.40²)/(4*.40)=1.70; angle=2atan(.40/1.60)=28.07°.
The longitudinal run is an estimated design choice keeping the bend below30°, not a physical safety guarantee. The start is(2.93,.23,-2.30), end(2.53,.23,-3.90), both with-Z tangents. Rails use normal offsets-.18/+.19, not horizontal shifts. Each arc has32 segments. Shared capsule definitions produce rendered round stock and physical contacts.

The accepted channel's .045/.060 stock radii atY.23 are retained. Its planar solid-face width.265 is less than ball diameter.270; the ground sphere centerY.175 sits below rail axes. Thus this is NOT a .32-wide planar clearance claim. The lateral ground-center feasible interval is narrow; actual 3D checks and launch motion are essential.

The right board/cabinet boundary, straight shooter, plunger, served ball, backing extension, UV registration and support datums share the necessary wider extent. Ramp floor/walls/base/nose/profile/wire and all lower guides, slings, bats and kickback hardware remain c1. Right ramp columns attach to the actual sampled inner connector where applicable; left columns remain c1.

## Outside case and supports
The new case exists only OUTBOARD of the curved outer rail, from aboutz-2.739 to-4.15. Its inner footprint follows the rail's outboard stock envelope and is clipped at the existing widened cabinet inner face x3.13. It joins the expanded backplate and cabinet, not an arbitrary rectangle placed in the playfield to reproduce a nose reflection. Render and collision consume the same closed extrusionY[-.04,.55]. It must be rejected if actual installed views show an inappropriate block or if reachable edges/corners create traps.

Three inner-rail mounts have continuous shaftsY[-.18,.23], washersY[-.152,-.14], retaining nutsY[-.174,-.152]. They cross the actual visible board bottom-.14 and lie under it, unlike the rejected buried feet. Board micro-drill holes are not cut into the bulk board mesh; this remains game assembly geometry, not certified manufacturing CAD. The top shaft radius.018 stays inside the .045 rail envelope. Underboard cylinder representation and supports need independent actual-view review.

## Difference from rejected trials
A kept a distorted partial roof and moved the aisle/outer lane; A-rigid translated the roof; last integrated study translated all bars/sensors too. This study preserves the whole accepted roof/exit/rollover relationship and supplies a separate endpoint-matched connector before it.
B used a+.35 horizontal smoothstep acrossz-1..-3.9, a .45-separated/.07-radius external guide and a coarse .95-high box, plus early ramp rise/base changes. This study is not that source: normal-offset R1.70 arcs overz-2.3..-3.9, original .045/.060 stock, exact outboard case, no early rise, no removed base, and no changed lower guide. The general idea of returning to the old exit has been tried; the new geometric differences do not establish success.
C/C2 widened the upper exit and bent the lower shooter back. Here the lower shooter stays straight and the upper endpoint/roof/rollover remain accepted.

Weak.55 baseline reaches only aboutz-4.64. Merely decorating a far rear outlet cannot guarantee delivery. This study instead restores the original physical inlet/exit alignment before that region. Whether it also prevents the widened aisle bypass of the old nose is a real launch question, not asserted from shape.

## Freeze and review
Load only this directory's loader.mjs via node --import. No previous experimental loader or deterministic-engine layer.
sources.json contains every frozen runtime source plus virtual upper-inlet-study.mjs. Browser previews serve sources['web'+URL.pathname] for /js/pinball/... including the virtual helper. baseline-sources.json is accepted c1.
manifest.json records dimensions/source hashes; dependencies.json records loader/helper/build/vendor identities. static-spine.json is only a sampled connector centerline query, not natural-play or full safety proof.

Priorities: actual installed top45/side/mobile and true underside mounting; visible/contact case faces; reachable connector endpoints, seams and inner-support gaps; six natural powers.55/.65/.75/.85/.925/1 plus weak return. Separate full gameplay qualification requires adoption potential first.

## Scope that remains deliberately unfinished
The old lower right OUT remains at accepted coordinates while the shooter/case widens. Its extra exterior space is not labeled as a finished third route or a solved lower layout. No new IN or capture result follows from this upper study. lower-design.md describes the separate minimum coupled change still needed. No production source/test/commit change is made.

Initial static-spine result:1025 sampled ground centers on the connector spine, closest nonfloor sphere gap+.0027470; max intersample step.00162681 gives a conservative distance lower bound+.00193360 for this spine under the stated query model only. This narrow margin is not a full passage, dynamic or manufacturing tolerance qualification. Node assembly has1520colliders/75appended inlet contacts. Independent installed review and natural launches remain pending.
