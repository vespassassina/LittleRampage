/**
 * Kaiju: the roster (docs/specs/kaiju.md AC 1, 7, 10; Sprint K4).
 * Start screen: #k-pick buttons [data-k = scalezor | bonkers | shellback | random].
 * Hooks (LW.kaiju): run (name of the kaiju playing), look {color, size, spikes}, speed (live), swipeArc.
 */
(function () {
  const $ = id => document.getElementById(id);
  const step = (LW, s) => { for (let i = 0; i < Math.round(s * 60); i++) LW.frame(1 / 60); };
  const near = (a, b, tol, what) => { if (Math.abs(a - b) > tol) throw new Error(`${what}: got ${a.toFixed(3)}, expected ${b}`); };
  const pick = k => $('k-pick').querySelector(`[data-k=${k}]`).click();
  const play = k => { $('play-kaiju').click(); pick(k); $('p-go').click(); LW.kaiju.army.auto = false; step(LW, 1 / 60); return LW.kaiju; };
  const reset = () => { if (LW.game.active) LW.games.quit(); $('play-kaiju').click(); pick('scalezor'); LW.games.quit(); };
  const open = LW => { $('play-kaiju').click(); };

  LW_TESTS.push({
    name: 'kaiju roster: the start screen offers Scalezor, Bonkers, Shellback and Random; Scalezor is the default (AC 1)', game: 'kaiju',
    run(LW) {
      open(LW);
      if ($('k-pick').hidden) throw new Error('no picker on the start screen');
      const names = [...$('k-pick').querySelectorAll('button')].map(b => b.dataset.k).join();
      if (names !== 'scalezor,bonkers,shellback,random') throw new Error('buttons: ' + names);
      if (!$('k-pick').querySelector('[data-k=scalezor]').classList.contains('on')) throw new Error('Scalezor is not marked as chosen');
      $('p-go').click();
      if (!$('k-pick').hidden) throw new Error('the picker stays over the game');
      if (LW.kaiju.run !== 'scalezor') throw new Error('started ' + LW.kaiju.run);
      LW.games.quit();
      open(LW); LW.games.quit();
      $('play-raid').click();
      if (!$('k-pick').hidden) throw new Error('the picker shows in Raid');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: Bonkers is fast and frail, Shellback slow and tough, with the right health (AC 1)', game: 'kaiju',
    run(LW) {
      try {
        const want = { scalezor: [1.0, 100], bonkers: [1.3, 75], shellback: [0.7, 150] };
        for (const [k, [speed, hp]] of Object.entries(want)) {
          const K = play(k);
          if (K.run !== k) throw new Error(`${k}: started ${K.run}`);
          if (K.health !== hp) throw new Error(`${k}: health ${K.health}`);
          const G = LW.game, p0 = G.p.clone();
          G.keys.add('up'); step(LW, 2); G.keys.delete('up');
          near(G.p.angleTo(p0) * LW.R / 2, 0.7 * speed, 0.05, `${k} speed`);
          if (!K.mesh.visible) throw new Error(k + ' is invisible');
          LW.games.quit();
        }
      } finally { reset(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: each kaiju has its own body; only the chosen one shows (AC 1)', game: 'kaiju',
    run(LW) {
      try {
        const shown = [];
        for (const k of ['scalezor', 'bonkers', 'shellback']) {
          const K = play(k);
          const vis = K.models.filter(m => m.visible);
          if (vis.length !== 1) throw new Error(`${k}: ${vis.length} bodies show`);
          shown.push(vis[0]);
          LW.games.quit();
        }
        if (new Set(shown).size !== 3) throw new Error('two kaiju share a body');
      } finally { reset(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: Bonkers eats faster, held E repeats every 0.25 s instead of 0.5 (AC 4)', game: 'kaiju',
    run(LW) {
      try {
        const eatsIn = k => {
          const K = play(k), G = LW.game;
          for (const q of K.people) q.p.copy(G.p).negate();
          for (const c of LW.raid.civilians) c.alive = false;
          const V = LW.V3, axis = new V().crossVectors(G.p, G.f).normalize();
          K.people.slice(0, 8).forEach(q => { q.p.copy(G.p).applyAxisAngle(axis, 0.3 / LW.R); q.f.copy(G.f); });
          K.energy = 20;
          G.keys.add('eat'); step(LW, 1.1); G.keys.delete('eat');
          LW.games.quit();
          return K.people.slice(0, 8).filter(q => !q.alive).length;
        };
        const a = eatsIn('scalezor'), b = eatsIn('bonkers');
        if (b <= a) throw new Error(`Scalezor ate ${a}, Bonkers ${b} in 1.1 s`);
      } finally { reset(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: Bonkers punches ahead in a narrow arc, Shellback spins all around (AC 1, 3)', game: 'kaiju',
    run(LW) {
      try {
        const around = (LW, G, dist, bearing) => {
          const V = LW.V3, f = G.f.clone().applyAxisAngle(G.p, bearing);
          return G.p.clone().applyAxisAngle(new V().crossVectors(G.p, f).normalize(), dist / LW.R);
        };
        const hits = (k, bearing, dist) => {
          const K = play(k), G = LW.game, U = K.army;
          const u = U.spawn('police'); u.p.copy(around(LW, G, dist, bearing)); u.f.copy(G.f); u.alive = true; u.mesh.visible = true; u.fireWait = 99;
          K.swipe();
          const gone = !u.alive;
          LW.games.quit();
          return gone;
        };
        if (!hits('bonkers', 0, 0.9)) throw new Error('Bonkers missed straight ahead');
        if (hits('bonkers', Math.PI, 0.9)) throw new Error('Bonkers hit behind');
        if (hits('bonkers', 1.4, 0.9)) throw new Error('Bonkers hit far off to the side');
        for (const b of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) if (!hits('shellback', b, 0.9)) throw new Error('Shellback missed at bearing ' + b.toFixed(2));
        if (!hits('scalezor', Math.PI, 0.9)) throw new Error('Scalezor tail missed behind');
        if (hits('scalezor', 0, 0.9)) throw new Error('Scalezor tail hit ahead');
      } finally { reset(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: Shellback takes half from tank shells and full from the rest (AC 7)', game: 'kaiju',
    run(LW) {
      try {
        const lost = (k, kind) => {
          const K = play(k), G = LW.game, V = LW.V3;
          for (const s of K.army.shots) s.life = 0;
          const u = K.army.spawn(kind), axis = new V().crossVectors(G.p, G.f).normalize();
          u.p.copy(G.p).applyAxisAngle(axis, (kind === 'jet' ? 3.2 : 2.5) / LW.R); u.f.copy(G.p).addScaledVector(u.p, -G.p.dot(u.p)).normalize();
          u.alive = true; u.mesh.visible = true; u.fireWait = 0;
          const h = K.health; step(LW, 2.2);
          const d = h - K.health;
          LW.games.quit();
          return d;
        };
        near(lost('shellback', 'tank'), 1.5, 0.01, 'Shellback, one shell');
        near(lost('scalezor', 'tank'), 3, 0.01, 'Scalezor, one shell');
        near(lost('shellback', 'jet'), 5, 0.01, 'Shellback, one missile');
      } finally { reset(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: two Random runs look different and are within 10% in size (AC 10)', game: 'kaiju',
    run(LW) {
      try {
        const looks = [];
        for (let i = 0; i < 6; i++) { const K = play('random'); looks.push({ ...K.look, run: K.run }); LW.games.quit(); }
        const colors = new Set(looks.map(l => l.color));
        if (colors.size < 5) throw new Error('Random runs share colours: ' + [...colors].join());
        for (const l of looks) if (l.size < 0.9 || l.size > 1.1) throw new Error('size ' + l.size);
        if (new Set(looks.map(l => l.size.toFixed(3))).size < 4) throw new Error('sizes barely vary');
        if (new Set(looks.map(l => l.run)).size < 2) throw new Error('Random always picked ' + looks[0].run);
        for (const l of looks) if (!['scalezor', 'bonkers', 'shellback'].includes(l.run)) throw new Error('Random picked ' + l.run);
      } finally { reset(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: a chosen kaiju also varies from run to run, and the body fits the model scale (AC 10)', game: 'kaiju',
    run(LW) {
      try {
        const a = { ...play('bonkers').look }; LW.games.quit();
        const b = { ...play('bonkers').look };
        if (a.color === b.color && a.size === b.size) throw new Error('two Bonkers runs are identical');
        if (!(b.spikes >= 1)) throw new Error('no spikes or tufts show: ' + b.spikes);
        LW.games.quit();
      } finally { reset(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: balance, a kaiju that stands still lasts 60 s at heat 1 and 10 s at heat 4 (AC 7, 10)', game: 'kaiju',
    run(LW) {
      try {
        const survive = (score, max) => {
          const K = play('scalezor'), G = LW.game;
          K.army.auto = true; G.score = score; K.energy = 1e9;
          let t = 0; while (G.running && t < max) { step(LW, 0.25); t += 0.25; }
          LW.games.quit();
          return t;
        };
        const t1 = survive(0, 60), t4 = survive(3000, 60);
        if (t1 < 60) throw new Error('dead after ' + t1 + ' s at heat 1');
        if (t4 < 10) throw new Error('dead after ' + t4 + ' s at heat 4');
        if (t4 >= 60) throw new Error('heat 4 is harmless: ' + t4 + ' s');
      } finally { reset(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju roster: heat 4 frame cost is recorded for every kaiju, ink and units included (AC 10)', game: 'kaiju',
    run(LW) {
      try {
        const out = {};
        for (const k of ['scalezor', 'bonkers', 'shellback']) {
          const K = play(k), G = LW.game;
          K.army.auto = true; G.score = 3000; K.health = 1e9; K.energy = 1e9;
          step(LW, 12);
          const t0 = performance.now(); step(LW, 3);
          out[k] = (performance.now() - t0) / 180;
          if (!(out[k] > 0)) throw new Error('no timing');
          LW.games.quit();
        }
        window.FRAME_COSTS = window.FRAME_COSTS || {}; window.FRAME_COSTS.kaijuHeat4 = out;
        console.log('FRAME_COST_KAIJU_HEAT4: ' + JSON.stringify(out));
      } finally { reset(); }
      return true;
    }
  });
})();
