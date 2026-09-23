# Roadmap

Little Worlds: a comic-book planet in one HTML file, with games on top.
Written 2026-09-23. Order agreed: planet first, then Sky Raid, then Kaiju.

| # | Milestone | Why now | Spec | Sprints |
|---|---|---|---|---|
| ✅ 0 | Planet, vehicles, space, Sky Courier | Done | [sky-courier](specs/sky-courier.md) | — |
| ✅ 0 | Sky Raid training round | Done | [sky-raid](specs/sky-raid.md) | — |
| 1 | **Bigger planet** | Every mode depends on its size. Doing it later means retuning every game. | [planet-v2](specs/planet-v2.md) | P1, P2 |
| 2 | **Sky Raid: the fight** | Half built; finish it before starting another game. | [sky-raid](specs/sky-raid.md) | R2 |
| 3 | **Kaiju mode** | Needs the bigger planet and destructible cities. | [kaiju](specs/kaiju.md) | K1–K4 |
| 4 | Later | Touch controls for all games, sound, phone performance. | — | — |

## Shared foundations, built once

- **Destructible scenery** (P2): every building, house and tree can be knocked down one at a time,
  while still drawing in a few merged batches. Kaiju needs it; Sky Raid bombs use it too.
- **Instanced traffic** (P1): cars, and later tanks and people, as instanced meshes. The bigger
  planet has about twice the traffic; separate meshes would cost thousands of draw calls.
- **Game core** (done): one flight, camera, HUD and panel code; each game is a rules object.
  Kaiju adds a walking body to it.

## Risks

- **Frame rate.** More world plus destruction. Every sprint ends with a frame-cost check.
- **Kaiju camera.** A giant on a small sphere: the horizon is close and buildings block the view.
  K1 is mostly about making that feel right.
- **Scope.** Four kaiju moves, three kaiju, three military units. Each sprint must end playable;
  anything that slips moves to the next sprint, not into a half-built one.

See [PLAN.md](PLAN.md) for tasks.
