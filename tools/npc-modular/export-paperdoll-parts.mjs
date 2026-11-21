import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const aseprite = process.env.ASEPRITE_EXE || 'D:/anh/tools/aseprite/build2/bin/aseprite.exe';
const sourceRoot = path.join(root, 'art/source/gfx5b/characters');
const outputRoot = path.join(root, 'public/assets/npc-paperdoll-lab');
const specs = [
  { id: 'outfit-base', args: ['--ignore-layer', 'hair_back', '--ignore-layer', 'hair_front', '--ignore-layer', 'face', '--ignore-layer', 'details'] },
  { id: 'head-base', args: ['--import-layer', 'face'] },
  { id: 'hair-back', args: ['--import-layer', 'hair_back'] },
  { id: 'hair-front', args: ['--import-layer', 'hair_front'] },
  { id: 'details', args: ['--import-layer', 'details'] },
];

fs.mkdirSync(outputRoot, { recursive: true });
for (const character of ['C01', 'C02', 'C03']) {
  const source = path.join(sourceRoot, `${character}.aseprite`);
  if (!fs.existsSync(source)) throw new Error(`Missing editable source: ${source}`);
  for (const part of specs) {
    const stem = `${character.toLowerCase()}-${part.id}`;
    const png = path.join(outputRoot, `${stem}.png`);
    const json = path.join(outputRoot, `${stem}.json`);
    const result = spawnSync(aseprite, ['--batch', ...part.args, source, '--sheet', png, '--data', json, '--sheet-type', 'rows', '--sheet-columns', '4'], { encoding: 'utf8', windowsHide: true });
    if (result.status !== 0) throw new Error(`Aseprite export failed for ${stem}:\n${result.stderr || result.stdout}`);
    process.stdout.write(`Exported ${stem}\n`);
  }
}

const directions = ['down', 'up', 'left', 'right'];
const frameMap = {
  idle: Object.fromEntries(directions.map((direction, index) => [direction, Array.from({ length: 4 }, (_, phase) => index * 4 + phase)])),
  walk: Object.fromEntries(directions.map((direction, index) => [direction, Array.from({ length: 4 }, (_, phase) => 16 + index * 4 + phase)])),
};
const layerOrder = { 'hair-back': 10, 'outfit-base': 20, 'head-base': 30, 'hair-front': 40, details: 50 };
function componentRecord(character, role) {
  const prefix = character.toLowerCase();
  const compatible = role === 'outfit-base' || role === 'details' ? [character] : ['C01', 'C02', 'C03'];
  return {
    id: `${character}-${role}`,
    role,
    source: `art/source/gfx5b/characters/${character}.aseprite`,
    sourceLayers: role === 'outfit-base' ? ['shadow', 'legs', 'robe', 'arms'] : role === 'head-base' ? ['face'] : role === 'details' ? ['details'] : [role.replace('-', '_')],
    image: `${prefix}-${role}.png`,
    metadata: `${prefix}-${role}.json`,
    frameSize: { width: 32, height: 40 },
    frameCount: 32,
    supportedDirections: directions,
    frameMap,
    anchor: { canvasOrigin: { x: 16, y: 40 }, footBaselineY: 37, alignment: 'same 32x40 source canvas; zero export offset' },
    layerOrder: layerOrder[role],
    compatibleOutfitBaseIds: compatible.map(id => `${id}-outfit-base`),
    compatibilityStatus: role === 'outfit-base' || role === 'details' ? 'source-paired' : 'structural-only-art-review-required',
    durationsMs: { idle: 240, walk: 140 },
  };
}
const manifest = {
  version: 1,
  status: 'technical-source-extraction-unreviewed-art',
  sourceFormat: 'aseprite-layer-export',
  frame: { width: 32, height: 40, columns: 4, rows: 8, frameCount: 32, directions: ['down', 'up', 'left', 'right'], idleFramesPerDirection: 4, walkFramesPerDirection: 4 },
  compositionOrder: ['hair-back', 'outfit-base', 'head-base', 'hair-front', 'details'],
  equipment: 'Rendered by the existing equipment path; excluded from these part exports.',
  components: Object.fromEntries(['C01', 'C02', 'C03'].map(id => [id, Object.fromEntries(specs.map(part => [part.id, componentRecord(id, part.id)]))])),
  limitations: ['C01-C03 are technical prototypes; appearance has not passed art review.', 'The head-base is an indivisible complete head/face unit; facial features are not independently replaceable.', 'The details layer is kept as an opaque overlay; it has not been classified into accessory vs costume pixels.', 'Equipment is intentionally outside this paper-doll composition.'],
};
fs.writeFileSync(path.join(outputRoot, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
