# v24 collector completion: legal-input proof

Source under test: runtime commit `0dfa50e`, before the additional loop geometry. No runtime or scoring changes were made for this proof. This is an automated simulation proof, not a human playtest or a browser/phone replay guarantee.

## Successful sequence

The first five complete games reproduce the earlier audit's world-allocation history. Each game uses a newly created relaxed world, legal launch calls, and both flippers held for 24 ticks of each 72-tick period at 120 Hz. Powers/phase offsets are `(0.55,0)`, `(0.55,17)`, `(0.55,41)`, `(0.75,0)`, `(0.75,17)`. Games end naturally; nothing is injected, repositioned, rescued or awarded by the controller.

The sixth game starts at power 0.75, phase offset 41. The three distinct right switches are reached at 10.2167 s (target 1), 30.3250 s (target 2), and 58.1083 s (target 0). This lights the collector on ball 2. Keep the same pulse pattern until the next legal launch, then use power 0.55 and reset the pulse clock relative to that launch with phase offset 8. The ball enters the scoop at **74.375 s on ball 3**. The actual game rule awards **1000 points**, arms **one left save**, resets all three target lamps, and records collection 1. A further second of neutral controls verifies that the same ball leaves its timed hold.

`v24-collector-completion.json` contains every launch and every flipper-input transition across all six games, relevant accepted physical events, and the post-reward state. Between input records, retain the previous flipper state and step at 1/120 s. A transition's tick is local to its game; event times are also local because these are separate worlds. The script is an executable regression check: it asserts the reward, reset, save and same-ball release, not just a score screenshot.

## Reproduce against the correct source

The completion runner imports current source by default, but its recorded acceptance belongs specifically to `0dfa50e`. Later loop geometry changes the trajectories and requires a new proof. Do not claim its v24 result as a pass against changed physics.

```
mkdir -p /tmp/pinball-v24-check
# From this repository:
git archive 0dfa50e web/js/pinball web/js/vendor | tar -x -C /tmp/pinball-v24-check
PINBALL_SOURCE_ROOT=/tmp/pinball-v24-check node docs/pinball-experiments/collector/v24-collector-completion.mjs /tmp/v24-completion.json
```

Retire the temporary checkout after use. No copy of the historical runtime is committed with this evidence.

## Important limitation: world creation order

A fresh, first world using only power 0.75/offset 41 reached two targets, not all three. Preserving the five preceding full games made the sixth-game sequence repeatable, including a separate clean-process replay with only the successful final setting (the failed search candidates are unnecessary).

A browser normally creates one physics world and calls Restart on it rather than allocating six worlds. A separate legal Restart-only attempt using the same six power/phase settings is saved as `v24-same-world-attempt.json`: it reached three lit targets but did **not** collect the lit reward. Its final game ended before a later launch could use the successful power-0.55 strategy. Therefore this proof establishes physical/rule reachability with its complete setup, **not** a player-ready recipe for the ordinary single-world browser session. A fresh-world or ordinary-Restart strategy and a new-loop completion remain separate acceptance work.
