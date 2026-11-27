import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

function copyRuntimeWorldMap(){return{name:'copy-runtime-world-map',writeBundle(output){const targetDir=path.resolve(output.dir,'maps');fs.mkdirSync(targetDir,{recursive:true});fs.copyFileSync(fileURLToPath(new URL('./maps/world-rebuild-1b.tmj',import.meta.url)),path.join(targetDir,'world-rebuild-1b.tmj'));}}}

export default defineConfig({
  server:{watch:{ignored:['**/.headless-profile*','**/.headless-profile*/**']}},
  plugins:[copyRuntimeWorldMap()],
  build:{rollupOptions:{input:{
    npcXianxiaEditor:fileURLToPath(new URL('./npc-xianxia-editor.html',import.meta.url)),
    npcXianxiaGallery:fileURLToPath(new URL('./npc-xianxia-gallery.html',import.meta.url)),
    monsterMovement:fileURLToPath(new URL('./monster-movement.html',import.meta.url)),
    shanhePreview:fileURLToPath(new URL('./shanhe-preview.html',import.meta.url)),
    eastArtGallery:fileURLToPath(new URL('./east-art-gallery.html',import.meta.url)),
    monsterGallery:fileURLToPath(new URL('./monster-gallery.html',import.meta.url)),
    combatBalance:fileURLToPath(new URL('./combat-balance.html',import.meta.url)),
    main:fileURLToPath(new URL('./index.html',import.meta.url)),
    characterShowcase:fileURLToPath(new URL('./gfx5b4b-showcase.html',import.meta.url)),
    characterStudy:fileURLToPath(new URL('./gfx5b4c-a2-study.html',import.meta.url)),
    characterComparison:fileURLToPath(new URL('./gfx5b4c-a3-comparison.html',import.meta.url)),
    characterLabA4:fileURLToPath(new URL('./gfx5b4c-a4-lab.html',import.meta.url)),
    characterShowcaseA6:fileURLToPath(new URL('./gfx5b4c-a6-showcase.html',import.meta.url)),
    characterShowcaseA61:fileURLToPath(new URL('./gfx5b4c-a61-showcase.html',import.meta.url)),
    characterShowcaseA62:fileURLToPath(new URL('./gfx5b4c-a62-showcase.html',import.meta.url)),
    characterShowcaseA63:fileURLToPath(new URL('./gfx5b4c-a63-showcase.html',import.meta.url)),
    npcPaperdollShowcase:fileURLToPath(new URL('./npc-paperdoll-showcase.html',import.meta.url)),
    npcPaperdollPresets:fileURLToPath(new URL('./npc-paperdoll-presets.html',import.meta.url)),
    gfx5b5City:fileURLToPath(new URL('./gfx5b5-city-preview.html',import.meta.url)),
    gfx5b5Wilderness:fileURLToPath(new URL('./gfx5b5-wilderness-preview.html',import.meta.url)),
    gfx5b5Sect:fileURLToPath(new URL('./gfx5b5-sect-preview.html',import.meta.url)),
    gfx5b5Water:fileURLToPath(new URL('./gfx5b5-water-preview.html',import.meta.url)),
    gfx5b5TreeWind:fileURLToPath(new URL('./gfx5b5-tree-wind-showcase.html',import.meta.url)),
    gfx5b5Fish:fileURLToPath(new URL('./gfx5b5-fish-preview.html',import.meta.url)),
  }}},
});
