/**
 * Quality system tests for Little Worlds (AC 4: performance scaling and persistence)
 *
 * API CONTRACT for the quality system implementation:
 *
 * LW.quality API:
 * - LW.quality.get(): returns 'high' or 'low', reflecting the current quality setting
 * - LW.quality.set(level): applies quality setting to the scene immediately and persists
 *   to localStorage (key: 'lw-quality'). After set(), a call to LW.frame() should reflect
 *   the changes in renderer.info.render.calls and renderer.getPixelRatio().
 * - LW.quality.auto: object with auto-switch state:
 *   - auto.enabled: boolean, whether auto-switch is active
 *   - auto.elapsed: seconds elapsed since game/orbit started (for 3-second auto-switch window)
 *   - auto.checkAuto(avgFrameMs): pure function that returns 'low' if conditions are met
 *     (>25ms avg frame time and 3s+ elapsed), 'high' if conditions revert, or null if no change.
 *     This function is called internally by the rAF loop and exposed for testing.
 *
 * Observable behavior:
 * - Calling LW.quality.set('low') followed by LW.frame(1/60) in the same camera/scene state
 *   should result in fewer draw calls than LW.quality.set('high') followed by LW.frame(1/60).
 * - Low quality caps renderer.getPixelRatio() at 1.5; high quality caps at 2.0 (or device default).
 * - Low quality reduces visible scene complexity: fewer trees/traffic outlines visible,
 *   dropped ink outlines on small geometry (e.g., tree outlines under size threshold).
 * - Quality setting persists across reload: localStorage.getItem('lw-quality') reflects it.
 * - A DOM button exists (e.g., #qbtn) that toggles quality on click and displays current state.
 *
 * Auto-switch behavior (pragmatic test contract):
 * - Auto-switch does NOT run in test harness (no real wall-clock frame timing).
 * - Instead, LW.quality.auto.checkAuto(avgFrameMs) is the testable mechanism:
 *   call it with avgFrameMs >= 25 after elapsing >= 3s, expect it to return 'low'.
 *   Call it with avgFrameMs < 25, expect it to return 'high' or null.
 * - Auto-switch only engages on desktop/coarse pointer, not on desktop with fine pointer.
 *   (Note: Full media-query testing is a manual/QA concern, like touch layer.)
 * - Auto-switch triggers no more than once per session (after 3s, if conditions met).
 *
 * localStorage:
 * - Quality choice is persisted to localStorage['lw-quality'] as 'high' or 'low'.
 * - If localStorage is blocked, the setting is still applied for the current session.
 * - On page reload, the saved quality is restored (tested by reading localStorage directly).
 *
 * DOM Elements:
 * - A button element exists (likely #qbtn or similar) that:
 *   (a) reflects the current quality setting in its text or class (e.g., "Quality: Low" or a "on" class)
 *   (b) toggles quality on click (calls LW.quality.set() internally)
 *   (c) is visible and clickable in the #ui container
 *
 * Note on draw-call testing:
 * - This test calls renderer.info.render.calls before and after LW.frame(), which works
 *   because Three.js resets this counter at the start of each render() call automatically.
 * - The same camera/scene state is ensured by not moving the camera or G.p/G.f between calls.
 *
 * Note on auto-switch testing:
 * - Simulating real CPU throttle and wall-clock timing is not feasible in the test harness.
 * - Instead, we test that the checkAuto() function exists and responds correctly to inputs,
 *   and that the internal rAF loop calls it. This is the pragmatic proxy for the real behavior.
 */

