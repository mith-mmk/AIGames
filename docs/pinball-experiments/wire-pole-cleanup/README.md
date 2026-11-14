# Wire-stock pole index cleanup

A render-only improvement on accepted c1 gameplay, independently separated from rejected C layout/mechanism work. Reviewed working-tree base:16e7e131699be6507dab5d306d6b45bdc1ad03fc. Parent owns commit/push. No collision, force, route, input, material, resolution or component omission changes.

## Exact scope

Production files: web/js/pinball/wire-stock.mjs and wire-stock.test.mjs. The renderer previously submitted216triangles per capsule. Only known pole-band triangles with two exactly identical transformed Float32 positions are omitted. Distinct pole samples and every nonpole face are retained, including nonpole degeneracy caused by extreme-coordinate rounding. This is not a general epsilon-based simplifier.

For installed4×116capsules,24zero-area pole triangles each are removed:100224−11136=89088. The original count assertion100224 fails on the artifact as preserved in its original-wire-test.log; production assertion89088 records this derivation. No geometric tolerance is loosened. Positions/normals and all retained faces/order remain identical. Primitive vertex ranges are unchanged; index ranges remain contiguous and correctly bounded.

Four added tests cover installed nondegenerate-face/attribute identity, closed outward per-capsule boundaries, distinct-pole fallback and normal nonpole preservation, and empty/mixed primitive range contracts. Existing installed-contact and compatibility buildVisualRamp tests remain. Each installed capsule is closed/outward after removal; overlapping capsules are not claimed to be a single union manifold.

## Final production validation

- npm test: exit0; pinball202/202 (198existing+4added),0fail/skip/cancel,138852.234167ms. Other repository stages also completed. ESLint0errors;3existing pinball CSS baseline warnings. Full log npm-test.txt.
- Focused wire6/6 plus targeted lint passed; focused-test.txt.
- Actual production browser source was read directly from the checkout, not served from the proposal map. Accepted c1 versus production45,10,top,390×844mobile and1200×900close-up images all had0changed pixels /0channel delta; image-diff.json. Metal close-up also visually inspected.
- Actual45 render460748→449612triangles,685calls unchanged.10:460604→449468/673;top454428→443292/658. Page errors0.
- All1380initial collider descriptions (shape arrays, poses, rotations, handles, sensor/material values) have the same SHA256 before/after:8acca4860d3876fb8dbe174c4b9cad08055f6769fe155615a0c0b21740af9abe. colliders.json.
- git diff --check passes. No build or new natural-game sweep run by this worker; parent handles any additional release gates. Physical-phone/human-play validation remains unperformed. This is a rendering optimization, not completion of reference/layout/contact objectives.

## Recovery and evidence

wire-stock.mjs.txt and wire-stock.test.mjs.txt are exact final source snapshots. manifest.json hashes them and the compact verification files. Large screenshots, raw artifact runs and render scripts remain in artifacts/pinball/accepted-wire-poles-1add1b7/. production-preview/ contains actual production images and served source snapshot; production-visual.log and production-image-diff.json retain measurements. The prior C render-only result remains separately under option-c-render-poles-1add1b7/ and is not production geometry.

Recheck: node --test web/js/pinball/wire-stock.test.mjs; npm test. Browser comparison: node artifacts/pinball/accepted-wire-poles-1add1b7/production-visual.cjs followed by production-image-diff.cjs. Those scripts write only their artifact evidence. No package installation, temporary build/video, retained server or browser. No commits by this worker.
