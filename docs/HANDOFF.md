# Handoff

Paused 2026-09-23 after planning. Read this first, then delete it when F1 starts.

## Done

- The app: `index.html`, one file, Three.js 0.170 from jsDelivr. A comic planet with traffic, planes, boats,
  balloons, satellites, a station and a moon. Games: Sky Courier (complete) and Sky Raid (training round only).
- Roadmap, specs and plan are approved: [ROADMAP.md](ROADMAP.md), [PLAN.md](PLAN.md), [specs/](specs/).
  Decisions and why: [DECISIONS.md](DECISIONS.md).
- Repo: private, github.com/vespassassina/Rampage, default branch `main`.

## Next

Sprint F1 in [PLAN.md](PLAN.md), spec [specs/foundations.md](specs/foundations.md). Task 1 comes first:
tests.html, so every later task starts with a failing check there.

Then P1, P2 (bigger planet), R2 (Sky Raid fight), K1 to K4 (Kaiju). One sprint at a time;
tick tasks; review and re-plan at each sprint end; get Diego's go before the next sprint.

## How to run and test

```bash
python3 -m http.server 8765
```

- Open http://localhost:8765. Port 8765 may already be taken by a preview server; use 8766 then.
- Debug hooks on `window.LW`: `camera, scene, renderer, frame, game (G), games {open, start, quit},
  courier, raid {balloons, shots, enemies, bursts, fire, shotWorld}, player, V3`.
- The Claude browser pane throttles requestAnimationFrame. Drive time by hand:
  `for (let i = 0; i < 60; i++) LW.frame(1/60)` is one second.
- [tests/sprint1-checks.js](../tests/sprint1-checks.js) holds the checks run so far (Courier regression,
  Raid AC 1–3, quit). Paste it in the console. All pass except the old draw-call check, which the spec dropped.

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
