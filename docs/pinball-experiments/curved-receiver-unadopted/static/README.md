# Curved receiver static review

No production edit or dynamic simulation. The current reviewed dimensions are plan.mjs SHA256824163d6c3c9b0ee44a29c08c0716c40052ff7cbb241852c4e326d645e38ea4c. They are copied byte-for-byte into ../curved-receiver-eaf9be3/fixed-plan.mjs and the runtime source map.

Initial-plan.mjs and initial-static-audit.json preserve the failed retained-inner-end layout. Initial rail axis gap .255501 versus required ideal floor-height .296648: a real local pinch, not merely an invalid sample center. Initial-audit.mjs is the historical script byte copy; its relative plan import still names plan.mjs, so reproducing initial results requires resolving that import to initial-plan.mjs rather than running it against the revised plan.

The only approved dimensional correction changes the old inner end from(1.35,3.35) to a curve beginning(1.35,3.10), controls(1.35,3.145),(1.31,3.20), ending(1.27,3.20). The upstream(1.35,2.75) segment and support at3.10 remain. This moves the functional receiving boundary, not just an invisible obstruction.

Current actual bat/support audit:541angles from−.60 through+.48. Real contact bat minimum+.073642;8actual moving mesh convex envelopes minimum+.073611. These envelopes conservatively fill mesh holes. Their largest XZ radius is1.139101, so the nearest-sample rotational-displacement bound is at most .001140; conservative positive clearance remains for the inspected bodies (query numerical error separate). Independent midpoint-grid bound+.071491 is in ../curved-receiver-independent-eaf9be3. No claim about unmodeled bore/strength or all fixed underboard components.

Saved accepted capture spheres are queried, not repositioned or dynamically equilibrated. Example old rail gap−.00021886, new−.00027435; normals differ1.535°. The same accepted bat contact gap is−.001266. These contact-scale negatives are retained and not an assertion of exact equilibrium. Capture and rolling require a new engine comparison.

corridors.json records:
- S-approach IN sphere-center line against lower stock/supports, not all world obstacles;
- the INVALID same-parameter OUT tail midpoint, floor−.001641 and rail-height−.008392;
- accepted saved18 shot points repress+1..15, rail minimum+.015943, shaft+.232748;
- wire-end fixedXZ vertical column centerY.175..575, minimum+.024916 against new lower stock. This is not a ballistic path.

out-witness.json separately establishes a continuous piecewise-linear OUT clearance witness against finite capsules and cylinders. Sampled minimum minus half maximum neighboring point distance gives+.011709 atY.175 and+.006000 atY.22. It is an offline existence witness only. It is NOT embedded in the runtime, NOT a force, NOT a chosen natural ball route, and NOT a valid start for a dynamic fixture merely because it was calculated. The actual narrow pair surface gap is .28668544 versus ballD.270; the remaining .01668544 at rail height is not generous manufacturing/dynamic margin.

Reference artwork was re-viewed before this design. Its long, relatively straight bands remain a visual target; the66.48°S and outward tail may fail it. Installed images/mobile/budget and ordinary natural launch/IN/OUT tests are separate outstanding gates. No extra wall, teleport, trajectory reset, autoaim, force change or solver change was used in this review.
