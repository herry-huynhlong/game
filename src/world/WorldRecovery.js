import { RECOVERY, npcRecoveryThresholds, recoverHealth, recoveryStatus } from '../dao/CombatRecovery.ts';
import { FAUNA_SPECIES, faunaBehavior } from '../dao/MonsterRegistry.ts';
import { faunaStationaryForm } from '../dao/FaunaRecovery.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { faunaHabitat } from './FaunaHabitat.js';
import { useResidentItem } from './ResidentInventory.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const STEP=200;

export class WorldRecovery {
  constructor(scene){
    this.scene=scene;
    this.engaged=new Map();
    this.actors=new Map();
    this.activity=new Map();
    this.nextTick=0;
  }

  get world(){return this.scene.populationWorld;}
  get now(){return this.world.environment.faunaClockMs??0;}
  drives(npc){return Boolean(npc.convalescence&&npc.id!==this.scene.possessedNpcId&&!npc.tribulation&&!npc.flight&&!npc.skyStep&&!npc.wallLevel);}
  thresholds(npc){return npcRecoveryThresholds(npc.aiProfile?.axes.caution,npc.aiProfile?.axes.courage);}
  npcActivity(npc){return Boolean(npc.tribulation||npc.westPoison>=70||
    npc.monsterAfflictions?.poison?.until>this.now);}

  engagement(){
    const {world,scene,actors}=this;
    actors.clear();
    for(const actor of world.npcs)if(actor.alive&&!actor.underground&&!actor.ascended)actors.set(actor.id,actor);
    for(const actor of world.environment.fauna)if(actor.alive)actors.set(actor.id,actor);
    this.engaged.clear();
    this.activity.clear();
    const note=(actor,verb)=>{
      const actions=this.activity.get(actor.id)??new Set();
      actions.add(verb);this.activity.set(actor.id,actions);
    };
    const connect=(actor,id,striking=false)=>{
      const other=actors.get(id);
      if(other&&distance(actor,other)<=400){
        this.engaged.set(actor.id,other);
        this.engaged.set(id,actor);
        note(actor,striking?'Đang tấn công':'Đang truy đuổi');
        note(other,striking?'Đang bị tấn công':'Đang bị truy đuổi');
      }
    };
    for(const a of actors.values()){
      if(a.species){
        if(a.cast){this.engaged.set(a.id,null);note(a,'Đang tấn công');}
        connect(a,a.targetNpcId,Boolean(a.cast));
        if(a.cast?.targetId!==a.targetNpcId)connect(a,a.cast?.targetId,true);
      }else{
        if(scene.weaponAttackStates.get(a.id)?.simulationUntil>this.now){this.engaged.set(a.id,null);note(a,'Đang tấn công');}
        if(!a.convalescence&&['responding','at-scene'].includes(a.lawResponse?.status))connect(a,a.lawResponse.targetId);
        if(a.goalAction==='fight'||a.action==='fight'){
          connect(a,a.faunaHuntTargetId,a.action==='fight');
          connect(a,a.lawResponse?.targetId,a.action==='fight');
          const job=scene.westTreasures?.jobs.get(a.id);
          if(job?.phase==='fight')connect(a,scene.westTreasures.system.guardian(job.node)?.id,a.action==='fight');
        }
      }
    }
    for(const duel of world.treasureDuels??[])if(duel.status==='approaching'||duel.status==='fighting'){
      const a=actors.get(duel.attackerId);
      if(a)connect(a,duel.defenderId,duel.status==='fighting');
    }
  }

