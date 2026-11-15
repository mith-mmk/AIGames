# Flipper underboard installation repair

Bounded structural repair against stable696c646. It is independent of long-lane experiments, and does not complete the reference's visible flipper shell, receiver/IN/OUT design, or actual physical-phone/human testing.

## Measured defect and implemented load path

At the installed pivotY.27, the old coil reachedY−.018 and its bracket reached+.003, both inside the boardY[−.14,.04]. The baseplate sat atY[−.295,−.267] without board mounting supports. Simply adding posts would leave those embedded parts and could collide with the coil/crank.

The complete actuator is therefore lowered.16 as two connected frames: stationary coil/link system and shaft-driven crank. The original local slider-crank equations, stroke, bat angle and linkage length remain unchanged. The shaft extends down to meet the lowered clamp. Ball-facing bat/profile, physics, score and input are unchanged.

A wider chamfered baseplate supports four bored stand-offs, separate long screw shanks, washers and hex heads. Mount stations are authoredX−.22/.38 (scaled by the existing flipper length ratio), Z−.98/.21, chosen outside the existing coil brackets and full crank radius. Plate worldY is[−.455,−.427]; stand-offs rise from−.427 to the board underside−.14. Screw shanks enter the wood without projecting through its top. The highest original coil bracket now reaches−.157, leaving.017 below the board.

This is actual support and actuator placement, not a printed effect. Dimensions, thread-free screw models and load paths are visual engineering estimates, not manufacturing or strength certification. Board mesh bores around existing shafts and some original mechanism simplifications remain unresolved. No new ball collider is needed for parts beneath the already-solid playfield; this is not permission to omit contact for accessible hardware elsewhere.

## Verification

- Full pinball suite222/222 passes, zero skipped; lint zero errors and the same3 CSS warnings. A final targeted rerun passes all5 new tests after strengthening the batching check to compare the same slider pin's before/after position. Runtime source did not change between those runs.
- Both installed sides are checked at81 shaft angles. Fixed coil/brackets are below the board; stand-offs clear fixed hardware and moving crank/link parts; shaft still reaches its clamp, linkage length remains constant, and controller-owned meshes update after production batching.
- Initial broad AABBs overlapped a rotated crank despite no actual radial overlap. Rather than waive the check or move parts blindly, the final test proves separation by all crank vertices' maximum pivot radius versus the post's minimum radius. The initial failed broadphase log and final successful test log are both retained. These are finite-sample/conservative-bound checks, not universal swept-contact certification.
- Added baseplate/support bounds clear every cabinet mesh, allowing intended touching at the board face. The four plate holes are real and coaxial with their screw shanks. This does not claim a full all-pairs audit of inherited mechanism internals.
- Natural54 exactly matches every complete per-case stable record:61 ramps,284 release stages,54 finished, zero stalls/live-position resets/zero-score games. Only components/flipper.mjs differs among runtime modules; source hashes are retained.
- Desktop keyboard and390px CDP touch launch/flippers/pause/resume/restart pass; browser runtime errors are empty. Real devices, phone GPU performance and human play are untested.

Installed45 triangles454132→465844 and draw calls688→698, below the unchanged500000 triangle gate. Above-board geometry and regular top-down composition are not presented as a new reference-likeness achievement.

## Visual review

Standalone top/45/side/underside/moving views and installed45/10/90/mobile views were captured. Local installed views show the left mechanism and an active right crank. Inspection images explicitly label cabinet cutaway and additional fill light; designated cabinet panels are hidden, the board remains. The right-active picture applies the existing active angle to the visual mechanism for inspection, not a separate gameplay trial. Selected screenshots are included.

## Reproduce from repository root

- `npm run test:pinball`
- `node --test web/js/pinball/flipper-mount.test.mjs`
- `node scripts/pinball-playability-audit.mjs artifacts/pinball/flipper-replay-natural54.json`
- `PINBALL_REVIEW_OUT=artifacts/pinball/flipper-replay-component node scripts/pinball-component-review.cjs flipper`
- `node docs/pinball-experiments/flipper-underboard-mount/scripts/visual.cjs`
- `node docs/pinball-experiments/flipper-underboard-mount/scripts/input.cjs`

Archived browser scripts serve the exact source map in payload/sources.json; baseline visuals use Git696c646. Outputs go to artifacts/pinball/flipper-underboard-replay, and those diagnostic scripts can overwrite existing output filenames. Use a fresh output directory when retaining older runs. Already installed Playwright/Chrome is used, with no dependency installation.

Long-lane and receiver proposals remain separate and are not merged into the adopted game. Overall pinball remains unfinished.
