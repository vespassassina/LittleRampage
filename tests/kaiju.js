/**
 * Kaiju: a giant that walks and smashes (docs/specs/kaiju.md AC 1-3, 9, 11; Sprint K1).
 * Hooks: LW.kaiju {mesh, stomp(), swipe(), pointsOf(entry)}, LW.camera, LW.sceneryEntries,
 * LW.raid.civilians (traffic, shared with Raid), LW.raid.bursts, LW.touch.{stompBtn,swipeBtn}.
 * Time moves only through LW.frame(dt).
 */
(function () {
  const $ = id => document.getElementById(id);
  const step = (LW, s) => { for (let i = 0; i < Math.round(s * 60); i++) LW.frame(1 / 60); };
  const BEST = 'lw-kaiju-best';

  function begin(LW) {
    $('play-kaiju').click(); $('p-go').click();
    return LW.kaiju;
  }
  // Puts the kaiju `dist` from `pos` along a great circle, facing it (or facing away if `behind`).
  function standNear(LW, pos, dist, behind = false) {
    const G = LW.game, V = LW.V3;
    const p0 = pos.clone().normalize();
    const f0 = new V(0, 1, 0).cross(p0).normalize();
    const axis = new V().crossVectors(p0, f0).normalize();
    G.p.copy(p0).applyAxisAngle(axis, -dist / pos.length());
    G.f.copy(f0).applyAxisAngle(axis, -dist / pos.length());
    if (behind) G.f.negate();
  }
  const buildings = LW => LW.sceneryEntries.filter(e => e.kind === 'building' && !e.destroyed && e.height > 0.5);
  const pointsOf = (e) => e.kind === 'building' ? Math.round(10 * e.height) : e.kind === 'house' ? 5 : 1;
  const destroyedNow = LW => LW.sceneryEntries.filter(e => e.destroyed);

  LW_TESTS.push({
    name: 'kaiju: Play Kaiju shows the start screen, Start drops Scalezor at a city edge (AC 1)', game: 'kaiju',
    run(LW) {
      if (!$('play-kaiju')) throw new Error('no Play Kaiju button');
      $('play-kaiju').click();
      if ($('panel').hidden) throw new Error('the start screen did not show');
      if (!/Scalezor/.test($('p-text').textContent)) throw new Error('the start screen does not name Scalezor');
      if (LW.game.running) throw new Error('the run must wait for Start');
      // The loop runs under the start screen. On a fresh page no run has happened yet, and this once threw
      // every frame before the render call: a frozen screen. It only shows for the first Kaiju of a page load.
      for (let i = 0; i < 3; i++) LW.frame(1 / 60);
      $('p-go').click();
      const G = LW.game, K = LW.kaiju;
      if (!G.running || G.kind !== 'kaiju') throw new Error('Start did not begin a Kaiju run');
      if (G.score !== 0) throw new Error('score must start at 0');
      if (!K.mesh.visible) throw new Error('the kaiju is not visible');
      if (LW.player.visible) throw new Error('the plane must be hidden');
      const c = LW.CITIES[0], a = G.p.angleTo(c.dir);
      if (Math.abs(a - c.cap) > 0.05) throw new Error(`the kaiju starts ${a.toFixed(2)} from the city centre, the edge is ${c.cap.toFixed(2)}`);
      if (K.mesh.position.length() < LW.R) throw new Error('the kaiju starts below sea level');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: arrows walk and turn, speed 1.0 is 0.7 units/s (AC 2)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 1 / 60);
      const a = G.p.clone(), f0 = G.f.clone();
      G.keys.add('up'); step(LW, 1); G.keys.delete('up');
      const d = a.angleTo(G.p) * K.mesh.position.length();
      if (d < 0.55 || d > 0.8) throw new Error(`walked ${d.toFixed(2)} in 1 s, expected about 0.7`);
      G.keys.add('left'); step(LW, 0.5); G.keys.delete('left');
      if (G.f.angleTo(f0) < 0.2) throw new Error('left did not turn the kaiju');
      const b = G.p.clone();
      G.keys.add('down'); step(LW, 0.5); G.keys.delete('down');
      if (b.angleTo(G.p) === 0) throw new Error('down did not walk back');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: feet stay on the terrain over hills and plateau (AC 2)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      let checked = 0;
      for (let leg = 0; leg < 6; leg++) {
        G.keys.add('up'); G.keys.add(leg % 2 ? 'left' : 'right');
        for (let i = 0; i < 90; i++) {
          LW.frame(1 / 60);
          const h = LW.heightAt(G.p);
          if (h < LW.R) continue;   // wading is checked separately
          const len = K.mesh.position.length();
          if (Math.abs(len - h) > 0.01) throw new Error(`feet at ${len.toFixed(3)}, ground at ${h.toFixed(3)}`);
          checked++;
        }
        G.keys.clear();
      }
      if (checked < 100) throw new Error(`only ${checked} frames on land`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: wades into shallow sea at half speed, deep sea turns it back (AC 2 sea rules)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game, V = LW.V3;
      // find a shore: land point with deep water 1.5 ahead
      let found = false;
      for (let tries = 0; tries < 40000 && !found; tries++) {
        const d = new V(Math.random() - .5, Math.random() - .5, Math.random() - .5).normalize();
        if (LW.heightAt(d) < LW.R + 0.02) continue;
        const f = new V(0, 1, 0).cross(d).normalize().applyAxisAngle(d, Math.random() * 6.283);
        const axis = new V().crossVectors(d, f).normalize();
        const far = d.clone().applyAxisAngle(axis, 1.5 / LW.R);
        if (LW.heightAt(far) < LW.R - 0.6) { G.p.copy(d); G.f.copy(f); found = true; }
      }
      if (!found) throw new Error('no shore with deep water found on this planet');
      step(LW, 1 / 60);
      G.keys.add('up');
      let wadeSpeed = 0, lowest = 99;
      for (let i = 0; i < 60 * 12; i++) {
        const before = G.p.clone(), h0 = LW.heightAt(G.p);
        LW.frame(1 / 60);
        lowest = Math.min(lowest, LW.heightAt(G.p));
        if (h0 < LW.R - 0.02 && h0 > LW.R - 0.25 && !wadeSpeed) wadeSpeed = before.angleTo(G.p) * K.mesh.position.length() * 60;
      }
      G.keys.clear();
      if (lowest < LW.R - 0.35) throw new Error(`walked into deep water: ground ${lowest.toFixed(2)} against sea level ${LW.R}`);
      if (wadeSpeed && wadeSpeed > 0.7 * 0.6) throw new Error(`wading speed ${wadeSpeed.toFixed(2)}, expected about 0.35`);
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: the camera stays out of the buildings and keeps the kaiju in view (AC 2)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game, cam = LW.camera;
      const c = LW.CITIES[0];
      // walk straight through the city centre
      G.p.copy(c.dir); G.f.copy(c.t2);
      G.keys.add('up');
      for (let i = 0; i < 60 * 6; i++) {
        LW.frame(1 / 60);
        const d = cam.position.clone().normalize();
        if (d.angleTo(c.dir) < c.cap && cam.position.length() < LW.courier.skyFloor(d) - 0.01)
          throw new Error(`camera ${cam.position.length().toFixed(2)} is inside the skyline (floor ${LW.courier.skyFloor(d).toFixed(2)})`);
        if (i > 120) {
          const to = K.mesh.position.clone().project(cam);
          if (Math.abs(to.x) > 0.9 || Math.abs(to.y) > 0.9 || to.z > 1) throw new Error('the kaiju left the view');
        }
      }
      G.keys.clear();
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: stomp wrecks a building in front, scores 10 x height, shows a burst (AC 3)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 1 / 60);
      const b = buildings(LW)[0];
      standNear(LW, b.pos, 0.5);
      const cars = LW.raid.civilians.filter(c => c.kind === 'car');
      const carsBefore = cars.filter(c => !c.alive).length;
      K.stomp();
      if (!b.destroyed) throw new Error('the building in front survived the stomp');
      const gone = destroyedNow(LW).reduce((s, e) => s + pointsOf(e), 0);
      const carPts = (cars.filter(c => !c.alive).length - carsBefore) * 5;
      if (G.score !== gone + carPts) throw new Error(`score ${G.score}, expected ${gone + carPts}`);
      if (G.score < Math.round(10 * b.height)) throw new Error('score is below 10 x height');
      if (!LW.raid.bursts.some(x => x.g.visible)) throw new Error('no dust or POW burst');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: stomp leaves what is behind it alone (AC 3)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 1 / 60);
      const b = buildings(LW)[0];
      standNear(LW, b.pos, 0.5, true);   // facing away: the building is at its back
      K.stomp();
      if (b.destroyed) throw new Error('stomp wrecked a building behind the kaiju');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: Scalezor swipes behind in a wide arc and not in front (AC 3)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 1 / 60);
      const b = buildings(LW)[0];
      standNear(LW, b.pos, 0.6);   // building ahead: outside the tail's arc
      K.swipe();
      if (b.destroyed) throw new Error('the tail wrecked a building in front');
      standNear(LW, b.pos, 0.6, true);   // building behind
      K.swipe();
      if (!b.destroyed) throw new Error('the tail missed a building right behind');
      if (G.score < Math.round(10 * b.height)) throw new Error('swipe did not score the building');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: stomp and swipe squash cars for 5 and a swipe knocks down low planes for 40 (AC 3)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 1 / 60);
      const car = LW.raid.civilians.find(c => c.kind === 'car');
      standNear(LW, car.obj.position.clone(), 0.5);
      const before = G.score;
      K.stomp();
      if (car.alive) throw new Error('the car under the stomp survived');
      if (G.score < before + 5) throw new Error('a car is worth 5');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: Space, F and the buttons trigger the moves, and key hold repeats slowly (AC 3, 11)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 1 / 60);
      const b = buildings(LW)[0];
      standNear(LW, b.pos, 0.5);
      G.keys.add('fire'); LW.frame(1 / 60); G.keys.delete('fire');
      if (!b.destroyed) throw new Error('Space did not stomp');
      const b2 = buildings(LW)[0];
      standNear(LW, b2.pos, 0.6, true);
      G.keys.add('swipe'); LW.frame(1 / 60); G.keys.delete('swipe');
      if (!b2.destroyed) throw new Error('F did not swipe');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: quit restores every building, house, tree and car (AC 9)', game: 'kaiju',
    run(LW) {
      const K = begin(LW), G = LW.game;
      step(LW, 1 / 60);
      for (let i = 0; i < 3; i++) { const b = buildings(LW)[i]; standNear(LW, b.pos, 0.5); K.stomp(); }
      const car = LW.raid.civilians.find(c => c.kind === 'car');
      standNear(LW, car.obj.position.clone(), 0.5); K.stomp();
      if (!destroyedNow(LW).length) throw new Error('nothing got wrecked');
      LW.games.quit();
      if (destroyedNow(LW).length) throw new Error('quit left scenery wrecked');
      if (LW.raid.civilians.some(c => !c.alive)) throw new Error('quit left traffic wrecked');
      if (K.mesh.visible) throw new Error('the kaiju stays on screen after quit');
      if (LW.mode !== 'orbit') throw new Error('quit did not return to the sandbox');
      if (!$('ui').hidden === false && $('game-buttons').hidden) throw new Error('the sandbox buttons are gone');
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: Esc quits and Sky Courier and Sky Raid still open after (AC 9)', game: 'kaiju',
    run(LW) {
      begin(LW);
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      if (LW.game.active) throw new Error('Esc did not quit');
      $('play-raid').click();
      if (LW.game.kind !== 'raid') throw new Error('Sky Raid does not open after Kaiju');
      LW.games.quit();
      $('play').click();
      if (LW.game.kind !== 'courier') throw new Error('Sky Courier does not open after Kaiju');
      LW.games.quit();
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: on touch the stick walks and Stomp and Swipe buttons act (AC 11)', game: 'kaiju',
    run(LW) {
      const T = LW.touch, G = LW.game;
      T.forceShow = true;
      try {
        const K = begin(LW);
        if (T.el.hidden) throw new Error('touch layer hidden in Kaiju');
        if (T.stompBtn.hidden || T.swipeBtn.hidden) throw new Error('Stomp and Swipe must show in Kaiju');
        if (!T.bombBtn.hidden) throw new Error('Bomb must not show in Kaiju');
        const a = G.p.clone();
        T.setStick(0, 1); step(LW, 0.5); T.setStick(0, 0);
        if (a.angleTo(G.p) === 0) throw new Error('the stick did not walk');
        const b = buildings(LW)[0];
        standNear(LW, b.pos, 0.5);
        T.stompPress(true); LW.frame(1 / 60); T.stompPress(false);
        if (!b.destroyed) throw new Error('Stomp button did nothing');
        const b2 = buildings(LW)[0];
        standNear(LW, b2.pos, 0.6, true);
        T.swipePress(true); LW.frame(1 / 60); T.swipePress(false);
        if (!b2.destroyed) throw new Error('Swipe button did nothing');
        LW.games.quit();
      } finally { T.setStick(0, 0); T.forceShow = false; if (LW.game.active) LW.games.quit(); }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'kaiju: Raid keeps its own buttons (Fire and Bomb) and hides Stomp and Swipe (AC 9, 11)', game: 'kaiju',
    run(LW) {
      const T = LW.touch;
      T.forceShow = true;
      try {
        $('play-raid').click(); $('p-go').click();
        if (T.fireBtn.hidden || T.bombBtn.hidden) throw new Error('Raid lost its buttons');
        if (!T.stompBtn.hidden || !T.swipeBtn.hidden) throw new Error('Raid shows the Kaiju buttons');
        LW.games.quit();
      } finally { T.forceShow = false; if (LW.game.active) LW.games.quit(); }
      return true;
    }
  });
})();
