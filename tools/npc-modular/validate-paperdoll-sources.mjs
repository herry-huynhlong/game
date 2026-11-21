import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'public/assets/npc-paperdoll-lab');
const read = file => PNG.sync.read(fs.readFileSync(path.join(dir, file)));
const readSource = file => PNG.sync.read(fs.readFileSync(path.join(root, 'art/source/gfx5b/characters', file)));
const sourcePlacements = Object.fromEntries(['C01', 'C02', 'C03'].map(id => [id, JSON.parse(fs.readFileSync(path.join(root, `art/source/gfx5b/characters/${id}.placement.json`), 'utf8'))]));
const sourceRows = sourcePlacements.C01;
const expectedDirections = ['down', 'up', 'left', 'right'];
const order = ['hair-back', 'outfit-base', 'head-base', 'hair-front', 'details'];
const errors = [];
function blend(dst, src, si, di) {
  const sa = src.data[si + 3] / 255;
  if (!sa) return;
  const da = dst.data[di + 3] / 255;
  const oa = sa + da * (1 - sa);
  for (let c = 0; c < 3; c++) dst.data[di + c] = Math.round((src.data[si + c] * sa + dst.data[di + c] * da * (1 - sa)) / oa);
  dst.data[di + 3] = Math.round(oa * 255);
}

if (sourceRows.canvas.width !== 32 || sourceRows.canvas.height !== 40 || sourceRows.frames !== 32) errors.push('C01 placement is not the expected 32x40/32-frame layout');
if (Object.keys(sourceRows.animations).join(',') !== ['idle_down','idle_up','idle_left','idle_right','walk_down','walk_up','walk_left','walk_right'].join(',')) errors.push('Unexpected C01 animation layout');
if (!expectedDirections.every((d, i) => Object.keys(sourceRows.animations)[i] === `idle_${d}`)) errors.push('Direction order differs from expected');

for (const id of ['c01', 'c02', 'c03']) {
  const sourceId = id.toUpperCase();
  const placement = sourcePlacements[sourceId];
  const original = readSource(`${id.toUpperCase()}.png`);
  const parts = Object.fromEntries(order.map(part => [part, read(`${id}-${part}.png`)]));
  if (JSON.stringify(placement.animations) !== JSON.stringify(sourceRows.animations)) errors.push(`${sourceId}: animation/frame map differs from C01`);
  if (placement.canvas.width !== 32 || placement.canvas.height !== 40 || placement.frames !== 32) errors.push(`${sourceId}: incompatible canvas or frame count`);
  for (const part of order) {
    if (parts[part].width !== 128 || parts[part].height !== 320) errors.push(`${id}-${part}: expected 128x320 sheet, got ${parts[part].width}x${parts[part].height}`);
    const meta = JSON.parse(fs.readFileSync(path.join(dir, `${id}-${part}.json`), 'utf8'));
    const entries = Object.values(meta.frames);
    if (entries.length !== 32) errors.push(`${id}-${part}: metadata has ${entries.length} frames, expected 32`);
    for (let f = 0; f < entries.length; f++) {
      const box = entries[f].frame;
      if (box.w !== 32 || box.h !== 40 || box.x !== (f % 4) * 32 || box.y !== Math.floor(f / 4) * 40) errors.push(`${id}-${part}: frame ${f} is not in the shared 4x8 grid`);
    }
  }
  if (original.width !== 128 || original.height !== 320) errors.push(`${id}: original sheet has unexpected dimensions`);
  let different = 0, maxDelta = 0;
  for (let frame = 0; frame < 32; frame++) {
    const ox = (frame % 4) * 32, oy = Math.floor(frame / 4) * 40;
    for (let y = 0; y < 40; y++) for (let x = 0; x < 32; x++) {
      const dest = new PNG({ width: 1, height: 1 });
      for (const part of order) {
        const src = parts[part], sx = ox + x, sy = oy + y, si = (sy * src.width + sx) * 4;
        blend(dest, src, si, 0);
      }
      const oi = ((oy + y) * original.width + ox + x) * 4;
      for (let c = 0; c < 4; c++) {
        const delta = Math.abs(dest.data[c] - original.data[oi + c]);
        if (delta > 0) different++;
        if (delta > maxDelta) maxDelta = delta;
      }
    }
  }
  if (different) errors.push(`${id}: extracted layer composite differs from original in ${different} channel values (max delta ${maxDelta})`);
  else console.log(`${id}: five-part layer composite reconstructs all 32 frames pixel-exactly`);
}

if (errors.length) {
  for (const error of errors) console.error(`FAIL: ${error}`);
  process.exit(1);
}
console.log('Frame dimensions, export sheets and C01 direction/animation placement are valid.');
