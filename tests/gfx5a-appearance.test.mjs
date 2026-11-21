import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thanh-van-gfx5a-'));
try{
 await build({entryPoints:{Appearance:'src/dao/CharacterAppearance.ts',Autonomous:'src/dao/AutonomousNPCSystem.ts'},outdir:temp,bundle:true,platform:'node',format:'cjs',target:'node20',outExtension:{'.js':'.cjs'},logLevel:'silent'});
 const req=createRequire(import.meta.url),{ensureNPCVisualStyles,NPC_STYLE_TEXTURES}=req(path.join(temp,'Appearance.cjs')),{createInitialNPCs}=req(path.join(temp,'Autonomous.cjs'));
 const npcs=createInitialNPCs(),gameplay=npcs.map(n=>JSON.stringify({...n,visualStyleId:undefined}));assert.equal(ensureNPCVisualStyles(npcs),true);
 const styles=npcs.map(n=>n.visualStyleId).filter(Boolean);assert.ok(new Set(styles).size>=20,`expected 20+ distinct NPC looks, got ${new Set(styles).size}`);
 assert.equal(ensureNPCVisualStyles(npcs),false,'saved style IDs remain stable after a reload pass');assert.deepEqual(npcs.map(n=>JSON.stringify({...n,visualStyleId:undefined})),gameplay,'visual assignment does not modify gameplay fields');
 for(const texture of NPC_STYLE_TEXTURES){const file=`public/assets/characters/${texture}.png`;assert.ok(fs.existsSync(file),`missing generated texture ${texture}`);const png=fs.readFileSync(file);assert.equal(png.readUInt32BE(16),256);assert.equal(png.readUInt32BE(20),1440);}
 const manifest=JSON.parse(fs.readFileSync('public/assets/characters/npc_styles.json','utf8'));assert.ok(Object.values(manifest).flat().length>=20);
 console.log(`GFX.5A appearance tests passed: ${new Set(styles).size} deterministic NPC looks, unchanged gameplay data and ${NPC_STYLE_TEXTURES.length} complete animation sheets.`);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
