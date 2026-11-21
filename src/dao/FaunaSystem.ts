import type { DivineWorldSave, EnvironmentSave, FaunaRespawnSave, FaunaRespawnZoneStats, FaunaSave, FaunaSpecies, GroundDropSave, TradeItemId } from './types';

export const FAUNA_SPECIES = {
  deer: { name:'Hươu rừng', combatPower:0, attackDamage:0, hp:44, defense:1, speed:46, fleeSpeed:86, attackRange:0, cooldownMs:0, itemId:'deer_meat' as TradeItemId, color:'nâu' },
  scorpion: { name:'Bọ cạp yêu cấp thấp', combatPower:12, attackDamage:5, hp:34, defense:2, speed:20, fleeSpeed:0, attackRange:30, cooldownMs:2400, itemId:'scorpion_venom' as TradeItemId, color:'đất đỏ' },
  snake: { name:'Rắn yêu cấp thấp', combatPower:21, attackDamage:8, hp:42, defense:3, speed:32, fleeSpeed:0, attackRange:38, cooldownMs:1900, itemId:'snake_skin' as TradeItemId, color:'lục nâu' },
} as const;
export const FAUNA_ZONE_CAP=7;
export const FAUNA_ZONE_COUNTS: Record<string, Partial<Record<FaunaSpecies, number>>> = {
  'southern-outskirts':{deer:5,scorpion:1,snake:1}, 'forest-outer':{deer:3,scorpion:2,snake:2},
  'forest-middle':{deer:1,scorpion:3,snake:3}, 'forest-deep':{scorpion:3,snake:4},
};
const ZONE_SPECIES_WEIGHTS:Record<string,Partial<Record<FaunaSpecies,number>>>= {
  'southern-outskirts':{deer:72,scorpion:18,snake:10},'forest-outer':{deer:40,scorpion:32,snake:28},
  'forest-middle':{deer:12,scorpion:44,snake:44},'forest-deep':{scorpion:43,snake:57},
};
export type FaunaZone={zoneId:string;x:number;y:number;width:number;height:number};
export function ensureFauna(world:DivineWorldSave,zones:FaunaZone[],isOpen:(x:number,y:number)=>boolean){
  const env=(world.environment??(world.environment={objects:[],drops:[],processedEventIds:[],defeatedBeastIds:[],resourceNodes:[]})) as EnvironmentSave;
  env.fauna??=[];
  if(env.fauna.length)return env.fauna;
  const next=(n:number)=>{let x=n|0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}};
  for(const zone of zones){const counts=FAUNA_ZONE_COUNTS[zone.zoneId];if(!counts)continue;for(const species of ['deer','scorpion','snake'] as FaunaSpecies[]){for(let index=0;index<(counts[species]??0);index++){
    const rnd=next(zone.x*13+zone.y*7+index*97+species.length*313);let point:{x:number;y:number}|undefined;
    for(let attempt=0;attempt<50;attempt++){const x=zone.x+48+rnd()*Math.max(1,zone.width-96),y=zone.y+48+rnd()*Math.max(1,zone.height-96);if(isOpen(x,y)){point={x:Math.round(x),y:Math.round(y)};break}}
    if(!point)continue;
    const id=`fauna:${zone.zoneId}:${species}:${String(index+1).padStart(2,'0')}`,cfg=FAUNA_SPECIES[species];
    env.fauna.push({id,species,...point,hp:cfg.hp,maxHp:cfg.hp,zoneId:zone.zoneId,alive:true,state:'idle',attackReadyAt:0,nextThinkAt:0,lootCreated:false});
  }}}
  return env.fauna;
}
function faunaEnv(world:DivineWorldSave){const env=(world.environment??(world.environment={objects:[],drops:[],processedEventIds:[],defeatedBeastIds:[],resourceNodes:[]})) as EnvironmentSave;env.fauna??=[];env.faunaRespawns??=[];env.faunaRespawnStats??={};return env}
function seeded(seed:number){let x=seed>>>0;return()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296}}
function nextSerial(env:EnvironmentSave){let max=env.faunaSpawnSerial??0;for(const f of env.fauna??[]){const m=f.id.match(/:respawn:(\d+)$/);if(m)max=Math.max(max,Number(m[1])||0)}env.faunaSpawnSerial=max;return()=>++env.faunaSpawnSerial!}
function chooseSpecies(zoneId:string,serial:number):FaunaSpecies{const weights=ZONE_SPECIES_WEIGHTS[zoneId];if(!weights)return 'deer';const total=Object.values(weights).reduce((a,b)=>a+(b??0),0),seed=(Math.imul(serial,2654435761)+zoneId.length*2246822519)>>>0;let roll=seed%total;for(const species of ['deer','scorpion','snake'] as const){roll-=(weights[species]??0);if(roll<0)return species}return 'deer'}
/** Creates one new ID only when there is capacity and a valid, safe point. */
export function spawnFaunaInZone(world:DivineWorldSave,zone:FaunaZone,isOpen:(x:number,y:number)=>boolean,options:{attempts?:number;seed?:number}={}){
 const env=faunaEnv(world),fauna=env.fauna!,alive=fauna.filter(f=>f.zoneId===zone.zoneId&&f.alive).length;if(alive>=FAUNA_ZONE_CAP)return{ok:false as const,reason:'zone-cap'};
 if(!ZONE_SPECIES_WEIGHTS[zone.zoneId])return{ok:false as const,reason:'zone-not-authored'};
 const serial=nextSerial(env),candidate=serial(),random=seeded((options.seed??candidate*9781+zone.x*31+zone.y*17)>>>0),margin=36;
 for(let i=0;i<(options.attempts??120);i++){const x=Math.round(zone.x+margin+random()*Math.max(1,zone.width-margin*2)),y=Math.round(zone.y+margin+random()*Math.max(1,zone.height-margin*2));if(!isOpen(x,y))continue;
  let id=`fauna:${zone.zoneId}:respawn:${String(candidate).padStart(6,'0')}`;while(fauna.some(f=>f.id===id))id=`fauna:${zone.zoneId}:respawn:${String(serial()).padStart(6,'0')}`;
  const species=chooseSpecies(zone.zoneId,candidate),cfg=FAUNA_SPECIES[species],beast:FaunaSave={id,species,x,y,hp:cfg.hp,maxHp:cfg.hp,zoneId:zone.zoneId,alive:true,state:'idle',attackReadyAt:0,nextThinkAt:0,lootCreated:false};fauna.push(beast);const stats=env.faunaRespawnStats![zone.zoneId]??={totalSpawned:0,failedAttempts:0};stats.totalSpawned++;stats.lastSpawnAtMs=Date.now();return{ok:true as const,beast};
 }
 return{ok:false as const,reason:'no-safe-spawn-point'};
}
export function queueFaunaRespawn(world:DivineWorldSave,beast:FaunaSave,nowMs=Date.now(),delayMs=5000){const env=faunaEnv(world);if(beast.alive||beast.respawnStatus||!ZONE_SPECIES_WEIGHTS[beast.zoneId])return null;const existing=env.faunaRespawns!.find(q=>q.sourceDeathId===beast.id);if(existing){beast.respawnStatus='pending';return existing}const request:FaunaRespawnSave={id:`fauna-respawn:${beast.id}`,zoneId:beast.zoneId,sourceDeathId:beast.id,requestedAtMs:nowMs,dueAtMs:nowMs+delayMs,attempts:0};beast.respawnStatus='pending';env.faunaRespawns!.push(request);return request}
export function processFaunaRespawns(world:DivineWorldSave,zones:FaunaZone[],nowMs:number,isOpen:(zone:FaunaZone,x:number,y:number,request:FaunaRespawnSave)=>boolean){const env=faunaEnv(world),requests=env.faunaRespawns!,result={spawned:[] as FaunaSave[],cancelled:[] as string[],failed:[] as Array<{id:string;reason:string}>};for(const request of [...requests].sort((a,b)=>a.dueAtMs-b.dueAtMs||a.id.localeCompare(b.id))){if(request.dueAtMs>nowMs)continue;const source=env.fauna!.find(f=>f.id===request.sourceDeathId),zone=zones.find(z=>z.zoneId===request.zoneId),stats=env.faunaRespawnStats![request.zoneId]??={totalSpawned:0,failedAttempts:0};if(!zone){request.attempts++;request.lastFailure='habitat-missing';request.dueAtMs=nowMs+10000;stats.failedAttempts++;stats.lastFailure=request.lastFailure;result.failed.push({id:request.id,reason:request.lastFailure});continue}if(env.fauna!.filter(f=>f.zoneId===request.zoneId&&f.alive).length>=FAUNA_ZONE_CAP){const index=requests.indexOf(request);if(index>=0)requests.splice(index,1);if(source)source.respawnStatus='fulfilled';result.cancelled.push(request.id);continue}const spawned=spawnFaunaInZone(world,zone,(x,y)=>isOpen(zone,x,y,request),{seed:request.attempts*7919+request.id.length*104729});if(spawned.ok){const index=requests.indexOf(request);if(index>=0)requests.splice(index,1);if(source)source.respawnStatus='fulfilled';result.spawned.push(spawned.beast)}else{request.attempts++;request.lastFailure=spawned.reason;request.dueAtMs=nowMs+(request.attempts<8?1500:10000);stats.failedAttempts++;stats.lastFailure=spawned.reason;result.failed.push({id:request.id,reason:spawned.reason})}}
 return result}
