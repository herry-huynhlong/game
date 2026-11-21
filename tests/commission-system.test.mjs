import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {build} from 'esbuild';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'thanh-van-commission-'));
try{
 const entries=['CommissionSystem','EnvironmentalSystem','EconomySystem','SettlementSystem','AutonomousNPCSystem','GridNavigator'];
 await build({entryPoints:Object.fromEntries(entries.map(n=>[n,`src/dao/${n}.ts`])),outdir:temp,bundle:true,platform:'node',format:'cjs',target:'node20',outExtension:{'.js':'.cjs'},logLevel:'silent'});
 const req=createRequire(import.meta.url),load=n=>req(path.join(temp,`${n}.cjs`));
 const {createInitialNPCs}=load('AutonomousNPCSystem'),{createFactions,createSettlement}=load('SettlementSystem');
 const env=load('EnvironmentalSystem'),cs=load('CommissionSystem'),{GridNavigator}=load('GridNavigator');
 const npcs=createInitialNPCs(),smith=npcs.find(n=>n.profession==='tho_re');assert.ok(smith,'fixture includes a real smith');
 smith.x=3260;smith.y=1080;smith.alive=true;smith.ascended=false;smith.hp=100;smith.hunger=10;smith.fatigue=10;smith.safety=80;smith.goalAction='idle';smith.spiritStones=0;
 const world={worldId:'world-commission-test',clock:{day:2,minute:480,speed:4,paused:false},npcs,factions:createFactions(npcs),settlement:createSettlement(),heaven:{possession:null},events:[],commissionTransactions:[],commissions:[]};
 const house=env.ensureEnvironment(world).objects.find(o=>o.id==='city-house-residential-2870');
 for(let i=0;i<4;i++)env.damageEnvironment(world,house.id,`wreck-${i}`,180,4);
 assert.equal(house.status,'destroyed');const eventId='building-destroyed:real-test-event';
 const c=cs.postRepairCommission(world,house,eventId);assert.ok(c,'real destroyed house with a funded city treasury creates a commission');assert.equal(cs.postRepairCommission(world,house,eventId),c,'same source event does not duplicate the commission');
 const city=world.factions.find(f=>f.id===c.issuerId),wealth=city.wealth;assert.equal(c.rewardEscrow,30);assert.equal(wealth,290,'the 30-stone reward is reserved from real city wealth');
 const poor=JSON.parse(JSON.stringify(world));poor.commissions=[];poor.commissionTransactions=[];poor.factions.find(f=>f.id===c.issuerId).wealth=0;assert.equal(cs.postRepairCommission(poor,house,'poor-event'),null,'insufficient treasury cannot advertise an unfunded reward');
 const map=JSON.parse(fs.readFileSync('maps/thanh_van_world.tmj','utf8'));const collisions=map.layers.find(l=>l.name==='Collision').objects.map(o=>({x:o.x,y:o.y,width:o.width,height:o.height}));const nav=new GridNavigator(map.width*map.tilewidth,map.height*map.tileheight,collisions);
 const board={x:3252,y:930},route=nav.path(smith,board);assert.ok(route.length>0,'smith can find a collision-aware route to the board');
 smith.x=board.x;smith.y=board.y;assert.equal(cs.canSeekBoard(world,smith,null),true);smith.decisionSlot='commission-board';smith.goalAction='commission';assert.equal(cs.canSeekBoard(world,smith,null),true,'a visitor who reached the board is still allowed to re-check eligibility');assert.equal(cs.repairInterest(world,smith,c,board)>=35,true);assert.equal(cs.visitCommissionBoard(world,smith,c.commissionId,board,null),true);assert.equal(cs.visitCommissionBoard(world,smith,c.commissionId,board,null),false,'a second NPC cannot claim an already claimed commission');
 const target=c.target,routeToHouse=nav.path(board,target);assert.ok(routeToHouse.length>0,'commission target is reachable without crossing Tiled collision');
 smith.x=target.x;smith.y=target.y;const stockBefore=JSON.parse(JSON.stringify(world.settlement.materials));assert.deepEqual(cs.startRepairCommission(world,c,smith,smith,target),{ok:true,reason:'repair-started'});assert.equal(c.status,'in_progress');
 const {EconomySystem}=load('EconomySystem');assert.equal(EconomySystem.count(world.settlement.materials,'wood'),EconomySystem.count(stockBefore,'wood')-3);assert.equal(EconomySystem.count(world.settlement.materials,'iron_ore'),EconomySystem.count(stockBefore,'iron_ore')-2);
 for(let i=0;i<6;i++){world.clock.minute+=30;cs.advanceRepairCommission(world,c,smith,30,target)}
 assert.equal(c.status,'claimed');assert.equal(house.status,'intact');assert.equal(house.hp,house.maxHp);assert.ok(house.collision,'repair restores collision');assert.equal(smith.spiritStones,30);assert.equal(c.rewardEscrow,0);assert.equal(city.wealth,wealth,'reserved money leaves treasury exactly once');
 const rewardRows=world.commissionTransactions.filter(t=>t.type==='reward'&&t.commissionId===c.commissionId);assert.equal(rewardRows.length,1);assert.equal(cs.payCommissionReward(world,c,smith),false,'reward cannot be claimed twice');
 const saved=JSON.parse(JSON.stringify(world));assert.equal(saved.commissions[0].status,'claimed');assert.equal(saved.npcs.find(n=>n.id===smith.id).spiritStones,30);assert.equal(saved.environment.objects.find(o=>o.id===house.id).status,'intact');assert.equal(saved.commissionTransactions.filter(t=>t.type==='reward').length,1);
 const noMaterials=JSON.parse(JSON.stringify(world));const other=JSON.parse(JSON.stringify(c));other.commissionId+=':no-materials';other.targetId=house.id;other.status='accepted';other.acceptedBy=smith.id;smith.assignedCommissionId=other.commissionId;noMaterials.commissions.push(other);noMaterials.settlement.materials=[];assert.notEqual(cs.startRepairCommission(noMaterials,other,smith,smith,target).reason,'repair-started');
 const screenshot=fs.existsSync('public/assets/props/commission_board.png');assert.equal(screenshot,true,'board pixel art runtime asset exists');
 console.log('WORLD.1A CommissionSystem passed: event-only posting, duplicate guard, escrow, route reachability, single acceptance, real material consumption, repair completion, restored HP/collision, one-time payment and save/load.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
