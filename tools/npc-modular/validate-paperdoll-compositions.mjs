import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/npc-paperdoll-lab/manifest.json'), 'utf8'));
const demo = JSON.parse(fs.readFileSync(path.join(root, 'art/source/npc-modular/paperdoll-demo-compositions-v1.json'), 'utf8'));
const available = Object.values(catalog.components).flatMap(parts => Object.values(parts));
const byId = new Map(available.map(part => [part.id, part]));
const errors = [];
for (const entry of demo.compositions) {
  const selected = ['outfitBase','headBase','hairBack','hairFront','details'].map(key => [key, byId.get(entry[key])]);
  for (const [slot, component] of selected) if (!component) errors.push(`${entry.id}: missing component ${slot}=${entry[slot]}`);
  const outfit = byId.get(entry.outfitBase);
  for (const [slot, component] of selected) {
    if (!component) continue;
    if (component.frameCount !== 32 || component.frameSize.width !== 32 || component.frameSize.height !== 40) errors.push(`${entry.id}: ${slot} has incompatible frame size/count`);
    if (JSON.stringify(component.supportedDirections) !== JSON.stringify(catalog.frame.directions)) errors.push(`${entry.id}: ${slot} does not support the full direction set`);
    if (JSON.stringify(component.frameMap) !== JSON.stringify(available[0].frameMap)) errors.push(`${entry.id}: ${slot} frame map differs from the rig`);
    if (outfit && !component.compatibleOutfitBaseIds.includes(outfit.id)) errors.push(`${entry.id}: ${slot} is not structurally compatible with ${outfit.id}`);
    if (component.image && !fs.existsSync(path.join(root, 'public/assets/npc-paperdoll-lab', component.image))) errors.push(`${entry.id}: missing runtime lab sheet ${component.image}`);
  }
  const back=byId.get(entry.hairBack),front=byId.get(entry.hairFront),details=byId.get(entry.details);
  if(back&&front&&back.id.split('-')[0]!==front.id.split('-')[0])errors.push(`${entry.id}: hair back/front must be one source pair`);
  if(outfit&&details&&outfit.id.split('-')[0]!==details.id.split('-')[0])errors.push(`${entry.id}: unclassified details must stay paired with outfit base`);
}
if(errors.length){for(const error of errors)console.error(`FAIL: ${error}`);process.exit(1)}
console.log(`Validated ${demo.compositions.length} paper-doll configurations against ${available.length} source components.`);
