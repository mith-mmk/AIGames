# Stable four-bar closed rendering correction

Independent of the unadopted aa38 fat-mount contacts and61e4 stepped-mount redesign. Stable roof79d retained. Replace only four open8gon upperbar tubes with existing capsuleStockGeometry, original axesX[-1.875,-.625,.625,1.875],Y.23,Z[-5,-4.1],r.035/chrome unchanged. Original eight full-height r.055/Y.005..235 brass mount visuals remain exactly unchanged and still lack independent contacts. This change DOES NOT fix those mount surfaces.

Only playfield-parts.mjs and geometry-budget.test.mjs changed; no shared definition module, physics, sensors, forces, inputs, labels or support redesign. Four bars each16→192tri (+704 total). Budget450844/683 at45°,450700/671 at10°,444524/656 at top, below500k. Candidate initialized1380 publiccollider list byte-identical to accepted79d: SHA92de221466b0281dc4c8293eda57f84b49591cf8d8d5a9ad6fd527dbe3f86418. Seven candidate PNGs byte-identical to previously visually inspected aa38 rendering; aa38's contact additions are NOT included here. Closed ends and finer facets improve the representation of existing capsule contacts, not whole-layout reference completion.

Finitepolygon approximation remains:12gon bar side radial inset .035*(1-cos(pi/12))=.00119260 rather than8gon.00266422; capfacet residual scales withr and is nonzero. Exact analytical surface equality is not claimed. Bar ends overlap existing visible mounts as before.

New actual assembly regression builds WorkshopAssets and PinballPhysics, verifies four stocks against real collider poses/radii/halfheight, outward paired welded shells/genuszero,192tri each,1380 totalcolliders and all8unchanged fullheightbrass mountmeshes. Focused3/3PASS. Final full npm test EXIT0:208/208PASS,0fail/skips,141798.451ms. Lint0errors with3pre-existingCSSwarnings. Live production rerender7PNG files byte-identical to isolatedcandidate; actual1380publiccolliderhash unchanged. git diff --check clean.

Evidence artifacts/pinball/stable-bar-render-only-79d/. Source snapshots here; largeimages remain in artifacts. Mobile viewport is not a physicalphone; no humanplay claim. Parent ownscommit/push.
