# Independent stepped-standoff analytic review

Reviewed designer stable-upper-mounts-regression-527764b/stepped-standoff-analysis dimensions-and-bounds.json and README. No source or simulation changes. The failed full-height aa38 is not revised.

Let R=.135, A=R+.035=.170, bar endpointY=.230. At centerheight y the expanded old endpoint radius is B=sqrt(A²−(y−.230)²). A vertical finite cylinder [b,t],radius r has expanded XZ radius r+sqrt(R²−d(y,[b,t])²) when d<=R. This follows directly from minimum point distance to the solid cylinder, and compares every azimuth, not a single centerline.

Stem [.060,.235],r.020:
- y=.170..235: expanded radius=.155. B is smallest at.170, reserve sqrt(.170²−.060²)−.155=.004059737206.
- y=.235..370: reserve B−.020−sqrt(R²−(y−.235)²). Its stationary point satisfies (y−.230)/A=(y−.235)/R, giving y=.254285714286. This is the minimum on that interval, reserve sqrt((A−R)²−(.235−.230)²)−.020=.014641016151. Endpoint values are larger.
- y>.370: added expanded stem is absent. Above old endpoint reach.400 both are absent; a positive numeric clearance there is not claimed.

Flange [.005,.060],r.055:
- y=.170..195: old B increases while added radius decreases, so minimum at.170 is .025797357993.
- y>.195: no flange-expanded centers.

Thus every newly forbidden center of either support at y>=.170 is already forbidden by the old endpoint capsule, with smallest radial reserve .004059737206. Endpoint disk containment is sufficient even though the full horizontal capsule also extends toward the next endpoint. r.025 would violate the.170 section by .000940263; no such enlargement is justified by this derivation.

Mechanical reading: flange bottom.005 intersects board, flange top.060 meets stem bottom.060, stem reaches.235 and intersects the bar endpoint sphere spanningY.195..265. The full stem crosssection is substantially embedded near the endpoint equator; not a floating cap. This is geometric continuity only, no manufacturing strength, threaded connection, bore or underside fastening proof. If implemented as two closed cylinder primitives, the shared internal disk is not automatically a collision-union removal; record representation and inspect actual surfaces.

This is not dynamics equivalence. Existing-bar penetration can bring new support contacts into the solve, and centers below.170 fall outside the proof. Solver contact ordering, CCD and finite tessellation remain separate qualification. Review installed literal dimensions, endpoints, primitive mapping, render budget and static old/new witnesses after source freeze. No force/sensor/input/roof changes are authorized here.
