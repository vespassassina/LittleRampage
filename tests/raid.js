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
  name: 'raid: AC2 training done - all balloons popped, score 16, panel shown',
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

    // Check panel is shown (training done)
    if ($('panel').hidden) throw new Error('Panel should be shown when training is done');

    LW.games.quit();
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
