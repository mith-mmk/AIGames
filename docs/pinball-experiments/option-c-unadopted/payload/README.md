# Option C: same-board early lower curve, frozen trial

**Artifact only, not adopted.** Accepted production remains `c1f7aeb`; documentation HEAD was `1add1b7`. This is one assembled candidate, not a parameter search or proof of natural play. No production or existing test expectation is changed. The +.90 board-extension concept was rejected before source creation.

## Load and identity

From the repository root, use this loader alone, without any older experimental loader:

```sh
node artifacts/pinball/option-c-earlycurve-1add1b7/verify-freeze.mjs
node --import ./artifacts/pinball/option-c-earlycurve-1add1b7/loader.mjs YOUR_DIAGNOSTIC.mjs
```

Browser capture should intercept the repository-relative keys in `sources.json` and serve those exact strings as JavaScript. `web/js/pinball/lower-c-study.mjs` is virtual and exists only in this mapping. Do not copy it into production. All other modules and vendored libraries resolve from the repository.

- Candidate sources SHA-256: `f956dcc144691d8cb8a35c676ead2795f7dd04dc173a143b6ad043f80b6ccdc3`.
- Loader SHA-256: `f9d2ffb9ae7ddf7024f05e5b6d24c6714f37ab10cd5ab021c04bb45b31736eb4`.
- Baseline sources SHA-256: `7a9b9fd4d71d5f33ebcd6311093b568dfde34d87bec07409c84e2a2c6961207d`.
- Exactly 33 original runtime modules are byte-identical to c1. `manifest.json` lists every old/new module hash, and the verifier independently reads each original blob from git.
- Changed source keys: layout, physics, playfield-parts, and the new virtual lower-c-study helper. `changes.json` preserves the exact source substitutions.
- `build.mjs`, `layout-functions.mjs.txt` and `study-helper.mjs` preserve the generation inputs. The original build writes its fixed artifact directory; **do not rerun it over the freeze**. No reproduction wrapper is claimed here. Use read-only verification.
- `dependencies.json` records all frozen local inputs/results and the eight vendored library files. It deliberately does not hash itself.

## Fixed versus changed

Fixed: board 5.50 × 11.90, rear/front Z −5.75/6.15, floor/board heights, ball diameter .270, shooter axis 2.53, all upper roof/bars/sensors/graphics, ramp/nose, wire geometry, broad sling, bat length/profile/rest and held angles, center save, drain Z5.05, apron, keys, launch/flipper force formulas, masses, gravity, solver, and existing material properties. The ground-entry S → left-wire topology remains the accepted one. This is not the failed wider shooter / rigid roof shift or R1.70 inlet connector.

Changed: pivot X ±1.25 → ±1.40 at unchanged Y.27/Z4.45; early shared divider and OUT curves; new lower rail mounting stock; local route print; relocated/reoriented earned side-save assembly/contact/detection. Same-bat rest projected gap increases by exactly .300, from approximately .590694 to .890694. A wider center drain gap is an intentional geometric consequence, not an established reference match or proven equal difficulty. Center-save effectiveness and continuous aiming range require new qualification.

### Actual paths

Each divider starts at X±1.900/Z3.000, bends via two tangent circular arcs, and reaches X±1.485/Z4.100 with +Z tangent. A straight heel rail then continues to Z4.850. The OUT outer stock follows the divider at actual normal axis offset .430, with corresponding endpoint X±1.915. Both rails have radius .020. Thus the ideal same-height local surface spacing is .390, before supports, junctions, other bodies and ball trajectory are considered.

Arc radius is .832665663 and maximum tangent angle 41.340°. The smallest offset arc radius is .402665663. These are construction dimensions, **not safe-radius bounds**. There are 48 segments per double arc, with tangent continuity in the analytic design but finite chord joins in collision geometry. Both meshes and contacts consume the sampled paths. Capsules/cylinders use ideal round collision solids and inscribed rendered radial meshes; identical axes/dimensions do not mean identical faceted surfaces.

The accepted IN inner stock at X±1.35/Z2.75..3.35 is explicitly retained. It is not described as a newly continuous inner wall to the heel. This preserves the wire receiver opening and avoids inventing a second long boundary through the sling. Its endpoint and new shaft are tested obstacles: the naturally reachable downstream IN stream, heel closure, and lack of side leakage remain unproved. IN/OUT label and ribbon positions are derived from the curve, not substituted for physical passage. The old `inlaneInkPath`/`laneInserts` fields remain legacy data; the helper-generated printing is used by this candidate.

### Real lower mounting stock

There are 22 lower mounting stations and three physical/visible parts at each station. Shaft radius .018 lies within the nominal .020 rail footprint. Shaft Y range is −.180..+.220, washer −.152..−.140, nut −.174..−.152. Board underside is −.140: these washers/nuts are actually below the board, unlike the previous buried foot. Shafts pass through the wood. Tiny occupied bores are not separately cut; no visible open bore is backed by an invisible floor. Old visible diameter-.130 top caps are removed, not left in the ball path without contact.

The wire endpoint remains X−1.72/Y.44/Z3 with its existing tangent, rails and support hardware. The new lower curve starts around that existing receiving area. A sampled vertical column is not its natural descent trajectory.

## Earned side save: limited mechanism fidelity

