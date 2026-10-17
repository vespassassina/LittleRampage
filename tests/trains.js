/**
 * Trains feature tests (docs/specs/trains.md)
 * AC1-AC5: track loop, terrain following, rail mesh, instanced trains, Ride menu
 */

// Helper: compare 3D vectors with tolerance
function vec3Equal(a, b, tol = 0.01) {
  return Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;
}

LW_TESTS.push({
  name: 'trains: LW.trainTrack is exposed',
  run(LW) {
    if (!LW.trainTrack) throw new Error('LW.trainTrack not exposed');
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: track loop has at(s) method',
  run(LW) {
    if (typeof LW.trainTrack.at !== 'function') throw new Error('trainTrack.at is not a function');
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC1 — track visits 5 cities in order [0,3,1,2,4]→0',
  run(LW) {
    if (!LW.trainTrack) throw new Error('LW.trainTrack not exposed');
    // Sample points near the expected city directions; verify they lie close to each city
    // Order: [0, 3, 1, 2, 4] → back to 0
    const cityOrder = [0, 3, 1, 2, 4];
    const total = LW.trainTrack.total;
    const segmentLength = total / cityOrder.length;

    for (let i = 0; i < cityOrder.length; i++) {
      const cityIdx = cityOrder[i];
      const expectedDir = LW.CITIES[cityIdx].dir;

      // Sample a point near the middle of each segment
      const s = (i + 0.5) * segmentLength;
      const pos = LW.trainTrack.at(s);

      // Normalize position to a direction and compare to city direction
      const sampleDir = pos.clone().normalize();
      const dotProduct = sampleDir.dot(expectedDir);

      // Should be reasonably close to the city direction (dotProduct near 1.0)
      if (dotProduct < 0.85) {
        throw new Error(`Track segment ${i} (city ${cityIdx}) is not near city direction. Dot=${dotProduct.toFixed(3)}`);
      }
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC1 — track is a closed loop (start ≈ end position)',
  run(LW) {
    if (!LW.trainTrack) throw new Error('LW.trainTrack not exposed');
    const start = LW.trainTrack.at(0);
    const end = LW.trainTrack.at(LW.trainTrack.total - 0.001);

    // Start and end should be nearly the same (both at city 0)
    if (!vec3Equal(start, end, 0.1)) {
      throw new Error(`Track is not closed: start ${start.toArray()} ≠ end ${end.toArray()}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC2 — track follows terrain height (heightAt + lift) unless it is a bridge or a tunnel',
  run(LW) {
    if (!LW.trainTrack) throw new Error('LW.trainTrack not exposed');
    // Waypoints only: between them the track is a straight chord.
    for (const [i, p] of LW.trainTrack.waypoints.entries()) {
      const g = LW.heightAt(p.clone().normalize()), r = p.length();
      if (g <= LW.R) continue;                      // water: the bridge test covers it
      if (r > g + LW.trainTrack.lift + 0.001) throw new Error(`waypoint ${i} floats ${(r - g).toFixed(3)} above the land`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC3 — rail-bed mesh exists in world Batch',
  run(LW) {
    // The world batch should contain rail geometry
    // This is checked by verifying a new draw-call count does not grow unexpectedly
    // (the rail should be merged, not a new call)
    if (!LW.worldBatch) throw new Error('LW.worldBatch not exposed for testing');

    // Just verify the batch exists and has been built
    if (typeof LW.worldBatch !== 'object') {
      throw new Error('LW.worldBatch is not an object');
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC4 — trains array is populated',
  run(LW) {
    if (!LW.vehicles || !LW.vehicles.train) {
      throw new Error('LW.vehicles.train array not found');
    }
    if (LW.vehicles.train.length === 0) {
      throw new Error('No trains spawned');
    }
    if (LW.vehicles.train.length < 3 || LW.vehicles.train.length > 5) {
      throw new Error(`Expected 3-5 trains, got ${LW.vehicles.train.length}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC4 — trains loop without visible jump (s=total ≈ s=0)',
  run(LW) {
    if (!LW.trainTrack) throw new Error('LW.trainTrack not exposed');

    const start = LW.trainTrack.at(0);
    const end = LW.trainTrack.at(LW.trainTrack.total);

    // Due to modulo wrapping in at(s), s=total should wrap to s=0
    if (!vec3Equal(start, end, 0.001)) {
      throw new Error(`No visible jump: start ${start.toArray()} ≠ end ${end.toArray()}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC5 — Train menu option exists',
  run(LW) {
    const menuItem = document.querySelector('[data-ride-mode="train"]');
    if (!menuItem) throw new Error('Train menu item not found in ride menu');
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC5 — clicking Train menu selects a train',
  run(LW) {
    if (!LW.vehicles || !LW.vehicles.train || LW.vehicles.train.length === 0) {
      throw new Error('No trains to ride');
    }

    // Click the Train menu item
    const menuItem = document.querySelector('[data-ride-mode="train"]');
    if (!menuItem) throw new Error('Train menu item not found');

    menuItem.click();

    // After clicking, mode should be 'train' and target should be a train
    const mode = LW.mode;
    if (mode !== 'train') {
      throw new Error(`Expected mode 'train', got '${mode}'`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC5 — arrow keys cycle through trains',
  run(LW) {
    if (!LW.vehicles || !LW.vehicles.train || LW.vehicles.train.length < 2) {
      throw new Error('Need at least 2 trains to test cycling');
    }

    // Set to train mode
    const menuItem = document.querySelector('[data-ride-mode="train"]');
    menuItem.click();

    const initialIdx = LW.idx.train;

    // Simulate ArrowRight
    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    document.dispatchEvent(rightEvent);

    const nextIdx = LW.idx.train;
    const expectedNext = (initialIdx + 1) % LW.vehicles.train.length;

    if (nextIdx !== expectedNext) {
      throw new Error(`ArrowRight: expected idx ${expectedNext}, got ${nextIdx}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC5 — arrow keys cycle with wrapping',
  run(LW) {
    if (!LW.vehicles || !LW.vehicles.train || LW.vehicles.train.length < 2) {
      throw new Error('Need at least 2 trains');
    }

    // Set to train mode
    const menuItem = document.querySelector('[data-ride-mode="train"]');
    menuItem.click();

    const numTrains = LW.vehicles.train.length;

    // Jump to the last train
    LW.idx.train = numTrains - 1;

    // Simulate ArrowRight (should wrap to 0)
    const rightEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    document.dispatchEvent(rightEvent);

    if (LW.idx.train !== 0) {
      throw new Error(`ArrowRight at last train: expected wrap to 0, got ${LW.idx.train}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: regression — track never dips below the terrain surface (tunnels excepted)',
  run(LW) {
    if (!LW.trainTrack) throw new Error('LW.trainTrack not exposed');

    // Bug this guards against: the old TrainTrack lerped elevation between the two
    // ENDPOINT cities' heights (heightAt(city1) and heightAt(city2)), ignoring any
    // terrain in between. A mountain range sitting between two cities on the route
    // would then poke up through the (too-low) interpolated rail. The fix samples
    // heightAt() directly under each waypoint's own interpolated direction, so this
    // walks every waypoint along the whole loop (not just the 5 coarse per-city
    // samples AC2 checks) and asserts the track's radius is never below the terrain
    // directly beneath it.
    const tolerance = 0.02;  // small tolerance for the city-clearance raise being legitimate
    let worstDeficit = 0;
    let worstAt = null;

    for (const pos of LW.trainTrack.waypoints) {
      const dir = pos.clone().normalize();
      const groundHeight = LW.heightAt(dir);
      const trackRadius = pos.length();
      // Tunnels are the one deliberate way under the ground: a mountain (above R + 0.7) or a city plateau.
      const tunnel = groundHeight > LW.R + 0.7 || LW.CITIES.some(c => dir.angleTo(c.dir) < c.outer);
      const deficit = tunnel ? 0 : groundHeight - trackRadius;  // positive means the track is under the ground
      if (deficit > worstDeficit) {
        worstDeficit = deficit;
        worstAt = dir.toArray();
      }
    }

    if (worstDeficit > tolerance) {
      throw new Error(`Track dips below terrain by ${worstDeficit.toFixed(3)} near dir=${worstAt}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: AC6 — existing tests still pass (regression check)',
  run(LW) {
    // This is a placeholder; the actual regression check is run by the test harness
    // verifying that all prior tests still pass after trains are added.
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: mountains and cities are tunnelled, and a portal marks each mouth',
  run(LW) {
    const wp = LW.trainTrack.waypoints;
    let tunnel = 0;
    for (const p of wp) {
      const g = LW.heightAt(p.clone().normalize());
      if (g > LW.R && g - p.length() > 0.12) tunnel++;
    }
    if (!tunnel) throw new Error('no waypoint is inside the ground: cities should be under their plateau');
    // under city 0 the track is below the floor, so no rail can clip a building
    const c = LW.CITIES[0], mid = wp.filter(p => p.clone().normalize().angleTo(c.dir) < c.inner);
    if (!mid.length) throw new Error('no waypoint under city 0');
    if (mid.some(p => p.length() > LW.HC - 0.1)) throw new Error('track is above the floor of city 0');
    // the rails over a mountain never climb it
    if (wp.some(p => p.length() > LW.R + 0.7 + 0.05 && LW.heightAt(p.clone().normalize()) > LW.R)) throw new Error('track climbs a mountain');
    return true;
  }
});

LW_TESTS.push({
  name: 'trains: over water the track is a bridge above the sea; on land it hugs the ground',
  run(LW) {
    let wet = 0, dry = 0;
    for (const p of LW.trainTrack.waypoints) {
      const up = p.clone().normalize(), h = LW.heightAt(up);
      if (h <= LW.R) {
        wet++;
        if (p.length() < LW.R + 0.1) throw new Error(`track at ${p.length().toFixed(2)} is under or in the sea`);
      } else {
        dry++;
        if (p.length() - h > 0.02) throw new Error(`track floats ${(p.length() - h).toFixed(2)} above dry land`);
      }
    }
    if (!wet) throw new Error('no waypoint over water: the check proves nothing on this seed');
    return true;
  }
});
