# Curved receiver bounded gate: unsafe stationary endpoints retained

Frozen candidate613f54747cc4fbbf66ee8c1cedbe4ff64c99271ee5cd17697c28ea381eb1ace0, single ../curved-receiver-eaf9be3/loader.mjs. Latest accepted8849609 baseline-sources through baseline-loader. Ordinary0.17.3. No production/source/force/solver/start optimization. launch/out/coarse runners copied unchanged from the prior authorized diagnostics; actual pose/spin/coil/lastFlipperShot observations retained. No full202/54 or natural-wire/human test.

## Limited results

Natural six powers .55/.65/.75/.85/.925/1 all enter field then ball2 drain in both. Scores exactly match25/25/25/525/525/325. Weak.1 naturally returns ball1, ready/returned, stop error+.001227093; position-unchanged relaunch succeeds. These do not imply all trajectories are identical. Natural initial floor query is approximately−2.48e−7 float-scale contact, distinct from positive restored fixture starts.

OUT original relative starts retained: candidate±2.115/Y.18/Z3 versus accepted±2.12/Y.18/Z2.6, vz.5/spin0. All legal+.005. Candidate uncharged left/right drain172/155ticks; left cam contacts21ticks, no firing. Fixture charge1 left:12cam-contact ticks, exactly1firing/charge consumed, drain665ticks. Charge was explicitly assigned, not naturally earned; cam remains static. This one family does not prove all slow approaches safe.

IN same candidate±1.695/Y.18/Z3/vz3/spin0; accepted±1.72/Y.18/Z2.8. Fixed delays30..70 step5, left/right, separate fresh processes old then new. All36 legal+.005, quiet capture, coil1, reset0. Candidate capture216ticks, local u≈.354706–.354745, accepted≈.354573–.354634. Actual pre-repress u max matched difference .000360477, source aim max difference .000439778rad. Distribution broadly recovers; not a universal threshold or continuous aim proof.

U=z<−1 after actual strike, D=ordinary ball2 drain, H=quiet held bat recapture, S=nonbat stationary endpoint. All failing rows retained.

|Delay|Accepted left/right|Candidate left/right|
|---:|---|---|
|30|no U,D / no U,D|no U,H / no U,H|
|35|U,D / U,D|U,D / U,D|
|40|U,D / U,D|U,D / U,D|
|45|U,H / U,D|U,D / U,S|
|50|U,D / U,D|U,D / U,D|
|55|U,D / U,H|U,S / U,H|
|60|U,D / U,D|no U,D / U,H|
|65|no U,H / U,D|no U,H / U,D|
|70|no U,D / U,D|no U,D / U,D|

Candidate upfield count13/18 vsaccepted14/18, additional missleft60. It launches almost like accepted, then contacts right target: minZ−.822832 versus old−1.086753. Actual first target center(1.04124,.42,−.94124), compared with old neighboring surface(1.04972,.42,−.94972). Count alone is insufficient, especially because two U outcomes end stopped below.

## Major stationary-contact finding

Right45 and left55 return from the upper field into the left outside region and stop nearX−2.4805/Z2.99. Both have no bat contact. Last consecutive speed<.025 sample tails are870ticks (7.25s sampled) and924ticks (7.70s sampled), respectively. This is a finite observed stationary tail, not proof of eternal immobility. No new release/replay was run.

Both final actual contacts comprise:
- new lower shaft center(−2.33,.02,3.00), nonzero normal impulse;
- existing stock center(−2.65,.2175,3.00), nonzero normal impulse;
- existing low stock center(−2.65,.055,3.00);
- floor.

Right45 final p(−2.480528,.171291,2.990840), speed≈.0000035; shaft/outer impulses.03181/.03412. Left55 final p(−2.480458,.171280,2.984116), speed≈.0000108; impulses.01879/.01910. Normals/flipped, IDs, spin and all contact distances are preserved in stopped-endpoints.json. contact.dist is not independently computed final-surface penetration. These two outcomes must NOT be classified as normal held captures or successful games merely because U occurred earlier.

The intended OUT-centerline witness and bat-overlap fix do not cover this adjacent naturally traversed outside region. The independent conservative +.07149 bat clearance is a separate static property, not demonstrated full dynamic safety. Uncharged OUT center fixture passing cannot override the two reachable-from-explicit-IN stationary endpoints. No shape adjustment or next variant is included.

## Evidence and reproduction

summary.json contains all36 actual local coordinates, coil metadata, first support/inner/sling-region contacts and endpoints. Labels use geometric coordinates; raw IDs/manifolds remain in *-coarse.json. stopped-endpoints.json preserves exact stopped cases. All trace starts are explicit relative fixtures; their external natural arrival frequency is unverified, although stopping follows their dynamically generated upstream/refire paths.

Use MODE=baseline with this directory baseline-loader.mjs; MODE=candidate with ../curved-receiver-eaf9be3/loader.mjs. Run launch.mjs, out.mjs, coarse.mjs in separate processes, baseline set then candidate set. summarize.mjs is offline. Fixed source/hash only, preserve prior outputs. Stop here: no full regression or adoption based on these results.
