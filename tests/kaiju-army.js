/**
 * Kaiju: heat and the army (docs/specs/kaiju.md AC 6, 7, 8; Sprint K3).
 * Hooks (LW.kaiju): heat (live), maxHeat, heatFor(score), army {units [{kind,mesh,p,f,alive,fireWait}],
 * shots, auto (settable: false stops automatic spawning), spawn(kind)}.
 * Time moves only through LW.frame(dt).
 */
(function () {
  const $ = id => document.getElementById(id);
  const step = (LW, s) => { for (let i = 0; i < Math.round(s * 60); i++) LW.frame(1 / 60); };
  const near = (a, b, tol, what) => { if (Math.abs(a - b) > tol) throw new Error(`${what}: got ${a.toFixed(3)}, expected ${b}`); };
  const begin = LW => { $('play-kaiju').click(); $('p-go').click(); step(LW, 1 / 60); return LW.kaiju; };
  const live = (K, kind) => K.army.units.filter(u => u.alive && u.kind === kind);
  // Stands a unit `dist` from the kaiju on a given bearing, facing it.
  function stand(LW, u, dist, turn = 0) {
    const G = LW.game, V = LW.V3;
    const f = G.f.clone().applyAxisAngle(G.p, turn), axis = new V().crossVectors(G.p, f).normalize();
    u.p.copy(G.p).applyAxisAngle(axis, dist / LW.R);
    u.f.copy(G.p).addScaledVector(u.p, -G.p.dot(u.p)).normalize();
    u.alive = true; u.mesh.visible = true;
  }
  // A quiet field: no automatic spawns, nobody alive, the kaiju never starves.
  function clear(LW, K) {
    K.army.auto = false; for (const u of K.army.units) { u.alive = false; u.mesh.visible = false; }
    for (const s of K.army.shots) s.life = 0;
    K.energy = 100; K.health = 100;
  }
  // Moves the kaiju to the spot with the least scenery around, so a stomp scores only the army.
  function openGround(LW) {
    const G = LW.game, V = LW.V3, E = LW.sceneryEntries;
    let best = null, bestD = -1;
    for (let i = 0; i < 300; i++) {
      const y = 1 - 2 * (i + 0.5) / 300, r = Math.sqrt(1 - y * y), a = i * 2.39996, d = new V(Math.cos(a) * r, y, Math.sin(a) * r);
      let min = 9; for (const e of E) min = Math.min(min, e.pos.clone().normalize().angleTo(d) * LW.R);
      if (min > bestD) { bestD = min; best = d; }
    }
    G.p.copy(best); G.f.copy(new V(0, 1, 0).cross(best)).normalize();
    for (const q of LW.kaiju.people) q.p.copy(best).negate();
    for (const c of LW.raid.civilians) c.alive = false;
    if (bestD < 1.6) throw new Error('no open ground: ' + bestD.toFixed(2));
  }

  LW_TESTS.push({
    name: 'kaiju army: heat is 1, 2 at 500, 3 at 1500, then +1 every 1500 (AC 7)', game: 'kaiju',
    run(LW) {
      const K = begin(LW);
      const want = [[0, 1], [499, 1], [500, 2], [1499, 2], [1500, 3], [2999, 3], [3000, 4], [4499, 4], [4500, 5]];
      for (const [s, h] of want) if (K.heatFor(s) !== h) throw new Error(`score ${s}: heat ${K.heatFor(s)}, expected ${h}`);
      LW.game.score = 500; step(LW, 1 / 60);
      if (K.heat !== 2) throw new Error('live heat did not follow the score');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: at heat 1 only police cars come, and they drive at the kaiju (AC 7)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 4);
      if (!live(K, 'police').length) throw new Error('no police cars after 4 s');
      if (live(K, 'tank').length || live(K, 'jet').length) throw new Error('tanks or jets at heat 1');
      clear(LW, K);
      const u = K.army.spawn('police'); stand(LW, u, 3.5);
      const a = u.p.angleTo(G.p) * LW.R;
      step(LW, 2);
      const b = u.p.angleTo(G.p) * LW.R;
      if (b > a - 0.8) throw new Error(`the police car went from ${a.toFixed(2)} to ${b.toFixed(2)}`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: a police pistol shot costs 0.5 health (AC 7)', game: 'kaiju',
    run(LW) {
      const K = begin(LW);
      clear(LW, K);
      const u = K.army.spawn('police'); stand(LW, u, 1.2); u.fireWait = 0;
      step(LW, 1.3);
      near(100 - K.health, 0.5, 0.01, 'health lost to one shot');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: tanks come at 500 and a shell costs 3 (AC 7)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 3);
      if (live(K, 'tank').length) throw new Error('a tank at heat 1');
      G.score = 500; step(LW, 4);
      if (!live(K, 'tank').length) throw new Error('no tank after crossing 500');
      clear(LW, K);
      const u = K.army.spawn('tank'); stand(LW, u, 2.5); u.fireWait = 0;
      step(LW, 2.2);
      near(100 - K.health, 3, 0.01, 'health lost to one shell');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: jets come at 1500 and a missile costs 5 (AC 7)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      G.score = 1000; step(LW, 4);
      if (live(K, 'jet').length) throw new Error('a jet below heat 3');
      G.score = 1500;
      let seen = false;   // a jet makes one pass and is gone, so watch for it instead of sampling once
      for (let i = 0; i < 24 && !seen; i++) { step(LW, 0.25); seen = live(K, 'jet').length > 0; }
      if (!seen) throw new Error('no jet within 6 s of crossing 1500');
      clear(LW, K);
      const u = K.army.spawn('jet'); stand(LW, u, 3.2);
      step(LW, 3);
      near(100 - K.health, 5, 0.01, 'health lost to one missile');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: a roar holds fire for 3 s and then it resumes (AC 6)', game: 'kaiju',
    run(LW) {
      const K = begin(LW);
      clear(LW, K);
      const u = K.army.spawn('police'); stand(LW, u, 1.2); u.fireWait = 0;
      K.roar();
      step(LW, 2.8);
      if (K.health !== 100) throw new Error('the army fired during the roar');
      step(LW, 2);
      if (K.health === 100) throw new Error('the army never fired again');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: stomping a police car scores 10 and a tank 25; eating a tank gives +15 energy (AC 3, 4)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      clear(LW, K); openGround(LW);
      const a = K.army.spawn('police'); stand(LW, a, 0.5); a.fireWait = 99;
      K.stomp();
      if (a.alive) throw new Error('the police car survived the stomp');
      if (G.score !== 10) throw new Error(`police car scored ${G.score}`);
      const t = K.army.spawn('tank'); stand(LW, t, 0.5); t.fireWait = 99;
      K.stomp();
      if (t.alive) throw new Error('the tank survived the stomp');
      if (G.score !== 35) throw new Error(`tank scored ${G.score - 10}`);
      const t2 = K.army.spawn('tank'); stand(LW, t2, 0.6, 1); t2.fireWait = 99;
      K.energy = 50; K.health = 50; K.eat();
      if (t2.alive) throw new Error('the tank was not eaten');
      near(K.energy, 65, 0.05, 'energy'); near(K.health, 53.75, 0.05, 'health');
      if (G.score !== 35) throw new Error('eating must not score');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: the end screen names the heat reached, which survives a lower score (AC 8)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      clear(LW, K);
      G.score = 1600; step(LW, 1 / 60);
      K.damage(1000);
      if (!/Heat 3/.test($('p-text').textContent)) throw new Error('end screen lacks the heat: ' + $('p-text').textContent);
      LW.games.quit();
      try { localStorage.removeItem('lw-kaiju-best'); } catch {}
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: quit clears every unit and shot; a new run starts at heat 1 (AC 9)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      G.score = 3000; step(LW, 8);
      if (!K.army.units.some(u => u.alive)) throw new Error('no army at heat 4');
      LW.games.quit();
      if (K.army.units.some(u => u.alive || u.mesh.visible)) throw new Error('units survive quit');
      if (K.army.shots.some(s => s.life > 0)) throw new Error('shots survive quit');
      $('play-kaiju').click(); $('p-go').click();
      if (K.heat !== 1) throw new Error('the next run starts at heat ' + K.heat);
      if (K.army.units.some(u => u.alive)) throw new Error('old units in the new run');
      LW.games.quit();
      try { localStorage.removeItem('lw-kaiju-best'); } catch {}
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju army: at heat 4 the army reuses its pools (no new objects in a minute) (AC 10)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      G.score = 3000; K.health = 1e9; K.energy = 1e9;
      step(LW, 5);
      const kids = LW.scene.children.length, n = K.army.units.length, s = K.army.shots.length;
      step(LW, 30);
      if (LW.scene.children.length !== kids || K.army.units.length !== n || K.army.shots.length !== s) throw new Error('the army grew new objects');
      if (K.army.units.filter(u => u.alive).length < 5) throw new Error('the heat-4 army is too thin');
      LW.games.quit();
      return true;
    }
  });
})();
