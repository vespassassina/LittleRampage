/**
 * Destructible scenery (docs/specs/planet-v2.md, AC 6): destroy(x) hides exactly that
 * building, house or tree; restoreScenery() brings everything back.
 * Hooks: LW.sceneryEntries (live list of { kind, ranges }), LW.destroy(entry), LW.restoreScenery().
 */
(function () {
  const meshes = LW => LW.scenery.world.children;
  const snapshot = LW => meshes(LW).map(m => Float32Array.from(m.geometry.attributes.position.array));

  // Vertex indices (per mesh) an entry owns.
  function owned(LW, entry) {
    const set = new Map(meshes(LW).map(m => [m, new Set()]));
    for (const r of entry.ranges) for (let i = r.start; i < r.start + r.count; i++) set.get(r.mesh).add(i);
    return set;
  }

  function pick(LW, kind) {
    const e = LW.sceneryEntries.find(x => x.kind === kind);
    if (!e) throw new Error(`no ${kind} entry in LW.sceneryEntries`);
    return e;
  }

  for (const kind of ['building', 'house', 'tree']) {
    LW_TESTS.push({
      name: `destructible: destroy(${kind}) hides exactly that ${kind}, restoreScenery brings it back (AC 6)`,
      run(LW) {
        LW.restoreScenery();
        const before = snapshot(LW), e = pick(LW, kind), mine = owned(LW, e);
        if (!e.ranges.length) throw new Error(`${kind} has no vertex ranges`);
        LW.destroy(e);
        meshes(LW).forEach((m, k) => {
          const p = m.geometry.attributes.position.array;
          for (let i = 0; i < p.length / 3; i++) {
            const inside = mine.get(m).has(i), moved = p[i * 3] !== before[k][i * 3] || p[i * 3 + 1] !== before[k][i * 3 + 1] || p[i * 3 + 2] !== before[k][i * 3 + 2];
            if (inside && (p[i * 3] || p[i * 3 + 1] || p[i * 3 + 2])) throw new Error(`${kind} vertex ${i} still visible`);
            if (!inside && moved) throw new Error(`vertex ${i} outside the ${kind} changed`);
          }
        });
        LW.restoreScenery();
        meshes(LW).forEach((m, k) => {
          const p = m.geometry.attributes.position.array;
          for (let i = 0; i < p.length; i++) if (p[i] !== before[k][i]) throw new Error('restore is not exact');
        });
        return true;
      }
    });
  }

  LW_TESTS.push({
    name: 'destructible: entries cover buildings, houses and trees, all with ranges (AC 6)',
    run(LW) {
      const n = {};
      for (const e of LW.sceneryEntries) {
        n[e.kind] = (n[e.kind] || 0) + 1;
        if (!e.ranges.length) throw new Error(`${e.kind} entry without ranges`);
      }
      for (const k of ['building', 'house', 'tree']) if (!n[k]) throw new Error(`no ${k} entries`);
      if (n.tree < 3000) throw new Error(`only ${n.tree} trees are destructible`);
      return true;
    }
  });

  LW_TESTS.push({
    name: 'destructible: destroying twice and restoring with nothing destroyed are harmless (adversarial)',
    run(LW) {
      LW.restoreScenery();
      const before = snapshot(LW), e = pick(LW, 'tree');
      LW.restoreScenery();
      LW.destroy(e); LW.destroy(e);
      LW.restoreScenery();
      meshes(LW).forEach((m, k) => {
        const p = m.geometry.attributes.position.array;
        for (let i = 0; i < p.length; i++) if (p[i] !== before[k][i]) throw new Error('double destroy corrupted the restore');
      });
      return true;
    }
  });

  LW_TESTS.push({
    name: 'destructible: a resize rebuilds the entries and drops destroyed state (adversarial)',
    run(LW) {
      const original = LW.size.get();
      try {
        LW.destroy(pick(LW, 'building'));
        LW.size.set(original === 'small' ? 'mid' : 'small');
        const stale = LW.sceneryEntries.filter(e => e.destroyed).length;
        if (stale) throw new Error(`${stale} entries still destroyed after a rebuild`);
        for (const e of LW.sceneryEntries) for (const r of e.ranges) {
          if (!meshes(LW).includes(r.mesh)) throw new Error('entry points at a mesh that was disposed');
        }
      } finally { LW.size.set(original); }
      return true;
    }
  });
})();
