import { FAUNA_SPECIES, MONSTER_SKILL_IDS, hashMonster, monsterSkill } from './MonsterRegistry';
import { insideHabitat, type FaunaZone } from './FaunaSystem';
import type { EnvironmentSave, FaunaSave, MonsterPoint, SimNPC } from './types';

const dist=(a:MonsterPoint,b:MonsterPoint)=>Math.hypot(a.x-b.x,a.y-b.y);
const toward=(a:MonsterPoint,b:MonsterPoint,n:number)=>({x:a.x+(b.x-a.x)*n,y:a.y+(b.y-a.y)*n});
export const monsterFacing=(a:MonsterPoint,b:MonsterPoint)=>Math.abs(b.x-a.x)>Math.abs(b.y-a.y)?(b.x<a.x?'west':'east'):(b.y<a.y?'north':'south');
export const monsterMouth=(f:FaunaSave,aim:MonsterPoint)=>{
  const d=Math.max(1,dist(f,aim));
  return toward(f,aim,Math.min(20,d)/d);
};
const normalized=(a:MonsterPoint,b:MonsterPoint)=>{const d=Math.max(1,dist(a,b));return{x:(b.x-a.x)/d,y:(b.y-a.y)/d}};
export function skillPhase(start:number,now:number,skill:{windup:number;active:number;recover:number}){
  const elapsed=now-start;
  if(elapsed<skill.windup)return 'windup';
  if(elapsed<skill.windup+skill.active)return 'active';
  if(elapsed<skill.windup+skill.active+skill.recover)return 'recover';
  return 'done';
}
export function startMonsterSkill(f:FaunaSave,id:string,target:MonsterPoint,now:number){
  const skill=monsterSkill(id);
  if(!skill||skill.species!==f.species||!f.alive||f.cast||now<(f.attackReadyAt??0)||now<(f.cooldowns?.[id]??0)||(skill.elite&&f.rank!=='elite'))return false;
  const dx=normalized(f,target),d=dist(f,target);
  if(d<skill.min||d>skill.max)return false;
  f.direction=monsterFacing(f,target);
  f.sequence=(f.sequence??0)+1;
  const reach=skill.mode==='leap'?Math.min(Math.max(0,d-25),skill.reach):['dash','tongue','projectile'].includes(skill.mode)?skill.reach:Math.min(d,skill.reach);
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
  avoid:(target:SimNPC,f:FaunaSave)=>void;
  threat:(target:SimNPC,f:FaunaSave)=>boolean;
  sound?:(id:string,point:MonsterPoint)=>void;
};

