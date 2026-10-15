/**
 * Planet v2 object density tests (docs/specs/planet-v2.md, Sprint P2).
 * Spec: "Counts scale with surface area (x2.25), rounded: trees ~3800, hamlets ~90,
 * boats ~16, planes 8, balloons 8, satellites 8. Cities: 5, sized 3.4 / 2.4-3.0."
 * Clouds also scale by area (34 * 2.25 ~ 76).
 */

LW_TESTS.push({
  name: 'planet density: counts scale with surface area at R=15 (P2 spec rules)',
  run(LW) {
    // 1. Planes: 8
    const planes = LW.vehicles.plane.length;
    if (planes !== 8) {
      throw new Error(`Expected 8 planes, got ${planes}`);
    }

    // 2. Decorative balloons: 8
    const balloons = LW.skyBalloons.length;
    if (balloons !== 8) {
      throw new Error(`Expected 8 balloons, got ${balloons}`);
    }

    // 3. Satellites: 8 (vehicles.sat also includes the station at index 0, total 9)
    const sats = LW.vehicles.sat.length - 1;
    if (sats !== 8) {
      throw new Error(`Expected 8 satellites (+ 1 station = 9 in vehicles.sat), got ${sats}`);
    }

    // 4. Boats: ~16 (allow 15-17)
    const boats = LW.vehicles.boat.length;
    if (boats < 15 || boats > 17) {
      throw new Error(`Expected ~16 boats (15-17), got ${boats}`);
    }

    // 5. Hamlets: ~90 (allow 85-95)
    const hamlets = LW.hamlets ? LW.hamlets.length : (LW.HAMLETS ? LW.HAMLETS.length : 0);
    if (hamlets < 85 || hamlets > 95) {
      throw new Error(`Expected ~90 hamlets (85-95), got ${hamlets}`);
    }

    // 6. Countryside trees: ~3800 (allow 3700-3900)
    const trees = LW.countrysideTreeCount || 0;
    if (trees < 3700 || trees > 3900) {
      throw new Error(`Expected ~3800 countryside trees (3700-3900), got ${trees}`);
    }

    // 7. Clouds: ~76 (allow 70-85)
    const clouds = LW.cloudCount || 0;
    if (clouds < 70 || clouds > 85) {
      throw new Error(`Expected ~76 clouds (70-85), got ${clouds}`);
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'planet density: all 8 planes and 8 balloons clear the mountains (AC 4)',
  run(LW) {
    const N = 20000, GA = Math.PI * (3 - Math.sqrt(5));
    let maxHeight = -Infinity;
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), a = GA * i;
      const dir = new LW.V3(Math.cos(a) * r, y, Math.sin(a) * r);
      const h = LW.heightAt(dir);
      if (h > maxHeight) maxHeight = h;
    }

    if (LW.vehicles.plane.length !== 8) {
      throw new Error(`Expected 8 planes, got ${LW.vehicles.plane.length}`);
    }
    LW.vehicles.plane.forEach((p, i) => {
      if (p.position.y <= maxHeight) {
        throw new Error(`Plane ${i} at altitude ${p.position.y.toFixed(2)} does not clear the tallest mountain (${maxHeight.toFixed(2)})`);
      }
    });

    if (LW.skyBalloons.length !== 8) {
      throw new Error(`Expected 8 balloons, got ${LW.skyBalloons.length}`);
    }
    LW.skyBalloons.forEach((b, i) => {
      const low = b.position.y - 0.12;
      if (low <= maxHeight) {
        throw new Error(`Balloon ${i} can dip to ${low.toFixed(2)}, which does not clear the tallest mountain (${maxHeight.toFixed(2)})`);
      }
    });

    return true;
  }
});
