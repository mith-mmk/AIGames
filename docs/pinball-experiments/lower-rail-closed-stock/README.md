# Closed lower rail stock, unchanged physics

Bounded rendering repair against stable172b821. This does not complete the long IN/OUT layout, physical side-save, ramp/receiver design, or reference-likeness requirements.

## Implemented change

The existing lower guides consist of104 physical capsule segments in six paths. Their old rendering used104 open straight TubeGeometry meshes. The new rendering uses the same established capsule-stock generator as the ramp and upper rollover bars, with the unchanged guide paths and radius. It includes closed rounded ends and merges geometry per path into six meshes. All original base washers, stems and collars remain. No layout, collider, material, game rule, input or actuator change is made.

Each constituent capsule is a closed shell. This is not a Boolean-unioned, manufacturing-ready tube: neighboring shells overlap at bends just as existing physical capsules do. The12-sided radial/4-cap tessellation is inscribed inside the analytic collider. Tests match axes, radius and ends, verify outward closed topology for all104 shells and sample facet-centroid inset below.00106. That sampled inset is not a universal error bound. Existing accessible mounting collars without complete contact counterparts and the heel/rail relationship are not repaired here.

## Visual and budget review

Installed45/10/90 degree views,390px mobile view and left-top/left-end/right-end closeups were captured with normal lighting and no hidden geometry. The previous visibly cut/open end is now rounded and closed. The narrow tube remains faceted at close range, and existing mounts are unchanged.

Installed45 triangles465844→484148, below the unchanged500000 gate. Draw calls698→600. The reduction comes from104→6 rail meshes, not omitted supports. The exact triangle addition is18304, from1664 old tube triangles to19968 capsule triangles. Draw-call reduction alone is not proof of faster frames on phones.

Compared with the ROBOBUDDY reference, the short diagonal receivers, broad circular collars, exposed save housing, lower proportions and major mechanical styling still differ. This local closure repair is not presented as solving those composition/structure issues.

## Evidence and limits

Verification results are recorded in evidence/. Runtime source map is payload/sources.json (SHA25682471d0b5280ad7b08246e17fff57a82966a12fe48a80107b156f034cd1a7fc2). Only playfield-parts.mjs differs among runtime modules from172b821.

The first full suite was interrupted on a storage-full incident. The first natural54 run reached output writing but failed withENOSPC, so it supplies no usable result. These are not counted as successes. Resumed runs use new filenames: full pinball suite224/224 passed with no skips; lint has zero errors and the same3 CSS warnings. All54 complete natural-input records and summary exactly match the adopted baseline:61 ramps,284 release-stage entries,54 finished, zero stalls/live resets/zero-score games. This establishes repeatability for the fixed controller, not human difficulty or a universal continuous timing guarantee. Images copied as zero bytes during the incident were replaced from verified original captures.

Desktop keyboard and390px CDP touch launch/flippers/pause/resume/restart passed against the frozen source map; browser errors were empty. This is scripted browser input, not human play or a physical smartphone. No device-GPU timing, manufacturing/strength certification or new side-save actuator validation is claimed.

## Reproduce

From the repository root:

- `npm run test:pinball`
- `node --test web/js/pinball/lower-rail-stock.test.mjs`
- `node scripts/pinball-playability-audit.mjs artifacts/pinball/lower-rail-replay-natural54.json`
- `node docs/pinball-experiments/lower-rail-closed-stock/scripts/visual.cjs`
- `node docs/pinball-experiments/lower-rail-closed-stock/scripts/input.cjs`

Browser scripts use the frozen source map and Git172b821 baseline. Outputs go to artifacts/pinball/lower-rail-closed-replay; preserve earlier outputs or select a new output directory before repeating. Existing Chrome/Playwright is used without installation. Overall pinball remains unfinished.
