# Capture, release and departure: saved36-case analysis

No physics rerun or shape change. departure-analysis.mjs reads the complete coarse traces and outputs all36 comparisons. Bat angles are reconstructed from the unchanged input schedule and source rates(.035 release/.10 rise each tick), not measured transforms. Local u is sphere-center along bat, w is perpendicular in its XZ plane, y relative to pivotY.27. These are not surface contact coordinates. The raw source aim variable is separately `(pivotX−abs(ballX))/1.14`, clamped; it is not bat-local u.

## Why C60–70 return early

The previous shaft summary selected ONLY the heel shaft atZ4.10. C60–70 miss that shaft and the sling region, but contact a DIFFERENT obstruction: retained IN inner rail endpoint atX±1.35/Z3.35 and its newly added through-board shaft. Thus “no shaft contact” without the Z4.10 qualifier would be incorrect.

Example left65: repress264 p(−1.32097,.17114,4.21527),v(−1.49544,−.00031,−21.61206). Tick265 no bat contact; the ball travels upstream/outward. At269, p(−1.37182,.17118,3.48476),v(−1.46780,0,−20.92171), actual manifolds include shaft(−1.35,.02,3.35) and retained rail(center−1.35,.22,3.05, extending to3.35). Tick270 v(−4.27305,0,+6.25816). The first return is at this endpoint, before the sling. C60/70 have analogous endpoint contacts and downstream vz about+6.00/+5.62 (left); mirrored right results are retained in JSON. At60/65 endpoint contact occurs5ticks after repress;70 occurs4ticks after. This is not insufficient initial coil speed or absence of a strike. Recorded contact normal impulses may be zero: exact CCD/substep impulse attribution remains unavailable.

Removing only the Z4.10 shaft cannot solve this branch. Moving only the Z3.35 shaft is also not demonstrated sufficient because the retained rail has a coincident endpoint in the same sphere corridor. No part-removal counterfactual was performed.

## Release geometry differs before any downstream collision

Held capture center-u: accepted≈.3546; C≈.2137. Both have actual bat contact; C additionally touches the heel shaft. Following release, accepted rolls toward increasing u along the rest bat. C remains around the heel's rounded rear-side contact, with sphere-center u negative at later delays. Negative u alone is not illegal penetration: the sphere center may extend behind the pivot while touching finite rounded stock.

Representative left side, immediately before repress:

|Delay|Accepted local u / w|C local u / w|Accepted source along|C source along|
|---:|---|---|---:|---:|
|45|.12248 /−.27058|−.06608 /−.22808|.22269|.06513|
|50|.15884 /−.26854|−.06565 /−.22914|.24800|.06597|
|55|.19897 /−.26625|−.06482 /−.23017|.27592|.06707|
|60|.24284 /−.26373|−.06365 /−.23122|.30644|.06844|
|65|.29044 /−.26098|−.06216 /−.23236|.33954|.07009|
|70|.34174 /−.25801|−.06036 /−.23361|.37521|.07200|

During60→70, accepted prestrike center moves X−.90066→−.82226/Z4.36946→4.43002; C barely moves X−1.32197→−1.31792/Z4.22322→4.22311. Same input interval therefore produces a substantially narrower contact-position variation in C, not the old continuous roll along the bat. Right side mirrors this to small numerical differences.

At first repress step60–70, accepted left vx+9.09..+12.92, vz−26.18..−26.52 (inward); C left vx−1.55..−1.43, vz−21.57..−21.66 (outward), with mirrored signs right. This follows unchanged position-dependent strike logic acting on different capture/release positions. Source computes aim from current position and face angle, so a pivot translation with an apparently successful held capture does not preserve aim. No force change is needed to explain different intended impulse directions. Exact intra-step lastFlipperShot/coil timestamp was not saved, so these are observed poststep launch velocities, not a reconstruction of every impulse. All cases have final coil count1; at60–70 the large upward speed change and bat manifold occur on repress step, then bat-free step follows.

## Required geometry for the next design (not guaranteed thresholds)

1. Capture must place the sphere on a useful part of the bat AND allow release to roll through a range of contact positions. Quiet near a rounded heel is not by itself a useful aiming cradle. Preserve a measured spread of actual contact states rather than tuning an input delay.
2. The sphere swept from the actual strike states must clear both the heel support and the retained inner rail/end shaft, including finite caps and the subsequent sling. C's strong upstream shot atX≈±1.37 directly intercepts the X±1.35 endpoint. Relocating one support alone leaves rail interference and the narrower release-position distribution unresolved.
3. Validate the integrated capture→release→strike route with unchanged controls/forces on both sides; compare all timings, including C30/40 useful upfield cases. The present coarse family does not prove a continuous aiming width, natural reachability or universal safe u/velocity bounds.

No additional observation is necessary to identify this endpoint branch and compressed release-position distribution. If exact impulse causality is later required, the smallest additional observation would log existing `lastFlipperShot`, bat pose/angular speed and coil counter each tick in the SAME prescribed family, without changing state or geometry. That is proposed only, not run. Existing visible/mechanical/budget failures still preclude adoption.
