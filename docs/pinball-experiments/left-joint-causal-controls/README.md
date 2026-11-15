# Left joint causal controls: diagnostic, no adopted change

This separates the welded joint from detector relocation after the unadopted2d9c experiment. Repository at fd3567f20fca720629319ded167e8c9518112728. No force/input/expectation changes, no new geometry proposal applied, no full54 rerun.

## What the controls establish

Five frozen maps: stable, V2 unchanged, V2 plus **stud-only**, V2 plus **sensor-only**, and exact combined2d9c. variants.json records every source SHA256 and changed module. Stud-only contains the same four shared-solid replacements and assembly ordering as2d9c, without the new detector. Sensor-only moves just the left sensor; print remains old. Exactboth includes its print changes. The control does not separately isolate collider ordering from geometry.

Across **33 paired physical histories**, V2 and sensor-only have exactly equal sampled physical states; stud-only and exactboth also match exactly. Comparisons include p/v/spin, coil, phase/ball, ramp state and bat angles, while detector events/scores are intentionally separate. This is measured equality in these protocols, not a universal engine theorem.

**The release81 traversal loss follows the joint change, not the detector.** Stable, V2 and sensor-only complete all five upper-lanes/ramp timing traversals. Stud-only and both complete80 but fail81. Original tests and their preceding worlds are executed; no fresh-world substitute or altered assertion is used.

**The long-IN capture loss also follows the joint change.** At speeds.2/2/4/8, V2/sensor-only capture only speed2 (1/4); stud-only/both capture0/4. Sensor-only and both detect4/4, while V2/stud-only detect0/4 at that mouth. The detector repairs sensing without repairing physical capture. Old capture starts remain4/4 in all V2-derived controls. Stable old starts capture2/4 in this particular protocol; the new mouth coordinate is stable OUT, so its0/4 is not a like-for-like IN comparison.

## Before launch versus later ramp effects

The clean upper-lanes release81 pair remains bit-identical through tick81. Tick82, during initial capture and long before firing, first differs. Both poststep contact records show the unchanged tail capsule and floor, with slightly different normals/impulses. The old socket's analytical sphere gap at the shared pre-step state is−.00639548; the slender stud's gap is+.01829196. This geometry is consistent with a changed near-joint interaction, but **no old-socket impulse was observed in that poststep manifold**. CCD/substep contacts and ordering are not fully exposed; no solver bug or exclusive contact mechanism is claimed.

The difference survives settling. First coil at tick611:

- V2: speed31.71124358, aim−.60074957195, vx17.92512809, vz−26.15898990.
- Stud: speed31.71058479, aim−.60070565274, vx17.92360683, vz−26.15923367.

Those are outputs of the unchanged physical strike law on different incoming states, not force edits. At the first downward crossing of ramp-mouth Z1.1 (tick630), positions/velocities already differ. Stage1 occurs at tick642 for V2, tick660 for stud, with respective vz−22.89704 and−18.03614. V2 reaches rear stage2 at773 and completes at1139; stud rolls back and clears stage1 at828 without completion. Selected full states, spin, shots and contacts are in findings.json, with the two modest raw traces embedded. Common-state return recovery from the preceding packet cannot explain away this changed pre-launch/ramp sequence.

## Why one removed socket could help one route and hurt another

At long-mouth speed2 the first differing step is tick99. V2 directly records old-socket normal impulse.23214406, leaving vx2.84549/vz−.02230. Stud has no socket contact and leaves vx3.30596/vz.13505. First positive left-bat impulse follows at134 for V2 versus131 for stud:

- V2 incoming x−.948939/z4.026427, vx2.556864/vz2.249281, then eventual capture.
- Stud incoming x−.916918/z4.003191, vx2.891548/vz2.224522, then later crossing/drain without held capture.

The stud case arrives farther toward the tip and with more lateral speed. These values characterize this single fixture, not a universal capture threshold. The socket that spoiled the earlier wire-return fixture also helped redirect this particular long-IN approach. Removing its protrusion therefore does not preserve both routes by itself.

## Exact preceding-history scope

- **Upper-lanes:**28 preceding game worlds (1 structural +27 legal floor passes) in all variants. Release80 is ordinal28 and81 ordinal29 (zero-based). All preceding assertions pass.
- **Ramp:**15 preceding game worlds plus3 direct standalone Rapier fixture worlds in all variants. Release81 is game ordinal16. All preceding assertions pass. Standalone fixtures execute original code but are not counted by the game-world observer.
- **Physics:** stable reaches the timing test after245 game worlds; V2-derived variants after244 because the earlier old-OUT assertion aborts a loop. V2/sensor-only then fail recapture at80 and **never execute81**. Stud/both pass80 and fail81 before crest; stable passes all five. These are honest original-history outcomes, **not a matched81 counterfactual**. Assertions were not bypassed to manufacture the missing case.

Matching creation protocol/order does not make predecessor trajectories or internal solver states identical across different geometries. Only tests after the named target are not scheduled, so later work cannot affect the measured prefix. Node:test still runs original predecessor and target bodies with original assertion aborts. Observers read public states/contact manifolds; exactboth release81 shot matches the earlier uninstrumented failure. Full cache/substep history is not reconstructed.

## Grounded next design constraint, not an implementation

Keep sensing separate. A next local physical receiver/approach design must control the actual long-mouth arrival speed/direction/contact location while keeping the recovered wire-return swept volume clear. It must not recreate a projecting socket to save one fixture, tune bat force/keys, or use a detector award as evidence of capture. Compare continuous receiver/guide transitions against both incoming routes and all original timing histories, with visible/contact stock shared and a connected fastening/load path. The observed speed2 values are reference states, not invented pass limits. No new dimensions, geometry edits, extra broad experiment or adoption are made here.

## Reproduction and evidence

`node docs/pinball-experiments/left-joint-causal-controls/restore.mjs --verify-only`

`node docs/pinball-experiments/left-joint-causal-controls/restore.mjs --output artifacts/pinball/joint-causal-recovered`

From repository root, for each MODE stable/v2/stud/sensor/both:

`MODE=both FAMILY=upper-lanes node --import ./artifacts/pinball/joint-causal-recovered/loader.mjs --test web/js/pinball/upper-lanes.test.mjs`

Substitute FAMILY=ramp or physics and its matching test path. Physics executes the expensive original preceding90-launch/other histories; it is not a full54 audit. Long-IN:

`MODE=both node --import ./artifacts/pinball/joint-causal-recovered/loader.mjs artifacts/pinball/joint-causal-recovered/in-control.mjs`

After all modes/families: `python3 artifacts/pinball/joint-causal-recovered/analyze.py`.

Restore checks packet/vendor hashes and exact source maps, materializes archived test bodies through the loader (not production test edits), and refuses existing/frozen/production paths. Archived scripts in scripts/ are original experiment bytes; restored loader/instrument copies only switch test reads/hashes to the archived bodies. No scripts execute during restore. Use fresh output directories because diagnostic result writers overwrite matching filenames.

findings.json retains all outcome summaries and selected causal states. Four key raw gz traces are embedded; evidence-references.json preserves sizes/hashes/paths for all remaining artifact traces and original source/test evidence. No statement here upgrades199/212, long-IN0/4, natural27-versus61, or incomplete visual/reference work into acceptance. Secondary read-only bumper observations and an unimplemented proposal are explicitly separate in underboard-support-note.md.
