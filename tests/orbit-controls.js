/**
 * Sandbox UI polish tests (docs/PLAN.md "Sandbox UI polish" epic).
 * Idle spin should only stop on an explicit drag-to-orbit, not on a wheel zoom.
 * Up/Down/Left/Right arrow keys zoom/orbit in orbit view without stopping the spin.
 */

LW_TESTS.push({
  name: 'orbit-controls: mouse wheel zoom does not stop the idle spin',
  run(LW) {
    LW.controls.autoRotate = true;
    const canvas = LW.renderer.domElement;
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true }));
    if (!LW.controls.autoRotate) throw new Error('wheel zoom should not have stopped autoRotate');
    return true;
  }
});

LW_TESTS.push({
  name: 'orbit-controls: an explicit drag still stops the idle spin',
  run(LW) {
    LW.controls.autoRotate = true;
    const canvas = LW.renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    canvas.dispatchEvent(new PointerEvent('pointerdown', {
      pointerId: 1, pointerType: 'mouse', button: 0, clientX: cx, clientY: cy, bubbles: true, cancelable: true
    }));
    if (LW.controls.autoRotate) throw new Error('a pointerdown drag should have stopped autoRotate');
    canvas.dispatchEvent(new PointerEvent('pointerup', {
      pointerId: 1, pointerType: 'mouse', button: 0, clientX: cx, clientY: cy, bubbles: true, cancelable: true
    }));
    return true;
  }
});

LW_TESTS.push({
  name: 'orbit-controls: ArrowUp/ArrowDown zoom in orbit mode without stopping the spin',
  run(LW) {
    LW.controls.target.set(0, 0, 0);
    LW.camera.position.set(0, 0, LW.startCameraDistance);
    LW.controls.update();
    LW.controls.autoRotate = true;
    const before = LW.camera.position.distanceTo(LW.controls.target);

    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    const afterUp = LW.camera.position.distanceTo(LW.controls.target);
    if (!(afterUp < before)) throw new Error(`ArrowUp should zoom in (reduce distance): before=${before}, after=${afterUp}`);

    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    const afterDown = LW.camera.position.distanceTo(LW.controls.target);
    if (!(afterDown > afterUp)) throw new Error(`ArrowDown should zoom out (increase distance): afterUp=${afterUp}, afterDown=${afterDown}`);

    if (!LW.controls.autoRotate) throw new Error('arrow-key zoom should not have stopped autoRotate');
    return true;
  }
});

LW_TESTS.push({
  name: 'orbit-controls: ArrowLeft/ArrowRight orbit around the target without stopping the spin',
  run(LW) {
    LW.controls.target.set(0, 0, 0);
    LW.camera.position.set(0, 0, LW.startCameraDistance);
    LW.controls.update();
    LW.controls.autoRotate = true;
    const before = LW.camera.position.clone();
    const distBefore = before.distanceTo(LW.controls.target);

    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    const afterRight = LW.camera.position.clone();
    if (afterRight.distanceTo(before) < 0.01) throw new Error('ArrowRight should have rotated the camera around the target');
    if (Math.abs(afterRight.distanceTo(LW.controls.target) - distBefore) > 0.05) {
      throw new Error('ArrowRight should orbit, not change distance from the target');
    }

    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    const afterLeft = LW.camera.position.clone();
    if (afterLeft.distanceTo(afterRight) < 0.01) throw new Error('ArrowLeft should have rotated the camera around the target');

    if (!LW.controls.autoRotate) throw new Error('arrow-key orbit should not have stopped autoRotate');
    return true;
  }
});

LW_TESTS.push({
  name: 'orbit-controls: arrow-key zoom respects minDistance/maxDistance clamps',
  run(LW) {
    LW.controls.target.set(0, 0, 0);
    LW.camera.position.set(0, 0, LW.controls.minDistance * 1.2);
    LW.controls.update();
    for (let i = 0; i < 40; i++) dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    const closest = LW.camera.position.distanceTo(LW.controls.target);
    if (closest < LW.controls.minDistance - 0.01) throw new Error(`ArrowUp zoom went past minDistance: ${closest} < ${LW.controls.minDistance}`);

    LW.camera.position.set(0, 0, LW.controls.maxDistance * 0.8);
    LW.controls.update();
    for (let i = 0; i < 60; i++) dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    const farthest = LW.camera.position.distanceTo(LW.controls.target);
    if (farthest > LW.controls.maxDistance + 0.01) throw new Error(`ArrowDown zoom went past maxDistance: ${farthest} > ${LW.controls.maxDistance}`);

    return true;
  }
});

LW_TESTS.push({
  name: 'orbit-controls: arrow keys do nothing while a game is active (KEYMAP owns them instead)',
  run(LW) {
    LW.games.open('courier');
    LW.games.start();
    LW.controls.target.set(0, 0, 0);
    LW.camera.position.set(0, 0, LW.startCameraDistance);
    LW.controls.update();
    const before = LW.camera.position.clone();

    LW.game.keys.clear();
    dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    if (!LW.game.keys.has('up')) throw new Error('ArrowUp should still feed the flight KEYMAP while a game is active');
    if (LW.camera.position.distanceTo(before) > 0.001) {
      throw new Error('ArrowUp should not have moved the orbit camera while a game is active');
    }

    LW.games.quit();
    return true;
  }
});
