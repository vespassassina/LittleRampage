/**
 * Frame cost baseline measurement (P1 AC7)
 * Measures and records frame cost in full orbit view for desktop and phone emulation.
 * Not a normal test - this just records baseline numbers for comparison after P1 changes.
 */

LW_TESTS.push({
  name: 'frame-cost: Desktop High quality baseline (full orbit)',
  run(LW) {
    // Full orbit view is the default - just ensure orbit mode
    if (LW.camera.userData.mode !== undefined && LW.camera.userData.mode !== 'orbit') {
      throw new Error('Must be in full orbit view for baseline measurement');
    }

    LW.quality.set('high');
    const dt = 1 / 60;
    const iterations = 300;

    // Warm up
    for (let i = 0; i < 10; i++) {
      LW.frame(dt);
    }

    // Measure
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      LW.frame(dt);
    }
    const endTime = performance.now();

    const totalMs = endTime - startTime;
    const msPerFrame = totalMs / iterations;
    const drawCalls = LW.renderer.info.render.calls;

    // Log results for capture
    console.log(`FRAME_COST_DESKTOP_HIGH: ${msPerFrame.toFixed(2)}ms/frame, ${drawCalls} draw calls, ${totalMs.toFixed(1)}ms total`);

    // Store for summary
    window.FRAME_COSTS = window.FRAME_COSTS || {};
    window.FRAME_COSTS.desktopHigh = { msPerFrame, drawCalls, totalMs, iterations };

    return true;
  }
});

LW_TESTS.push({
  name: 'frame-cost: Phone emulation (375x812) Low quality baseline (full orbit)',
  run(LW) {
    // Resize canvas to phone dimensions (375x812 viewport, 1.5 pixel ratio = 562x1218 canvas)
    const originalWidth = LW.renderer.domElement.width;
    const originalHeight = LW.renderer.domElement.height;

    LW.renderer.setSize(375, 812);
    LW.renderer.setPixelRatio(1.5);
    LW.camera.aspect = 375 / 812;
    LW.camera.updateProjectionMatrix();

    LW.quality.set('low');
    const dt = 1 / 60;
    const iterations = 300;

    // Wait a frame for quality changes to apply
    LW.frame(dt);

    // Warm up
    for (let i = 0; i < 10; i++) {
      LW.frame(dt);
    }

    // Measure
    const startTime = performance.now();
    for (let i = 0; i < iterations; i++) {
      LW.frame(dt);
    }
    const endTime = performance.now();

    const totalMs = endTime - startTime;
    const msPerFrame = totalMs / iterations;
    const msPerFrameThrottled = msPerFrame * 4;  // x4 CPU throttle approximation
    const drawCalls = LW.renderer.info.render.calls;

    // Log results for capture
    console.log(`FRAME_COST_PHONE_LOW: ${msPerFrame.toFixed(2)}ms/frame (raw), ${msPerFrameThrottled.toFixed(2)}ms/frame (x4 throttle), ${drawCalls} draw calls, ${totalMs.toFixed(1)}ms total`);

    // Store for summary
    window.FRAME_COSTS = window.FRAME_COSTS || {};
    window.FRAME_COSTS.phoneLow = { msPerFrame, msPerFrameThrottled, drawCalls, totalMs, iterations };

    // Restore original dimensions (or don't, since tests clean up between runs)
    LW.renderer.setSize(originalWidth, originalHeight);
    LW.renderer.setPixelRatio(1);
    LW.camera.aspect = originalWidth / originalHeight;
    LW.camera.updateProjectionMatrix();

    return true;
  }
});
