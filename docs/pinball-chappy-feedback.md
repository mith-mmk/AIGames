# Chappy event animation and sound

Chappy now has rigid head/torso/shoulder pivots. Launch gestures lift the wrench, contacts prompt a nod, mission/multiplier milestones celebrate, TILT warns, and drain/game-over responses settle back. The original 39,420 vertices and neutral shape are preserved (floating-point rebasing deviation below4e-8); the wrench remains attached to the hand. Idle is playing-only, pause freezes poses, restart resets, and prefers-reduced-motion suppresses motion. On narrow screens the friend moves behind the cabinet onto a supported stool so reactions are not cropped off the side bench; desktop placement is unchanged.

Ten short synthesized WebAudio effects cover launch/flippers/bumper/sling/target/mission/multiplier/TILT/drain/game-over. There are no external sound assets or autoplay. A real input gesture is required to create/resume AudioContext. The visible sound toggle persists mute where storage permits. Mute/pause/visibility loss stops voices. A maximum eight voices, per-type throttles and a .13 master gain bound overlapping sounds. Unsupported WebAudio/storage fails without breaking the game.

Presentation reads the existing accepted hits and game snapshots once; no physics/scoring changes. Contacts are coalesced by type per frame, so very fast simultaneous hits can share one sound. The first asynchronous unlock deliberately does not queue stale sounds.

Validation:115/115 pinball tests, final12 focused sound/feedback/animation/room tests and scoped ESLint passed. Real Chrome keyboard/touch browser checks verified no context before trusted input, actual launch reaction, pause freeze/resume, real bumper contact and a nonzero audio waveform (peak about.071), mute persistence after reload, narrow-screen toggle and reduced-motion neutral pose. Built-game smoke verifies game progression/controls/context restoration. Independent review found no release blocker. No human sound-quality listening or physical iOS device test is claimed.

Final render budget: desktop565calls381751triangles, mobile546calls384467triangles; 590physics colliders unchanged. Headless90-frame rAF median16.7ms/p95at most16.8ms is not physical-phone GPU evidence. Mobile Chappy is deliberately small and behind the board, preserving playfield visibility.

Evidence: artifacts/pinball/feedback-browser-evidence.json, chappy-launch-reaction.png, feedback-mobile.png, parts-feedback-final-*; reproducible scripts/pinball-feedback-browser.cjs.
