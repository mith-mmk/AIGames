# Receiver-release: unadopted recovery packet

**Not adopted. Do not install this source as production.** Accepted baseline is884960985a413986d57aff0c2280e59a7be79dcf, including its render-only coincident-pole cleanup and202-test baseline. Candidate source is e8280a5a6a8cf1dcbb7aa570606ef4c2a0e8f2d9fd5bf7305315f2c7a8eb7e45. This packet preserves the one rejected source and evidence, not a corrected geometry.

## Outcome preserved

Natural six-power field entry and weak.1 same-ball return/relaunch are retained in the limited comparison. Relative OUT fixtures drain without an unearned activation; one initialized charge fires once on actual cam contact. All36 IN comparisons have positive initial clearance, capture and one coil, with no live reset.

The intended receiver-relative improvement is observed: held center-u returns to≈.3546, maximum matched pre-repress u difference versus accepted is.000141337 and actual shot aim difference≈.000170541rad. No new Y.02 throughboard-support contact is recorded in the first15ticks after coil. These are bounded measurements, not universal clearance or aiming qualification.

Yet observed Z<−1 outcomes remain **accepted14/18 (left6/right8) versus candidate10/18 (left4/right6)**, improving from earlier C3/18 without meeting accepted equivalence. Additional lost outcomes are35both,40right and60left. The receiver now emits approximately the old bat-relative shots, but translating them outward changes world-space encounters. The unchanged sling is hit first at35/40;60left turns near the opposite target, reaching minimumZ−.941059 rather than accepted−1.086753. Do not retune thresholds or omit failing delays.

Installed45 is487,288triangles, below unchanged500,000 (accepted449,612);10 is487,144, top480,968, page errors0. Budget success does not repair the widened local OUT/neck, short printed bands, staticcam across OUT text, unfinished coil support/actuation, or actual heel rail penetration into the bat. That inherited rail/bat overlap is identical in old/new: minimum−.058009423rest and−.053119749held. Actual installed cutaways and mesh-triangle sections identify rubber belt, cast core and rotating pivot shaft, not merely an invisible collider box.

**No candidate full202, natural54 controller suite, continuous aim, natural wire delivery, human-play or physical-phone qualification was run.** No new source/force/solver/timing search followed these results. Current production and original tests are unchanged.

## Small packet contents

- payload/: exact original build, prior-C substitutions/helper, receiver generator template, loader, manifest/dependencies, original freeze README/verifier, static audit/section scripts and small baseline-overlap result.
- restore.mjs: safe in-memory wrapper around the exact original build bytes.
- packet-manifest.json: pinned base, payload/generated/support hashes and the intended16-file recovery set.
- coarse-summary.json: **byte-preserved full36-row condensed inspector summary**, including actual pose, coil and relevant contacts. No rows are dropped.
- limited-diagnostics.md and independent-review.md: final technical findings. Internal routing wording is replaced by neutral source descriptions, with no numerical/result changes; original hashes remain in evidence-references.json.
- diagnostic-summary.json and static-summary.json: current disposition, progress and remaining failures. All static negative classes are counted and the original complete query files are hash referenced.
- design/: original pre-implementation README, dimension/projection JSON, small SVG drawing, calculation script and original manifest, byte-preserved. They are a **historical hypothesis**, not successful new trajectories. Current measured result takes precedence.
- diagnostics/: original observation scripts, accepted loader and manifest for provenance; recovery does not execute them.
- independent-evidence-manifest.json and evidence-references.json: original image, source-map and raw-result hashes/paths. Huge raw traces, source maps and raster images are not copied.
- verification.json: exact recovery, idempotence, refusal, physics assembly and temporary-output cleanup.

The original geometry audit JSON, detailed mesh sections/logs and heel PNG/SVG are omitted; their lightweight summary and original hashes remain. The source recovery set is exact for its16 listed files, **not a claim to restore every original screenshot/query artifact**. Source maps are regenerated from the pinned baseline rather than stored in this packet.

Original freeze README/manifest and design notes describe the earlier capture time, so pending gates in them do not override the final diagnostic reports or this unadopted status. Existing option-c departure supplements are separate and were not changed.

## Safe recovery

Run from repository root; the pinned git object and listed vendor files must exist. Verified with Node v26.7.0.

    node docs/pinball-experiments/receiver-release-unadopted/restore.mjs --verify-only
    node docs/pinball-experiments/receiver-release-unadopted/restore.mjs
    node docs/pinball-experiments/receiver-release-unadopted/restore.mjs --output artifacts/pinball/MY_DIRECT_CHILD

Default output is artifacts/pinball/receiver-release-recovered-8849609. The output must be a direct child of artifacts/pinball because the preserved loader relies on that depth. The original frozen directory is explicitly forbidden, even when its bytes match. Symlink/nondirectory ancestors, nonregular/symlink output files and any differing intended file are rejected before new writes. Identical existing files may be reused. New files use exclusive writes; a concurrent writer can still cause an abort after some new files, but no differing file is replaced.

--verify-only writes nothing. The wrapper validates payload/support/vendor hashes, redirects only the three original generator-input reads to archived bytes, presents the generator's known output names as absent, and captures its four writes in memory. It rejects unexpected reads/writes at the original artifact path. It checks all four generated hashes before optionally restoring anything. The generator itself is unchanged, including its own overwrite guard. The source reconstruction does not require the original experimental directory to be present.

Recovery restores16 exact original files: sources.json, baseline-sources.json, changes.json, manifest.json plus the12 listed archived files. It never writes production, tests, original frozen evidence or existing diagnostics.

Use only the recovered candidate loader for replay, without older experimental layers:

    node --import ./artifacts/pinball/receiver-release-recovered-8849609/loader.mjs YOUR_DIAGNOSTIC.mjs

The baseline comparison is the recovered baseline-sources.json from8849609. Its existing diagnostic loader is archived but retains its original path; do not run it in-place as if it targeted the recovered map.

Do not directly execute payload/build.mjs, payload/geometry-audit.mjs, payload/baseline-bat-overlap.mjs, payload/mesh-section.mjs, payload/verify-freeze.mjs or archived diagnostics. Their byte-preserved historical paths may refer to original directories and some omitted artifacts. Use this packet's restore --verify-only for recovery verification. The original dependency manifest intentionally retains all historical references.

Verification performs one recovered physics assembly, not a new launch/coarse/browser/full-regression run. Temporary restore/conflict/symlink fixtures are moved to Trash; original evidence is retained. Source, production and test expectations remain untouched.
