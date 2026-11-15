# Stable roof render/contact representation correction

Stable 0b75 runtime + docs e283fc7 baseline. Independent of unadopted whole-layout / upper-lane prototypes.

Only assets.mjs roof rendering changes: same four axis endpoints, radius .06, chrome material, three physical capsules. Replace three open 8-sided tubes (48 triangles) with existing shared capsuleStockGeometry, one mesh containing three closed 12-sided capsules (576 triangles). No collision, input, force, sensor, route or gameplay change.

Installed45: 449612 -> 450140 triangles; 685 -> 683 calls. Under 500k. All 1380 initialized public collider records are byte-identical: SHA256 92de221466b0281dc4c8293eda57f84b49591cf8d8d5a9ad6fd527dbe3f86418. Actual live production rerender matches all seven reviewed artifact candidate PNGs byte-for-byte (45/10/top/mobile390/lower closeup/side/underside). Roof isolated top/side show closed rounded ends; backing retained. Whole installed views hide no components. Reference image reviewed; no whole-layout completion claim.

Residual polygon approximation: r.06 8-gon side inset .004567228 -> 12-gon .002044450; cap triangular facet inward error up to .003085591; vertex radial error <=2.42e-7. These describe individual capsule surfaces, not exposed union error. Render is closer to existing analytical contacts, not mathematically identical. Existing joint/capsule overlap and mechanical construction remain unchanged.

Regression added to geometry-budget.test.mjs calls actual WorkshopAssets.build (only Canvas API mocked), finds the installed roof, checks three primitive ranges, shared chrome, 576 triangle contract, fixed original axis/radius, outward triangles, paired welded edges and genus-zero closure for each stock. Focused 2/2 passed. Pre-integration artifact full npm test: 206/206, zero failures/skips, lint zero errors (three pre-existing CSS warnings). Final production full npm test completed: 207/207 pass, 0 fail/skipped, 140623.068 ms, process exit 0; lint zero errors, same three CSS warnings. git diff --check clean.

Evidence: artifacts/pinball/stable-roof-capsule-e283fc7/. Source snapshots and image/log hashes are preserved here; large images stay in artifacts. Production rerender uses actual filesystem files, not the substituted artifact map. Browser viewport only, no physical mobile device/human qualification. Parent owns commit/push.
