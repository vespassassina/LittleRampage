/**
 * Planet v2 tests (docs/specs/planet-v2.md, AC 1-5).
 * AC 6 (destructible scenery) and AC 7 (frame-cost budget) land in Sprint P2.
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
    // recorded from the actual R=10 code before the change; see the
    // P1 catch-up entry in docs/DECISIONS.md).
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
    // Updated for AC2 (5 cities, task 4): same intent, new set of sizes.
    const expectedLr = [3.4, 3.0, 2.8, 2.6, 2.4];
    LW.CITIES.forEach((c, i) => {
      if (Math.abs(c.Lr - expectedLr[i]) > 1e-9) {
        throw new Error(`City ${i} block size changed: expected Lr=${expectedLr[i]}, got ${c.Lr}`);
      }
    });

    // Meadows (grass shade) and forest clusters follow the same NZ rule as the
    // mountains: sampled at d/NZ they must match the R=10 noise values.
    // Values measured from the R=10 code (grass freq 6, forest freq 4, no NZ).
    const baselineGrass = [0.0762, 0.0497, 0.2621, -0.2183];
    const baselineForest = [0.1065, -0.0076, -0.0524, -0.0211];
    for (let i = 0; i < samples.length; i++) {
      const d = samples[i];
      const dScaled = { x: d.x / LW.NZ, y: d.y / LW.NZ, z: d.z / LW.NZ };
      const g = LW.grassNoise(dScaled), f = LW.forestNoise(dScaled);
      if (Math.abs(g - baselineGrass[i]) > 0.01) {
        throw new Error(`Meadow size drifted at sample ${i}: grass noise ${g.toFixed(4)}, expected ${baselineGrass[i]} (R=10 baseline). Is grassNoise scaled by NZ?`);
      }
      if (Math.abs(f - baselineForest[i]) > 0.01) {
        throw new Error(`Forest size drifted at sample ${i}: forest noise ${f.toFixed(4)}, expected ${baselineForest[i]} (R=10 baseline). Is forestNoise scaled by NZ?`);
      }
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'planet: 5 cities, spaced, off the sea (AC 2)',
  run(LW) {
    // AC2: "5 cities, each with traffic on its ring road. No two cities overlap,
    // none in the sea."
    const cities = LW.CITIES;
    if (cities.length !== 5) throw new Error(`Expected 5 cities, got ${cities.length}`);

    // Spec sizes: "5, sized 3.4 / 2.4-3.0" - one capital at 3.4, the rest in 2.4-3.0.
    const capitals = cities.filter(c => Math.abs(c.Lr - 3.4) < 1e-9);
    if (capitals.length !== 1) {
      throw new Error(`Expected exactly one 3.4-sized capital, got ${capitals.length}`);
    }
    for (const c of cities) {
      if (Math.abs(c.Lr - 3.4) < 1e-9) continue;
      if (c.Lr < 2.4 - 1e-9 || c.Lr > 3.0 + 1e-9) {
        throw new Error(`City Lr=${c.Lr} outside the spec range 2.4-3.0`);
      }
    }

    // No two cities overlap: each city's ring road sits out to `outer` (angular
    // radius from its centre). Two cities overlap if their centres are closer
    // together than the sum of their two `outer` radii.
    for (let i = 0; i < cities.length; i++) {
      for (let j = i + 1; j < cities.length; j++) {
        const a = cities[i], b = cities[j];
        const gap = a.dir.angleTo(b.dir) - (a.outer + b.outer);
        if (gap <= 0) {
          throw new Error(
            `Cities ${i} and ${j} overlap: centre angle ${a.dir.angleTo(b.dir).toFixed(4)} rad, ` +
            `outer radii sum ${(a.outer + b.outer).toFixed(4)} rad (gap ${gap.toFixed(4)})`
          );
        }
      }
    }

    // None in the sea: a city's centre must sit on raw (pre-flattening) land, not
    // just above sea level once the plateau flattening pushes it up artificially.
    // rawHeight(d) - R > 0 is "above sea"; require a real margin so a city isn't
    // built right at the waterline.
    const SEA_MARGIN = 0.15;
    cities.forEach((c, i) => {
      const above = LW.rawHeight(c.dir) - LW.R;
      if (above < SEA_MARGIN) {
        throw new Error(`City ${i} is in (or at the edge of) the sea: rawHeight - R = ${above.toFixed(4)}`);
      }
    });

    // Each city has traffic on its ring road: at least one car within its outer
    // radius (cars spawn on loops out to c.Lr + 0.14, well inside `outer`). Advance
    // a frame first so the movers have positioned each car's phantom Object3D.
    LW.frame(1 / 60);
    cities.forEach((c, i) => {
      const carsHere = LW.vehicles.car.filter(
        car => car.position.clone().normalize().angleTo(c.dir) < c.outer
      ).length;
      if (carsHere === 0) {
        throw new Error(`City ${i} has no traffic within its ring road`);
      }
    });

    return true;
  }
});

LW_TESTS.push({
  name: 'planet: whole planet fits in the start view (AC 3)',
  run(LW) {
    // AC3: "Orbit view: the whole planet fits at start..."
    // A sphere of radius R, viewed from distance d with a perspective camera of half
    // vertical fov hV and half horizontal fov hH, is fully inside the frustum once
    // d >= R / sin(min(hV, hH)) - the tighter of the two axes decides. This must hold
    // at whatever distance the camera actually starts at.
    // camera.position itself gets driven all over the place by other tests (chase
    // cams, the terrain-clamp test below) since they all share one running app
    // instance - use the frozen distance index.html recorded right after placing
    // the camera at boot, not the live (possibly-mutated) position.
    const camDist = LW.startCameraDistance;
    const halfV = (LW.camera.fov * Math.PI / 180) / 2;
    const halfH = Math.atan(Math.tan(halfV) * LW.camera.aspect);
    const minFitDist = LW.R / Math.sin(Math.min(halfV, halfH));
    if (camDist < minFitDist) {
      throw new Error(
        `Planet does not fit at the start camera distance: camDist=${camDist.toFixed(2)}, ` +
        `needs >= ${minFitDist.toFixed(2)} (R=${LW.R}, fov=${LW.camera.fov}, aspect=${LW.camera.aspect.toFixed(3)})`
      );
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet: zoom reaches street level (AC 3)',
  run(LW) {
    // AC3: "...zoom reaches street level..." The orbit camera's closest allowed
    // distance should put it just above the ground, not stuck high up.
    const altAboveGround = LW.controls.minDistance - LW.R;
    if (altAboveGround > 2) {
      throw new Error(
        `Zoom does not reach street level: minDistance=${LW.controls.minDistance} is ` +
        `${altAboveGround.toFixed(2)} above sea level (R=${LW.R}), expected <= 2`
      );
    }
    if (altAboveGround <= 0) {
      throw new Error(`controls.minDistance (${LW.controls.minDistance}) is at or below R (${LW.R}) - would clip terrain`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet: orbit camera never goes inside terrain or buildings (AC 3, 200 points)',
  run(LW) {
    // AC3: "...the camera never goes inside terrain or buildings (sampled at 200
    // random points)." Drive the actual frame() clamp (the `floor` logic in frame()'s
    // orbit mode branch): drop the camera just above sea level at a random
    // direction - almost certainly under the local terrain or a building - and check
    // the real per-frame clamp pushed it back out, the same way it does live.
    LW.games.quit();   // make sure we're in orbit mode, not mid-game
    let checked = 0;
    for (let i = 0; i < 200; i++) {
      const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const dir = new LW.V3(s * Math.cos(t), u, s * Math.sin(t));
      LW.camera.position.copy(dir).multiplyScalar(LW.R * 0.5);   // start deep inside the planet
      LW.frame(1 / 60);
      const dist = LW.camera.position.length();

      // Mirror index.html's own orbit-mode clamp (frame(), `let floor = ...`) exactly,
      // rather than re-deriving it, so this checks the real floor the live code uses:
      // terrain (post city-flattening) plus a margin, raised further near a city to
      // clear its tallest building.
      let floor = Math.max(LW.heightAt(dir), LW.R) + 0.25;
      for (const c of LW.CITIES) if (dir.angleTo(c.dir) < c.cap + 0.05) floor = Math.max(floor, LW.HC + c.maxH + 0.3);
      if (dist < floor - 0.01) {
        throw new Error(`Camera ended up inside terrain or a building at sample ${i}: dist=${dist.toFixed(3)}, floor=${floor.toFixed(3)}`);
      }
      checked++;
    }
    if (checked !== 200) throw new Error(`Expected to check 200 points, checked ${checked}`);
    return true;
  }
});

LW_TESTS.push({
  name: 'planet: satellites, station and moon clear the atmosphere (AC 4)',
  run(LW) {
    // AC4: "Satellites, station and moon clear the atmosphere..."
    // orbit() and the moon's pivot only rotate (no translation), so an object's
    // distance from the planet's centre is exactly its local position.y (or .x for
    // the moon) - no world-matrix update needed.
    const atmosphereR = LW.atmosphere.geometry.parameters.radius;
    LW.vehicles.sat.forEach((obj, i) => {
      const dist = obj.position.y;
      if (dist <= atmosphereR) {
        throw new Error(`Satellite/station ${i} at distance ${dist.toFixed(2)} does not clear the atmosphere (radius ${atmosphereR})`);
      }
    });
    const moonDist = Math.abs(LW.moon.position.x);
    if (moonDist <= atmosphereR) {
      throw new Error(`Moon at distance ${moonDist.toFixed(2)} does not clear the atmosphere (radius ${atmosphereR})`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet: planes and balloons clear the mountains (AC 4)',
  run(LW) {
    // AC4: "...planes and balloons clear the mountains." Estimate the tallest peak by
    // densely sampling the actual rendered terrain height (post city-flattening) over
    // a deterministic, evenly-spread set of directions (a Fibonacci sphere, so it's
    // not flaky like Math.random() sampling would be) and taking the max.
    const N = 20000, GA = Math.PI * (3 - Math.sqrt(5));   // golden angle
    let maxHeight = -Infinity;
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), a = GA * i;
      const dir = new LW.V3(Math.cos(a) * r, y, Math.sin(a) * r);
      const h = LW.heightAt(dir);
      if (h > maxHeight) maxHeight = h;
    }

    LW.vehicles.plane.forEach((p, i) => {
      if (p.position.y <= maxHeight) {
        throw new Error(`Plane ${i} at altitude ${p.position.y.toFixed(2)} does not clear the tallest mountain (${maxHeight.toFixed(2)})`);
      }
    });
    // Balloons bob by +-0.12 around their base altitude (index.html's sinusoidal
    // mover) - check the low point of that bob, not just the instantaneous position.
    LW.skyBalloons.forEach((b, i) => {
      const low = b.position.y - 0.12;
      if (low <= maxHeight) {
        throw new Error(`Balloon ${i} can dip to ${low.toFixed(2)}, which does not clear the tallest mountain (${maxHeight.toFixed(2)})`);
      }
    });
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
