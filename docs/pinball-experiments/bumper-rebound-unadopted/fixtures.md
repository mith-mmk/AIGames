# Isolated contact-strength fixtures

Runtime a1fb6bd; no runtime file edits. `node probe.mjs` from this directory's path runs15 fixtures, speeds6/12/24 for bumper/sling/wall/held/rising flipper. All target surface start gaps+.03. Each is a real PinballPhysics world, but ALL other colliders are removed and gravity zeroed to isolate the response. Original target geometry/material, ball mass/damping, hit/cooldown/coil logic and step remain. These are not natural play or whole-world legal-spawn tests. Held flipper is settled15ticks; rising begins from down pose. Saved `solver` observations are immediately after world.step, before hit(), and may precede actual restitution resolution because CCD detects the collision before the subsequent step.

Baseline outward velocity at tick9 (original incident surface normal):
- bumper6/12/24 ->5.9463/5.9463/5.9463.
- sling ->1.8421/4.7365/10.4813 (outward component, not total speed; radial kick is oblique to local face).
- wall ->1.6930/3.3860/6.7720.
- held flipper6/12 ->.9505/1.9009;24 detects contact but continues behind the bat and drains at tick5. Do not describe its final reset velocity0 as a rebound. First solver normal is near+Y and no coil fires; inspect saved trajectory. This elevated gravity-free fixture does not prove normal gameplay tunneling.
- rising flipper ->29.8154/28.9763/27.1727 outward; one coil each.

All15 have solver-contact detection; no blanket detection failure established. The bumper event occurs at tick0 while its postsolver velocity is still INWARD. Old hit logic replaces outward component with6 before later passive restitution can occur. Thus a lower-bound rule becomes a six-speed rebound in these CCD cases.

Parent-proposed diagnostic only: `CONTACT_OUT=bumper-candidate.json node --loader ./artifacts/pinball/contact-strength-a1fb6bd/bumper-loader.mjs artifacts/pinball/contact-strength-a1fb6bd/probe.mjs` from repo root. No shape/order change. target=max(6,-outward*averageRestitution), actual coefficient .56 for full bumper. Kick output6/6.7132864/13.4265728; nextstep latter two6.7065797/13.4131594, no second bounce increase observed. Tick9 results5.9462671/6.6531663/13.3063326. Mini bumper absent from current layout; no mini dynamic claim. Speeds<=24, cap32 not exercised. No full-suite/natural acceptance claim.

Files results.json/log.txt preserve baseline, bumper-candidate.json/log preserve diagnostic. Fixture records include pre-solver velocity, post-solver velocity, post-kick velocity, contact normals/counts, initial clearances, trajectory/phase and coil counters. Existing main remains untouched. Parent owns subsequent implementation and regression qualification.
