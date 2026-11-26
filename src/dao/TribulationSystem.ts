import { creditBreakthrough, creditDeath } from './DivinePowerLedger';
import { breakthrough, cultivationStats, cultivationView } from '../systems/CultivationSystem';
import { REALMS } from '../systems/RealmConfig';
import { EconomySystem } from './EconomySystem';
import { equipBestWeapon } from './GiftItemSystem';
import type { DivineWorldSave, SimNPC } from './types';

export interface TribulationSave {
  id:string; realm:number; site:{x:number;y:number;name:string};
  phase:'travel'|'cloud'|'warning'|'strike'|'success'|'failure';
  nextAt:number; strikes:number; roll:number; chance:number;
  anchor?:{x:number;y:number};
}

export const TRIBULATIONS = [
  {waves:2,power:35,cloud:4,warning:3,interval:3,radius:82},
  {waves:3,power:56,cloud:5,warning:3,interval:3,radius:110},
  {waves:4,power:80,cloud:6,warning:4,interval:3,radius:140},
  {waves:5,power:110,cloud:7,warning:4,interval:4,radius:172},
] as const;

export const BREAKTHROUGH_RISK = [
  {base:.935,cap:.97,xpRetained:.78,recovery:240,fatigue:26},
  {base:.86,cap:.94,xpRetained:.74,recovery:300,fatigue:30},
  {base:.77,cap:.89,xpRetained:.70,recovery:390,fatigue:35},
  {base:.67,cap:.83,xpRetained:.65,recovery:480,fatigue:40},
] as const;

export function tribulationChance(npc:SimNPC,realm:number){
  const risk=BREAKTHROUGH_RISK[realm];
  if(!risk)return 0;
  const stats=cultivationStats(npc),mastery=npc.techniqueMastery[npc.technique]??1;
  const ward=EconomySystem.count(npc.inventory,'protective_talisman')>0?.014:0;
  return Math.max(.14,Math.min(risk.cap,risk.base+
    ((npc.talent??50)-78)*.0018+(mastery-4)*.008+(npc.hp/stats.hpMax-1)*.20+
    (npc.mp/stats.mpMax-.85)*.045-(npc.fatigue-10)*.0014+ward));
}

export const worldMinute=(world:DivineWorldSave)=>world.clock.day*1440+world.clock.minute;
export function tribulationLocked(npc:SimNPC){
  const phase=npc.tribulation?.phase;
  return phase==='cloud'||phase==='warning'||phase==='strike';
}
export const needsTribulation=(npc:SimNPC)=>Boolean(TRIBULATIONS[npc.realmIndex]&&
  npc.realmLevel===REALMS[npc.realmIndex].maxLevel&&cultivationView(npc).canBreakthrough);

function deterministicRoll(seed:string){
  let h=2166136261;
  for(let i=0;i<seed.length;i++)h=Math.imul(h^seed.charCodeAt(i),16777619);
  h=Math.imul(h^(h>>>16),0x7feb352d);
  h=Math.imul(h^(h>>>15),0x846ca68b);
  return ((h^(h>>>16))>>>0)/4294967296;
}

function event(world:DivineWorldSave,npc:SimNPC,t:TribulationSave,type:string,description:string,status:'occurred'|'completed'|'failed'='occurred'){
  const id=t.id+':'+type;
  if(world.events.some(row=>row.id===id))return;
  const {x,y}=t.anchor??npc;
  world.events.push({id,day:world.clock.day,minute:world.clock.minute,type,actorId:npc.id,status,description,
    data:{x,y,realm:t.realm+1,strikes:t.strikes}});
  if(world.events.length>400)world.events.splice(0,world.events.length-400);
}

export function planTribulation(world:DivineWorldSave,npc:SimNPC,site:TribulationSave['site']){
  if(npc.tribulation||!npc.alive||npc.ascended||npc.flight||npc.skyStep||npc.actionCooldown>0||!needsTribulation(npc))return false;
  npc.tribulation={id:'tribulation:'+npc.id+':'+((npc.tribulationAttempts??0)+1),realm:npc.realmIndex,site,
    phase:'travel',nextAt:worldMinute(world)+180,strikes:0,roll:0,chance:0};
  return true;
}

