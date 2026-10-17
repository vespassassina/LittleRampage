# LittleRampage

Play it: https://vespassassina.github.io/LittleRampage/

A tiny cartoon planet in Three.js, drawn like a comic: toon shading and black ink outlines.
It has cities with streets and traffic, forests, mountains with snow, a sea with boats,
planes with smoke trails, hot-air balloons, windmills, clouds, satellites, a space station and a moon.

## Run

One file, no build. The page loads Three.js from a CDN, so it needs a network connection.

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765. Double-clicking `index.html` also works in most browsers.

## Controls

- Drag to orbit. Scroll or pinch to zoom, all the way down to street level.
- **Ride a plane / car / boat** and **Visit space** follow a vehicle. Press it again for the next one.
- **Orbit** or Esc goes back to free orbit. **Spin** toggles the slow auto-rotation.

## Sky Courier

A small game. Press **Play Sky Courier**, then Enter or **Start!**.
Carry parcels to the town the arrow points at. Fly through the yellow beacon to deliver.
Each delivery adds time; pink rings add a little more. The run ends when time hits zero.

- ← → or A D: steer
- ↑ ↓ or W S: climb and dive
- Esc: quit to the sandbox

Keyboard only for now. Rules are in [docs/specs/sky-courier.md](docs/specs/sky-courier.md).

## Sky Raid

Press **Play Sky Raid**. Training first: pop the 8 red target balloons. Space fires,
the arrow points at the nearest balloon. Enemy waves come in the next update.

## How it works

See [docs/DECISIONS.md](docs/DECISIONS.md).
