import {attackBudget,gradePotential} from '../systems/CombatBalance.ts';
import {MARTIAL_SKILLS,MARTIAL_TECHNIQUES,MARTIAL_WEAPONS} from '../dao/MartialRegistry.ts';
import {martialCastCheck,martialMastery,martialPower,martialQiCost,martialResonance,practiceMartial,wearMartialWeapon} from '../dao/MartialProgress.ts';
import {cultivationStats} from '../systems/CultivationSystem.ts';
import {faunaRealm} from '../dao/MonsterRegistry.ts';
import {blocksGroundCombat,aboveGroundCombat} from './FlyingSword.js';
import {drawMartial,drawMartialWeaponAura} from './MartialVisuals.js';
import {createWorldUuid} from './WorldId.ts';
import {martialAltitude,martialPhase,martialTimeline,projectileSkill,projectileSpeed,swordRing} from './MartialTimeline.js';
import {borrowSwords} from './MartialSwords.js';
import {drawFlightCast,MartialStageProps} from './MartialStageArt.js';
import {equippedInstance} from '../dao/WeaponInstances.ts';
import {isVanKiem,vanKiemPose,VanKiemCinematic} from './VanKiemCinematic.js';
import {vanPhapPose,VanPhapCinematic} from './VanPhapCinematic.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const face=(x,y)=>Math.abs(x)>Math.abs(y)?x<0?'left':'right':y<0?'up':'down';
const isOffense=skill=>!['guard','heal','dash'].includes(skill.effect);

export class MartialCombat {
  constructor(scene){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.clock=this.world.martialClock??=0;
    this.casts=new Map();
    this.conditions=new Map();
    this.arms=new Map();
    this.locks=new Map();
    this.borrowed=new Set();
    this.floor=scene.add.graphics().setDepth(12);
    this.effects=scene.add.graphics().setDepth(9000);
    this.props=new MartialStageProps(scene);
    this.cinematic=new VanKiemCinematic(scene);
    this.vanPhap=new VanPhapCinematic(scene);
    this.settings={detail:1,flash:true,shake:false};
    try{Object.assign(this.settings,JSON.parse(localStorage.getItem('tvk-martial-vfx')??'{}'));}catch{}
    this.settings.detail=Math.min(2,Math.max(0,Number(this.settings.detail)||0));
    this.sampleAt=-1;
    this.sampleView={x:0,y:0,width:0,height:0};
    this.hasDrawn=false;
  }