export function beginTribulation(world:DivineWorldSave,npc:SimNPC){
  const t=npc.tribulation,config=t&&TRIBULATIONS[t.realm],stats=cultivationStats(npc);
  if(!t||!config||t.phase!=='travel'||!npc.alive||npc.flight||npc.realmIndex!==t.realm||!needsTribulation(npc)||
    npc.hp<stats.hpMax*.5||npc.mp<10||Math.hypot(npc.x-t.site.x,npc.y-t.site.y)>9)return false;
  if(!EconomySystem.remove(npc.inventory,'qi_pill',1))return false;
  npc.tribulationAttempts=(npc.tribulationAttempts??0)+1;
  t.roll=deterministicRoll(world.worldId+':'+t.id);
  t.chance=tribulationChance(npc,t.realm);
  t.phase='cloud';
  t.anchor={x:npc.x,y:npc.y};
  t.nextAt=worldMinute(world)+config.cloud;
  npc.mp-=10;
  npc.action=npc.goalAction='cultivate';
  npc.shortGoal='Tụ Kiếp Vân · '+REALMS[t.realm+1].name;
  event(world,npc,t,'npc-tribulation-start',npc.name+' bắt đầu độ Thiên Kiếp '+REALMS[t.realm+1].name+' tại '+t.site.name+'.');
  return true;
}

export function stepTribulation(world:DivineWorldSave,npc:SimNPC){
  const t=npc.tribulation,config=t&&TRIBULATIONS[t.realm];
  if(!t||!config||t.phase==='travel')return false;
  const now=worldMinute(world);
  if(!npc.alive&&tribulationLocked(npc)){finish(world,npc,t,false);return true;}
  if(t.nextAt>now)return false;
  if(t.phase==='failure'||t.phase==='success'){delete npc.tribulation;return true;}
  if(t.phase==='cloud'){
    t.phase='warning';t.nextAt=now+config.warning;npc.shortGoal='Thiên Lôi Cảnh Báo';
    return true;
  }
  if(t.phase==='strike'&&t.strikes>=config.waves){
    finish(world,npc,t,npc.hp>0&&t.roll<t.chance);
    return true;
  }
  const stats=cultivationStats(npc);
  const ward=EconomySystem.count(npc.inventory,'protective_talisman')>0?6:0;
  const harm=Math.max(4,Math.round(config.power+t.strikes*(4+t.realm*2)-stats.defense*1.4-
    stats.mpRegen*.6-(npc.talent??50)*.09-ward-(npc.techniqueMastery[npc.technique]??1)));
  t.phase='strike';t.strikes++;t.nextAt=now+config.interval;
  npc.hp=Math.max(0,npc.hp-harm);npc.mp=Math.max(0,npc.mp-5-t.realm);
  npc.shortGoal='Chịu Thiên Lôi · '+t.strikes+'/'+config.waves;
  if(npc.hp===0){npc.alive=false;npc.deathCause='Tử vong khi chịu Thiên Kiếp';creditDeath(world,npc,'npc-death',npc.deathCause);}
  if(!npc.alive)finish(world,npc,t,false);
  return true;
}

function finish(world:DivineWorldSave,npc:SimNPC,t:TribulationSave,passed:boolean){
  const old=cultivationStats(npc);
  const prior={realmIndex:npc.realmIndex,realmLevel:npc.realmLevel};
  if(passed)passed=npc.realmIndex===t.realm&&needsTribulation(npc)&&breakthrough(npc).success;
  if(passed){
    creditBreakthrough(world,npc,prior,'Vượt Thiên Kiếp thành công');
    equipBestWeapon(npc);
    const next=cultivationStats(npc);
    npc.hp=Math.min(next.hpMax,npc.hp+next.hpMax-old.hpMax);
    npc.mp=Math.min(next.mpMax,npc.mp+next.mpMax-old.mpMax);
  }else{
    const risk=BREAKTHROUGH_RISK[t.realm];
    npc.xp=Math.floor(npc.xp*risk.xpRetained);
    npc.fatigue=Math.min(100,npc.fatigue+risk.fatigue);
    npc.actionCooldown=risk.recovery;
  }
  t.phase=passed?'success':'failure';
  t.nextAt=worldMinute(world)+3;
  npc.shortGoal=passed?'Vượt Thiên Kiếp thành công':npc.alive?'Thất bại khi độ kiếp · cần hồi phục':'Tử vong khi chịu Thiên Kiếp';
  npc.action='idle';npc.goalAction='rest';npc.actionProgress=0;npc.decisionSlot=undefined;
  event(world,npc,t,passed?'npc-breakthrough':'npc-breakthrough-failed',
    npc.name+(passed?' đã vượt Thiên Kiếp và bước vào '+REALMS[npc.realmIndex].name+'.':
      npc.alive?' thất bại khi vượt Thiên Kiếp.':' tử vong khi chịu Thiên Kiếp.'),passed?'completed':'failed');
}
