# Lower side containment regression, 2026-11-17

The archived `../difficulty/standard-final.json` contains two unique side escape paths: pulse input at power 0.55/offset 0 leaves the left side at 28.425 simulation seconds (x -3.2971, y 0.5852, z 3.6304); reactive input at power 0.925 leaves the right side at 50.525 seconds (x 3.2092, y 0.1549, z 2.5099). Reactive offsets 17 and 41 duplicate the same deterministic input. A fresh baseline reactive run also reproduced that right escape. The original cap height was 0.385 and the right ball crossed it airborne around y 0.53.

The installed side guard is now 0.75 high only below z = 1.2. Upper sides and rear retain their original 0.385 height, so the outer ramp lips remain accessible. The original footprint is unchanged. Shared box sections generate both the visible backing/cap and physical contacts; flush screw heights follow the corresponding section. No hidden wall, position rescue, scoring reward, or drain-boundary relaxation was added.

`known-escape-results.json` records the two input schedules against the integrated collector version, using only launch and flipper input. Both reach normal three-ball game over without escape. Rerun from the repository root:

```
node docs/pinball-experiments/collector/known-escape-audit.mjs
node --test web/js/pinball/cabinet-boundary.test.mjs web/js/pinball/ramp-acrylic.test.mjs web/js/pinball/ramp-hardware.test.mjs
```

The eight focused tests pass: exact visible/contact bounds and rays, cap fasteners, four airborne side-contact fixtures, and accessible acrylic/hardware approaches. The local airborne fixtures intentionally inject initial positions to isolate contact behavior; they are not counted as legal-input play sessions.

Caveats: the archived baseline and new two-session run do not have identical world-creation order. The integrated scoop also changes trajectories, so this is not a controlled guard-only duration comparison. It does not prove every possible escape or human-playability case is fixed. Two larger before/obsolete full-height-guard audits were interrupted to avoid CPU competition and produced no completed JSON; they are not passing evidence. The full-height guard experiment was rejected because it obstructed valid upper ramp exterior approaches. Final release-wide tests and browser review are separate.

## Collider allocation regression

Splitting the original two side walls into four before creating the ball changed existing Rapier contact handles and narrowed the previously accepted ramp shot window. A diagnostic 20-shot comparison showed release 82 failed with and without scoop contact while releases 80, 81, 83, 84 succeeded; preserving the original three wall allocations restored all five releases with and without scoop contact. No scoop contact occurred during these ramp shots. The final implementation therefore retains the original three complete low walls and appends the two lower-height extensions after the ball and existing fixed hardware. Rendered outer geometry is unchanged from the split-wall design. This preserves old contact allocation rather than weakening the shot acceptance tests.

## Collector clearance check

The central scoop blocked left-flipper upper-lane shots; disabling only its physical contacts (and capture) restored both-side lane reachability. A scoop at x = -0.72 still put its right cheek on the post-ramp re-fire path. The final x = -0.90, z = 0.45 placement clears that central path and keeps the mouth-Z contract unchanged. The unchanged complete `lower-layout.test.mjs` and `mechanical-supports.test.mjs` pass 15/15, including all five ramp/recapture/re-fire timings, physical drains, and 80 slow support approaches. The unchanged targeted physics/ramp tests also pass 3/3: all five ramp timings and both flippers' upper-lane/bumper reachability. No acceptance assertion was relaxed. Full-release suite and UI QA remain separate.
