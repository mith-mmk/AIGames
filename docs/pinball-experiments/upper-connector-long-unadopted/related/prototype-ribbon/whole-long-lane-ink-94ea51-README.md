# 94ea51 floor-ink-only trial

Not adopted / recommendation: retain the existing print until a better readable layout is designed. Production, stable8849609, and frozen94ea51 sources were not modified. Only playfield-parts.mjs differs in this separate source map. The lower-c-study, geometry, physics, forces and all other modules are byte-identical. No simulation/launch was run. No structure is hidden and normal depth testing remains enabled.

## Visible result

Paired 45°, 10°, top, mobile390 and closeup (plus side/underside) images are in preview-final. Lower lettering is more exposed below the left wire and does not overlap the cam, SAVE text or lamp in the inspected views. However the IN band has a visible angular width transition where the conservative sling envelope changes to the actual inner rail. Mobile lettering remains small, low-angle visibility is still occluded by real mechanisms, and the OUT band changes width as the actual boundaries diverge. This does not reproduce the reference's clean long lane treatment sufficiently to recommend adoption. Broad board, large bats, exposed crossheads and outer empty areas are unchanged. No geometry was concealed to improve the comparison.

## Construction and bounds

The floor band samples actual divider/inner/outer polyline horizontal sections, subtracts each rail radius, then applies a .035 inward print margin per side. Where no upper IN inner rail exists, it uses the conservative measured actual sling outer envelope X1.951968, explicitly not an invented physical guide. Right upper OUT uses the actual straight shooter inner axis2.75/r.045 when the lower outer polyline has not begun. Thus this is a boundary-derived print, not a constant offset continuation after the OUT branch. It is not a proof of spherical clearance or a continuous physical IN boundary.

All bands start Z1.35. IN ends3.18; left OUT ends3.04 to leave the SAVE/lamp/cam region clear; right OUT ends3.40. Label anchors: IN3.00, left OUT2.88, right OUT3.05. Horizontal sections create the visible IN transition noted above. They are deliberately not smoothed by inventing a new path. The saved initial-uv source and preview-initial-uv preserve a first diagnostic texture-orientation error; final source corrects UV and text orientation only.

## Verification

Final45 is493232 triangles/563calls, compared with94ea493112/569 (+120tri, −6calls), leaving6768tri under500000. Final10 is493088/551; top486912/536. Page errors0. Public collider list including handles, transforms, shapes, sensors, friction and restitution is byte-identical, SHA256 4b7dc43b898f4e1848ba2e81fb8e95aca55efd6377609bf90cd00c625fde59f2. See physics-check/*.json and review-summary.json. Physics module and all nonprint modules are unchanged. This is static initialization evidence, not deterministic gameplay or full regression qualification.

Browser/server processes exited normally. Chrome viewport mobile only; physical phone/human play untested. No adoption, source commit or test expectation changes. review-manifest.json preserves source/scripts and image hashes. visual.cjs reruns the comparison into preview-final; preserve existing output before rerunning.
