import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const root=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'qingyun-modular-appearance-'));
try{
 await build({entryPoints:{Appearance:'src/dao/CharacterAppearance.ts',Autonomous:'src/dao/AutonomousNPCSystem.ts'},outdir:temp,bundle:true,platform:'node',format:'cjs',target:'node20',outExtension:{'.js':'.cjs'},logLevel:'silent'});
 const req=createRequire(import.meta.url),api=req(path.join(temp,'Appearance.cjs')),{createInitialNPCs}=req(path.join(temp,'Autonomous.cjs'));
 const manifest=JSON.parse(fs.readFileSync('public/assets/npc-modular/manifest.json','utf8'));
 assert.equal(manifest.frame.width,32);assert.equal(manifest.frame.height,40);assert.deepEqual(manifest.frame.directions,['down','up','left','right']);
 assert.equal(manifest.parts.hair.length,12);assert.equal(manifest.parts.face.length,10);assert.equal(manifest.parts.outfit.length,18);assert.equal(manifest.parts.accessory.length,10);
 const npcs=createInitialNPCs();for(let i=0;i<108;i++){const base=npcs[i%npcs.length];npcs.push({...structuredClone(base),id:`modular-test-${String(i).padStart(3,'0')}`,visualParts:undefined})}npcs.splice(0,npcs.length-108);
 // Give a representative role mix while keeping all other gameplay fields unchanged.
 const roles=['commoner','low_disciple','elder','sect_leader','merchant','tavern_staff','city_guard','repair_worker','hunter','herb_gatherer','quest_clerk','independent_cultivator'];
 npcs.forEach((n,i)=>{n.id=`modular-test-${String(i).padStart(3,'0')}`;n.populationRole=roles[i%roles.length];n.gender=i%2?'nữ':'nam';n.age=18+(i*17)%70;n.authorityRole=i===0?'city_master':n.populationRole==='sect_leader'?'sect_leader':undefined});
 api.ensureNPCVisualStyles(npcs);
 const gameplay=npcs.map(n=>JSON.stringify({...n,visualParts:undefined}));
 assert.equal(api.ensureNPCModularAppearances(npcs),true);assert.equal(npcs.length,108);assert.ok(npcs.every(n=>n.visualParts?.bodyId===n.visualStyleId));
 assert.equal(new Set(npcs.map(n=>n.visualParts.hairId)).size>=8,true);assert.equal(new Set(npcs.map(n=>n.visualParts.faceId)).size>=8,true);assert.equal(new Set(npcs.map(n=>n.visualParts.outfitId)).size>=12,true);assert.equal(new Set(npcs.map(n=>JSON.stringify(n.visualParts))).size>=90,true);
 assert.ok(npcs.some(n=>!n.visualParts.accessoryIds.length));assert.ok(npcs.some(n=>n.visualParts.accessoryIds.length));
 assert.deepEqual(npcs.map(n=>JSON.stringify({...n,visualParts:undefined})),gameplay,'visual migration must not alter NPC gameplay fields');
 const saved=JSON.stringify(npcs.map(n=>n.visualParts));assert.equal(api.ensureNPCModularAppearances(npcs),false);assert.equal(JSON.stringify(npcs.map(n=>n.visualParts)),saved,'visual IDs remain stable after save/load');
 for(const idList of Object.values(api.NPC_MODULAR_PART_IDS))for(const id of idList)assert.ok(api.resolveNPCModularPart(id),`no sprite-sheet mapping for ${id}`);
 for(const sheet of api.NPC_MODULAR_TEXTURES){const png=fs.readFileSync(`public/assets/npc-modular/${sheet}.png`);assert.equal(png.readUInt32BE(16)%32,0);assert.equal(png.readUInt32BE(20)%40,0);assert.ok(fs.existsSync(`art/source/npc-modular/source/${sheet}.aseprite`),`missing editable source ${sheet}`)}
 console.log('NPC.MODULAR.1 passed: editable Aseprite part sheets, 12 hair/10 face/18 outfit/10 accessory designs, stable 108-NPC visual migration, four directions, and gameplay-field preservation.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
