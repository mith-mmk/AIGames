# Unadopted R1.5 receiver experiment recovery package

This preserves **experimental source**, not an adopted game revision. Production remains the accepted `c1f7aeba28e9fb55117fa0fedbc975f5e8e72d84` runtime. No production imports, package dependencies, vendor files, force/input/solver settings or approval status are changed by this directory. Commit/push is handled separately.

The latest experimental revision is `receiver-r15-generic-contract-f7e4d30`: the frozen R1.5 shape plus an explicit installed-only base factory correction. Generic `baseShell`, `baseShellStrips` and `baseShellVisualParts` remain the accepted implementation; the installed receiver imports separate exports. This does not fix the outstanding support datum, reference appearance, all contact regressions or normal-engine gameplay failures.

## Contents and dependencies
- `payload/`: byte-identical five shape/source hooks, installed-only API correction, installed geometry capture probe, and optional deterministic-engine resolver.
- `manifest.json`: restore paths, SHA256 for every payload, full Git commit references, official engine URL/integrity/ESM hash and expected geometry-capture hashes.
- `restore.mjs`: verifies all source hashes before restoring the original artifact-relative paths. Existing differing files cause an error; they are never overwritten.
- `fetch-engine.mjs`: optional official deterministic0.17.3 fetch. It verifies archive SHA512 and ESM SHA256 before writing only the embedded-WASM ESM and its ESM package scope. No full archive or temporary extracted build tree is retained.
- `verify-captures.mjs`: checks the original and installed-only revision captures against the manifest.

Use a Git checkout whose directory is named **AIGames**. The preserved loader intentionally retains its original `/AIGames/` module-path selector. Do not silently edit the archived source to accommodate another directory name. Run commands from repository root. The history must contain the accepted commit. For the exact test snapshot use `f7e4d30bb465247305347485c5c33c31047bd4ae` in a separate checkout named AIGames and copy this recovery directory there; the source loaders obtain accepted modules directly from Git history.

Newer checkouts can contain additional test-only modules absent from the pinned commit. For historical190 reproduction use the exact test snapshot specified above; the frozen loader intentionally cannot supply later test modules from c1 history. Run newly adopted QA tests without these experimental loaders.

Tested with Node26.7.0. Synchronous `node:module.registerHooks` is required (Node22.15+/23.5+); use the tested version for exact numerical reproduction. Git and tar are needed. Core capture/API probes need no npm install: Three.js, ordinary Rapier and their local module dependencies are already tracked under `web/js/vendor`, and accepted pinball source comes from Git history. The optional deterministic package is not present in production package.json; the verified fetch helper supplies it only in ignored artifacts. Browser screenshots would additionally require the existing repository Playwright/browser setup, but no browser probe is included in this minimal package.

## Restore source

```sh
node docs/pinball-experiments/receiver-r15-unadopted/restore.mjs
```

This recreates the original relative paths under `artifacts/pinball/receiver-r15-generic-contract-f7e4d30/` and the optional resolver under `artifacts/pinball/deterministic-current-gate/`. No other old artifact directory is needed for the shape, generic repair or capture probe.

## Reproduce normal-engine geometry equivalence

```sh
base=./artifacts/pinball/receiver-r15-generic-contract-f7e4d30
MODE=original node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" "$base/capture-installed.mjs"
MODE=revision node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" "$base/capture-installed.mjs"
node docs/pinball-experiments/receiver-r15-unadopted/verify-captures.mjs
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --test --test-name-pattern='one-strip generic housing' web/js/pinball/ramp-base.test.mjs
```

The two capture invocations intentionally write fresh `capture-original.json`/`capture-revision.json` in the restored artifact directory. Preserve previous outputs separately if needed. Expected counts:1370 colliders and222 affected MechanicalRamp meshes, with exactly matching hashes. The one-strip test is one selected regression, not full-suite acceptance.

## Optional deterministic gameplay probes

```sh
node docs/pinball-experiments/receiver-r15-unadopted/fetch-engine.mjs
base=./artifacts/pinball/receiver-r15-generic-contract-f7e4d30
det=./artifacts/pinball/deterministic-current-gate/loader.mjs
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" scripts/pinball-ramp-entry-audit.mjs 20
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" --test web/js/pinball/lower-layout.test.mjs
```

