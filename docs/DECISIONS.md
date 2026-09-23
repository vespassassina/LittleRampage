# Decisions

Newest first.

## 2026-09-23 — P1 final: quality auto-switch tests made behavioural

- **Rewrote quality auto-switch tests to be behavioral, not structural.** The F1 auto-switch tests only checked that the API exists and returns the right types; they didn't actually feed frame times and assert that quality changed. P1 task required tightening these into real behavioral checks: feed slow frame times (>25ms avg) after 3+ seconds elapsed, and assert `LW.quality.get()` switches to 'low'; feed fast frame times and assert it stays/returns to 'high'.
- **Six new behavioral tests added** to `tests/quality.js`:
  1. Auto-switch triggers low when receiving slow frames (30ms) after 3s elapsed
  2. Auto-switch does not trigger with fast frames (10ms)
  3. Auto-switch respects the 3-second elapsed-time gate (does not fire before 3s, even with slow frames)
  4. Auto-switch only engages once per session (no re-trigger after first engagement)
  5. Realistic scenario: slow frames trigger, then fast frames follow (verifies no automatic revert)
  6. Boundary condition test: frame time exactly at 25ms vs 25.1ms (ensures > 25, not >= 25)
- **All existing tests kept.** The existing structural tests (API exists, shape checks, flag presence) are still valuable as smoke tests; behavioral tests layer on top, not replace them.
- **Full suite: 57/57 passing** (51 existing + 6 new). No console errors. Ready for merge.
- **Method note:** Tests reset `auto.enabled` and `auto.elapsed` between cases to isolate each scenario (simulating fresh frame times from different points in the session). This is acceptable for unit testing auto-switch logic; the real rAF loop's accumulated timing is tested separately by manual/integration checks.

## 2026-09-23 — P1 AC8: Courier and Raid checks pass at R=15 - verified, not retuned

- **Re-verified Sky Courier and Sky Raid gameplay against the bigger planet** (R=15,
  5 cities, hamlets unchanged): played both live through the LW test API (Playwright,
  driving real `LW.frame(dt)` steering, not just reading numbers) rather than trusting
  the existing automated checks alone. Full suite was 49/49 green with no console
  errors before starting, confirming nothing was already broken.
