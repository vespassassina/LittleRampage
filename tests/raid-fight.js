/**
 * Sky Raid: the fight (docs/specs/sky-raid.md AC 2, 4-9, 10; Sprint R2).
 * Hooks (LW.raid): enemies [{mesh,p,f,alt,alive,speed}], enemyShots [{p,f,alt,life}], bombs,
 * civilians [{kind:'plane'|'boat'|'car', obj, alive, respawnAt}], bomb(), paramsFor(n),
 * live getters wave and invulnerable. LW.touch gains bombBtn and bombPress.
 * Time moves only through LW.frame(dt).
 */
(function () {
  const $ = id => document.getElementById(id);
  const step = (LW, s) => { for (let i = 0; i < Math.round(s * 60); i++) LW.frame(1 / 60); };
  const BEST = 'lw-sky-raid-best';

  function begin(LW) {
    $('play-raid').click(); $('p-go').click();
    return LW.raid;
  }
  function toFight(LW) {
    const R = begin(LW);
    for (const b of R.balloons) b.alive = b.mesh.visible = false;
    step(LW, 1 / 60);
    return R;
  }
  function place(LW, dir, alt) {
    const G = LW.game, V = LW.V3;
    G.p.copy(dir).normalize();
    G.f.copy(Math.abs(G.p.y) > 0.9 ? new V(1, 0, 0) : new V(0, 1, 0));
    G.f.addScaledVector(G.p, -G.f.dot(G.p)).normalize();
    G.alt = alt;
  }
  const worldOf = (LW, c) => { if (c.kind !== 'plane') return c.obj.position.clone(); const v = new LW.V3(); c.obj.updateWorldMatrix(true, false); c.obj.getWorldPosition(v); return v; };
  const liveEnemies = R => R.enemies.filter(e => e.alive);
  // Parks every enemy far away on the planet's other side and out of the way.
  function sidelineEnemies(LW, R) {
    for (const e of liveEnemies(R)) { e.p.copy(LW.game.p).negate(); e.f.copy(LW.game.f); e.mesh.position.copy(e.p).multiplyScalar(e.alt); }
  }
  function enemyAhead(LW, R, e, dist = 1.5) {
    const G = LW.game;
    e.p.copy(G.p); e.f.copy(G.f); e.alt = G.alt;
    // slide it `dist` ahead along the player's great circle
    const axis = new LW.V3().crossVectors(G.p, G.f).normalize();
    e.p.applyAxisAngle(axis, dist / G.alt); e.f.applyAxisAngle(axis, dist / G.alt);
    e.mesh.position.copy(e.p).multiplyScalar(e.alt);
  }
  function hitPlayerWithShot(LW, R) {
    const G = LW.game, s = R.enemyShots.find(x => x.life <= 0);
    if (!s) throw new Error('no free enemy shot in the pool');
    s.p.copy(G.p); s.f.copy(G.f); s.alt = G.alt; s.life = 1;
    LW.frame(1 / 60);
  }
  function withBest(fn) {
    let saved = null; try { saved = localStorage.getItem(BEST); localStorage.removeItem(BEST); } catch (e) {}
    try { return fn(); } finally { try { saved === null ? localStorage.removeItem(BEST) : localStorage.setItem(BEST, saved); } catch (e) {} }
  }

  LW_TESTS.push({
    name: 'raid fight: the last balloon starts wave 1 with 2 enemies, out of sight (AC 2)', game: 'raid',
    run(LW) {
      const R = toFight(LW);
      if (R.wave !== 1) throw new Error(`wave should be 1, got ${R.wave}`);
      const e = liveEnemies(R);
      if (e.length !== 2) throw new Error(`wave 1 has 2 enemies, got ${e.length}`);
      if (!$('panel').hidden) throw new Error('the training panel must not block the fight');
      for (const x of e) {
        const d = x.mesh.position.distanceTo(LW.player.position);
        if (d < 5) throw new Error(`enemy spawned ${d.toFixed(2)} from the player, inside view`);
      }
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: wave difficulty follows the spec formulas (AC 6)', game: 'raid',
    run(LW) {
      const R = LW.raid, near = (a, b) => Math.abs(a - b) < 1e-6;
      const p1 = R.paramsFor(1), p5 = R.paramsFor(5), p30 = R.paramsFor(30);
      if (!near(p1.speed, 1.2 * 1.08) || !near(p1.fireGap, 3 / 1.15)) throw new Error('wave 1 params wrong: ' + JSON.stringify(p1));
      if (!near(p5.speed, 1.2 * 1.4) || !near(p5.fireGap, 3 / 1.75)) throw new Error('wave 5 params wrong: ' + JSON.stringify(p5));
      if (p30.speed !== 2.0) throw new Error(`speed must cap at 2.0, got ${p30.speed}`);
      if (p30.fireGap !== 0.9) throw new Error(`fire gap must floor at 0.9, got ${p30.fireGap}`);
      if (R.paramsFor(8).speed < R.paramsFor(7).speed) throw new Error('speed must not fall');
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: enemies chase at the wave speed (AC 6)', game: 'raid',
    run(LW) {
      const R = toFight(LW), want = R.paramsFor(1).speed;
      const e = liveEnemies(R)[0], a = e.p.clone();
      step(LW, 1);
      const moved = Math.acos(Math.min(1, a.dot(e.p))) * e.alt;
      if (Math.abs(moved - want) > want * 0.2) throw new Error(`enemy moved ${moved.toFixed(2)} in 1 s, wave speed is ${want.toFixed(2)}`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: an enemy with you in its sights fires a slow shot you can see (AC 6)', game: 'raid',
    run(LW) {
      const R = toFight(LW), G = LW.game, e = liveEnemies(R)[0];
      sidelineEnemies(LW, R);
      // the enemy sits 1.5 ahead of you facing back at you
      enemyAhead(LW, R, e, 1.5); e.f.negate(); e.fireWait = 0;
      let seen = false;
      for (let i = 0; i < 90 && !seen; i++) { LW.frame(1 / 60); seen = R.enemyShots.some(s => s.life > 0); if (G.lives < 3) break; }
      if (!seen && G.lives === 3) throw new Error('enemy never fired');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: a gun hit kills an enemy for 10, clearing the wave starts the next one 3 s later (AC 6)', game: 'raid',
    run(LW) {
      const R = toFight(LW), G = LW.game;
      sidelineEnemies(LW, R);
      const kill = e => {
        enemyAhead(LW, R, e, 1.5); R.fire(); step(LW, 0.4);
        if (e.alive) throw new Error('shot did not kill the enemy placed ahead');
      };
      const before = G.score;
      const [a, b] = liveEnemies(R);
      kill(a);
      if (G.score !== before + 10) throw new Error(`enemy kill scores 10, got ${G.score - before}`);
      if (R.wave !== 1) throw new Error('wave must not advance while an enemy lives');
      kill(b);
      step(LW, 2.5);
      if (R.wave !== 1) throw new Error('next wave came before the 3 s pause');
      step(LW, 1);
      if (R.wave !== 2) throw new Error(`wave should be 2, got ${R.wave}`);
      if (liveEnemies(R).length !== 3) throw new Error(`wave 2 has 3 enemies, got ${liveEnemies(R).length}`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: a gun hit destroys a civilian plane for 5, it returns after 20 s (AC 4)', game: 'raid',
    run(LW) {
      const R = toFight(LW), G = LW.game;
      sidelineEnemies(LW, R);
      const c = R.civilians.find(x => x.kind === 'plane');
      if (!c) throw new Error('no civilian planes');
      // park the plane ahead of the player; planes are children of a moving pivot, so move the pivot
      const hold = () => { const w = worldOf(LW, c), want = LW.player.position.clone().addScaledVector(G.f, 1.2); c.obj.parent.position.add(want.sub(w)); c.obj.parent.updateMatrixWorld(true); };
      hold(); R.fire();
      for (let i = 0; i < 20 && c.alive; i++) { hold(); LW.frame(1 / 60); }
      if (c.alive) throw new Error('shot did not destroy the civilian plane');
      if (G.score !== 5) throw new Error(`civilian plane scores 5, got ${G.score}`);
      if (c.obj.visible) throw new Error('destroyed plane still visible');
      step(LW, 19);
      if (c.alive) throw new Error('plane came back before 20 s');
      step(LW, 1.5);
      if (!c.alive || !c.obj.visible) throw new Error('plane did not return after 20 s');
      LW.games.quit();
      return true;
    }
  });

  function bombOnto(LW, R, dir, radius) {
    place(LW, dir, radius + 1.6);
    R.bomb();
    for (let i = 0; i < 240 && R.bombs.some(b => b.life > 0); i++) { LW.frame(1 / 60); place(LW, dir, radius + 1.6); }
  }

  for (const [kind, points] of [['car', 1], ['boat', 3]]) {
    LW_TESTS.push({
      name: `raid fight: a bomb dropped on a ${kind} destroys it for ${points} (AC 5)`, game: 'raid',
      run(LW) {
        const R = toFight(LW), G = LW.game;
        sidelineEnemies(LW, R);
        const c = R.civilians.find(x => x.kind === kind);
        if (!c) throw new Error(`no ${kind} among the civilians`);
        const w = worldOf(LW, c);
        bombOnto(LW, R, w, w.length());
        if (c.alive) throw new Error(`${kind} survived a bomb`);
        // the blast takes every civilian within range, so the score is the sum of the dead
        const dead = R.civilians.filter(x => !x.alive), sum = dead.reduce((n, x) => n + x.points, 0);
        if (dead.some(x => x.kind === 'plane')) throw new Error('a bomb must not take planes');
        if (G.score !== sum || sum < points) throw new Error(`${kind} scores ${points} (blast total ${sum}), got ${G.score}`);
        LW.games.quit();
        if (!c.alive) throw new Error(`${kind} not restored on quit`);
        return true;
      }
    });
  }

  LW_TESTS.push({
    name: 'raid fight: a bomb on empty sea scores nothing (AC 5, adversarial)', game: 'raid',
    run(LW) {
      const R = toFight(LW), G = LW.game, V = LW.V3;
      sidelineEnemies(LW, R);
      let found = null;
      for (let i = 0; i < 4000 && !found; i++) {
        const d = new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
        if (LW.heightAt(d) > 15 - 0.4) continue;
        if (R.civilians.every(c => c.kind === 'plane' || worldOf(LW, c).normalize().angleTo(d) * 15 > 3)) found = d;
      }
      if (!found) throw new Error('no empty sea found');
      bombOnto(LW, R, found, 15);
      if (G.score !== 0) throw new Error(`bomb on empty sea scored ${G.score}`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: a bomb destroys a building and quit restores it (AC 5, 8)', game: 'raid',
    run(LW) {
      const R = toFight(LW);
      sidelineEnemies(LW, R);
      const e = LW.sceneryEntries.find(x => x.kind === 'building');
      bombOnto(LW, R, e.pos, e.pos.length());
      if (!e.destroyed) throw new Error('building survived the bomb');
      LW.games.quit();
      if (LW.sceneryEntries.some(x => x.destroyed)) throw new Error('scenery not restored on quit');
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: a hit costs a life, 2 s of invulnerability, then it can cost another (AC 7)', game: 'raid',
    run(LW) {
      const R = toFight(LW), G = LW.game;
      sidelineEnemies(LW, R);
      hitPlayerWithShot(LW, R);
      if (G.lives !== 2) throw new Error(`lives should be 2, got ${G.lives}`);
      if (R.invulnerable < 1.9 || R.invulnerable > 2.01) throw new Error(`invulnerable should be ~2 s, got ${R.invulnerable}`);
      hitPlayerWithShot(LW, R);
      if (G.lives !== 2) throw new Error('a hit while blinking must cost nothing');
      step(LW, 2.1);
      sidelineEnemies(LW, R);
      hitPlayerWithShot(LW, R);
      if (G.lives !== 1) throw new Error(`lives should be 1 after the blink ended, got ${G.lives}`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: flying into an enemy costs a life (AC 7)', game: 'raid',
    run(LW) {
      const R = toFight(LW), G = LW.game;
      sidelineEnemies(LW, R);
      enemyAhead(LW, R, liveEnemies(R)[0], 0.05);
      LW.frame(1 / 60);
      if (G.lives !== 2) throw new Error(`a crash should cost a life, lives ${G.lives}`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: 0 lives ends the run with score, wave and a best that survives (AC 7)', game: 'raid',
    run(LW) {
      return withBest(() => {
        const R = toFight(LW), G = LW.game, oldBest = R.best; R.best = 0;
        sidelineEnemies(LW, R);
        G.score = 7;
        for (let i = 0; i < 3; i++) { hitPlayerWithShot(LW, R); step(LW, 2.1); sidelineEnemies(LW, R); }
        if (G.lives !== 0 || G.running) throw new Error(`run should be over, lives ${G.lives}, running ${G.running}`);
        if ($('panel').hidden) throw new Error('end screen missing');
        const txt = $('p-title').textContent + ' ' + $('p-text').textContent;
        if (!/7/.test(txt) || !/wave 1/i.test(txt) || !/best/i.test(txt)) throw new Error('end screen must show score, wave and best: ' + txt);
        if (localStorage.getItem(BEST) !== '7') throw new Error('best score not stored');
        LW.games.quit(); R.best = oldBest;
        return true;
      });
    }
  });

  LW_TESTS.push({
    name: 'raid fight: quit mid-fight leaves a clean sandbox, a new run starts at training (AC 8)', game: 'raid',
    run(LW) {
      const R = toFight(LW), G = LW.game;
      LW.games.quit();
      if (liveEnemies(R).length || R.enemies.some(e => e.mesh.visible)) throw new Error('enemies left after quit');
      if (R.enemyShots.some(s => s.life > 0) || R.bombs.some(b => b.life > 0)) throw new Error('shots left after quit');
      if (R.civilians.some(c => !c.alive)) throw new Error('civilians not restored');
      begin(LW);
      if (R.wave !== 0 || R.balloons.filter(b => b.alive).length !== 8 || G.lives !== 3) throw new Error('a new run must start at training');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: firing, bombing and enemy fire reuse pooled objects (AC 9)', game: 'raid',
    run(LW) {
      const R = toFight(LW), count = () => { let n = 0; LW.scene.traverse(() => n++); return n; };
      sidelineEnemies(LW, R);
      const before = count();
      for (let i = 0; i < 300; i++) { R.fire(); R.bomb(); if (i % 30 === 0) hitPlayerWithShot(LW, R); LW.frame(1 / 60); sidelineEnemies(LW, R); }
      if (count() !== before) throw new Error(`scene objects ${before} -> ${count()}`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'raid fight: B drops a bomb; the touch Bomb button works with joystick and Fire at once (AC 10)', game: 'raid',
    run(LW) {
      const R = toFight(LW), G = LW.game, T = LW.touch;
      if (!T.bombBtn || !T.bombPress) throw new Error('LW.touch needs bombBtn and bombPress');
      sidelineEnemies(LW, R);
      dispatchEvent(new KeyboardEvent('keydown', { key: 'b' })); LW.frame(1 / 60); dispatchEvent(new KeyboardEvent('keyup', { key: 'b' }));
      if (!R.bombs.some(b => b.life > 0)) throw new Error('B did not drop a bomb');
      step(LW, 3);
      T.forceShow = true;
      try {
        if (T.bombBtn.hidden) throw new Error('Bomb button hidden in Raid');
        T.setStick(1, 0); T.firePress(true); T.bombPress(true);
        const heading = G.f.clone();
        LW.frame(1 / 60);
        if (!G.keys.has('right') || !G.keys.has('fire') || !G.keys.has('bomb')) throw new Error('stick, Fire and Bomb must hold together');
        if (G.f.angleTo(heading) === 0) throw new Error('the stick stopped steering');
        if (!R.shots.some(s => s.life > 0)) throw new Error('Fire did nothing');
        if (!R.bombs.some(b => b.life > 0)) throw new Error('Bomb did nothing');
      } finally { T.setStick(0, 0); T.firePress(false); T.bombPress(false); T.forceShow = false; }
      LW.games.quit();
      return true;
    }
  });
})();
