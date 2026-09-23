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
  name: 'planet: R=15, terrain keeps its world-unit size (AC 1)',
  run(LW) {
    // AC1: "R = 15. A mountain and a city block measure the same in world units
    // as before (+-10%)."
    //
    // Radius check.
    if (LW.R !== 15) throw new Error(`Expected R = 15, got ${LW.R}`);

    // Mountain height: rawHeight() adds noise on top of R, so a mountain's
    // absolute height above sea level is (rawHeight(d) - R). Terrain noise
    // frequency is scaled by NZ = R/10 so a wave of the noise field always
    // covers the same arc length (arc length = angle * R; angle per noise
    // cycle ~ 1/frequency, so frequency must grow with R to hold that
    // constant). Passing the SAME underlying noise coordinate in (frequency
    // * direction) space - by shrinking the raw direction by 1/NZ to offset
    // the frequency scale-up - samples the "same" bump of terrain that a
    // reference run at R=10, NZ=1 would have sampled, and its absolute
    // height should come out the same (this is the reference measurement
    // recorded from the actual R=10 code before the change; see
    // docs/DECISIONS.md and the coder's report for the raw before/after run).
    if (LW.NZ !== LW.R / 10) throw new Error(`Expected NZ = R/10, got ${LW.NZ} for R=${LW.R}`);
    const samples = [
      { x: 0.30, y: 0.60, z: 0.74 },
      { x: -0.9, y: 0.2, z: 0.55 },
      { x: 0.1, y: -0.8, z: 0.4 },
      { x: 0.66, y: 0.33, z: -0.5 },
    ];
    // These are the actual values measured from the unmodified R=10, NZ=1 code
    // (height above sea level, i.e. rawHeight(d) - 10).
    const baselineHeightAboveSea = [-0.2601, -0.1542, 0.0802, 2.1636];
    for (let i = 0; i < samples.length; i++) {
      const d = samples[i];
      const dScaled = { x: d.x / LW.NZ, y: d.y / LW.NZ, z: d.z / LW.NZ };
      const h = LW.rawHeight(dScaled) - LW.R;
      const base = baselineHeightAboveSea[i];
      const tolerance = Math.max(Math.abs(base) * 0.1, 0.01);
      if (Math.abs(h - base) > tolerance) {
        throw new Error(
          `Mountain height above sea drifted for sample ${i}: got ${h.toFixed(4)}, ` +
          `expected ${base.toFixed(4)} +-${tolerance.toFixed(4)} (R=10 baseline)`
        );
      }
    }

    // City block size: a city's footprint (Lr, in world units) is defined
    // independently of R and reconstructed via cap = atan((Lr+0.32)/HC), so
    // it must come back out exactly the same regardless of R.
    const expectedLr = [3.4, 2.4, 2.4];
    LW.CITIES.forEach((c, i) => {
      if (Math.abs(c.Lr - expectedLr[i]) > 1e-9) {
        throw new Error(`City ${i} block size changed: expected Lr=${expectedLr[i]}, got ${c.Lr}`);
      }
    });

    return true;
  }
});

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
