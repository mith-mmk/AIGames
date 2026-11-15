# Continuous floor ribbon: isolated 94ea51 print revision

Source SHA256 8b3e8f5625cb124ac63f2ed873cee017603f3e76717cb16f1975b638c901b3fa. Only playfield-parts.mjs changes from frozen94ea51. The prior wedge-shaped full-width trial is preserved separately at whole-long-lane-ink-94ea51. Stable8849609 and production are unchanged.

## Visual outcome

The narrow continuous ribbon removes the prior abrupt IN width expansion. Installed45/top show the long route more clearly; closeup IN/OUT words are downstream of the wire and separate from SAVE/lamp/cam. The cam naturally occludes the OUT ink. No geometry is hidden, no depth override or forced foreground text is used. Mobile390 still has very small words, and10° is physically occluded by mechanisms. This is a local graphic improvement, not completed readability or reference fidelity. Large bats, exposed crosshead row, wide outer empty space and static-save deficiencies are unchanged. Do not infer adoption from this artifact.

## Exact print scope

Width .160 in horizontal table-X sections. IN follows the actual divider X minus .205, avoiding the midpoint discontinuity when the physical inner rail starts/ends. OUT follows the median of actual divider/outer surface X bounds, including the actual right shooter-inner straight segment before the lower outer begins. Printed endpoints: startZ1.35 for all, IN end3.95, OUT end4.55. Words at IN3.58 and OUT4.10. Existing lamp/cam cover only the blank OUT band, not its word. The ribbon is constant horizontal width, not an assertion of constant normal width.

The actual inner rail ends3.20; below it the IN print is in an open receiving region, not between two new rails. Upper IN is checked against the conservative measured sling envelope X1.951968. No imaginary collision boundary is introduced. Any continuous physical feed qualification remains separate.

boundary-audit.json checks both edges of the actual64-strip polyline against finite neighboring plan-projected rail segments/radii and the conservative upper sling envelope. Sample-spacing-subtracted edge-distance lower bounds: IN both sides .0466398; left OUT .1142403; right OUT .1117520. These are distances of ink edges, NOT ball clearance, all-object clearance, a certified safe route, or visible load-path completeness. The audit uses no ball injection or simulation.

## Unchanged physics and budget

1581 initialized collider records (handles, transforms, shapes, sensor flag, friction/restitution) are byte-identical to94ea51: SHA256 4b7dc43b898f4e1848ba2e81fb8e95aca55efd6377609bf90cd00c625fde59f2. Physics/forces/shared physical geometry and all other source-map modules are byte-identical. No natural play/full regression was run.

45°493232tri/563calls;10°493088/551;top486912/536. Relative94ea: +120tri/−6calls at each sampled view;6768tri reserve under500k. Pageerrors0. Paired baseline/candidate images in preview-final include45/10/top/mobile/closeup plus side/underside. Chrome viewport testing is not a physical-phone or human-play test. The source runner retains an inherited94ea candidate label in code; evidence.json is explicitly annotated with the actual new source hash, also recorded in this README and manifest. Browser/server exited normally.

Reproduction: node artifacts/pinball/whole-long-lane-ribbon-94ea51/visual.cjs; node .../physics-check.cjs; node .../boundary-audit.mjs from repo root. Preserve existing output before rerunning. review-manifest.json hashes source maps, scripts, measurements and images. No commit or permanent test changes.
