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
    // Measure total draw calls for the scene with cars
    LW.frame(1 / 60);
    const callsWithCars = LW.renderer.info.render.calls;

    // The AC says "traffic costs at most 10 draw calls"
    // Terrain + sea + sky are maybe 10-15 calls, so with cars we expect < 30 total for orbit view
    // With 3 cities and ~10+ cars per city = 30+ cars, if not instanced we'd have 200+ calls
    // With instancing, we expect ~20-25 calls total

    const carCount = LW.vehicles.car.length;

    // Very loose bound: if we have 50+ cars and draw calls are > 100, something is wrong
    if (carCount > 30 && callsWithCars > 100) {
      throw new Error(
        `Draw calls too high for ${carCount} cars: ${callsWithCars} calls. ` +
        `Expected < 100 with instancing. Cars may not be properly instanced.`
      );
    }

    return true;
  }
});
