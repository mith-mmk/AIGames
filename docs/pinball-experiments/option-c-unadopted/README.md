# Option C early-curve study: unadopted recovery packet

**Not adopted. Do not install this source set as production.** Accepted runtime remains c1f7aeb. The one-candidate freeze was made at documentation HEAD1add1b7. This packet restores its exact bytes, not a corrected geometry or a new variant. Production, test expectations and the 500,000 triangle budget are unchanged.

## Why it stopped

C preserves all six ordinary first-launch field entries and the weak .1 same-ball return/relaunch. In explicit layout-relative fixtures, low-speed uncharged OUT paths drain on both sides, one initialized side-save charge fires exactly once, and held IN capture succeeds. These are useful limited improvements, not adoption gates by themselves.

The fixed coarse release/repress comparison contains **all36 results: 18 accepted and18 C**, delays30..70 in steps of5, left then right. Every initial gap is positive, every initial capture succeeds and every repress produces exactly one same-ball coil. Accepted reaches Z<−1 in14/18; C in3/18 (left30/40, right30). This is a materially sparser set of observed upfield routes, not proof that every possible timing fails or a measurement of continuous aim width. The few successful C samples do not replace the original control requirements. Full rows, first relevant contact evidence and exact order are retained in coarse-summary.json; coarse-findings.md explains the bounds.

Candidate delays30..55 encounter the new endpoint shaft. At the original45-tick release, the ball moves inward after that contact and reaches the unchanged sling region, then returns downstream. Delays60..70 fail without a recorded endpoint-shaft contact, so that single part is not a complete causal explanation. There was no removal replay, force change, hidden guide or new variant.

Independent installed rendering exceeds the unchanged500,000 limit: 501,688 triangles at45°, 501,544 at10°; top495,368. The improved parallel OUT relation does not resolve the short IN/OUT printed bands or the left cam crossing the OUT marking. The cam/rod are static while an earned impulse acts; moving actuation is not modeled. The coil housing and studs also lack a bridging bracket across their .029 lateral gap. This is unfinished mechanical support/actuation, not a finished plunger.

**Full198 regression, natural54 controller suite and continuous aiming qualification were not run.** Natural wire delivery, physical-phone/human play, all low-speed approach families and manufacturing-level joint/load-path verification remain unqualified. No full test sweep is claimed.

## Scope and preserved evidence

This C keeps the board, shooter, upper roof/rollovers, ramp/nose, wire, broad sling and same bat length. Pivots move outward to±1.40 at old Z4.45, increasing the same-bat projected center gap by.300. Shared early lower curves, lower mounting stock and the complete fixed save frame are the candidate changes. The rejected +.90 board extension was never turned into source. The source map has33 original modules byte-identical to c1 and three changed original modules plus one virtual helper.

- payload/: byte-exact original build/helper/layout generator/loader, manifest/dependencies, historical README, static audit script/result and verifier.
- restore.mjs: safe wrapper around the original build bytes. It redirects only the two archived generator input reads and captures all four output files in memory; no geometry code is rewritten.
- packet-manifest.json: pinned base, payload/generated hashes, expected restored files and packet-support hashes.
- diagnostic-summary.json: current disposition and bounded results. local-summary.json is the byte-preserved local-fixture summary.
- coarse-summary.json and coarse-findings.md: byte-preserved complete36-row condensed evidence and interpretation.
- independent-review.md: technical review, with one internal-routing sentence replaced by a source-neutral description; all findings retained. Original report hash is in evidence-references.json.
- diagnostics/: byte-preserved historical launch/lane/coarse runners and offline summarizer for provenance. These keep their old paths and are **not executed by recovery**.
- evidence-references.json: paths, byte counts and hashes for omitted large source snapshots, full traces and screenshots. No images or large raw traces are bundled.
- verification.json: reconstruction, idempotence, conflict/symlink refusal, assembly and cleanup results.

The payload README/manifest/audit and independent review describe their original capture times. Their pending gates do not override the later local/coarse results or this unadopted disposition. Static route samples are not trajectory certification. The133KB static audit is retained in full so its negative samples are not replaced by a favorable center-line summary.

## Safe recovery

Run from the repository root with the c1f7aeb git object and listed vendor files present (verified with Node v26.7.0):

    node docs/pinball-experiments/option-c-unadopted/restore.mjs --verify-only
    node docs/pinball-experiments/option-c-unadopted/restore.mjs
    node docs/pinball-experiments/option-c-unadopted/restore.mjs --output artifacts/pinball/MY_DIRECT_CHILD

Default output: artifacts/pinball/option-c-recovered-1add1b7. Output must be a direct child of artifacts/pinball because the original loader uses that depth. The original frozen artifact directory is forbidden even when matching. Symlink or nondirectory ancestors and nonregular/symlink output files are rejected. Every existing intended file must be byte-identical before any write starts. Differing content aborts without replacement. New files use exclusive writes; a concurrent creator can cause an abort after some new files, but no differing file is replaced.

--verify-only writes nothing. Recovery checks the original build/payload/vendor/support hashes, executes the byte-preserved synchronous build under the in-memory capture wrapper, and verifies all generated hashes before writing any requested output. It restores all13 original artifact files exactly. It does not touch production, tests, existing frozen artifacts or diagnostic traces.

Use only the recovered loader for source replay, without older experimental loaders:

    node --import ./artifacts/pinball/option-c-recovered-1add1b7/loader.mjs YOUR_DIAGNOSTIC.mjs

Do not directly execute payload/build.mjs, payload/geometry-audit.mjs, payload/verify-freeze.mjs or the archived diagnostics in place. Their byte-preserved historical paths refer to the original directories. The original dependency/verifier files retain those paths for provenance; use this packet's restore --verify-only to verify recovery. Browser replay must serve the exact source-map strings, including the virtual web/js/pinball/lower-c-study.mjs module; copying them to production is not part of recovery.

Recovery verification includes one physics assembly, not gameplay acceptance. No launch/coarse/browser/full-regression rerun is performed during packaging. Temporary restore/conflict/symlink fixtures are moved to Trash after verification; original evidence remains intact.
