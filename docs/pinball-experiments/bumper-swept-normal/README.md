# Final checkpoint: A, B and C all unaccepted

Production physics unchanged. Gameplay takes priority; increased score is not used to hide reduced route reachability.

| Variant | Local refire | Full existing tests | Natural54 | Disposition |
|---|---|---|---|---|
| Stable |5/5 same ball retained|accepted baseline|54finish,61ramps,21ramp-reaching sessions|keep|
| A swept-normal/min6 |5/5|224/224|53finish,48ramps,14ramp-reaching sessions|unaccepted|
| B swept-normal/restitution-min6 |5/5|224/224|53finish,51ramps,12ramp-reaching sessions|unaccepted|
| C solver-first pending |5/5|not run|not run|low-speed powered minimum missed; unaccepted|

Both A/B cap cases are active .75/82 at180seconds, not stalls; stall/zeroScore/liveReset are0. Local refire80 initialramp0 is common to stable and candidates, retained in results. C has no explicit pending-state lifecycle for restart/reset/tilt, and no robust strategy for transient manifold disappearance. It is an artifact prototype, not production-ready. No further variants were run.

A/B full logs, parent helper6tests, final parent path diagrams and lint-current.log (exit0, three existingwarnings) are preserved. Parent owns commit/push. Later sections retain chronological reasoning; earlier 'not implemented/not tested' statements describe their original stage, not this final checkpoint.

---

# Bumper refire causal trace (artifact only)

Original archived refire-diagnostic control flow preserved: separate fresh baseline/candidate process,80..84 world creation order,500held/release/1200held/capture/45release/300held. Only read-only perstep/contact observations added. Candidate is the same prior .56 normal-restitution/min6 loader, not a new variant. No production modifications. Delays80 initial ramp0 in both;81–84 ramp1. All captures and all states before first differing bumper event match. Baseline5/5ball1playing at end; candidate5/5ball2ready.

First divergence is b2 at ticks1857/1858/1859/1860/1861, after refire. Not remote construction sensitivity. Detailed83:
- p(.2287000,.1705452,−1.8002883), v(4.3354888,≈0,−20.6266918).
- event radial n(.54732043,0,.83692315); manifold(.54732090,0,.83692276). They agree within1e−6. No radial/manifold direction discrepancy explains failure.
- incoming normal−14.890054, tangent−14.917881.
- old outgoing normal6; proposed8.338430. Both tangent−14.917880, spin unchanged by instantaneous kick. Tangential energy is NOT removed by either law.
- kinetic/mass222.128→129.272old /146.036candidate. Stronger normal response changes path, not merely ball speed along same route.
- event manifold has penetration−.11714595 and impulse0. Ball center radial distance.417854 vs sphere-expanded cylinder.535. Straight pre/post chord first entry is14.54% through step; its geometric entry normal(.369654,.929169) differs11.489°. This is an offline finite-chord cylinder intersection, NOT Rapier internal TOI, and does not prove an alternative reflection will survive.

Post-impact route83:
- old hits shooter divider7 at1876, b2 again1929 at(.5150,−2.2417), outgoing(5.9377,−.8797), then remains upfield aroundbase/targets; endball1.
- candidate hits divider7 plus ramp-related859 at1875, returns to b2 from a different side1927 at(.3434,−1.7515), outgoing(1.3433,6.7629) toward drain. Right flipper1357 contact2032 at(.526,4.718), then lastplaying(.01787,.16445,5.04651),v(−3.57966,−.67141,3.30323), normal drain/ball2. Left-only held test does not request right-flipper firing. This is a route/survival regression, not evidence of missing bumper detection.

Historical proposal at the initial causal-analysis stage (subsequently prototyped as C below): separate passive bumper restitution from powered skirt kick. A collision-start event with zero normal impulse and inward velocity should mark a pending bumper contact, not immediately replace incoming velocity using the already-penetrating endpoint radial. On actual compressive solver contact / confirmed outward rebound, apply the existing powered minimum6 only if needed using the contact normal. This lets the engine resolve passive reflection before the actuator's added energy, avoids hand-computing a late .56 bounce and avoids double restitution. Pending-contact loss, genuine low-speed activation, contact persistence and no repeated kick need explicit qualification. No force gain sweep, rescue, shot-specific threshold or invisible shape. It may still fail: current default CCD/contact response must be observed, and no alternative is approved from this analysis alone.

`baseline.json.gz` / `candidate.json.gz`: complete frames/events. `analysis.json`: all5 comparisons, normal/tangent energies, chord diagnostic and subsequent contacts. `diagnostic.mjs` now emits gzip to avoid repeated70MB raw traces; original bytes roundtrip-verified before raw duplicates were moved to Trash. `analyze.py` reads gzip. Reproduce with DIAG_OUT=fresh-name.json.gz; candidate adds --loader ./artifacts/pinball/bumper-refire-cause-20261116/loader.mjs. Scripts are artifact-only. At that initial stage there was no natural54/full regression of the proposed change; subsequent A/B and C results are recorded below. No human/realphone test is claimed.

## Parent-requested swept-normal controls (subsequent bounded comparison)

`swept-loader.mjs` keeps a pre-worldstep ball center. Only when start is outside and poststep endpoint inside the expanded bumper side-circle does it solve the first quadratic entry intersection. It uses that horizontal radial direction only if intersection fraction0..1 and crossing Y lies inside the actual cylinder's axial extent. Other cases retain existing endpoint direction; score/cooldown/event/input/shape/ball position are unchanged. This is finite-chord event-side geometry, not engine TOI or time-of-impact position correction. Curved/substep motion and cap contacts are not reinterpreted.

