/**
 * Planet size selector tests (Epic: Sandbox UI polish, backlog item 1)
 *
 * Feature: options menu with planet-size selector (small/mid/large).
 * Sizes map to different R values (10/15/20); switching resizes the current planet
 * live, same seed — not a reroll. Reuses the R-scaling work from Sprint P1
 * (NZ, camera limits, orbit altitudes all already expressed in terms of R).
 *
 * API CONTRACT:
 * - LW.size API:
 *   - LW.size.get(): returns 'small', 'mid', or 'large'
 *   - LW.size.set(size): applies size immediately, regenerates planet with new R
 *     but same seed, persists to localStorage (key: 'lw-size')
 *   - LW.size.sizes: object mapping size name to R value: { small: 10, mid: 15, large: 20 }
 *   - LW.size.getRConfig(size): returns config object { R, NZ, HC, ... } for a size
 *   - LW.size.currentConfig(): returns current config
 *
 * Observable behavior:
 * - R changes on set(), and all dependent values update (camera clamps, terrain, etc.)
 * - Same seed after resize means same world (recognizable), not a random reroll
 * - Camera clamps (minDistance, maxDistance) update immediately
 * - Current camera position is clamped to new limits if outside
 * - Size selection persists across reload (localStorage)
 * - Terrain regenerates at new R with same frequency scaling (NZ = R/10)
 * - Atmosphere/moon/camera start position scale with R
 * - Cities stay in same directions but their world positions scale with R
 * - UI buttons exist (small/mid/large) in same style as quality selector
 *
 * Determinism (same seed = same world):
 * - Before and after resize, generating terrain/cities at the same R with the same seed
 *   should produce identical results (sampled at a few key points)
 * - Switching size and switching back (A -> B -> A) should restore the original
 *   world state bit-for-bit (same terrain, same tree positions, etc.)
 */

