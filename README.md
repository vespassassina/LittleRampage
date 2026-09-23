# Little Worlds

A tiny cartoon planet in Three.js, drawn like a comic: toon shading and black ink outlines.
It has cities with streets and traffic, forests, mountains with snow, a sea with boats,
planes with smoke trails, hot-air balloons, windmills, clouds and a moon.

## Run

One file, no build. The page loads Three.js from a CDN, so it needs a network connection.

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765. Double-clicking `index.html` also works in most browsers.

## Controls

- Drag to orbit. Scroll or pinch to zoom, all the way down to street level.
- **Ride a plane / car / boat** follows a vehicle. Press it again for the next one.
- **Orbit** or Esc goes back to free orbit. **Spin** toggles the slow auto-rotation.

## How it works

See [docs/DECISIONS.md](docs/DECISIONS.md).