A `SWEEP_MODE=minimum`: swept direction with oldminimum6. B `SWEEP_MODE=restitution`: same direction with max(6,−incomingNormal×.56). Fresh processes preserve the original5-world diagnostic order. **A5/5 and B5/5 endball1playing**, versus old strengthened endpoint response0/5. Capture states remain unchanged; initial80ramp0 remains in every variant and is not hidden. These are not full functional gates or natural sessions. All five successful short refires do not prove general safety.

Outputs `swept-minimum.json.gz`, `swept-restitution.json.gz` and corresponding logs; `swept-comparison.json` includes exact first-impact events and outcomes. Reproduce with SWEEP_MODE, DIAG_OUT=freshname.json.gz and --loader explicit. The earlier pending-solver proposal remains unimplemented and is not combined with these two controls. No source edits/parameter search/extra variants.

## B natural54 gate: not adopted

Exact baseline physics e4fcfba635d2877265c2146f3acb2283786786b7d8f5984052a1946cf20aad92 and audit script76bb52baf38951264480d9b40e1436b6ff363de30107c781f7b6e1a48e4f1389 match previous natural baseline. Git diff a1fb6bd..04a4939 for physics/vendor/package/audit is empty. Baseline was reused, not rerun. B ran via SWEEP_MODE=restitution and explicit --loader with original54world order.

Old→B: finished54→53,stalled0→0,zeroScore0→0,liveReset0→0;score169700→169750,ramps61→51,bumper235→287,shots284→255,actualcoils815→781,kickbacks41→46,sideSaves3→6. No separate escape detector; cannot claim no escape. Parent separately reports full224/224; this does not erase natural tradeoffs.

Cap .75/82 is active ball3 at180seconds with10ramps/20controller shots/40coils and no saves. Old same condition ended58.93seconds with2ramps/4shots. It is not classified stalled and is not counted finished. In contrast .925/82 shortens172.08→52.67seconds,ramps8→0,shots20→3. Sessions with any ramp fall21/54→12/54. By delay44,49,60,66,68,69,80,82,84, successful powers out of6: old[2,2,1,1,1,2,5,6,1],B[1,1,0,0,0,0,5,4,1]. Fixed-controller session reachability is NOT a continuous aiming-window estimate.

B is unaccepted pending parent judgment. Direction-only A preserves old power and is a justified separate natural-control possibility, but no A natural run is claimed in this packet version. Gameplay-first means no automatic adoption from score, stronger rebounds, or all unit tests alone.

Full4 compressed refire traces are archived here (~10MB total) rather than raw140MB text. To reproduce, restore the scripts into a fresh artifacts/pinball directory at the same relative depth; keep original runtime hashes. Diagnostic world injections are unchanged historical fixtures, distinct from natural54 legal-input audit. No human/realphone play claim.

## Subsequent authorized A natural54 control

A ran exactly once, same script/order/default solver with SWEEP_MODE=minimum. A53finished/1active cap,0stall/zeroScore/liveReset,score188200,ramps48,shots252,bumpers301,actualcoils808,kickbacks36,sideSaves6. Cap is again .75/82,10ramps/20shots, not stalled. Ramp-reached sessions14/54, versusbaseline21 andB12. By delay A[2,1,0,0,0,1,4,6,0]. Thus direction-only change also reduces natural ramp reachability despite increased score; B's energy increase is not the sole cause. Neither A nor B is established as a gameplay improvement. Old full5 timing gates and these fixed-controller natural reachability measurements are different contracts. No thresholds were weakened. `natural-ABC-comparison.json` preserves exact aggregate and delay breakdowns. Parent owns acceptance; no production change/commit performed by this worker.

## C: solver-first pending contact (bounded follow-up, rejected)

At parent's later request, C was implemented ONLY as `order-loader.mjs`. It leaves score/visual-event/cooldown timing at original collision-start. Instead of immediate bumper impulse it queues that collider; after world.step/event handling, it requires a real manifold contactImpulse>0 and outward normal velocity>0 before applying minimum6 supplement. No position/shape/force gain/input/engine change. Pending removed on resolution or contact loss. Each attempted/resolved/lost state is recorded. No additional C tuning or full/natural gate followed.

C fixtures6/12/24: finalnormal speed3.32658/6.65317/13.30633. The6 case queued at tick0 with impulse0, then nextstep manifold disappeared after the engine rebound; it became `lost-without-kick`. Powered minimum6 was not delivered, so **C fails its low-speed actuator contract**.12/24 have nextstep compressive outward contacts6.70658/13.41316, supplement0, no duplicate boost. This exposes a public poststep observation gap: requiring the active manifold after separation can miss a legitimate resolved collision. It is not evidence that the engine failed to collide. No compensating stale-normal kick, timeout gain, or unchecked extrapolation was introduced to hide this failure.

Crefire5/5ball1playing, with81–84ramp1 and80oldramp0 retained. Firstrefire impact resolves nexttick using actual normal (83: .660638,0,.750705) and v(11.61098,−.03414,2.40563), extraimpulse0. This local survival does not supersede low-speed failure. C remains unaccepted and investigation stops here.

Parent reports **Afull224/224 and Bfull224/224**, both still unaccepted because natural reachability drops. Cfull/natural were not run. Final disposition: A/B/C all artifact-only, stable production unchanged. Future work would need a trustworthy resolved-contact/impulse history that survives transient manifold removal before a physically timed power kick can be qualified. No implementation of that additional design exists here. Parent supplies separate refire-paths.svg/png; those are not overwritten by this worker.
