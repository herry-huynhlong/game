import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const requireFile = (relative, label = relative) => {
  const file = path.join(root, relative);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`Required ${label} is missing: ${relative}`);
  return file;
};
const read = (relative) => fs.readFileSync(requireFile(relative), 'utf8');
const requireText = (text, value, label) => {
  if (!text.includes(value)) throw new Error(`${label} does not contain required entry: ${value}`);
};
const filesUnder = (relative) => {
  const base = path.join(root, relative);
  if (!fs.existsSync(base)) return [];
  const result = [];
  const visit = (folder) => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const full = path.join(folder, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (entry.isFile()) result.push(path.relative(root, full).replaceAll(path.sep, '/'));
    }
  };
  visit(base);
  return result;
};
const imagesUnder = (relative) => filesUnder(relative).filter((file) => /\.(?:png|webp)$/i.test(file));
const hasPresetImage = (images, id) => images.some((file) => new RegExp(`(?:^|[/_.-])${id}(?:[/_.-]|$)`, 'i').test(file));

// Never publish locally tracked credentials or private runtime saves.
if (fs.existsSync(path.join(root, '.git'))) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root }).toString().split('\0').filter(Boolean);
  const secretFiles = tracked.filter((file) => /(^|\/)(\.env(?:\..*)?|secrets?\.json|.*\.save(?:\.json)?|saves\/.*)$/i.test(file)
    && !/(^|\/)(\.env\.example|\.env\.sample|.*\.save\.example)$/i.test(file));
  if (secretFiles.length) throw new Error(`Refusing build: private config/save files are tracked: ${secretFiles.join(', ')}`);
} else {
  console.warn('No .git metadata found locally; tracked-secret scan is deferred to GitHub Actions.');
}

requireFile('package-lock.json', 'npm lockfile');
requireFile('src/world-rebuild-scene.js', 'runtime WorldScene');
const roster = read('art/source/npc-modular/paperdoll-presets-v1-world-mapping.json');
const presets = read('art/source/npc-modular/paperdoll-presets-v1.json');
const runtimeImages = imagesUnder('public/assets/npc-paperdoll-lab/presets');
for (let i = 1; i <= 24; i++) {
  const id = `P${String(i).padStart(2, '0')}`;
  requireText(presets, id, 'Paper Doll preset registry');
  requireText(roster, id, '108-NPC preset mapping');
  if (!hasPresetImage(runtimeImages, id)) {
    throw new Error(`Runtime Paper Doll image is missing for ${id}`);
  }
}
requireText(roster, 'P09', 'P09 sect-leader mapping');
requireText(roster, 'P24', 'P24 city-master mapping');
requireText(read('src/world-rebuild-scene.js'), 'PAPERDOLL_PREVIEW', 'WorldScene Paper Doll preview/runtime toggle');
requireFile('maps/world-rebuild-1b.tmj', 'runtime world map source');
requireFile('public/assets/west-wilds/terrain.png', 'West Wilds tile atlas');
requireFile('public/assets/west-wilds/landmarks.png', 'West Wilds landmark atlas');
requireFile('public/assets/old-road/path.png', 'Old Road tile atlas');
requireFile('public/assets/old-road/ground.png', 'Old Road ground atlas');
requireFile('public/assets/society/facilities.png', 'city services and production atlas');
requireFile('public/assets/old-road/props.png', 'Old Road pavilion and scenery atlas');
const monsterFiles=['wolf-normal','wolf-elite','boar-normal','boar-elite','toad-normal','toad-elite','monster-fx','monster-loot'];
const undergroundArt=['deposits','farm-plots','mine-entrances','profession','spirit-herbs','wild-herbs'];
const westernArt=['ancient-grove','habitat-accents','treasures','flower-forms','wood-normal','millennial-normal','millennial-elite','flower-normal','vine-normal',
  'centipede-normal','eagle-normal','eagle-elite','living-grove','living-floor','spirit-veins','stag-normal','wood-king-normal'];
requireFile('monster-gallery.html','monster gallery source');
requireFile('monster-movement.html','monster movement lab source');
requireFile('public/assets/effects/flying-swords.png','flying sword sprites');
for(const name of monsterFiles)requireFile('public/assets/fauna/monster-v2/'+name+'.png','monster sprite');
for(const name of undergroundArt)requireFile('public/assets/di-mach/'+name+'.png','underground asset');
for(const name of westernArt)requireFile('public/assets/west-wilds/'+name+'.png','Van Linh art');


if (process.argv.includes('--dist')) {
  requireFile('dist/index.html', 'production entry point');
  requireFile('dist/monster-gallery.html','built monster gallery');
  requireFile('dist/monster-movement.html','built monster movement lab');
  requireFile('dist/assets/effects/flying-swords.png','built flying sword sprites');
  for(const name of monsterFiles)requireFile('dist/assets/fauna/monster-v2/'+name+'.png','built monster sprite');
  for(const name of undergroundArt)requireFile('dist/assets/di-mach/'+name+'.png','built underground asset');
  for(const name of westernArt)requireFile('dist/assets/west-wilds/'+name+'.png','built Van Linh art');
  requireFile('dist/maps/world-rebuild-1b.tmj', 'copied production world map');
  requireFile('dist/assets/west-wilds/terrain.png', 'copied West Wilds tile atlas');
  requireFile('dist/assets/west-wilds/landmarks.png', 'copied West Wilds landmark atlas');
  requireFile('dist/assets/old-road/path.png', 'copied Old Road tile atlas');
  requireFile('dist/assets/old-road/ground.png', 'copied Old Road ground atlas');
  requireFile('dist/assets/society/facilities.png', 'copied city services and production atlas');
  requireFile('dist/assets/old-road/props.png', 'copied Old Road scenery atlas');
  const builtImages = imagesUnder('dist/assets/npc-paperdoll-lab/presets');
  for (let i = 1; i <= 24; i++) {
    const id = `P${String(i).padStart(2, '0')}`;
    if (!hasPresetImage(builtImages, id)) throw new Error(`Built Paper Doll image missing: ${id}`);
  }
}
console.log(`Release validation passed${process.argv.includes('--dist') ? ' (production output)' : ''}: 24 presets, roster mappings, P09/P24, world map, monster gallery and sprites, and no tracked secrets.`);
