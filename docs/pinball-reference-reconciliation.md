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

## 2026-11-12: Pinball Star layout reference and playable mission pass

The newly supplied 450×253 Pinball Star screenshot was materialized and visually inspected. This pass follows its compact upper pop group, left-middle three-pop pocket, open central circular insert, side routes and lower flipper/inlane structure. It does not copy the image's artwork. The separate upper-left round feature is visually ambiguous at this resolution and has not been claimed as an implemented mechanism.

- Replace the left-side standing bank with three low, contact-driven mini bumpers; retain both upper banks and their usable shot routes. Small bumper radius .16 and physical top .32 leave ball-width clearance and clear the elevated return.
- Keep the shared lower heel cheeks, actual outlanes and shooter divider. Add a visible left-outlane kickback, earned once by the target mission and consumed by a physical impulse. It is an added gameplay rule, not inferred from the screenshot.
- Five sequential missions: bumper contacts, side target contacts (earns left save), spinner passes, three distinct upper lanes, full ramp. Progress survives balls, resets on restart and uses deduplicated physical events. Ramp score requires ordered entrance/crest/released-exit gates, with abandoned traversal reset.
- Central circle is flush artwork with static progress inserts, not a collision obstacle. No particle/glow effects pass. Ramp panels are less opaque without changing collision geometry.
- Desktop full-height play area with sidebar; mobile compact HUD/controls remain outside the play area. Projected cabinet bounds are centered and fitted; selectable side-to-top angle retained. Oblique views on narrow phones remain width-limited; top view uses more available height.
- Existing charged keyboard/touch plunger, same-ball weak return, hold/release/reflip, ramp recapture and upper-lane access retained.

Verification: full repository tests and pinball tests; actual Chrome keyboard/touch input tests, built smoke test, four responsive sizes and 10/56/90-degree views. Independent review checked mini-pocket clearances and 25 passive release fixtures, mission rules and real ramp shots; its early ramp-score finding was fixed by moving reward beyond the physical lip. Added tests check mini-pop scoring/release, clearances, charged/uncharged outlane behavior, ramp gate order and exactly-one award after release. No physical phone or human difficulty rating. No claim of full reference parity: second independent orbit, uncertain upper-left feature, multiball, nudge/TILT, audio and elaborate art/effects remain unimplemented.

## Side response, scoring and reference-art refinement

The Pinball Star image was inspected again. Navy printed playfield, maroon cabinet/apron, purple left pocket/arch footprint, colored bumper caps and yellow route inserts now follow its palette and hierarchy. Exact ramp geometry, upper-left mechanism and cabinet proportions remain unmatched; collision geometry was not silently altered to fit art.

Side mini-pop outgoing impulse target increases from4 to6, and sling impulse from.06 to.18; both remain horizontal and bounded. This is moderate gameplay tuning, not faithful electromechanical simulation. The scoring investigation found no universal counter failure: twelve reactive launch samples ranged from200-point early drains to11,225-point60-second runs. However, already-lit upper lanes incorrectly offered no repeat-passage score for this intended arcade rule, lower inlanes had no switches, and new point feedback was easy to miss. Fresh upper-lane passages now award100 each while duplicate contact IDs remain ignored, actual inlane switches award100, and HUD retains a +increment for1.8seconds. No timer-based free points or flipper-press awards.

New real-keyboard browser test launches normally without ball positioning or injected scoring. Three25-second runs with100ms reactive sampling produced4,975/3,100/4,550 points with exact HUD/state agreement and visible increments. These are automated examples, not human difficulty guarantees. Independent review found no scoring/physics blocker;25 passive mini-pocket fixtures cleared, observed maximum speed8.59, and cradle/ramp-refire checks passed. Full repository suite includes66 pinball tests. Three existing CSS compatibility warnings remain.

## Bumper-hit feedback

A real accepted main/mini-bumper hit now triggers a short local yellow ring and +100 label. Six effect pairs are reused; no fullscreen flashes, particle bursts, extra physics, or score writes. Pause freezes effects; restart clears them. Reduced-motion uses a static ring/label with a short fade rather than expansion/rise. Natural charged launch in Chrome verified actual hit feedback at desktop and390px mobile widths; pause/restart/reduced-motion checks passed. Independent review confirmed bounded allocation after1,000 updates and disposal of all geometries/materials/shared texture. One active hit measured419 draw calls, close to the416-call base; no physical-phone frame-time guarantee. Full repository checks include67 pinball tests, with three existing CSS compatibility warnings.

## Screenshot pinch, shooter rest and nudge/TILT

