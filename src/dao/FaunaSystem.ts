import type { DivineWorldSave, EnvironmentSave, FaunaRespawnSave, FaunaSave, FaunaSpecies, GroundDropSave, MonsterRank, SimNPC, TradeItemId } from './types';
import { FAUNA_SPECIES, MONSTER_SPAWN, hashMonster } from './MonsterRegistry';
export { FAUNA_SPECIES } from './MonsterRegistry';

export type FaunaZone={zoneId:string;name?:string;species:FaunaSpecies;cap:number;respawnMs:number;activityRadius?:number;leash?:number;safeBuffer?:number;x:number;y:number;width:number;height:number};
type CanSpawn=(x:number,y:number,species:FaunaSpecies,rank:MonsterRank)=>boolean;
export function insideHabitat(p:{x:number;y:number},z:FaunaZone,margin=0){
  return p.x>=z.x+margin&&p.y>=z.y+margin&&p.x<=z.x+z.width-margin&&p.y<=z.y+z.height-margin;
}
function envFor(world:DivineWorldSave){
  const env=world.environment??={objects:[],drops:[],processedEventIds:[],defeatedBeastIds:[]};
  env.fauna??=[];env.faunaRespawns??=[];env.faunaRespawnStats??={};env.eliteReadyAt??={};
  env.monsterHazards??=[];env.monsterProjectiles??=[];env.faunaClockMs??=0;
  return env as EnvironmentSave & Required<Pick<EnvironmentSave,'fauna'|'faunaRespawns'|'faunaRespawnStats'|'eliteReadyAt'|'faunaClockMs'>>;
}
export function hunterTolerance(npc:Pick<SimNPC,'hp'|'aiProfile'|'fatigue'|'spiritStones'>,maxHp:number,power:number){
  const courage=npc.aiProfile?.axes.courage??50,caution=npc.aiProfile?.axes.caution??50;
  return {retreatHp:maxHp*Math.max(.36,Math.min(.72,.48+(caution-courage)*.003+npc.fatigue*.001)),
    search:Math.round(540+courage*5-caution*2),
    allowedPower:Math.max(0,power*(.70+courage*.004-caution*.002))*Math.min(1,npc.hp/maxHp+.15)};
}

