/**
 * Test convention for Little Worlds (tests.html runner)
 *
 * Each test file registers test functions onto the global LW_TESTS array.
 * No build step needed; tests.html loads these as plain <script> tags.
 *
 * Test object shape:
 * {
 *   name: string           // Human-readable test name
 *   game: string           // Game key ('courier', 'raid', etc.)
 *   run(LW)               // Receives window.LW from test iframe
 * }
 *
 * run() contract:
 * - Has access to LW.games.open(), LW.games.start(), LW.frame(1/60), etc.
 * - Returns true on success OR throws an Error with descriptive message
 * - Should open, start, and quit its own game (tests are independent, order-free)
 * - Must not rely on state from other tests
 *
 * Example:
 *   LW_TESTS.push({
 *     name: 'courier: movement',
 *     game: 'courier',
 *     run(LW) {
 *       LW.games.open('courier');
 *       LW.games.start();
 *       const before = LW.game.score;
 *       // ... test logic ...
 *       LW.games.quit();
 *       if (LW.game.score === before + 1) return true;
 *       throw new Error(`Score did not increment: was ${before}, now ${LW.game.score}`);
 *     }
 *   });
 */

// Register tests for Sky Courier

LW_TESTS.push({
  name: 'courier: start gives time, score 0, a target',
  game: 'courier',
  run(LW) {
    LW.games.open('courier');
    LW.games.start();
    const G = LW.game;

    if (!G.running) throw new Error('Game not running after start');
    if (G.time <= 0) throw new Error(`Game time should be > 0, got ${G.time}`);
    if (G.score !== 0) throw new Error(`Score should be 0 at start, got ${G.score}`);
    if (!G.town) throw new Error('No target (town) assigned at start');

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'courier: right turn is clockwise',
  game: 'courier',
  run(LW) {
    LW.games.open('courier');
    LW.games.start();
    const G = LW.game;

    // Capture initial heading and position
    const f0 = G.f.clone();
    const p0 = G.p.clone();

    // Press right for 1 frame
    G.keys.add('right');
    for (let i = 0; i < Math.round(1 * 60); i++) LW.frame(1 / 60);
    G.keys.delete('right');

    // Check if turn is clockwise: cross(f0, f_new) dot p should be negative
    // (right turn = clockwise when viewed from above)
    const cw = new LW.V3().crossVectors(f0, G.f).dot(G.p) < 0;

    LW.games.quit();

    if (!cw) throw new Error('Right turn did not go clockwise');
    return true;
  }
});

LW_TESTS.push({
  name: 'courier: delivery time bonus covers cruise-speed flight time (P1 AC8: R=15 balance)',
  game: 'courier',
  run(LW) {
    // Sprint P1 grew the planet (R 10 -> 15, 3 -> 5 cities) without retuning the
    // delivery time bonus. Verified by hand that it still holds (docs/DECISIONS.md),
    // because newLeg()'s bonus is itself proportional to travel distance - but that's
    // an invariant worth locking down, not just a one-off finding: if a future resize
    // (or a bonus-formula change) ever grants less time than a straight-line flight at
    // cruise speed actually costs, a run could end before a leg is even flyable.
    LW.games.open('courier');
    LW.games.start();
    const G = LW.game;

    for (let i = 0; i < 8; i++) {
      const fromDir = G.town.dir.clone();
      const timeBefore = G.time;
      G.p.copy(G.town.dir);   // teleport onto the current target (same trick the delivery test above uses)
      LW.frame(1 / 60);       // one frame: delivery fires, newLeg() picks the next target and grants its bonus
      const arcDist = fromDir.angleTo(G.town.dir) * G.alt;   // the game flies at G.alt, not R
      const bonus = G.time - timeBefore + 1 / 60;
      const cruiseFlightTime = arcDist / LW.SPEED;

      if (bonus <= cruiseFlightTime) {
        LW.games.quit();
        throw new Error(
          `Leg ${i}: bonus ${bonus.toFixed(2)}s does not cover a ${arcDist.toFixed(2)}-unit leg's ` +
          `${cruiseFlightTime.toFixed(2)}s cruise-speed flight time - the next delivery would be unflyable`
        );
      }
      if (G.time <= 0) break;
    }

    LW.games.quit();
    return true;
  }
});

LW_TESTS.push({
  name: 'courier: delivery increments score',
  game: 'courier',
  run(LW) {
    LW.games.open('courier');
    LW.games.start();
    const G = LW.game;

    const scoreBefore = G.score;

    // Move plane to town direction (one frame should be enough to trigger delivery)
    G.p.copy(G.town.dir);
    for (let i = 0; i < Math.round(1 / 60 * 60); i++) LW.frame(1 / 60);

    LW.games.quit();

    if (G.score !== scoreBefore + 1) {
      throw new Error(`Score should increment by 1 on delivery, was ${scoreBefore}, now ${G.score}`);
    }
    return true;
  }
});
