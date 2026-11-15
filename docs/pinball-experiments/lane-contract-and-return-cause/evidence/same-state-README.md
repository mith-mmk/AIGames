# Same-state join-socket counterfactual (diagnostic only)

The counterfactual succeeds locally: old and v2 with only the join socket disabled regain a held-left cradle and actual coil refire; unchanged v2 drains. This is NOT an adoption proposal. Its deliberate visible/contact mismatch is unsuitable for production.

## Reproduction and state
Run control.mjs with baseline-loader.mjs / loader.mjs from ../../left-lane-prototype-c87f117/v2-frame192-240 (paths relative to this directory). Pass baseline, candidate, candidate-socket-disabled respectively. Run from repository root with Node --import and the full artifact paths.

The measured common state is baseline-lower-81.json rows[1122].after: lower-layout fixture delay81, after ramp/wire return, NOT a natural-launch sample. Position (-1.69464314,.41804704,3.17718673), velocity (.36421376,-5.34397697,2.90517735), spin (19.94193077,-2.03688216,-9.01494217). Execution order: baseline, candidate, candidate-socket-disabled, each a fresh process and one world. Each first launches and holds left for 30 ticks (0.25 s), then restores identical measured p/v/spin and public time/ramp counters. Bat angles are .48 and 3.74159265359 with identical recorded body rotations. Initial all-solid surface clearance is +.014393293 / +.014393273 / +.014393273. No initial overlap was found.

Hold left for up to 900 ticks (7.5 s); if still playing, release45 ticks (.375 s), then hold300 ticks (2.5 s). Each run has zero live resets. Old/disabled remain playing in a stationary left cradle, positions differing by only about .00000251. Both then record actual coilImpulses [1,0] and reach upstream minZ -2.36854482 / -2.29931927. Candidate drains normally to ready, contacts both bats [1,1], no coil impulse. Exact values are in summary.json.

## Contact and first divergence
Candidate and disabled states are exactly equal before tick19. After tick19 v2 velocity is (2.05505657,.00000589,2.28257155), versus old/disabled (.63072759,.00000638,3.52592134). The poststep manifold at this tick exposes floor plus the unchanged diagonal rail with zero rail impulse, not the transient socket impulse. Do not invent a socket normal or claim CCD-internal proof from this sample.

At tick20 old and disabled share the exact same diagonal-tail rail normal (.41195509,-.34219810,-.84450781) and normal impulse .343827188; v2 reaches that rail already redirected and impulse is .135537669. First left-bat contact is tick59 old/disabled, impulse .201695666, incoming vx2.10483599/vz1.36513412; v2 tick51, impulse .228749633, incoming vx2.57407165/vz1.47746348. Raw normal convention and flipped fields are retained.

Only collider1435, the finite join socket at (-1.74102104,.22,3.77877021), radius .04 and halfheight .02, was disabled. Combined with the separately recorded ordinary paired return's positive socket impulse .173054382 (lower81) and .163873777 (physics81), this isolates that socket as sufficient to change this particular return outcome. Tail approach diverges after the socket, rather than requiring an independently changed old tail to explain this controlled case.

## Limits
The snapshot does not reproduce prior event history, contact cache, warm starts, or full original test-file/world order. Matching public state is not a determinism guarantee. The old and disabled later trajectories are not identical. This does not explain all natural54 ramp losses (61 to15), establish safe geometry, or qualify gameplay. No new dimensions, production edits, expectation changes, or real-device/human tests were performed. Parent paired traces and their original manifest remain preserved.
