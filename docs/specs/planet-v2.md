# Planet v2: 50% bigger

## Scope

- Goal: a planet 1.5× the radius (R 10 → 15) with more to see and wreck, at a steady frame rate.
- Objects keep their size: cars, buildings, trees, planes. The extra surface gets more world.
- In: bigger radius, terrain features kept at today's size, 5 cities instead of 3, more hamlets,
  trees, boats, planes, balloons, clouds; orbits, moon and camera limits scaled; instanced traffic;
  destructible scenery (per building, house, tree).
- Out: new kinds of objects, biomes, day and night.

## Rules

- Everything that is a height above ground stays in absolute units (city plateau +0.32,
  sky ceiling +5). Everything that is a distance from the centre scales with R.
- Terrain noise frequency scales with R, so a mountain is the same size in world units.
- Counts scale with surface area (×2.25), rounded: trees ~3800, hamlets ~90, boats ~16,
  planes 8, balloons 8, satellites 8. Cities: 5, sized 3.4 / 2.4–3.0.
- Seeded: the same planet every load.
- Destroying a building, house or tree hides it at once and returns its footprint.
  Nothing is rebuilt during a run; quitting a game restores the scenery.

## Acceptance criteria

1. R = 15. A mountain and a city block measure the same in world units as before (±10%).
2. 5 cities, each with traffic on its ring road. No two cities overlap, none in the sea.
3. Orbit view: the whole planet fits at start, zoom reaches street level, and the camera
   never goes inside terrain or buildings (sampled at 200 random points).
4. Satellites, station and moon clear the atmosphere; planes and balloons clear the mountains.
5. Cars are instanced: traffic costs at most 10 draw calls, however many cars there are.
6. `destroy(building)` hides exactly that building; `restoreScenery()` brings all back.
   Same for a house and a tree.
7. Frame cost in full orbit view (baseline measured and recorded first): desktop High under 16 ms,
   phone emulation with 4× CPU throttle on Low under 33 ms.
8. All checks in tests.html pass. No console errors.
