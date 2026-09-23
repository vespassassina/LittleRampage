// Sky Raid sprint 1 checks + Sky Courier regression, as run by hand on 2026-09-23.
// Paste into the page console at http://localhost:8765; returns a result map.
// Sprint F1 task 1 turns this into tests.html. Known fix: the draw-call check is obsolete (spec AC 9 changed).
(() => {
  const out = {}, ok = (k, c, info) => { out[k] = c ? 'PASS' : 'FAIL ' + JSON.stringify(info ?? ''); };
  const G = LW.game, step = (s) => { for (let i = 0; i < Math.round(s * 60); i++) LW.frame(1 / 60); };
  const $ = id => document.getElementById(id);

  // Courier regression (AC 8)
  LW.games.open('courier'); LW.games.start();
  ok('courier start', G.running && G.time > 0 && G.score === 0 && G.town, { t: G.time });
  const f0 = G.f.clone(), p0 = G.p.clone();
  G.keys.add('right'); step(1); G.keys.delete('right');
  const cw = new LW.V3().crossVectors(f0, G.f).dot(G.p) < 0;
  ok('courier turn right = clockwise', cw);
  G.p.copy(G.town.dir); step(1 / 60);
  ok('courier delivery', G.score === 1, { s: G.score });
  LW.games.quit();

  // Raid AC 1
  $('play-raid').click();
  ok('raid start screen', !$('panel').hidden && $('p-title').textContent === 'Sky Raid');
  $('p-go').click();
  const R = LW.raid;
  ok('AC1 training', G.running && G.kind === 'raid' && R.balloons.filter(b => b.alive).length === 8 &&
    G.lives === 3 && G.score === 0 && R.enemies.length === 0,
    { alive: R.balloons.filter(b => b.alive).length, lives: G.lives, score: G.score });

  // AC 3: shot along heading, gone after range
  R.balloons.forEach(b => b.mesh.position.multiplyScalar(3));   // move balloons far away for this test
  const before = R.shots.filter(s => s.life > 0).length;
  R.fire(); step(1 / 60);
  const s = R.shots.find(s => s.life > 0);
  ok('AC3 shot spawned', R.shots.filter(s => s.life > 0).length === before + 1);
  const shotPos = s ? R.shotWorld(s) : null, pl = LW.player.position.clone();
  ok('AC3 shot ahead of plane', s && shotPos.clone().sub(pl).normalize().dot(G.f) > 0.9,
    s && shotPos.clone().sub(pl).normalize().dot(G.f));
  step(1.2);
  ok('AC3 shot expires', R.shots.filter(s => s.life > 0).length === 0);

  // AC 2: pop a balloon placed ahead, then all
  const placeAhead = (b) => {
    const p = LW.player.position.clone().addScaledVector(G.f, 1.5);
    b.mesh.position.copy(p); b.base = p.clone();
  };
  const b0 = R.balloons.find(b => b.alive); placeAhead(b0);
  R.fire(); step(0.5);
  ok('AC2 pop', !b0.alive && G.score === 2, { alive: b0.alive, score: G.score });
  ok('AC2 burst shown', R.bursts.some(x => x.age < 1));
  for (const b of R.balloons.filter(b => b.alive)) { placeAhead(b); R.fire(); step(0.5); }
  ok('AC2 training done', R.balloons.every(b => !b.alive) && G.score === 16 && !$('panel').hidden,
    { score: G.score, panel: $('p-title').textContent });

  // AC 8: Esc back to sandbox
  dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  ok('AC8 quit', !G.active && !$('ui').hidden && $('hud').hidden && !LW.player.visible &&
    R.balloons.every(b => !b.mesh.visible) && R.shots.every(s => s.life <= 0));
  ok('draw calls', LW.renderer.info.render.calls < 150, LW.renderer.info.render.calls);
  return out;
})()
