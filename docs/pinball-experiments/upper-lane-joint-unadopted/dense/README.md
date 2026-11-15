# d971 fixed dense timing diagnostic — unadopted

568 cases completed: accepted884 versus d971, delays30..100 inclusive at1tick, ascending/descending in separate processes, left then right per delay. Original relative lane starts, quiet30 capture, release/repress, force/solver/input unchanged. All568 starts legal, quiet captures, one actual coil, reset0. No adaptive extension or successful-start selection. This is an explicit lane-input family, not natural incoming-ball frequency.

Both orders agree on all success/end classifications. Accepted left41/71, longest32–56 (25points, endpoint200ms); right41/71, longest32–70 (39points,316.67ms). Candidate left21/71, longest92–100 (9points,66.67ms); right25/71, longest64–87 (24points,191.67ms). The left candidate run touches the predeclared upper endpoint100 and is censored there; no claim about untested delays>100. Do not equate summed successes with all playable timing or difficulty.

Accepted per order: left58drains/13held recaptures, right55/16. Candidate: left43drains/27held/1sameball-ready-shooter, right49/21/1. No nonbat-quiet endpoint or playing time-cap endpoint. Candidate left69/right87 finish ready/ball1 at shooter coordinates. Raw runner endClass labelled these time-cap-moving because it lacked the ready-ball1 branch; summary corrects classification from saved phase/ball/position without modifying raw records or rerunning.

All sampled classifications match asc/desc, but2 of142 paired traces in each geometry differ in p/v and capture timing. order-differences.json records first discrepancy and lengths; do not claim generic bit-determinism.  140 of142 paired traces per geometry have identical compressed trace bytes. Distinct geometry or process-construction histories are not interchangeable.

Normalized actual coil along covers accepted≈.17337..68613 and candidate≈.17073..53504. Longbat changes mapping from time to normalized strike and world position. Exact along/aim/world coil and release/local positions appear for every case in summary.json; compact-summary has ranges. A lower count or shorter sampled run does not prove loss across the entire possible input domain. The same fixed domain nonetheless has narrower qualified sampled runs on this candidate.

Success means quiet capture→real coil→z<−1 with no reset. It does NOT certify ramp/wire completion, same-ball natural return, full206/207 regressions,54controller, reference/mobile/human play, or whole no-stall. Existing full207 failures remain. The d971 prototype is not adopted.

Reproduction: MODE=accepted|candidate ORDER=asc|desc node --import ./artifacts/pinball/upper-lane-joint-e283fc7/accepted-loader.mjs|loader.mjs ./artifacts/pinball/upper-lane-joint-dense-e283fc7/run.mjs (match geometry/loader). Each process owns142cases. summarize.py then finalize.py produce reports. Raw compressed traces retain all p/v/spin/bat pose/contact/coil data; source and file hashes are in manifest.

## Successful-case endpoints
Both orders agree: accepted left41 successes =32 ordinary drains +9 held recaptures; accepted right41 =32 ordinary drains +9 held recaptures. Candidate left21 =11 drains +9 held +1 sameball-ready; right25 =23 drains +1 held +1 sameball-ready. compact-summary successfulCaseEndpoints preserves these counts; z<−1 does not require continued play or ramp completion. Original provisional time-cap-moving labels remain in raw batch JSON/logs, corrected only in derived summaries. No adaptive range extension.