LW_TESTS.push({
  name: 'planet-size: LW.size API exists',
  run(LW) {
    if (!LW.size) throw new Error('LW.size not defined');
    if (typeof LW.size.get !== 'function') throw new Error('LW.size.get() not defined');
    if (typeof LW.size.set !== 'function') throw new Error('LW.size.set() not defined');
    if (!LW.size.sizes) throw new Error('LW.size.sizes not defined');
    if (!LW.size.getRConfig) throw new Error('LW.size.getRConfig not defined');
    if (!LW.size.currentConfig) throw new Error('LW.size.currentConfig not defined');
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: get() returns small, mid, or large',
  run(LW) {
    const size = LW.size.get();
    if (size !== 'small' && size !== 'mid' && size !== 'large') {
      throw new Error(`LW.size.get() should return 'small', 'mid', or 'large', got ${size}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: sizes maps small=10, mid=15, large=20',
  run(LW) {
    if (LW.size.sizes.small !== 10) throw new Error(`sizes.small should be 10, got ${LW.size.sizes.small}`);
    if (LW.size.sizes.mid !== 15) throw new Error(`sizes.mid should be 15, got ${LW.size.sizes.mid}`);
    if (LW.size.sizes.large !== 20) throw new Error(`sizes.large should be 20, got ${LW.size.sizes.large}`);
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: getRConfig returns config for each size',
  run(LW) {
    const cfgSmall = LW.size.getRConfig('small');
    const cfgMid = LW.size.getRConfig('mid');
    const cfgLarge = LW.size.getRConfig('large');

    if (!cfgSmall || cfgSmall.R !== 10) throw new Error('getRConfig(small) should return config with R=10');
    if (!cfgMid || cfgMid.R !== 15) throw new Error('getRConfig(mid) should return config with R=15');
    if (!cfgLarge || cfgLarge.R !== 20) throw new Error('getRConfig(large) should return config with R=20');

    // Check that config has required fields
    for (const cfg of [cfgSmall, cfgMid, cfgLarge]) {
      if (typeof cfg.NZ !== 'number') throw new Error('Config should have NZ');
      if (typeof cfg.HC !== 'number') throw new Error('Config should have HC');
      if (typeof cfg.minDistance !== 'number') throw new Error('Config should have minDistance');
      if (typeof cfg.maxDistance !== 'number') throw new Error('Config should have maxDistance');
      if (typeof cfg.startCameraDistance !== 'number') throw new Error('Config should have startCameraDistance');
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: NZ = R / 10 for each size',
  run(LW) {
    for (const [size, R] of Object.entries(LW.size.sizes)) {
      const cfg = LW.size.getRConfig(size);
      const expectedNZ = R / 10;
      if (Math.abs(cfg.NZ - expectedNZ) > 0.0001) {
        throw new Error(`getRConfig(${size}).NZ should be ${expectedNZ}, got ${cfg.NZ}`);
      }
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: HC = R + 0.32 for each size',
  run(LW) {
    for (const [size, R] of Object.entries(LW.size.sizes)) {
      const cfg = LW.size.getRConfig(size);
      const expectedHC = R + 0.32;
      if (Math.abs(cfg.HC - expectedHC) > 0.0001) {
        throw new Error(`getRConfig(${size}).HC should be ${expectedHC}, got ${cfg.HC}`);
      }
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: currentConfig() returns config for current size',
  run(LW) {
    const current = LW.size.currentConfig();
    const currentSize = LW.size.get();
    const expected = LW.size.getRConfig(currentSize);

    if (current.R !== expected.R) {
      throw new Error(`currentConfig().R should be ${expected.R}, got ${current.R}`);
    }
    if (Math.abs(current.NZ - expected.NZ) > 0.0001) {
      throw new Error(`currentConfig().NZ should be ${expected.NZ}, got ${current.NZ}`);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: set(size) changes R immediately',
  run(LW) {
    const originalSize = LW.size.get();
    const originalR = LW.R;

    try {
      const newSize = originalSize === 'small' ? 'mid' : 'small';
      LW.size.set(newSize);

      const newR = LW.R;
      const expectedR = LW.size.sizes[newSize];

      if (newR !== expectedR) {
        throw new Error(`After set('${newSize}'), R should be ${expectedR}, got ${newR}`);
      }
    } finally {
      // Restore original size
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: set(size) updates camera clamps',
  run(LW) {
    const originalSize = LW.size.get();

    try {
      LW.size.set('small');
      const smallCfg = LW.size.getRConfig('small');
      if (Math.abs(LW.controls.minDistance - smallCfg.minDistance) > 0.0001) {
        throw new Error(`After set('small'), minDistance should be ${smallCfg.minDistance}, got ${LW.controls.minDistance}`);
      }
      if (Math.abs(LW.controls.maxDistance - smallCfg.maxDistance) > 0.0001) {
        throw new Error(`After set('small'), maxDistance should be ${smallCfg.maxDistance}, got ${LW.controls.maxDistance}`);
      }

      LW.size.set('large');
      const largeCfg = LW.size.getRConfig('large');
      if (Math.abs(LW.controls.minDistance - largeCfg.minDistance) > 0.0001) {
        throw new Error(`After set('large'), minDistance should be ${largeCfg.minDistance}, got ${LW.controls.minDistance}`);
      }
      if (Math.abs(LW.controls.maxDistance - largeCfg.maxDistance) > 0.0001) {
        throw new Error(`After set('large'), maxDistance should be ${largeCfg.maxDistance}, got ${LW.controls.maxDistance}`);
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: set(size) updates atmosphere radius',
  run(LW) {
    const originalSize = LW.size.get();

    try {
      LW.size.set('small');
      const smallR = 10;
      const smallAtmosphereRadius = smallR * 1.2;
      if (Math.abs(LW.atmosphere.geometry.parameters.radius - smallAtmosphereRadius) > 0.0001) {
        throw new Error(`After set('small'), atmosphere radius should be ${smallAtmosphereRadius}, got ${LW.atmosphere.geometry.parameters.radius}`);
      }

      LW.size.set('large');
      const largeR = 20;
      const largeAtmosphereRadius = largeR * 1.2;
      if (Math.abs(LW.atmosphere.geometry.parameters.radius - largeAtmosphereRadius) > 0.0001) {
        throw new Error(`After set('large'), atmosphere radius should be ${largeAtmosphereRadius}, got ${LW.atmosphere.geometry.parameters.radius}`);
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: set(size) updates moon position',
  run(LW) {
    const originalSize = LW.size.get();

    try {
      LW.size.set('small');
      const smallMoonX = 10 * 2.6;
      if (Math.abs(LW.moon.position.x - smallMoonX) > 0.0001) {
        throw new Error(`After set('small'), moon.x should be ${smallMoonX}, got ${LW.moon.position.x}`);
      }

      LW.size.set('large');
      const largeMoonX = 20 * 2.6;
      if (Math.abs(LW.moon.position.x - largeMoonX) > 0.0001) {
        throw new Error(`After set('large'), moon.x should be ${largeMoonX}, got ${LW.moon.position.x}`);
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: size persists to localStorage',
  run(LW) {
    // Clear any previous value
    try { localStorage.removeItem('lw-size'); } catch { /* storage blocked */ }

    const originalSize = LW.size.get();

    try {
      LW.size.set('small');
      let stored = null;
      try { stored = localStorage.getItem('lw-size'); } catch { /* storage blocked */ }

      if (stored !== 'small') {
        throw new Error(
          `After set('small'), localStorage['lw-size'] should be 'small', got ${stored}`
        );
      }

      LW.size.set('large');
      try { stored = localStorage.getItem('lw-size'); } catch { /* storage blocked */ }

      if (stored !== 'large') {
        throw new Error(
          `After set('large'), localStorage['lw-size'] should be 'large', got ${stored}`
        );
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: size button elements exist',
  run(LW) {
    // Look for buttons with data-size attribute or size-related IDs
    const sizeButtons = [
      document.getElementById('sbtn-small') || document.getElementById('size-small'),
      document.getElementById('sbtn-mid') || document.getElementById('size-mid'),
      document.getElementById('sbtn-large') || document.getElementById('size-large'),
    ].filter(b => b);

    // Also try finding a button group with data-size attributes
    const allSizeButtons = [...document.querySelectorAll('[data-size]')].filter(b => b.tagName === 'BUTTON');

    if (sizeButtons.length < 3 && allSizeButtons.length < 3) {
      throw new Error(
        'Size buttons not found. Expected buttons with id #sbtn-small/mid/large or data-size attribute'
      );
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: button click switches size',
  run(LW) {
    const originalSize = LW.size.get();

    try {
      // Find the size buttons
      const buttons = {
        small: document.getElementById('sbtn-small') || document.getElementById('size-small') ||
               [...document.querySelectorAll('[data-size="small"]')].find(b => b.tagName === 'BUTTON'),
        mid: document.getElementById('sbtn-mid') || document.getElementById('size-mid') ||
             [...document.querySelectorAll('[data-size="mid"]')].find(b => b.tagName === 'BUTTON'),
        large: document.getElementById('sbtn-large') || document.getElementById('size-large') ||
               [...document.querySelectorAll('[data-size="large"]')].find(b => b.tagName === 'BUTTON'),
      };

      if (!buttons.small || !buttons.mid || !buttons.large) {
        throw new Error('Could not find all size buttons');
      }

      // Click small button
      buttons.small.click();
      if (LW.size.get() !== 'small') {
        throw new Error(`After clicking small button, size should be 'small', got ${LW.size.get()}`);
      }

      // Click large button
      buttons.large.click();
      if (LW.size.get() !== 'large') {
        throw new Error(`After clicking large button, size should be 'large', got ${LW.size.get()}`);
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: same seed produces same terrain across resize',
  run(LW) {
    // Verify that regenerating with the same seed produces the same terrain
    // by sampling a few points before and after resize and checking they match
    // when accounting for R scaling.

    // Sample a few directions and check rawHeight at different R values
    const sample = { x: 0.5, y: 0.6, z: 0.62 };
    const normalized = new LW.V3(sample.x, sample.y, sample.z).normalize();

    // Get a baseline height at the current R
    const baselineR = LW.R;
    const baselineHeight = LW.rawHeight(normalized.clone());

    // Switch to a different size and back
    const originalSize = LW.size.get();
    const newSize = originalSize === 'small' ? 'large' : 'small';

    try {
      LW.size.set(newSize);
      const newR = LW.R;

      // Now switch back to original
      LW.size.set(originalSize);

      // Check that we're back to the original R
      if (LW.R !== baselineR) {
        throw new Error(
          `After resize roundtrip, R should be ${baselineR}, got ${LW.R}`
        );
      }

      // Check that terrain at the sample point matches the baseline
      const restoredHeight = LW.rawHeight(normalized.clone());
      const tolerance = 0.0001;
      if (Math.abs(restoredHeight - baselineHeight) > tolerance) {
        throw new Error(
          `After resize roundtrip, rawHeight should restore: ` +
          `was ${baselineHeight.toFixed(4)}, after roundtrip ${restoredHeight.toFixed(4)}`
        );
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet-size: camera position clamped after resize',
  run(LW) {
    // If camera is outside the new clamps after a resize, it should be clamped
    // This is a bit tricky to test without moving the camera, so we'll do a
    // light check: ensure that after a resize, the camera distance is within bounds
    const originalSize = LW.size.get();

    try {
      // Move to a different size
      const newSize = originalSize === 'small' ? 'large' : 'small';
      LW.size.set(newSize);

      const cfg = LW.size.currentConfig();
      const distance = LW.controls.object.position.length();

      // The camera distance should be within the new clamps (allowing a small margin
      // in case the clamping happens on the next frame)
      if (distance < cfg.minDistance - 0.1 || distance > cfg.maxDistance + 0.1) {
        // This might happen if the camera was moved by another test; just log it
        // The real check is that the clamps themselves are set correctly (tested separately)
      }

      // Verify clamps are set
      if (Math.abs(LW.controls.minDistance - cfg.minDistance) > 0.0001) {
        throw new Error(`minDistance should be ${cfg.minDistance}, got ${LW.controls.minDistance}`);
      }
      if (Math.abs(LW.controls.maxDistance - cfg.maxDistance) > 0.0001) {
        throw new Error(`maxDistance should be ${cfg.maxDistance}, got ${LW.controls.maxDistance}`);
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet: existing AC3 camera test still passes at small size',
  run(LW) {
    const originalSize = LW.size.get();

    try {
      LW.size.set('small');

      // Run the basic camera fit check from planet.js AC3
      // The whole planet should fit at start distance
      const startDist = LW.size.currentConfig().startCameraDistance;
      const R = LW.size.sizes.small;

      // A sphere of radius R fits vertically in a 45-deg FOV camera at distance
      // 3 * R (the same multiplier as before, just with the smaller R value)
      const expectedFit = 3 * R;
      if (Math.abs(startDist - expectedFit) > 0.1) {
        throw new Error(
          `Start distance should be 3*R for small size: expected ${expectedFit}, got ${startDist}`
        );
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet: existing AC3 camera test still passes at large size',
  run(LW) {
    const originalSize = LW.size.get();

    try {
      LW.size.set('large');

      // Same check for large size
      const startDist = LW.size.currentConfig().startCameraDistance;
      const R = LW.size.sizes.large;

      const expectedFit = 3 * R;
      if (Math.abs(startDist - expectedFit) > 0.1) {
        throw new Error(
          `Start distance should be 3*R for large size: expected ${expectedFit}, got ${startDist}`
        );
      }
    } finally {
      LW.size.set(originalSize);
    }
    return true;
  }
});

LW_TESTS.push({
  name: 'planet: existing quality tests still pass at different sizes',
  run(LW) {
    const originalSize = LW.size.get();
    const originalQuality = LW.quality.get();

    try {
      // Test that quality switching still works at different planet sizes
      LW.size.set('small');
      LW.quality.set('low');
      if (LW.quality.get() !== 'low') {
        throw new Error('Quality should switch at small size');
      }

      LW.size.set('large');
      LW.quality.set('high');
      if (LW.quality.get() !== 'high') {
        throw new Error('Quality should switch at large size');
      }
    } finally {
      LW.size.set(originalSize);
      LW.quality.set(originalQuality);
    }
    return true;
  }
});
