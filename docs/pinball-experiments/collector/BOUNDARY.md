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
