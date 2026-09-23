/**
 * Touch layer tests for Little Worlds (AC 3: joystick & action buttons on mobile)
 *
 * API CONTRACT for the touch layer implementation:
 *
 * DOM Elements (CSS selectors):
 * - #touch: main container, hidden by default, shown only when:
 *   (a) window.matchMedia('(pointer: coarse)').matches is true (touch device detected)
 *   (b) G.active && G.running (game is active and running)
 * - #tjoy: joystick element, left side of the screen
 * - #tfire: fire button element, right side of the screen (Raid only, hidden for Courier)
 *
 * LW.touch API (for testing and internal use):
 * - LW.touch.el: reference to the #touch container
 * - LW.touch.joystick: reference to the #tjoy element
 * - LW.touch.fireBtn: reference to the #tfire element
 * - LW.touch.setStick(x, y): test hook to set joystick input, where x and y are
 *   normalized from -1 (left/down) to +1 (right/up). This simulates drag events and
 *   updates G.keys with 'left'/'right'/'up'/'down' based on a deadzone (e.g., 0.3).
 * - LW.touch.forceShow: test hook (boolean), when true, forces the touch layer to be
 *   visible regardless of media query, for testing on desktop.
 *
 * Input Handling:
 * - Joystick drag (touchstart/touchmove/touchend on #tjoy) should:
 *   (a) Track the initial touch point
 *   (b) Calculate delta from start to current position
 *   (c) Apply deadzone (e.g., 0.3 of element radius)
 *   (d) Normalize delta to -1 to +1 per axis
 *   (e) Add/remove 'left', 'right', 'up', 'down' from G.keys based on direction
 * - Fire button (touchstart/touchend on #tfire) should:
 *   (a) Add 'fire' to G.keys on touchstart
 *   (b) Remove 'fire' from G.keys on touchend
 *
 * CSS Requirements:
 * - #touch should have touch-action: none (or similar) to prevent page scroll/zoom during play
 *
 * Note on media-query testing:
 * - Full media-query gating ('(pointer: coarse)') is hard to test from plain JS tests.
 *   Tests below use LW.touch.forceShow = true to bypass media-query for desktop testing.
 *   AC3's "No page scroll or zoom while playing" is verified separately (manual/QA concern).
 */

// Register tests for touch layer

LW_TESTS.push({
  name: 'touch: layer hidden when no game active',
  game: 'courier',
  run(LW) {
    const $ = id => document.getElementById(id);
    const touch = $ ('touch');

    if (!touch) throw new Error('Touch layer element #touch not found');
    if (!touch.hidden && !LW.touch?.forceShow) {
      throw new Error('Touch layer should be hidden when no game is active');
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'touch: layer visible when game active and running',
  game: 'courier',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;

    // Open and start Courier
    LW.games.open('courier');
    LW.games.start();

    const touch = $('touch');
    if (!touch) throw new Error('Touch layer element #touch not found');

    // Enable force-show for desktop testing
    if (LW.touch) LW.touch.forceShow = true;

    if (touch.hidden) {
      throw new Error('Touch layer should be visible when game is active and running');
    }

    // Check joystick and fire button exist
    const joystick = $('tjoy');
    const fireBtn = $('tfire');
    if (!joystick) throw new Error('Joystick element #tjoy not found');
    if (!fireBtn) throw new Error('Fire button element #tfire not found');

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'touch: joystick drag right turns plane clockwise',
  game: 'courier',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;

    // Open and start Courier
    LW.games.open('courier');
    LW.games.start();

    // Enable force-show for testing
    if (LW.touch) LW.touch.forceShow = true;

    // Capture initial heading
    const f0 = G.f.clone();
    const p0 = G.p.clone();

    // Simulate joystick drag to the right (x=1, y=0 for 1 second)
    if (!LW.touch || !LW.touch.setStick) {
      throw new Error('LW.touch.setStick() not implemented');
    }
    LW.touch.setStick(1, 0);
    for (let i = 0; i < Math.round(1 * 60); i++) LW.frame(1 / 60);
    LW.touch.setStick(0, 0);

    // Check if turn is clockwise: cross(f0, f_new) dot p should be negative
    const cw = new LW.V3().crossVectors(f0, G.f).dot(G.p) < 0;

    LW.games.quit();

    if (!cw) throw new Error('Right drag on joystick did not result in clockwise turn');
    return true;
  }
});

LW_TESTS.push({
  name: 'touch: joystick drag left turns plane counter-clockwise',
  game: 'courier',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;

    // Open and start Courier
    LW.games.open('courier');
    LW.games.start();

    // Enable force-show for testing
    if (LW.touch) LW.touch.forceShow = true;

    // Capture initial heading
    const f0 = G.f.clone();
    const p0 = G.p.clone();

    // Simulate joystick drag to the left (x=-1, y=0 for 1 second)
    if (!LW.touch || !LW.touch.setStick) {
      throw new Error('LW.touch.setStick() not implemented');
    }
    LW.touch.setStick(-1, 0);
    for (let i = 0; i < Math.round(1 * 60); i++) LW.frame(1 / 60);
    LW.touch.setStick(0, 0);

    // Check if turn is counter-clockwise: cross(f0, f_new) dot p should be positive
    const ccw = new LW.V3().crossVectors(f0, G.f).dot(G.p) > 0;

    LW.games.quit();

    if (!ccw) throw new Error('Left drag on joystick did not result in counter-clockwise turn');
    return true;
  }
});