export function faunaAttackDamage(species:FaunaSpecies){return FAUNA_SPECIES[species].attackDamage}
export function faunaCombatPower(species:FaunaSpecies){return FAUNA_SPECIES[species].combatPower}
export function resolveFaunaAttack(beast:FaunaSave,now:number,distance:number){const cfg=FAUNA_SPECIES[beast.species];if(!beast.alive||cfg.attackDamage<=0||distance>cfg.attackRange||now<beast.attackReadyAt)return 0;beast.attackReadyAt=now+Math.ceil(cfg.cooldownMs/1000);beast.state='attack';return cfg.attackDamage}
function event(world:DivineWorldSave,id:string,type:string,actorId:string,targetId:string,description:string){world.events??=[];world.events.push({id,type,actorId,targetId,description,day:world.clock.day,minute:world.clock.minute,status:'occurred'});if(world.events.length>400)world.events.splice(0,world.events.length-400)}
export function damageFauna(world:DivineWorldSave,id:string,attackerId:string,rawDamage:number,eventId:string):{fauna:FaunaSave;damage:number;drops:GroundDropSave[]}|null{
 const env=world.environment,beast=env?.fauna?.find(f=>f.id===id);if(!beast?.alive||!Number.isFinite(rawDamage)||rawDamage<=0||env!.processedEventIds.includes(eventId))return null;
 env!.processedEventIds.push(eventId);if(env!.processedEventIds.length>2000)env!.processedEventIds.shift();const damage=Math.max(1,Math.floor(rawDamage)-FAUNA_SPECIES[beast.species].defense);beast.hp=Math.max(0,beast.hp-damage);beast.targetNpcId=attackerId;beast.state=beast.hp===0?'dead':'hit';
 const drops:GroundDropSave[]=[];if(beast.hp===0&&!beast.lootCreated&&!env!.defeatedBeastIds.includes(id)){beast.alive=false;beast.deathAt=world.clock.day*1440+world.clock.minute;beast.lootCreated=true;env!.defeatedBeastIds.push(id);const itemId=FAUNA_SPECIES[beast.species].itemId,drop:GroundDropSave={id:`drop:${id}:${eventId}:${itemId}`,itemId,count:1,x:beast.x,y:beast.y,sourceId:id,createdDay:world.clock.day,createdMinute:world.clock.minute,status:'ground'};if(!env!.drops.some(d=>d.id===drop.id)){env!.drops.push(drop);drops.push(drop)}}
 event(world,eventId,'fauna-combat-hit',attackerId,id,`${attackerId} gây ${damage} sát thương cho ${FAUNA_SPECIES[beast.species].name}.`);if(!beast.alive)event(world,`fauna-death:${id}`,'fauna-defeated',attackerId,id,`${FAUNA_SPECIES[beast.species].name} bị hạ; đã tạo một chiến lợi phẩm.`);return{fauna:beast,damage,drops};
}
export function claimFaunaDrop(world:DivineWorldSave,dropId:string,npcId:string,eventId:string){const env=world.environment,drop=env?.drops.find(d=>d.id===dropId),npc=world.npcs.find(n=>n.id===npcId);if(!env||!drop||drop.status!=='ground'||!npc?.alive||env.processedEventIds.includes(eventId))return null;env.processedEventIds.push(eventId);drop.status='claimed';drop.claimedBy=npcId;drop.claimedEventId=eventId;const stack=npc.inventory.find(i=>i.itemId===drop.itemId);if(stack)stack.count+=drop.count;else npc.inventory.push({itemId:drop.itemId,count:drop.count});event(world,eventId,'fauna-loot-claimed',npcId,drop.sourceId,`${npc.name} thu nhặt ${drop.count} ${FAUNA_SPECIES[env.fauna?.find(f=>f.id===drop.sourceId)?.species??'deer'].name} loot: ${drop.itemId}.`);return drop}
