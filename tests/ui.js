/**
 * Sandbox UI polish tests (docs/PLAN.md "Sandbox UI polish" epic).
 * Hint text removal and the Orbit button's reset-and-respin behaviour.
 */

LW_TESTS.push({
  name: 'ui: hint text is gone, no dangling #hint references',
  run(LW) {
    const hint = document.getElementById('hint');
    if (hint) throw new Error('#hint element should have been removed from the DOM');

    // Exercise the code paths that used to touch #hint (open/quit a game) to make
    // sure nothing throws now that the element is gone.
    LW.games.open('courier');
    LW.games.quit();

    return true;
  }
});

LW_TESTS.push({
  name: 'ui: Orbit button resets the camera to the start framing, even when already in orbit mode',
  run(LW) {
    const orbitBtn = document.querySelector('[data-mode="orbit"]');
    if (!orbitBtn) throw new Error('Orbit button ([data-mode="orbit"]) not found');

    // Zoom in somewhere away from the start position.
    LW.camera.position.set(LW.R + 1, 0, 0);
    LW.controls.target.set(0, 0, 0);
    LW.frame(1 / 60);
    const zoomedDist = LW.camera.position.length();
    if (Math.abs(zoomedDist - LW.startCameraDistance) < 0.01) {
      throw new Error('Test setup did not actually move the camera away from the start distance');
    }

    // Click Orbit once: should reset the camera even though we were never put
    // into a different `mode` (mode was already 'orbit' the whole time).
    orbitBtn.click();
    const dist1 = LW.camera.position.length();
    if (Math.abs(dist1 - LW.startCameraDistance) > 0.05) {
      throw new Error(`Orbit click did not reset camera distance: got ${dist1.toFixed(2)}, expected ~${LW.startCameraDistance.toFixed(2)}`);
    }

    // Move away again and click a second time - should reset again (not a no-op
    // just because we're already in orbit mode).
    LW.camera.position.set(0, LW.R + 1, 0);
    orbitBtn.click();
    const dist2 = LW.camera.position.length();
    if (Math.abs(dist2 - LW.startCameraDistance) > 0.05) {
      throw new Error(`Second Orbit click did not reset camera distance: got ${dist2.toFixed(2)}, expected ~${LW.startCameraDistance.toFixed(2)}`);
    }

    // Idle auto-spin should be running again after the reset.
    if (!LW.controls.autoRotate) {
      throw new Error('Orbit click should restart the idle auto-spin (controls.autoRotate should be true)');
    }

    return true;
  }
});
