import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {migrateSectCampus} from '../src/world/SectCampusMigration.js';

const raw = JSON.parse(readFileSync(new URL('../maps/world-rebuild-1b.tmj', import.meta.url)));
const property = (o,name) => o.properties?.find(p=>p.name===name)?.value;
const west = property(raw,'westOffsetX');
const layers = new Map(raw.layers.map(l=>[l.name,l.objects?{...l,objects:l.objects.map(o=>({...o,x:o.x-west}))}:l]));
const map = {...raw,getObjectLayer:name=>layers.get(name)};
const region = id => layers.get('RegionMarkers').objects.find(o=>property(o,'regionId')===id);
const station = id => layers.get('SectCampusStations').objects.find(o=>property(o,'station')===id);
const jade = layers.get('SpiritVeins').objects.find(o=>property(o,'veinId')==='sect-jade');
const original = o => ({x:property(o,'priorX')-west,y:property(o,'priorY')});
const point = ({x,y}) => ({x,y});
const forge = station('forge'), counter = station('counter'), herb = station('plot-0');
const oldForge = original(forge), oldJade = original(jade);

assert.equal(raw.height,314);
assert.ok(raw.layers.filter(l=>l.data).every(l=>l.data.length===raw.width*raw.height));
assert.ok(region('sect').width>=region('sect').height);
assert.ok(region('sect').width/region('sect').height<1.4);
assert.equal(layers.get('SectPlanRoutes').objects.length,8);
assert.equal(layers.get('RegionMarkers').objects.filter(o=>property(o,'regionId')?.startsWith('sect-')).length,14);
assert.deepEqual(point(station('gate')),{x:3552,y:5319});
assert.equal(property(jade,'owner'),'qingyun-sect');
assert.equal(property(jade,'capacity'),92);
assert.equal(layers.get('SocietyStations').objects.filter(o=>property(o,'site')==='farm').length,8);
assert.equal(layers.get('SocietyStations').objects.filter(o=>property(o,'site')==='mine').length,6);
const courts=layers.get('SectCourtyards').objects;
const gap = (a,b) => Math.hypot(Math.max(0,a.x-b.x-b.width,b.x-a.x-a.width),
  Math.max(0,a.y-b.y-b.height,b.y-a.y-a.height));
assert.equal(courts.length,7);
for(const [i,a] of courts.entries()){
  const main=property(a,'buildingId')==='sect-campus-leader';
  for(const b of courts.slice(i+1)){
    const width=Math.max(property(a,'roofW'),property(b,'roofW'));
    const ratio=main||property(b,'buildingId')==='sect-campus-leader'?1:1.2;
    assert.ok(gap(a,b)>=width*ratio, a.name+' / '+b.name+' '+gap(a,b));
  }
}
for(const [group,count] of [['lesson',18],['reading',18],['training',16],['queue',12]]){
  const seats=layers.get('SectCampusStations').objects.filter(o=>new RegExp('^'+group+'-\\d+$').test(property(o,'station')));
  assert.equal(seats.length,count);
  for(const [i,a] of seats.entries())assert.ok(seats.slice(i+1).every(b=>Math.hypot(a.x-b.x,a.y-b.y)>=24));
}

