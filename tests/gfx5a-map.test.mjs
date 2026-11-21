import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {build} from 'esbuild';
const map=JSON.parse(fs.readFileSync('maps/thanh_van_world.tmj','utf8')),layer=name=>map.layers.find(x=>x.name===name);
const before=JSON.parse(fs.readFileSync('art/source/gfx3c/backups/thanh_van_world.before-gfx3c.tmj','utf8')),old=name=>before.layers.find(x=>x.name===name);
assert.deepEqual(layer('ActivitySites').objects.filter(o=>o.name!=='commission-board'),old('ActivitySites').objects);
assert.deepEqual(layer('Spawns').objects,old('Spawns').objects);
for(const baseline of old('Collision').objects)assert.deepEqual(layer('Collision').objects.find(o=>o.id===baseline.id),baseline,`pre-existing collision ${baseline.id} remains unchanged`);
assert.ok(layer('Collision').objects.some(o=>o.name==='commission_hall_base'),'the WORLD.1A board collision remains present');
const detail=layer('Details').data,paths=layer('Paths').data,ground=layer('Ground').data;
assert.ok(detail.some(g=>g>=81&&g<=128),'the added detail atlas is used by the Tiled map');assert.ok(detail.every((g,i)=>g<81||g>128||!paths[i]),'new ground decoration must not be painted on paved path cells');
assert.ok(ground.every(g=>g>=0&&g<=128)&&detail.every(g=>g>=0&&g<=128));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thanh-van-gfx5a-nav-'));
try{
 await build({entryPoints:['src/dao/GridNavigator.ts'],outfile:path.join(temp,'nav.cjs'),bundle:true,platform:'node',format:'cjs',target:'node20',logLevel:'silent'});
 const {GridNavigator}=createRequire(import.meta.url)(path.join(temp,'nav.cjs'));
 const nav=new GridNavigator(map.width*map.tilewidth,map.height*map.tileheight,layer('Collision').objects.map(o=>({x:o.x??0,y:o.y??0,width:o.width??0,height:o.height??0})));
 const points=(layer('ActivitySites').objects.filter(o=>o.x>=2304&&o.x<=3712&&o.y>=64&&o.y<=1536));for(const point of points)assert.ok(nav.path({x:2370,y:836},{x:point.x,y:point.y}).length>0,`NPC navigation remains possible to ${point.name}`);
 console.log('GFX.5A map tests passed: Tiled detail variants, unchanged activity/spawn points, preserved collision count and city path reachability.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
