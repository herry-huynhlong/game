import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'thanh-van-camera-'));
try {
  await build({ entryPoints: ['src/dao/CameraControls.ts'], outfile: path.join(temp, 'camera.cjs'), bundle: true, platform: 'node', format: 'cjs', target: 'node20', logLevel: 'silent' });
  const { CameraPointerSession, clampCameraScroll, crossedDragThreshold, panCameraScroll, screenToWorldPoint, zoomAtPoint, CAMERA_ZOOM } = createRequire(import.meta.url)(path.join(temp, 'camera.cjs'));

  assert.equal(crossedDragThreshold({ x: 0, y: 0 }, { x: 7, y: 0 }), false, 'small motion remains a click');
  assert.equal(crossedDragThreshold({ x: 0, y: 0 }, { x: 8, y: 0 }), true, '8 screen pixels starts a drag');
  const pointer = new CameraPointerSession();
  assert.equal(pointer.begin(1, 0, false, { x: 10, y: 20 }, false), false, 'HUD target cannot start camera input');
  assert.equal(pointer.end(1), 'ignored');
  assert.equal(pointer.begin(1, 0, false, { x: 10, y: 20 }, true), true);
  assert.deepEqual(pointer.move(1, { x: 15, y: 23 }), { started: false, dragging: false, delta: { x: 0, y: 0 } });
  assert.equal(pointer.end(1), 'click', 'NPC click is delivered only on release');
  pointer.begin(1, 0, false, { x: 0, y: 0 }, true);
  assert.deepEqual(pointer.move(1, { x: 8, y: 0 }), { started: true, dragging: true, delta: { x: 8, y: 0 } });
  assert.equal(pointer.end(1), 'drag', 'drag does not become an NPC click');
  pointer.begin(4, 1, false, { x: 0, y: 0 }, true);
  assert.equal(pointer.end(4), 'ignored', 'middle mouse pans without selecting');
  pointer.begin(5, 0, true, { x: 0, y: 0 }, true);
  pointer.cancel();
  assert.equal(pointer.end(5), 'ignored', 'pointer cancel safely clears the gesture');

  const zoom = 1.4, point = { x: 220, y: 140 }, scroll = { x: 300, y: 180 };
  const zoomed = zoomAtPoint(scroll, point, zoom, 1.75);
  const before = screenToWorldPoint(point, scroll, zoom), after = screenToWorldPoint(point, zoomed, 1.75);
  assert.ok(Math.abs(before.x - after.x) < 1e-9 && Math.abs(before.y - after.y) < 1e-9, 'zoom anchor stays under pointer');
  assert.deepEqual(panCameraScroll(scroll, { x: 70, y: -35 }, 1.4), { x: 250, y: 205 }, 'drag directions map to camera motion');
  assert.deepEqual(clampCameraScroll({ x: -100, y: 9000 }, { x: 3840, y: 1600 }, { x: 1280, y: 720 }, 1), { x: 0, y: 880 });
  assert.deepEqual(clampCameraScroll({ x: 0, y: 0 }, { x: 700, y: 500 }, { x: 1280, y: 720 }, 1), { x: -290, y: -110 }, 'small map centers within viewport');
  assert.ok(CAMERA_ZOOM.min >= .6 && CAMERA_ZOOM.max <= 2, 'zoom stays within pixel-art viewing limits');
  console.log('Camera controls tests passed: click/drag, HUD gating, pointer cancel, pan, zoom anchor, map bounds.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
