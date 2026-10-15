// Sky Raid checks (AC 1, AC 2, AC 3, AC 8)

LW_TESTS.push({
  name: 'raid: start screen shows title',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);

    // Open raid from the main menu
    $('play-raid').click();

    const panel = $('panel');
    const title = $('p-title');

    if (panel.hidden) throw new Error('Panel should be visible on raid start screen');
    if (title.textContent !== 'Sky Raid') {
      throw new Error(`Title should be "Sky Raid", got "${title.textContent}"`);
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'raid: AC1 training start state',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;
    const R = LW.raid;

    // Open raid and click go button
    $('play-raid').click();
    $('p-go').click();

    // Check training state per AC1
    if (!G.running) throw new Error('Game should be running after start');
    if (G.kind !== 'raid') throw new Error(`Game kind should be 'raid', got '${G.kind}'`);

    const aliveCount = R.balloons.filter(b => b.alive).length;
    if (aliveCount !== 8) throw new Error(`Should have 8 alive balloons, got ${aliveCount}`);

    if (G.lives !== 3) throw new Error(`Should start with 3 lives, got ${G.lives}`);
    if (G.score !== 0) throw new Error(`Score should be 0 at start, got ${G.score}`);

    if (R.enemies.length !== 0) throw new Error(`Should have no enemies in training, got ${R.enemies.length}`);

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'raid: AC3 shot spawns along heading',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;
    const R = LW.raid;

    // Start raid
    $('play-raid').click();
    $('p-go').click();

    // Move balloons far away so we can fire without hitting them
    R.balloons.forEach(b => b.mesh.position.multiplyScalar(3));

    const shotsBefore = R.shots.filter(s => s.life > 0).length;
    R.fire();
    for (let i = 0; i < Math.round(1 / 60 * 60); i++) LW.frame(1 / 60);
    const shotsAfter = R.shots.filter(s => s.life > 0).length;

    if (shotsAfter !== shotsBefore + 1) {
      throw new Error(`Shot count should increase by 1, was ${shotsBefore}, now ${shotsAfter}`);
    }

    const shot = R.shots.find(s => s.life > 0);
    if (!shot) throw new Error('Could not find the newly fired shot');

    // Check shot is ahead of plane along heading
    const shotPos = R.shotWorld(shot);
    const planePos = LW.player.position.clone();
    const heading = G.f;
    const toShot = shotPos.clone().sub(planePos).normalize();
    const dotProduct = toShot.dot(heading);

    if (dotProduct < 0.9) {
      throw new Error(`Shot should be ahead along heading, dot product was ${dotProduct.toFixed(2)}, need > 0.9`);
    }

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'raid: AC3 shot expires after range',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const R = LW.raid;

    // Start raid
    $('play-raid').click();
    $('p-go').click();

    // Move balloons far
    R.balloons.forEach(b => b.mesh.position.multiplyScalar(3));

    R.fire();

    // Let the shot travel for 1.2 seconds
    for (let i = 0; i < Math.round(1.2 * 60); i++) LW.frame(1 / 60);

    const shotsAlive = R.shots.filter(s => s.life > 0).length;
    if (shotsAlive !== 0) {
      throw new Error(`All shots should have expired after 1.2s, but ${shotsAlive} still alive`);
    }

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'raid: AC2 pop balloon increments score',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;
    const R = LW.raid;

    // Start raid
    $('play-raid').click();
    $('p-go').click();

    // Place a balloon ahead of the plane
    // Balloons spawn at an unseeded random bearing (index.html placeBalloons): move every
    // OTHER balloon far out of the firing lane first, or a stray one can absorb the shot
    // meant for the one this test is tracking.
    const clearLane = () => R.balloons.forEach(b => b.mesh.position.multiplyScalar(50));
    const placeAhead = (b) => {
      clearLane();
      const p = LW.player.position.clone().addScaledVector(G.f, 1.5);
      b.mesh.position.copy(p);
      b.base = p.clone();
    };

    const balloon = R.balloons.find(b => b.alive);
    if (!balloon) throw new Error('No alive balloons to test with');

    placeAhead(balloon);

    const scoreBefore = G.score;
    R.fire();
    for (let i = 0; i < Math.round(0.5 * 60); i++) LW.frame(1 / 60);

    if (balloon.alive) throw new Error('Balloon should be popped after shot');
    if (G.score !== scoreBefore + 2) {
      throw new Error(`Score should increase by 2 for pop, was ${scoreBefore}, now ${G.score}`);
    }

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'raid: AC2 burst visual shown on pop',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const R = LW.raid;
    const G = LW.game;

    // Start raid
    $('play-raid').click();
    $('p-go').click();

    // Place and pop a balloon
    // Balloons spawn at an unseeded random bearing (index.html placeBalloons): move every
    // OTHER balloon far out of the firing lane first, or a stray one can absorb the shot
    // meant for the one this test is tracking.
    const clearLane = () => R.balloons.forEach(b => b.mesh.position.multiplyScalar(50));
    const placeAhead = (b) => {
      clearLane();
      const p = LW.player.position.clone().addScaledVector(G.f, 1.5);
      b.mesh.position.copy(p);
      b.base = p.clone();
    };

    const balloon = R.balloons.find(b => b.alive);
    placeAhead(balloon);

    R.fire();
    for (let i = 0; i < Math.round(0.5 * 60); i++) LW.frame(1 / 60);

    const recentBurst = R.bursts.some(x => x.age < 1);
    if (!recentBurst) throw new Error('Burst visual should be shown after pop');

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'raid: AC2 training done - all balloons popped, score 16, wave 1 starts',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;
    const R = LW.raid;

    // Start raid
    $('play-raid').click();
    $('p-go').click();

    // Pop all balloons
    // Balloons spawn at an unseeded random bearing (index.html placeBalloons): move every
    // OTHER balloon far out of the firing lane first, or a stray one can absorb the shot
    // meant for the one this test is tracking.
    const clearLane = () => R.balloons.forEach(b => b.mesh.position.multiplyScalar(50));
    const placeAhead = (b) => {
      clearLane();
      const p = LW.player.position.clone().addScaledVector(G.f, 1.5);
      b.mesh.position.copy(p);
      b.base = p.clone();
    };

    for (const b of R.balloons.filter(b => b.alive)) {
      placeAhead(b);
      R.fire();
      for (let i = 0; i < Math.round(0.5 * 60); i++) LW.frame(1 / 60);
    }

    // Check all balloons are dead
    const anyAlive = R.balloons.some(b => b.alive);
    if (anyAlive) throw new Error('Not all balloons were popped');

    // Check score: 8 balloons × 2 points each = 16
    if (G.score !== 16) throw new Error(`Score should be 16, got ${G.score}`);

    // Training done: the fight starts at once, no panel in the way (R2 AC2; details in raid-fight.js)
    if (R.wave !== 1) throw new Error(`Wave 1 should start after training, got wave ${R.wave}`);

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'raid: training balloons stay reachable in trivial time (P1 AC8: R=15 balance)',
  game: 'raid',
  run(LW) {
    // Sprint P1 grew the planet (R 10 -> 15, 5 cities) without retuning placeBalloons()'s
    // spread. Verified by hand it still holds (docs/DECISIONS.md: farthest balloon at
    // R=15 sits ~9.2 units from the start position, popped in 5.4s of real steered
    // flight) - but placeBalloons() spreads balloons by a FIXED ANGLE around the start
    // city, so the straight-line distance a player must cover scales with R. Lock down
    // the invariant a future, bigger resize (P2) could silently break: every balloon
    // must be reachable within a few seconds of cruise flight, not a training-round-long trek.
    const $ = id => document.getElementById(id);
    $('play-raid').click();
    $('p-go').click();

    const R = LW.raid, G = LW.game;
    const REACH_SECONDS = 15;   // generous: training should never require more than this to close the distance
    const maxReachDist = LW.SPEED * REACH_SECONDS;

    let worst = 0;
    for (const b of R.balloons) {
      const d = b.mesh.position.distanceTo(LW.player.position);
      if (d > worst) worst = d;
    }

    LW.games.quit();

    if (worst > maxReachDist) {
      throw new Error(
        `Farthest balloon is ${worst.toFixed(2)} units from the start position, more than ` +
        `${REACH_SECONDS}s of cruise flight (${maxReachDist.toFixed(2)} units) away`
      );
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'raid: AC8 quit restores sandbox state',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;
    const R = LW.raid;

    // Start raid
    $('play-raid').click();
    $('p-go').click();

    // Quit with Escape key
    dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    // Check sandbox state is restored
    if (G.active) throw new Error('Game should not be active after quit');
    if ($('ui').hidden) throw new Error('UI should be visible after quit');
    if (!$('hud').hidden) throw new Error('HUD should be hidden after quit');
    if (LW.player.visible) throw new Error('Player should not be visible after quit');

    const balloonsVisible = R.balloons.some(b => b.mesh.visible);
    if (balloonsVisible) throw new Error('Balloons should not be visible after quit');

    const shotsLive = R.shots.some(s => s.life > 0);
    if (shotsLive) throw new Error('All shots should be dead after quit');

    return true;
  }
});

LW_TESTS.push({
  name: 'raid: training balloons are reachable by diving in from the city (regression: unreachable near city cap)',
  game: 'raid',
  run(LW) {
    // Bug: skyFloor() jumps hard at a city's cap+0.08 radius, from HC + c.maxH + 0.25
    // (inside) down to terrain height (outside). placeBalloons() used to add only
    // rr(0.1, 1.2) above a balloon's OWN local floor, so a balloon scattered just past
    // that radius could sit well below the floor a player flying out from the training
    // town start point is still pinned to - and CLIMB (1.4/s) isn't fast enough to dive
    // that far down in the short distance left to the balloon. Fixed by raising the
    // margin to rr(1.2, 2.0).
    //
    // placeBalloons() rolls an unseeded random bearing AND margin per balloon
    // (Math.random(), not the app's seeded rand()), so this test doesn't trust whatever
    // this run happened to roll for either. It reads the actual lowest margin this run's
    // 8 balloons landed on (real, live placeBalloons() output - not a hardcoded copy of
    // the fix's constants, so a future regression that lowers the margin again would
    // still be caught), then re-applies that same worst-observed margin at every balloon
    // slot's scatter angle (ang = 0.12 + i*0.06) and every bearing - the full space the
    // unseeded RNG could have picked.
    const $ = id => document.getElementById(id);
    $('play-raid').click();
    $('p-go').click();

    const R = LW.raid, TRAINING = 8;
    const city = LW.CITIES[0];
    const start = city.dir;
    const SPEED = LW.SPEED, CLIMB = 1.4;   // CLIMB isn't exposed on LW; keep this in sync with index.html by hand
    const [t1, t2] = (() => {
      const a = Math.abs(start.y) < 0.9 ? new LW.V3(0, 1, 0) : new LW.V3(1, 0, 0);
      const u = new LW.V3().crossVectors(a, start).normalize();
      return [u, new LW.V3().crossVectors(start, u)];
    })();

    function slerp(a, b, t) {
      const theta = a.angleTo(b);
      if (theta < 1e-9) return a.clone();
      const s0 = Math.sin((1 - t) * theta) / Math.sin(theta), s1 = Math.sin(t * theta) / Math.sin(theta);
      return a.clone().multiplyScalar(s0).addScaledVector(b, s1).normalize();
    }

    // Dives from the training town's start altitude toward `dir`, never below skyFloor()
    // at the current point, at the fastest rate the game allows (CLIMB). Returns the
    // lowest altitude reachable by the time the plane gets there.
    function reachableAlt(dir, samples = 400) {
      let alt = LW.courier.skyFloor(start) + 0.4;   // matches G.alt's start-of-run value
      const totalAng = start.angleTo(dir);
      for (let s = 1; s <= samples; s++) {
        const p = slerp(start, dir, s / samples);
        const dt = (totalAng / samples * alt) / SPEED;   // advance()'s ang = dist/alt, inverted
        alt = Math.max(LW.courier.skyFloor(p), alt - CLIMB * dt);
      }
      return alt;
    }

    // This run's actual worst-observed margin: how far each real balloon cleared its own
    // local floor, minimised over the 8. Stands in for placeBalloons()'s rr() lower bound
    // without hardcoding it.
    const observedMinMargin = R.balloons.reduce(
      (min, b) => Math.min(min, b.mesh.position.length() - LW.courier.skyFloor(b.dir)), Infinity);

    let worstI = -1, worstBearing = -1, worstShortfall = -Infinity;
    for (let i = 0; i < TRAINING; i++) {
      const ang = 0.12 + i * 0.06;
      for (let bearing = 0; bearing < 6.283; bearing += 0.1) {
        const dir = start.clone().multiplyScalar(Math.cos(ang))
          .addScaledVector(t1, Math.sin(ang) * Math.cos(bearing))
          .addScaledVector(t2, Math.sin(ang) * Math.sin(bearing)).normalize();
        const targetAlt = LW.courier.skyFloor(dir) + observedMinMargin;
        const shortfall = reachableAlt(dir) - targetAlt;   // positive = can't dive low enough in time
        if (shortfall > worstShortfall) { worstShortfall = shortfall; worstI = i; worstBearing = bearing; }
      }
    }

    LW.games.quit();

    if (worstShortfall > 0) {
      throw new Error(
        `Balloon slot ${worstI} at bearing ${worstBearing.toFixed(2)} would be unreachable by ` +
        `${worstShortfall.toFixed(3)}, even at this run's own worst margin (${observedMinMargin.toFixed(3)}) - ` +
        `a plane diving in from the training town at the game's CLIMB rate can't shed altitude fast enough`
      );
    }
    return true;
  }
});
