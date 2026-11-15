# Stable OUT arrow direction correction

Baseline: accepted8849609. Change: only OUT canvas-arrow Y values reflect as295−Y inside the existing100..195 bounds. IN, lettering, label position/size, mesh geometry, collision, controls, forces and materials are unchanged. No whole-layout/ribbon prototype is included. Source and test snapshots plus source.patch are retained here; commit is parent-owned.

## Regression and independent negative control

Full npm test exited0. Pinball206/206 passed (previous202 plus four direction tests), fail0/skip0,143566ms. ESLint0errors; existing pinball CSS warnings3 remain. Tests invoke the actual laneInsert drawing method, capture actual canvas arrow vertices, interpolate through actual mesh UV triangles, and transform into table coordinates for both sides of IN/OUT. They assert IN−Z/OUT+Z and unchanged arrow bounds. Running the new test with the original8849609 module fails only the two OUT direction cases: old OUT tableZ−.2495102. Thus the test rejects the real old defect instead of merely reproducing the correction formula.

## Images, physics and budget

The paired installed45/10/top/mobile390/closeup images were inspected. OUT now points downstream; IN remains upstream. Pixel differences are confined to the arrow vicinity:45°456pixels,10°234,top379,mobile266,closeup809; side/underside0. These are exact image difference counts, not performance timings. Existing left mechanism occlusion remains; no part was hidden or moved.

1380 initialized collider records (handles, transforms, shapes, sensor flags, friction and restitution) are byte-identical. SHA25692de221466b0281dc4c8293eda57f84b49591cf8d8d5a9ad6fd527dbe3f86418. Physics source was not changed. Render budget identical:45°449612tri/685calls,10°449468/673,top443292/658. Pageerrors0. Browser initialization used disabled animation/manual render; no extra natural trial was run. Full existing physics tests are included in npm test. Chrome viewport evidence does not claim physical-phone or human-play verification.

Evidence directory: artifacts/pinball/stable-out-arrow-8849609/. Contains npm-test.log, focused.log, old-source-negative.log/loader, visual.cjs/log, physics-check.cjs/log, pixel-diff.cjs/json and14 paired PNGs. Manifest records hashes rather than copying large images into docs. An optional Python pixel-diff attempt found Pillow unavailable; the available browser Canvas implementation generated the recorded successful comparison without installing anything. Browsers/servers exited normally.

Reproduce: npm test; node --test web/js/pinball/lane-ink.test.mjs; node --import ./artifacts/pinball/stable-out-arrow-8849609/old-source-negative.mjs --test web/js/pinball/lane-ink.test.mjs (expected exit1/two OUT failures); node artifacts/pinball/stable-out-arrow-8849609/visual.cjs and physics-check.cjs; node .../pixel-diff.cjs. Preserve artifact outputs before rerunning. Snapshot browser scripts serve the recorded production-module bytes; compare their hashes with the checked-in module before treating a later run as current-source evidence.
