import assert from 'node:assert/strict';
import {build} from 'esbuild';

const {outputFiles}=await build({
  stdin:{contents:`
    export * from './src/world/PopulationLife.js';
    export {PopulationLivelihoods} from './src/world/PopulationLivelihoods.js';
    export {NpcSimulationScheduler} from './src/world/NpcSimulationScheduler.js';
    export {createPopulationNPC,chooseLivelihoodGoal} from './src/dao/AutonomousNPCSystem.ts';
    export {createShops} from './src/dao/SettlementSystem.ts';
  `,resolveDir:process.cwd()},
  bundle:true,write:false,format:'esm',platform:'node',
});
const {migratePopulation,populationState,formHousehold,haveChild,tickPopulationFamilies,settleDeparture,familyOfOrigin,
  DISTRICTS,VOCATIONS,PopulationLivelihoods,NpcSimulationScheduler,createPopulationNPC,chooseLivelihoodGoal,createShops}=
  await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].text).toString('base64'));

const point=(x,y)=>({x,y});
const world=(size=108)=>{
  const names=new Set();
  const npcs=Array.from({length:size},(_,i)=>{
    const n=createPopulationNPC('commoner','resident-'+i,'test',i+1,names);
    names.add(n.name);return n;
  });
  return {npcs,worldId:'population-tests',clock:{day:1,minute:500},events:[],shops:createShops(),
    economy:{transactions:[]},settlement:{materials:[]},factions:[{id:'qingyun-city',wealth:0,treasury:[]},
      {id:'qingyun-village',wealth:0,treasury:[]},{id:'qingyun-sect',name:'Thanh Vân Tông',memberIds:[]}],
    sects:[{factionId:'qingyun-sect',memberLimit:36,rankByNpc:{}}]};
};
const place=(district,i)=>({home:point(500+i*84,488+DISTRICTS.indexOf(district)*90),work:point(523+i*84,488+DISTRICTS.indexOf(district)*90)});
let w=world();
w.npcs[0].alive=false;
w.npcs[1].inventory=[{itemId:'wood',count:7}];
w.npcs[1].spiritStones=75;
const before=structuredClone(w.npcs);
const newcomers=migratePopulation(w,180,place);
assert.equal(newcomers.length,72);
assert.equal(new Set(w.npcs.map(n=>n.name)).size,180);
assert.equal(new Set(newcomers.map(n=>n.lifeOrigin.district)).size,8);
assert.deepEqual([...new Set(newcomers.map(n=>n.vocation))].sort(),Object.keys(VOCATIONS).sort());
for(let i=0;i<before.length;i++){
  const {personalGoal,...original}=w.npcs[i];
  assert.ok(personalGoal);
  assert.deepEqual(original,before[i]);
}
assert.equal(w.npcs.filter(n=>n.alive).length,179);
w=JSON.parse(JSON.stringify(w));
assert.deepEqual(migratePopulation(w,180,place),[]);
assert.equal(w.npcs[0].alive,false);
assert.equal(w.npcs[1].spiritStones,75);
assert.equal(w.populationLife.counts.immigration,72);
const schedule=new NpcSimulationScheduler(w.npcs.slice(0,108));
schedule.register(w.npcs.at(-1));
schedule.register(w.npcs.at(-1));
assert.equal(schedule.byId.size,109);
schedule.accrueMinute(null);
const due=schedule.advance(5600,{x:0,y:0,right:20,bottom:20},null,new Set()).thinking;
assert.ok(due.some(entry=>entry.npc===w.npcs.at(-1)));
const adult=w.npcs.find(n=>n.vocation==='farmer'&&n.alive);
const label=chooseLivelihoodGoal({...adult,personalGoal:{label:'Canh tác cho gia đình',action:'farm',bonus:120}},'farm',w);
assert.equal(label.action,'farm');
assert.match(label.reason,/mục tiêu/);