The supplied stuck-ball screenshot was inspected: the ball is between the front main bumper and right target bank. Their free throat was .182 units for a .27-diameter ball. Moving that bank .20 outward makes the throat .381; four slow approach fixtures now pass without a teleport rescue. The screenshot's exact permanent resting state was not independently reproduced. Regression play did independently reproduce a different static crest stall: mesh internal edges could hold the ball on the curve. Localized Rapier internal-edge correction on the crest releases the exact resting fixture naturally while preserving tested ramp entry/return shots.

The initial shooter rest and weak-return rest were inconsistent and the latter overlapped the rod/knob. A visible fixed head and matching collider now put both at z4.025, ahead of the spring. Only the rod and knob retract during charging. Actual Chrome weak-shot return measured z4.026, without consuming another ball.

N key or the on-screen 揺らす button applies a bounded physical nudge, never points or position replacement. Rapid repeated nudges warn, then TILT disables coils/scoring and ends the current ball after 1.5 simulated seconds. Pausing freezes that deadline. The meter resets on next ball/restart; held-key repeat is ignored. This is an explicit arcade penalty, not an electromechanical tilt model. Browser keyboard/touch checks verify warning, TILT and exactly one ball penalty. Independent review also verified the final-ball gameover path. Existing bumper-hit effects remain event-driven and passed pause/restart/reduced-motion checks.

Final verification: full repository test command passed (including lint with three existing CSS compatibility warnings), final pinball suite 78/78, static build and actual Chrome built smoke passed. Browser tests include keyboard/touch nudge, same-ball shooter return, cradle/release/reflip, full physical ramp return and recapture, event-driven effects, and mobile controls. Collision boundary vertices are exactly shared across crest mesh sections. No physical-phone test or guarantee that every possible stationary state is eliminated.

## Hangar background and multiplier challenges

Replace the empty gray surrounding area with a static navy/amber steel service bay: floor inlays, side trenches, cabinet support and distant bulkhead. All background pieces are visual only, outside the board and do not collide with the ball. Checked 10/56/90-degree and mobile views. Total render calls 483 (previous 416), 170527 triangles; no extra animated effects or real-time lights.

Two independent per-ball multiplier challenges run beside the five existing missions: five bumper contacts unlock ×2; then scoring on three distinct mechanism groups unlocks ×3. Groups are bumper, side bank/target, spinner, ramp, and lane (inlane/rollover). Threshold contact uses its previous multiplier. Only base contact/traversal points multiply, not mission/lane bonuses or saves. Loss/TILT/restart reset to ×1; weak-shot same-ball return preserves it. HUD shows progress, factor and per-ball scope; bumper labels now show the actual100/200/300 contact score, independent of mission bonuses. Three shared label textures are registered for complete asset disposal.

Actual Chrome launch plus explicit rule-event fixtures verify ×2/×3 HUD, correct200-point effect texture, TILT reset and nonoverlapping mobile controls. Rule fixtures are not claimed as natural mission completion or human difficulty testing. Regression tests cover cap, aliases, reset, pause, duplicate contacts, fixed bonuses and threshold hit labels. No physical-phone performance guarantee.

Final integrated checks: full repository tests/build pass, pinball83/83. Natural charged launches with reactive keyboard controls (no score/position injection) scored7325/2900/1450, with exact HUD agreement; two returned to the shooter naturally. Nudge warning/TILT and weak return pass PC/touch browser regression. Independent review verified every label texture disposes exactly once after100→200→300 switches. Three preexisting CSS compatibility warnings remain.

## Restore Chappy identity after background feedback

The generic hangar direction lost the character-driven workshop identity. Re-read the original design document and Library metadata for ロボバディ・ネオンピンボール(1).png, and visually inspected its existing local neon-reference.png (matching1086×1448,3957019bytes) alongside mechanical-reference.png. The original has a friendly rectangular cyan screen-face, heart chest, yellow hardware, DIY tool/cable motifs and BUILD/HACK/PLAY lettering; the later mechanical concept adds brass/copper mechanisms and a warmer workbench. The Pinball Star reference continues to govern playable part placement, not the character theme.

Restore Chappy's smiling screen-face/heart as a flat central playfield illustration, visible even when narrow mobile views crop the offboard workshop. It adds no raised obstacle or collider. Replace generic service-bay dressing with an inventor workbench, mascot, tools and warm mechanical details. This is a code-native interpretation rather than an exact rendering of the supplied images; dense original scenery, artwork detail and animated character acting remain incomplete. No gameplay or multiplier rules changed.

Final visual checks at10°,56°,90° and375×812: original-style pale robot with cyan smiling screen/heart and yellow accents is restored on the side bench; mobile crops that side figure but retains the central flat illustration. Added BUILD/HACK/PLAY/REPEAT placard, wood benches, lamps, copper tooling and gears. Board and HUD remain unobstructed. Full repository checks83/83 and actual browser smoke/multiplier checks pass. Render cost587calls/186667triangles; physical-mobile performance unverified.
