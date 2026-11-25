import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {caveRoute,caveDistance,caveOpen,createCave,syncCaveStock} from '../src/world/UndergroundMaps.js';
const keys=new Set();
for(let grade=1;grade<=4;grade++)for(let index=0;index<12;index++){
  const site={id:grade+'-'+index,grade,max:grade*3+2,kind:'spirit'};
  const cave=createCave(site);
  assert.deepEqual(cave,createCave(site));
  assert.equal(cave.floors.length,grade);
  keys.add(JSON.stringify(cave.floors.map(f=>f.rows)));
  for(const [level,floor] of cave.floors.entries()){
    assert.equal(floor.width,[96,128,192,256][grade-1]);
    assert.ok(floor.rooms.length>=10);
    for(const point of [...cave.nodes.filter(n=>n.level===level),floor.down,floor.lair,floor.treasure,...floor.props,...floor.flora].filter(Boolean)){
      const route=caveRoute(floor,floor.entry,point);
      assert.ok(route,JSON.stringify({grade,index,level,point}));
      assert.ok(route.every((p,i)=>caveOpen(floor,p.x,p.y)&&caveDistance(i?route[i-1]:floor.entry,p)===1));
      assert.deepEqual(route.at(-1)??floor.entry,{x:point.x,y:point.y});
    }
  }
  const stock={};
  for(const amount of [site.max,3,0,1,site.max-1]){
    syncCaveStock(cave.nodes,stock,amount);
    assert.equal(cave.nodes.reduce((sum,n)=>sum+(stock[n.id]??0),0),amount);
    assert.ok(cave.nodes.every(n=>(stock[n.id]??0)<=n.capacity));
  }
}
assert.ok(keys.size>35);
const iron=createCave({id:'iron-test',grade:1,max:5,kind:'iron'});
assert.equal(iron.floors[0].width,64);
assert.equal(iron.floors.length,1);
assert.equal(iron.nodes.reduce((n,p)=>n+p.capacity,0),5);
const world=JSON.parse(readFileSync('maps/world-rebuild-1b.tmj'));
const veins=world.layers.find(layer=>layer.name==='SpiritVeins').objects;
const prop=(o,key)=>o.properties.find(p=>p.name===key)?.value;
assert.equal(veins.length,10);
const sites=veins.map(o=>createCave({id:prop(o,'veinId'),grade:prop(o,'grade'),max:prop(o,'capacity'),kind:'spirit'}));
const floors=sites.flatMap(site=>site.floors);
assert.equal(new Set(floors.flatMap(floor=>floor.lair?[floor.lair.species]:[])).size,6);
assert.equal(new Set(floors.flatMap(floor=>floor.treasure?[floor.treasure.type]:[])).size,7);
for(const [i,a] of veins.entries())for(const b of veins.slice(i+1))assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=168);
console.log('Địa Mạch · 48 seeds, reachable floors, conserved stock, all species and treasures, and separated Tiled entrances');
