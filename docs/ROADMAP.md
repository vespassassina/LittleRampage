# Roadmap

Little Worlds: a comic-book planet in one HTML file, with games on top.
Written 2026-09-23. Order agreed: foundations, planet, Sky Raid, Kaiju.
It will be published as a public web app, so phones are first-class:
every game ships with touch controls, and the target is 60 fps on desktop, 30 on a mid-range phone.

| # | Milestone | Why now | Spec | Sprints |
|---|---|---|---|---|
| ✅ 0 | Planet, vehicles, space, Sky Courier | Done | [sky-courier](specs/sky-courier.md) | — |
| ✅ 0 | Sky Raid training round | Done | [sky-raid](specs/sky-raid.md) | — |
| F | **Foundations** | A public app needs a test suite, local Three.js, touch for the existing games and a quality switch before it grows. | [foundations](specs/foundations.md) | F1 |
| 1 | **Bigger planet** | Every mode depends on its size. Doing it later means retuning every game. | [planet-v2](specs/planet-v2.md) | P1, P2 |
| 2 | **Sky Raid: the fight** | Half built; finish it before starting another game. | [sky-raid](specs/sky-raid.md) | R2 |
| 3 | **Kaiju mode** | Needs the bigger planet and destructible cities. | [kaiju](specs/kaiju.md) | K1–K4 |
| 4 | Later | Sound. | — | — |

## Shared foundations, built once

- **tests.html** (F1): a plain page that loads the app in an iframe and runs every game's
  checks. Each sprint adds its checks; all of them run at the end of every sprint.
- **Quality switch** (F1): High and Low. Low trims trees, traffic and small ink outlines.
  Picked automatically from the first seconds' frame time, with a button to override.
- **Touch layer** (F1): a joystick and action buttons shared by all games.

- **Destructible scenery** (P2): every building, house and tree can be knocked down one at a time,
  while still drawing in a few merged batches. Kaiju needs it; Sky Raid bombs use it too.
- **Instanced traffic** (P1): cars, and later tanks and people, as instanced meshes. The bigger
  planet has about twice the traffic; separate meshes would cost thousands of draw calls.
- **Game core** (done): one flight, camera, HUD and panel code; each game is a rules object.
  Kaiju adds a walking body to it.

## Risks

- **Frame rate.** More world plus destruction, on phones too. Every sprint ends with a frame-cost check,
  desktop and phone emulation with 4× CPU throttle.
- **Kaiju camera.** A giant on a small sphere: the horizon is close and buildings block the view.
  K1 is mostly about making that feel right.
- **Scope.** Four kaiju moves, three kaiju, three military units. Each sprint must end playable;
  anything that slips moves to the next sprint, not into a half-built one.

See [PLAN.md](PLAN.md) for tasks.
