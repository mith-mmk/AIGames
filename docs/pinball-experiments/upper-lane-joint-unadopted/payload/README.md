# Joint right rollover bar, upper lane and shared visible stock

Frozen candidate d971a4257f41512487cdf88ac9bfd9fc3f5208fd1223bf7e052a13edade98fac. Parent source5891d92e remains immutable; stable0b75 and production/tests are untouched. This artifact is not adoption or whole-game qualification.

## Observed cause and one proposal

Preserved5891 six-power input envelopes, not fresh trial search, motivated this change. .55 reached the field without a bar contact. Maximum power left the roof with vx−9.174/vz−1.723, then hit the right bar side and reversed rightward. .925 instead reached the rear cap at a different angle; powers cannot be represented by one successful incoming state. input-evidence.json and plan-check.json preserve all six comparisons. Old p/v relative to a proposed bar are illustrative intersections, not new natural trajectories or legal restored starts. Simple frictionless reflection vectors do not predict full 3D engine behavior.

Right bar retains length.90/radius.035, rotates45° toward lower-left, and moves centerZ−4.55→−4.45. Endpoints are (2.193198,.23,−4.768198) and (1.556802,.23,−4.131802). Other three bars stay at their old positions. The initially examined rotation at unchanged center had roof/bar bare surface gap.282639 but conservative same-height ball reserve−.007361 after the real radius.055 mounting column. That version was not assembled; rejected-fixed-center-* preserves it. This is a same-height necessary constraint, not proof that every floor path was impossible. The chosen Z+.10 gives conservative shoulder reserve+.088306 including actual mount radius.

C lane sensor derives from the adjacent physical bar midline: center(1.25,.20,−4.45), yaw−26.565051°, half-size(.35,.16,.08). BottomY.04/topY.36 remain fixed. C lamp and label follow that same frame; A/B remain at their original datums. Three lane IDs0..2, each100points, mission, complete-set reward, finite earned save conditions and event timing are unchanged. No sensor-only shift or deleted bar. The two boundaries define a tapered C passage, with minimum bar-axis separation.931802, bar surface gap.861802; full support/body queries remain necessary.

Roof path and all physical roof capsules are exactly5891. Visible roof is now one merged capsuleStockGeometry from those same24 capsule parts, and all four visible bars use shared capsule stock too. This models rounded ends rather than inheriting open8-sided tubes. Inscribed12-sided facets remain: roof radial facet deficit.00204445, so this is not analytic visible/contact identity. Existing eight visible mounting columns now have matching cylinder contact (radius.055,height.23,centerY.12). They are not omitted to let shots pass; adding their contact is an explicit scope change.

Source scope: three changed existing modules (physics/assets/playfield-parts), one new common upper-lane-geometry module;36 other modules byte-identical to5891. No roof dynamics, board, shooter, ramp, lower, longbat, keys/force/solver or scoring-rule source changes. Upper case/supports and incomplete static save remain as before. Prototype ribbon/stable OUT-arrow patches are not mixed in.

## Static result and its limits

Ordinary engine assembly only, step0:1588colliders (1580+8 mounts),59attachments. Shared bar/cylinder centers, radii and sensor rotations/extents measured in static.json. Three predeclared ground-lane center paths include all fixed colliders except intentionally contacted floor: continuous lower bounds+.079735/+.131288/+.156923, with numerical query error separate.

The first auxiliary roof-to-C polyline chose a point too near the retained roof segment and penetrated by.048883. It remains in static.json as an INVALID witness. No geometry was changed. shoulder-supplement.json instead uses the midpoint of the actual roof nearest point and bar upper endpoint; that connected sphere-center path has lower bound+.028234, nearest the real upper mounting cylinder. Neither path is a natural trajectory or runtime guide. All-height dynamic access and possible stops need tests.

Exact standalone shared-stock meshes: roof4608tri vsold384; bars4×192 vsold64total. From prior whole45 count485276, predicted count490204. Browser-installed counts and reference/mobile quality need independent review. Topology matches the mechanical cause more closely but reference is perspective art, not CAD; large bats, empty regions and crossheads remain unresolved.

## Load and gates

From repo root, use exactly one loader:
- loader.mjs: d971 candidate.
- baseline-loader.mjs: frozen5891.
- accepted-loader.mjs:884 source reference; current stable0b75 has a separate rendering-only arrow fix.

node --import ./artifacts/pinball/upper-lane-joint-e283fc7/loader.mjs artifacts/pinball/upper-lane-joint-e283fc7/check-static.mjs

Frozen source/maps/loaders must not be edited in place. build.mjs requires exact5891 and refuses differing output bytes. dependencies.json/freeze-files.json pin inputs and vendors.

Next gate is the original .55,.65,.75,.85,.925,1 plusweak.1 order, real launch conditions, then low/high-speed legal ground passes through all three physical lanes and elevated-route false-award checks. The former absolute-coordinate assertions stay historical, not silently rewritten. Roof/bar/sensor contracts, three distinct IDs and exact rewards must be separately verified. Only local/static/visual success can justify continuous aiming/full206/natural54 and natural ramp→wire→IN capture/refire. These broader qualifications have not been run for this artifact at this checkpoint.
