/**
 * Planet size selector: scenery follows the resize (bug fix, see docs/DECISIONS.md).
 *
 * Bug: LW.size.set() rebuilt terrain, sea, atmosphere and moon, but everything generated
 * once at boot (city blocks, roads, parks, rail, trees, hamlets, windmills, boats, traffic,
 * planes, balloons, satellites, clouds, the game ceiling) stayed at the boot radius,
 * floating above or sunk into the resized planet.
 *
 * Hooks used: LW.scenery = { world, mills, clouds, inkMeshes } (index.html).
 * Every test restores the size it found.
 */
(function () {
  const other = size => size === 'large' ? 'small' : 'large';

  function withSize(LW, size, fn) {
    const original = LW.size.get();
    try { LW.size.set(size); return fn(); } finally { LW.size.set(original); }
  }

  // Order-sensitive sum over every vertex of the merged scenery meshes: equal only when
  // the same geometry sits in the same place.
  function fingerprint(group) {
    let n = 0, s = 0;
    for (const m of group.children) {
      const p = m.geometry.attributes.position.array;
      n += p.length;
      for (let i = 0; i < p.length; i += 3) s += p[i] * 1.0001 + p[i + 1] * 2.0003 + p[i + 2] * 3.0007;
    }
    return { meshes: group.children.length, n, s };
  }

  // Smallest radius of scenery vertices close to a city's centre: the asphalt disc.
  function cityFloor(LW, c) {
    const cos = Math.cos(c.cap * 0.3);
    let min = Infinity, count = 0;
    for (const m of LW.scenery.world.children) {
      const p = m.geometry.attributes.position.array;
      for (let i = 0; i < p.length; i += 3) {
        const len = Math.hypot(p[i], p[i + 1], p[i + 2]);
        if ((p[i] * c.dir.x + p[i + 1] * c.dir.y + p[i + 2] * c.dir.z) / len < cos) continue;
        count++;
        if (len < min) min = len;
      }
    }
    return { min, count };
  }

  LW_TESTS.push({
    name: 'planet-size scenery: hooks exposed',
    run(LW) {
      if (!LW.scenery) throw new Error('LW.scenery not exposed');
      for (const k of ['world', 'mills', 'clouds', 'inkMeshes']) {
        if (!LW.scenery[k]) throw new Error(`LW.scenery.${k} not exposed`);
      }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: city ground sits at the new HC after resize',
    run(LW) {
      for (const size of ['small', 'large']) withSize(LW, size, () => {
        const top = LW.HC + 0.012;
        LW.CITIES.forEach((c, i) => {
          const { min, count } = cityFloor(LW, c);
          if (count < 100) throw new Error(`${size}: city ${i} has only ${count} scenery vertices near its centre`);
          if (Math.abs(min - top) > 0.01) {
            throw new Error(`${size}: city ${i} ground at radius ${min.toFixed(3)}, expected ${top.toFixed(3)} (HC ${LW.HC})`);
          }
        });
      });
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: train track follows the new terrain after resize',
    run(LW) {
      // Waypoints sit on the ground (+lift), on a bridge deck over water, or inside the ground in a
      // tunnel; between them the track is a straight chord, so only the waypoints are checked.
      withSize(LW, 'large', () => {
        LW.trainTrack.waypoints.forEach((pos, i) => {
          const g = LW.heightAt(pos.clone().normalize());
          const high = g <= LW.R ? LW.R + 0.2 : g + LW.trainTrack.lift;
          if (pos.length() > high + 0.001 || pos.length() < LW.R - 0.001) {
            throw new Error(`large: track waypoint ${i} at radius ${pos.length().toFixed(3)}, allowed ${LW.R.toFixed(3)} to ${high.toFixed(3)}`);
          }
        });
      });
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: cars drive on the new city ground',
    run(LW) {
      withSize(LW, 'large', () => {
        LW.frame(1 / 60);
        const top = LW.HC + 0.012;
        LW.vehicles.car.forEach((car, i) => {
          const r = car.position.length();
          if (Math.abs(r - top) > 0.01) throw new Error(`large: car ${i} at radius ${r.toFixed(3)}, road is at ${top.toFixed(3)}`);
        });
      });
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: windmills and hamlets stand on the new terrain',
    run(LW) {
      withSize(LW, 'large', () => {
        const mills = LW.scenery.mills.children;
        if (mills.length < 5) throw new Error(`large: only ${mills.length} windmills`);
        mills.forEach((m, i) => {
          const d = m.position.clone().normalize(), want = LW.heightAt(d) - 0.02;
          if (Math.abs(m.position.length() - want) > 0.01) {
            throw new Error(`large: windmill ${i} at radius ${m.position.length().toFixed(3)}, ground at ${want.toFixed(3)}`);
          }
        });
        const hamlets = LW.courier.TOWNS.slice(LW.CITIES.length);
        if (!hamlets.length) throw new Error('large: no hamlet towns');
        hamlets.forEach(t => {
          const a = LW.heightAt(t.dir) - LW.R;
          if (a < 0.12 || a > 0.6) throw new Error(`large: hamlet ${t.name} sits ${a.toFixed(2)} above sea level (placement rule 0.12-0.6)`);
        });
      });
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: boats stay on water after resize',
    run(LW) {
      // Boats sail a circle checked at 16 points, so a shore can graze the path between
      // them; a boat left on the old planet's water spends much of its lap on land.
      withSize(LW, 'large', () => {
        const onLand = LW.vehicles.boat.map(() => 0), N = 60;
        for (let f = 0; f < N; f++) {
          LW.frame(1);
          LW.vehicles.boat.forEach((b, i) => {
            if (Math.abs(b.position.length() - LW.R) > 0.05) throw new Error(`large: boat ${i} at radius ${b.position.length().toFixed(2)}, sea at ${LW.R}`);
            if (LW.heightAt(b.position.clone().normalize()) > LW.R) onLand[i]++;
          });
        }
        onLand.forEach((n, i) => { if (n > N * 0.1) throw new Error(`large: boat ${i} on land for ${n} of ${N} samples`); });
      });
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: planes, balloons and satellites fly above the new planet',
    run(LW) {
      for (const size of ['small', 'large']) withSize(LW, size, () => {
        const check = (list, what, min) => list.forEach((o, i) => {
          if (o.position.y < LW.R + min) throw new Error(`${size}: ${what} ${i} at ${o.position.y.toFixed(2)}, below R+${min} (R ${LW.R})`);
        });
        check(LW.vehicles.plane, 'plane', 2.8);
        check(LW.skyBalloons, 'balloon', 2.8);
        check(LW.vehicles.sat, 'satellite', 5);
        LW.frame(1 / 60);
        check(LW.vehicles.plane, 'plane (after a frame)', 2.8);
        check(LW.skyBalloons, 'balloon (after a frame)', 2.8);
        // clouds: every puff between R+2 and R+4
        for (const m of LW.scenery.clouds.children) {
          const p = m.geometry.attributes.position.array;
          for (let i = 0; i < p.length; i += 3) {
            const r = Math.hypot(p[i], p[i + 1], p[i + 2]) - LW.R;
            if (r < 1.8 || r > 4.2) throw new Error(`${size}: cloud vertex at R+${r.toFixed(2)}`);
          }
        }
      });
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: flight ceiling follows the planet size',
    run(LW) {
      withSize(LW, 'large', () => {
        LW.games.open('raid');
        try {
          LW.games.start();
          LW.frame(1 / 60);
          const floor = LW.courier.skyFloor(LW.game.p);
          if (LW.game.alt < floor - 0.001) {
            throw new Error(`large: plane at ${LW.game.alt.toFixed(2)}, below the sky floor ${floor.toFixed(2)} (ceiling stuck at the boot size?)`);
          }
        } finally { LW.games.quit(); }
      });
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: A -> B -> A restores the same scenery',
    run(LW) {
      const size = LW.size.get();
      const before = { world: fingerprint(LW.scenery.world), clouds: fingerprint(LW.scenery.clouds),
        mills: LW.scenery.mills.children.map(m => m.position.toArray().join()).join('|'),
        towns: LW.courier.TOWNS.map(t => t.dir.toArray().join()).join('|'),
        track: LW.trainTrack.total };
      LW.size.set(other(size));
      LW.size.set(size);
      const after = { world: fingerprint(LW.scenery.world), clouds: fingerprint(LW.scenery.clouds),
        mills: LW.scenery.mills.children.map(m => m.position.toArray().join()).join('|'),
        towns: LW.courier.TOWNS.map(t => t.dir.toArray().join()).join('|'),
        track: LW.trainTrack.total };
      for (const k of Object.keys(before)) {
        if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
          throw new Error(`${k} changed after ${size} -> ${other(size)} -> ${size}: ${JSON.stringify(before[k]).slice(0, 80)} vs ${JSON.stringify(after[k]).slice(0, 80)}`);
        }
      }
      return true;
    }
  });

  LW_TESTS.push({
    name: 'planet-size scenery: resizing disposes old meshes, nothing piles up',
    run(LW) {
      const size = LW.size.get();
      const geoCount = () => {
        const s = new Set();
        LW.scene.traverse(o => { if (o.geometry) s.add(o.geometry); });
        return s.size;
      };
      const snap = () => ({ children: LW.scene.children.length, geos: geoCount(), ink: LW.scenery.inkMeshes.length,
        cars: LW.vehicles.car.length, boats: LW.vehicles.boat.length, trains: LW.vehicles.train.length });

      const start = snap();
      // Every merged scenery geometry now in the scene must be disposed by the next resize.
      const old = [...LW.scenery.world.children, ...LW.scenery.clouds.children].map(m => m.geometry);
      let disposed = 0;
      old.forEach(g => g.addEventListener('dispose', () => disposed++));

      for (let k = 0; k < 3; k++) { LW.size.set(other(size)); LW.size.set(size); }

      if (disposed !== old.length) throw new Error(`only ${disposed} of ${old.length} old scenery geometries disposed`);
      const inScene = new Set();
      LW.scene.traverse(o => { if (o.geometry) inScene.add(o.geometry); });
      if (old.some(g => inScene.has(g))) throw new Error('an old scenery geometry is still in the scene');
      const end = snap();
      if (JSON.stringify(start) !== JSON.stringify(end)) {
        throw new Error(`scene grew across resizes: ${JSON.stringify(start)} -> ${JSON.stringify(end)}`);
      }
      return true;
    }
  });
})();