  mode(actor){
    const {scene}=this;
    if(actor.species){
      if(actor.species==='flower'&&faunaStationaryForm(actor))return 'rooted';
      if(actor.state==='sleep'){
        const zone=scene.faunaZones.find(z=>z.zoneId===actor.zoneId);
        const habitat=faunaHabitat(zone,actor.species);
        if(habitat?.nocturnal||actor.growth?.phase==='dormant')return 'safeSleep';
        return 'territory';
      }
      return ['patrol','return','retreat'].includes(actor.state)?'travel':'idle';
    }
    if(scene.cultivation?.isSeated(actor)||actor.manualMeditation)return 'meditation';
    const arrived=actor.actionTarget&&distance(actor,actor.actionTarget)<=20;
    if(arrived&&actor.action==='rest'&&(actor.convalescence?.phase==='resting'||scene.monsterSafe(actor)))return 'safeSleep';
    const possessed=actor.id===scene.possessedNpcId;
    const moving=possessed&&scene.npcSprites.get(actor.id)?.getData('moving')||!possessed&&!arrived&&actor.action==='travel';
    return moving||actor.flight||actor.skyStep?'travel':'idle';
  }

  status(actor){
    const maximum=actor.species?actor.maxHp:cultivationStats(actor).hpMax;
    const busy=this.engaged.has(actor.id)||(!actor.species&&this.npcActivity(actor));
    return {...recoveryStatus(actor,maximum,this.mode(actor),busy,this.now),maximum,ratio:actor.hp/maximum,
      activity:[...this.activity.get(actor.id)??[]].join(' · ')};
  }

  tick(now){
    if(now<this.nextTick)return;
    const elapsed=this.previousTick===undefined?0:Math.min(STEP,now-this.previousTick);
    this.previousTick=now;this.nextTick=now+STEP;
    this.engagement();
    for(const actor of this.world.npcs){
      if(!actor.alive||actor.underground||actor.ascended)continue;
      const maximum=cultivationStats(actor).hpMax;
      const hostile=this.engaged.get(actor.id),busy=this.engaged.has(actor.id)||this.npcActivity(actor);
      if(actor.hp<maximum||actor.combatHealth||busy)
        recoverHealth(actor,maximum,this.mode(actor),busy,now,elapsed);
      if(actor.id===this.scene.possessedNpcId||actor.tribulation||actor.skyStep)continue;
      if(actor.wallLevel||actor.flight){
        if(actor.hp/maximum<this.thresholds(actor).seek){
          actor.convalescence??={phase:'escaping'};
          if(actor.flight)this.scene.flyingSword.land(actor);
        }
      }else if(actor.convalescence||actor.hp<maximum*.58)this.plan(actor,maximum,hostile,busy);
    }
    for(const actor of this.world.environment.fauna){
      if(actor.alive&&(actor.hp<actor.maxHp||actor.combatHealth||this.engaged.has(actor.id)))
        recoverHealth(actor,actor.maxHp,this.mode(actor),this.engaged.has(actor.id),now,elapsed);
    }
  }

  nearbyThreat(npc,point){
    const {scene}=this;
    if(scene.monsterSafe(point))return undefined;
    for(const body of scene.groundOccupancy.near(point.x,point.y,150)){
      const f=body.actor;
      if(body.category!==2||!f.alive||!FAUNA_SPECIES[f.species]||faunaBehavior(f.species)==='timid'||faunaBehavior(f.species)==='neutral')continue;
      if(distance(f,point)<=Math.max(55,FAUNA_SPECIES[f.species].notice*.85)&&scene.monsterLine(f,point))return f;
    }
    return undefined;
  }