  eligible(npc){
    return npc?.alive&&!npc.ascended&&!npc.underground&&!npc.minor&&!npc.tribulation&&!blocksGroundCombat(npc);
  }
  ally(a,b){
    return a===b||Boolean(this.scene.expeditions?.of(a)?.members.includes(b.id))||
      !b.species&&((a.relationships?.[b.id]??0)>=35||a.faction===b.faction&&a.faction==='Thanh Vân Tông');
  }
  targetable(npc,target){
    return target?.alive&&!target.underground&&!aboveGroundCombat(target)&&
      (npc.wallLevel??0)===(target.wallLevel??0);
  }
  mapOf(actor){return actor.mapId??this.world.environment.mapId??'surface';}
  locked(actor){
    const lock=this.locks.get(actor.id), target=lock?.target;
    if(lock&&this.clock<lock.until&&this.targetable(actor,target)&&this.mapOf(target)===lock.mapId&&
      this.mapOf(actor)===lock.mapId&&distance(actor,target)<520)return target;
    if(lock)this.locks.delete(actor.id);
    return null;
  }
  retaliate(){
    if(this.scene.martialGallery)return;
    for(const [id,lock] of this.locks){
      const actor=this.scene.scheduler.byId.get(id)?.npc;
      if(!actor){if(this.clock>=lock.until||!lock.target.alive)this.locks.delete(id);continue;}
      const target=this.locked(actor);
      if(!target||!actor.alive||!actor.martial||actor.convalescence||actor.goalAction==='flee'||actor.action==='flee'||
        this.scene.expeditions?.has(actor)||actor.populationRole==='hunter')continue;
      if(distance(actor,target)<270)this.ai(actor,target);
    }
  }
  willStand(npc,beast){
    return Boolean(npc.martial&&(npc.aiProfile?.axes?.courage??50)>=58&&npc.realmIndex>=faunaRealm(beast).realmIndex&&
      npc.hp>=cultivationStats(npc).hpMax*.65&&npc.mp>=5&&!npc.convalescence);
  }
  engage(actor,target,retaliation=false){
    if(!this.targetable(actor,target)||actor===target||this.mapOf(actor)!==this.mapOf(target))return false;
    const previous=this.locked(actor);
    if(previous&&previous!==target)return false;
    this.locks.set(actor.id,{target,mapId:this.mapOf(target),until:this.clock+9000,
      retaliation:retaliation||Boolean(this.locks.get(actor.id)?.retaliation)});
    return true;
  }
  cinematicPose(cast){return isVanKiem(cast)?vanKiemPose(this.clock-cast.at):cast?vanPhapPose(cast,this.clock-cast.at):null;}
  altitude(npc){
    const cast=this.casts.get(npc.id);
    return cast?(this.cinematicPose(cast)?.height??martialAltitude(cast,this.clock-cast.at)):0;
  }
  finish(cast){
    for(const sword of cast.swords)this.borrowed.delete(sword.instance.id);
    if(isVanKiem(cast))this.cinematic.finish(cast,cast.phase==='complete');
    this.casts.delete(cast.npc.id);
    this.sampleAt=-1;
  }
  clear(){
    for(const cast of this.casts.values())this.finish(cast);
    this.cinematic.clear();
    this.vanPhap.clear();
    this.conditions.clear();this.locks.clear();this.sampleAt=-1;
  }
  selected(npc){
    const state=npc.martial;
    return state?.selected??MARTIAL_TECHNIQUES[state?.active]?.skills[0]?.id;
  }
  cast(npc,skillId,target=null,ai=false,withResonance=true){
    const {scene}=this, skill=MARTIAL_SKILLS[skillId];
    const fail=message=>{if(!ai)scene.worldPopulationToast(message);return false;};
    if(this.world.clock.paused)return fail('Hãy tiếp tục thời gian để thi triển.');
    if(!this.eligible(npc)||this.casts.has(npc.id)||this.casts.size>=12)return false;
    if(npc.equippedWeapon==='fishing_rod_basic')return fail('Hãy cất cần câu trước khi vận công.');
    const denied=martialCastCheck(npc,skill,this.clock);
    if(denied)return fail(denied);
    if(ai&&isOffense(skill))target=this.locked(npc)??target;
    const enemy=this.targetable(npc,target)&&!target.minor&&this.mapOf(npc)===this.mapOf(target)&&(!ai||target.species||this.locked(npc)===target);
    if(ai&&isOffense(skill)&&(!enemy||distance(npc,target)>skill.range+8||!scene.clearCombatLine(npc,target)))return false;
    const support=skill.form==='ally'&&this.targetable(npc,target)&&this.ally(npc,target)&&
      distance(npc,target)<=skill.range&&scene.clearCombatLine(npc,target)?target:npc;
    const groundTarget=target?.structure?target:!ai&&scene.lastAttackPointer&&['ground','field','summon'].includes(skill.delivery)?
      scene.cameras.main.getWorldPoint(scene.input.activePointer.x,scene.input.activePointer.y):null;
    const [ux,uy]=scene.heavenActions.aim(npc,enemy?target:groundTarget);
    const origin={x:npc.x,y:npc.y,wallLevel:npc.wallLevel??0};
    const aimPoint=enemy?target:groundTarget;
    const reach=aimPoint?Math.min(skill.range,distance(npc,aimPoint)):skill.range*.72;
    const focus=skill.form==='ally'?{x:support.x,y:support.y}:skill.form==='self'||skill.form==='burst'?origin:
      {x:npc.x+ux*reach,y:npc.y+uy*reach,wallLevel:origin.wallLevel};
    if(skill.form==='field'&&!scene.clearCombatLine(npc,focus))return fail('Vị trí thi triển bị vật cản che khuất.');
    if(skill.id==='myriad-unite'&&(!enemy||distance(npc,target)>skill.range))return fail('Chọn một đối thủ hợp lệ trong tầm khóa kiếm trận.');
    const swords=skill.id==='myriad-unite'?borrowSwords(scene,npc,this.borrowed):[];
    const timeline=martialTimeline(skill,swords.length);
    if(enemy&&isOffense(skill))this.engage(npc,target);
    const cast={id:createWorldUuid(),npc,skill,origin,focus,ux,uy,ai,support,pulse:0,at:this.clock,
      direction:face(ux,uy),resonance:withResonance?martialResonance(npc):0,weapon:npc.equippedWeapon,hits:0,phase:'prepare',
      target:enemy?target:null,targetId:enemy?target.id:null,mapId:this.mapOf(npc),timeline,swords,projectiles:[],impacts:[],
      weaponInstance:equippedInstance(npc)?.id,last:0,structures:new Set(),
      retaliation:Boolean(enemy&&this.locks.get(npc.id)?.target===target&&this.locks.get(npc.id)?.retaliation)};
    if(skill.grade>=3&&scene.riverFishSystem){
      const range=Math.max(32,skill.width);
      const samples=[[0,0],[.5,0],[-.5,0],[0,.5],[0,-.5],[1,0],[-1,0],[0,1],[0,-1]];
      for(const [dx,dy] of samples){
        const x=focus.x+dx*range,y=focus.y+dy*range;
        if(scene.riverFishSystem.isWaterTile(x,y)){cast.water={x,y};break;}
      }
    }
    cast.damage=martialPower(npc,skill,cultivationStats(npc).attack,cast.resonance);
    cast.qiCost=martialQiCost(npc,skill);
    npc.mp-=cast.qiCost;
    npc.martial.ready[skill.id]=this.clock+Math.max(skill.cooldown,timeline.complete+200);
    npc.martial.next=this.clock+timeline.complete;
    this.casts.set(npc.id,cast);
    scene.resetNpcRoute(npc);
    if(!ai){scene.playerFacing=cast.direction;scene.heavenActions.stopFishing();}
    scene.npcSprites.get(npc.id)?.play(`${scene.npcTextureFor(npc)}_idle_${cast.direction}`,true);
    scene.requestBackgroundSave();
    return true;
  }
  ai(npc,target){
    if(!npc.martial||npc.id===this.scene.possessedNpcId||this.world.clock.paused)return false;
    if(this.casts.has(npc.id))return true;
    target=this.locked(npc)??target;
    if(!target?.alive)return false;
    const course=MARTIAL_TECHNIQUES[npc.martial.active];
    if(!course)return false;
    const health=npc.hp/cultivationStats(npc).hpMax;
    const hostileRealm=target.species?faunaRealm(target).realmIndex:target.realmIndex;
    if(hostileRealm-npc.realmIndex>=2)return false;
    const danger=hostileRealm>=npc.realmIndex&&target.hp>20||target.rank==='elite';
    const usable=course.skills.filter(s=>!martialCastCheck(npc,s,this.clock));
    const support=usable.find(s=>s.form==='ally'&&(s.effect==='heal'||s.effect==='guard'));
    if(support){
      const wounded=this.scene.groundOccupancy.near(npc.x,npc.y,support.range).map(body=>body.actor)
        .find(friend=>friend!==npc&&this.targetable(npc,friend)&&this.ally(npc,friend)&&
          friend.hp<cultivationStats(friend).hpMax*.55&&distance(npc,friend)<=support.range&&this.scene.clearCombatLine(npc,friend));
      if(wounded&&this.cast(npc,support.id,wounded,true))return true;
    }
    if(health<.72){
      const heal=usable.find(s=>s.effect==='heal');
      if(heal&&this.cast(npc,heal.id,npc,true))return true;
      const guard=usable.find(s=>s.effect==='guard');
      if(guard&&this.cast(npc,guard.id,npc,true))return true;
    }
    if(health<.42||npc.mp<5||!target.alive||this.scene.monsterSafe(target))return false;
    const skill=usable.filter(s=>isOffense(s)&&distance(npc,target)<=s.range&&
      (s.grade<3||danger)&&(s.stage<2||danger)).sort((a,b)=>danger?b.force-a.force:a.mp-b.mp)[0];
    return skill?this.cast(npc,skill.id,target,true):false;
  }
  interrupt(npc,damage=0,forced=false){
    const cast=this.casts.get(npc.id);
    if(cast&&(!npc.alive||npc.hp<=0||forced||!cast.pulse&&damage>=Math.max(8,cultivationStats(npc).hpMax*.09))){
      this.finish(cast);
      if(this.world.clock.paused)this.render();
    }
  }
  condition(npc){return this.conditions.get(npc.id);}
  rooted(npc){return (this.condition(npc)?.root??0)>this.clock;}
  guard(npc,damage){
    const state=this.condition(npc);
    return (state?.guardUntil??0)>this.clock?damage*(1-state.guard):damage;
  }
  outgoing(npc,damage){return (this.condition(npc)?.weak??0)>this.clock?damage*.73:damage;}
  matches(cast,target){
    const {npc,skill,origin,focus,ux,uy,ai}=cast;
    if(!this.targetable(npc,target)||this.mapOf(target)!==cast.mapId||target===npc||target.minor||
      ai&&!target.species&&target.id!==cast.targetId||!target.species&&this.ally(npc,target)&&target.id!==cast.targetId)return false;
    if(target.species&&this.scene.monsterSafe(target))return false;
    const dx=target.x-origin.x,dy=target.y-origin.y,along=dx*ux+dy*uy;
    const across=Math.abs(dx*uy-dy*ux);
    const inside=skill.form==='field'?distance(focus,target)<=skill.width:
      skill.form==='burst'?distance(origin,target)<=skill.range:
      skill.form==='arc'?distance(origin,target)<=skill.range&&along>=-8&&across<=skill.width:
      along>0&&along<=skill.range&&across<=skill.width;
    return inside&&this.scene.clearCombatLine(origin,target)&&
      (skill.form!=='field'||this.scene.clearCombatLine(focus,target));
  }
  apply(cast){
    const {npc,skill,support,origin,ux,uy}=cast, scene=this.scene;
    const id=`martial:${cast.id}:${cast.pulse}`;
    if(skill.effect==='heal'||skill.effect==='guard'){
      const target=this.targetable(npc,support)&&distance(npc,support)<=skill.range+4?support:npc;
      if(skill.effect==='heal'){
        const max=cultivationStats(target).hpMax;
        target.hp=Math.min(max,target.hp+Math.round(max*(skill.force+martialMastery(npc,skill.course)*.018)*gradePotential(npc.realmIndex,skill.grade)/cast.timeline.count));
      }else{
        const state=this.condition(target)??{};
        Object.assign(state,{guard:Math.min(.61,(skill.force+martialMastery(npc,skill.course)*.014)*gradePotential(npc.realmIndex,skill.grade)),guardUntil:this.clock+skill.duration});
        this.conditions.set(target.id,state);
        this.vanPhap.retainWard(cast,target,state.guardUntil);
      }
      cast.hits++;
      return;
    }
    if(skill.effect==='dash'){
      let landing=origin;
      for(let d=6;d<=skill.range;d+=6){
        const point={x:origin.x+ux*d,y:origin.y+uy*d,wallLevel:origin.wallLevel};
        if(!scene.groundPositionOpen(npc,point.x,point.y)||!scene.clearCombatLine(landing,point))break;
        landing=point;
      }
      npc.x=landing.x;npc.y=landing.y;
      scene.npcSprites.get(npc.id)?.setPosition(npc.x,npc.y);
      scene.resetNpcRoute(npc);
      if(scene.possessedNpcId===npc.id&&!scene.cameraFollowSuspended)scene.cameras.main.centerOn(npc.x,npc.y);
      cast.hits++;
      return;
    }
    const nearby=cast.target&&['line','arc'].includes(skill.form)?[{actor:cast.target}]:
      scene.groundOccupancy.near(origin.x,origin.y,skill.range+skill.width+24);
    const unique=new Set();
    let hit=0;
    for(const body of nearby){
      const target=body.actor;
      if(unique.has(target.id)||!this.matches(cast,target))continue;
      unique.add(target.id);
      if(this.hit(cast,target,id,attackBudget(cast.damage,cast.timeline.count)))hit++;
      if(hit>=8)break;
    }
    this.damageScenery(cast,skill.form==='field'?cast.focus:cast.origin);
  }
  hit(cast,target,id,damage){
      const {npc,skill}=cast, scene=this.scene;
      const eventId=id+':'+target.id;
      const burn=skill.effect==='burn';
      const direct=damage*(burn?.84:1);
      const result=target.species?scene.applyFaunaDamage(target,npc,direct,eventId,true,skill.id):
        scene.reportCombat(npc.id,target.id,direct,
          {eventId,skill:skill.id,deferSave:true,retaliation:cast.retaliation&&target.id===cast.targetId,authorizedDuel:Boolean(scene.martialGallery)});
      if(result?.ok===false&&!result.eventId)return false;
      this.engage(target,npc,true);
      if(target.alive){
        const state=this.condition(target)??{};
        if(skill.effect==='root'&&(state.rootGuard??0)<=this.clock){
          state.root=this.clock+Math.min(2400,skill.duration||800);
          state.rootGuard=state.root+900;
        }
        if(skill.effect==='weaken')state.weak=Math.max(state.weak??0,this.clock+Math.min(4600,skill.duration||2000));
        if(skill.effect==='interrupt'){this.interrupt(target,0,true);if(target.species)target.cast=undefined;}
        if(burn)state.burn={until:this.clock+1550,next:this.clock+650,source:npc,damage:damage*.08,id:eventId,skill:skill.id};
        this.conditions.set(target.id,state);
      }
      cast.hits++;
      cast.impacts.push({id:eventId,x:target.x,y:target.y,at:cast.last});
      return true;
  }
  damageScenery(cast,point){
    if(cast.skill.siege)this.scene.applyMartialScenery?.(cast,point);
  }
  spawnShot(cast,index,time){
    const {skill,origin,ux,uy}=cast;
    const ritual=skill.id==='myriad-unite';
    const point=ritual?swordRing(cast,index,time):{x:origin.x+ux*10,y:origin.y+uy*10,z:15};
    const p={...point,id:'martial:'+cast.id+':shot:'+index,index,ux,uy,travel:0,at:time,done:false,
      homing:ritual||skill.delivery==='homing',range:skill.range+(ritual?135:16)};
    cast.projectiles.push(p);
  }
  moveShot(cast,p,time,delta){
    const {skill,npc}=cast, scene=this.scene,target=cast.target;
    const valid=target&&this.targetable(npc,target)&&this.mapOf(target)===cast.mapId&&(!target.species||!scene.monsterSafe(target));
    if(cast.skill.id==='myriad-unite'&&!valid){p.done=true;p.finishedAt=time;return;}
    if(p.homing&&valid){
      const length=distance(p,target);
      if(length>.001){p.ux=(target.x-p.x)/length;p.uy=(target.y-p.y)/length;}
    }
    const step=Math.min(projectileSpeed(skill)*delta*.001,p.range-p.travel);
    const next={x:p.x+p.ux*step,y:p.y+p.uy*step,wallLevel:cast.origin.wallLevel};
    const from={x:p.x,y:p.y,wallLevel:cast.origin.wallLevel};
    let struck=false;
    if(step<=0||!scene.clearCombatLine(from,next)){
      p.done=true;
    }else{
      const linear=p.travel+step;
      const hitRadius=Math.min(21,Math.max(8,skill.width*.6));
      const hit=actor=>{
        const along=(actor.x-p.x)*p.ux+(actor.y-p.y)*p.uy;
        const radius=Math.max(8,hitRadius);
        return along>=-radius&&along<=step+radius&&Math.abs((actor.x-p.x)*p.uy-(actor.y-p.y)*p.ux)<=radius;
      };
      const candidate=valid&&hit(target)?target:!cast.targetId&&scene.groundOccupancy.near(next.x,next.y,26).map(body=>body.actor)
        .find(actor=>hit(actor)&&this.matches(cast,actor));
      p.x=next.x;p.y=next.y;p.travel=linear;
      p.z=Math.max(9,p.z-(skill.id==='myriad-unite'?delta*.15:0));
      if(candidate){
        const damage=attackBudget(cast.damage,cast.timeline.count);
        struck=this.hit(cast,candidate,p.id,damage);
        if(skill.id==='flame-burst'&&struck){
          for(const {actor} of scene.groundOccupancy.near(next.x,next.y,skill.width)){
            if(actor!==candidate&&distance(next,actor)<=skill.width&&this.matches(cast,actor))this.hit(cast,actor,p.id,damage*.6);
          }
        }
        p.done=true;
      }
    }
    if(p.done){p.finishedAt=time;this.damageScenery(cast,{x:p.x,y:p.y});if(!struck)cast.impacts.push({id:p.id,x:p.x,y:p.y,at:time});}
  }
  advance(delta){
    this.clock+=delta;
    this.world.martialClock=this.clock;
    if(this.clock>=(this.nextRetaliation??0)){
      this.nextRetaliation=this.clock+380;
      this.retaliate();
    }
    for(const [id,state] of this.conditions){
      const target=this.scene.scheduler.byId.get(id)?.npc??this.world.environment.fauna.find(f=>f.id===id);
      if(!target?.alive){this.conditions.delete(id);continue;}
      const burn=state.burn;
      while(burn&&burn.next<=this.clock&&burn.next<burn.until){
        const eventId=burn.id+':burn:'+burn.next;
        burn.next+=650;
        if(burn.source.alive&&target.alive&&!target.underground&&!this.scene.monsterSafe(target)){
          if(target.species)this.scene.applyFaunaDamage(target,burn.source,burn.damage,eventId,true,burn.skill);
          else this.scene.reportCombat(burn.source.id,id,burn.damage,{eventId});
        }
      }
      if(burn&&burn.until<=this.clock)delete state.burn;
      if(!state.burn&&Math.max(state.rootGuard??0,state.weak??0,state.guardUntil??0)<=this.clock)this.conditions.delete(id);
    }
    for(const cast of this.casts.values()){
      const {npc,skill,at}=cast, elapsed=this.clock-at;
      if(!this.eligible(npc)||(npc.wallLevel??0)!==cast.origin.wallLevel||npc.equippedWeapon!==cast.weapon||
        this.mapOf(npc)!==cast.mapId||equippedInstance(npc)?.id!==cast.weaponInstance){
        this.finish(cast);continue;
      }
      const timeline=cast.timeline, shoots=projectileSkill(skill)||skill.id==='myriad-unite';
      const limit=Math.min(elapsed,timeline.complete);
      while(cast.last<limit){
        const step=Math.min(25,limit-cast.last);
        cast.last+=step;
        const current=cast.last;
        if(!cast.released&&current>=timeline.release){
          cast.released=true;
          if(isOffense(skill)){
            const arm=MARTIAL_WEAPONS[cast.weapon];
            this.scene.playWeaponPose(npc,{animation:arm?.kind==='spear'?'jian_thrust':
              ['dao','scythe','hammer'].includes(arm?.kind)?'dao_slash_1':'jian_slash'},cast.direction);
            wearMartialWeapon(npc);
            if(!isVanKiem(cast)&&this.settings.shake&&skill.grade>=3&&this.scene.inSceneryView(cast.focus,0))this.scene.cameras.main.shake(120,.0017);
          }
          if(!isVanKiem(cast)&&!this.vanPhap.available&&this.scene.inSceneryView(cast.origin,64)&&this.scene.cache.audio.exists('rig-strike')){
            const key=shoots&&this.scene.cache.audio.exists('rig-bolt')?'rig-bolt':'rig-strike';
            if(!this.scene.sound.locked)this.scene.sound.play(key,{volume:skill.grade>=3?.26:.14});
          }
        }
        if(timeline.slogan&&!cast.witnessed&&current>=timeline.manifest){
          cast.witnessed=true;this.witness(cast);
        }
        const due=shoots?timeline.release:timeline.impact;
        while(cast.pulse<timeline.count&&current>=due+cast.pulse*timeline.interval){
          if(shoots)this.spawnShot(cast,cast.pulse,current);
          cast.pulse++;
          if(!shoots)this.apply(cast);
        }
        for(const shot of cast.projectiles)if(!shot.done&&shot.at<current)this.moveShot(cast,shot,current,step);
        if(!this.casts.has(npc.id))break;
      }
      cast.phase=martialPhase(timeline,elapsed);
      if(elapsed>=timeline.complete){
        if(cast.hits)practiceMartial(npc,skill.grade>=3?16:11);
        this.finish(cast);
        this.scene.requestBackgroundSave();
      }
    }
  }
  witness(cast){
    let count=0;
    for(const {actor} of this.scene.groundOccupancy.near(cast.origin.x,cast.origin.y,170)){
      if(count>=6)break;
      if(!actor.alive||actor.species||actor===cast.npc||actor.id===cast.targetId||actor.underground||!actor.memories||
        this.clock<(actor.martialWitnessUntil??0))continue;
      const wary=(actor.aiProfile?.axes?.caution??50)>=52&&actor.realmIndex+1<cast.npc.realmIndex;
      actor.martialWitnessUntil=this.clock+5200;
      actor.memories.push({day:this.world.clock.day,kind:'combat',otherId:cast.npc.id,
        text:(wary?'Lùi lại trước uy áp của ':'Chứng kiến ')+cast.skill.name+'.'});
      if(actor.memories.length>12)actor.memories.shift();
      if(wary&&cast.target?.species&&actor.id!==this.scene.possessedNpcId&&actor.action!=='fight')this.scene.evadeFauna(actor,cast.target,this.scene.faunaNow());
      count++;
    }
  }
  render(){
    if(!this.casts.size&&!this.arms.size&&!this.hasDrawn&&!this.cinematic.active&&!this.vanPhap.active)return;
    const view=this.scene.cameras.main.worldView, previous=this.sampleView;
    const cameraChanged=view.x!==previous.x||view.y!==previous.y||view.width!==previous.width||view.height!==previous.height;
    if(this.sampleAt===this.clock&&!cameraChanged&&!this.scene.dragState&&!this.scene.cameraTween)return;
    this.sampleAt=this.clock;
    previous.x=view.x;previous.y=view.y;previous.width=view.width;previous.height=view.height;
    const {scene,settings}=this;
    this.floor.clear();this.effects.clear();
    this.props.begin();
    this.cinematic.begin();
    this.vanPhap.begin();
    this.hasDrawn=Boolean(this.casts.size||this.arms.size||this.cinematic.active);
    const budget=[3,6,9][settings.detail];
    let shown=0;
    for(const cast of this.casts.values()){
      if(!scene.inSceneryView(cast.origin,isVanKiem(cast)?570:220)&&!scene.inSceneryView(cast.focus,cast.skill.grade>=3?320:220))continue;
      if(shown++>=budget)break;
      const elapsed=this.clock-cast.at;
      if(this.cinematic.draw(cast,elapsed,settings))continue;
      if(!this.vanPhap.draw(cast,elapsed,settings)&&!drawFlightCast(this.floor,this.effects,this.props,cast,elapsed,settings)){
        const t=cast.timeline,visualClock=elapsed<t.impact?Math.min(.998,elapsed/t.release)*cast.skill.windup:
          cast.skill.windup+Math.max(0,elapsed-t.impact);
        drawMartial(this.floor,this.effects,cast,visualClock,settings.detail,settings.flash);
      }
      this.props.caption(cast,elapsed,scene.cameras.main.zoom);
    }
    this.props.end();
    this.cinematic.tails(this.clock);
    this.cinematic.end();
    this.vanPhap.drawWards(this.clock,this.conditions);
    this.drawArms(budget*2);
    this.vanPhap.end();
  }
  drawArms(budget){
    const {scene}=this;
    let arms=0;
    for(const [id,item] of this.arms){
      const actor=scene.npcSprites.get(id);
      if(!actor?.visible)continue;
      const aura=this.casts.get(id);
      const renderer=scene.npcAppearanceFleet?.entries.get(id)?.renderer, hand=renderer?.attachments?.hand;
      const x=hand&&renderer?.root.visible?renderer.root.x+hand.x*renderer.root.scaleX:actor.x+5;
      const y=hand&&renderer?.root.visible?renderer.root.y+hand.y*renderer.root.scaleY:actor.y-24;
      const intensity=scene.martialGallery?.previewWeaponIntensity(id)??
        (aura&&aura.phase!=='aftermath'?(aura.resonance&&aura.skill.grade>=3&&aura.skill.stage===2?2:1):0);
      const angle=renderer?.layers?.weapon?.rotation??scene.weaponSprites?.get(id)?.rotation??0;
      if(isVanKiem(aura)||!this.vanPhap.weapon(item,x,y,this.clock,intensity,angle)){
        drawMartialWeaponAura(this.effects,item,x,y,this.clock,intensity);
      }
      if(++arms>=budget)break;
    }
  }
}
