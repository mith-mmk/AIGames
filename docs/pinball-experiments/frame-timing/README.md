# Bounded low-frame-rate simulation timing candidate

Base: 02d23a3. This is not a rebound-strength change and is not deployed.

## Reproducible defect

The application limited wall-clock dt to 50 ms although physics already permits
100 ms and advances in fixed 1/120 s steps. Over two wall-clock seconds, 15 fps
therefore supplied 1.5 seconds and 10 fps supplied 1 second to physics. The
candidate supplies 2 seconds at both rates, without changing physics constants,
collision shapes, impulses, scoring or layout. At 20 fps and above, supplied dt
is identical. Long stalls remain bounded to 100 ms, not unbounded catch-up.

Short presentation effects retain their existing 50 ms cap. This deliberately
limits scope; presentation time below 20 fps is still slower than wall time.

## Verification and limits

The four frame-time tests pass, including real PinballPhysics elapsed time,
reset sentinel, invalid/reversed timestamp, high-frame-rate jitter and the
long-stall bound. Focused ESLint passes. Full regression result is recorded
separately when available.

Cloud Chromium launch failed with `socket() failed: Operation not permitted`.
No browser playability claim is made. This is not proof that the user's device
has low fps, nor a verified remedy for weak contact feel. It does not improve
input sampling frequency: input is sampled per rendered frame and reused during
catch-up. Below 10 fps, elapsed time is still intentionally discarded. Browser
checks of low-fps input, restart/pause/visibility and desktop/mobile viewport
remain required before publication. Existing rejected rebound candidates remain
rejected; their ramp regressions are not bypassed by this candidate.
