# Optional support-datum variant

This is a **separate, unadopted experimental layer**, not a replacement of generic-only recovery and not production approval. Its full190 run was still in progress/unconfirmed when this preservation entry was written. Results may be appended later with exact revision and output identities; do not silently replace old failures.

## Minimal added source

Only `payload/station-loader.mjs` is added. Its SHA256 is `40efa3e49d18da8bdca7034f7031264bf8be6fa60dd3af07f7f30f66d1f75e85`. It imports only Node's `registerHooks`; there is no additional artifact helper or engine dependency.

The original support-datum artifact directory copied the five shape inputs and installed-mode-loader. Those six files were independently verified byte-identical to the preserved generic-contract sources, so they are **not duplicated here**. Restoring the packet installs the station hook at its original relative path. It does nothing unless explicitly added to the Node import sequence.

The added hook preserves generated lower supports below parameter48/240, and pins upper supports to accepted normalized route parameters corresponding to rows57,78,99,116,130,141,152,163,173,181,188,192,240 for241samples. The current default lower station is42. It does not alter the route, lower dedicated supports, receiver, force, solver, input or generic base API. Alternate sample counts map these same normalized datums to their nearest row; broader generic station behavior remains a qualification matter.

## Explicit reproduction order

Run source restoration and optional engine acquisition as documented in the main README, then:

```sh
base=./artifacts/pinball/receiver-r15-generic-contract-f7e4d30
station=./artifacts/pinball/receiver-r15-support-datum-f7e4d30/station-loader.mjs
det=./artifacts/pinball/deterministic-current-gate/loader.mjs
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$station" --import "$det" scripts/pinball-ramp-entry-audit.mjs 3
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$station" --import "$det" --test web/js/pinball/lower-layout.test.mjs
node --import "$base/loader.mjs" --import "$base/prism-full-loader.mjs" --import "$base/installed-mode-loader.mjs" --import "$station" --import "$det" --test web/js/pinball/*.test.mjs
```

The first runner's output path is shared with other entry runs: preserve it under a variant-specific name immediately. The full-family commands retain existing assertions and can fail. For other major-gate recipes, insert the station import immediately before the deterministic resolver, use separate output filenames, and keep variant results distinct. Never use the generic-only capture manifest to claim support-datum geometry equality: upper support geometry intentionally differs.

## Evidence status at packaging

Reported focused results: original board probes4, support probes80 and generic tests passed; strong18/18; natural80–83 strict same-ball pass,84 still fails the first ramp. These are limited reported gates, not full qualification. Independent station audit lives under `artifacts/pinball/receiver-r15-support-datum-f7e4d30/`; large audit output is not required to reconstruct this layer and is not copied. Existing airborne/fixture/corridor/reference and real-device/human-validation limitations remain.