const householdWorld=world(3);
const [a,b,other]=householdWorld.npcs;
Object.assign(a,{age:24,gender:'nữ',spiritStones:20,home:point(30,30)});
Object.assign(b,{age:25,gender:'nam',spiritStones:20,home:point(40,35)});
Object.assign(other,{age:28,home:point(41,38)});
a.relationships[b.id]=40;
assert.equal(formHousehold(householdWorld,a,b),null);
b.relationships[a.id]=39;
const household=formHousehold(householdWorld,a,b);
assert.equal(household.fund,8);
assert.equal(a.spiritStones+b.spiritStones+household.fund,40);
assert.deepEqual(a.home,b.home);
assert.equal(haveChild(householdWorld,household,[a,b],{home:point(40,30),work:point(40,30)}),null);
householdWorld.clock.day=60;
const birth=tickPopulationFamilies(householdWorld,()=>({home:point(40,30),work:point(40,30)})).added[0];
assert.equal(birth.age,0);assert.equal(birth.minor,true);assert.equal(birth.realmLevel,0);
assert.deepEqual(birth.parents,[a.id,b.id]);
assert.equal(householdWorld.factions[1].wealth,6);
assert.equal(birth.spiritStones,0);
assert.equal(familyOfOrigin(householdWorld,birth.id),household);
assert.equal(tickPopulationFamilies(householdWorld,()=>({home:b.home,work:b.home})).added.length,0);
a.alive=false;
a.inventory=[{itemId:'iron_ore',count:2},{itemId:'iron_sword',count:1}];
tickPopulationFamilies(householdWorld,()=>null);
assert.equal(birth.spiritStones,16);
assert.equal(a.spiritStones,0);
assert.deepEqual(birth.inventory,[{itemId:'iron_ore',count:2}]);
assert.deepEqual(a.inventory,[{itemId:'iron_sword',count:1}]);
assert.equal(household.inheritances[a.id].heirId,birth.id);
birth.age=18;
const grown=tickPopulationFamilies(householdWorld,()=>null).grown;
assert.deepEqual(grown.map(n=>n.id),[birth.id]);assert.equal(birth.minor,false);
birth.relationships[other.id]=45;other.relationships[birth.id]=47;
assert.ok(formHousehold(householdWorld,birth,other));
assert.equal(familyOfOrigin(householdWorld,birth.id),household);
assert.equal(birth.spiritStones,12);

const traveler=w.npcs.find(n=>n.vocation==='wanderer');
traveler.emigration={point:point(10,10),reason:'Đi tiếp qua Bắc Vực'};
assert.equal(settleDeparture(w,traveler),true);
assert.equal(populationState(w).departed[traveler.id].npc.alive,true);
assert.equal(settleDeparture(w,traveler),false);
assert.equal(migratePopulation(w,180,place).length,0);

const business=world(2);
const [alchemist,smith]=business.npcs;
Object.assign(alchemist,{vocation:'alchemist',workPosition:point(10,10),x:10,y:10,inventory:[{itemId:'spirit_herb',count:2}]});
Object.assign(smith,{vocation:'smith',workPosition:point(11,11),x:11,y:11,inventory:[{itemId:'iron_ore',count:1}]});
const funds=()=>business.shops.reduce((sum,s)=>sum+s.cash,0);
const opening=funds();
const attempted=[];
const scene={populationWorld:business,markers:[{id:'east-camp',x:100,y:100}],
  merchants:{start:(_n,intent)=>{attempted.push(intent);return false;}},
  canReachPoint:()=>true,resetNpcRoute:()=>{},requestBackgroundSave:()=>{}};
const jobs=new PopulationLivelihoods(scene);
assert.equal(funds(),opening);
// Economically real work needs inputs and a worker physically present.
for(const i of [0,1]){business.clock.minute+=7;jobs.craft(smith,{materials:[['boar_tusk',1]],output:'iron_dao'});}
assert.equal(attempted.at(-1).itemId,'boar_tusk');
assert.deepEqual(smith.inventory,[{itemId:'iron_ore',count:1}]);
const recipe={materials:[['spirit_herb',2]],output:'qi_pill',yield:2,duration:70};
jobs.craft(alchemist,recipe);
assert.equal(alchemist.inventory.length,0);
for(let i=0;i<10;i++){business.clock.minute+=7;jobs.craft(alchemist,recipe);}
assert.deepEqual(alchemist.inventory,[{itemId:'qi_pill',count:2}]);
assert.equal(populationState(business).counts.production,1);
const merchant=business.npcs[1];
Object.assign(merchant,{spawnRegionId:'oasis',vocation:'caravan',inventory:[{itemId:'ration',count:3}],cargoOrder:{count:3}});
const market=jobs.markets.get('oasis'), cash=market.shop.cash;
scene.merchants.shops=new Map([['city-market',{position:point(40,40)}]]);
jobs.route(merchant);
assert.equal(market.shop.cash,cash);
Object.assign(merchant,market.point);
const purse=merchant.spiritStones;
jobs.route(merchant);
assert.equal(merchant.spiritStones,purse+18);
assert.equal(market.shop.cash,cash-18);
assert.deepEqual(market.shop.stock,[{itemId:'ration',count:3}]);
assert.equal(business.economy.transactions.length,1);
console.log('PASS Population: migration, no resurrection, unique settlers, timed demographic events, inherited estate, finite production, and real cargo settlement.');
