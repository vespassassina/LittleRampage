# Decisions

Newest first.

## 2026-09-23 — First version: one HTML file, no build

- **Single `index.html`, Three.js 0.170 from jsDelivr via an import map.** No bundler, no npm, no test harness, as asked. It opens from disk or any static server.
- **Comic look = MeshToonMaterial with a 3-step ramp, plus inverted-hull ink.** Hull width scales with camera distance, so lines stay about 2 px. A per-object cap keeps small things like cars from turning into black blobs. Hull geometry is welded and gets smoothed normals, so boxes don't crack at their corners.
- **Static scenery is merged per material** (a `Batch` class): the whole world draws in a few dozen calls. Only moving things stay separate meshes.
- **Terrain is procedural value-noise fbm on an icosphere.** Cities flatten the ground into round plateaus. The seeded RNG makes the same planet every load.
- **City grids use a gnomonic map** from a tangent plane onto the sphere. Traffic follows closed loops in that plane: a ring road, plus rectangles along the streets.
- **The light is attached to the camera,** so the side you look at is always lit. Near the ground the view tilts toward the horizon. A floor keeps the camera above mountains and the tallest roof of each city: without it the camera ended up inside a tower's ink hull and the screen went black.
- **The chase camera blends direction and height separately,** so it glides over the surface instead of cutting through the planet.
