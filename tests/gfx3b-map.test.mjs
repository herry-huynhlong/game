import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const root = process.cwd();
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const map = readJson('maps/thanh_van_world.tmj');
const before = readJson('art/source/gfx3b/backups/thanh_van_world.before-gfx3b.tmj');
const layer = (m, name) => m.layers.find((entry) => entry.name === name);
assert.equal(map.width, before.width);
assert.equal(map.height, before.height);
assert.equal(map.tilewidth, before.tilewidth);
assert.equal(map.tileheight, before.tileheight);
assert.deepEqual(layer(map, 'ActivitySites').objects.filter((o) => o.name !== 'commission-board'), layer(before, 'ActivitySites').objects, 'existing NPC and economy activity anchors remain unchanged');
const commissionSite = layer(map, 'ActivitySites').objects.find((o) => o.name === 'commission-board');
assert.deepEqual({x:commissionSite?.x,y:commissionSite?.y},{x:3252,y:930},'the new board sits inside the west market district');
assert.deepEqual(layer(map, 'Spawns').objects, layer(before, 'Spawns').objects, 'existing spawn points remain unchanged');
assert.deepEqual(layer(map, 'Zones').objects.filter((o) => o.name !== 'Thanh Vân Thành' && o.name !== 'Phố Tây Thanh Vân'), layer(before, 'Zones').objects.filter((o) => o.name !== 'Thanh Vân Thành'), 'non-city zones stay unchanged');
assert.equal(layer(map, 'Ground').data.length, map.width * map.height);
assert.equal(layer(map, 'Paths').data.length, map.width * map.height);
assert.equal(layer(map, 'Details').data.length, map.width * map.height);
for (const name of ['city_gate','city_wall','market_stall','food_hall','inn','forge','apothecary','city_hall','residential_house','city_tree','pine_tree','ancient_tree','lantern_post','jade_fountain']) {
  assert.ok(fs.existsSync(path.join(root, 'public/assets/props/settlement_buildings.png')));
  const atlas = readJson('public/assets/props/settlement_buildings.json');
  assert.ok(atlas.frames[name], `missing atlas frame ${name}`);
}
const added = layer(map, 'WorldProps').objects.filter((o) => o.name?.startsWith('GFX3B '));
assert.ok(added.length >= 12, 'GFX.3C keeps the wall, trees, and lanterns while removing rough decorative props');
assert.ok(layer(map, 'Collision').objects.some((o) => o.name === 'gfx3b_west_wall'));
assert.equal(layer(map, 'Collision').objects.filter((o) => o.name === 'gfx3b_west_wall').length, 8);
for (const tileLayer of ['Ground','Paths','Details']) {
  assert.ok(layer(map,tileLayer).data.every((gid) => Number.isInteger(gid) && gid >= 0 && gid <= 128), `${tileLayer} uses valid existing tile IDs`);
}
const city = { x: 2304, y: 64, width: 1408, height: 1472 };
const site = (name) => layer(map,'ActivitySites').objects.find((o) => o.name === name);
assert.ok(layer(map,'Paths').data.some((gid) => gid >= 17 && gid <= 32));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'thanh-van-gfx3b-nav-'));
try {
  await build({ entryPoints: ['src/dao/GridNavigator.ts'], outfile: path.join(temp,'nav.cjs'), bundle: true, platform: 'node', format: 'cjs', target: 'node20', logLevel: 'silent' });
  const { GridNavigator } = createRequire(import.meta.url)(path.join(temp,'nav.cjs'));
  const collisions = layer(map,'Collision').objects.map(({x=0,y=0,width=0,height=0})=>({x,y,width,height}));
  const nav = new GridNavigator(map.width*map.tilewidth,map.height*map.tileheight,collisions);
  const gate = site('city-gate');
  assert.ok(nav.path({x:2200,y:830},{x:gate.x,y:gate.y}).length > 0, 'outside can reach the west gate');
  for (const point of layer(map,'ActivitySites').objects.filter((o)=>o.name!=='city-gate'&&o.x>=city.x&&o.x<=city.x+city.width&&o.y>=city.y&&o.y<=city.y+city.height)) {
    assert.ok(nav.path({x:gate.x,y:gate.y},{x:point.x,y:point.y}).length > 0, `${point.name} remains reachable through collision`);
  }
  console.log('GFX.3B map tests passed: dimensions, stable activity/spawn coordinates, asset IDs, city wall collision and path reachability.');
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
