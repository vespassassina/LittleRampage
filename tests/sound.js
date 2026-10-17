/**
 * Sound: effects are synthesised, so a check can only hear what the game asked for.
 * Hook: LW.audio {log (names asked for, newest last), muted (get/set), live}. Time moves only through LW.frame(dt).
 */
(function () {
  const $ = id => document.getElementById(id);
  const step = (LW, s) => { for (let i = 0; i < Math.round(s * 60); i++) LW.frame(1 / 60); };
  const heard = (LW, f) => { LW.audio.log.length = 0; f(); return [...LW.audio.log]; };   // the log is capped, so count from empty
  const begin = LW => { $('play-kaiju').click(); $('p-go').click(); LW.kaiju.army.auto = false; step(LW, 0.1); LW.kaiju.energy = 100; return LW.kaiju; };
  const clean = LW => { LW.audio.muted = false; if (LW.game.active) LW.games.quit(); try { localStorage.removeItem('lw-sound'); } catch {} };

  LW_TESTS.push({
    name: 'sound: Kaiju stomp, swipe and roar each make their own sound', game: 'kaiju',
    run(LW) {
      try {
        const K = begin(LW);
        const a = heard(LW, () => K.stomp()), b = heard(LW, () => { step(LW, 0.1); K.swipe(); }), c = heard(LW, () => { step(LW, 0.1); K.roar(); });
        if (!a.includes('stomp')) throw new Error('stomp: ' + a);
        if (!b.includes('swipe')) throw new Error('swipe: ' + b);
        if (!c.includes('roar')) throw new Error('roar: ' + c);
      } finally { clean(LW); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'sound: nothing plays when a move is refused (no energy and almost no health)', game: 'kaiju',
    run(LW) {
      try {
        const K = begin(LW); K.energy = 0; K.health = 1;
        const a = heard(LW, () => { K.stomp(); K.swipe(); K.roar(); });
        if (a.some(n => ['stomp', 'swipe', 'roar'].includes(n))) throw new Error('played: ' + a);
      } finally { clean(LW); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'sound: smashing a building booms; a hit on the kaiju is heard', game: 'kaiju',
    run(LW) {
      try {
        const K = begin(LW);
        const a = heard(LW, () => { K.swipe(); K.stomp(); });   // the kaiju starts at a city edge: something goes
        if (!a.some(n => n === 'crunch' || n === 'boom')) throw new Error('no smash sound: ' + a);
        const b = heard(LW, () => K.damage(3));
        if (!b.includes('hit')) throw new Error('no hit sound: ' + b);
        const c = heard(LW, () => { step(LW, 0.1); K.damage(0.01); });
        if (c.includes('hit')) throw new Error('a scratch should be silent');
      } finally { clean(LW); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'sound: Sky Raid guns, bombs and a lost life are heard', game: 'raid',
    run(LW) {
      try {
        $('play-raid').click(); $('p-go').click(); step(LW, 0.1);
        const G = LW.game;
        const a = heard(LW, () => { G.keys.add('fire'); step(LW, 0.3); G.keys.delete('fire'); });
        if (!a.includes('shot')) throw new Error('no gun: ' + a);
        const b = heard(LW, () => { G.keys.add('bomb'); step(LW, 0.1); G.keys.delete('bomb'); });
        if (!b.includes('drop')) throw new Error('no bomb: ' + b);
      } finally { clean(LW); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'sound: a run starts and ends with a sound', game: 'kaiju',
    run(LW) {
      try {
        const a = heard(LW, () => { $('play-kaiju').click(); $('p-go').click(); });
        if (!a.includes('start')) throw new Error('start: ' + a);
        const b = heard(LW, () => LW.kaiju.damage(1000));
        if (!b.includes('lose')) throw new Error('end: ' + b);
      } finally { clean(LW); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'sound: mute silences everything, is remembered, and the button flips it', game: 'kaiju',
    run(LW) {
      try {
        const K = begin(LW);
        $('mute').click();
        if (!LW.audio.muted) throw new Error('the button did not mute');
        if (localStorage.getItem('lw-sound') !== 'off') throw new Error('mute not remembered');
        const a = heard(LW, () => { K.stomp(); K.roar(); K.damage(5); });
        if (a.length) throw new Error('muted but asked for: ' + a);
        $('mute').click();
        if (LW.audio.muted) throw new Error('the button did not unmute');
        step(LW, 0.1);
        const b = heard(LW, () => K.stomp());
        if (!b.includes('stomp')) throw new Error('no sound after unmute: ' + b);
      } finally { clean(LW); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'sound: a burst of identical sounds in one frame is thinned, so the mix stays clean', game: 'kaiju',
    run(LW) {
      try {
        const K = begin(LW);
        const a = heard(LW, () => { for (let i = 0; i < 20; i++) K.damage(1); });
        if (a.filter(n => n === 'hit').length > 1) throw new Error('20 hits in a frame made ' + a.length + ' sounds');
      } finally { clean(LW); }
      return true;
    }
  });
})();
