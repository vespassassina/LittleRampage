/**
 * Adversarial tests for Ride menu: hostile user behavior, edge cases.
 */

LW_TESTS.push({
  name: 'ride-menu adversarial: clicking menu item closes menu reliably',
  run(LW) {
    const rideBtn = document.getElementById('ride-btn');
    const menu = document.getElementById('ride-menu');

    // Open and click an item
    rideBtn.click();
    menu.querySelector('[data-ride-mode="plane"]').click();

    // Menu should be closed
    if (!menu.hidden && menu.style.display !== 'none') {
      throw new Error('Menu should be closed after clicking item');
    }

    // Open and click another item
    rideBtn.click();
    menu.querySelector('[data-ride-mode="car"]').click();

    if (!menu.hidden && menu.style.display !== 'none') {
      throw new Error('Menu should be closed after clicking item (second time)');
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'ride-menu adversarial: arrow key spam while riding does not crash',
  run(LW) {
    const rideBtn = document.getElementById('ride-btn');
    const menu = document.getElementById('ride-menu');

    rideBtn.click();
    menu.querySelector('[data-ride-mode="plane"]').click();

    // Spam arrow keys
    for (let i = 0; i < 50; i++) {
      dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    }

    // Should still be in ride mode
    if (LW.controls.enabled) {
      throw new Error('Should still be riding after arrow key spam');
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'ride-menu adversarial: escape reliably exits each ride mode',
  run(LW) {
    const rideBtn = document.getElementById('ride-btn');
    const menu = document.getElementById('ride-menu');
    const modes = ['plane', 'car', 'boat', 'sat'];

    for (const mode of modes) {
      // Enter ride mode
      rideBtn.click();
      menu.querySelector(`[data-ride-mode="${mode}"]`).click();

      if (LW.controls.enabled) {
        throw new Error(`Should be riding in ${mode}`);
      }

      // Exit with escape
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      if (!LW.controls.enabled) {
        throw new Error(`Escape should exit ${mode} mode`);
      }
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'ride-menu adversarial: rapid mode switching works',
  run(LW) {
    const rideBtn = document.getElementById('ride-btn');
    const menu = document.getElementById('ride-menu');
    const modes = ['plane', 'car', 'boat', 'sat', 'plane', 'car'];

    for (const mode of modes) {
      rideBtn.click();
      menu.querySelector(`[data-ride-mode="${mode}"]`).click();

      if (LW.controls.enabled) {
        throw new Error(`Should be in ${mode} mode`);
      }

      dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    }

    // End in orbit mode
    document.querySelector('[data-mode="orbit"]').click();
    if (!LW.controls.enabled) {
      throw new Error('Should be in orbit mode');
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'ride-menu adversarial: up/down keys do not zoom while riding',
  run(LW) {
    const rideBtn = document.getElementById('ride-btn');
    const menu = document.getElementById('ride-menu');

    rideBtn.click();
    menu.querySelector('[data-ride-mode="car"]').click();

    const distBefore = LW.camera.position.distanceTo(LW.controls.target);

    // Try zoom keys (should be ignored while riding)
    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));

    const distAfter = LW.camera.position.distanceTo(LW.controls.target);

    // Distance should not change (within tolerance for floating point)
    if (Math.abs(distAfter - distBefore) > 0.1) {
      throw new Error('Camera should not zoom while riding');
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'ride-menu adversarial: game does not allow riding menu usage',
  run(LW) {
    const rideBtn = document.getElementById('ride-btn');

    LW.games.open('courier');
    LW.games.start();

    // Try to use ride menu
    rideBtn.click();

    // Game should still be active
    if (!LW.game.active) {
      throw new Error('Game should still be active');
    }

    LW.games.quit();

    // Now should be able to ride
    const menu = document.getElementById('ride-menu');
    rideBtn.click();
    menu.querySelector('[data-ride-mode="plane"]').click();

    if (LW.controls.enabled) {
      throw new Error('Should be able to ride after game ends');
    }

    return true;
  }
});

LW_TESTS.push({
  name: 'ride-menu adversarial: all modes accessible and functional',
  run(LW) {
    const rideBtn = document.getElementById('ride-btn');
    const menu = document.getElementById('ride-menu');
    const modes = ['plane', 'car', 'boat', 'sat'];

    for (const mode of modes) {
      rideBtn.click();
      const item = menu.querySelector(`[data-ride-mode="${mode}"]`);

      if (!item) throw new Error(`No menu item for ${mode}`);

      item.click();

      // Should be in ride mode
      if (LW.controls.enabled) {
        throw new Error(`Failed to enter ${mode} mode`);
      }

      // Arrow key should work
      dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      if (LW.controls.enabled) {
        throw new Error(`Arrow key should keep us in ${mode} mode`);
      }

      // Escape should exit
      dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      if (!LW.controls.enabled) {
        throw new Error(`Escape should exit ${mode} mode`);
      }
    }

    return true;
  }
});
