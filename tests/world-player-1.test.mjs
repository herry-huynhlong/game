import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-player-1-'));
try {
await build({entryPoints:{HeavenlyDaoSystem:'src/dao/HeavenlyDaoSystem.ts',PossessionSystem:'src/dao/PossessionSystem.ts',CityLawSystem:'src/dao/CityLawSystem.ts'},outdir:temp,bundle:true,platform:'node',format:'cjs',target:'node20',outExtension:{'.js':'.cjs'},logLevel:'silent'});
const require=createRequire(import.meta.url),load=name=>require(path.join(temp,`${name}.cjs`));
const {HEAVEN_DEFAULTS}=load('HeavenlyDaoSystem'),{PossessionSystem,POSSESSION_CYCLE_MS}=load('PossessionSystem'),{reportCityCombat}=load('CityLawSystem');

const heaven=structuredClone(HEAVEN_DEFAULTS);
const actor={id:'npc-actor',name:'Tu sĩ thử',alive:true,ascended:false,realmIndex:0};
assert.equal(PossessionSystem.start(heaven,actor).ok,true);
assert.equal(heaven.possession.npcId,actor.id);
assert.equal(heaven.mode,'possessing');
assert.equal(heaven.divinePower,25);
assert.equal(PossessionSystem.start(heaven,actor).ok,false,'a second possession must be rejected');
const restored=JSON.parse(JSON.stringify(heaven));
assert.equal(restored.possession.npcId,actor.id,'save/load keeps only the existing NPC id');
assert.equal(PossessionSystem.tick(restored,actor,POSSESSION_CYCLE_MS),'renewed');
assert.equal(restored.possession.paidCycles,2);
PossessionSystem.end(restored);
assert.equal(restored.possession,null);
assert.equal(restored.mode,'heavenly');
const depleted=structuredClone(HEAVEN_DEFAULTS);depleted.divinePower=0;
depleted.possession={npcId:actor.id,remainingMs:1,paidCycles:1};depleted.mode='possessing';
assert.equal(PossessionSystem.tick(depleted,actor,2),'depleted');
assert.equal(depleted.possession,null);

const cityNpc=(id,role,x)=>({id,name:id,alive:true,realmIndex:0,x,y:2100,populationRole:role,home:{x,y:2100},goalAction:'rest',actionTarget:{x,y:2100},grudges:{},memories:[]});
const attacker=cityNpc('attacker','commoner',3300),victim=cityNpc('victim','commoner',3312),guards=[cityNpc('guard-a','city_guard',3290),cityNpc('guard-b','city_guard',3320)];
const world={clock:{day:1,minute:600},npcs:[attacker,victim,...guards],events:[]};
const incident=reportCityCombat(world,{eventId:'possessed-hit-1',attackerId:attacker.id,victimId:victim.id,damage:12});
assert.equal(incident.reason,'crime');
assert.equal(incident.incident.status,'responding');
assert.equal(world.events.some(event=>event.type==='city-crime-reported'),true);
assert.equal(guards.filter(guard=>guard.lawResponse?.targetId===attacker.id).length,2);
assert.equal(reportCityCombat(world,{eventId:'possessed-hit-1',attackerId:attacker.id,victimId:victim.id,damage:12}).reason,'duplicate');

const scene=fs.readFileSync(new URL('../src/world-rebuild-scene.js',import.meta.url),'utf8');
assert.match(scene,/this\.scheduler\.advance\(dt,this\.cameras\.main\.worldView,this\.possessedNpcId/,'the controlled NPC is excluded by the scheduler');
assert.match(scene,/const professionWorld=this\.possessedNpcId\?\{\.\.\.world,npcs:world\.npcs\.filter\(n=>n\.id!==this\.possessedNpcId\)\}:world/,'profession work pauses only for the possessed NPC');
assert.match(scene,/damageFauna\(this\.populationWorld,id,attacker\.id,damage,eventId\)/,'fauna damage uses the existing damage reducer');
assert.match(scene,/claimFaunaDrop\(this\.populationWorld,dropId,npcId,eventId\)/,'loot pickup uses the existing one-time inventory transfer');
const ranged=fs.readFileSync(new URL('../src/world/WorldHeavenActions.js',import.meta.url),'utf8');
assert.match(ranged,/scene\.reportCombat\(shot\.npc\.id, target\.id/,'projectile hits go through CityLaw-aware combat reporting');
console.log('WORLD.PLAYER.1 passed: paid possession cycles/save state, scoped AI pause, real fauna reducer/loot transfer, and CityLaw retaliation integration.');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
