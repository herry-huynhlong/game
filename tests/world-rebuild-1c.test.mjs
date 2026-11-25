import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import {baseWorldMap} from './base-world-map.mjs';

const root=process.cwd(),temp=fs.mkdtempSync(path.join(os.tmpdir(),'world-rebuild-1c-'));
try{
 await build({entryPoints:['src/world-rebuild-population.js','src/dao/CityLawSystem.ts'],outdir:temp,bundle:true,platform:'node',format:'cjs',target:'node20',outExtension:{'.js':'.cjs'},logLevel:'silent'});
 const require=createRequire(import.meta.url),{createWorldUuid,loadWorldPopulation,WORLD_POPULATION_SAVE_KEY}=require(path.join(temp,'world-rebuild-population.cjs'));
 const insecureContextCrypto={getRandomValues(bytes){bytes.set(Array.from({length:bytes.length},(_,i)=>i));return bytes}};
 const fallbackUuid=createWorldUuid(insecureContextCrypto);assert.match(fallbackUuid,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,'UUID v4 fallback works when randomUUID is unavailable on HTTP');
 const mapData=baseWorldMap(JSON.parse(fs.readFileSync(path.join(root,'maps/world-rebuild-1b.tmj'),'utf8')));
 const map={properties:mapData.properties,widthInPixels:mapData.width*mapData.tilewidth,heightInPixels:mapData.height*mapData.tileheight,getObjectLayer(name){return mapData.layers.find(l=>l.name===name)??null}};
 class Storage{data=new Map();getItem(k){return this.data.get(k)??null}setItem(k,v){this.data.set(k,v)}}
 const storage=new Storage(),created=loadWorldPopulation(storage,map),world=created.world,{reportCityCombat,markCityIncidentAtScene,clearCityResponse}=require(path.join(temp,'dao','CityLawSystem.cjs'));
 assert.equal(created.fresh,true);assert.equal(storage.getItem(WORLD_POPULATION_SAVE_KEY)!==null,true);
 assert.equal(world.npcs.length,108);assert.equal(new Set(world.npcs.map(n=>n.id)).size,108);assert.equal(world.population.target,108);assert.equal(world.population.initialized,true);
 assert.deepEqual(world.population.quotas,{commoner:20,low_disciple:20,elder:5,sect_leader:1,merchant:7,tavern_staff:3,city_guard:10,repair_worker:2,hunter:5,herb_gatherer:3,quest_clerk:2,independent_cultivator:30});
 assert.equal(world.npcs.filter(n=>n.authorityRole==='city_master').length,1);assert.equal(world.npcs.filter(n=>n.authorityRole==='sect_leader').length,1);
 const master=world.npcs.find(n=>n.authorityRole==='city_master'),leader=world.npcs.find(n=>n.authorityRole==='sect_leader');assert.equal(master.populationRole,'independent_cultivator');assert.equal(master.profession,'tu_si');assert.equal(master.realmIndex,3);assert.equal(leader.realmIndex,3);assert.equal(world.npcs.filter(n=>n.populationRole==='independent_cultivator'&&n.authorityRole!=='city_master'&&n.realmIndex===0).length,19);assert.equal(world.npcs.filter(n=>n.populationRole==='independent_cultivator'&&n.authorityRole!=='city_master'&&n.realmIndex===1).length,8);assert.equal(world.npcs.filter(n=>n.populationRole==='independent_cultivator'&&n.authorityRole!=='city_master'&&n.realmIndex===2).length,2);
 assert.equal(world.npcs.filter(n=>n.populationRole==='commoner'&&n.profession==='nong_dan').length,4);
 assert.equal(new Set(world.npcs.map(n=>n.visualStyleId)).size>=20,true);assert.ok(world.npcs.every(n=>n.visualStyleId&&fs.existsSync(path.join(root,'public/assets/characters',n.visualStyleId+'.png'))));
 assert.deepEqual([...new Set(world.npcs.map(n=>n.spawnRegionId))].sort(),['city','forest-outer','sect','south-suburb']);assert.ok(world.npcs.every(n=>n.x>=0&&n.y>=0&&n.x<map.widthInPixels&&n.y<map.heightInPixels));
 const collisions=mapData.layers.find(l=>l.name==='Collision').objects;for(const n of world.npcs)assert.ok(!collisions.some(r=>n.x+9>r.x&&n.x-9<r.x+r.width&&n.y+5>r.y&&n.y-5<r.y+r.height),`spawn ${n.id} overlaps collision`);
 assert.equal(world.factions.find(f=>f.id==='qingyun-city').leaderId,master.id);assert.equal(world.factions.find(f=>f.id==='qingyun-sect').leaderId,leader.id);assert.equal(world.settlement.guardCaptainId,world.npcs.find(n=>n.populationRole==='city_guard').id);assert.equal(world.shops.length,5);assert.ok(world.shops.every(s=>world.npcs.some(n=>n.id===s.ownerId&&n.populationRole==='merchant')));
 const before=JSON.stringify(world),reloaded=loadWorldPopulation(storage,map);assert.equal(reloaded.fresh,false);assert.equal(JSON.stringify(reloaded.world),before,'reload does not reseed or reset identity, position, realm, inventory or AI state');
 const legacy=structuredClone(world);
 delete legacy.layoutVersion;
 const oldDisciple=legacy.npcs.find(n=>n.populationRole==='low_disciple');
 Object.assign(oldDisciple,{x:3530,y:4145,home:{x:4350,y:4355},workPosition:{x:3152,y:4230},
   actionTarget:{x:2694,y:3849},patrolPoints:[{x:3610,y:3650}],routeIndex:5,pathBlocked:true});
 legacy.sectCampus={orders:[{id:'active-herb-contract',assignee:oldDisciple.id,progress:1,status:'active',escrow:12}]};
 legacy.environment={drops:[{id:'forest-loot',x:2174,y:4034,count:1,status:'ground'}]};
 const migrationStorage=new Storage(),oldSave=JSON.stringify(legacy);
 migrationStorage.setItem(WORLD_POPULATION_SAVE_KEY,oldSave);
 const upgraded=loadWorldPopulation(migrationStorage,map).world;
 const moved=upgraded.npcs.find(n=>n.id===oldDisciple.id);
 assert.equal(upgraded.layoutVersion,2);
 assert.deepEqual([moved.y,moved.home.y,moved.workPosition.y,moved.actionTarget.y,moved.patrolPoints[0].y],[5425,5635,5510,5129,3650]);
 assert.deepEqual([moved.routeIndex,moved.pathBlocked],[undefined,undefined]);
 assert.deepEqual([moved.inventory,moved.spiritStones,moved.xp,moved.realmIndex],[oldDisciple.inventory,oldDisciple.spiritStones,oldDisciple.xp,oldDisciple.realmIndex]);
 assert.deepEqual(upgraded.sectCampus.orders,legacy.sectCampus.orders);
 assert.equal(upgraded.environment.drops[0].y,5314);
 assert.equal(migrationStorage.getItem(WORLD_POPULATION_SAVE_KEY),oldSave);
 migrationStorage.setItem(WORLD_POPULATION_SAVE_KEY,JSON.stringify(upgraded));
 assert.deepEqual(loadWorldPopulation(migrationStorage,map).world,JSON.parse(JSON.stringify(upgraded)));
 const attacker=world.npcs.find(n=>n.populationRole==='independent_cultivator'&&n.authorityRole!=='city_master'),victim=world.npcs.find(n=>n.populationRole==='commoner');attacker.x=victim.x=3568;attacker.y=victim.y=2192;attacker.realmIndex=2;const crime=reportCityCombat(world,{eventId:'crime-test-1',attackerId:attacker.id,victimId:victim.id,damage:30});assert.equal(crime.reason,'crime');assert.equal(crime.responderIds.length,2);assert.equal(crime.cityMasterId,master.id);assert.ok(crime.incident.severity>=2);assert.ok(crime.responderIds.every(id=>world.npcs.find(n=>n.id===id).lawResponse.targetId===attacker.id));
 const beforeDuel=world.cityLaw.incidents.length,duel=reportCityCombat(world,{eventId:'duel-test-1',attackerId:attacker.id,victimId:victim.id,damage:30,authorizedDuel:true});assert.equal(duel.reason,'authorized-duel');assert.equal(world.cityLaw.incidents.length,beforeDuel);
 const selfDefense=reportCityCombat(world,{eventId:'defense-test-1',attackerId:victim.id,victimId:attacker.id,damage:8,retaliation:true});assert.equal(selfDefense.reason,'self-defense');assert.equal(world.cityLaw.incidents.length,beforeDuel);
 const allResponders=[...crime.responderIds,crime.cityMasterId];for(const id of allResponders)assert.equal(markCityIncidentAtScene(world,crime.incident.id,id),true);assert.equal(crime.incident.status,'contained');assert.equal(clearCityResponse(world,crime.incident.id),true);assert.equal(crime.incident.status,'cleared');assert.ok(allResponders.every(id=>!world.npcs.find(n=>n.id===id).lawResponse));
 const rogue=world.npcs.find(n=>n.populationRole==='independent_cultivator'&&n.authorityRole!=='city_master');rogue.alive=false;storage.setItem(WORLD_POPULATION_SAVE_KEY,JSON.stringify(world));const afterDeath=loadWorldPopulation(storage,map);assert.equal(afterDeath.world.npcs.length,108);assert.equal(afterDeath.world.npcs.find(n=>n.id===rogue.id).alive,false,'dead NPCs are never respawned on reload');
 console.log('WORLD.REBUILD.1-C passed: exact 108 roster, stable collision-safe regional spawns, realm authority, reusable art styles, stable/death-safe reload, authorized duel/self-defense exemptions, and non-teleporting city responder assignments.');
}finally{fs.rmSync(temp,{recursive:true,force:true})}
