# Independent upper-inlet review — not accepted

Frozen sources SHA256 4ee90b4f4622f87a466343b3ed6f7d00f1001ee380beadb78dff8f123a015894, loader upper-inlet-return-3989bfe/loader.mjs alone. No runtime or permanent test changes, no additional dynamics/full regression. Other worker owns natural-launch diagnostics.

## Visual verdict

Actual reference current-reference.png and candidate installed45/mobile/top, corrected close-up were inspected. The upper exit alignment and lower geometry remain accepted, but the case reads as a broad flat blue wedge closing the space outside the rail, with a sharp tapered front and an abrupt join to the old black backing. It is not a rectangular proxy, yet the result does not satisfy the intent of a mechanically legible, flowing reference shooter rather than a filling block. Main45/mobile make it less visible, not better qualified. Recommend no adoption on this evidence.

Use preview-final/candidate-inlet-closeup.png. Earlier preview and preview-corrected close-ups had a stale viewport/camera capture problem and are not evidence of geometry absence. preview-final installed45/10/top/mobile and close-up are valid. Underside installed capture is occluded by the cabinet and cannot demonstrate washer/nut construction; no cutaway was silently used. Side installed view is also dominated by the outer cabinet; do not infer an unobstructed exterior from it.

## Actual installed shape versus contacts

preview-final/actual-mesh-contact.json was collected from browser-installed mesh and game colliders, not helper parameters alone. Case:624 nonindexed vertices,208 triangles; exact vertex arrays and triangle indices match the Rapier trimesh. Transform-to-table discrepancy max4.97e-16. Actual bounds Y[-.0399999991,.5499999523]. This proves shared installed boundary data, not convexity, manifold contact reliability, or safe edge response.

All nine mount meshes use the same nominal radii/heights/positions as actual cylinders. Shaft[-.18,.23], washer[-.152,-.14], nut[-.174,-.152]. Positions differ only by Rapier Float32 rounding. Compared with the prior buried feet, these genuinely extend below the visible board underside-.14 and share continuous shaft/washer/nut contact. They are solid32-sided rendered cylinders against analytic physical cylinders, not exact faceted boundaries; washer r.05 radial sag is about.000241. The washer hole is occupied by the shaft, but the nut is still a round proxy and no board drilling is rendered. This is simplified assembly, not fully modeled machining.

The three mounts x2.75,2.57117647,2.35 are within widened board[-2.75,3.15]; unlike the rejected left-post x-2.80, there is no newly floating outside-board shaft here. Left ramp supports stay at c1. Right ramp supports follow sampled inner connector X, making their arms longer; source sharing alone does not qualify all resulting ball gaps.

Rail source uses the same capsule definitions for rendered stock and physical outer contacts. The straight outer rail ends at start(3.12,.23,-2.30); new outer path begins there and returns to(2.72,.23,-3.90), then old roof start(2.72,.23,-4.15). Inner starts(2.75,.23,-2.30), returns to(2.35,.23,-3.90). Endpoint position continuity does not remove overlapping capsule end caps, case-front wedge edges, or dynamic seam response. Tangents are analytic endpoint-matched but sampled chords approximate them. Do not label this a seamless smooth single shell.

The designer's1025 ground-spine samples, minimum+.002747/lower bound+.001934, certify only the stated line/query model. They do not certify the finite channel width, airborne trajectories, mounting-foot interactions, case edge approach, or safe reverse return. No independent full-passage or contact-safety claim is made here.

## Budget and scope

Accepted45:460748 triangles/685 calls. Candidate45:490276/696 (+29528/+11), only9724 triangles below500k. Candidate10:490132/684; top:483956/669. Browser page errors0. Evidence is in visual-final.log and preview/evidence.json; audit-browser reused the final evidence filename with an empty render list, so it is not the render-budget source. Screenshots themselves remain unchanged. Chrome390x844 viewport is not a physical phone performance test.

Scripts close browser/server in finally; no retained process or video. No full regression, human play, mobile device, lower IN capture, or production completion claim. The visible block concern is sufficient to pause expensive qualification; preserve separate launch results rather than using this visual verdict to hide them.

## Final parent-reported gate

Parent reports natural six-power gate:five returned from near the S connector and only .85 reached the field; adoption NG. Contact-classification replay belongs to inspect_low_support, not this static review. Rail axes share Y.23, centerline width.37, radii.045/.060: planar solid gap is .265, smaller than sphere diameter.270. The ground sphere center Y.175 is vertically offset .055, which explains why a spine can have positive3D clearance while an axis-height sphere cannot fit the local ideal cross-section. Thus ground-spine+.002747 is explicitly NOT an all-height passage margin. No shape change or full regression follows.
