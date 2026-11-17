# Candidate 7 full-suite regression diagnosis

Source is immutable git commit **96b1c3c**, read from a temporary archive. No runtime files or acceptance tests were changed. These probes deliberately reproduce injected fixtures; only the beginner launch probe uses natural controls.

## Upper target backing locally oscillating trap

- `candidate7-basic-probe.json`, slowrear: start (.07460439774345,.175,-5.53), velocity (-1,0,0), no save charges, neutral controls. At 60 s still playing at (-1.703533,.214183,-2.618244), velocity (-.595328,-.145622,-.528890).
- `candidate7-reactive-probe.json`, reactive1: natural launch .7583333333333333, 90 s of existing reactive logic then 60 s neutral. At 150 s still playing near (-1.687728,.216357,-2.598037).
- Contacts identify `loopContacts[4]`, upper-bank common support. This is a locally oscillating trap, not a low-speed stationary stop: velocity-only 3/5-second stop detection misses it. The rear-low/front-high support slope forms an uphill face in the direction of gravity, creating a local floor/plate depression. Triangulation quality must also be corrected; no claim that this diagnosis isolates numerical from geometric contributions.
- Neutral .758333 launch drains normally; the failed beginner fixture is the reactive branch.

## Earned side kickback path is blocked

`candidate7-sidekick-contact.json`: x=-2.10 charged fixture first touches the exterior curved loop wall at tick 34, ball (-2.10,.170656,.730098), incoming velocity (0,0,-7.81305). Contact point (-1.98411,.170656,.679442), `loopContacts[0]`. Next tick velocity is (-4.37167,0,-3.21794): the new curve sends the saved ball sideways toward the cabinet and removes the upfield speed it needs. Minimum z is -.2368 before normal drain. x=-2.14 and -2.17 also fail the existing z<-1 reach criterion.

The original OUT kickback path at x≈-2.1 must remain physically usable. A stronger kick or weaker assertion would hide the regression, not resolve it.

## Reproduce

Create a temporary archive of commit 96b1c3c including web/js/pinball and web/js/vendor. Set `PINBALL_SOURCE_ROOT` to that archive, then run basic-probe.mjs, reactive-probe.mjs or sidekick-probe.mjs. Output paths are explicitly /tmp/candidate7-*.json. Retire the temporary source archive afterward. Do not interpret a replay against modified physics as the same evidence.
