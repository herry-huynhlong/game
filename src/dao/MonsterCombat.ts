import { FAUNA_QI_MAX, FAUNA_SPECIES, MONSTER_SKILL_IDS, faunaBehavior, hashMonster, monsterSkill } from './MonsterRegistry';
import { insideHabitat, type FaunaZone } from './FaunaSystem';
import type { EnvironmentSave, FaunaSave, MonsterEffect, MonsterPoint, SimNPC } from './types';
import { faunaHabitat } from '../world/FaunaHabitat.js';
import { RECOVERY } from './CombatRecovery';
import { beginFaunaReturn, canDisguise, updateFaunaReturn, FLOWER_WAKE_MS, FLOWER_RESTORE_MS } from './FaunaRecovery';
import { eastUndead } from './EastFauna';

const dist=(a:MonsterPoint,b:MonsterPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const toward=(a:MonsterPoint,b:MonsterPoint,n:number)=>({x:a.x+(b.x-a.x)*n,y:a.y+(b.y-a.y)*n});
export const monsterFacing=(a:MonsterPoint,b:MonsterPoint)=>Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?(b.x<a.x?'west':'east'):(b.y<a.y?'north':'south');
export const monsterMouth=(f:FaunaSave,aim:MonsterPoint)=>{
  const d=Math.max(1,dist(f,aim));
  return toward(f,aim,Math.min(20,d)/d);
};
const normalized=(a:MonsterPoint,b:MonsterPoint)=>{const d=Math.max(1,dist(a,b));return{x:(b.x-a.x)/d,y:(b.y-a.y)/d}};
const LOST_SIGHT_MS=1250;
export function skillPhase(start:number,now:number,skill:{windup:number;active:number;recover:number}){
  const elapsed=now-start;
  if(elapsed<skill.windup)return 'windup';
  if(elapsed<skill.windup+skill.active)return 'active';
  if(elapsed<skill.windup+skill.active+skill.recover)return 'recover';
  return 'done';
}
const qiCost=(skill:{mode:string;effect?:string;damage:number})=>skill.mode==='summon'?40:skill.mode==='heal'?28:
  skill.mode==='mist'||skill.effect==='root'?25:skill.effect==='drain'?21:skill.mode==='contact'?5:10+Math.floor(skill.damage/3);
export function startMonsterSkill(f:FaunaSave,id:string,target:MonsterPoint,now:number){
  const skill=monsterSkill(id);
  if(!skill||skill.species!==f.species||!f.alive||f.cast||now<(f.attackReadyAt??0)||now<(f.cooldowns?.[id]??0)||(skill.elite&&f.rank!=='elite'))return false;
  const dx=normalized(f,target),d=dist(f,target);
  const cost=qiCost(skill);
  if(d<skill.min||d>skill.max||(f.qi??FAUNA_QI_MAX)<cost)return false;
  f.qi=(f.qi??FAUNA_QI_MAX)-cost;
  f.direction=monsterFacing(f,target);
  f.sequence=(f.sequence??0)+1;
  const reach=['leap','burrow'].includes(skill.mode)?Math.min(Math.max(0,d-(id==='eagle-talon'?29:23)),skill.reach):['dash','tongue','projectile'].includes(skill.mode)?skill.reach:Math.min(d,skill.reach);
  f.cast={skillId:id,sequence:f.sequence,started:now,origin:{x:f.x,y:f.y},aim:{x:f.x+dx.x*reach,y:f.y+dx.y*reach},activated:false,hitIds:[]};
  f.lastSkill=id;f.state='attack';
  (f.cooldowns??={})[id]=now+skill.cooldown;
  f.attackReadyAt=now+skill.windup+skill.active+skill.recover;
  return true;
}
export function segmentDistance(p:MonsterPoint,a:MonsterPoint,b:MonsterPoint){
  const x=b.x-a.x,y=b.y-a.y,length=x*x+y*y;
  const t=length?Math.max(0,Math.min(1,((p.x-a.x)*x+(p.y-a.y)*y)/length)):0;
  return dist(p,{x:a.x+x*t,y:a.y+y*t});
}
type MovementPort={
  begin(now:number,actors:FaunaSave[]):void;
  route(actor:FaunaSave,goal:MonsterPoint,step:number,speed:number):string;
  approach(actor:FaunaSave,target:SimNPC):MonsterPoint|undefined;
  halt(actor:FaunaSave,reason?:string,preserveProgress?:boolean):void;
  skill(actor:FaunaSave,point:MonsterPoint):boolean;
};
type CombatPort={
  movement?:MovementPort;
  targets:(point:MonsterPoint,radius:number)=>SimNPC[];
  move:(f:FaunaSave,target:MonsterPoint,avoid:boolean)=>boolean;
  open:(f:FaunaSave,point:MonsterPoint)=>boolean;
  line:(a:MonsterPoint,b:MonsterPoint)=>boolean;
  safe:(point:MonsterPoint)=>boolean;
  damage:(target:SimNPC,damage:number,sourceId:string,eventId:string)=>void;
  effect?:(target:SimNPC,effect:MonsterEffect,sourceId:string,now:number)=>void;
  avoid:(target:SimNPC,f:FaunaSave)=>void;
  threat:(target:SimNPC,f:FaunaSave)=>boolean;
  daylight?:()=>boolean;
  cadence?:(f:FaunaSave)=>number;
  guardSpot?:(f:FaunaSave)=>MonsterPoint|undefined;
  canMobilize?:(f:FaunaSave)=>boolean;
  formChanged?:(f:FaunaSave)=>void;
  canSummon?:(f:FaunaSave)=>boolean;
  summon?:(f:FaunaSave,zone:FaunaZone)=>void;
  sound?:(id:string,point:MonsterPoint)=>void;
  push?:(target:SimNPC,source:FaunaSave)=>void;
};

export class MonsterCombat {
  private noSlot=new Map<string,{target:string;since:number}>();
  private ignored=new Map<string,{target:string;until:number}>();
  private lastMoveAt=new Map<string,number>();
  constructor(private env:EnvironmentSave,readonly zones:FaunaZone[],private port:CombatPort){}
  tick(now:number,step:number){
    const all=this.env.fauna??[];
    this.port.movement?.begin(now,all);
    for(const f of all){
      if(!f.alive){this.noSlot.delete(f.id);this.ignored.delete(f.id);this.lastMoveAt.delete(f.id);continue;}
      const zone=faunaHabitat(this.zones.find(z=>z.zoneId===f.zoneId),f.species);
      if(!zone)continue;
      const cadence=this.port.cadence?.(f)??step;
      const last=this.lastMoveAt.get(f.id)??now-cadence;
      const elapsed=Math.min(cadence,Math.max(step,now-last));
      if(!f.cast&&!f.targetNpcId&&now-last<cadence)continue;
      this.lastMoveAt.set(f.id,now);
      if(f.species==='eagle'){
        const skill=f.cast&&monsterSkill(f.cast.skillId),phase=skill&&skillPhase(f.cast!.started,now,skill);
        const landing=dist(f,f.home)<15&&(!f.targetNpcId&&(!f.roamTarget||dist(f,f.roamTarget)<10));
        const swooping=skill&&['leap','breath','gust','rain'].includes(skill.mode)&&phase!=='windup';
        const desired=swooping?0:now<(f.hasteUntil??0)?52:landing?0:30;
        const altitude=f.altitude??0;
        const next=altitude+Math.sign(desired-altitude)*Math.min(Math.abs(desired-altitude),elapsed*.13);
        if(next<12&&altitude>=12&&!this.port.open(f,f))f.altitude=12;
        else f.altitude=next;
      }
      const since=now-(f.qiAt??now);
      if(since>=500||f.qiAt===undefined){f.qi=Math.min(FAUNA_QI_MAX,(f.qi??FAUNA_QI_MAX)+since*.006);f.qiAt=now;}
      if(f.cast){
        if(f.cast.targetId&&(!insideHabitat(f,zone,8)||dist(f.home,f)>this.leash(f,zone)+12||!this.currentTarget(f,zone,now,f.cast.targetId))){
          this.abandon(f,zone,now);
        }else{this.port.movement?.halt(f,'đang thi triển');this.cast(f,now);continue;}
      }
      if(now<(f.hurtUntil??0)&&(!f.growth||f.growth.phase==='active')){this.port.movement?.halt(f,'đang bị thương');f.state='hit';continue;}
      if(now>=(f.nextThinkAt??0)){
        f.nextThinkAt=now+200+hashMonster(f.id)%70;
        const form=f.flower?.phase;
        this.decide(f,zone,all,now);
        if(form!==f.flower?.phase)this.port.formChanged?.(f);
      }
      const goal=f.roamTarget;
      if(!goal||FAUNA_SPECIES[f.species].speed===0){this.port.movement?.halt(f);continue;}
      if(dist(f,goal)<4){this.port.movement?.halt(f,'đã đến');continue;}
      const speed=FAUNA_SPECIES[f.species].speed*(f.rank==='elite'?1.12:1)*(f.state==='retreat'?1.28:1)*
        (now<(f.hasteUntil??0)?1.46:now<(f.injuredUntil??0)?.81:1);
      // A toad gathers its legs between short hops. Its feet still sweep on the ground.
      const hop=f.species==='toad'&&((now+hashMonster(f.id))%660)<210?0:1;
      if(!hop){this.port.movement?.halt(f,'chuẩn bị bước nhảy',true);continue;}
      if(this.port.movement){
        const outcome=this.port.movement.route(f,goal,elapsed,speed);
        if(outcome==='unreachable'){
          if(f.recovery)updateFaunaReturn(f,zone,now,this.port.open,true);
          else this.abandon(f,zone,now);
        }
        continue;
      }
      if(!this.move(f,toward(f,goal,Math.min(1,speed*elapsed/1000/dist(f,goal))),zone,true)&&f.state==='patrol'){
        f.roamTarget=undefined;f.nextThinkAt=now+240;
      }
    }
    this.tickEffects(now,step);
  }
  private abandon(f:FaunaSave,z:FaunaZone,now:number){
    const target=f.targetNpcId;
    this.noSlot.delete(f.id);
    if(target)this.ignored.set(f.id,{target,until:now+6600});
    if(target||canDisguise(f)||f.hp<f.maxHp*RECOVERY.restBeast)beginFaunaReturn(f,z,now);
    else {f.roamTarget=undefined;f.state='idle';}
    f.nextThinkAt=now+250;
  }
  private currentTarget(f:FaunaSave,z:FaunaZone,now:number,id:string,targets?:SimNPC[]){
    const leash=this.leash(f,z);
    const options=targets??this.port.targets(f,leash*2+26);
    const target=options.find(n=>n.id===id&&n.alive&&!n.ascended&&!this.port.safe(n)&&insideHabitat(n,z,15)&&dist(f.home,n)<=leash+12);
    if(!target)return undefined;
    if(this.port.line(f,target))f.targetSeenAt=now;
    f.targetSeenAt??=now;
    return now-f.targetSeenAt<=LOST_SIGHT_MS?target:undefined;
  }
  private leash(f:FaunaSave,z:FaunaZone){
    const limit=FAUNA_SPECIES[f.species].leash;
    return f.leashRadius??Math.min(limit,z.leash??limit);
  }
  private move(f:FaunaSave,goal:MonsterPoint,z:FaunaZone,avoid:boolean){
    if(!insideHabitat(goal,z,15)||this.port.safe(goal))return false;
    return this.port.move(f,goal,avoid);
  }
  private decide(f:FaunaSave,z:FaunaZone,all:FaunaSave[],now:number){
    const cfg=FAUNA_SPECIES[f.species];
    const behavior=faunaBehavior(f.species),rooted=cfg.speed===0;
    const leash=this.leash(f,z);
    const ignored=this.ignored.get(f.id);
    if(ignored&&ignored.until<=now)this.ignored.delete(f.id);
    const local=this.port.targets(f,Math.max(cfg.notice,leash*2+26)).filter(n=>n.alive&&!n.ascended&&!this.port.safe(n)&&insideHabitat(n,z,15)&&!(ignored&&ignored.until>now&&ignored.target===n.id));
    const hadTarget=f.targetNpcId;
    let target=hadTarget?this.currentTarget(f,z,now,hadTarget,local):undefined;
    const outOfBounds=!insideHabitat(f,z,8)||dist(f.home,f)>leash+12;
    if(outOfBounds)target=undefined;
    const sleepingAtDay=Boolean(z.nocturnal&&this.port.daylight?.()&&f.species!=='flower'&&!hadTarget);
    const restingWeak=f.recovery?.phase==='resting'&&!canDisguise(f)&&f.hp<f.maxHp*RECOVERY.resumeBeast;
    const notice=z.notice??cfg.notice;
    const nightWake=eastUndead(f.species)&&this.port.daylight?.()===false;
    if(!target&&!outOfBounds&&!sleepingAtDay&&!restingWeak&&f.species==='wolf'){
      const peer=all.find(other=>other.id!==f.id&&other.alive&&other.species==='wolf'&&other.zoneId===f.zoneId&&other.targetNpcId&&dist(f,other)<140);
      if(peer)target=local.find(n=>n.id===peer.targetNpcId&&dist(f.home,n)<leash&&this.port.line(f,n));
    }
    const detection=behavior==='neutral'?0:(behavior==='territorial'?notice*.82:notice)-(f.recovery?.phase==='restoring'?12:0);
    if(!target&&!outOfBounds&&!sleepingAtDay&&!restingWeak)target=local.filter(n=>dist(f,n)<detection&&dist(f.home,n)<leash&&this.port.line(f,n)).sort((a,b)=>dist(f,a)-dist(f,b))[0];
    if(!target){
      const awakeFlower=f.species==='flower'&&f.flower&&
        (['mobile','returning','rooting'].includes(f.flower.phase)||f.flower.phase==='waking'&&now-f.flower.at>FLOWER_WAKE_MS*.55);
      const awakePlant=!nightWake&&(f.growth?.phase==='active'||f.growth?.phase==='waking')||f.species==='vine'&&f.state!=='sleep';
      const dormantFlower=f.species==='flower'&&(!f.flower||['rooted','alert','waking'].includes(f.flower.phase));
      if(sleepingAtDay&&f.state==='sleep'&&!f.recovery&&f.hp>=f.maxHp*RECOVERY.resumeBeast)return;
      if(outOfBounds||awakeFlower||awakePlant||!dormantFlower&&(hadTarget||sleepingAtDay||f.hp<f.maxHp*RECOVERY.restBeast))
        beginFaunaReturn(f,z,now);
      if(nightWake&&f.recovery?.phase==='resting'&&f.hp>=f.maxHp*RECOVERY.resumeBeast)f.recovery=undefined;
      if(updateFaunaReturn(f,z,now,this.port.open))return;
    }else if(f.recovery){
      f.recovery=undefined;
      if(f.flower?.phase==='returning'){
        f.flower={phase:'mobile',at:now};f.roamTarget=undefined;
      }else if(f.flower?.phase==='rooting'){
        const remainder=Math.max(0,1-(now-f.flower.at)/FLOWER_RESTORE_MS);
        f.flower={phase:'waking',at:now-Math.round(FLOWER_WAKE_MS*remainder)};
        f.state='awakening';
      }
    }
    if(f.species==='flower'&&this.flowerStage(f,target,now))return;
    if(f.growth&&f.growth.phase!=='active'){
      const growth=f.growth;
      f.roamTarget=undefined;
      if(growth.phase==='normal'||growth.phase==='spirit'){
        if(now>=(growth.nextQiAt??0)){growth.qi=Math.min(100,growth.qi+5);growth.nextQiAt=now+8000;}
        growth.phase=growth.qi>=75?'dormant':growth.qi>=45?'spirit':'normal';
      }
      if(growth.phase==='waking'){
        if(!target&&!nightWake){beginFaunaReturn(f,z,now);return;}
        if(now<(growth.wakeAt??0)){f.state='awakening';return;}
        growth.phase='active';delete growth.wakeAt;
      }else if(nightWake||target&&(target.id===f.targetNpcId||growth.phase==='dormant'&&
        (f.species!=='wood-king'||target.realmIndex>=2||dist(f,target)<68))){
        growth.phase='waking';growth.wakeAt=now+(f.species==='wood-king'?1950:950);f.state='awakening';return;
      }else{f.state='sleep';return;}
    }
    if(behavior==='timid'&&target){
      const away=normalized(target,f);
      const escape={x:f.x+away.x*90,y:f.y+away.y*90};
      const open=insideHabitat(escape,z,22)&&dist(f.home,escape)<leash&&this.port.open(f,escape);
      const reaction=now<(f.injuredUntil??0)?'stag-cleanse':f.hp<f.maxHp*.55?'stag-heal':
        f.targetNpcId===target.id&&!open&&dist(f,target)<38?'antler-deflect':'stag-haste';
      if((reaction!=='stag-heal'||(f.healSpent??0)<f.maxHp*.25)&&startMonsterSkill(f,reaction,target,now))return;
      f.targetNpcId=undefined;f.state='retreat';
      f.roamTarget=open?escape:f.home;
      return;
    }
    if(!target){
      if(f.targetNpcId){f.targetNpcId=undefined;f.roamTarget=rooted?undefined:f.home;f.state=rooted?'idle':'return';return;}
      if(rooted){
        f.roamTarget=undefined;f.state='idle';
        return;
      }
      if(f.roamTarget&&dist(f,f.roamTarget)<6){f.roamTarget=undefined;f.state='idle';f.nextThinkAt=now+1100+hashMonster(f.id)%1700;return;}
      if(!f.roamTarget){
        const angle=(hashMonster(f.id+':'+Math.floor(now/1000))%628)/100;
        const reach=f.patrolRadius??Math.min(z.activityRadius??160,55+hashMonster(f.id+':patrol')%105);
        const routine=(Math.floor(now/7000)+hashMonster(f.id))%3;
        const den=this.port.guardSpot?.(f)??(z.anchorDx===undefined||z.anchorDy===undefined?f.home:{x:z.x+z.anchorDx,y:z.y+z.anchorDy});
        const pack=f.species==='wolf'&&routine===2?all.find(peer=>peer.alive&&peer.zoneId===f.zoneId&&
          peer.species===f.species&&peer.id<f.id&&insideHabitat(peer,z,27)&&dist(peer,f.home)<leash):undefined;
        const center=pack??f.home,spread=pack?Math.min(65,reach):reach;
        const point=routine===0&&dist(f.home,den)<=leash?den:{x:center.x+Math.cos(angle)*spread,y:center.y+Math.sin(angle)*spread};
        f.roamTarget=insideHabitat(point,z,24)&&this.port.open(f,point)?point:f.home;
      }
      f.state='patrol';return;
    }
    const range=dist(f,target);
    if(f.species==='vine'&&f.state==='sleep'){
      f.targetNpcId=target.id;f.targetSeenAt=now;f.alertUntil=now+750;f.state='awakening';return;
    }
    if(f.targetNpcId!==target.id||f.state==='idle'||f.state==='patrol'){
      f.state='detect';f.targetNpcId=target.id;f.roamTarget=undefined;f.alertUntil=now+440;
      f.targetSeenAt=now;
      if(this.port.threat(target,f))this.port.avoid(target,f);
      return;
    }
    if(now<(f.alertUntil??0)){if(f.state!=='awakening')f.state='alert';f.roamTarget=undefined;return;}
    if(!rooted&&f.hp/f.maxHp<cfg.retreat&&now>(f.rageUntil??0)-4300){
      if(f.species==='flower'||canDisguise(f)){
        this.abandon(f,z,now);
      }else{
        this.ignored.set(f.id,{target:target.id,until:now+6600});
        beginFaunaReturn(f,z,now);f.state='retreat';
      }
      return;
    }
    const allies=all.filter(other=>other!==f&&other.alive&&other.species===f.species&&other.zoneId===f.zoneId&&dist(f,other)<140);
    const health=f.hp/f.maxHp;
    const options=MONSTER_SKILL_IDS.filter(id=>{
      const skill=monsterSkill(id)!;
      if(skill.species!==f.species||skill.elite&&f.rank!=='elite'||range<skill.min||range>skill.max||now<(f.cooldowns?.[id]??0)||
        (f.qi??FAUNA_QI_MAX)<qiCost(skill)||!this.port.line(f,target))return false;
      if(id==='pack-roar')return allies.some(ally=>!ally.targetNpcId||now>=(ally.buffUntil??0));
      if(id==='phantom-pounce')return allies.some(ally=>ally.targetNpcId===target.id);
      if(skill.mode==='armor')return health<.8&&now>=(f.armorUntil??0);
      if(skill.mode==='rage')return health<.39&&now>=(f.buffUntil??0);
      if(skill.mode==='heal')return health<(id==='king-heal'?.38:.56)&&(f.healSpent??0)<f.maxHp*.25;
      if(skill.effect==='root'&&now<(target.monsterAfflictions?.rootGuardUntil??0))return false;
      if(skill.effect==='drain'&&target.mp<12)return false;
      if(skill.effect==='lifesteal'&&health>.78)return false;
      if(skill.mode==='burrow')return this.port.open(f,toward(f,target,Math.max(0,1-27/Math.max(1,range))));
      if(id==='poison-mist')return insideHabitat(target,z,20);
      if(id==='skyfall')return insideHabitat(target,z,20)&&this.port.open(f,{x:target.x+(f.x-target.x)/Math.max(1,range)*28,y:target.y+(f.y-target.y)/Math.max(1,range)*28});
      if(id==='eagle-rise')return health<.72;
      if(id==='eagle-talon'||id==='eagle-breath'||id==='eagle-wing'||id==='eagle-rain')return this.port.open(f,f);
      if(id==='king-call')return f.hp/f.maxHp<.64&&this.port.canSummon?.(f);
      return true;
    });
    const score=(id:string)=>{
      const skill=monsterSkill(id)!;
      return id==='eagle-rain'?74:id==='eagle-rise'?47:skill.mode==='summon'?100:skill.mode==='heal'?88:skill.mode==='rage'?80:id==='pack-roar'?74:
        skill.mode==='armor'?66:skill.effect==='root'?58+local.length*4:skill.effect==='drain'?52:
        skill.effect==='lifesteal'?60:skill.mode==='burrow'?45:skill.damage+Number(skill.mode==='area')*local.length*9;
    };
    const selection=options.sort((a,b)=>score(b)-score(a))[0];
    if(selection&&startMonsterSkill(f,selection,target,now)){
      f.cast!.targetId=target.id;this.noSlot.delete(f.id);f.roamTarget=undefined;return;
    }
    f.state='chase';
    if(rooted){f.state='alert';f.roamTarget=undefined;return;}
    const preferred=f.species==='toad'?107:f.species==='wolf'?45:f.species==='boar'?50:42;
    if(range<=preferred&&range>=(f.species==='toad'?48:24)&&this.port.line(f,target)){
      this.noSlot.delete(f.id);f.roamTarget=undefined;return;
    }
    if(this.port.movement){
      f.roamTarget=this.port.movement.approach(f,target);
      const wait=this.noSlot.get(f.id);
      if(f.roamTarget)this.noSlot.delete(f.id);
      else if(wait?.target!==target.id)this.noSlot.set(f.id,{target:target.id,since:now});
      else if(now-wait.since>=1200)this.abandon(f,z,now);
      return;
    }
    const vec=normalized(target,f),side=f.species==='wolf'?(hashMonster(f.id)%3-1)*23:0;
    f.roamTarget={x:target.x+vec.x*29-vec.y*side,y:target.y+vec.y*29+vec.x*side};
  }
  private flowerStage(f:FaunaSave,target:SimNPC|undefined,now:number){
    const form=f.flower??={phase:'rooted',at:now};
    if(form.phase==='mobile'&&target)return false;
    f.roamTarget=undefined;
    if(!target){
      if(form.phase!=='rooted')f.flower={phase:'rooted',at:now};
      f.targetNpcId=undefined;f.targetSeenAt=undefined;f.state='sleep';return true;
    }
    f.targetNpcId=target.id;f.direction=monsterFacing(f,target);
    if(form.phase!=='alert'&&form.phase!=='waking'){
      f.flower={phase:'alert',at:now};f.state='alert';
      if(this.port.threat(target,f))this.port.avoid(target,f);
      return true;
    }
    if(form.phase==='alert'&&now-form.at>=300){f.flower={phase:'waking',at:now};f.state='awakening';return true;}
    if(form.phase==='waking'&&now-form.at>=FLOWER_WAKE_MS&&this.port.canMobilize?.(f)!==false){
      f.flower={phase:'mobile',at:now};f.state='chase';return false;
    }
    return true;
  }
  private cast(f:FaunaSave,now:number){
    const cast=f.cast!,skill=monsterSkill(cast.skillId),parent=this.zones.find(z=>z.zoneId===f.zoneId),z=faunaHabitat(parent,f.species);
    if(!skill||!z||!parent){f.cast=undefined;return;}
    const phase=skillPhase(cast.started,now,skill);
    if(phase==='done'){f.cast=undefined;f.state='idle';return;}
    f.state=phase==='recover'?'recover':'attack';
    const age=now-cast.started-skill.windup;
    if(age<0)return;
    const damage=Math.floor(skill.damage*(f.rank==='elite'?1.12:1)*(now<(f.buffUntil??0)?1.22:1));
    const id=f.id+':'+cast.sequence;
    const hit=(p:MonsterPoint,radius:number,from=p)=>{
      for(const target of this.port.targets(toward(from,p,.5),radius+dist(from,p)/2+8)){
        if(cast.hitIds.includes(target.id)||this.port.safe(target)||segmentDistance(target,from,p)>radius||!this.port.line(from,target))continue;
        cast.hitIds.push(target.id);const hp=target.hp;this.port.damage(target,damage,f.id,id+':'+target.id);
        if(skill.mode==='gust'&&target.alive)this.port.push?.(target,f);
        if(skill.effect==='lifesteal')f.hp=Math.min(f.maxHp,f.hp+Math.max(0,(hp-target.hp)*.45));
        else if(skill.effect&&target.alive)this.port.effect?.(target,skill.effect,f.id,now);
      }
    };
    const mist=(p:MonsterPoint,shower?:number)=>{
      if(!insideHabitat(p,z,12)||this.port.safe(p))return;
      this.env.monsterHazards!.push({id:'mist:'+id+(shower===undefined?'':':'+shower),sourceId:f.id,position:{x:p.x,y:p.y},radius:skill.radius,damage:skill.mode==='leap'?4:damage,nextPulse:now+580,expires:now+4800,effect:skill.effect,element:skill.element,...(shower===undefined?{}:{group:id})});
    };
    if(!cast.activated){
      cast.activated=true;this.port.sound?.(cast.skillId,f);
      switch(skill.mode){
        case 'contact': hit(cast.aim,skill.radius,f);break;
        case 'area': hit(f,skill.radius);break;
        case 'gust': hit(f,skill.radius);break;
        case 'breath': hit(cast.aim,skill.radius,f);break;
        case 'rain': {
          mist(cast.aim,0);
          mist({x:cast.aim.x+32,y:cast.aim.y-24},1);
          mist({x:cast.aim.x-32,y:cast.aim.y+24},2);
          break;
        }
        case 'roar': for(const ally of this.env.fauna??[])if(ally.alive&&ally.species==='wolf'&&ally.zoneId===f.zoneId&&dist(ally,f)<skill.radius){
          ally.buffUntil=now+5600;if(f.targetNpcId&&!ally.targetNpcId)ally.targetNpcId=f.targetNpcId;
        }break;
        case 'armor': f.armorUntil=now+5900;break;
        case 'rage': f.buffUntil=now+7200;f.hasteUntil=now+4200;break;
        case 'haste': f.hasteUntil=now+3100;break;
        case 'cleanse': f.injuredUntil=undefined;f.hurtUntil=undefined;break;
        case 'heal': {
          const healed=Math.max(0,Math.min(f.maxHp-f.hp,f.maxHp*.12,f.maxHp*.25-(f.healSpent??0)));
          f.healSpent=(f.healSpent??0)+healed;f.hp+=healed;break;
        }
        case 'summon': this.port.summon?.(f,parent);break;
        case 'mist': mist(cast.aim);break;
        case 'projectile': this.env.monsterProjectiles!.push({id:'projectile:'+id,sourceId:f.id,position:monsterMouth(f,cast.aim),direction:normalized(f,cast.aim),range:skill.reach,damage,effect:skill.effect,element:skill.element});break;
      }
    }
    if(skill.mode==='tongue'&&phase==='active'){
      const progress=Math.min(1,age/(skill.active*.48),(skill.active-age)/(skill.active*.28));
      hit(toward(f,cast.aim,Math.max(0,progress)),skill.radius,monsterMouth(f,cast.aim));
    }
    if(['dash','leap','burrow'].includes(skill.mode)&&phase==='active'&&!cast.stopped){
      const to=toward(cast.origin,cast.aim,Math.min(1,age/Math.max(1,skill.active-50)));
      const movement=dist(f,to);
      if(movement>.5){if(this.port.movement)this.port.movement.skill(f,to);else this.move(f,to,z,false);if(dist(f,to)>2.5)cast.stopped=true;}
      if(skill.mode==='dash')hit(f,skill.radius+11);
    }
    if(skill.mode==='burrow'&&(phase==='recover'||cast.stopped)&&!cast.hitIds.includes('emerge')){
      cast.hitIds.push('emerge');if(!cast.stopped)hit(f,skill.radius+10);
    }
    if(skill.mode==='leap'&&(phase==='recover'||cast.stopped)&&!cast.hitIds.includes('landing')){
      cast.hitIds.push('landing');hit(f,skill.radius);if(f.species!=='eagle')mist(f);
    }
  }
  private tickEffects(now:number,step:number){
    const affected=new Set<string>();
    this.env.monsterHazards=this.env.monsterHazards!.filter(h=>{
      if(now>=h.expires)return false;
      if(now>=h.nextPulse){
        h.nextPulse+=850;
        for(const n of this.port.targets(h.position,h.radius))if(!this.port.safe(n)&&dist(h.position,n)<=h.radius&&this.port.line(h.position,n)){
          const key=h.group&&h.group+':'+n.id;
          if(key&&affected.has(key))continue;
          if(key)affected.add(key);
          this.port.damage(n,h.damage,h.sourceId,h.id+':'+now+':'+n.id);
          if(h.effect&&n.alive)this.port.effect?.(n,h.effect,h.sourceId,now);
        }
      }
      return true;
    });
    this.env.monsterProjectiles=this.env.monsterProjectiles!.filter(p=>{
      const advance=Math.min(p.range,step*.225);
      const end={x:p.position.x+p.direction.x*advance,y:p.position.y+p.direction.y*advance};
      if(advance<=0||this.port.safe(end)||!this.port.line(p.position,end))return false;
      const hit=this.port.targets(end,advance+11).find(n=>!this.port.safe(n)&&segmentDistance(n,p.position,end)<=11);
      if(hit){this.port.damage(hit,p.damage,p.sourceId,p.id+':'+hit.id);if(p.effect&&hit.alive)this.port.effect?.(hit,p.effect,p.sourceId,now);return false;}
      p.position=end;p.range-=advance;return p.range>0;
    });
  }
}
