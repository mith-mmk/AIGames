# Fresh paired fixed54 natural controller — stable upper stepped supports

Candidate source61e4f76a0594d56ca1b3b614e4ef70f2e202637f7e968a637e58565cda38f63f versus stable79d baseline800733cdda0c52ee1fa5adb2f5901248c713d60418f31a7492de8ef8bed5bc41. Ordinary engine, source/force/inputs fixed. Each process uses original powers .55/.65/.75/.85/.925/1 × delays44/49/60/66/68/69/80/82/84 in that order,180-second cap. Both processes fresh. Original controller body/thresholds and no-reset assertions retained; only imports/output and observations added. No start injection, score/velocity edit or adaptive case selection.

| Observation | Stable | Stepped |
|---|---:|---:|
| Finished three-ball games |54/54|54/54|
| Cap/stall/zero-score/live reset |0/0/0/0|0/0/0/0|
| Actual ordered ramp/wire traversals |61|45|
| Same-ball post-ramp quiet capture and actual coil |60|45|
| Subsequently observed z<−1 on same ball |54|43|
| Actual coils left/right |397/418|350/402|
| Controller release-stage entries (not coils) |284|220|
| Total score |169700|174000|
| Total simulated seconds |3460.8917|3197.2917|

Meaningful natural same-ball ramp/wire/capture/refire occurs in the candidate; it is not inferred from artificial entrance fixtures or controller shot count. The observation remembers actual ramp-completion count, ball number, quiet capture, positive real strike counter and subsequent upstream position. All games finish atball3. The2candidate routes with actual coil but no observed subsequent z<−1 remain unqualified for that stricter outcome, not relabeled successes; non-upfield-routes.json keeps them and baseline7non-upfield routes (one lacks post-ramp capture). No new stationary failure or cap is observed in this fixed family, not a proof of all-state no-stall; stable near-static rear restores remain outside it.

Per-power ramp totals: stable13/7/4/14/18/5; candidate13/11/7/9/5/0. The high-power repetition distribution changes, especially1.0. Neither overall score nor total completions establishes equivalent human difficulty or reference acceptance. Retain this difference for adoption judgment.

Reproduce: node --import ./artifacts/pinball/stable-upper-stepped-mounts-527764b/{baseline-loader,loader}.mjs ./artifacts/pinball/stable-upper-stepped-natural54-527764b/run.mjs <separate-output.json>. summarize.py generates comparison.json. Both result files include all54 games, metrics and per-route/coilevent evidence. Parent owns integration/adoption; no production or permanent-test edits made here. Full207/entry120 and local6weak/upper3 are separate evidence. Real phone and human play remain untested.
