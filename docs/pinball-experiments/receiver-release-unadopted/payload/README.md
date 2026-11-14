# Receiver-release candidate on accepted8849609

**One frozen diagnostic candidate, not adopted.** Source SHA-256 `e8280a5a6a8cf1dcbb7aa570606ef4c2a0e8f2d9fd5bf7305315f2c7a8eb7e45`. It implements the dimensioned receiver-release-plan-16e7e13 without a geometry search. Production and existing test expectations are unchanged. Current accepted full pinball suite is202, not the earlier198. No full202, natural54 or continuous aim suite has been run on this candidate.

## Load and immutable scope

Run from repository root:

    node artifacts/pinball/receiver-release-8849609/verify-freeze.mjs
    node --import ./artifacts/pinball/receiver-release-8849609/loader.mjs YOUR_DIAGNOSTIC.mjs

Use this single candidate loader, not an older experimental loader chain. The accepted comparison is `baseline-sources.json`, copied from git commit `884960985a413986d57aff0c2280e59a7be79dcf`. A comparison loader should read that map instead of sources.json at the same repository depth. Browser replay should serve the exact source-map strings, including virtual `web/js/pinball/lower-c-study.mjs`.

Candidate loader SHA-256: `f9d2ffb9ae7ddf7024f05e5b6d24c6714f37ab10cd5ab021c04bb45b31736eb4`.

Accepted wire-stock SHA-256 is `6746f5f3abeea64e98a44b6e07597e164590ed4616532c1329e786b8a2c3825f`: the adopted coincident-pole index cleanup is retained byte-for-byte. There are34 unchanged original .mjs files in this map, comprising33 runtime modules plus the unused existing sphere-clearance.test.helper.mjs test helper. Three original runtime files change (layout, physics, playfield-parts), and one virtual helper is added. The bundle does not change that test helper or any expectation.

Relative to old C, physics.mjs and playfield-parts.mjs are byte-identical. Changes are the receiver/OUT/support layout, helper import and noncolliding ribbon sampling, plus the accepted wire-stock and baseline test-helper inventory. The save frame, mesh/contact/impulse logic, input/force formulas and conditions are not redesigned. `manifest.json`, `changes.json` and `dependencies.json` record source/provenance hashes.

`build.mjs` pins8849609, reuses exact archived C substitutions/helper, then inserts this one receiver. It rejects differing generated files instead of overwriting them. `prior-c-changes.json` and `prior-c-helper.mjs` are unchanged archived inputs. The original C artifact is not written. This build is not an approval to modify a frozen source.

## Implemented dimensions

- Board, shooter, roof, rollover bars/sensors/graphics, ramp/nose, wire, broad slings, bat profile/length/angles, floor/drain/center-save and apron stay accepted.
- Pivots remain C's±1.40/Y.27/Z4.45; same-bat rest projected gap remains approximately.890694 (accepted approximately.590694). The effect on central drains/center-save/difficulty remains a gate.
- The C first arc is retained with its24 existing segments to(1.6925,.22,3.55). The new connector meets the accepted terminal rail at(1.3793162114557363,.22,4.028382335875251).
- The accepted terminal samples are generated from the actual baseline function and shifted outward exactly.15. Their minimum right-side X is1.351035134606193; heel stock is X1.435 to Z4.85. The plan diagram used rounded coordinates; this source uses the original full precision. This is not a dimensional redesign.
- Inner rail remains X±1.35/Z2.75..3.35. The inner lower shaft is atZ3.10, not3.35. Heel support is at(X±1.435,Z4.65), not the C(X±1.485,Z4.10) stopping post.
- OUT retains its first curve and then uses the planned independent connector to(X±1.865,Z4.35), continuing toZ4.85. It does not use an offset of the tight terminal receiver curve.
- Each side has9 lower mounting stations, each with the same shaft/washer/nut parts.54 lower support parts plus8 retained save parts give62 appended attachment cylinders. ShaftY[-.18,.22], washer[-.152,-.14], nut[-.174,-.152], against board underside−.14. No former buried-foot claim is repeated.
- Bezier control points are those in manifest.json. Convex-control flatness subdivision uses.0005 maximum control-to-finite-chord distance; this bounds geometric approximation, not ball clearance. The terminal accepted samples are not simplified. Actual per-side segments:65 divider,1 inner,42 OUT, giving216 lower capsules.
- Printing follows the actual changed divider up to the receiver approach. The short label geometry and static cam crossing the OUT graphic are not presented as reference completion.

No value was swept or adjusted after assembly. No force, solver, automatic aim, hidden wall, ball reset, teleport or rescue was added.

## Actual assembled-object checks

`geometry-audit.json` records ordinary-engine assembly and real lower mesh-builder objects, without stepping physics. It uses WorkshopAssets/MechanicalFlipper geometry, not a diagram-only approximation. Label text is omitted in the component-only mesh check. Installed browser transforms/cameras/budget remain independent review tasks.

Assembly:1555 colliders,216 lower rail capsules,62 attachment cylinders, one retained cam hull.

