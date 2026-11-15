# Isolated welded joint and confluence IN detector

Not adopted. Based on frozen V2 07a6cbc5fc9d4dce4ea1d40d859340c6b56c63e52a16d09fc9dc9380da9d9607. Production remains unchanged. Only four join-mount solids, left IN detector and its printing change from V2. Reference/stable/V2 pixels were inspected. This does not resolve the broad reference silhouette differences.

## Real assembly

The rail splice is a butt-welded joint, not a projecting socket. Its r.012 vertical stud intersects the existing r.020 rail at the splice axis (-1.741020996,.22,3.778770246), runs to Y-.19, and transfers load through a r.032 flush board bearing (Y .018..04), underside washer (r.032,Y-.15..-.14), and cylindrical retaining nut (r.022,Y-.178..-.15). Shaft and nut overlap, washer meets nut, and rail intersects shaft. The board itself connects bearing and washer. Threads, weld-bead microgeometry and strength are not simulated/certified. No new socket is rendered with its contact disabled. All four solids use the shared mesh/contact definition. Round meshes are 24-sided approximations of analytical cylinders.

The stud's ball-exclusion volume is NOT claimed to be contained in the old rail's volume. Static queries instead screen actual saved initial capture and return/recapture paths. All 23 histories clear these four solids; the worst <=.001-spaced piecewise-linear lower clearance estimate is approximately +.00450808. This is an interpolation model, not Rapier substep replay or proof for all possible trajectories. New contacts, collider ordering and sensitivity remain dynamic risks.

## Detector contract explicitly changed

Only the left IN detector moves to (-1.62,.20,3.55), after the observed long-IN/wire-return confluence. Half dimensions stay (.125,.20,.04); event key, collision-start semantics, 100 x multiplier, .16s cooldown and nondirectional behavior are unchanged. The matching visible .25 x .08 insert is centered there; IN legend and flow print follow the new long IN route. Right detector/printing unchanged. There is one left detector, not two overlapping awards or a whole-lane scoring area.

The recorded long-IN speed2 trace and actual left-return traces intersect it. The full sampled OUT centerline stays more than .209 from sensor/ball overlap; this is not every lateral position. High wire bypass is excluded only when ball center Y>.535; lower airborne arrivals can trigger just as the old .20+-.20 sensor allowed. Floor-only detection, all reverse/repeated crossing behavior, OUT extremes and new dynamics require explicit QA. Moving the detector is a layout contract change, not evidence that capture/refire improved.

## Static handoff

loader.mjs is the single candidate loader; baseline-loader.mjs pins the unchanged stable sources. manifest.json contains exact hashes. Run Node --import with either loader from repo root. static.mjs, verify.mjs and swept-check.mjs produce the retained static reports. All 54 shared parts map to actual meshes/colliders; right paths/mounts, LOWER_LAYOUT, old tail23 and retained old mounts are unchanged. OUT757 centerline points remain legal (worst +.03046434). No dynamic game steps or visual renders of this new candidate have been run here.

Inherited visible old mount/contact omissions, heel overlap, exposed frame crossheads, misaligned OUT printing and nonphysical save housing/direct impulse remain. No omitted-contact repair, physical save actuator or structural completion claim. No force/input/score-law edits, production/docs edits, expectation edits or installation. Dynamic same-state, actual ramp returns, IN/OUT/save, full regression, natural54 and visual/input QA remain required before adoption.