const world={
  population:{},
  npcs:[
    {id:'a',...oldJade,home:original(station('home-0')),underground:{siteId:'sect-jade',floor:1,x:14,y:18},
      inventory:[{itemId:'wood',count:2}],relationships:{b:19}},
    {id:'b',x:1824,y:960,decisionSlot:'commission:repair-1',assignedCommissionId:'repair-1',actionTarget:{...oldForge}},
  ],
  environment:{
    objects:[{id:'sect-campus-forge',...oldForge,hp:73,hitbox:{x:oldForge.x-32,y:oldForge.y-32},repairSite:{...oldForge}}],
    resourceNodes:[{id:'sect-plot-0',...original(herb),amount:2,reservedBy:'a'}],
  },
  commissions:[{commissionId:'repair-1',targetId:'sect-campus-forge',target:{...oldForge},status:'in_progress',progress:13}],
  expeditions:{parties:[{phase:'field',members:['a','b'],job:{meet:original(counter),desk:original(counter),field:{...oldJade}}}]},
  civic:{cases:{surface:{siteId:'sect-jade',floor:null,point:{...oldJade}},under:{siteId:'sect-jade',floor:1,point:{x:14,y:18}}},
    contracts:{keep:{siteId:'sect-jade',escrow:18}}},
};
assert.equal(migrateSectCampus(world,map,west),true);
assert.deepEqual(point(world.npcs[0]),point(jade));
assert.deepEqual(world.npcs[0].underground,{siteId:'sect-jade',floor:1,x:14,y:18});
assert.deepEqual(world.npcs[0].inventory,[{itemId:'wood',count:2}]);
assert.deepEqual(world.npcs[0].relationships,{b:19});
assert.deepEqual(world.npcs[0].home,point(station('home-0')));
assert.deepEqual(world.npcs[1].actionTarget,point(forge));
assert.deepEqual(point(world.npcs[1]),{x:1824,y:960});
assert.deepEqual(world.environment.objects[0].repairSite,point(forge));
assert.equal(world.environment.objects[0].hp,73);
assert.equal(world.environment.resourceNodes[0].amount,2);
assert.deepEqual(point(world.environment.resourceNodes[0]),point(herb));
assert.deepEqual(world.commissions[0].target,point(forge));
assert.equal(world.commissions[0].progress,13);
assert.deepEqual(world.expeditions.parties[0].job.meet,point(counter));
assert.deepEqual(world.expeditions.parties[0].job.field,point(jade));
assert.deepEqual(world.civic.cases.surface.point,point(jade));
assert.deepEqual(world.civic.cases.under.point,{x:14,y:18});
assert.equal(world.civic.contracts.keep.escrow,18);
const saved=JSON.stringify(world);
assert.equal(migrateSectCampus(world,map,west),false);
assert.equal(JSON.stringify(world),saved);

const v1 = o => ({x:property(o,'v1X')-west,y:property(o,'v1Y')});
const priorLeader=v1(station('leader')), priorCounter=v1(counter);
const v1Save={
  population:{sectLayoutVersion:1},
  npcs:[{id:'c',x:priorLeader.x,y:priorLeader.y,actionTarget:{...priorLeader}},
    {id:'d',...v1(jade),underground:{siteId:'sect-jade',floor:0,x:4,y:8}}],
  environment:{objects:[{id:'sect-campus-leader',...priorLeader,hp:111,repairSite:{...priorLeader}}]},
  expeditions:{parties:[{job:{meet:priorCounter,desk:{...priorCounter},field:v1(jade)},
    phase:'assemble', spots:{c:{x:priorCounter.x+25,y:priorCounter.y}},escrow:19}]},
};
assert.equal(migrateSectCampus(v1Save,map,west),true);
assert.deepEqual(point(v1Save.npcs[0]),priorLeader);
assert.deepEqual(v1Save.npcs[0].actionTarget,point(station('leader')));
assert.deepEqual(v1Save.npcs[1].underground,{siteId:'sect-jade',floor:0,x:4,y:8});
assert.deepEqual(point(v1Save.npcs[1]),point(jade));
assert.equal(v1Save.environment.objects[0].hp,111);
assert.deepEqual(v1Save.environment.objects[0].repairSite,point(station('leader')));
assert.deepEqual(v1Save.expeditions.parties[0].spots.c,{x:counter.x+25,y:counter.y});
assert.equal(v1Save.expeditions.parties[0].escrow,19);

const v2 = o => ({x:property(o,'v2X')-west,y:property(o,'v2Y')});
const oldDesk=v2(counter), oldJadeV2=v2(jade);
const v2Save={
  population:{sectLayoutVersion:2},
  npcs:[
    {id:'miner',...oldJadeV2,underground:{siteId:'sect-jade',floor:0,x:6,y:8},inventory:[{itemId:'iron_ore',count:3}]},
    {id:'worker',x:3400,y:8999,workPosition:oldDesk},
  ],
  civic:{contracts:{open:{siteId:'sect-jade',escrow:13,receipt:{x:3010,y:1640}}}},
};
assert.equal(migrateSectCampus(v2Save,map,west),true);
assert.deepEqual(point(v2Save.npcs[0]),point(jade));
assert.deepEqual(v2Save.npcs[0].underground,{siteId:'sect-jade',floor:0,x:6,y:8});
assert.deepEqual(v2Save.npcs[0].inventory,[{itemId:'iron_ore',count:3}]);
assert.ok(v2Save.npcs[1].y<8544);
assert.deepEqual(v2Save.npcs[1].workPosition,point(counter));
assert.deepEqual(v2Save.civic.contracts.open,{siteId:'sect-jade',escrow:13,receipt:{x:3010,y:1640}});
console.log('Thanh Vân Tông: map, authored districts, stable resource IDs and one-time surface save migration passed.');