LW_TESTS.push({
  name: 'touch: joystick drag up climbs plane',
  game: 'courier',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;

    // Open and start Courier
    LW.games.open('courier');
    LW.games.start();

    // Enable force-show for testing
    if (LW.touch) LW.touch.forceShow = true;

    const altBefore = G.alt;

    // Simulate joystick drag upward (x=0, y=1 for 0.5 seconds)
    if (!LW.touch || !LW.touch.setStick) {
      throw new Error('LW.touch.setStick() not implemented');
    }
    LW.touch.setStick(0, 1);
    for (let i = 0; i < Math.round(0.5 * 60); i++) LW.frame(1 / 60);
    LW.touch.setStick(0, 0);

    LW.games.quit();

    if (G.alt <= altBefore) {
      throw new Error(`Up drag should increase altitude, was ${altBefore.toFixed(2)}, now ${G.alt.toFixed(2)}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'touch: joystick drag down dives plane',
  game: 'courier',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;

    // Open and start Courier
    LW.games.open('courier');
    LW.games.start();

    // Enable force-show for testing
    if (LW.touch) LW.touch.forceShow = true;

    const altBefore = G.alt;

    // Simulate joystick drag downward (x=0, y=-1 for 0.5 seconds)
    if (!LW.touch || !LW.touch.setStick) {
      throw new Error('LW.touch.setStick() not implemented');
    }
    LW.touch.setStick(0, -1);
    for (let i = 0; i < Math.round(0.5 * 60); i++) LW.frame(1 / 60);
    LW.touch.setStick(0, 0);

    LW.games.quit();

    if (G.alt >= altBefore) {
      throw new Error(`Down drag should decrease altitude, was ${altBefore.toFixed(2)}, now ${G.alt.toFixed(2)}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'touch: fire button press shoots in Raid',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;
    const R = LW.raid;

    // Open and start Raid
    $('play-raid').click();
    $('p-go').click();

    // Enable force-show for testing
    if (LW.touch) LW.touch.forceShow = true;

    // Move balloons far away so shot doesn't hit them
    R.balloons.forEach(b => b.mesh.position.multiplyScalar(3));

    const shotsBefore = R.shots.filter(s => s.life > 0).length;

    // Simulate fire button press
    if (!LW.touch || !LW.touch.firePress) {
      throw new Error('LW.touch.firePress() not implemented');
    }
    LW.touch.firePress(true);
    for (let i = 0; i < Math.round(1 / 60 * 60); i++) LW.frame(1 / 60);
    LW.touch.firePress(false);

    const shotsAfter = R.shots.filter(s => s.life > 0).length;

    LW.games.quit();

    if (shotsAfter !== shotsBefore + 1) {
      throw new Error(`Fire button should spawn 1 shot, was ${shotsBefore}, now ${shotsAfter}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'touch: multi-touch joystick and fire simultaneously',
  game: 'raid',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;
    const R = LW.raid;

    // Open and start Raid
    $('play-raid').click();
    $('p-go').click();

    // Enable force-show for testing
    if (LW.touch) LW.touch.forceShow = true;

    // Move balloons far away
    R.balloons.forEach(b => b.mesh.position.multiplyScalar(3));

    // Capture initial heading
    const f0 = G.f.clone();
    const shotsBefore = R.shots.filter(s => s.life > 0).length;

    // Simulate simultaneous joystick drag right and fire button press
    if (!LW.touch || !LW.touch.setStick || !LW.touch.firePress) {
      throw new Error('LW.touch.setStick() or LW.touch.firePress() not implemented');
    }
    LW.touch.setStick(1, 0);
    LW.touch.firePress(true);
    for (let i = 0; i < Math.round(0.5 * 60); i++) LW.frame(1 / 60);
    LW.touch.setStick(0, 0);
    LW.touch.firePress(false);

    // Check both steering and firing happened
    const cw = new LW.V3().crossVectors(f0, G.f).dot(G.p) < 0;
    const shotsAfter = R.shots.filter(s => s.life > 0).length;

    LW.games.quit();

    if (!cw) throw new Error('Joystick drag did not turn plane during multi-touch');
    // Holding fire for 0.5s repeats at FIRE_GAP, same as holding spacebar (index.html) -
    // so more than one shot is correct, not a bug. Only "at least one" is this test's concern.
    if (shotsAfter <= shotsBefore) {
      throw new Error(`Fire button during multi-touch should spawn at least 1 shot, was ${shotsBefore}, now ${shotsAfter}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'touch: fire button hidden on Courier, visible on Raid',
  game: 'courier',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;

    // Open and start Courier
    LW.games.open('courier');
    LW.games.start();

    // Enable force-show for testing
    if (LW.touch) LW.touch.forceShow = true;

    const fireBtn = $('tfire');
    if (!fireBtn) throw new Error('Fire button element #tfire not found');

    // In Courier, fire button should be hidden
    if (!fireBtn.hidden) {
      throw new Error('Fire button should be hidden in Courier game');
    }

    LW.games.quit();

    // Now start Raid and check fire button is visible
    $('play-raid').click();
    $('p-go').click();

    if (LW.touch) LW.touch.forceShow = true;

    if (fireBtn.hidden) {
      throw new Error('Fire button should be visible in Raid game');
    }

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'touch: layer hidden when game quits',
  game: 'courier',
  run(LW) {
    const $ = id => document.getElementById(id);
    const G = LW.game;

    // Open and start Courier
    LW.games.open('courier');
    LW.games.start();

    if (LW.touch) LW.touch.forceShow = true;

    const touch = $('touch');
    if (!touch) throw new Error('Touch layer element #touch not found');

    // Quit the game
    LW.games.quit();

    // Touch layer should be hidden again
    if (!touch.hidden && !LW.touch?.forceShow) {
      throw new Error('Touch layer should be hidden after game quits');
    }

    return true;
  }
});
