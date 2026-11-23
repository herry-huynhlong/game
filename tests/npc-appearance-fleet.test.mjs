import assert from 'node:assert/strict';
import { allocateNpcAppearance, appearanceSignature, ensureWorldNpcAppearances, generateNpcAppearance } from '../src/world/NpcAppearanceProfiles.js';
import { rigFor } from '../src/world/CharacterAssetRegistry.js';
import { readFileSync } from 'node:fs';

const roles=['commoner','merchant','elder','low_disciple','repair_worker','quest_clerk','hunter','city_guard','monk','demonic_cultivator','independent_cultivator'];
const npcs=Array.from({length:108},(_,i)=>({id:`npc-${String(i).padStart(3,'0')}`,gender:i%3?'nam':'nữ',populationRole:roles[i%roles.length],inventory:[]}));
npcs[0].authorityRole='city_master';npcs[1].populationRole='sect_leader';
const world={worldId:'test',population:{spawnSeed:'stable'},npcs};
const reversed={...world,npcs:structuredClone(npcs).reverse()};
const ids=npcs.map(n=>n.id);
assert.equal(ensureWorldNpcAppearances(world),108);
assert.equal(ensureWorldNpcAppearances(reversed),108);
assert.deepEqual(npcs.map(n=>n.modularAppearance),ids.map(id=>reversed.npcs.find(n=>n.id===id).modularAppearance));
assert.equal(new Set(npcs.map(n=>appearanceSignature(n.modularAppearance.look))).size,108);
assert.equal(npcs.filter(n=>n.modularAppearance.locked).length,2);
assert.ok(npcs.every(n=>n.modularAppearance.look.weapon==='none'&&n.inventory.length===0));
const snapshot=JSON.stringify(world);
assert.equal(ensureWorldNpcAppearances(world),0);
assert.equal(JSON.stringify(world),snapshot);
const newcomer={id:'future-npc',gender:'nữ',populationRole:'commoner'};
world.npcs.push(newcomer,{id:'boss',species:'wolf',appearanceMode:'custom-boss'});
assert.equal(ensureWorldNpcAppearances(world),1);
assert.ok(['civilian','workwear'].includes(newcomer.modularAppearance.look.outfit));
assert.deepEqual(generateNpcAppearance(newcomer,'stable'),generateNpcAppearance(newcomer,'stable'));
assert.deepEqual(JSON.parse(JSON.stringify(world)).npcs.slice(0,108),JSON.parse(snapshot).npcs);
const taken=new Set(npcs.filter(n=>n.modularAppearance).map(n=>appearanceSignature(n.modularAppearance.look)));
assert.notEqual(appearanceSignature(allocateNpcAppearance(newcomer,'stable',taken,67)),appearanceSignature(newcomer.modularAppearance.look));
const atlas=JSON.parse(readFileSync('public/assets/npc-xianxia-rig/variants.json','utf8')).frames;
for(const npc of npcs.filter(n=>n.modularAppearance)){
  const look=npc.modularAppearance.look,rig=rigFor(look);
  for(const direction of ['down','up','left','right']){
    assert.ok(atlas[`${rig}/${direction}/face/${look.face}/${look.expression}`]);
    if(rig!=='original')assert.ok(atlas[`${rig}/${direction}/outerCloth${look.outfitColor==='jade'?'':'/'+look.outfitColor}`]);
  }
}
console.log('PASS: 108 unique configurations, order-independent, locked leaders, no equipment mutation, future NPC and all directional atlas keys');