The old left-save coordinates are replaced as a single assembly. Its fixed OUT-center station is X−1.926172704/Z3.600; downstream unit axis is (.572701790, 0, .819763783), approximately 34.938845° from the former +Z approach. Its mesh, actual contact shoe, underboard rod/coil/link, local detector and outgoing impulse share that frame. This is not ball-relative aiming.

The solid cam footprint is .160 across × .220 along. Its top is Y.060, **.020 above the Y.040 floor**. It is a low closed two-sided hump, not a full-height blocking box. There are eight associated support/rod/coil parts. Two mounting studs extend into the wood, and underside washers are below the board. This is not a full dynamic linkage simulation.

**Mechanical finishing is incomplete:** the cam and rod are static. Actual moving cam/rod/coil actuation is not modeled. A genuine shoe contact gates the retained game-level earned impulse. No cosmetic animation is added to imply otherwise. Contact and mesh are aligned in the frozen static state, but this does not qualify the assembly as a working mechanical plunger.

The impulse is the fixed-axis rotation of the accepted horizontal speed-12 contract: mass × (−12 × mounted downstream axis − incoming horizontal velocity), with zero Y impulse. It retains transverse cancellation, magnitude contract, tilt guard, charge consumption and earn conditions. It does not set position/velocity directly or add an extra save. The existing game-state/missions/mechanisms modules are byte-identical. Because physical contact is now required, timing and success are unproved and may differ materially.

The local detector is narrower, not expanded: across ±.190 and along ±.135, area .1026 versus old .1458. It requires a downstream approach and actual cam contact at distance ≤.001. Geometry contact counters are diagnostic only. Three algebra-only impulse checks produce horizontal speed12; these are **not gameplay save tests**.

## Assembled static evidence and failures retained

`geometry-audit.json` is the authoritative machine-readable audit. It assembled 1551 colliders, including 200 lower rail capsules, 74 appended attachment cylinders and one cam hull.

- Cam mesh/hull: 10 vertices each, bidirectional vertex distance zero; 16 triangles; all edges paired; Euler characteristic2; positive volume and outward face checks.
- All 74 attachment radii/heights match their definitions. Center discrepancies are at most 1.21e−7. This checks nominal stock, not every installed browser transform or every structural load path.
- 3960 sphere-center samples span IN/OUT illustrative paths, offsets ±.050/0, heights .175/.195/.220/.350/.575, and rest/held poses. Ball radius .135. Floor, sensor and the ball itself are excluded; open triangle meshes are queried as surfaces. Negative entries are retained. This is a discrete query, **not a continuous all-height clearance or reachable-trajectory certificate**.
- Ground-height rest IN center samples have no collision, minimum gap about +.034611. At the inward .050 offset, the inner endpoint shaft produces penetration up to .014965. The illustrative ±.050 corridor therefore is not clear. This must not be hidden by using only the center line.
- Held IN terminal center samples meet the bat, with approximately .008695 penetration at Z4.10. This records a contact configuration, not successful capture or failure. Natural arrival speed and position, held capture, released passage and refire must be measured.
- Left OUT ground center samples intersect the cam by up to .017819. It must be traversed by physically rising over the .020 hump. **Low-speed uncharged transit/drain is mandatory and currently unproved.** No ball lift, hidden ramp, position reset or escape rescue exists.
- Right OUT rest ground center samples have no collision; minimum gap about +.061350. At ±.050 offsets the minima remain about +.012. These do not prove upper access or natural drain.
- At wire-end X/Z, the ground-height sphere has +.027 clearance to the nearest new lower shaft. New-lower-only clearance at supported center Y.575 is +.243017. At intermediate Y.220/.350 the existing wire transverse support intersects this vertical column; at Y.575 the existing wire itself is nearly tangent (−.000083). Therefore this column cannot prove natural descent. The existing inclined wire release and subsequent moving ball need direct observation.
- Negative high-level samples against unchanged bodies, lower rails, shafts, bat and cam are preserved in the full audit. No maximum radius or universal capture threshold is inferred.

## Next qualification gates

1. Inspect installed full-table/top/45°/side/mobile geometry against accepted and reference: actual lane relation, heel/rail joins, visible underside fastening, unaltered upper region, cam/rod appearance and all ball-accessible seams. Reference is a perspective image, not a dimensioned CAD drawing.
2. Run accepted/candidate ordinary-engine weak return and .55/.65/.75/.85/.925/1 natural launches with the same controls. Even unchanged upper source does not guarantee identical results because lower topology changes collider order/count.
3. Separately test slow uncharged OUT transit on both sides and earned left-save one-use contact/axis behavior. Check no blocked ball, extra activation or wall-directed shot. Do not compensate with trigger widening, stronger force or ball resets.
4. Test natural wire-to-IN delivery, both held captures, released and timed refires, heel closure and ordinary OUT drain. Compare arrival sphere-center bat-local coordinates and tip-directed velocity; past .493/1.367 versus .551/1.63 observations are not numerical thresholds.
5. Only if viable, requalify strong launch/control, continuous meaningful aim, center save, three-ball progression and full regression. Existing absolute-coordinate tests remain unchanged; any failure must be interpreted and reported, not made green by moving expectations.

This freeze is ready for diagnostic comparison, not adoption. No new source variant or geometry correction is included after this freeze.
