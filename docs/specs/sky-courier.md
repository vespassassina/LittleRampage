# Sky Courier

A small game inside Little Worlds. You fly a delivery plane around the planet,
dropping parcels at towns before the clock runs out.

## Scope

- Goal: a two-minute arcade loop that uses the world that's already there.
- Audience: anyone, on a desktop browser.
- In: a Play button, a steerable plane, delivery targets, sky rings, a timer, a score, a best score, and start and end screens.
- Out, for now: touch controls, sound, hazards, levels.
- The sandbox stays as it is. The game is a mode next to it.

## Rules

- Arrow keys or WASD: left and right steer, up and down climb and dive. Esc quits to the sandbox.
- You always carry a parcel. A beacon marks the town it goes to; a HUD arrow points at it.
- Flying within 0.9 units (measured along the ground) of the beacon delivers the parcel. Score +1, the next town is picked, and time is added for the leg. The time allowance shrinks as your score rises.
- Flying through a ring adds 3 seconds. The ring then respawns somewhere else.
- The plane can't drop below the terrain or fly higher than the sky ceiling.
- When time reaches 0 the run ends. The best score stays in the browser.

## Acceptance criteria

1. Play shows the start screen. Start begins a run with time > 0, score 0 and a target that isn't the town under the plane.
2. Holding right for 1 s turns the heading clockwise, seen from above. Up raises the altitude, down lowers it, and both stay within the limits.
3. Reaching the target raises the score by 1, adds time, and picks a new target that differs from the old one.
4. Flying through a ring adds 3 s and moves the ring.
5. At 0 s the end screen shows the score and the best score. The best score is still there after a reload.
6. Esc, or Quit, returns to the sandbox with orbit controls working.
7. No console errors. The page still works at phone width, even without touch controls.
