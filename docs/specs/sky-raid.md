# Sky Raid

A second game inside Little Worlds. You fly a fighter plane. First a training
round: pop target balloons. Then the fight: survive waves of red enemy planes
that shoot back, and shoot or bomb civilian planes, cars and boats for points.
Each wave is harder than the last.

## Scope

- Goal: an arcade fight loop over the existing world.
- Audience: anyone, on a desktop browser.
- In: a Play Sky Raid button, a training round, guns, bombs, cartoon explosions, enemy waves,
  lives, a score, a best score, and start and end screens.
- Out, for now: touch controls, sound, power-ups, boss fights.
- Sky Courier and the sandbox stay as they are. Both games run on the same flight, camera, HUD and panel code; only the rules differ.
- Tone: comic, not gory. A hit shows a "BOOM!" burst and ink smoke. Nobody is shown hurt.

## Rules

- Flight is the same as Sky Courier: ← → steer, ↑ ↓ climb and dive, Esc quits.
- Space fires guns: tracer shots straight ahead. They fly 4 units, then vanish.
- B drops a bomb. It falls to the ground and blows up everything within 0.35 units.
- Training: 8 red-and-white target balloons float near the start town. The HUD arrow
  points at the nearest one. Popping one scores 2. Nothing shoots back and there is no clock.
  When the last one pops, the fight starts.
- Fight targets and points: enemy plane 10, civilian plane 5, boat 3, car 1.
  A destroyed civilian respawns after 20 s, so the world never runs empty.
- Waves: wave n has n + 1 enemy planes. They spawn out of sight and chase you.
  The HUD arrow points at the nearest one. When one is roughly ahead of you it fires
  a slow red shot that you can dodge. The next wave starts 3 s after the last enemy falls.
- Difficulty per wave n: enemy speed 1.2 × (1 + 0.08 n), capped at 2.0 (the player flies 1.8);
  time between enemy shots 3 s / (1 + 0.15 n), at least 0.9 s.
- You have 3 lives. An enemy shot or a crash into an enemy costs one,
  followed by 2 s of blinking with no damage. Training can't cost lives.
- The run ends when your lives reach 0. The best score stays in the browser.

## Acceptance criteria

1. Play Sky Raid shows the start screen. Start begins training: 8 balloons, 3 lives, score 0, no enemies.
2. A shot reaching a training balloon pops it: +2, a POP burst. The last one ends training and starts wave 1 with 2 enemies.
3. Space spawns a shot moving along the plane's heading. It disappears after its range.
4. A shot that reaches a civilian plane destroys it: +5, a BOOM burst, hidden,
   back on its route after 20 s.
5. A bomb dropped over a car or a boat destroys it and scores its points.
   A bomb on empty ground scores nothing.
6. Killing every enemy in a wave starts the next wave: one enemy more, faster, firing more often.
7. An enemy shot hitting you costs one life and gives 2 s of invulnerability. At 0 lives
   the end screen shows the score, the wave and the best score. The best score is still there after a reload.
8. Esc or Quit returns to the sandbox. Every destroyed civilian is back.
   Sky Courier still works.
9. No console errors. Shots and bursts are pooled: the scene's object count is the same
   before and after a long burst of firing. (A draw-call cap was dropped: the sandbox
   already draws about 785 calls in the full orbit view.)
