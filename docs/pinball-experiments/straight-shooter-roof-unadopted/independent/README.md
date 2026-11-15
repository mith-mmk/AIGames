# Straight shooter / roof5891d9: independent static visual review

Source5891d92eeed8fb333bfefc493a09d72a89c03a10d615beb9203b0d7b0f7edbfa independently snapshotted; baseline94ea51. No production/source/force edits or natural trials. Parent reports maximum-power gate failure, so this record is not adoption or gameplay qualification.

## Whole/reference view

Paired45°,10°,top,mobile390 and lower closeup plus side/underside generated. Whole45/10/top/mobile and isolated roof closeup inspected against neon reference. Straight right shooter reads more cleanly than the former long double curve, without added board width. However the wide gap between ramp and shooter now prominently exposes three long horizontal crossheads. Left straight wire, ladderlike outer supports, large bats and outer empty areas remain major reference differences. This change addresses a route arrangement, not overall reference quality. The reference is perspective artwork, not a mechanical flow diagram or CAD specification.

Budget45°485276tri/590calls;10°485132/578;top478956/563;pageerrors0. Relative94ea:−7836tri/+21calls,14724tri reserve under500000. Lower triangle count is not a physical correctness or device-performance claim. Chrome viewport only, physical phone and human play untested.

## Actual mesh/contact checks and representation limits

upper-review/upper-mesh-contact.json independently measures installed transformed vertices against the proposed finite segment axes and matches actual world capsule centers/lengths/radii. Inner4segments max parameter error1.3005e−7 / vertex radial error3.2240e−7; outer1segment8.0041e−8 /2.4796e−7; roof24segments2.3511e−7 /2.4144e−7. All24roof TubeGeometry meshes were found. These are nominal vertex/axis agreements, NOT exact contact/visible surface equality.

Inner/outer use capsuleStockGeometry. Roof uses the inherited regular8-sided open TubeGeometry per segment while contacts are capsules. Radius.06 vertices match, but facet inward deficit is.06*(1−cos(pi/8))=.004567228. An isolated open endpoint has no visible hemisphere while contact can extend.06 axially; this applies to the unchanged final endpoint, NOT every joined segment. Backing and neighboring stock can cover portions. This is an unresolved representation difference, not evidence of a newly invented hidden wall.

The new roof multiplies open tube segments3→24. seam-metrics.json compares the actual discrete centerlines. New arc internal21joints each turn2.639802°; an ideal circular-tube/sphere local model yields potential sphere-lune area.000331727 per joint and outer-bisector distance to circular end rings.001382167. The ideal total lune area is the same old/new .016311849 because total absolute turning is unchanged. It would be false to claim that exposed contact area increases simply because seam count rises. These analytic areas are NOT actual reachable exposed areas: polygon facets, backing, other stock and ball accessibility are not integrated. No additional contact trial was performed.

## Tangent continuity

Straight outer and first roof point coincide (gap0); first actual chord differs1.319901° from the straight. Ideal arc exit58.075653° meets retained roof direction73.072487°, so ideal kink14.996834°. Actual last arc chord→old segment kink16.316735°. The next old56.733084°joint remains unchanged. Therefore the entire roof is not globally tangent-continuous. Parent/contact worker were informed before further conclusions.

upper-review/roof-closeup.png and roof-side.png are explicitly isolated diagnostics: all other meshes hidden. They show nominal joints and open terminal ends; they do not prove installed visibility/accessibility. Initial installed closeups were blocked by foreground geometry and preserved in upper-review-initial; no blank image is used as evidence of a clear passage.

## Supports and mechanical completeness

Actual whole views retain three right posts/feet/collars/crossheads, connected to the ramp seats. Designer static measurements (copied with explicit provenance) report postX2.75 and seatX1.77299/1.36618/1.61157, giving crosshead lengths.97701/1.38382/1.13843. Their heights.51130/.75857/.80085 leave the ground sphere top.310 below beam bottoms.47730/.72457/.76685, but that does not establish airborne passage. The supplied mesh/contact extrema differ under1e−7. Those support measurements were not independently rerun here. Visual contact/load paths are not strength certification; joint holes/fasteners and all accessible underside contacts remain separate checks. Full1581-style correspondence is not claimed for this changed collider count.

All earlier prototype lower-layout, static-save and reference limitations remain. No full206/natural54 or new human/device result. Scripts and source snapshots plus image/data hashes are in review-manifest.json. Preserve outputs before rerunning visual.cjs or upper-review.cjs. Both browser/server runs exited normally.
