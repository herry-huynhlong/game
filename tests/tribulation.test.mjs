import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const bundled=await build({stdin:{contents:`
  export * from './src/dao/TribulationSystem.ts';
  export { createPopulationNPC, AutonomousNPCSystem } from './src/dao/AutonomousNPCSystem.ts';
  export { cultivationStats } from './src/systems/CultivationSystem.ts';
  export { cultivationRequired } from './src/systems/RealmConfig.ts';
  export { ITEM_CATALOG, itemIcon } from './src/dao/ItemCatalog.ts';
  export { meetsFlightRealm } from './src/world/FlyingSword.js';
  export * from './src/world/TribulationVisualTimeline.js';
  export * from './src/world/SkyStep.js';
  export * from './src/world/TravelMotion.js';
`,resolveDir:process.cwd()},bundle:true,write:false,format:'esm',platform:'node'});
const {TRIBULATIONS,beginTribulation,planTribulation,stepTribulation,tribulationLocked,createPopulationNPC,
  AutonomousNPCSystem,cultivationStats,cultivationRequired,ITEM_CATALOG,itemIcon,meetsFlightRealm,
  boltShape,phaseOf,previewTrial,durationFor,tribulationChance,SKY_STEP,SkyStepController,meetsSkyStepRealm,
  newTravelWatch,observeTravel}=await import(
  'data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));

const art=PNG.sync.read(readFileSync('public/assets/items/inventory-icons.png'));
assert.equal(art.width,256);
const unique=new Set();
for(const item of Object.values(ITEM_CATALOG)){
  const [x,y]=item.icon;
  assert.notDeepEqual([x,y],itemIcon('legacy-missing-item'));
  assert.ok(x>=0&&y>=0&&x+32<=art.width&&y+32<=art.height);
  const pixels=[];
  for(let row=y;row<y+32;row++)pixels.push(art.data.subarray((row*art.width+x)*4,(row*art.width+x+32)*4));
  const rgba=Buffer.concat(pixels);
  assert.ok(rgba.some((v,i)=>i%4===3&&v===0));
  assert.ok(rgba.some((v,i)=>i%4===3&&v===255));
  unique.add(rgba.toString('base64'));
}
assert.equal(unique.size,Object.keys(ITEM_CATALOG).length);

function fixture(seed,realm=0,level=10){
  const n=createPopulationNPC('low_disciple','seeded-disciple','roster',0,new Set());
  Object.assign(n,{x:321,y:400,realmIndex:realm,realmLevel:level,
    xp:cultivationRequired(realm,level),talent:55,fatigue:0,actionCooldown:0,
    inventory:[{itemId:'qi_pill',count:1},{itemId:'wood',count:2}]});
  const stats=cultivationStats(n);
  n.hp=stats.hpMax;n.mp=stats.mpMax;
  const world={worldId:seed,clock:{day:1,minute:600},events:[]};
  return {n,world,site:{x:321,y:400,name:'Sân tông môn'}};
}
function tick(world,n){
  world.clock.day=Math.floor(n.tribulation.nextAt/1440);
  world.clock.minute=n.tribulation.nextAt%1440;
  assert.equal(stepTribulation(world,n),true);
}
function run(seed,realm=0,lowHp=false){
  let {world,n,site}=fixture(seed,realm);
  const before=n.hp;
  if(lowHp)n.hp=Math.ceil(n.hp*.51);
  assert.equal(planTribulation(world,n,site),true);
  n.x-=30;
  assert.equal(beginTribulation(world,n),false);
  assert.equal(n.inventory[0].itemId,'qi_pill');
  n.x+=30;
  assert.equal(beginTribulation(world,n),true);
  assert.equal(beginTribulation(world,n),false);
  assert.equal(n.inventory.some(item=>item.itemId==='qi_pill'),false);
  assert.equal(tribulationLocked(n),true);
  assert.equal(n.realmIndex,realm);
  assert.equal(stepTribulation(world,n),false);
  const roll=n.tribulation.roll;
  ({world,n}=JSON.parse(JSON.stringify({world,n})));
  assert.equal(n.tribulation.roll,roll);
  tick(world,n);
  assert.equal(n.tribulation.phase,'warning');
  const old=n.hp;
  tick(world,n);
  const damage=old-n.hp,firstHit=n.tribulation.strikes;
  assert.equal(stepTribulation(world,n),false);
  assert.equal(n.tribulation.strikes,firstHit);
  while(tribulationLocked(n))tick(world,n);
  const status=n.tribulation.phase,strikes=n.tribulation.strikes,result=n.realmIndex;
  assert.equal(n.tribulation.strikes,lowHp&&!n.alive?n.tribulation.strikes:TRIBULATIONS[realm].waves);
  assert.equal(world.events.length,2);
  assert.equal(n.inventory.find(item=>item.itemId==='wood').count,2);
  tick(world,n);
  assert.equal(n.tribulation,undefined);
  return {status,strikes,damage,before,result,alive:n.alive,fly:meetsFlightRealm(n),xp:n.xp,cooldown:n.actionCooldown};
}
const outcomes=Array.from({length:40},(_,i)=>run('fixture-'+i));
assert.ok(outcomes.some(n=>n.status==='success'&&n.result===1&&n.fly&&n.xp===0));
assert.ok(outcomes.some(n=>n.status==='failure'&&n.result===0&&!n.fly&&n.cooldown===240&&n.xp>0));
const low=run('late',3,true);
assert.equal(low.alive,false);
assert.equal(low.result,3);
const higher=run('higher',2);
assert.ok(higher.damage>outcomes[0].damage&&higher.strikes>outcomes[0].strikes);
const {n,world}=fixture('minor',0,8);
Object.assign(n,{action:'cultivate',goalAction:'cultivate',actionProgress:59,hunger:0});
const model=new AutonomousNPCSystem([n],()=>{});
model.meditateAtRest(n,world.clock.day,world.clock.minute);
assert.equal(n.realmLevel,9);
assert.equal(n.tribulation,undefined);
assert.equal(n.inventory.some(item=>item.itemId==='qi_pill'),true);
const noPill=fixture('no-pill',0,4).n;
noPill.inventory=[];
noPill.xp+=cultivationRequired(0,5)+7;
model.tickNpc(noPill,1,1,600,0);
assert.equal(noPill.realmLevel,6);
assert.equal(noPill.xp,7);
assert.equal(noPill.realmIndex,0);
assert.equal(noPill.tribulation,undefined);
const boundary=fixture('boundary').n;
boundary.inventory=[];
model.tickNpc(boundary,1,1,600,0);
assert.equal(boundary.realmIndex,0);
const maxRealm=fixture('final-realm',8,9).n;
Object.assign(maxRealm,{action:'cultivate',goalAction:'cultivate',actionProgress:59,hunger:0});
model.meditateAtRest(maxRealm,1,600);
assert.equal(maxRealm.realmLevel,10);
assert.equal(maxRealm.tribulation,undefined);
const anchor={x:1600,y:2400};
for(const [realm,{cloud,warning,waves,interval}] of TRIBULATIONS.entries()){
  const first=cloud+warning,end=first+waves*interval;
  const lead=previewTrial('vfx',realm,anchor,first-.08,'success');
  assert.deepEqual(lead.anchor,anchor);
  assert.equal(lead.t.strikes,0);
  assert.ok(phaseOf(lead.t,lead.clock).leader>.4);
  for(let wave=1;wave<=waves;wave++){
    const hit=previewTrial('vfx',realm,anchor,first+(wave-1)*interval+.06,'success');
    assert.equal(hit.t.strikes,wave);
    assert.ok(hit.strikeAge>=50&&hit.strikeAge<=70);
    const shape=()=>boltShape(hit.t.id,wave,anchor.x,anchor.y-170,anchor.y,realm);
    assert.deepEqual(shape(),shape());
    assert.deepEqual(shape().points.at(-1),anchor);
    assert.ok(shape().branches.length>=6);
  }
  assert.equal(durationFor(realm),end+3);
  assert.equal(previewTrial('vfx',realm,anchor,end+.5,'success').t.phase,'success');
  assert.equal(previewTrial('vfx',realm,anchor,end+.5,'failure').t.phase,'failure');
}
const rates=TRIBULATIONS.map((_,realm)=>{
  let won=0,totalChance=0;
  const trials=4200;
  for(let i=0;i<trials;i++){
    const {n,world,site}=fixture('risk-v1:'+i,realm);
    n.talent=78;n.fatigue=10;n.techniqueMastery[n.technique]=4;
    const stats=cultivationStats(n);
    n.hp=stats.hpMax;n.mp=stats.mpMax*.85;
    assert.equal(planTribulation(world,n,site),true);
    const chance=tribulationChance(n,realm);
    assert.equal(beginTribulation(world,n),true);
    totalChance+=chance;
    assert.equal(n.tribulation.chance,chance);
    while(tribulationLocked(n))tick(world,n);
    if(n.tribulation.phase==='success')won++;
    else if(n.alive){assert.ok(n.actionCooldown>0&&n.xp<cultivationRequired(realm,10));assert.equal(planTribulation(world,n,site),false);}
  }
  const expected=totalChance/trials;
  assert.ok(Math.abs(won/trials-expected)<.025,JSON.stringify({realm,won,trials,expected}));
  return {realm,trials,expected,actual:won/trials};
});
const events=[];
const port={landOpen:(_n,p)=>p.x!==900,airLine:(_a,b)=>b.y!==40,connected:(_a,b)=>b.x<1600,
  changed:(_n,phase)=>events.push(phase)};
const sky=new SkyStepController(port),target={x:900,y:400};
const flyer=fixture('sky',2,1).n;
Object.assign(flyer,{x:120,y:400,actionTarget:target,goalAction:'work',mp:160});
const baseMp=flyer.mp;
assert.equal(meetsSkyStepRealm(flyer),true);
for(const realmIndex of [0,1])assert.equal(sky.start({...flyer,realmIndex},target).reason,'realm');
assert.equal(sky.start(flyer,{x:880,y:40}).reason,'zone');
assert.equal(sky.start(flyer,{x:1800,y:400}).reason,'range');
const jump=sky.start(flyer,target);
assert.ok(jump.ok&&jump.landing.x!==900);
assert.equal(flyer.mp,baseMp-SKY_STEP.mp);
sky.advance([flyer],SKY_STEP.phases.cast+SKY_STEP.phases.vanish);
assert.equal(flyer.skyStep.phase,'travel');
assert.equal(flyer.x,120);
const resumed=JSON.parse(JSON.stringify(flyer)),restore=new SkyStepController(port);
restore.restore([resumed]);restore.advance([resumed],1100);
assert.deepEqual(events,['cast','vanish','travel','arrive','recover','end']);
assert.deepEqual({x:resumed.x,y:resumed.y},jump.landing);
assert.equal(resumed.mp,baseMp-SKY_STEP.mp);
assert.deepEqual(resumed.actionTarget,target);
assert.equal(restore.start(resumed,{x:1320,y:400},{manual:true}).reason,'cooldown');
const watch=newTravelWatch({x:0,y:0},{x:100,y:0},0);
for(let time=50;time<4000;time+=50)observeTravel(watch,{x:0,y:time%100?10:-10},time);
assert.equal(watch.since,0);
observeTravel(watch,{x:35,y:0},5000);
assert.equal(watch.since,5000);
console.log(JSON.stringify({rates,icons:unique.size,success:outcomes.filter(n=>n.status==='success').length,
  failure:outcomes.filter(n=>n.status==='failure').length,minor:n.realmLevel,firstStrike:outcomes[0].damage,
  advancedStrike:higher.damage,advancedWaves:higher.strikes,severe:{alive:low.alive,strikes:low.strikes}}));
