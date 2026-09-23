# Kaiju mode

You are a giant monster, as tall as a skyscraper. Wreck as much as you can before
the army brings you down. You are very tough, but not forever.

## Scope

- Goal: a rampage game on the same planet: walk, smash, eat, survive.
- Audience: anyone, desktop browser first.
- In: three kaiju with random variations, walking on the sphere, stomp, swipe, eat, roar,
  health and energy, destructible scenery, people who flee, an army that escalates
  (police cars, tanks, jets), score, best score, start and end screens.
- Out, for now: touch, sound, atomic breath, multiplayer, kaiju vs kaiju.
- Tone: comic. Hits show POW and dust clouds. Eaten things vanish with a GULP! burst.
  People are tiny cartoon figures; nobody is shown hurt.

## Kaiju

Chosen on the start screen, or Random. Each run randomises colours, spikes and size (±10%).

| Kaiju | Build | Speed | Health | Swipe | Special trait |
|---|---|---|---|---|---|
| Gorzilla | lizard, tail, back plates | 1.0 | 100 | tail, wide arc behind | balanced |
| Bonkers | giant ape | 1.3 | 75 | fists, strong, narrow | eats faster |
| Shellback | spiky turtle | 0.7 | 150 | shell spin, all around | takes half damage from tanks |

Height about 1.8 units, the tallest towers are about 2. Speed 1.0 = 0.7 units/s.

## Controls

- ← → or A D: turn. ↑ ↓ or W S: walk forward and back.
- Space: stomp. Wrecks everything within 0.5 in front of the feet. Costs 5 energy.
- F: swipe. Wrecks everything in the kaiju's arc (see table). Knocks down low planes. Costs 10.
- E: eat. Grabs the nearest person, car, tank or low plane within reach (1.0) and eats it.
- R: roar. People scatter, the army stops firing for 3 s. Costs 15, 10 s cooldown.
- Esc: quit.

## Rules

- **Health** 100 (per kaiju). Police shots −0.5, tank shells −3, jet missiles −5.
  At 0 the run ends.
- **Energy** 100. Moves cost energy. It drains 1 per second. With no energy left,
  moves are off and health drains 2 per second.
- **Eating restores energy**, and a little health: person +3, car +8, tank +15, plane +20.
  Health +¼ of that.
- **Score**: building 10 per unit of height, house 5, tree 1, car 5, police car 10,
  tank 25, plane 40, windmill 15. People: 0 for eating (eating is survival, not score).
- **Heat** rises with the score and sets the army:
  - Heat 1 (start): police cars drive at you and fire pistols.
  - Heat 2 (score 500): tanks roll out from the city edge and shell you.
  - Heat 3 (score 1500): jets make strafing runs with missiles.
  - Heat 4+ (every 1500 more): more of everything, faster fire.
- The kaiju can wade into shallow sea at half speed; deep sea turns it back.
- The run ends when health reaches 0. Score, time survived, heat reached and best score
  are shown. Best score kept in the browser.

## Acceptance criteria

1. Play Kaiju shows the start screen with the three kaiju and Random. Start drops the chosen
   one at the edge of a city with health and energy full, heat 1, score 0.
2. Walking moves the kaiju along the surface and it stands on terrain, never floats or sinks.
   The camera keeps the kaiju and what's in front of it in view, never inside a building.
3. Stomp in front of a building destroys it, scores 10 × height, shows dust and POW.
   Swipe destroys everything in its arc and nothing outside it.
4. Eat within reach removes the nearest edible thing and restores energy and health by the table.
   With nothing in reach, eat does nothing and costs nothing.
5. Energy drains over time. At 0 energy moves do nothing and health drains.
6. Roar makes people run and stops army fire for 3 s; a second roar within 10 s does nothing.
7. Crossing a heat threshold spawns that unit type. Tank shells and missiles cost the right health.
   Shellback takes half from tanks.
8. At 0 health the end screen shows score, time, heat and best. Best survives a reload.
9. Esc or Quit returns to the sandbox with all scenery and traffic restored.
   Sky Courier and Sky Raid still pass their checks.
10. Two Random runs give different-looking kaiju. No console errors. Frame cost at heat 4
    stays under 16 ms.