// Historical beast IDs remain on drops and events. Live IDs are replaced only once.
export function migrateFauna(world:DivineWorldSave){
  const env=envFor(world);
  if(env.monsterVersion===2)return false;
  const retired=new Set(env.fauna.map(beast=>beast.id));
  env.fauna=[];env.faunaRespawns=[];env.faunaRespawnStats={};env.eliteReadyAt={};
  env.monsterProjectiles=[];env.monsterHazards=[];env.monsterVersion=2;
  for(const npc of world.npcs){
    const hunt=npc.faunaHuntTargetId;
    if(!hunt||!retired.has(hunt)||env.drops.some(drop=>drop.sourceId===hunt&&drop.status==='ground'))continue;
    npc.faunaHuntTargetId=undefined;
    if(npc.goalAction==='fight'){npc.goalAction='idle';npc.action='idle';npc.actionTarget={x:npc.x,y:npc.y};}
  }
  return true;
}
export function spawnFaunaInZone(world:DivineWorldSave,zone:FaunaZone,isOpen:CanSpawn,options:{attempts?:number}={}){
  const env=envFor(world),live=env.fauna.filter(f=>f.zoneId===zone.zoneId&&f.alive);
  if(live.length>=zone.cap)return {ok:false as const,reason:'zone-cap'};
  const serial=(env.faunaSpawnSerial??0)+1;
  const seed=hashMonster(world.worldId+':'+zone.zoneId+':'+serial);
  const eligible=live.filter(f=>f.rank==='elite').length<MONSTER_SPAWN.eliteCap&&env.faunaClockMs>=(env.eliteReadyAt[zone.zoneId]??0);
  const rank:MonsterRank=eligible&&seed%10000<MONSTER_SPAWN.eliteChance*10000?'elite':'normal';
  let value=seed;
  function unit(){value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296}
  for(let i=0;i<(options.attempts??100);i++){
    const margin=28;
    const x=Math.round(zone.x+margin+unit()*(zone.width-margin*2)),y=Math.round(zone.y+margin+unit()*(zone.height-margin*2));
    if(!insideHabitat({x,y},zone,margin)||env.fauna.some(f=>f.alive&&Math.hypot(x-f.x,y-f.y)<53)||!isOpen(x,y,zone.species,rank))continue;
    const species=zone.species,hp=FAUNA_SPECIES[species].hp+(rank==='elite'?55:0);
    const beast:FaunaSave={id:`fauna:v2:${zone.zoneId}:${serial}`,species,rank,x,y,home:{x,y},hp,maxHp:hp,zoneId:zone.zoneId,alive:true,state:'idle',attackReadyAt:0,nextThinkAt:0,lootCreated:false};
    env.faunaSpawnSerial=serial;env.fauna.push(beast);
    const stats=env.faunaRespawnStats[zone.zoneId]??={totalSpawned:0,failedAttempts:0};
    stats.totalSpawned++;stats.lastSpawnAtMs=env.faunaClockMs;
    return {ok:true as const,beast};
  }
  return {ok:false as const,reason:'no-safe-spawn-point'};
}
export function ensureFauna(world:DivineWorldSave,zones:FaunaZone[],isOpen:(zone:FaunaZone,...args:Parameters<CanSpawn>)=>boolean){
  const fresh=migrateFauna(world),env=envFor(world);
  if(fresh)for(const zone of zones){
    for(let i=0;i<zone.cap;i++)if(!spawnFaunaInZone(world,zone,(...args)=>isOpen(zone,...args)).ok)break;
  }
  return env.fauna;
}
export function queueFaunaRespawn(world:DivineWorldSave,beast:FaunaSave,delayMs:number){
  const env=envFor(world);
  if(beast.alive||beast.respawnStatus)return null;
  const now=env.faunaClockMs;
  if(beast.rank==='elite')env.eliteReadyAt[beast.zoneId]=now+MONSTER_SPAWN.eliteCooldownMs;
  const request:FaunaRespawnSave={id:'respawn:'+beast.id,zoneId:beast.zoneId,sourceDeathId:beast.id,requestedAtMs:now,dueAtMs:now+delayMs,attempts:0};
  beast.respawnStatus='pending';env.faunaRespawns.push(request);
  return request;
}
export function processFaunaRespawns(world:DivineWorldSave,zones:FaunaZone[],nowMs:number,isOpen:(zone:FaunaZone,...args:Parameters<CanSpawn>)=>boolean){
  const env=envFor(world),result={spawned:[] as FaunaSave[],cancelled:[] as string[],failed:[] as string[]};
  env.faunaClockMs=Math.max(env.faunaClockMs,nowMs);
  for(const request of [...env.faunaRespawns]){
    if(request.dueAtMs>nowMs)continue;
    const zone=zones.find(z=>z.zoneId===request.zoneId),source=env.fauna.find(f=>f.id===request.sourceDeathId);
    const spawn=zone&&spawnFaunaInZone(world,zone,(...args)=>isOpen(zone,...args));
    if(!spawn||(spawn.ok||spawn.reason==='zone-cap')){
      env.faunaRespawns.splice(env.faunaRespawns.indexOf(request),1);
      if(source){source.respawnStatus='fulfilled';env.fauna.splice(env.fauna.indexOf(source),1);}
      if(spawn?.ok)result.spawned.push(spawn.beast);else result.cancelled.push(request.id);
    }else{
      request.attempts++;request.lastFailure=spawn.reason;request.dueAtMs=nowMs+2500;
      env.faunaRespawnStats[request.zoneId]??={totalSpawned:0,failedAttempts:0};
      env.faunaRespawnStats[request.zoneId].failedAttempts++;result.failed.push(request.id);
    }
  }
  return result;
}
export const faunaCombatPower=(species:FaunaSpecies,rank:MonsterRank='normal')=>FAUNA_SPECIES[species].power+(rank==='elite'?28:0);
export function faunaEvent(world:DivineWorldSave,id:string,type:string,actorId:string,targetId:string,description:string){
  world.events??=[];world.events.push({id,type,actorId,targetId,description,day:world.clock.day,minute:world.clock.minute,status:'occurred'});
  if(world.events.length>400)world.events.splice(0,world.events.length-400);
}
export function damageFauna(world:DivineWorldSave,id:string,attackerId:string,rawDamage:number,eventId:string){
  const env=envFor(world),beast=env.fauna.find(f=>f.id===id);
  if(!beast?.alive||!Number.isFinite(rawDamage)||rawDamage<=0||env.processedEventIds.includes(eventId))return null;
  env.processedEventIds.push(eventId);if(env.processedEventIds.length>2000)env.processedEventIds.shift();
  const cfg=FAUNA_SPECIES[beast.species],now=env.faunaClockMs;
  const defense=cfg.defense+(beast.rank==='elite'?3:0)+(now<(beast.armorUntil??0)?7:0);
  const damage=Math.max(1,Math.floor(rawDamage)-defense);
  beast.hp=Math.max(0,beast.hp-damage);beast.targetNpcId=attackerId;beast.rageUntil=now+6500;
  if(!beast.cast){beast.state='hit';beast.hurtUntil=now+240}
  const drops:GroundDropSave[]=[];
  if(beast.hp===0){
    beast.alive=false;beast.state='dead';beast.cast=undefined;beast.deathAt=now;
    if(!beast.lootCreated&&!env.defeatedBeastIds.includes(id)){
      beast.lootCreated=true;env.defeatedBeastIds.push(id);
      const roll=hashMonster(world.worldId+':'+id)%1000;
      const items:TradeItemId[]=[cfg.loot[roll%2]];
      if(roll<(beast.rank==='elite'?260:35))items.push(beast.rank==='elite'?'elite_beast_core':'demon_core');
      for(const itemId of items){
        const drop:GroundDropSave={id:`drop:${id}:${itemId}`,itemId,count:1,x:beast.x,y:beast.y,sourceId:id,createdDay:world.clock.day,createdMinute:world.clock.minute,status:'ground'};
        env.drops.push(drop);drops.push(drop);
      }
      faunaEvent(world,'fauna-death:'+id,'fauna-defeated',attackerId,id,cfg.name+' bị hạ.');
    }
  }
  faunaEvent(world,eventId,'fauna-combat-hit',attackerId,id,cfg.name+' chịu '+damage+' sát thương.');
  return {fauna:beast,damage,drops};
}
export function claimFaunaDrop(world:DivineWorldSave,dropId:string,npcId:string,eventId:string){
  const env=envFor(world),drop=env.drops.find(d=>d.id===dropId),npc=world.npcs.find(n=>n.id===npcId);
  if(!drop||drop.status!=='ground'||!npc?.alive||env.processedEventIds.includes(eventId))return null;
  env.processedEventIds.push(eventId);drop.status='claimed';drop.claimedBy=npcId;drop.claimedEventId=eventId;
  const stack=npc.inventory.find(i=>i.itemId===drop.itemId);
  if(stack)stack.count+=drop.count;else npc.inventory.push({itemId:drop.itemId,count:drop.count});
  faunaEvent(world,eventId,'fauna-loot-claimed',npcId,drop.sourceId,npc.name+' nhặt '+drop.itemId+'.');
  return drop;
}