  plan(npc,maxHp,hostile,busy){
    const ratio=npc.hp/maxHp,{seek,resume,critical}=this.thresholds(npc),scene=this.scene;
    if(ratio>=resume&&npc.convalescence){
      npc.convalescence=undefined;
      if(npc.decisionSlot==='recovery:shelter'){
        npc.decisionSlot=undefined;npc.goalAction='idle';npc.action='idle';npc.actionTarget={x:npc.x,y:npc.y};
        npc.shortGoal='Đã hồi phục, trở lại sinh hoạt';
        scene.resetNpcRoute(npc);
      }
      return;
    }
    if(!npc.convalescence&&ratio>=seek)return;
    if(!npc.convalescence){
      npc.convalescence={phase:'escaping'};
      npc.faunaHuntTargetId=undefined;
      scene.westTreasures?.release(npc);
      if(npc.marketVisit)scene.merchants.cancel(npc,'Tạm hoãn giao dịch để chữa thương');
      scene.cultivation?.interrupt(npc);
    }
    const clinic=scene.society?.visits[npc.id];
    if(clinic?.venue==='clinic'&&!busy&&!hostile&&scene.monsterSafe(npc))return;
    const plan=npc.convalescence,combat=npc.combatHealth;
    const lastAttacker=this.now-(combat?.lastTakenAt??-Infinity)<=1600?this.actors.get(combat?.lastAttackerId):undefined;
    const nearbyAttacker=lastAttacker&&distance(npc,lastAttacker)<130&&scene.clearCombatLine(npc,lastAttacker)?lastAttacker:undefined;
    const threat=hostile??nearbyAttacker??this.nearbyThreat(npc,npc);
    if(threat||busy||npc.westPoison>=45){
      if(this.now<(plan.nextSearchAt??0)&&plan.phase==='escaping'&&plan.shelter&&distance(npc,plan.shelter)>20)return;
      const next=this.findShelter(npc,threat);
      plan.nextSearchAt=this.now+(ratio<critical?750:1400);
      if(next)plan.shelter=next;
      else if(plan.shelter&&(npc.pathBlocked||this.nearbyThreat(npc,plan.shelter)))plan.shelter=undefined;
      plan.phase='escaping';
      this.order(npc,plan.shelter??npc,'flee','Rút lui để chữa thương');
      return;
    }
    if(plan.shelter&&distance(npc,plan.shelter)>20&&!npc.pathBlocked){
      this.order(npc,plan.shelter,'rest','Tới nơi an toàn để chữa thương');
      return;
    }
    plan.phase='resting';
    plan.shelter={x:npc.x,y:npc.y};
    if(ratio<seek&&scene.monsterSafe(npc)&&scene.society?.seekClinic(npc))return;
    this.order(npc,plan.shelter,'rest','Nghỉ tại nơi an toàn để chữa thương');
    if(ratio<seek&&useResidentItem(npc,'healing_pill'))scene.requestBackgroundSave();
  }

  order(npc,point,goal,label){
    const scene=this.scene;
    if(npc.decisionSlot!=='recovery:shelter'||npc.goalAction!==goal||!npc.actionTarget||distance(npc.actionTarget,point)>5){
      npc.decisionSlot='recovery:shelter';npc.goalAction=goal;npc.actionTarget={x:point.x,y:point.y};
      npc.action=distance(npc,point)<=20&&goal==='rest'?'rest':'travel';
      scene.workstations.release(npc.id);scene.resetNpcRoute(npc);
    }
    npc.shortGoal=label;
  }

  findShelter(npc,threat){
    const scene=this.scene,home=npc.home;
    const valid=point=>point&&scene.groundPositionOpen(npc,point.x,point.y)&&scene.canReachPoint(npc,point)&&
      !this.nearbyThreat(npc,point)&&!scene.westWilds?.pockets.some(p=>point.x>=p.x&&point.x<p.x+p.width&&point.y>=p.y&&point.y<p.y+p.height);
    if(home&&distance(npc,home)<850&&valid(home)&&(!threat||distance(threat,home)>distance(threat,npc)+35))return home;
    const angle=threat?Math.atan2(npc.y-threat.y,npc.x-threat.x):0;
    for(const length of [135,94,60,37])for(const offset of [0,.62,-.62,1.24,-1.24,2.0,-2.0,Math.PI]){
      const point={x:npc.x+Math.cos(angle+offset)*length,y:npc.y+Math.sin(angle+offset)*length};
      if((!threat||distance(threat,point)>distance(threat,npc)+15)&&valid(point))return point;
    }
    if(home&&valid(home))return home;
    return undefined;
  }
}
