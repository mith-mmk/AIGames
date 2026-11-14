# Optional scoped support-contract revision

This preserves a later **unadopted optional revision**. Keep generic-only and the unscoped support-datum freeze and their results distinct. Use `station-contract-loader.mjs` **instead of**, never together with, `station-loader.mjs`. Six existing generic-contract source files are reused byte-for-byte; no additional shape helper or engine is needed.

The scoped station hook SHA256 is `085f4bbc90db774e95ec0b5af5b7de2e0c3a70916500fcb7e9cc8fc7ebdc7b5b`, checked against the originating audit manifest. Default `rampSupportStations` keeps the accepted helper body. Explicit `receiverSupportStations` supplies installed datums to the physical ramp, underside factory and MechanicalRamp. This restores generic support selection; it does **not** claim all generic `rampUndersideParts` behavior has been restored.

## Preserved evidence and honest result labels

- All1370 installed collider records and222 affected MechanicalRamp meshes are exactly identical to the preceding unscoped datum variant. Capture hashes are in `proofs/support-contract-manifest.json` and the main manifest.
- Fifteen explicit generic arrays (five subdivision counts ×full/short/upper), plus omitted-argument default, exactly match an independently extracted accepted helper. No approximation tolerance was substituted. `generic-check.mjs` is included for replay.
- The original support80 test **fails** at counts34left/28rear versus46/34. Its preceding movement assertions pass. The original physical-support-matching test also **fails** because both still observe generic rather than explicitly installed stations. These failures are not removed from history.
- `observation-loader.mjs` and `matching-observation-loader.mjs` are separate **diagnostic import-only hooks**. They alias the installed factory at the observation site; the entire test body and all assertions remain byte-identical. Those separate runs pass. Their exact import changes and equal SHA256 pairs are preserved under `proofs/`.
- **Scoped full190 has not been rerun.171pass/19fail belongs only to the prior unscoped support-datum freeze.** Installed equality is not a new gameplay result. Previous84 failure, other safety/fixture/reference issues and real-device/human validation remain unresolved.

These observation hooks are not production test changes, not relaxed expected values, and not an unchanged full-suite pass. Their proof files demonstrate body identity for the source snapshot tested; on replay the hook checks and emits fresh proof for the actual loaded test body.

## Reproduce separately

Run the main `restore.mjs` and optional `fetch-engine.mjs`, then from repository root:

```sh
base=./artifacts/pinball/receiver-r15-generic-contract-f7e4d30
scope=./artifacts/pinball/receiver-r15-support-contract-f7e4d30
det=./artifacts/pinball/deterministic-current-gate/loader.mjs
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$scope/station-contract-loader.mjs" --import "$det" "$scope/generic-check.mjs"

# Original observations: preserve failures rather than changing their assertions.
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$scope/station-contract-loader.mjs" --import "$det" --test web/js/pinball/mechanical-supports.test.mjs
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$scope/station-contract-loader.mjs" --import "$det" --test web/js/pinball/mechanical-ramp.test.mjs

# Separate installed-observation diagnostics, not replacement full-suite results.
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$scope/station-contract-loader.mjs" --import "$det" --import "$scope/observation-loader.mjs" --test web/js/pinball/mechanical-supports.test.mjs
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$scope/station-contract-loader.mjs" --import "$det" --import "$scope/matching-observation-loader.mjs" --test web/js/pinball/mechanical-ramp.test.mjs
```

The test files may include additional tests beyond the targeted observations; inspect their complete output. To run full190, use the scoped station hook with the unchanged suite and **omit both observation hooks**, then save its own revision-specific result. The fresh diagnostic proof outputs go under the restored artifact directory; archived proof snapshots under this recovery package are not overwritten. The shared capture probe can be reused with a distinct `MODE=scoped` to avoid overwriting generic-only outputs; compare against this revision's capture references, not the generic-only capture verifier.
