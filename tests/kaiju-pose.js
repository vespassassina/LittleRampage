/**
 * Kaiju: the moves can be seen, and the body is a sensible size (Rampage-style readability).
 * Time moves only through LW.frame(dt).
 */
(function () {
  const $ = id => document.getElementById(id);
  const step = (LW, s) => { for (let i = 0; i < Math.round(s * 60); i++) LW.frame(1 / 60); };
  const play = (LW, k) => {
    if (LW.game.active) LW.games.quit();
    $('play-kaiju').click(); $('k-pick').querySelector(`[data-k=${k}]`).click(); $('p-go').click();
    LW.kaiju.army.auto = false; step(LW, 1 / 60);
    const K = LW.kaiju; K.energy = 100;
    return K;
  };
  const shown = K => K.models.find(m => m.visible);
  // the largest rotation any pivot in the body has, in radians
  const maxTurn = m => { let t = 0; m.traverse(o => { t = Math.max(t, Math.abs(o.rotation.x), Math.abs(o.rotation.y), Math.abs(o.rotation.z)); }); return t; };

  LW_TESTS.push({
    name: 'kaiju pose: the body stands about as tall as a house, not a skyscraper', game: 'kaiju',
    run(LW) {
      try {
        for (const k of ['scalezor', 'bonkers', 'shellback']) {
          const K = play(LW, k), m = shown(K);
          const h = m.scale.y * 2.1;   // the bodies are modelled about 2.1 tall with their spikes
          if (h > 1.7 || h < 0.9) throw new Error(`${k} is ${h.toFixed(2)} tall`);
        }
      } finally { if (LW.game.active) LW.games.quit(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju pose: a stomp lifts a foot and puts it back; a walk alone does not', game: 'kaiju',
    run(LW) {
      try {
        for (const k of ['scalezor', 'bonkers', 'shellback']) {
          const K = play(LW, k), m = shown(K);
          step(LW, 0.1);
          if (maxTurn(m) > 0.05) throw new Error(`${k} moves while standing still: ${maxTurn(m).toFixed(2)}`);
          K.stomp();
          let peak = 0; for (let i = 0; i < 12; i++) { LW.frame(1 / 60); peak = Math.max(peak, maxTurn(m)); }
          if (peak < 0.8) throw new Error(`${k} stomp pose peaks at ${peak.toFixed(2)} rad: not visible`);
          step(LW, 0.5);
          if (maxTurn(m) > 0.05) throw new Error(`${k} stays posed after the stomp`);
        }
      } finally { if (LW.game.active) LW.games.quit(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju pose: each swipe shows - tail whip, fists, shell spin - and ends back at rest', game: 'kaiju',
    run(LW) {
      try {
        for (const k of ['scalezor', 'bonkers', 'shellback']) {
          const K = play(LW, k), m = shown(K);
          K.swipe();
          let peak = 0; for (let i = 0; i < 20; i++) { LW.frame(1 / 60); peak = Math.max(peak, maxTurn(m)); }
          if (peak < 1.2) throw new Error(`${k} swipe pose peaks at ${peak.toFixed(2)} rad: not visible`);
          step(LW, 0.6);
          if (maxTurn(m) % (Math.PI * 2) > 0.05 && Math.PI * 2 - (maxTurn(m) % (Math.PI * 2)) > 0.05) throw new Error(`${k} stays posed after the swipe`);
        }
      } finally { if (LW.game.active) LW.games.quit(); }
      return true;
    }
  });
})();