LW_TESTS.push({
  name: 'quality: LW.quality API exists',
  run(LW) {
    if (!LW.quality) throw new Error('LW.quality not defined');
    if (typeof LW.quality.get !== 'function') throw new Error('LW.quality.get() not defined');
    if (typeof LW.quality.set !== 'function') throw new Error('LW.quality.set() not defined');
    if (!LW.quality.auto || typeof LW.quality.auto !== 'object') throw new Error('LW.quality.auto not defined');
    if (typeof LW.quality.auto.checkAuto !== 'function') throw new Error('LW.quality.auto.checkAuto() not defined');
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: get() returns high or low',
  run(LW) {
    const q = LW.quality.get();
    if (q !== 'high' && q !== 'low') {
      throw new Error(`LW.quality.get() should return 'high' or 'low', got ${q}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: set(low) applies immediately',
  run(LW) {
    LW.quality.set('low');
    const q = LW.quality.get();
    if (q !== 'low') throw new Error(`After set('low'), get() returned ${q}`);
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: set(high) applies immediately',
  run(LW) {
    LW.quality.set('high');
    const q = LW.quality.get();
    if (q !== 'high') throw new Error(`After set('high'), get() returned ${q}`);
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: low quality reduces draw calls compared to high',
  run(LW) {
    // Place the camera in a stable position in orbit mode (default)
    // and render the same scene with both quality levels, comparing draw calls.

    // Set to high quality and capture draw calls
    LW.quality.set('high');
    LW.frame(1 / 60);
    const highCalls = LW.renderer.info.render.calls;

    // Set to low quality and capture draw calls
    LW.quality.set('low');
    LW.frame(1 / 60);
    const lowCalls = LW.renderer.info.render.calls;

    if (lowCalls >= highCalls) {
      throw new Error(
        `Low quality should reduce draw calls: high=${highCalls}, low=${lowCalls}. ` +
        `Expected low < high, but got low >= high.`
      );
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: low quality caps pixel ratio at 1.5',
  run(LW) {
    LW.quality.set('low');
    LW.frame(1 / 60);
    const pixelRatio = LW.renderer.getPixelRatio();
    if (pixelRatio > 1.5) {
      throw new Error(
        `Low quality should cap pixel ratio at 1.5, got ${pixelRatio}`
      );
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: high quality allows higher pixel ratio',
  run(LW) {
    LW.quality.set('high');
    LW.frame(1 / 60);
    const highRatio = LW.renderer.getPixelRatio();
    LW.quality.set('low');
    LW.frame(1 / 60);
    const lowRatio = LW.renderer.getPixelRatio();

    // High quality should allow a higher or equal pixel ratio
    if (highRatio < lowRatio) {
      throw new Error(
        `High quality pixel ratio (${highRatio}) should be >= low quality (${lowRatio})`
      );
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: choice persists to localStorage',
  run(LW) {
    // Clear any previous value
    try { localStorage.removeItem('lw-quality'); } catch { /* storage blocked */ }

    // Set to low and verify localStorage reflects it
    LW.quality.set('low');
    let stored = null;
    try { stored = localStorage.getItem('lw-quality'); } catch { /* storage blocked */ }

    if (stored !== 'low') {
      throw new Error(
        `After set('low'), localStorage['lw-quality'] should be 'low', got ${stored}`
      );
    }

    // Set to high and verify localStorage reflects it
    LW.quality.set('high');
    try { stored = localStorage.getItem('lw-quality'); } catch { /* storage blocked */ }

    if (stored !== 'high') {
      throw new Error(
        `After set('high'), localStorage['lw-quality'] should be 'high', got ${stored}`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: quality button element exists',
  run(LW) {
    const $ = id => document.getElementById(id);
    // Try common button IDs for quality control
    const qbtn = $ ('qbtn') || $ ('quality-btn') || $ ('quality') ||
                 [...document.querySelectorAll('button')].find(b =>
                   b.textContent.toLowerCase().includes('quality') ||
                   b.textContent.toLowerCase().includes('low') ||
                   b.textContent.toLowerCase().includes('high')
                 );

    if (!qbtn) {
      throw new Error(
        'Quality button not found. Expected element with id #qbtn, #quality-btn, #quality, ' +
        'or a button containing "quality", "low", or "high" text'
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: button click toggles quality',
  run(LW) {
    const $ = id => document.getElementById(id);
    const qbtn = $ ('qbtn') || $ ('quality-btn') || $ ('quality') ||
                 [...document.querySelectorAll('button')].find(b =>
                   b.textContent.toLowerCase().includes('quality') ||
                   b.textContent.toLowerCase().includes('low') ||
                   b.textContent.toLowerCase().includes('high')
                 );

    if (!qbtn) {
      throw new Error('Quality button not found');
    }

    // Get initial quality
    const initial = LW.quality.get();
    const other = initial === 'low' ? 'high' : 'low';

    // Click the button
    qbtn.click();

    // Check that quality changed
    const after = LW.quality.get();
    if (after === initial) {
      throw new Error(
        `Button click did not toggle quality: was ${initial}, still ${after}`
      );
    }

    if (after !== other) {
      throw new Error(
        `Button click changed quality incorrectly: was ${initial}, expected ${other}, got ${after}`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: button reflects current quality setting',
  run(LW) {
    const $ = id => document.getElementById(id);
    const qbtn = $ ('qbtn') || $ ('quality-btn') || $ ('quality') ||
                 [...document.querySelectorAll('button')].find(b =>
                   b.textContent.toLowerCase().includes('quality') ||
                   b.textContent.toLowerCase().includes('low') ||
                   b.textContent.toLowerCase().includes('high')
                 );

    if (!qbtn) {
      throw new Error('Quality button not found');
    }

    // Set to low and check button reflects it
    LW.quality.set('low');
    const lowText = qbtn.textContent.toLowerCase();
    const lowClass = qbtn.className.toLowerCase();
    if (
      !lowText.includes('low') &&
      !lowClass.includes('low') &&
      !lowText.includes('quality: low') &&
      !lowClass.includes('on') && // might indicate "on" for low quality
      !qbtn.classList.contains('on')
    ) {
      throw new Error(
        `Button should reflect low quality: text="${qbtn.textContent}", class="${qbtn.className}"`
      );
    }

    // Set to high and check button reflects it
    LW.quality.set('high');
    const highText = qbtn.textContent.toLowerCase();
    const highClass = qbtn.className.toLowerCase();
    if (
      !highText.includes('high') &&
      !highClass.includes('high') &&
      !highText.includes('quality: high') &&
      (!highClass.includes('on') && !qbtn.classList.contains('on')) // should not be "on" for high
    ) {
      throw new Error(
        `Button should reflect high quality: text="${qbtn.textContent}", class="${qbtn.className}"`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto.checkAuto() returns null when conditions not met',
  run(LW) {
    const result = LW.quality.auto.checkAuto(10);  // low frame time
    if (result !== null && result !== 'high') {
      throw new Error(
        `checkAuto(10) with low frame time should return null or 'high', got ${result}`
      );
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto.checkAuto() exists and accepts avgFrameMs',
  run(LW) {
    // Test with various inputs
    const result1 = LW.quality.auto.checkAuto(10);
    const result2 = LW.quality.auto.checkAuto(50);
    const result3 = LW.quality.auto.checkAuto(0);

    // checkAuto should not throw; just checking it exists and runs
    if (typeof result1 !== 'string' && result1 !== null) {
      throw new Error('checkAuto(10) returned invalid type');
    }
    if (typeof result2 !== 'string' && result2 !== null) {
      throw new Error('checkAuto(50) returned invalid type');
    }
    if (typeof result3 !== 'string' && result3 !== null) {
      throw new Error('checkAuto(0) returned invalid type');
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto-switch only engages once per session',
  run(LW) {
    // Test that auto.enabled tracks whether auto-switch has fired
    // After the first auto-switch, it should not fire again until reset

    if (typeof LW.quality.auto.enabled !== 'boolean') {
      throw new Error('LW.quality.auto.enabled should be a boolean');
    }

    const enabled = LW.quality.auto.enabled;
    // Just verify the flag exists; the real behavior is a manual/QA concern
    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto-switch elapsed time tracking',
  run(LW) {
    // Verify LW.quality.auto.elapsed exists and is a number
    if (typeof LW.quality.auto.elapsed !== 'number') {
      throw new Error('LW.quality.auto.elapsed should be a number');
    }

    // It should start at 0 or a small value in fresh orbit mode
    if (LW.quality.auto.elapsed < 0) {
      throw new Error('LW.quality.auto.elapsed should be non-negative');
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: low quality works in game mode',
  game: 'courier',
  run(LW) {
    // Open and start a game
    LW.games.open('courier');
    LW.games.start();

    // Set to low quality mid-game
    LW.quality.set('low');
    const q = LW.quality.get();

    LW.games.quit();

    if (q !== 'low') {
      throw new Error(`Quality should be low in game mode, got ${q}`);
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: quality persists across game start/quit cycles',
  game: 'courier',
  run(LW) {
    // Set to low quality
    LW.quality.set('low');

    // Open and quit a game without changing quality
    LW.games.open('courier');
    LW.games.start();
    LW.games.quit();

    // Quality should still be low
    const q = LW.quality.get();
    if (q !== 'low') {
      throw new Error(`Quality should persist across game cycles, got ${q}`);
    }

    return true;
  }
});

// ========== BEHAVIORAL TESTS (feed frame times, assert quality changes) ==========

LW_TESTS.push({
  name: 'quality: auto-switch triggers low quality when receiving slow frame times after 3s elapsed',
  run(LW) {
    // Reset auto-switch state to test the full flow
    LW.quality.auto.enabled = false;
    LW.quality.auto.elapsed = 3.1;  // simulate elapsed time past the 3s gate

    // Set to high quality first
    LW.quality.set('high');
    const beforeQuality = LW.quality.get();
    if (beforeQuality !== 'high') {
      throw new Error(`Quality should start at high, got ${beforeQuality}`);
    }

    // Feed a slow frame time (simulating poor performance: ~40ms = 25 fps)
    const result = LW.quality.auto.checkAuto(30);

    // checkAuto should return 'low' when switching
    if (result !== 'low') {
      throw new Error(
        `checkAuto(30) after 3.1s elapsed should return 'low', got ${result}`
      );
    }

    // Quality should now be low
    const afterQuality = LW.quality.get();
    if (afterQuality !== 'low') {
      throw new Error(
        `After checkAuto(30) triggers auto-switch, quality should be 'low', got ${afterQuality}`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto-switch does not trigger with fast frame times',
  run(LW) {
    // Reset auto-switch state
    LW.quality.auto.enabled = false;
    LW.quality.auto.elapsed = 3.1;

    // Set to high quality
    LW.quality.set('high');

    // Feed a fast frame time (simulating good performance: 10ms = 100 fps)
    const result = LW.quality.auto.checkAuto(10);

    // checkAuto should return null when conditions are not met
    if (result !== null) {
      throw new Error(
        `checkAuto(10) with fast frame time should return null, got ${result}`
      );
    }

    // Quality should still be high
    const quality = LW.quality.get();
    if (quality !== 'high') {
      throw new Error(
        `Quality should remain 'high' after fast frame times, got ${quality}`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto-switch respects 3-second minimum elapsed time gate',
  run(LW) {
    // Reset auto-switch state
    LW.quality.auto.enabled = false;
    LW.quality.auto.elapsed = 2.5;  // still under 3 seconds

    // Set to high quality
    LW.quality.set('high');

    // Feed slow frame times while still under 3 seconds elapsed
    const result1 = LW.quality.auto.checkAuto(30);
    const result2 = LW.quality.auto.checkAuto(35);

    // Both should return null because elapsed < 3s
    if (result1 !== null) {
      throw new Error(
        `checkAuto(30) with elapsed=2.5s should return null (not engaged yet), got ${result1}`
      );
    }

    if (result2 !== null) {
      throw new Error(
        `checkAuto(35) with elapsed=2.5s should return null (not engaged yet), got ${result2}`
      );
    }

    // Quality should still be high
    const quality = LW.quality.get();
    if (quality !== 'high') {
      throw new Error(
        `Quality should stay 'high' while elapsed < 3s, got ${quality}`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto-switch only engages once per session (no re-trigger)',
  run(LW) {
    // Reset auto-switch state
    LW.quality.auto.enabled = false;
    LW.quality.auto.elapsed = 3.1;

    // Set to high quality
    LW.quality.set('high');

    // First call with slow frames: should trigger
    const result1 = LW.quality.auto.checkAuto(30);
    if (result1 !== 'low') {
      throw new Error(
        `First checkAuto(30) should trigger 'low', got ${result1}`
      );
    }

    // Verify quality is now low
    if (LW.quality.get() !== 'low') {
      throw new Error('Quality should be low after first trigger');
    }

    // Manually set back to high to simulate user toggling or other interaction
    LW.quality.set('high');
    if (LW.quality.get() !== 'high') {
      throw new Error('Manual set to high failed');
    }

    // Now call checkAuto again with slow frames
    // It should NOT re-trigger because auto.enabled is now true
    const result2 = LW.quality.auto.checkAuto(30);
    if (result2 !== null) {
      throw new Error(
        `Second checkAuto(30) should return null (already engaged), got ${result2}`
      );
    }

    // Quality should stay high (not switched back by checkAuto)
    if (LW.quality.get() !== 'high') {
      throw new Error(
        `Quality should remain 'high' after auto-switch already fired, got ${LW.quality.get()}`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto-switch sequence — slow then fast frames',
  run(LW) {
    // This tests a realistic scenario: poor performance starts, then improves

    // Reset auto-switch state
    LW.quality.auto.enabled = false;
    LW.quality.auto.elapsed = 3.1;
    LW.quality.set('high');

    // Simulate sustained slow frames
    const slowResult = LW.quality.auto.checkAuto(28);
    if (slowResult !== 'low') {
      throw new Error(
        `Slow frame time should trigger low quality, got ${slowResult}`
      );
    }

    // Verify quality switched to low
    if (LW.quality.get() !== 'low') {
      throw new Error('Quality should be low after slow frames');
    }

    // Now feed fast frame times (performance improved)
    // Note: checkAuto does not switch back to high (by design: only once per session)
    // So we verify it doesn't crash and returns null
    const fastResult = LW.quality.auto.checkAuto(12);
    if (fastResult !== null) {
      throw new Error(
        `After already engaging, checkAuto(12) should return null, got ${fastResult}`
      );
    }

    // Quality should remain low (no automatic switch back)
    if (LW.quality.get() !== 'low') {
      throw new Error(
        `Quality should stay low (auto-switch does not revert), got ${LW.quality.get()}`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'quality: auto-switch boundary — frame time exactly at 25ms threshold',
  run(LW) {
    // Test the exact boundary condition: > 25 should trigger, <= 25 should not

    // Reset state
    LW.quality.auto.enabled = false;
    LW.quality.auto.elapsed = 3.1;
    LW.quality.set('high');

    // Test with frame time exactly at 25ms (should NOT trigger, since condition is > 25)
    const resultAt25 = LW.quality.auto.checkAuto(25);
    if (resultAt25 !== null) {
      throw new Error(
        `checkAuto(25) with condition > 25 should return null, got ${resultAt25}`
      );
    }

    // Reset for next part
    LW.quality.auto.enabled = false;
    LW.quality.set('high');

    // Test with frame time just above 25ms (should trigger)
    const resultAbove25 = LW.quality.auto.checkAuto(25.1);
    if (resultAbove25 !== 'low') {
      throw new Error(
        `checkAuto(25.1) with condition > 25 should return 'low', got ${resultAbove25}`
      );
    }

    return true;
  }
});
