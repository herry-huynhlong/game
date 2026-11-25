import type { DivineWorldSave, EnvironmentSave, FaunaRespawnSave, FaunaSave, FaunaSpecies, GroundDropSave, MonsterRank, SimNPC, TradeItemId } from './types';
import { BASE_FAUNA_IDS, FAUNA_SPECIES, MONSTER_SPAWN, faunaCoreLoot, faunaName, hashMonster } from './MonsterRegistry';
import { faunaHabitat } from '../world/FaunaHabitat.js';
import { recordCombatDamage } from './CombatRecovery';
export { FAUNA_SPECIES } from './MonsterRegistry';

type FaunaSlot={species:FaunaSpecies;rank:MonsterRank};
export type FaunaZone={zoneId:string;name?:string;species:FaunaSpecies;roster?:FaunaSlot[]|string;territories?:Partial<Record<FaunaSpecies,FaunaZone>>;cap:number;respawnMs:number;activityRadius?:number;notice?:number;leash?:number;safeBuffer?:number;normalOnly?:boolean;realmIndex?:number;realmLevel?:number;nocturnal?:boolean;anchorDx?:number;anchorDy?:number;spread?:boolean;x:number;y:number;width:number;height:number};
type CanSpawn=(x:number,y:number,species:FaunaSpecies,rank:MonsterRank)=>boolean;
export function faunaRoster(zone:FaunaZone):FaunaSlot[]{
  if(!zone.roster)return [];
  return typeof zone.roster==='string'?JSON.parse(zone.roster) as FaunaSlot[]:zone.roster;
}
const slotIndex=(slots:FaunaSlot[],f:FaunaSlot)=>slots.findIndex(s=>s.species===f.species&&s.rank===f.rank);
function fillSlots(zone:FaunaZone,live:FaunaSlot[]){
  const slots=[...faunaRoster(zone)];
  for(const f of live){const i=slotIndex(slots,f);if(i>=0)slots.splice(i,1);}
  return slots;
}
function growthFor(species:FaunaSpecies,seed:number):FaunaSave['growth']{
  if(species==='wood')return {age:110+seed%170,qi:15+seed%36,species,phase:'normal'};
  if(species==='millennial')return {age:1100+seed%2100,qi:100,species,phase:'dormant'};
  if(species==='wood-king')return {age:11000+seed%2000,qi:100,species,phase:'dormant'};
}
const maxHp=(species:FaunaSpecies,rank:MonsterRank,zone:FaunaZone)=>FAUNA_SPECIES[species].hp+(rank==='elite'?55:0)+(zone.realmIndex??0)*54;
const westernRanges=(habitat:FaunaZone,seed:number)=>({
  patrolRadius:Math.round((habitat.activityRadius??120)*(.80+(seed%41)/100)),
  leashRadius:Math.round((habitat.leash??170)*(.90+(seed%21)/100)),
});
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
export function spawnFaunaInZone(world:DivineWorldSave,zone:FaunaZone,isOpen:CanSpawn,options:{attempts?:number;required?:FaunaSlot;origin?:{x:number;y:number}}={}){
  const env=envFor(world),live=env.fauna.filter(f=>f.zoneId===zone.zoneId&&f.alive);
  if(live.length>=zone.cap)return {ok:false as const,reason:'zone-cap'};
  const serial=(env.faunaSpawnSerial??0)+1;
  const seed=hashMonster(world.worldId+':'+zone.zoneId+':'+serial);
  const eligible=!zone.normalOnly&&live.filter(f=>f.rank==='elite').length<MONSTER_SPAWN.eliteCap&&env.faunaClockMs>=(env.eliteReadyAt[zone.zoneId]??0);
  const vacancies=fillSlots(zone,live);
  const choice=options.required?vacancies.find(s=>slotIndex([options.required!],s)>=0):vacancies[0];
  if(zone.roster&&!choice)return {ok:false as const,reason:'zone-cap'};
  const rank:MonsterRank=choice?.rank??(eligible&&seed%10000<MONSTER_SPAWN.eliteChance*10000?'elite':'normal');
  const species=choice?.species??zone.species;
  const homes=live.map(f=>f.home);
  const spacing=zone.spread?100:53;
  const habitat=faunaHabitat(zone,species);
  const firstAnchor=zone.spread&&['flower','toad','stag'].includes(species)&&!live.some(f=>f.species===species)&&
    habitat.anchorDx!==undefined&&habitat.anchorDy!==undefined?{x:habitat.x+habitat.anchorDx,y:habitat.y+habitat.anchorDy}:undefined;
  const position=findHabitatPoint(habitat,seed,
    (x,y)=>!env.fauna.some(f=>f.alive&&(Math.hypot(x-f.x,y-f.y)<spacing||
      (zone.spread&&Math.hypot(x-f.home.x,y-f.home.y)<spacing)))&&isOpen(x,y,species,rank),
    {...options,origin:options.origin??firstAnchor,spread:zone.spread?homes:undefined});
  if(position){
    const {x,y}=position;
    const hp=maxHp(species,rank,zone),growth=growthFor(species,seed);
    const realmLevel=zone.spread?Math.min(9,(zone.realmLevel??1)+(rank==='elite'?2:0)+seed%2):zone.realmLevel;
    const roaming=zone.spread?westernRanges(habitat,seed):{};
    const beast:FaunaSave={id:`fauna:v2:${zone.zoneId}:${serial}`,species,rank,x,y,home:{x,y},hp,maxHp:hp,realmIndex:zone.realmIndex,realmLevel,zoneId:zone.zoneId,alive:true,state:growth?'sleep':'idle',attackReadyAt:0,nextThinkAt:0,lootCreated:false,...roaming};
    if(growth)beast.growth=growth;
    env.faunaSpawnSerial=serial;env.fauna.push(beast);
    const stats=env.faunaRespawnStats[zone.zoneId]??={totalSpawned:0,failedAttempts:0};
    stats.totalSpawned++;stats.lastSpawnAtMs=env.faunaClockMs;
    return {ok:true as const,beast};
  }
  return {ok:false as const,reason:'no-safe-spawn-point'};
}
type HabitatPoint={x:number;y:number};
function findHabitatPoint(zone:FaunaZone,seed:number,open:(x:number,y:number)=>boolean,
  options:{attempts?:number;origin?:HabitatPoint;spread?:HabitatPoint[]}={}){
  const margin=30, {x,y,width,height}=zone;
  let value=seed;
  const unit=()=>{value=(Math.imul(value,1664525)+1013904223)>>>0;return value/4294967296;};
  if(options.spread&&!options.origin){
    const columns=4,rows=12;
    const offset=seed%(columns*rows);
    const points=Array.from({length:columns*rows*3},(_,i)=>({
      x:Math.round(x+margin+(((i+offset)%columns)+.13+.74*unit())*(width-2*margin)/columns),
      y:Math.round(y+margin+((Math.floor((i+offset)/columns)%rows)+.13+.74*unit())*(height-2*margin)/rows)
    }));
    const distance=(p:HabitatPoint)=>Math.min(...options.spread!.map(other=>Math.hypot(p.x-other.x,p.y-other.y)));
    if(options.spread.length)points.sort((a,b)=>distance(b)-distance(a));
    return points.find(p=>insideHabitat(p,zone,margin)&&open(p.x,p.y));
  }
  const axis=(a:number,span:number,near:number|undefined,initial:boolean)=>{
    const low=a+margin,high=a+span-margin;
    const pivot=near===undefined?null:Math.min(high,Math.max(low,near));
    const from=initial&&pivot!==null?Math.max(low,pivot-120):low,to=initial&&pivot!==null?Math.min(high,pivot+120):high;
    return Math.round(from+unit()*(to-from));
  };
  for(let i=0;i<(options.attempts??100);i++){
    const px=axis(x,width,options.origin?.x,i<24),py=axis(y,height,options.origin?.y,i<24);
    if(insideHabitat({x:px,y:py},zone,margin)&&open(px,py))return{x:px,y:py};
  }
}
function migrateWesternRoster(world:DivineWorldSave,zones:FaunaZone[]){
  const env=envFor(world);
  if(env.westernEcologyVersion===1||!zones.some(z=>z.roster))return false;
  for(const z of zones.filter(z=>z.roster)){
    const live=env.fauna.filter(f=>f.zoneId===z.zoneId&&f.alive),vacancies=[...faunaRoster(z)],changes=[];
    for(const f of live){const i=slotIndex(vacancies,f);if(i<0)changes.push(f);else vacancies.splice(i,1);}
    for(const f of changes){
      const slot=vacancies.shift();if(!slot)continue;
      const hp=maxHp(slot.species,slot.rank,z),health=f.hp/Math.max(1,f.maxHp),growth=growthFor(slot.species,hashMonster(f.id));
      Object.assign(f,slot,{growth,hp:Math.max(1,Math.round(hp*health)),maxHp:hp,state:growth?'sleep':'idle',
        cast:undefined,targetNpcId:undefined,roamTarget:undefined,lastSkill:undefined,cooldowns:undefined});
      env.monsterProjectiles=env.monsterProjectiles?.filter(p=>p.sourceId!==f.id);
      env.monsterHazards=env.monsterHazards?.filter(h=>h.sourceId!==f.id);
    }
  }
  env.westernEcologyVersion=1;
  return true;
}
export function ensureFauna(world:DivineWorldSave,zones:FaunaZone[],isOpen:(zone:FaunaZone,...args:Parameters<CanSpawn>)=>boolean){
  const fresh=migrateFauna(world),env=envFor(world);
  const migrated=new Set<string>();
  for(const f of env.fauna)if(String(f.species)==='python'){
    migrated.add(f.id);
    Object.assign(f,{species:'eagle',altitude:0,cast:undefined,cooldowns:{},roamTarget:undefined,targetNpcId:undefined,
      recovery:undefined,state:f.alive?'idle':'dead'});
  }
  if(migrated.size){
    env.monsterProjectiles=env.monsterProjectiles?.filter(p=>!migrated.has(p.sourceId));
    env.monsterHazards=env.monsterHazards?.filter(p=>!migrated.has(p.sourceId));
  }
  for(const t of env.westTreasures??[])if(String(t.guardSpecies)==='python')t.guardSpecies='eagle';
  const upgraded=migrateWesternRoster(world,zones);
  const territoryVersion=zones.some(z=>z.spread)?2:1;
  if(env.faunaTerritoryVersion!==territoryVersion&&zones.some(z=>z.territories)){
    let pending=false;
    const relocated=new Set<FaunaSave>();
    for(const f of env.fauna){
      if(!f.alive)continue;
      const zone=zones.find(z=>z.zoneId===f.zoneId),habitat=zone?.territories?.[f.species];
      if(!zone||!habitat||zone.spread&&f.habitatRevision===territoryVersion||!zone.spread&&insideHabitat(f.home,habitat,28)&&insideHabitat(f,habitat,18))continue;
      const neighbors=[...relocated].filter(o=>o.zoneId===zone.zoneId);
      const position=findHabitatPoint(habitat,hashMonster(f.id+':territory'),(x,y)=>
        !env.fauna.some(other=>other!==f&&other.alive&&Math.hypot(x-other.x,y-other.y)<(zone.spread?100:53))&&isOpen(zone,x,y,f.species,f.rank),
        {spread:zone.spread?neighbors.map(o=>o.home):undefined});
      if(!position){pending=true;continue;}
      Object.assign(f,position,zone.spread?westernRanges(habitat,hashMonster(f.id)):{},
        {home:{...position},habitatRevision:territoryVersion,cast:undefined,targetNpcId:undefined,roamTarget:undefined,flower:undefined,state:f.growth?'sleep':'idle'});
      relocated.add(f);
    }
    if(!pending)env.faunaTerritoryVersion=territoryVersion;
  }
  for(const zone of zones){
    if(!fresh&&!zone.normalOnly)continue;
    if(zone.spread){
      refillWesternFauna(world,zone,isOpen);
      continue;
    }
    const seeded=zone.roster&&(fresh||upgraded)?env.fauna.filter(f=>f.zoneId===zone.zoneId&&f.alive).length+
      env.faunaRespawns.filter(q=>q.zoneId===zone.zoneId).length:fresh?0:env.faunaRespawnStats[zone.zoneId]?.totalSpawned??0;
    for(let i=seeded;i<zone.cap;i++)if(!spawnFaunaInZone(world,zone,(...args)=>isOpen(zone,...args)).ok)break;
  }
  return env.fauna;
}
export function refillWesternFauna(world:DivineWorldSave,zone:FaunaZone,isOpen:(zone:FaunaZone,...args:Parameters<CanSpawn>)=>boolean){
  const env=envFor(world),live=env.fauna.filter(f=>f.zoneId===zone.zoneId&&f.alive);
  const pending=env.faunaRespawns.filter(q=>q.zoneId===zone.zoneId);
  if(live.length+pending.length>=zone.cap)return [];
  const dead=pending.map(q=>env.fauna.find(f=>f.id===q.sourceDeathId)).filter(f=>f!==undefined);
  const vacancies=fillSlots(zone,[...live,...dead]).slice(0,zone.cap-live.length-pending.length);
  return vacancies.flatMap(slot=>{
    const result=spawnFaunaInZone(world,zone,(...args)=>isOpen(zone,...args),{required:slot});
    return result.ok?[result.beast]:[];
  });
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
    const required=zone?.roster&&source&&slotIndex(faunaRoster(zone),source)>=0?source:undefined;
    const spawn=zone&&spawnFaunaInZone(world,zone,(...args)=>isOpen(zone,...args),
      {required,origin:zone.spread?source?.home:undefined});
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
export function summonWesternTree(world:DivineWorldSave,zone:FaunaZone,boss:FaunaSave,isOpen:CanSpawn){
  if(boss.species!=='wood-king'||boss.zoneId!==zone.zoneId||!boss.alive)return false;
  const env=envFor(world),required={species:'millennial',rank:'elite'} as const;
  const result=spawnFaunaInZone(world,zone,isOpen,{required,origin:boss,attempts:40});
  if(!result.ok)return false;
  const fallen=env.fauna.find(f=>f.zoneId===zone.zoneId&&!f.alive&&f.species===required.species&&f.rank===required.rank);
  if(fallen){
    env.fauna=env.fauna.filter(f=>f!==fallen);
    env.faunaRespawns=env.faunaRespawns.filter(q=>q.sourceDeathId!==fallen.id);
  }
  if(result.beast.growth)result.beast.growth.phase='active';
  result.beast.state='idle';
  faunaEvent(world,'summon:'+result.beast.id,'wood-king-summon',boss.id,result.beast.id,faunaName(boss)+' gọi Thụ Yêu giữ lãnh địa.');
  return result.beast;
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
  recordCombatDamage(world.npcs.find(n=>n.id===attackerId),beast,now);
  beast.hp=Math.max(0,beast.hp-damage);beast.targetNpcId=attackerId;beast.rageUntil=now+6500;
  beast.targetSeenAt=now;
  beast.injuredUntil=now+2500;
  if(!beast.cast){beast.state='hit';beast.hurtUntil=now+240}
  const drops:GroundDropSave[]=[];
  if(beast.hp===0){
    beast.alive=false;beast.state='dead';beast.cast=undefined;beast.deathAt=now;
    if(!beast.lootCreated&&!env.defeatedBeastIds.includes(id)){
      beast.lootCreated=true;env.defeatedBeastIds.push(id);
      const roll=hashMonster(world.worldId+':'+id)%1000;
      const items:TradeItemId[]=[cfg.loot[roll%cfg.loot.length]];
      if(beast.species==='wood-king'||roll<(beast.rank==='elite'?260:35))items.push(faunaCoreLoot(beast));
      for(const itemId of items){
        const drop:GroundDropSave={id:`drop:${id}:${itemId}`,itemId,count:1,x:beast.x,y:beast.y,sourceId:id,createdDay:world.clock.day,createdMinute:world.clock.minute,status:'ground'};
        env.drops.push(drop);drops.push(drop);
      }
      faunaEvent(world,'fauna-death:'+id,'fauna-defeated',attackerId,id,faunaName(beast)+' bị hạ.');
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
