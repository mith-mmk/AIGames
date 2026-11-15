# Stepped upper mount: analytic feasibility only

No new source or simulation. Full-height r.055 columns cause a confirmed natural.925 deflection and4 original regression failures. A new visible solid and matching contact must be designed together; shrinking only a collider is not proposed.

One proposed profile, at all8 unchanged bar endpoints:
- Low flange r.055, Y.005..06 (height.055,center.0325).
- Continuous stem r.020, Y.06..235 (height.175,center.1475).
- No separate top collar. The stem intersects the fixed bar endpoint volumeY.195..235; flange and stem meet directly atY.06. Load path is continuous geometrically; material strength, bore and fastener design are not certified.

Let ballR=.135, oldbar radius=.035,axisY=.23. At a bar endpoint its sphere-expanded XZ disk has radius B(y)=sqrt(.170²−(y−.23)²). A finite vertical cylinder expands to C(y)=r+sqrt(.135²−distance(y,[bottom,top])²), empty above/below that vertical reach. Comparing full XZ disks, not one horizontal ray, bounds every plan direction.

At numerical groundY.170, B=0.159059737206. New stem exclusion=.155; reserve=0.004059737206. At ideal groundY.175, reserve=0.005857079421. Hypothetical r.025 gives only0.000857079421 atY.175 and **-0.000940262794 atY.170**, so it is rejected for the specified band.

ForY.170..235 the stem exclusion is constant.155 and the old radius is smallest at.170. Above.235, the stationary minimum is atY0.254285714286, with reserve sqrt(.035²−.005²)−.020=0.014641016151. Above.370 the stem no longer excludes a ball center. Low-flange reserve is smallest atY.170: 0.025797357993; its exclusion disappears above.195. Thus the combined analytic reserve for allY>=.170 is **+0.004059737206**.

This is strict containment of added sphere-expanded support volumes inside the old capsule-expanded endpoint region. It does not promise identical solver contacts during penetration, correct behavior belowY.170, or natural trajectory equivalence. Real geometry must preserve these dimensions and use matching solid surfaces; stable routes and all original tests remain acceptance gates. No parameter sweep, strength compensation, scoring/force adjustment or sensor movement is implied.
