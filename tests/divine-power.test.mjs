import assert from 'node:assert/strict';
import { build } from 'esbuild';

const {outputFiles} = await build({
  stdin: {contents: `
    export * from './src/dao/DivinePowerLedger.ts';
    export * from './src/dao/TribulationSystem.ts';
    export {damageFauna} from './src/dao/FaunaSystem.ts';
    export {advanceNpcLifespans,createPopulationNPC} from './src/dao/AutonomousNPCSystem.ts';
    export {cultivationRequired} from './src/systems/RealmConfig.ts';
    export {cultivationStats} from './src/systems/CultivationSystem.ts';
    export {commitHeavenChange,buyAndGiftHeavenItem} from './src/world/HeavenShop.js';
  `, resolveDir:process.cwd()},
  bundle:true, write:false, platform:'node', format:'esm',
});
const {
  realmPower, initDivinePower, syncDivinePower, creditDeath, creditBreakthrough, advanceNpcLifespans,
  planTribulation, beginTribulation, stepTribulation, damageFauna, createPopulationNPC, cultivationRequired, cultivationStats,
  commitHeavenChange, buyAndGiftHeavenItem,
} = await import('data:text/javascript;base64,' + Buffer.from(outputFiles[0].text).toString('base64'));

const world = () => ({
  worldId:'sinh-diet', clock:{day:5, minute:465},
  heaven:{divinePower:100, divinePowerMax:9999, possession:null},
  events:[], npcs:[],
});
const living = (id, realmIndex, realmLevel) => ({id, name:id, realmIndex, realmLevel, x:41, y:39});
assert.deepEqual([
  'Phàm nhân','Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần','Luyện Hư','Hợp Thể','Đại Thừa','Độ Kiếp','Chân Tiên',
].map(realmPower), Array.from({length:11}, (_, i) => i));

const w = world();
w.events.push({type:'npc-death', actorId:'old'});
assert.equal(initDivinePower(w.heaven, w.clock.day).earned, 0);
for (const [realm, level, points] of [[0,1,2],[0,9,18],[1,5,20],[2,3,18],[2,9,54],[3,6,48],[4,9,90]]) {
  const subject = living(`npc-${realm}-${level}`, realm, level);
  assert.equal(creditDeath(w, subject, 'npc-death', 'Chiến đấu'), true);
  assert.equal(w.heaven.divineLedger.recent.at(-1).points, points);
  assert.equal(creditDeath(w, subject, 'npc-death', 'Lần báo trùng'), false);
}
assert.equal(creditDeath(w, living('mortal', undefined, 0), 'npc-death', 'Hết thọ nguyên'), false);
assert.equal(creditBreakthrough(w, living('npc-advance', 1, 2), {realmIndex:0,realmLevel:7}), true);
assert.equal(w.heaven.divineLedger.breakthrough, 7);
assert.equal(creditBreakthrough(w, living('npc-advance', 1, 3), {realmIndex:0,realmLevel:7}), true);
assert.equal(w.heaven.divineLedger.breakthrough, 9);

const fauna = { ...living('beast-life-a', undefined, undefined), species:'wolf', rank:'normal', hp:1, alive:true, zoneId:'forest' };
w.environment = {fauna:[fauna],drops:[],defeatedBeastIds:[],processedEventIds:[]};
assert.equal(damageFauna(w, fauna.id, 'hunter', 90, 'hit').fauna.alive, false);
assert.equal(w.heaven.divineLedger.faunaDeath, 8);
assert.equal(damageFauna(w, fauna.id, 'hunter', 90, 'hit-again'), null);
const beast = living('cave-beast', 2, 3);
beast.underground = {siteId:'mine',floor:2,x:6,y:8};
assert.equal(creditDeath(w, beast, 'fauna-death', 'Trong hang', 'mine:2:0'), true);
assert.equal(creditDeath(w, beast, 'fauna-death', 'Trong hang', 'mine:2:1'), true);
assert.equal(w.heaven.divineLedger.recent.at(-1).floor, 2);
assert.equal(w.heaven.divineLedger.recent.at(-1).x, 6);

const reload = JSON.parse(JSON.stringify(w));
assert.equal(creditDeath(reload, beast, 'fauna-death', 'Trong hang', 'mine:2:1'), false);
assert.equal(reload.heaven.divinePower, w.heaven.divinePower);
const npc = {id:'buyer', name:'Thương nhân', alive:true, inventory:[], memories:[]};
reload.npcs.push(npc);
const shop = {populationWorld:reload, persistPopulation:() => false};
const trade = () => buyAndGiftHeavenItem(reload, 'fishing_rod_basic', npc, 'rod');
assert.equal(commitHeavenChange(shop, npc, trade).ok, false);
assert.equal(syncDivinePower(reload).spent, 0);
shop.persistPopulation = () => true;
assert.equal(commitHeavenChange(shop, npc, trade).ok, true);
const ledger = syncDivinePower(reload);
assert.equal(ledger.spent, 4);
assert.equal(ledger.opening + ledger.earned - ledger.spent, reload.heaven.divinePower);

const aged = world();
aged.npcs.push({...living('elder', 0, 2), alive:true, age:79, lifespan:80, hp:100});
assert.equal(advanceNpcLifespans(aged), false);
aged.clock.day = 366;
assert.equal(advanceNpcLifespans(aged), true);
assert.equal(aged.heaven.divinePower, 104);
assert.equal(aged.npcs[0].deathCause, 'Hết thọ nguyên');
assert.equal(advanceNpcLifespans(aged), false);

for (const [roll, lethal, expected] of [[0,false,2],[1,false,0],[1,true,20]]) {
  const trial = world(), npc = createPopulationNPC('low_disciple','trial','roster',0,new Set());
  Object.assign(npc,{x:21,y:25,realmIndex:0,realmLevel:10,xp:cultivationRequired(0,10),
    inventory:[{itemId:'qi_pill',count:1}],actionCooldown:0});
  npc.hp = cultivationStats(npc).hpMax; npc.mp = cultivationStats(npc).mpMax;
  assert.ok(planTribulation(trial,npc,{x:21,y:25,name:'Sân tu luyện'}));
  assert.ok(beginTribulation(trial,npc));
  assert.equal(trial.heaven.divinePower,100);
  npc.tribulation.roll = roll;
  if (lethal) npc.hp = 1;
  while (!['failure','success'].includes(npc.tribulation.phase)) {
    trial.clock.minute = npc.tribulation.nextAt % 1440;
    assert.ok(stepTribulation(trial,npc));
  }
  assert.equal(trial.heaven.divinePower,100+expected);
}
console.log('PASS Sinh Diệt Luân Hồi: formulas, multiple layers, tribulation, mortality, fauna lives, save, wallet and rollback.');