Loader order is significant. These commands use unchanged tracked probes, six entry conditions repeated20times and the whole lower-layout family in its existing construction order. The entry runner writes `artifacts/pinball/ramp-entry-audit.json`; copy it to a labeled result file before another run. The lower test can fail at an existing assertion and is not a replacement for the historical all-five trace aggregation. Historical large traces and screenshots are intentionally absent. Do not infer that this preservation package re-ran or passed all gameplay gates.

Normal and deterministic results must remain separate. Historical normal R1.5 strong17/18 was not erased by deterministic18/18 or120/120. Neither engine nor this experimental layout is approved for production by those results. Real-device/human validation and reference acceptance remain unverified.

## Exclusions and review

Engine binaries, package archives, images, large traces, generated outputs and node_modules are intentionally omitted. Official package metadata is reduced to public dependency identity, URL, license and integrity. The archived scripts contain game geometry and reproduction logic only. Manifest hashes verify preservation, not security or gameplay correctness. The optional engine's Apache-2.0 licensing remains applicable; it is obtained from its official distribution rather than vendored in this package.

## Preserved regression contracts and broader gate recipes

`regression-contracts.md` is preserved verbatim and restored to its original artifact path. It distinguishes invalid old starts, changed route contracts, obsolete observation indices and unresolved behavior. Do not rewrite expected values merely to obtain a green suite. The generic-factory repair described above addresses one contract; it does not supersede all failures listed in that document.

The packet also preserves the boundary diagnostic, strict aiming-matrix hook and twelve finite low-speed probes with their original restore paths. They use the repository's tracked modules and the loader prefix above; no omitted artifact helper is imported. Historical outputs referenced by the contract table are identified in `evidence-references.json` by path, byte count and SHA256, but are not necessary for source reconstruction and are not copied here.

For broader gates, set the same `base` and `det` shell variables as above and run separate processes. These are recipes, **not assertions that the current experiment passes**:

```sh
# Full existing pinball test family, preserving unchanged expectations.
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" --test web/js/pinball/*.test.mjs

# Fixed controller54; retain180s caps as caps, not completions.
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" scripts/pinball-playability-audit.mjs "$base/reproduced-natural54.json"

# Ascending/descending strict60..100 timing window. Whole lower family preserves its prelude.
ORDER=ascending MATRIX_OUT="$base/reproduced-matrix-ascending.json" node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" --import ./artifacts/pinball/prism-aim-window/matrix-hook.mjs --test web/js/pinball/lower-layout.test.mjs
ORDER=descending MATRIX_OUT="$base/reproduced-matrix-descending.json" node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" --import ./artifacts/pinball/prism-aim-window/matrix-hook.mjs --test web/js/pinball/lower-layout.test.mjs

# Eight original predefined low-speed restores and four old-pocket-nearby starts.
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" artifacts/pinball/receiver-r15-det-contact-review/slow.mjs
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" artifacts/pinball/receiver-r15-det-contact-review/old-pocket-nearby.mjs

# Diagnostic old fixtures and current material geometry; not a replacement acceptance test.
DIAG_TAG=reproduced node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$det" artifacts/pinball/r15-boundary-diagnosis/check.mjs
```

The restored low-speed scripts write their documented `slow.json` and `old-pocket-nearby.json` paths; archive old results before reproduction. They require legal preflight starts and retain recorded overlap rather than asserting zero penetration. The boundary diagnostic contains both isolated and installed checks; an isolated-floor drain is not installed-table qualification. Full browser/render checks require separate screenshot review and are not replaced by these numerical probes.

## Separate optional support-datum layer

`SUPPORT-DATUM.md` documents the later unadopted support-station variant. It reuses all six generic-contract source files and adds only the preserved `station-loader.mjs`, explicitly loaded before the deterministic engine resolver. The default commands above remain generic-only. Restoring the additional file does not activate it. Full190 status for this later variant is recorded as in progress/unconfirmed at packaging, not passed; append later evidence under its own revision and labels.

## Later optional scoped support-contract revision

`SUPPORT-CONTRACT.md` preserves the explicit installed-support factory correction and two import-only observation diagnostics with their proof snapshots. It shares the original six sources and replaces, rather than stacks with, the unscoped station hook. Generic-only and unscoped freezes remain available. Scoped full190 has not been rerun;171/19 is only the preceding unscoped result. Original observation failures and separately passing byte-identical-body diagnostics are documented without substituting one for the other.
