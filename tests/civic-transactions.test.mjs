import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({stdin:{contents:"export * from './src/world/CivicSystem.js'",resolveDir:process.cwd()},
  bundle:true,platform:'node',format:'esm',write:false});
const {CivicSystem,witnessResponse}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const employer={id:'owner',spiritStones:50,inventory:[],alive:true,x:10,y:10};
const worker={id:'worker',spiritStones:20,inventory:[],alive:true,x:10,y:10};
const site={id:'mine',item:'spirit_stone_low',state:{owner:employer.id,controller:employer.id,amount:20,discovered:true}};
const law=Object.assign(Object.create(CivicSystem.prototype),{
  state:{serial:0,contracts:{},stats:{},cases:{}},world:{clock:{day:1,minute:500},npcs:[employer,worker],factions:[],events:[]},
  veins:{sites:new Map([['mine',site]])},hall:{x:10,y:10},
  npc:id=>[employer,worker].find(n=>n.id===id),last:[],save(){},willing(){return true},mark(){},release(){},event(){},
});
for(const terms of [
  {mode:'wage',price:9,quantity:4,ownerMoney:-9,workerMoney:9,workerItems:0,ownerItems:4},
  {mode:'share',price:50,quantity:4,ownerMoney:0,workerMoney:0,workerItems:2,ownerItems:2},
  {mode:'lease',price:3,quantity:4,ownerMoney:3,workerMoney:-3,workerItems:4,ownerItems:0},
]){
  employer.spiritStones=50;employer.inventory=[];
  worker.spiritStones=20;worker.inventory=[];
  const c=law.offer(employer,site,terms);
  assert.ok(c);
  assert.equal(law.accept(worker,c),true);
  assert.equal(law.canMine(worker,site),true);
  c.collected=4;worker.inventory.push({itemId:site.item,count:4});
  assert.equal(law.settle(worker,c),true);
  assert.equal(law.settle(worker,c),false);
  assert.equal(law.canMine(worker,site),false);
  assert.equal(employer.spiritStones-50,terms.ownerMoney);
  assert.equal(worker.spiritStones-20,terms.workerMoney);
  assert.equal(employer.inventory[0]?.count??0,terms.ownerItems);
  assert.equal(worker.inventory[0]?.count??0,terms.workerItems);
  assert.equal(employer.spiritStones+worker.spiritStones,70);
}
const open=law.offer(employer,site,{mode:'wage',price:10,quantity:4});
const balance=employer.spiritStones;
law.cancelContract(open,'expiry');law.cancelContract(open,'duplicate');
assert.equal(employer.spiritStones,balance+10);
const strong={realmIndex:3,realmLevel:9}, regular={realmIndex:0,realmLevel:2};
const severe={...regular,aiProfile:{axes:{courage:0,discipline:12,generosity:10}}};
const guard={...regular,populationRole:'city_guard',aiProfile:{axes:{courage:75,discipline:90,generosity:55}}};
assert.equal(witnessResponse(severe,strong,null,3),'leave');
assert.equal(witnessResponse(guard,regular,null,2),'intervene');
assert.equal(witnessResponse({...guard,aiProfile:{axes:{courage:40,discipline:90}}},regular,null,2),'report-city');
console.log('Thiện Ác · three contract modes conserve silver and resources, no repeat pay, witness reactions differ');
