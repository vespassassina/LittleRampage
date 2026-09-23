# Plan

Build order, per [ROADMAP.md](ROADMAP.md): F1 → P1, P2 → R2 → K1–K4.
Epics are grouped by game, not by order; the milestone tag on each sprint says when it runs.

## Epic: Sky Courier ([spec](specs/sky-courier.md))

### Sprint 1: playable loop (keyboard), done 2026-09-23
- [x] Player plane flies on the sphere with steering and altitude (AC 2)
- [x] Targets, beacon, HUD arrow, delivery and time bonus (AC 1, 3)
- [x] Rings (AC 4)
- [x] Timer, end screen, best score (AC 5)
- [x] Play, Quit and Esc switch modes cleanly (AC 6, 7)

### Sprint 2 (not started)
- [ ] Touch controls: drag to steer
- [ ] Sound effects
- [ ] Hazards, for example storm clouds that slow you down

## Epic: Sky Raid ([spec](specs/sky-raid.md))

### Sprint 1: training round, done 2026-09-23
- [x] One flight core for both games; Courier ACs still pass (AC 8)
- [x] Play Sky Raid button, start screen, raid HUD (AC 1)
- [x] Guns: pooled shots along the heading, range limit (AC 3)
- [x] Training balloons, arrow to the nearest, pop scores 2 (AC 2)
- [x] POP and BOOM bursts, pooled (AC 2, 9)
- [x] Training done: panel for now, wave 1 in sprint 2

## Epic: Foundations ([spec](specs/foundations.md)) — milestone F

### Sprint F1: ready to publish, done 2026-09-23
- [x] tests.html runner; Courier and Raid checks moved into tests/ (AC 1)
- [x] Three.js and the Bangers font bundled; no external requests (AC 2)
- [x] Touch layer: joystick and action buttons; Courier and Raid on touch (AC 3)
- [x] Quality switch, auto and manual, remembered (AC 4)
- [x] Frame-cost check, desktop and throttled phone (AC 5)
- [x] Metadata, share image, favicon (AC 6)

### Sprint R2: the fight — milestone 2, after P1 and P2
- [ ] Enemy planes chase, shoot; lives, blink, end screen, best score (AC 7)
- [ ] Waves with rising speed, count and fire rate (AC 6)
- [ ] Guns hit civilian planes; bombs hit cars and boats and buildings; respawn and restore on quit (AC 4, 5, 8)
- [ ] Retune for the bigger planet: balloon spread, enemy spawn distance
- [ ] Bomb button on touch; checks in tests.html (AC 10)

## Epic: Planet v2 ([spec](specs/planet-v2.md)) — milestone 1

### Sprint P1: bigger and still fast
- [x] Measure and record the frame-cost baseline, desktop and phone (AC 7)
- [x] Instanced cars, same look, same routes (AC 5)
- [x] R = 15, terrain frequency scaled, heights kept (AC 1)
- [x] 5 cities, spaced, off the sea (AC 2)
- [x] Camera limits, start view, orbits, moon, atmosphere scaled (AC 3, 4)
- [ ] Courier and Raid checks pass (AC 8)
- [ ] Quality auto-switch checks made behavioural: feed slow frame times, expect Low; fast, expect High (F1 review)

### Sprint P2: fill it and make it breakable
- [ ] More hamlets, trees, boats, planes, balloons, satellites, clouds by area (spec rules)
- [ ] Destructible scenery: per-building, house, tree ranges in the batches; destroy and restore (AC 6)
- [ ] Frame-cost check at full view (AC 7)

## Epic: Kaiju ([spec](specs/kaiju.md)) — milestone 3

### Sprint K1: a giant that walks and smashes
- [ ] Play Kaiju, start screen, one kaiju (Scalezor) (AC 1)
- [ ] Walk on the sphere, terrain following, sea rules, kaiju camera (AC 2)
- [ ] Stomp and swipe on destructible scenery and traffic; dust, POW, score (AC 3)
- [ ] Quit restores everything (AC 9)
- [ ] Kaiju on touch: joystick walk, Stomp and Swipe buttons (AC 11)

### Sprint K2: eat and survive
- [ ] Health, energy, drain, HUD bars (AC 5)
- [ ] Tiny people: instanced, walk the sidewalks, flee from the kaiju (AC 6 part)
- [ ] Eat: reach, nearest edible, GULP burst, restore table (AC 4)
- [ ] Roar and cooldown (AC 6)
- [ ] Eat and Roar buttons on touch (AC 11)

### Sprint K3: the army
- [ ] Heat from score; police cars chase and fire (AC 7)
- [ ] Tanks roll out and shell (AC 7)
- [ ] Jets strafe with missiles (AC 7)
- [ ] End screen, best score (AC 8)

### Sprint K4: a roster of monsters
- [ ] Bonkers and Shellback with their traits; Random with variations (AC 1, 7, 10)
- [ ] Balance pass and frame-cost check at heat 4 (AC 10)

## Later
- Frame-cost spot-check on a real low-end phone once the app is deployed (F1 review: AC 5 used a ×4 estimate on one machine)
- Sound effects
- World randomizer: a Generate button rerolls the planet from a seed; the seed is shown
  and editable, so the same seed reproduces the same world. The seed drives all layers
  of the generation (terrain, cities, forests, etc.), not just one.
