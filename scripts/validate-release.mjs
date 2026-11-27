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
requireFile('public/assets/sect-campus/south-bridge.png', 'Thanh Vân Tông stone bridge');
requireFile('public/assets/sect-campus/court-fixtures.png', 'Thanh Vân Tông court fixtures');
requireFile('public/assets/west-wilds/terrain.png', 'West Wilds tile atlas');
requireFile('public/assets/west-wilds/landmarks.png', 'West Wilds landmark atlas');
requireFile('public/assets/old-road/path.png', 'Old Road tile atlas');
requireFile('public/assets/old-road/ground.png', 'Old Road ground atlas');
requireFile('public/assets/society/facilities.png', 'city services and production atlas');
requireFile('public/assets/old-road/props.png', 'Old Road pavilion and scenery atlas');
const monsterFiles=['wolf-normal','wolf-elite','boar-normal','boar-elite','toad-normal','toad-elite','monster-fx','monster-loot'];
const eastArt=['terrain','shore','props','treasures','bone-skeleton-normal','bone-general-normal','sand-scorpion-normal','sand-worm-normal','sand-golem-normal','bone-wolf-normal','flame-lizard-normal','bone-king-normal'];
requireFile('public/assets/shanhe/terrain.png','Shanhe terrain');
const eastOverhaul=['terrain','shore','seams','props','landforms','treasures','bone-skeleton','bone-general','sand-scorpion','sand-worm','sand-golem','bone-wolf','flame-lizard','bone-king','wetland-toad'];
for(const name of eastOverhaul)requireFile('public/assets/east-wilds/overhaul/'+name+'.png','East Wilds art overhaul');
for(const name of eastArt)requireFile('public/assets/east-wilds/'+name+'.png','East Wilds asset');
const undergroundArt=['deposits','farm-plots','mine-entrances','profession','spirit-herbs','wild-herbs'];
const westernArt=['ancient-grove','habitat-accents','treasures','flower-forms','wood-normal','millennial-normal','millennial-elite','flower-normal','vine-normal',
  'centipede-normal','eagle-normal','eagle-elite','living-grove','living-floor','spirit-veins','stag-normal','wood-king-normal'];
requireFile('monster-gallery.html','monster gallery source');
requireFile('monster-movement.html','monster movement lab source');
requireFile('combat-balance.html','combat balance lab source');
requireFile('public/assets/effects/flying-swords.png','flying sword sprites');
const martialArt=['items/inventory-icons.png','items/martial-arms.png','items/martial-arms-back.png','items/martial-arms-before.png'];
martialArt.push(...['cinematic.png','cinematic.json','gather.wav','chime.wav','seal.wav','flight.wav','strike.wav','return.wav'].map(file=>'van-kiem/'+file));
martialArt.push(...['atlas.png','atlas.json',...['blade','dao','spear','fist','lightning','fire','ice','spirit','seal','dragon','crow','shock','contact','tail']
  .map(cue=>cue+'.wav')].map(file=>'van-phap/'+file));
for(const name of martialArt)requireFile('public/assets/'+name,'martial equipment art');
for(const name of monsterFiles)requireFile('public/assets/fauna/monster-v2/'+name+'.png','monster sprite');
for(const name of undergroundArt)requireFile('public/assets/di-mach/'+name+'.png','underground asset');
for(const name of westernArt)requireFile('public/assets/west-wilds/'+name+'.png','Van Linh art');


if (process.argv.includes('--dist')) {
  requireFile('dist/index.html', 'production entry point');
  requireFile('dist/monster-gallery.html','built monster gallery');
  requireFile('dist/monster-movement.html','built monster movement lab');
  requireFile('dist/combat-balance.html','built combat balance lab');
  requireFile('dist/assets/effects/flying-swords.png','built flying sword sprites');
  for(const name of martialArt)requireFile('dist/assets/'+name,'built martial equipment art');
  for(const name of monsterFiles)requireFile('dist/assets/fauna/monster-v2/'+name+'.png','built monster sprite');
  requireFile('dist/shanhe-preview.html','World Map Preview');
  requireFile('dist/assets/shanhe/terrain.png','built Shanhe terrain');
  requireFile('dist/east-art-gallery.html','East Wilds art gallery');
  for(const name of eastOverhaul)requireFile('dist/assets/east-wilds/overhaul/'+name+'.png','built East Wilds art overhaul');
  for(const name of eastArt)requireFile('dist/assets/east-wilds/'+name+'.png','built East Wilds asset');
  for(const name of undergroundArt)requireFile('dist/assets/di-mach/'+name+'.png','built underground asset');
  for(const name of westernArt)requireFile('dist/assets/west-wilds/'+name+'.png','built Van Linh art');
  requireFile('dist/maps/world-rebuild-1b.tmj', 'copied production world map');
  requireFile('dist/assets/sect-campus/south-bridge.png', 'built Thanh Vân Tông stone bridge');
  requireFile('dist/assets/sect-campus/court-fixtures.png', 'built Thanh Vân Tông court fixtures');
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