- Actual mesh/contact mount centers agree within1.20849e−7; radius/full-height agree. Quaternion orientation discrepancy `1−abs(dot)` is at most6.28e−9.
- Rail capsule centers agree within2.36e−7 and rendered endpoint extents within2.23e−7. Their radius and physical full segment length agree. Rendered radial facets are inscribed in analytic capsules/cylinders, not identical continuous surfaces.
- Four construction joins (first divider/connector, receiver terminal, first outer/connector, outer/straight) each have two capsules with exactly the same endpoint. Closed radius.020 solids overlap at each join. This proves no disconnected endpoint at these stations, not smooth response or a qualified ball passage.
- Cam actual mesh10 vertices and hull10 vertices coincide. It remains the same static cam, not newly moving hardware.
-5880 sphere probes cover full-divider arc-length frames, IN offset−.205/OUT+.215 with±.050 offsets, five heights and rest/held bat poses. Floors/ball/sensors are excluded, open meshes queried as surfaces. Negative values remain in the JSON. The nominal normal-offset lines can fold at the tight receiver and extend into the heel/bat; they are NOT asserted natural center trajectories or an all-height clearance certificate.
- At unchanged wire-end X−1.72/Z3, the ground-height sphere has+.027 clearance to the nearest new lower shaft. Intermediate-height contact with the existing wire support remains in the record. This vertical column is not a descent trajectory.

## Mechanical failure inherited from accepted: rail through bat

This is a **real solid-part interference**, not merely the ball contacting a guide. It must be resolved before mechanical adoption, even though accepted has the same defect.

`baseline-bat-overlap.json` and `geometry-audit.json` use the same Rapier contactCollider query at actual rest/held poses, with no physics steps. The new mounting shafts are not among these overlaps. Each pose produces16 rail/bat overlap records across both sides:

| Pose | Accepted minimum | Candidate minimum |
|---|---:|---:|
|Rest|−.058009423315525055|−.058009423315525055|
|Held|−.05311974883079529|−.05311974883079529|

The offending heel stock is accepted X±1.285 versus candidate X±1.435, at the same offset+.035 from each outward pivot, Y.22. Candidate rest minimum contact is aroundX−1.47301/Y.22002/Z4.49098; held minimum aroundX−1.46810/Y.21982/Z4.41293 (left example). Full collider/segment centers, contact points, phase and side are preserved, rather than assigning the long last segment's center as the collision point.

`heel-mesh-overlap.png/.svg/.html` shows a labelled horizontal section atY.220 derived from actual visible triangle meshes. It identifies `continuous-moulded-rubber-belt`, `tapered-cast-bat-core` and `pivot-shaft`, not a generic rectangular bat outline. The rail crosses their actual visible solid regions. The blue core and dark rotating pivot shaft overlap the rail, in addition to the yellow rubber rim. Those names refer to bat parts; **pivot-shaft is not one of the new lower ground-support shafts**.

`baseline-mesh-sections.json` and `candidate-mesh-sections.json` preserve actual triangle-section loops, closure checks and.005-spaced heel-axis sample classifications. Endpoint stitching tolerance is1e−6. Samples demonstrate actual mesh intrusion; they do not compute a full3D intersection volume. Other parts are deliberately omitted in this labelled section; it is not an installed screenshot. No geometry was changed to make the picture clearer.

This overlap was revealed by the static comparison after implementing the specified old-relative receiver. The source is retained unchanged for the authorized short path diagnosis. A successful launch/capture result cannot turn this into a mechanical pass. No unrequested heel correction has been applied.

## Save scope and unfinished mechanism

The exact C frame remains atX−1.926172704/Z3.60, downstream axis(.572701790,0,.819763783), about34.94°. CamtopY.060 remains.020 above the floor. The local detector, genuine cam-contact requirement, fixed-axis rotation of the same speed12 earned impulse, charges/earn/tilt guards are unchanged. New lower downstream paths can still change its outcome; retesting is required.

The cam/rod are static, and the coil housing lacks a connecting bracket across its.029 lateral separation from the mounting studs. Moving actuation and this support/load path are incomplete. They are intentionally separate from this receiver diagnostic, not silently completed by the same retained impulse. Low-speed uncharged OUT and one-charge behavior remain explicit gates. A fixture-set charge is not a natural earning proof.

## Comparison gates, not claimed results

1. Preserve all static negatives and independently inspect installed45/10/top/mobile, lower wire receiver, both end supports, rail joins and the actual bat/rail overlap. Triangle budget stays500000. Full reference long-band fidelity remains unmet.
2. Accepted8849609 versus candidate natural.55/.65/.75/.85/.925/1 and weak.1 return/relaunch, unchanged controls.
3. Fixed relative OUT and IN starts, then all36 release30..70 step5 comparisons. Candidate IN±1.695/Y.18/Z3, vz3/spin0; accepted keeps its original relative start. Invalid starts are failures, not corrected by repositioning.
4. Compare quiet capture u/w, released u spread, actual bat pose/velocity, lastFlipperShot, exact observed coil timing, initial bat departure and both old end regions plus sling contact. Keep all outcomes, not only a successful timing. Old14/18 (left6/right8) is the coarse-family baseline, not full-game success or continuous aim certification.
5. Recheck OUT uncharged/one-charge, natural wire handoff, center save and central drain difficulty. Only if the geometric/mechanical/visual and path results justify it, proceed to natural54, continuous aim and full202. These are not run by this freeze/assembly work.

The actual dynamics and installed review will be reported separately. No adoption is implied by assembling or hashing this candidate.
