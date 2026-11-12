# Pinball reference reconciliation — 2026-11-12

The original 429-line technical design and the supplied ROBOBUDDY PINBALL image were reread directly for this pass. The mechanical workshop image is an art variant, not a replacement for the original arrangement.

## Implemented corrections

- The design explicitly requires Space hold to charge and release to fire, plus a mobile slide plunger. Instant fixed-strength launch was missing functionality, not an accepted simplification. The new plunger exposes charge, actual velocity variation, physical return of weak shots and cancellation.
- The reference has two rear bumpers and one forward centered bumper. Moving that front bumper to the left to maximize direct B shots diverged from the design. Restore the triangle and test routes around it rather than requiring every center shot to pass straight through it.
- Target banks must border shot routes, not block them. Left upper bank and right bank positions were checked against flank shots and the ramp base. A right-bank/ramp-base wedge found during the first attempt was removed before publication. Rendering and colliders consume the same endpoints.
- Sling tips must leave a usable outgoing flipper shot and a ball-width incoming lane. Enlarging a sling without moving its lane creates a wedge. Geometry checks and real shots both gate acceptance.
- Keep the narrow heel cheek only to prevent a ball already inside the flipper region leaking beside its pivot. Genuine upstream outlanes remain. No large apron wall, teleport or invisible rescue is introduced.

## Still not a complete reference implementation

- Left elevated return remains a transparent trough, not a separate physical wireform; the full S-ramp profile and target hardware are simplified.
- Robot centerpiece, surrounding machines, original artwork, lights and material detail are not faithfully reproduced.
- Drop targets, holes, nudge/TILT, combos, missions, extra balls, multiball, audio, saved high scores and gamepad remain incomplete.
- Runtime remains JavaScript modules rather than the proposed TypeScript/Vite architecture; shared data and event routing are incremental, not the specified full PinballComponent/EventBus design.
- Automated physics fixtures, keyboard/touch events and viewport checks do not establish human difficulty, physical-phone performance or reference visual equivalence.

Publication must retain these limitations and report tested behavior separately from planned work.

## Verification for this pass

54 pinball tests pass, including the actual leaking heel fixture, both flippers reaching upper lanes and bumper routes across a timing sweep, five full ramp-return/cradle/re-fire timings, and same-ball weak-shooter returns. Full npm test and static package build pass. Real Chrome keyboard/touch tests cover low/mid/full charge, canceled gestures, pause/restart/blur, focused button behavior, mobile viewport, three-ball games, flank scoring and ramp traversal. These are automated input tests, not a human difficulty rating.
