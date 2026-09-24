# Trains

Raised in the Sandbox UI polish backlog (docs/PLAN.md), 2026-09-23. Design pass done
2026-09-24 after a quick user check-in (rideable, single loop through all 5 cities).

## Scope

- Goal: a new rideable vehicle category, a train that runs a fixed loop touching all 5
  cities, so the planet feels less empty between cities.
- In: one closed track loop through all 5 cities; several trains running it, evenly
  spaced; instanced low-poly train visuals reusing the car-instancing pattern; a static
  track/rail mesh baked into the world at generation time; Train as a 5th Ride-menu
  category with the same arrow-key cycling the other 4 already have.
- Out (this first cut, revisit later if wanted): stations or stops, passengers, collision
  with cars/kaiju/anything else, more than one loop or line, adjustable speed/schedule.

## Route

- CITIES (index.html) is a fixed array of 5 hand-picked unit directions — not
  seed-randomized, so the route can be a fixed constant.
- Visiting order: **[0, 3, 1, 2, 4]`, then back to 0** (a closed loop). This is the
  nearest-neighbour tour computed from the actual angular distances between the 5
  city directions (`dot(a,b)` → `acos`): city 0 and city 1 are ~178° apart (almost
  antipodal), and city 3 and city 4 are ~173° apart — using either pair as a direct hop
  would send the track through a huge, directionally-undefined near-antipodal arc.
  Every other pair is ~89–95° apart. The [0,3,1,2,4] order uses only those short hops.
- Each hop between consecutive cities in the order is a **spherical (slerp)
  interpolation** of the two unit directions, sampled into N waypoints (pick N so
  consecutive waypoints are close together relative to terrain features — e.g. every
  ~2–4° of arc; tune for a smooth-looking curve without an excessive vertex/sample count).
- Elevation at each waypoint: `heightAt(dir) + lift`, where `dir` is the interpolated
  unit direction and `lift` is a small fixed constant (comparable to the city asphalt
  lift used elsewhere, e.g. `+0.01` to `+0.02`) so the rail sits just above the terrain
  surface, never clipping into it. This means the track follows hills and valleys
  between cities — it is not a flat disc like the intra-city car loops.
- Orientation along the track at a point: forward vector from the next waypoint (or a
  small step further along the parametrization), same `frameAt(pos, up, fwd)` helper
  already used for cars/boats/planes, with `up = dir`.
- Build a track-loop helper analogous to the existing `Loop` class (index.html) but
  3D-aware: store the sampled waypoints as 3D points (or unit directions + precomputed
  elevated positions), cumulative arc length in world units (chord distance between
  consecutive elevated points, not angular distance), and an `at(s)` that returns an
  interpolated **position** (not a 2D pair) by finding the enclosing segment and lerping.
  This is a new small class, not a reuse of `Loop` (whose 2D pair-interpolation only
  makes sense inside one city's flat tangent-plane map).

## Track visual

- A static rail bed, built once at world-generation time and merged into the existing
  `world` Batch (same pattern as the dashed lane markings and city blocks) — so it costs
  no extra draw calls at render time.
- Keep it simple: a thin box/strip geometry oriented along the track direction at each
  sample (like the existing `DASH` road-marking boxes), repeated along the full sampled
  route, in a rail-like colour distinct from roads. Periodic cross-tie/sleeper marks are
  a nice-to-have, not required for this first cut — a plain rail-coloured strip is an
  acceptable minimum if time is short; note in DECISIONS.md whichever you ship.

## Trains themselves

- 3–5 trains (pick one, e.g. 4), evenly spaced around the loop (`s = total * k / n`),
  each a locomotive plus 1–2 carriages — reuse the *pattern* of `initCarInstancing` /
  `addCarInstance` (one shared `InstancedMesh` per part, one shared ink-outline mesh per
  part, `setMatrixAt` each frame) but with new, train-shaped low-poly box geometry (a
  longer, boxier body than a car; simple rectangular carriages trailing behind at a
  fixed arc-length offset along the same track loop). A sensible pool size bound, e.g.
  `MAX_TRAINS = 8`.
- Movement: constant speed along the track loop's `at(s)` parametrization, `s += speed *
  dt`, wrapping via the same modulo pattern `Loop` already uses. Pick a speed so one lap
  takes roughly 60–120 seconds at the default (mid) planet size — note the actual number
  chosen in DECISIONS.md. Speed does not need to change with planet size for this first
  cut (out of scope: full re-derivation of train speed from R — leave as a fixed
  constant, or scale simply with R if it's a one-line change, coder's judgement).
- Each train gets a phantom `Object3D` descriptor (same chase-camera contract as
  `addCarInstance`'s return value: position/quaternion kept in sync with the instance
  matrix every frame) and is pushed to `vehicles.train`.

## Ride menu

- Add "Train" as a 5th option in the Ride submenu (Plane / Car / Boat / Space / Train),
  same button-group/data-attribute pattern the other four already use.
- `vehicles.train` plugs into whatever generic "ride this category, arrow keys cycle
  instances, wrapping at the ends" logic already drives car/boat/plane/space — this
  should need no new category-specific code beyond registering `train` alongside the
  other keys, if the existing code is already generic over `vehicles[mode]` (check
  before assuming — if the existing logic hardcodes the 4 categories anywhere, that's a
  small refactor, not a redesign).

## Acceptance criteria

1. A closed rail loop exists connecting all 5 cities in order [0,3,1,2,4]→0; sampled
   points along each hop lie on (or acceptably close to) the great-circle arc between
   the two endpoint city directions.
2. The track follows terrain height: at several sampled points along the route, the
   train-loop's elevation at that point is `heightAt(dir) + lift` (within a small
   tolerance), not a flat/disc height.
3. A static rail-bed mesh is visible along the full route, added to the existing `world`
   Batch (no new draw calls at render time beyond what buildCity's road markings already
   cost).
4. N trains (pick 3–5) run the loop continuously, evenly spaced, looping back to s=0
   after s=total without a visible jump (position at s=0 and s=total match).
5. Train is a 5th Ride-menu category. Selecting it rides a train (chase camera, same
   contract as the other 4). Arrow keys cycle to the next/previous train instance while
   riding, wrapping at the ends, following the same mode-guards (`mode === 'orbit'` and
   `G.active`) the existing Ride-menu arrow handler already has.
6. All existing tests in tests.html still pass (no regressions). New tests cover 1–5
   above.

## Non-goals (explicit, for this first cut)

Stations/stops, timetables, passengers, collision with cars/kaiju/scenery, more than one
line, planet-size-aware speed/track regeneration (if `LW.size.set()` resizes the planet,
it is acceptable for the train track to become visually inconsistent — a full P2-scope
item, not blocking this spec — but note this gap explicitly in DECISIONS.md, do not
silently ignore it).
