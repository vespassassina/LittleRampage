# Handoff

Paused 2026-09-23 after sprint F1. Read this first; delete it when P1 starts.
Model routing for the work: see the project CLAUDE.md.

## Done

- Sprint F1 (Foundations) closed and reviewed: tests.html, bundled Three.js and font, touch layer,
  quality switch, frame-cost check, metadata. On branch `feat/foundations-f1`, not yet merged or pushed.
- The app: `index.html`, one file, Three.js 0.170 bundled in `vendor/`. A comic planet with traffic, planes, boats,
  balloons, satellites, a station and a moon. Games: Sky Courier (complete) and Sky Raid (training round only).
- Roadmap, specs and plan are approved: [ROADMAP.md](ROADMAP.md), [PLAN.md](PLAN.md), [specs/](specs/).
  Decisions and why: [DECISIONS.md](DECISIONS.md).
- Repo: private, github.com/vespassassina/Rampage, default branch `main`.

## Next

1. Diego decides on merging `feat/foundations-f1` into `main` (recommended, see DECISIONS.md).
2. Sprint P1 in [PLAN.md](PLAN.md), spec [specs/planet-v2.md](specs/planet-v2.md), on a branch off `main`.
   Task 1 first: record the frame-cost baseline before anything changes.

Then P2, R2 (Sky Raid fight), K1 to K4 (Kaiju). One sprint at a time; get Diego's go before each.

## How to run and test

```bash
python3 -m http.server 8765
```

- Open http://localhost:8765. Port 8765 may already be taken by a preview server; use 8766 then.
- Debug hooks on `window.LW`: `camera, scene, renderer, frame, game (G), games {open, start, quit},
  courier, raid {balloons, shots, enemies, bursts, fire, shotWorld}, player, V3`.
- The Claude browser pane throttles requestAnimationFrame. Drive time by hand:
  `for (let i = 0; i < 60; i++) LW.frame(1/60)` is one second.
- Checks: open http://localhost:8765/tests.html. It runs `tests/*.js` (courier, raid, touch, quality). 38/38 at F1 close.

## Code map (index.html)

Helpers and noise → cities and terrain (`CITIES`, `heightAt`) → materials (`toon`, `ink`, `inked`, `Batch`) →
buildings and cities (`buildCity`, traffic `Loop`) → countryside, boats, planes (`makePlane`), balloons
(`makeBalloon`), satellites, clouds, moon → controls and chase camera (`CHASE`, `setMode`) →
game core (`G`, `GAMES`, `openGame`, `startRun`, `quitGame`, `gameStep`, `advance`, `pointAt`) →
`GAMES.courier` → bursts (`burst`) → `GAMES.raid` → frame loop.

Things to know:

- Static scenery is merged per material in `Batch`. Destructible scenery (P2) needs per-object vertex ranges there.
- Each car is 3 meshes plus 3 ink hulls: about 6 draw calls per car. The full orbit view is about 785 calls. P1 instances them.
- The ink outline shader already supports instancing (`USE_INSTANCING`).
- Everything uses R (planet radius) and HC = R + 0.32 (city plateau). P1 changes R to 15.

## Blocked

Nothing. The one open point: the app is called Little Worlds, the repo Rampage. Don't rename without asking.
