#!/usr/bin/env node
// Thanh Van Ky: safe, local, dependency-free Codex -> Aseprite bridge.
import { readFile, mkdir, access, stat } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const usage = 'node bridge.mjs examples/wall-damage.json [--aseprite "C:\\...\\Aseprite.exe"] [--out "D:\\...\\art\\drafts"] [--check]';
if (!argv.length || argv.includes('--help')) { console.log(usage); process.exit(argv.length ? 0 : 1); }
let specFile = argv[0]; let aseprite = process.env.ASEPRITE_EXE || '';
let outDir = resolve(process.cwd(), 'art', 'codex-drafts');
let check = false;
for (let i = 1; i < argv.length; i++) {
  switch (argv[i]) {
    case '--aseprite': aseprite = argv[++i]; break;
    case '--out': outDir = resolve(argv[++i]); break;
    case '--check': check = true; break;
    default: throw new Error(`Unknown argument: ${argv[i]}`);
  }
}
if (!specFile || !specFile.endsWith('.json')) throw new Error('Input must be a .json file');
specFile = resolve(specFile);
const spec = JSON.parse(await readFile(specFile, 'utf8'));
const fail = s => { throw new Error(s); };
const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
const color = (v, pal) => typeof v === 'string' && (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(v) || (pal && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(pal[v] || '')));
const nameOK = s => typeof s === 'string' && /^[\w -]{1,60}$/.test(s);
if (!nameOK(spec.name)) fail('Use a safe ASCII asset name (letters, numbers, _, -).');
if (!int(spec.width, 1, 512) || !int(spec.height, 1, 512)) fail('Width and height must be integers 1..512');
if (!Array.isArray(spec.frames) || spec.frames.length < 1 || spec.frames.length > 64) fail('Frames must be 1..64');
if (spec.palette && (typeof spec.palette !== 'object' || Array.isArray(spec.palette) || Object.values(spec.palette).some(x => !color(x)))) fail('Invalid palette');
const palette = spec.palette || {};
let opCount = 0;
const XY = (x,y) => int(x,-512,1024) && int(y,-512,1024);
for (const [fi, frame] of spec.frames.entries()) {
  if (!frame || typeof frame !== 'object' || !Array.isArray(frame.layers) || !frame.layers.length || frame.layers.length > 16) fail(`Frame ${fi}: invalid layers`);
  if (frame.durationMs != null && !int(frame.durationMs, 20, 10000)) fail(`Frame ${fi}: invalid durationMs`);
  const seen = new Set();
  for (const layer of frame.layers) {
    if (!nameOK(layer.name) || seen.has(layer.name)) fail(`Frame ${fi}: invalid/repeated layer name`);
    seen.add(layer.name);
    if (!Array.isArray(layer.ops)) fail(`Frame ${fi}, ${layer.name}: invalid ops`);
    for (const op of layer.ops) {
      opCount++;
      if (opCount > 30000) fail('Too many drawing commands');
      if (!op || typeof op !== 'object' || !color(op.color, palette)) fail(`Bad color in frame ${fi}`);
      if (op.type === 'pixel') { if (!XY(op.x,op.y)) fail('Bad pixel coords'); }
      else if (op.type === 'line') { if (!XY(op.x1,op.y1) || !XY(op.x2,op.y2)) fail('Bad line coords'); }
      else if (op.type === 'rect' || op.type === 'outline') {
        if (!XY(op.x,op.y) || !int(op.w,1,512) || !int(op.h,1,512)) fail('Bad rectangle');
      }
      else if (op.type === 'pixels') {
        if (!Array.isArray(op.points) || op.points.length > 20000 || op.points.some(p => !Array.isArray(p) || p.length!==2 || !XY(p[0],p[1]))) fail('Bad pixel array');
      } else fail(`Unknown drawing command: ${op.type}`);
    }
  }
}
console.log(`VALID: ${spec.name}: ${spec.width}x${spec.height}, ${spec.frames.length} frames, ${opCount} operations.`);
if (check) process.exit(0);
const candidates = [aseprite,
  'D:\\anh\\tools\\aseprite\\build2\\bin\\aseprite.exe',
  'C:\\Program Files\\Aseprite\\Aseprite.exe',
  'C:\\Program Files (x86)\\Aseprite\\Aseprite.exe'
].filter(Boolean);
let exe = '';
for (const c of candidates) { try { await access(c); exe = c; break; } catch {} }
if (!exe) fail('Aseprite.exe not found. Install licensed Aseprite, or supply --aseprite with path. Pixelorama alone cannot execute this Lua bridge.');
await mkdir(outDir, { recursive: true });
const safe = spec.name.replaceAll(' ', '-');
const nativeFile = join(outDir, `${safe}.aseprite`);
const pngFile = join(outDir, `${safe}.png`);
const jsonFile = join(outDir, `${safe}.json`);
const luaFile = join(root, 'draw-aseprite.lua');
for (const p of [nativeFile, pngFile, jsonFile]) {
  try { await access(p); fail(`Refusing to overwrite existing draft: ${p}. Choose a new asset name or output folder.`); } catch (err) { if (err.code !== 'ENOENT') throw err; }
}
function run(args) {
  const p = spawnSync(exe, args, { encoding: 'utf8', timeout: 60000, windowsHide: true, maxBuffer: 1024*1024*8 });
  if (p.error || p.status !== 0) fail(`Aseprite failed: ${p.error?.message || p.status}\n${p.stderr || p.stdout}`);
  if (p.stdout) console.log(p.stdout.trim());
}
run(['-b', '--script-param', `spec=${specFile}`, '--script-param', `output=${nativeFile}`, '--script', luaFile]);
await stat(nativeFile);
run(['-b', nativeFile, '--sheet-type', 'rows', '--sheet', pngFile, '--data', jsonFile, '--format', 'json-array']);
await Promise.all([stat(pngFile),stat(jsonFile)]);
console.log('Created native editable art:', nativeFile);
console.log('Created runtime preview sheet:', pngFile);
console.log('Created animation metadata:', jsonFile);
console.log('NOTE: Review art manually before copying into public/assets. No map/save/gameplay changes were made.');
