/**
 * Planet v2 tests (AC 5: instanced traffic)
 *
 * AC5: Cars are instanced: traffic costs at most 10 draw calls, however many cars there are.
 *
 * Test contract:
 * - Cars are created and placed on city ring roads during world initialization
 * - With instancing, adding more cars should not increase draw calls linearly
 * - Draw calls for traffic should stay under a fixed threshold regardless of car count
 */

LW_TESTS.push({
  name: 'planet: cars are instanced (AC 5)',
  run(LW) {
    // Verify cars exist in the scene
    const initialCarCount = LW.vehicles.car.length;
    if (initialCarCount === 0) {
      throw new Error('No cars spawned in the world');
    }

    // Render a frame with baseline car count and measure draw calls
    LW.frame(1 / 60);
    const callsWithBaseline = LW.renderer.info.render.calls;

    // Now spawn many more cars programmatically to test instancing.
    // With instancing, adding cars should not increase draw calls significantly.
    const before = callsWithBaseline;

    // Add 5 more cars using the same mechanism as buildCity
    for (let i = 0; i < 5; i++) {
      const color = LW.PALETTE[i % LW.PALETTE.length];
      const carDesc = LW.addCarInstance(color);
      LW.vehicles.car.push(carDesc);
    }

    // Render with increased car count
    LW.frame(1 / 60);
    const callsWithMore = LW.renderer.info.render.calls;

    // With instancing, adding 5 cars should add very few draw calls (ideally 0)
    // Without instancing, adding 5 cars would add ~30 draw calls (5 cars × ~6 calls per car)
    const callsAdded = callsWithMore - before;

    // If properly instanced, callsAdded should be <= 2 (maybe a rounding artifact)
    // If not instanced, callsAdded would be >= 20
    if (callsAdded > 10) {
      throw new Error(
        `Cars not properly instanced: adding 5 cars added ${callsAdded} draw calls. ` +
        `Expected <= 10 with instancing, got ${callsAdded} ` +
        `(before: ${before}, after: ${callsWithMore})`
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'planet: car traffic respects 10-call limit (AC 5)',
  run(LW) {
    // AC5 bounds what TRAFFIC costs, not the whole scene - terrain/sea/sky/city batches
    // draw hundreds of calls on their own (see docs/DECISIONS.md's F1/P1 baselines: ~785
    // calls at High quality with zero cars involved). So measure cars' own contribution:
    // hide all car parts, record draw calls, show them again, record draw calls, and
    // assert the delta - not the scene total - stays within AC5's budget.
    const carCount = LW.vehicles.car.length;
    if (carCount === 0) {
      throw new Error('No cars spawned in the world');
    }

    LW.setCarsVisible(false);
    LW.frame(1 / 60);
    const callsWithoutCars = LW.renderer.info.render.calls;

    LW.setCarsVisible(true);
    LW.frame(1 / 60);
    const callsWithCars = LW.renderer.info.render.calls;

    const carDrawCalls = callsWithCars - callsWithoutCars;

    // Traffic is 3 InstancedMeshes (body, cab, wheels) plus 3 matching ink-outline
    // meshes - 6 draw calls total, regardless of car count or how many colours are on
    // the road. AC5 says "at most 10 draw calls", so allow a little headroom above 6.
    if (carDrawCalls > 10) {
      throw new Error(
        `Traffic added ${carDrawCalls} draw calls for ${carCount} cars ` +
        `(without: ${callsWithoutCars}, with: ${callsWithCars}). ` +
        `AC5 requires at most 10 draw calls for traffic, however many cars there are.`
      );
    }

    return true;
  }
});
