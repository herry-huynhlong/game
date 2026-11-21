import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const root = process.cwd();
const json = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const map = json('maps/thanh_van_world.tmj');
const before = json('art/source/gfx3c/backups/thanh_van_world.before-gfx3c.tmj');
const layer = (m, name) => m.layers.find((entry) => entry.name === name);
assert.equal(map.width, 120);
assert.equal(map.height, 50);
assert.equal(map.tilewidth, before.tilewidth);
assert.equal(map.tileheight, before.tileheight);
assert.deepEqual(layer(map, 'ActivitySites').objects.filter((o) => o.name !== 'commission-board'), layer(before, 'ActivitySites').objects, 'economy and NPC activity sites stay stable');
assert.deepEqual(layer(map, 'Spawns').objects, layer(before, 'Spawns').objects, 'spawns stay stable');
assert.deepEqual(layer(map, 'Zones').objects.filter((o) => o.name !== 'Phố Tây Thanh Vân'), layer(before, 'Zones').objects, 'zone identity and boundaries stay stable');
for (const obstacle of layer(before, 'Collision').objects) {
  assert.deepEqual(layer(map, 'Collision').objects.find((o) => o.id === obstacle.id), obstacle, `existing collision ${obstacle.id} remains intact`);
}
assert.equal(map.nextobjectid > 0, true);

const props = layer(map, 'WorldProps').objects;
const collisions = layer(map, 'Collision').objects;
const carts = props.filter((o) => o.name === 'market_cart' || o.properties?.some((p) => p.name === 'sprite' && p.value === 'market_cart'));
assert.equal(carts.length, 0, 'wheeled carts have been removed from the city world props');
const sprites = props.map((o) => o.properties?.find((p) => p.name === 'sprite')?.value).filter(Boolean);
for (const type of ['herb_stall', 'pill_stall', 'artifact_stall']) assert.ok(sprites.includes(type), `missing fixed market type ${type}`);
const stalls = props.filter((o) => ['herb_stall', 'pill_stall', 'artifact_stall'].includes(o.properties?.find((p) => p.name === 'sprite')?.value));
assert.equal(stalls.length, 4, 'four permanent stalls give the market a clear row layout');
assert.equal(collisions.filter((o) => o.properties?.some((p) => p.name === 'source' && p.value === 'gfx3c')).length, 2, 'new market counters have collision footprints');

const atlas = json('public/assets/props/settlement_buildings.json');
for (const frame of ['city_gate', 'city_wall', 'inn', 'apothecary', 'forge', 'residential_house', 'city_tree', 'pine_tree', 'lantern_post', 'herb_stall', 'pill_stall', 'artifact_stall', 'wall_corner', 'grass_ground', 'stone_paving', 'market_props']) {
  assert.ok(atlas.frames[frame], `missing atlas frame ${frame}`);
}
assert.equal(atlas.frames.market_cart, undefined, 'market-cart sprite is removed from the runtime texture atlas');
assert.deepEqual(atlas.meta.size, { w: 960, h: 1536 });
assert.ok(fs.statSync(path.join(root, 'public/assets/props/settlement_buildings.png')).size > 100_000, 'packed atlas contains the painted frame artwork');
assert.ok(fs.statSync(path.join(root, 'public/assets/tilesets/qingyun_terrain.png')).size > 5_000, 'terrain tileset is present');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'thanh-van-gfx3c-nav-'));
try {
  await build({ entryPoints: ['src/dao/GridNavigator.ts'], outfile: path.join(temp, 'nav.cjs'), bundle: true, platform: 'node', format: 'cjs', target: 'node20', logLevel: 'silent' });
  const { GridNavigator } = createRequire(import.meta.url)(path.join(temp, 'nav.cjs'));
  const nav = new GridNavigator(map.width * map.tilewidth, map.height * map.tileheight, collisions.map(({ x = 0, y = 0, width = 0, height = 0 }) => ({ x, y, width, height })));
  const gate = layer(map, 'ActivitySites').objects.find((o) => o.name === 'city-gate');
  const market = layer(map, 'ActivitySites').objects.find((o) => o.name === 'city-market');
  assert.ok(nav.path({ x: 2200, y: gate.y }, { x: gate.x, y: gate.y }).length > 0, 'gate passage remains reachable from outside');
  assert.ok(nav.path({ x: gate.x, y: gate.y }, { x: market.x, y: market.y }).length > 0, 'market remains reachable through collision');
  for (const point of layer(map, 'ActivitySites').objects.filter((o) => o.name !== 'city-gate' && o.x >= 2304 && o.x <= 3712 && o.y >= 64 && o.y <= 1536)) {
    assert.ok(nav.path({ x: gate.x, y: gate.y }, { x: point.x, y: point.y }).length > 0, `${point.name} remains reachable`);
  }
  console.log('GFX.3C map/art tests passed: no carts, four fixed stalls, preserved activity sites, terrain palette, texture frames and grid navigation.');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
