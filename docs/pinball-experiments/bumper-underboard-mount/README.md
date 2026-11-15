# Full-size bumper underboard mounting repair

This is a bounded structural repair to the stable game, independent of the rejected long-lane prototypes. It does not complete reference matching, the IN/OUT redesign, the side-save actuator, or bumper ball-contact geometry.

## Real geometry changed

The original pair of feet sat inside the plywood and were disconnected laterally from the central coil bracket. A continuous chamfered plate now occupies X[-.30,.30], Z[-.08,.18], Y[-.156,-.14], touching the actual board underside at-.14. The folded bracket ends at the plate underside; two modeled fillet welds connect it. Separate screw shanks enter the wood, while washers and hex heads seat beneath the plate.

Two radius.020 through-holes clear the existing radius.014 moving ring rods. A .070-wide by.160-long central through-slot clears the independent tilting skirt-switch stem and leaf. The first narrower draft slot was enlarged before acceptance to cover the directional motion envelope. No stroke, force, scoring, input, collision shape or above-board bumper geometry changed. This is actual support/fastener geometry rather than a printed detail. Dimensions and welds are visual fit estimates, not strength or manufacturing certification.

The current table installs three full-size bumpers. MINI_BUMPERS is empty; scaled standalone mini components are not certified for this mounting datum. The board's existing solid mesh does not yet model all mechanism bores; that inherited installation simplification remains. The existing bumper physics uses a full radius.40 cylinder while the visible skirt/ring/cap profiles differ; this repair does not resolve that inherited contact-envelope approximation.

## Verification and bounds

Final full pinball regression: **217/217 passed**, zero skipped; lint zero errors and the same three pre-existing CSS warnings. Five added tests cover the common mounting plane and material continuity, actual holes/washer seating, stem and leaf clearance at16 directions ×41 stroke times, fixed-plate versus moving-yoke separation, and both weld connections. The stem/leaf test conservatively projects every mesh vertex through the plate; it is not a structural stress solver or complete swept-triangle proof for all cabinet internals.

All three installed plates and weld pairs additionally clear every cabinet mesh bounding box, allowing only intended touching at the board plane. This conservative AABB screen does not certify every unrelated game part.

Natural54 produces exactly the same complete54 per-case records as the archived stable baseline:61 ramps,284 release stages,54 finished, zero stalls/live-position resets/zero-score games. Only components/bumper.mjs differs among runtime modules; physics and game sources are byte-identical. This audit preceded the final weld beads, which only add underboard mesh. The final full suite and browser captures cover the final welded model.

Desktop keyboard and390px CDP touch launch/flippers/pause/resume/restart pass; browser errors are empty. Installed desktop45 rendering changes450844→454132 triangles and685→688 draw calls, remaining below the existing500000-triangle gate. No phone GPU benchmark, physical-phone test or human playtest is claimed.

Standalone top/45/side/underside/moving views and installed45/10/90/mobile plus local underside views were captured. Selected images are included. Installed local views explicitly label cabinet inspection cutaway and added fill light; the board stays present while designated inspection panels are hidden. The regular installed/mobile screenshots use normal lighting. This underside repair does not visibly transform the reference's top-down composition.

## Reproduction

From repository root:

- `npm run test:pinball`
- `node scripts/pinball-playability-audit.mjs artifacts/pinball/bumper-replay-natural54.json`
- `PINBALL_REVIEW_OUT=artifacts/pinball/bumper-replay-component node scripts/pinball-component-review.cjs bumper`
- `node docs/pinball-experiments/bumper-underboard-mount/scripts/visual.cjs`
- `node docs/pinball-experiments/bumper-underboard-mount/scripts/input.cjs`
- `node docs/pinball-experiments/bumper-underboard-mount/scripts/installed-clearance.mjs`

The two archived browser scripts serve the exact frozen source map in payload/sources.json; baseline visuals use Git3568d1b. Their outputs go to artifacts/pinball/bumper-underboard-replay. Existing output filenames can be overwritten by those diagnostic scripts; choose a fresh output path if preserving a prior run. Scripts use already installed Playwright/Chrome, without installing dependencies.

Evidence includes source hashes, exact natural comparison, final full test/lint log, browser/input summaries and selected screenshots. Unrelated failed receiver geometry is recorded separately and is not merged into gameplay. Overall pinball remains unfinished.
