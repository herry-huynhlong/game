import assert from 'node:assert/strict';
import { GroundOccupancy, groundFootprint } from '../src/world/GroundOccupancy.js';
import { PassageTraffic } from '../src/world/PassageTraffic.js';
import { WorkstationSlots } from '../src/world/WorkstationSlots.js';

const make=(id,x,y,species)=>({id,x,y,species,alive:true,goalAction:'farm'});
const ground=(x,y,hw,hh)=>x-hw>=0&&x+hw<=500&&y-hh>=0&&y+hh<=280;
for(const speed of [1,2,4]){
  const npcs=Array.from({length:20},(_,i)=>i<10?make('west'+i,25+i*24,124):make('east'+i,475-(i-10)*24,142));
  const grid=new GroundOccupancy(ground);
  grid.sync(npcs,[]);
  for(let t=0;t<630;t+=speed){
    for(const npc of npcs){
      const target=npc.id.startsWith('west')?450:50;
      const body=grid.bodies.get(npc.id);
      const dx=Math.sign(target-body.x)*Math.min(Math.abs(target-body.x),speed*1.1);
      if(dx)grid.advance(body,body.x+dx,body.y);
      assert.ok(ground(body.x,body.y,body.width/2,body.height/2));
    }
    assert.equal(grid.overlaps().length,0);
  }
  assert.ok(grid.bodies.get('west9').x>390&&grid.bodies.get('east19').x<110,'traffic in opposing directions advances');

  const hunters=[make('hunter',250,100),make('helper',218,58),make('third',282,58)];
  const beasts=['deer','scorpion','snake'].map((species,i)=>make(species,205+i*48,160,species));
  grid.sync(hunters,beasts);
  for(let t=0;t<180;t+=speed){
    for(const actor of [...hunters,...beasts]){
      const body=grid.bodies.get(actor.id),target=actor.species?hunters[0]:beasts[0];
      const a=Math.atan2(target.y-body.y,target.x-body.x);
      grid.advance(body,body.x+Math.cos(a)*speed,body.y+Math.sin(a)*speed);
    }
    assert.equal(grid.overlaps().length,0,'combat spacing prevents physical overlap');
  }
  const wall=new GroundOccupancy((x,y,w,h)=>ground(x,y,w,h)&&(x+w<240||x-w>244||y+h<120||y-h>160));
  const npc=make('runner',224,140);
  wall.sync([npc],[]);
  wall.advance(wall.bodies.get(npc.id),280,140,false);
  assert.ok(wall.bodies.get(npc.id).x<232,'sweep cannot tunnel through a wall');
  wall.advance(wall.bodies.get(npc.id),200,140);
  assert.ok(wall.bodies.get(npc.id).x<212,'runner can turn and leave the dead end');
  const same=[make('a',110,55),make('b',110,55)];
  wall.sync(same,[]);
  for(let i=0;i<8;i++)wall.recover();
  assert.deepEqual(wall.overlaps(),[]);
}
const gate=new PassageTraffic([{id:'gate-test',a:{x:206,y:140},b:{x:294,y:140}}]);
const west=make('west',202,140),east=make('east',298,140);
assert.ok(gate.guide(west,{x:420,y:140},0).target);
assert.equal(gate.guide(east,{x:80,y:140},1).wait,true);
west.x=238;
assert.ok(gate.guide(west,{x:420,y:140},50).target);
assert.equal(gate.guide(east,{x:80,y:140},120).wait,true);
west.x=310;
assert.equal(gate.guide(east,{x:80,y:140},2801).wait,undefined);
const station=new WorkstationSlots((npc,x,y)=>ground(x,y,8,4),()=>true);
const farmers=Array.from({length:10},(_,i)=>make('farm'+i,100+i*22,190));
const claims=farmers.map(n=>station.reserve(n,{x:245,y:110}));
assert.equal(claims.filter(Boolean).length,10);
for(const a of claims) for(const b of claims) if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=20);
assert.equal(station.reserve(farmers[0],{x:245,y:110}),claims[0]);
const relocated=station.reserve(farmers[0],{x:245,y:110},true);
assert.notEqual(relocated.slot,claims[0].slot);
assert.equal(station.claims.size,10);

farmers[0].alive=false;
station.prune(farmers,null);
assert.equal(station.claims.size,9);
assert.ok(groundFootprint(make('large',0,0,'deer')).width>groundFootprint(make('human',0,0)).width);
console.log('PASS shared footprint grid, swept collision, 20 opposing actors, crowded combat, legacy overlap recovery, and ten independent stations at x1/x2/x4.');
