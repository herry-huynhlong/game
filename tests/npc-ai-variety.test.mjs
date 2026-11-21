import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { build } from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qingyun-npc-ai-'));
await build({entryPoints:['src/dao/AutonomousNPCSystem.ts'],outdir:temp,bundle:true,platform:'node',format:'cjs',target:'node20',outExtension:{'.js':'.cjs'},logLevel:'silent'});
const require=createRequire(import.meta.url),{createInitialNPCs,chooseLivelihoodGoal,targetFor,AutonomousNPCSystem}=require(path.join(temp,'AutonomousNPCSystem.cjs'));
const initial=createInitialNPCs({},'npc-ai-variety-seed');
const farmers=['qingyun-07','qingyun-17'].map(id=>initial.find(n=>n.id===id));
const cultivators=['qingyun-01','qingyun-02'].map(id=>initial.find(n=>n.id===id));
for(const n of [...farmers,...cultivators])assert.ok(n.aiProfile,'new NPC receives an individual AI profile');
assert.deepEqual(createInitialNPCs({},'npc-ai-variety-seed').find(n=>n.id==='qingyun-07').aiProfile,farmers[0].aiProfile,'fixed world seed and NPC ID reproduce the same profile');
assert.notDeepEqual(createInitialNPCs({},'other-seed').find(n=>n.id==='qingyun-07').aiProfile,farmers[0].aiProfile,'a different world seed produces a different profile');

farmers[0].hunger=15;farmers[0].fatigue=12;farmers[0].hp=100;farmers[0].relationships['qingyun-17']=42;farmers[0].actionTarget={x:2670,y:1195};farmers[0].actionProgress=17;
farmers[1].hunger=15;farmers[1].fatigue=84;farmers[1].hp=100;
cultivators[0].hunger=12;cultivators[0].fatigue=10;cultivators[0].hp=100;
cultivators[1].hunger=12;cultivators[1].fatigue=10;cultivators[1].hp=20;
const before=JSON.stringify(initial.map(n=>({inventory:n.inventory,stones:n.spiritStones,xp:n.xp})));
const decisions=[chooseLivelihoodGoal(farmers[0],'eat'),chooseLivelihoodGoal(farmers[1],'eat'),chooseLivelihoodGoal(cultivators[0],'cultivate'),chooseLivelihoodGoal(cultivators[1],'cultivate')];
const seedless=structuredClone(farmers[0]);seedless.inventory=[];assert.deepEqual(targetFor(seedless,'farm',2,480),{x:2740,y:824},'a farmer without seed must first route to the market');assert.deepEqual(targetFor(farmers[0],'farm',2,480),{x:2670,y:1195},'a farmer with owned seed can go directly to the field');
assert.equal(decisions[0].action,'farm','a rested farmer with seed prioritizes the farm');
assert.equal(decisions[1].action,'rest','a tired farmer chooses recovery');
assert.equal(decisions[2].action,'cultivate','a healthy ambitious cultivator keeps training');
assert.equal(decisions[3].action,'rest','an injured cultivator stops training and recovers');
assert.ok(decisions.every(d=>d.reason&&d.scores.length>=3),'each choice has an explanation and alternatives for the debug panel');
assert.equal(JSON.stringify(initial.map(n=>({inventory:n.inventory,stones:n.spiritStones,xp:n.xp}))),before,'scoring alone grants no money, goods or cultivation progress');
const missionWorld={sectMissions:[{id:'fixed-mission',assigneeId:cultivators[0].id,status:'active',target:{x:1,y:1},title:'Thu thập linh thảo'}]};const missionScore=chooseLivelihoodGoal(cultivators[0],'cultivate',missionWorld).scores.find(x=>x.action==='mission').score;const remembered={...structuredClone(cultivators[0]),memories:[...cultivators[0].memories,{day:2,text:'Từng bị yêu thú tập kích.',kind:'combat'}]};const cautiousMissionScore=chooseLivelihoodGoal(remembered,'cultivate',missionWorld).scores.find(x=>x.action==='mission').score;assert.equal(missionScore-cautiousMissionScore,22,'recent combat memory lowers a risky mission choice without deleting the mission');

for(let i=0;i<12;i++)assert.equal(chooseLivelihoodGoal(farmers[0],'eat').action,decisions[0].action,'same state does not reroll its goal');
farmers[0].goalAction=decisions[0].action;
const committed=chooseLivelihoodGoal(farmers[0],'eat');assert.equal(committed.action,'farm','hysteresis keeps a valid current plan when scores are close');
const saved=JSON.parse(JSON.stringify(initial));assert.deepEqual(saved.map(n=>n.aiProfile),initial.map(n=>n.aiProfile),'save/load preserves profiles');assert.equal(saved.find(n=>n.id==='qingyun-07').relationships['qingyun-17'],42);assert.deepEqual(saved.find(n=>n.id==='qingyun-07').actionTarget,{x:2670,y:1195});assert.equal(saved.find(n=>n.id==='qingyun-07').actionProgress,17);

const failedFarmer={...structuredClone(farmers[0]),inventory:[],spiritStones:0,x:2670,y:1195,goalAction:'farm',decisionSlot:'4:farm',actionProgress:89,actionTarget:{x:2670,y:1195}};
const failedBefore=JSON.stringify({inventory:failedFarmer.inventory,spiritStones:failedFarmer.spiritStones,xp:failedFarmer.xp});new AutonomousNPCSystem([failedFarmer],()=>{}).tick(1,4,360);assert.equal(JSON.stringify({inventory:failedFarmer.inventory,spiritStones:failedFarmer.spiritStones,xp:failedFarmer.xp}),failedBefore,'a farm cycle without an attached world cannot mint crops, currency or XP');

// A multi-day fixed-seed decision run exercises repeated day schedules without bypassing role-specific rules.
const longRun=createInitialNPCs({},'npc-ai-variety-seed'),system=new AutonomousNPCSystem(longRun,()=>{});
let decisionsObserved=0;
for(let day=1;day<=3;day++)for(let minute=360;minute<1440;minute+=60){system.tick(15,day,minute);decisionsObserved++}
assert.equal(decisionsObserved,54,'simulation spans multiple work, training and rest windows');
assert.ok(longRun.filter(n=>n.profession==='nong_dan').every(n=>['farm','eat','rest','socialize','trade'].includes(n.goalAction)),'farmers remain in livelihood-appropriate actions');
assert.ok(longRun.filter(n=>n.profession==='tu_si').every(n=>['cultivate','eat','rest','socialize','gather','mission'].includes(n.goalAction)),'cultivators remain in cultivation/sect-appropriate actions');
assert.ok(longRun.find(n=>n.id==='qingyun-07').aiProfile&&longRun.find(n=>n.id==='qingyun-01').aiProfile,'profiles survive repeated simulation ticks');
fs.rmSync(temp,{recursive:true,force:true});
console.log('NPC.AI-VARIETY.1 passed: seeded persistent identity, role-specific utility choices, injury/fatigue responses, hysteresis, no free rewards from scoring, save/load and 3-day decision schedule.');