export class MonsterCombat {
  private noSlot=new Map<string,{target:string;since:number}>();
  private ignored=new Map<string,{target:string;until:number}>();
  constructor(private env:EnvironmentSave,readonly zones:FaunaZone[],private port:CombatPort){}
  tick(now:number,step:number){
    const all=this.env.fauna??[];
    this.port.movement?.begin(now,all);
    for(const f of all){
      if(!f.alive){this.noSlot.delete(f.id);this.ignored.delete(f.id);continue;}
      const zone=this.zones.find(z=>z.zoneId===f.zoneId);
      if(!zone)continue;
      if(f.cast){this.port.movement?.halt(f,'đang thi triển');this.cast(f,now);continue;}
      if(now<(f.hurtUntil??0)){this.port.movement?.halt(f,'đang bị thương');f.state='hit';continue;}
      if(now>=(f.nextThinkAt??0)){
        f.nextThinkAt=now+200+hashMonster(f.id)%70;
        this.decide(f,zone,all,now);
      }
      const goal=f.roamTarget;
      if(!goal){this.port.movement?.halt(f);continue;}
      if(dist(f,goal)<4){this.port.movement?.halt(f,'đã đến');continue;}
      const speed=FAUNA_SPECIES[f.species].speed*(f.rank==='elite'?1.12:1)*(f.state==='retreat'?1.28:1);
      // A toad gathers its legs between short hops. Its feet still sweep on the ground.
      const hop=f.species==='toad'&&((now+hashMonster(f.id))%660)<210?0:1;
      if(!hop){this.port.movement?.halt(f,'chuẩn bị bước nhảy',true);continue;}
      if(this.port.movement){
        const outcome=this.port.movement.route(f,goal,step,speed);
        if(outcome==='unreachable'){
          this.abandon(f,now);
        }
        continue;
      }
      if(!this.move(f,toward(f,goal,Math.min(1,speed*step/1000/dist(f,goal))),zone,true)&&f.state==='patrol'){
        f.roamTarget=undefined;f.nextThinkAt=now+240;
      }
    }
    this.tickEffects(now,step);
  }
  private abandon(f:FaunaSave,now:number){
    const target=f.targetNpcId;
    this.noSlot.delete(f.id);
    if(target)this.ignored.set(f.id,{target,until:now+6600});
    f.targetNpcId=undefined;f.roamTarget=target?f.home:undefined;
    f.state=target?'return':'idle';f.nextThinkAt=now+1200;
  }
  private move(f:FaunaSave,goal:MonsterPoint,z:FaunaZone,avoid:boolean){
    if(!insideHabitat(goal,z,15)||this.port.safe(goal))return false;
    return this.port.move(f,goal,avoid);
  }
  private decide(f:FaunaSave,z:FaunaZone,all:FaunaSave[],now:number){
    const cfg=FAUNA_SPECIES[f.species];
    const leash=Math.min(cfg.leash,z.leash??cfg.leash);
    const ignored=this.ignored.get(f.id);
    if(ignored&&ignored.until<=now)this.ignored.delete(f.id);
    const local=this.port.targets(f,Math.max(cfg.notice,leash)).filter(n=>n.alive&&!n.ascended&&!this.port.safe(n)&&insideHabitat(n,z,15)&&!(ignored&&ignored.until>now&&ignored.target===n.id));
    let target=local.find(n=>n.id===f.targetNpcId&&dist(f.home,n)<=leash+42);
    if(!target&&f.species==='wolf'){
      const peer=all.find(other=>other.id!==f.id&&other.alive&&other.species==='wolf'&&other.zoneId===f.zoneId&&other.targetNpcId&&dist(f,other)<140);
      if(peer)target=local.find(n=>n.id===peer.targetNpcId&&dist(f.home,n)<leash&&this.port.line(f,n));
    }
    if(!target)target=local.filter(n=>dist(f,n)<cfg.notice&&dist(f.home,n)<leash&&this.port.line(f,n)).sort((a,b)=>dist(f,a)-dist(f,b))[0];
    if(f.state==='retreat'&&dist(f,f.home)>14){
      f.roamTarget=f.home;return;
    }
    if(dist(f,f.home)>leash||f.state==='return'&&dist(f,f.home)>22){
      f.state='return';f.roamTarget=f.home;f.targetNpcId=undefined;return;
    }
    if(!target){
      if(f.targetNpcId){f.targetNpcId=undefined;f.roamTarget=f.home;f.state='return';return;}
      if(f.roamTarget&&dist(f,f.roamTarget)<6){f.roamTarget=undefined;f.state='idle';f.nextThinkAt=now+1100+hashMonster(f.id)%1700;return;}
      if(!f.roamTarget){
        const angle=(hashMonster(f.id+':'+Math.floor(now/1000))%628)/100;
        const reach=Math.min(z.activityRadius??160,55+hashMonster(f.id+':patrol')%105);
        const point={x:f.home.x+Math.cos(angle)*reach,y:f.home.y+Math.sin(angle)*reach};
        f.roamTarget=insideHabitat(point,z,24)&&this.port.open(f,point)?point:f.home;
      }
      f.state='patrol';return;
    }
    const range=dist(f,target);
    if(f.targetNpcId!==target.id||f.state==='idle'||f.state==='patrol'){
      f.state='detect';f.targetNpcId=target.id;f.roamTarget=undefined;f.alertUntil=now+440;
      if(this.port.threat(target,f))this.port.avoid(target,f);
      return;
    }
    if(now<(f.alertUntil??0)){f.state='alert';f.roamTarget=undefined;return;}
    if(f.hp/f.maxHp<cfg.retreat&&now>(f.rageUntil??0)-4300){
      f.state='retreat';f.roamTarget=f.home;f.targetNpcId=undefined;f.nextThinkAt=now+800;
      return;
    }
    const options=MONSTER_SKILL_IDS.filter(id=>{
      const skill=monsterSkill(id)!;
      if(skill.species!==f.species||skill.elite&&f.rank!=='elite'||range<skill.min||range>skill.max||now<(f.cooldowns?.[id]??0)||!this.port.line(f,target))return false;
      if(id==='pack-roar')return all.some(w=>w!==f&&w.alive&&w.species==='wolf'&&w.zoneId===f.zoneId&&dist(f,w)<130);
      if(id==='crimson-armor')return f.hp<f.maxHp*.8;
      if(id==='poison-mist')return insideHabitat(target,z,20);
      if(id==='skyfall')return insideHabitat(target,z,20)&&this.port.open(f,{x:target.x+(f.x-target.x)/Math.max(1,range)*28,y:target.y+(f.y-target.y)/Math.max(1,range)*28});
      return true;
    });
    const selection=options.find(id=>monsterSkill(id)?.elite)??options[0];
    if(selection&&startMonsterSkill(f,selection,target,now)){this.noSlot.delete(f.id);f.roamTarget=undefined;return;}
    f.state='chase';
    const preferred=f.species==='wolf'?45:f.species==='boar'?50:107;
    if(range<=preferred&&range>=(f.species==='toad'?48:24)&&this.port.line(f,target)){
      this.noSlot.delete(f.id);f.roamTarget=undefined;return;
    }
    if(this.port.movement){
      f.roamTarget=this.port.movement.approach(f,target);
      const wait=this.noSlot.get(f.id);
      if(f.roamTarget)this.noSlot.delete(f.id);
      else if(wait?.target!==target.id)this.noSlot.set(f.id,{target:target.id,since:now});
      else if(now-wait.since>=1200)this.abandon(f,now);
      return;
    }
    const vec=normalized(target,f),side=f.species==='wolf'?(hashMonster(f.id)%3-1)*23:0;
    f.roamTarget={x:target.x+vec.x*29-vec.y*side,y:target.y+vec.y*29+vec.x*side};
  }
  private cast(f:FaunaSave,now:number){
    const cast=f.cast!,skill=monsterSkill(cast.skillId),z=this.zones.find(z=>z.zoneId===f.zoneId);
    if(!skill||!z){f.cast=undefined;return;}
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
        cast.hitIds.push(target.id);this.port.damage(target,damage,f.id,id+':'+target.id);
      }
    };
    const mist=(p:MonsterPoint)=>{
      if(!insideHabitat(p,z,12)||this.port.safe(p))return;
      this.env.monsterHazards!.push({id:'mist:'+id,sourceId:f.id,position:{x:p.x,y:p.y},radius:skill.radius,damage:skill.mode==='leap'?4:damage,nextPulse:now+580,expires:now+4800});
    };
    if(!cast.activated){
      cast.activated=true;this.port.sound?.(cast.skillId,f);
      switch(skill.mode){
        case 'contact': hit(cast.aim,skill.radius,f);break;
        case 'area': hit(f,skill.radius);break;
        case 'roar': for(const ally of this.env.fauna??[])if(ally.alive&&ally.species==='wolf'&&ally.zoneId===f.zoneId&&dist(ally,f)<skill.radius)ally.buffUntil=now+5600;break;
        case 'armor': f.armorUntil=now+5900;break;
        case 'mist': mist(cast.aim);break;
        case 'projectile': this.env.monsterProjectiles!.push({id:'projectile:'+id,sourceId:f.id,position:monsterMouth(f,cast.aim),direction:normalized(f,cast.aim),range:skill.reach,damage});break;
      }
    }
    if(skill.mode==='tongue'&&phase==='active'){
      const progress=Math.min(1,age/(skill.active*.48),(skill.active-age)/(skill.active*.28));
      hit(toward(f,cast.aim,Math.max(0,progress)),skill.radius,monsterMouth(f,cast.aim));
    }
    if(['dash','leap'].includes(skill.mode)&&phase==='active'&&!cast.stopped){
      const to=toward(cast.origin,cast.aim,Math.min(1,age/Math.max(1,skill.active-50)));
      const movement=dist(f,to);
      if(movement>.5){if(this.port.movement)this.port.movement.skill(f,to);else this.move(f,to,z,false);if(dist(f,to)>2.5)cast.stopped=true;}
      if(skill.mode==='dash')hit(f,skill.radius+11);
    }
    if(skill.mode==='leap'&&(phase==='recover'||cast.stopped)&&!cast.hitIds.includes('landing')){
      cast.hitIds.push('landing');hit(f,skill.radius);mist(f);
    }
  }
  private tickEffects(now:number,step:number){
    this.env.monsterHazards=this.env.monsterHazards!.filter(h=>{
      if(now>=h.expires)return false;
      if(now>=h.nextPulse){
        h.nextPulse+=850;
        for(const n of this.port.targets(h.position,h.radius))if(!this.port.safe(n)&&dist(h.position,n)<=h.radius&&this.port.line(h.position,n))this.port.damage(n,h.damage,h.sourceId,h.id+':'+now+':'+n.id);
      }
      return true;
    });
    this.env.monsterProjectiles=this.env.monsterProjectiles!.filter(p=>{
      const advance=Math.min(p.range,step*.225);
      const end={x:p.position.x+p.direction.x*advance,y:p.position.y+p.direction.y*advance};
      if(advance<=0||this.port.safe(end)||!this.port.line(p.position,end))return false;
      const hit=this.port.targets(end,advance+11).find(n=>!this.port.safe(n)&&segmentDistance(n,p.position,end)<=11);
      if(hit){this.port.damage(hit,p.damage,p.sourceId,p.id+':'+hit.id);return false;}
      p.position=end;p.range-=advance;return p.range>0;
    });
  }
}