- **Sky Courier: no retuning needed.** `newLeg()`'s time bonus is `dist / SPEED *
  factor + 4`, where `dist` is the angle to the next town times `G.alt` (not `R`) -
  so it already scales with real travel distance, R included, with no code change.
  Measured every real leg of a 30-delivery run (teleport-to-target trick, same one
  `tests/courier.js`'s existing delivery test uses, so each `newLeg()` call fires for
  real): bonuses ranged 13-47s against arc distances of 7.9-46.6 units (the planet's
  full min/max town-pair spread). Then flew the single worst-case leg for real -
  Pop Town to Zap City, 46.6 units, the longest possible delivery on the whole planet -
  with actual steering (proportional turn toward the HUD bearing, no teleporting):
  delivered in 30.3s, comfortably inside the ~40s+ bonus that pair grants. The spec's
  "a run always ends" claim rests on the score-based shrink hitting its 1.15 floor and
  turning drag costing more than the formula's built-in ~15% + 4s margin - true at
  R=10 too, not a P1 regression, so left alone; noted here in case a future sprint
  wants to look at it.
- **Sky Raid: no retuning needed.** `placeBalloons()` spreads the 8 training balloons
  by a fixed angle (0.12-0.54 rad) around the start city - angle-based, not
  distance-based, so it didn't need R-awareness to begin with. At R=15 that puts the
  farthest balloon 9.2 units from the start position (was proportionally closer at
  R=10, since arc length = angle x R). Flew a real chase (steer + climb/dive + fire,
  no teleporting) against that farthest balloon: popped in 5.4s. Trivial.
- **Added two regression tests** rather than leaving this as a one-off finding, since
  both mechanics scale with R and a future resize (P2, or later) could silently break
  either: `tests/courier.js` now asserts every leg's bonus exceeds the straight-line
  cruise-speed flight time it must cover; `tests/raid.js` now asserts the farthest
  balloon stays within 15s of cruise flight from the start position. Both use real
  production numbers (`LW.SPEED`, `LW.R`, actual `TOWNS`/`balloons` positions), not
  hardcoded distances, so they hold regardless of planet size. Exposed `LW.SPEED` for
  this (existing precedent: `LW.controls`, `LW.HC`, `LW.skyBalloons`, etc. from the
  AC3/AC4 entry below).
- **Full suite: 51/51 passing** (49 existing + 2 new), no console errors.
- **Method note:** this environment's headless Chromium renders WebGL via software
  swiftshader, so `LW.frame()` calls are slow (~0.2-0.3s each under sustained load) -
  the full 51-test suite takes several minutes. Kept the live-play checks above cheap
  (teleport-to-target for chained legs, a handful of coarser-dt real-flight runs for
  the one or two worst cases that matter) rather than frame-stepping every leg at 60fps.

## 2026-09-23 — P1 AC3/AC4: camera, orbits, moon and balloon altitude retuned for R=15

- **Follow-up to the R=15 resize (f554707)**, which explicitly left camera limits, start
  framing, and satellite/moon/atmosphere numbers untuned. This closes that gap.
- **Camera start distance (`camera.position` multiplier) was hardcoded at 30, unchanged
  since R=10.** At R=15 the planet no longer fit in the start view (measured: distance
  ~30.7, but a sphere of radius 15 needs ~39.2 to fit the 45deg-fov camera vertically).
  Changed to `3 * R` (was already `3 * R` in effect at R=10 - the constant just never
  got updated). Now: R=15 -> ~45 units, matching the same ~15% margin the R=10 planet had.
- **`controls.maxDistance` was hardcoded at 80 (`8 * R` at R=10), also unchanged.**
  Changed to `8 * R` explicitly (120 at R=15), keeping the same zoom-out headroom.
  `controls.minDistance` (`R + 0.9`, "street level") was already expressed in terms of
  R and needed no change - verified via a live zoom-to-minDistance screenshot.
- **`moon.position.x` was a bare 26, not expressed in terms of R at all** - the one place
  that broke the spec's "distance from centre scales with R" rule. At R=10 that was
  2.6*R; changed to `R * 2.6` so the moon keeps its position relative to the bigger
  planet instead of drifting closer in visual terms.
- **Satellites, station, atmosphere, clouds were already correct** - all coded as
  `R + <absolute altitude>`, which is the right form per the spec's "height above
  ground stays absolute" rule (same category as balloons and clouds), and they already
  inherited the R=15 bump automatically. Checked, not changed: atmosphere radius 18,
  satellites 20.2-21.8, station 23, all clear the atmosphere with margin (AC4).
- **Balloon altitude (`R + 2.2` to `R + 2.8`) did not clear the tallest mountain.**
  Measured the actual highest point of the rendered terrain (exact, over all ~497k
  vertices of the terrain mesh, not a statistical sample): ~R+2.65. That's inside the
  balloons' old floor of R+2.2. This wasn't caused by the resize (the height formula
  is R-invariant, only which points get sampled changes with NZ) but AC4 ("balloons
  clear the mountains") covers it and it's a one-line fix, so it's fixed here rather
  than filed separately. New range: `R + 3.0` to `R + 3.6`.
- **Self-review:** wrote the AC3/AC4 tests first (whole-planet-fits framing math, a
  200-point behavioural re-check of the live orbit-mode clamp, atmosphere clearance,
  and an exact terrain-max check for planes/balloons), confirmed they failed against
  the unmodified code, then fixed the constants above. Full suite: 49/49 passing, no
  console errors. Live screenshots confirm the whole planet fits at start and zooming
  to `minDistance` sits at ground level without clipping into terrain.
- **New `LW` test hooks added:** `controls`, `atmosphere`, `moon`, `HC`, `heightAt`,
  `startCameraDistance` (frozen at boot - `camera.position` itself gets driven around
  live by chase cams and other tests, so a "does it fit at start" check needs a value
  that isn't overwritten by whatever ran before it), `skyBalloons`.

## 2026-09-23 — P1 AC7 frame-cost baseline: current planet, before resize

- **Baseline measurement for P1 AC7:** The current planet (R=10, 3 cities, all object counts unchanged from F1)
  matches the configuration used for F1 AC5's frame-cost check. Those measurements serve as the BEFORE baseline
  for comparing against the after-resize measurements (R=15, 5 cities, ~1.5× object counts).
- **Desktop, High quality (1024×768 canvas):** 0.94 ms/frame, 785 draw calls. Budget: 16 ms (17× headroom).
- **Phone emulation, Low quality (375×812 viewport, 1.5 pixel ratio = 562×1218 canvas):** 0.55 ms/frame measured,
  ×4 CPU-throttle approximation → 2.2 ms/frame. Budget: 33 ms (15× headroom). 361 draw calls.
- **Method:** Same as F1 AC5: call `LW.frame(dt)` directly in a tight loop (bypassing rAF scheduling) and time
  with `performance.now()`. This decouples measurement from this browser pane's rAF scheduling quirks and gives
  a clean per-frame cost. Warm-up: 10 frames. Measurement: 300 frames at 1/60 s dt.
- **Source:** F1 AC5's frame-cost check, carried forward as the P1 baseline (2026-09-23 entry below).

## 2026-09-23 — F1 closed; next is P1

- **F1 closed.** Reviewer: CLOSE, all 6 ACs verified, 38/38 checks and a live browser run.
- **Next sprint is P1 (bigger planet), not R2.** ROADMAP.md is the source of truth: F, then planet, then the Raid fight, then Kaiju.
  PLAN.md listed R2 before Planet v2 because epics are grouped by game. Its header now says milestone 2, after P1 and P2,
  and a build-order line sits at the top of PLAN.md.
- **Quality-switch checks become behavioural in P1.** The F1 auto-switch checks are structural proxies. P1 changes traffic,
  which Low trims, so that is the cheap moment to tighten them. Added as a P1 task.
- **Real-phone frame-cost spot-check goes to Later.** AC5's numbers come from one machine with a ×4 estimate for throttle.
  Only a deployed build can be checked on a real phone, and deploy is not planned yet.
- **Recommend merging feat/foundations-f1 into main before P1**, then branching P1 off main. Needs Diego's go.

## 2026-09-23 — F1 AC5 frame-cost check: measured, not throttled live

- **No CPU-throttle control in this session's browser tooling**, and this pane's own
  `requestAnimationFrame` is irregularly throttled (a known issue from AC1's test-runner
  work), so a raw rAF-timed run here is not a trustworthy proxy for real device cost.
  Measured actual per-frame cost instead: call `LW.frame(dt)` directly in a tight loop
  (bypasses rAF scheduling) and time it with `performance.now()`, decoupling the
  measurement from this pane's scheduling quirks.
- **Desktop, High, 1024×768 canvas:** ~0.94 ms/frame average (budget 16 ms, 17× headroom).
- **Phone emulation, Low, 375×812 at 1.5 pixel ratio (562×1218 canvas):** ~0.55 ms/frame
  measured, ×4 as the standard DevTools-CPU-throttle approximation → ~2.2 ms (budget
  33 ms, 15× headroom even at the pessimistic ×4 estimate).
- Draw calls: 785 (High) → 361 (Low), confirming AC4's "fewer draw calls" holds at the
  same time. AC5 passes with wide margin on this machine; a real low-end device could
  still be slower and is worth a spot-check once the app is actually deployed.

## 2026-09-23 — Spec and plan approved; names and share image

- **Roadmap, specs and plan approved as written** (ROADMAP.md, PLAN.md, specs/). Build starts with sprint F1.
- **Original kaiju names: Scalezor, Bonkers, Shellback.** The app goes public; names close to Godzilla and King Kong invite trouble.
- **Share image and favicon are rendered from the planet itself.** No separate logo.
- **`main` is the default branch** on the private GitHub repo vespassassina/Rampage. Work happens on `<type>/<topic>` branches off it.
- **Open:** the app is called Little Worlds, the repo Rampage. Not renamed; ask before changing.

## 2026-09-23 — Public web app: phones first-class, tests in the repo

- **Every game ships with touch.** Many visitors will be on phones.
- **Target 60 fps desktop, 30 on a mid-range phone,** with an auto High/Low quality switch.
- **tests.html runs all checks in the browser.** Still no npm or build; the checks become a regression suite.
- **Three.js and the font are bundled.** No third-party requests: works if a CDN is down, and nothing leaks to it.
- **A foundations milestone comes first** for these, before the planet grows.

## 2026-09-23 — Roadmap: bigger planet, then Sky Raid, then Kaiju

- **Bigger planet first.** Every game depends on its size; doing it later means retuning each game twice.
- **More world, not a zoomed world.** Radius ×1.5, objects keep their size, counts scale with area.
- **Destructible scenery and instanced traffic are shared foundations**, built with the planet, used by Kaiju and Sky Raid.
- **Kaiju: rampage until health runs out.** Stomp, swipe, eat, roar; three kaiju with random variations. No atomic breath, by choice.

## 2026-09-23 — Sky Raid, sprint 1: training round

- **Both games share one flight core.** Plane, camera, HUD, panels and best score are common; each game is a small rules object (`GAMES.courier`, `GAMES.raid`) with start, stop, step and end. Asked for: "keep same code".
- **Training first, then the fight.** Eight red target balloons near the start town. Nothing shoots back. The fight (enemy waves, lives, bombs) is sprint 2.
- **Shots follow the planet's curve** like the plane, so they stay at the height they were fired from. One instanced mesh draws all 40.
- **POP! and BOOM! are pooled** comic bursts: a toon fireball plus a word sprite. Ten, reused in turn.
- **Dropped the draw-call cap from the spec.** The sandbox already draws about 785 calls in full orbit view; the check is now that pooled objects don't grow.

## 2026-09-23 — Sky Courier game mode

- **One game, in the same file.** A Play button switches from the sandbox to the game. Esc or Quit switches back. The world keeps running underneath.
- **Deliver parcels between the 3 cities and 5 hamlets before time runs out.** Each delivery adds time. The bonus shrinks as the score grows, so a run always ends. Pink rings on the way give +3 s.
- **The plane moves on the sphere by rotating its position and heading around a local axis.** No physics engine. Altitude is clamped between a floor above terrain and roofs, and a ceiling.
- **Best score lives in localStorage.** Nothing leaves the browser.
- **Keyboard only for now.** Touch and sound are sprint 2.

## 2026-09-23 — Satellites and a space station

- Six satellites orbit at 5–7 units up and a space station at 8, all on tilted circular orbits. Satellite dishes point at the planet, and blinking lights share one material.
- A new "Visit space" button starts at the station, then cycles through the satellites. Each object can carry its own `userData.chase` camera, because a station and a small satellite need different framing.

## 2026-09-23 — First version: one HTML file, no build

- **Single `index.html`, Three.js 0.170 from jsDelivr via an import map.** No bundler, no npm, no test harness, as asked. It opens from disk or any static server.
- **Comic look = MeshToonMaterial with a 3-step ramp, plus inverted-hull ink.** Hull width scales with camera distance, so lines stay about 2 px. A per-object cap keeps small things like cars from turning into black blobs. Hull geometry is welded and gets smoothed normals, so boxes don't crack at their corners.
- **Static scenery is merged per material** (a `Batch` class): the whole world draws in a few dozen calls. Only moving things stay separate meshes.
- **Terrain is procedural value-noise fbm on an icosphere.** Cities flatten the ground into round plateaus. The seeded RNG makes the same planet every load.
- **City grids use a gnomonic map** from a tangent plane onto the sphere. Traffic follows closed loops in that plane: a ring road, plus rectangles along the streets.
- **The light is attached to the camera,** so the side you look at is always lit. Near the ground the view tilts toward the horizon. A floor keeps the camera above mountains and the tallest roof of each city: without it the camera ended up inside a tower's ink hull and the screen went black.
- **The chase camera blends direction and height separately,** so it glides over the surface instead of cutting through the planet.
