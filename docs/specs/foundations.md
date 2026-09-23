# Foundations for a public web app

## Scope

- Goal: make the current app ready to publish and ready to grow.
- In: a browser test page, Three.js bundled in the repo, touch controls for Sky Courier and
  Sky Raid, a High/Low quality switch, page metadata, favicon and share image.
- Out: hosting and deploy (Diego publishes the folder), analytics, sound.

## Rules

- **No build, no npm.** The app stays `index.html` plus static files.
- **tests.html** loads `index.html?test` in an iframe, waits for `LW`, runs every check file
  in `tests/`, and shows each check as pass or fail with a total. `?test` only stops
  the auto-rotate and the random start, so runs are repeatable.
- **Three.js 0.170** is copied into `vendor/three/` (core, OrbitControls, BufferGeometryUtils,
  and their imports). The import map points there. No request leaves the site except Google Fonts;
  the Bangers font is also bundled, so there are none.
- **Touch** shows only on touch devices. Left: a joystick (drag to steer and climb).
  Right: action buttons for the current game (Sky Raid: Fire). Multi-touch works:
  steer and fire at once. The orbit sandbox keeps its pinch and drag.
- **Quality:** Low halves trees and traffic, drops ink outlines under a size threshold, and caps
  the pixel ratio at 1.5. Auto: after 3 s, if the average frame takes over 25 ms, switch to Low
  once. A button shows the current setting and overrides it; the choice is remembered.
- **Metadata:** title, description, Open Graph and Twitter tags, a 1200×630 share image
  rendered from the planet, a favicon and an apple-touch-icon.

## Acceptance criteria

1. tests.html runs the Courier and Raid checks and shows every one passing, plus a total.
   Breaking a rule (e.g. turning off delivery) makes a check fail there.
2. With the network cut off except for the site itself, the app loads and runs. No external requests.
3. On phone emulation (375×812, touch): the joystick steers the plane, Fire shoots,
   both at the same time. No page scroll or zoom while playing.
4. Quality Low: fewer draw calls than High in the same view, and the choice survives a reload.
   Auto-switch triggers under 4× CPU throttle and not on the desktop.
5. Frame cost: desktop High under 16 ms; phone emulation with 4× throttle on Low under 33 ms.
6. Sharing the URL shows the title, description and image (checked with the tags and the image file).
7. No console errors on desktop or phone emulation.
