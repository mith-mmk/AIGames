# Rejected integrated lane-entry recovery packet

**Not adopted. Production remains accepted c1f7aeba28e9fb55117fa0fedbc975f5e8e72d84.** This packet preserves a failed artifact candidate, not a safe layout or a proposal to apply it. No production imports, tests, forces, inputs or vendor bytes are changed.

## Preserved contents

- payload/build.mjs, study-helper.mjs, loader.mjs: exact frozen bytes, including the defective mounts.
- payload/manifest.json and dependencies.json: original source/dimension and dependency records. Their older "unqualified" wording is historical; the disposition is now rejected.
- packet-manifest.json: payload hashes and the four expected generated-file hashes.
- restore.mjs: executes the original build unchanged with synchronous writes captured in memory, verifies every generated hash, then optionally saves to a separate artifact directory.
- diagnostic-summary.json and independent-summary.json: compact observed results.
- evidence-references.json: hashes and paths for omitted traces, images and reports. Large sources JSON, traces, images and engine binaries are not in this packet.

## Restore safely

Run from repository root with Git history containing the pinned c1 commit. Node with synchronous registerHooks is needed (tested Node26.7.0); no package installation or network call is required. Existing tracked Three0.180.0 and ordinary Rapier0.17.3 dependency hashes are checked.

```sh
node docs/pinball-experiments/lane-entry-unadopted/restore.mjs --verify-only
node docs/pinball-experiments/lane-entry-unadopted/restore.mjs
# Or choose another direct child of artifacts/pinball:
node docs/pinball-experiments/lane-entry-unadopted/restore.mjs --output artifacts/pinball/lane-entry-review-copy
```

Default output is artifacts/pinball/lane-entry-recovered-a4d4ad7, NOT the original frozen artifact. Existing equal files are reused; any differing file stops the whole preflight before writes. New writes use exclusive creation, never overwrite. Symlink output paths are rejected. The fixed depth is required by the original loader's relative repository-root calculation.

Do not run payload/build.mjs directly: its archived output path is the original artifact directory. The wrapper is the safe entry point. It uses the archived helper and ordinary Git reads; it intercepts all original build writeFileSync/mkdirSync calls and checks their destinations. Frozen build bytes are not rewritten or eval-patched.

To load the recovered candidate for diagnosis only:

```sh
node --import ./artifacts/pinball/lane-entry-recovered-a4d4ad7/loader.mjs YOUR_DIAGNOSTIC.mjs
```

Use this loader alone. No R1.5, deterministic-engine, prism or older widening layer. Restoring source does not adopt it. Hash equality is preservation evidence, not gameplay approval.

## Failed gates and honest limits

- Natural unassisted powers .55/.65/.75: candidate has no observed central-field access and score0, versus accepted score25/access at each. It drains normally, not an endless shooter loop. Repeated three-ball no-key runs remain score0 with rapid game over.
- Powers .85/.925/1: field access occurs, scores25/200/250 versus525/525/325. These score changes alone do not prove difficulty or a single causal collider.
- Saved contact records do not prove one uniform upper-bar failure. At.55 first loaded bar contact is effectively translated-equivalent; at.65 the one manifold has no positive impulse. The wider outside aisle bypassing the old nose redirection is a supported trajectory inference, not a recorded individual-nose contact proof.
- Actual installed top/45/low/mobile images reject the abrupt fixed-heel IN convergence, enlarged OUT fan and distorted curved labels.
- The supposed underboard feet occupy Y[-.05,-.02], INSIDE visible board[-.14,.04] and physical floor[-.12,.04]. Stem bottom-.04 does not cross the underside. The code preserves this construction error; it is not relabeled as successful throughboard fastening.
- Four bounded positioned lane fixtures: OUT drains without flipper contact; IN touches flippers but active contacts/coils/upfield returns remain0 and both drain. This is not capture/refire qualification.
- Same-XZ wire endpoint ground projection has new-rail clearance-.032706 versus old+.217726. Supported-height gap remains+.217768. This vertical-column sample is not the actual moving-ball trajectory or proof of a trap.
- Weak.1 separately returns/settles/relaunches. Four unchanged old tests fail absolute x2.45..2.7 bounds; their earlier phase/ball/return assertions pass. Expectations were not relaxed.
- No full198, strong120, same-ball qualification, natural54 or human/physical-phone approval was obtained. The existing candidate45 view stays below the500000triangle budget at459308/685calls, which does not offset failed gameplay/structure/appearance.

No next shape is included. Original candidate source-set SHA256:
31556815264efdaf5523aaa33ac4960255fb3bc7966555e31fcf7a49ee4ca10c.
