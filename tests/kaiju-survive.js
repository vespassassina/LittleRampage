/**
 * Kaiju: health, energy, people, eat, roar (docs/specs/kaiju.md AC 4, 5, 6, 11; Sprint K2).
 * Hooks (LW.kaiju): live getters health, energy, armyQuiet, roarWait; setters health, energy;
 * people [{p,f,alive}], damage(n), eat(), roar(). LW.touch.{eatBtn,roarBtn,eatPress,roarPress}.
 * Time moves only through LW.frame(dt).
 */
(function () {
  const $ = id => document.getElementById(id);
  const step = (LW, s) => { for (let i = 0; i < Math.round(s * 60); i++) LW.frame(1 / 60); };
  const near = (a, b, tol, what) => { if (Math.abs(a - b) > tol) throw new Error(`${what}: got ${a.toFixed(3)}, expected ${b}`); };
  const begin = LW => { $('play-kaiju').click(); $('p-go').click(); LW.kaiju.army.auto = false; step(LW, 1 / 60); return LW.kaiju; };   // no army: these checks are about the body
  // A point `dist` from the kaiju along its heading (or sideways).
  function ahead(LW, dist, turn = 0) {
    const G = LW.game, V = LW.V3;
    const f = G.f.clone().applyAxisAngle(G.p, turn), axis = new V().crossVectors(G.p, f).normalize();
    return { p: G.p.clone().applyAxisAngle(axis, dist / LW.R), f };
  }
  const put = (q, at) => { q.p.copy(at.p); q.f.copy(at.f); };
  const alive = K => K.people.filter(q => q.alive);
  // Walking into food eats it, so checks about the drain keep people and civilian traffic out of reach.
  const noFood = (LW, K) => { for (const q of K.people) q.p.copy(LW.game.p).negate(); for (const c of LW.raid.civilians) { c.alive = false; c.respawnAt = 1e9; } };   // respawnAt: or they come back next frame

  LW_TESTS.push({
    name: 'kaiju: health and energy start full, with bars on the HUD (AC 5)', game: 'kaiju',
    run(LW) {
      const K = begin(LW);
      if (K.health !== 100 || K.energy < 99.9) throw new Error(`health ${K.health} energy ${K.energy}`);
      if (!$('h-hp') || !$('h-en')) throw new Error('no health or energy bar');
      if (parseFloat($('h-hp').style.width) !== 100) throw new Error('health bar is not full');
      K.energy = 40; step(LW, 1 / 60);
      if (parseFloat($('h-en').style.width) > 41) throw new Error('energy bar does not follow energy');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: energy drains 1 per second (AC 5)', game: 'kaiju',
    run(LW) {
      const K = begin(LW); noFood(LW, K);
      step(LW, 5);
      near(K.energy, 95, 0.3, 'energy after 5 s');
      if (K.health !== 100) throw new Error('health must not drain while energy lasts');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: stomp costs 5, swipe 10, roar 15 (AC 3, 5, 6)', game: 'kaiju',
    run(LW) {
      const K = begin(LW);
      K.stomp(); near(K.energy, 95, 0.05, 'after stomp');
      K.swipe(); near(K.energy, 85, 0.05, 'after swipe');
      K.roar(); near(K.energy, 70, 0.05, 'after roar');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: with no energy health drains 2 per second, and moves still work but cost health (AC 5)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      const b = LW.sceneryEntries.find(e => e.kind === 'building' && e.height > 0.5);
      const V = LW.V3, p0 = b.pos.clone().normalize(), f0 = new V(0, 1, 0).cross(p0).normalize(), ax = new V().crossVectors(p0, f0).normalize();
      G.p.copy(p0).applyAxisAngle(ax, -0.5 / b.pos.length()); G.f.copy(f0).applyAxisAngle(ax, -0.5 / b.pos.length());
      noFood(LW, K);
      K.energy = 0;
      K.stomp();
      if (!b.destroyed) throw new Error('a hungry kaiju could not stomp: a dead end');
      near(K.health, 98, 0.01, 'health after a starved stomp (5 x 0.4)');
      K.roar();
      if (!(K.roarWait > 9)) throw new Error('a hungry kaiju could not roar');
      near(K.health, 92, 0.01, 'health after a starved roar (15 x 0.4)');
      const h = K.health; step(LW, 2);
      near(h - K.health, 4, 0.2, 'health lost in 2 s');
      if (K.energy !== 0) throw new Error('energy must stay at 0');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: a hungry kaiju never spends its last health on a move', game: 'kaiju',
    run(LW) {
      const K = begin(LW);
      K.energy = 0; K.health = 1.5;
      K.swipe();   // costs 4
      near(K.health, 1.5, 0.01, 'health after a refused swipe');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: tiny people live in the cities, as one instanced mesh (AC 6 part)', game: 'kaiju',
    run(LW) {
      const K = begin(LW);
      const n = alive(K).length;
      if (n < 60) throw new Error(`only ${n} people`);
      for (const c of LW.CITIES) {
        const here = alive(K).filter(q => q.p.angleTo(c.dir) < c.cap).length;
        if (here < 5) throw new Error('a city has fewer than 5 people');
      }
      if (!K.peopleMesh || !K.peopleMesh.isInstancedMesh || !K.peopleMesh.visible) throw new Error('people are not one visible instanced mesh');
      LW.games.quit();
      if (K.peopleMesh.visible) throw new Error('people stay on screen after quit');
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: people flee from a kaiju that comes close (AC 6 part)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      const q = alive(K)[0]; put(q, ahead(LW, 1.2));
      const a = q.p.angleTo(G.p) * LW.R;
      step(LW, 1);
      const b = q.p.angleTo(G.p) * LW.R;
      if (b < a + 0.4) throw new Error(`the person went from ${a.toFixed(2)} to ${b.toFixed(2)} away`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: eat takes the nearest edible, restores energy +3 and health +0.75, scores nothing (AC 4)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      const [a, b] = alive(K);
      put(a, ahead(LW, 0.4)); put(b, ahead(LW, 0.8, 0.5));
      K.energy = 50; K.health = 50;
      const score = G.score;
      K.eat();
      if (a.alive) throw new Error('the nearest person was not eaten');
      if (!b.alive) throw new Error('eat took more than one');
      near(K.energy, 53, 0.05, 'energy'); near(K.health, 50.75, 0.05, 'health');
      if (G.score !== score) throw new Error('eating must not score');
      if (!LW.raid.bursts.some(x => x.g.visible)) throw new Error('no GULP burst');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: eating a car gives +8 energy and +2 health, and the car returns later (AC 4)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      const car = LW.raid.civilians.find(c => c.kind === 'car');
      const V = LW.V3, p0 = car.obj.position.clone().normalize(), f0 = new V(0, 1, 0).cross(p0).normalize(), ax = new V().crossVectors(p0, f0).normalize();
      G.p.copy(p0).applyAxisAngle(ax, -0.5 / car.obj.position.length()); G.f.copy(f0).applyAxisAngle(ax, -0.5 / car.obj.position.length());
      for (const q of K.people) q.p.copy(G.p).negate();   // nobody nearer than the car
      for (const c of LW.raid.civilians) if (c !== car) c.alive = false;   // no other car or plane either
      K.energy = 50; K.health = 50;
      K.eat();
      if (car.alive) throw new Error('the car was not eaten');
      near(K.energy, 58, 0.05, 'energy'); near(K.health, 52, 0.05, 'health');
      step(LW, 21);
      if (!car.alive) throw new Error('the car never came back');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: eat with nothing in reach does nothing and costs nothing; energy and health cap at 100 (AC 4)', game: 'kaiju',
    run(LW) {
      const K = begin(LW);
      for (const q of K.people) q.p.copy(LW.game.p).negate();
      for (const c of LW.raid.civilians) if (c.kind !== 'boat') { c.alive = false; }
      K.energy = 60; K.eat();
      near(K.energy, 60, 0.05, 'energy after an empty eat');
      for (const c of LW.raid.civilians) c.alive = true;
      const q = alive(K)[0]; put(q, ahead(LW, 0.3)); K.energy = 99; K.health = 99.9;
      K.eat();
      if (K.energy > 100 || K.health > 100) throw new Error(`energy ${K.energy} health ${K.health} above 100`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: E eats and R roars from the keyboard (AC 4, 6)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      const q = alive(K)[0]; put(q, ahead(LW, 0.3));
      G.keys.add('eat'); LW.frame(1 / 60); G.keys.delete('eat');
      if (q.alive) throw new Error('E did not eat');
      G.keys.add('roar'); LW.frame(1 / 60); G.keys.delete('roar');
      if (!(K.roarWait > 9)) throw new Error('R did not roar');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: roar scatters people and quiets the army for 3 s; a second roar within 10 s does nothing (AC 6)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      const q = alive(K)[0]; put(q, ahead(LW, 3.4));   // far enough to ignore the kaiju normally
      step(LW, 0.5);
      const a = q.p.angleTo(G.p) * LW.R;
      K.roar();
      near(K.armyQuiet, 3, 0.05, 'army quiet');
      step(LW, 1);
      const b = q.p.angleTo(G.p) * LW.R;
      if (b < a + 0.5) throw new Error(`the roar did not scatter people (${a.toFixed(2)} to ${b.toFixed(2)})`);
      const e = K.energy; K.roar();
      near(K.energy, e, 0.05, 'a second roar must cost nothing');
      step(LW, 3.2);
      if (K.armyQuiet > 0) throw new Error('the army stays quiet past 3 s');
      step(LW, 6);
      const e2 = K.energy; K.roar();
      near(K.energy, e2 - 15, 0.05, 'a roar after 10 s works');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: at 0 health the run ends with score, time and a best that survives (AC 8 part)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      try { localStorage.removeItem('lw-kaiju-best'); } catch {}
      G.score = 123; step(LW, 2);
      K.damage(1000);
      if (G.running) throw new Error('the run goes on at 0 health');
      if ($('panel').hidden) throw new Error('no end screen');
      const t = $('p-text').textContent;
      if (!/123/.test(t) || !/2 s/.test(t)) throw new Error('end screen lacks score or time: ' + t);
      if (K.best < 123) throw new Error('best not recorded');
      if (localStorage.getItem('lw-kaiju-best') !== '123') throw new Error('best not stored');
      LW.games.quit();
      try { localStorage.removeItem('lw-kaiju-best'); } catch {}
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: Eat and Roar buttons work on touch next to Stomp and Swipe (AC 11)', game: 'kaiju',
    run(LW) {
      const T = LW.touch;
      T.forceShow = true;
      try {
        const K = begin(LW), G = LW.game;
        if (T.eatBtn.hidden || T.roarBtn.hidden) throw new Error('Eat and Roar must show in Kaiju');
        const q = alive(K)[0]; put(q, ahead(LW, 0.3));
        T.eatPress(true); LW.frame(1 / 60); T.eatPress(false);
        if (q.alive) throw new Error('Eat button did nothing');
        T.roarPress(true); LW.frame(1 / 60); T.roarPress(false);
        if (!(K.roarWait > 9)) throw new Error('Roar button did nothing');
        LW.games.quit();
        $('play-raid').click(); $('p-go').click();
        if (!T.eatBtn.hidden || !T.roarBtn.hidden) throw new Error('Raid shows the Kaiju buttons');
        LW.games.quit();
      } finally { T.forceShow = false; if (LW.game.active) LW.games.quit(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: walking into a person or a car eats it without a key; the army is not eaten (AC 4)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      const q = alive(K)[0]; put(q, ahead(LW, 0.4));
      K.energy = 50; K.health = 50;
      step(LW, 1 / 60);
      if (q.alive) throw new Error('a person within 0.4 was not eaten on contact');
      near(K.energy, 53 - 1 / 60, 0.1, 'energy after the free meal');
      const far = alive(K)[0]; put(far, ahead(LW, 0.9));
      step(LW, 1 / 60);
      if (!far.alive) throw new Error('contact eating reached 0.9: that is the E reach');
      K.army.auto = false;
      const u = K.army.spawn('police'); const at = ahead(LW, 0.3); u.p.copy(at.p); u.f.copy(at.f); u.alive = true; u.mesh.visible = true; u.fireWait = 99;
      step(LW, 1 / 60);
      if (!u.alive) throw new Error('walking into a police car ate it');
      LW.games.quit();
      return true;
    }
  });
})();
