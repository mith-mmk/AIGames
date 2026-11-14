# Upper-inlet return study: rejected recovery packet

**Not adopted. Do not install this source set as production.** Accepted runtime stays at c1f7aeb. The source freeze was made at documentation HEAD 3989bfe. This packet recovers the exact rejected artifact; it is not a fix or an authorization to redesign it.

## Why it stopped

Ordinary-engine natural launches at .55/.65/.75/.925/1 returned the same ball to the shooter, scored 0, had no rollover-bar contact, and never reached the field. Only .85 entered the field and scored 25 (accepted: 525). Accepted c1 entered the field at all six powers. The true weak .1 return, relative stop and in-place relaunch still work, but do not excuse these normal-power regressions. One return alone does not prove a permanent loop. Detailed connector/roof contact-cause diagnosis was still pending at this packet snapshot; do not attribute a particular cause from minZ alone.

Independent installed views reject the outboard case as a flat blue wedge that obscures the outer rail, with a sharp front and abrupt backing join. Exact visible/trimesh correspondence does not make the result reference-like or dynamically safe. The genuine underside shaft/washer/nut extents improve on the earlier buried-foot error, but remain simplified game geometry.

The initial 1,025 ground-spine samples had minimum gap +.002747 and a model-specific lower bound +.001934. These are NOT all-height, finite-channel, seam or natural-play certification. Natural launch failure supersedes any suggestion of viability from that narrow spine. No full regression or extra geometry/force search followed this gate.

## Scope preserved

This is upper-only, with the board/shooter/right-support changes needed to connect an outer straight shooter (axis 2.93) back to the accepted exit (axis 2.53). The frozen source uses two R1.70 arcs across z -2.30..-3.90; accepted roof, all rollover bars/sensors and graphics stay fixed. Lower guides, broad slings, bats, wire and kickback stay accepted.

payload/lower-design.md is an **unimplemented separate design constraint note**, not a second candidate. It records the earlier abrupt IN convergence, OUT fan, failed capture, exterior-drain coupling and support limitations. No IN repair or capture success is claimed. payload/README.md is the original pre-review study note, preserved byte-for-byte, so its “pending” status describes that historical freeze, not current acceptance. Current verdict is this file and diagnostic-summary.json.

## Contents

- payload/: exact original build, helper, loader, manifest, dependency manifest, original README, lower design and static-spine script/result.
- restore.mjs: safe wrapper around the original build bytes; no rewritten geometry generator.
- packet-manifest.json: pinned base commit, original/generated/payload hashes and support hashes.
- diagnostic-summary.json: small first-launch snapshot. A later contact-cause result may be added separately; preserve this snapshot and frozen payload.
- independent-review.md: exact independent review at packet creation.
- evidence-references.json: hashes/paths to omitted raw traces, source snapshots and images.
- verification.json: recovery/idempotence/conflict/provenance checks.

Large sources.json, baseline-sources.json, images, videos and full traces are deliberately excluded. Node v26.7.0 was used. The base c1f7aeb commit and listed local vendor files must exist in the repository.

## Safe recovery

Run at the repository root:

    node docs/pinball-experiments/upper-inlet-unadopted/restore.mjs --verify-only
    node docs/pinball-experiments/upper-inlet-unadopted/restore.mjs
    node docs/pinball-experiments/upper-inlet-unadopted/restore.mjs --output artifacts/pinball/MY_DIRECT_CHILD

Default output is artifacts/pinball/upper-inlet-recovered-3989bfe. Output must be a direct child of artifacts/pinball because the byte-preserved loader imports from that depth. The original frozen artifact directory is explicitly forbidden. Symlink/nondirectory output ancestors and symlink output files are rejected. All existing intended files must be byte-identical before any write begins; differing content aborts without replacement. New writes are exclusive (wx), never overwrite. A concurrent writer can still cause an abort after some new files were created, but no differing file is replaced.

The wrapper checks base, payload and vendor hashes, intercepts the original synchronous build writes into memory and verifies all four generated hashes before optional restoration. It restores all twelve original artifact files, including the unchanged lower-design note. It never writes production or modifies tests. --verify-only creates nothing.

Only the recovered loader should be used via node --import for source replay. Do NOT directly run payload/build.mjs or payload/static-spine.mjs: their unchanged historical paths target the original artifact. The static script is archived for provenance, not invoked by recovery. The preserved original study/dependency manifests intentionally retain historical paths and status.

Recovery verifies bytes and one physics assembly, not gameplay acceptance. No browser, six-power or full regression rerun is part of this packet. Temporary restore fixtures were moved to Trash after verification; the rejected frozen artifact remains intact.


Later supplement: reversal-findings.md records the single .925 contact-classification replay. reversal-evidence.json hashes the omitted detailed observations. This does not replace the frozen initial diagnostic snapshot or isolate path versus cross-section causality.
