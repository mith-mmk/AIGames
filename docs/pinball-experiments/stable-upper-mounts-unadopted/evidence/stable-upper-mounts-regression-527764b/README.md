# Stable-only full-height mounts aa38: rejected

Full original pinball Node corpus:207 tests,203PASS/4FAIL,0 skipped/cancelled, exit1. All37 test files and candidate source hashes remain unchanged. Source is aa38cedbfaf11e098385708956e264691a65e63c594b38f4be134aa651d3a534. No expectations changed. Duration93.00 seconds is not a benchmark because independent checks ran concurrently.

Four real gameplay failures, with original TAP retained in full.tap and summary.json:
- Fresh.925: score0 after5seconds.
-90-varied-launch test stops at shot20: repeated.925 same-ball shooter returns do not reach a real drain. Later21..89 cases did not run in that test.
-31-power passive minimum2.475seconds<3; median/reactive/assertions after that gate did not run.
- Fresh.925: lane2 false after1.5seconds.

The independent same-order.925 contact comparison identifies new right rear mount(1.875,.12,−5), impulse.704555, reversing vx−7.175→+.5019 while old/render trajectories agree. Its normal and construction-order scope are preserved separately in stable-upper-mounts-local-527764b/mount925-findings.md. That diagnosis is consistent with the scoring failure, not a claim that every test uses the same process history.

Entry120 passes120/120: original6 speed/offset conditions repeated20 fresh-world batches. The original script's physics, fixtures and criteria are unchanged. A bounded wrapper redirects only the result destination and candidate source hashes; original ramp-entry-audit.json is not overwritten. This is positioned ground entry, not natural launch/refire. All other203 original tests pass, including existing ramp/wire/capture and ground/elevated sensor contracts. Strong entry success does not excuse launch/relaunch regressions.

No lint success is claimed; the corresponding pipeline stops after Node-test failure. No geometry changes or extra trials followed these results. The render-only repair remains a separate control, not adoption of8 full-height columns. A stepped solid support is only an analytic proposal in stepped-standoff-analysis/; no new source or dynamics were generated.
