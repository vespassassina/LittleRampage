// Real frame cost (planet-v2 AC 7, kaiju AC 10). Drives a Chromium browser over CDP: no npm, no
// install. Each frame is LW.frame(), gl.finish() and a 1-pixel readback (forces the GPU to complete), so the clock includes the GPU. The page runs
// with ?test, so nothing else renders. Phone runs use a real 4x CPU throttle.
// Usage: node tools/frame-cost.mjs [url] [browser binary]   (server: python3 -m http.server 8765)
import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const base = process.argv[2] ?? 'http://localhost:8765/index.html';
const bin = process.argv[3] ?? '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';
const port = 9333, FRAMES = 240, WARM = 60;
const budget = { desktop: 16, phone: 33 };

const profile = mkdtempSync(join(tmpdir(), 'lw-frame-'));
const proc = spawn(bin, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--use-angle=metal', '--ignore-gpu-blocklist', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, nextId = 1; const waiting = new Map();
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) { ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((ok, bad) => { ws.onopen = ok; ws.onerror = bad; }); break; }
    } catch { /* browser still starting */ }
    await sleep(200);
  }
  if (!ws) throw new Error('could not reach the browser on port ' + port);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); } };
}
const send = (method, params = {}) => new Promise((ok, bad) => {
  const id = nextId++; waiting.set(id, m => m.error ? bad(new Error(method + ': ' + m.error.message)) : ok(m.result));
  ws.send(JSON.stringify({ id, method, params }));
});
async function run(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}
async function open(device) {
  const phone = device === 'phone';
  await send('Emulation.setDeviceMetricsOverride', phone
    ? { width: 375, height: 812, deviceScaleFactor: 3, mobile: true } : { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  await send('Emulation.setCPUThrottlingRate', { rate: phone ? 4 : 1 });
  await send('Page.navigate', { url: base + '?test' });
  for (let i = 0; i < 100; i++) { await sleep(200); if (await run('typeof LW !== "undefined" && !!LW.frame && !!LW.quality')) break; }
  await run(`LW.quality.set(${JSON.stringify(phone ? 'low' : 'high')}); 1`);
}
// Mean and worst ms per frame, over FRAMES frames after WARM warm-up frames.
const measure = () => run(`(() => {
  const gl = LW.renderer.getContext(), t = [], px = new Uint8Array(4);
  for (let i = 0; i < ${WARM + FRAMES}; i++) { const a = performance.now(); LW.frame(1 / 60); gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); if (i >= ${WARM}) t.push(performance.now() - a); }
  t.sort((x, y) => x - y);
  return { mean: t.reduce((s, x) => s + x, 0) / t.length, p95: t[Math.floor(t.length * 0.95)], max: t[t.length - 1], calls: LW.renderer.info.render.calls };
})()`);
const kaiju = kind => run(`(() => {
  document.getElementById('play-kaiju').click(); document.querySelector('#k-pick [data-k=${kind}]').click(); document.getElementById('p-go').click();
  const K = LW.kaiju; LW.game.score = 3000; K.health = 1e9; K.energy = 1e9;
  for (let i = 0; i < 720; i++) LW.frame(1 / 60);   // 12 s: the heat-4 army is out
  return K.army.units.filter(u => u.alive).length;
})()`);

const rows = [];
try {
  await connect();
  await open('desktop');
  const gpu = await run(`(() => { const gl = LW.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; })()`);
  console.log('GPU:', gpu);
  if (/swiftshader|llvmpipe|software/i.test(gpu)) throw new Error('software renderer: these are not frame times. Run on a machine with a GPU.');
  for (const device of ['desktop', 'phone']) {
    await open(device);
    rows.push({ device, scene: 'start view', ...await measure() });
    for (const k of ['scalezor', 'bonkers', 'shellback']) {
      await open(device);
      const n = await kaiju(k);
      rows.push({ device, scene: `kaiju ${k}, heat 4 (${n} units)`, ...await measure() });
    }
  }
} finally { ws?.close(); proc.kill(); }

let bad = 0;
for (const r of rows) {
  const ok = r.mean < budget[r.device]; if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.device.padEnd(7)} ${r.scene.padEnd(36)} mean ${r.mean.toFixed(2)} ms  p95 ${r.p95.toFixed(2)} ms  max ${r.max.toFixed(1)} ms  ${r.calls} calls  (budget ${budget[r.device]} ms)`);
}
process.exit(bad ? 1 : 0);
