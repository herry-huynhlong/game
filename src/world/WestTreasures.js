import { WestTreasureSystem, treasureBloomOpen, treasureStage, treasureDistance as distance } from '../dao/WestTreasureSystem.ts';
import { WEST_TREASURE_IDS, EAST_TREASURE_IDS, WEST_TREASURE_RARITY, treasureDefinition } from '../dao/WestTreasureCatalog.ts';
import { EconomySystem } from '../dao/EconomySystem.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { insideHabitat } from '../dao/FaunaSystem.ts';
import { weaponAttackMode, weaponForNpc } from './WeaponCombat.js';
import { aboveGroundCombat } from './FlyingSword.js';

const COLORS={lôi:0xc6b2ff,hỏa:0xf9aa6d,mộc:0xb4eaa7,băng:0xc4f0f5,độc:0xcb8ee7,hồn:0xb2dfd5,huyết:0xf0878c,kim:0xe8d284,âm:0xb1a3e7};
const allowedRoles=new Set(['hunter','herb_gatherer','independent_cultivator','low_disciple','elder']);
const descriptions={sprout:'Mới mọc',growing:'Đang sinh trưởng',mature:'Sắp thu hoạch',ready:'Có thể thu hái',harvested:'Đã thu hái'};
const ecologist=n=>n.decisionSlot==='west:treasure';
export function loadWestTreasureArt(scene){
  scene.load.spritesheet('west-treasure','/assets/di-mach/spirit-herbs.png',{frameWidth:32,frameHeight:32});
  scene.load.spritesheet('east-treasure','/assets/east-wilds/overhaul/treasures.png',{frameWidth:32,frameHeight:32});
}

export class WestTreasures {
  constructor(scene){
    this.scene=scene;
    this.world=scene.populationWorld;
    const sites=(scene.map.getObjectLayer('WestTreasureSites')?.objects??[]).map(o=>({x:o.x,y:o.y,zoneId:scene.prop(o,'zoneId'),preferred:scene.prop(o,'preferred'),resourceId:scene.prop(o,'resourceId')}));
    this.system=new WestTreasureSystem(this.world,sites,p=>(p.x<0&&!scene.monsterSafe(p)||p.x>5700||p.resourceId&&p.x>5500||p.y>8600&&!scene.monsterSafe(p))&&
      !scene.monsterWater(p.x,p.y,5,5)&&scene.footprintTerrainOpen(p.x,p.y,6,5)&&scene.canOccupy(p.x,p.y),(beast,point)=>{
        const h=scene.faunaTerritories.find(t=>t.zoneId===beast.zoneId&&t.species===beast.species)??scene.faunaZones.find(z=>z.zoneId===beast.zoneId&&z.extraShanhe);
        return h&&insideHabitat(point,h,9);
      });
    this.system.initialize(this.now);
    this.sprites=new Map();
    this.jobs=new Map();
    this.retry=new Map();
    this.overlay=scene.add.graphics().setDepth(8000).setVisible(false);
    this.hint=scene.add.text(0,0,'',{fontFamily:'serif',fontSize:'12px',color:'#fff1ce',backgroundColor:'#142321e8',padding:{x:5,y:3}})
      .setOrigin(.5,1).setDepth(8001).setVisible(false);
    for(const n of this.world.npcs)if(ecologist(n))this.release(n,500);
    this.visuals(true);
  }

  get now(){return this.world.environment.faunaClockMs??0;}
  directs(n){return ecologist(n)&&this.jobs.has(n.id);}
  summary(){
    const nodes=this.system.nodes.filter(n=>n.harvestedAt===undefined);
    const guarded=nodes.filter(n=>n.guardSpecies).length;
    return `<b>Thiên tài địa bảo ${nodes.length} · ${guarded} có bảo hộ · ${nodes.length-guarded} mọc tự nhiên</b>
      <p><button data-west-overview>Toàn cảnh Tây Hoang</button></p>
      <details><summary>Vị trí linh dược</summary>${nodes.map(n=>{
        const def=treasureDefinition(n.itemId),guard=this.system.guardian(n);
        return `<button data-treasure-node="${n.id}">${def.name} · ${descriptions[treasureStage(n,this.now)]}${guard?' · Có bảo hộ':''}</button>`;
      }).join(' ')}</details>`;
  }
  goto(id){
    const node=this.system.nodes.find(n=>n.id===id);
    if(node)this.scene.navigateCameraTo(node.x,node.y,'treasure',false,1.2);
  }
  overview(){
    const {scene}=this,camera=scene.cameras.main;
    scene.cameraTween?.stop();
    if(scene.possessedNpcId){scene.cameraFollowSuspended=true;camera.stopFollow();}
    const zoom=Math.min(scene.scale.width/scene.westOffsetX,scene.scale.height/scene.map.heightInPixels)*.97;
    camera.setZoom(zoom).centerOn(-scene.westOffsetX/2,scene.map.heightInPixels/2);
    scene.clampCamera();scene.minimap?.update(true);scene.refreshFaunaVisibility();this.visuals(true);
  }
  goal(n,target,action,label){
    if(!ecologist(n)||n.goalAction!==action||!n.actionTarget||distance(n.actionTarget,target)>9){
      n.actionTarget={x:target.x,y:target.y};n.goalAction=action;n.action='travel';n.decisionSlot='west:treasure';
      this.scene.workstations.release(n.id);this.scene.resetNpcRoute(n);
    }
    n.shortGoal=label;
  }

  harvest(n,node){
    if(!this.system.harvest(n,node,this.now,(a,b)=>this.scene.monsterLine(a,b),()=>this.scene.persistPopulation()))return false;
    const sprite=this.sprites.get(node.id);sprite?.plant.setVisible(false);sprite?.spark.setVisible(false);
    return true;
  }

  nearby(n,range=32){
    return this.system.nodes.filter(node=>node.harvestedAt===undefined&&distance(n,node)<=range&&this.scene.monsterLine(n,node))
      .sort((a,b)=>distance(n,a)-distance(n,b))[0];
  }

  claimAncientChest(n){
    const sprite=this.scene.objectSprites.find(s=>this.scene.prop(s.getData('tiledObject'),'eastChest')===true);
    if(!sprite||distance(n,sprite)>46||!this.scene.monsterLine(n,sprite))return false;
    const id='east-ruins-chest',events=this.world.environment.processedEventIds;
    if(events.includes(id)){this.scene.worldPopulationToast('Rương cổ đã được mở.');return true;}
    const king=this.world.environment.fauna.find(f=>f.alive&&f.species==='bone-king');
    if(king){
      this.scene.worldPopulationToast('Rương cổ còn bị Vạn Cốt Quỷ Vương trấn giữ.');return true;
    }
    EconomySystem.add(n.inventory,'bone_jade',1);events.push(id);
    if(!this.scene.persistPopulation()){
      events.pop();EconomySystem.remove(n.inventory,'bone_jade',1);
      this.scene.worldPopulationToast('Chưa lưu được lần mở rương.');return true;
    }
    this.scene.worldPopulationToast('Đã mở rương cổ và nhận Bạch Cốt Linh Ngọc.');
    return true;
  }

  claimShanheChest(n){
    const sprite=this.scene.objectSprites.find(s=>s.name==='Rương Nam Sa');
    if(!sprite||distance(n,sprite)>44||!this.scene.monsterLine(n,sprite))return false;
    const id='shanhe:nam-sa-chest',events=this.world.environment.processedEventIds;
    if(events.includes(id)){this.scene.worldPopulationToast('Rương Nam Sa đã được mở.');return true;}
    if(this.world.environment.fauna.some(f=>f.alive&&f.zoneId==='se-antiquities'&&distance(f,sprite)<94)){
      this.scene.worldPopulationToast('Yêu thú vẫn đang canh giữ Rương Nam Sa.');return true;
    }
    EconomySystem.add(n.inventory,'bone_jade',1);events.push(id);
    if(!this.scene.persistPopulation()){
      events.pop();EconomySystem.remove(n.inventory,'bone_jade',1);
      this.scene.worldPopulationToast('Chưa lưu được lần mở Rương Nam Sa.');return true;
    }
    this.scene.worldPopulationToast('Đã tìm thấy Bạch Cốt Linh Ngọc trong Rương Nam Sa.');
    return true;
  }

  interact(n){
    if(this.claimShanheChest(n)||this.claimAncientChest(n))return true;
    const node=this.nearby(n);
    if(!node)return false;
    const def=treasureDefinition(node.itemId);
    if(!treasureBloomOpen(node,this.world.clock.minute)){
      this.scene.worldPopulationToast('Thanh Nguyệt Linh Liên chỉ nở ban đêm.');
      return true;
    }
    const ok=this.harvest(n,node);
    this.scene.worldPopulationToast(ok?`Đã thu hái ${def.name} ×1.`:
      `${def.name} · ${WEST_TREASURE_RARITY[def.grade]} · ${treasureStage(node,this.now)==='ready'?'Chưa lưu được lần thu hái':descriptions[treasureStage(node,this.now)]}.`);
    return true;
  }

  allowed(n){
    return !this.scene.expeditions?.has(n)&&n.alive&&!n.underground&&!n.decisionSlot?.startsWith('civic:')&&!n.ascended&&!n.convalescence&&n.x<0&&n.id!==this.scene.possessedNpcId&&allowedRoles.has(n.populationRole)&&
      !n.tribulation&&!aboveGroundCombat(n)&&!n.flight&&!n.skyStep&&!n.wallLevel&&!n.marketVisit&&!n.lawResponse&&!n.manualMeditation&&
      !n.assignedCommissionId&&!n.assignedResourceNodeId&&!n.faunaHuntTargetId&&(!n.assignedMissionId||this.scene.westWilds?.directs(n))&&n.hunger<79;
  }

  observedGuard(n,node){
    const guard=this.system.guardian(node);
    // The plant does not reveal its guardian through terrain or outside perception.
    return guard&&distance(n,guard)<178&&this.scene.monsterLine(n,guard)?guard:undefined;
  }

  assess(n,node,guard){
    const stats=cultivationStats(n),axes=n.aiProfile?.axes??{},def=treasureDefinition(node.itemId);
    const hp=n.hp/stats.hpMax,mp=n.mp/stats.mpMax;
    const courage=axes.courage??50,caution=axes.caution??50,greed=((axes.ambition??50)+(100-(axes.generosity??50)))/2;
    const cost=def.grade*6+distance(n,node)*.17;
    const reward=24+Math.sqrt(def.value)*5+greed*.27+courage*.2-caution*.2;
    return {hp,mp,score:reward-cost,canFight:Boolean(guard&&hp>.61&&mp>.21&&n.realmIndex>=(guard.realmIndex??0)&&
      this.scene.canRiskHunt(n,guard)),retreat:hp<.42||mp<.08||n.westPoison>=58};
  }

  release(n,delay=9000){
    this.jobs.delete(n.id);this.retry.set(n.id,this.now+delay);
    if(ecologist(n)){
      n.decisionSlot=undefined;n.goalAction='idle';n.action='idle';n.actionTarget={x:n.x,y:n.y};this.scene.resetNpcRoute(n);
    }
  }

  tick(){
    if(this.now<(this.nextTick??0))return;
    this.nextTick=this.now+450;
    if(this.system.update(this.now))this.scene.requestBackgroundSave();
    for(const n of this.world.npcs){
      let job=this.jobs.get(n.id);
      if(!this.allowed(n)){if(job)this.release(n);continue;}
      if(job){this.advance(n,job);continue;}
      if(this.now<(this.retry.get(n.id)??0)||n.goalAction==='flee'||n.goalAction==='fight'||n.meditationSpot||
        /^(society|sect-campus|board|mandate):/.test(n.decisionSlot??''))continue;
      const candidates=[];
      for(const node of this.system.nodes){
        if(distance(n,node)>193||treasureStage(node,this.now)!=='ready'||!this.scene.monsterLine(n,node))continue;
        const guard=this.observedGuard(n,node),decision=this.assess(n,node,guard);
        if(decision.score>0&&!decision.retreat)candidates.push({node,decision});
      }
      candidates.sort((a,b)=>b.decision.score-a.decision.score);
      const node=candidates.find(c=>this.scene.canReachPoint(n,c.node))?.node;
      if(node){
        job={node,until:this.now+16000,cooldown:0,phase:'approach'};
        this.jobs.set(n.id,job);this.advance(n,job);
      }else this.retry.set(n.id,this.now+1650+this.scene.stableHash(n.id)%600);
    }
  }

  advance(n,job){
    const {node}=job,scene=this.scene,now=this.now;
    if(job.phase==='retreat'){
      if(now>=job.until||!n.actionTarget||distance(n,n.actionTarget)<18)this.release(n,14000);
      return;
    }
    if(now>job.until||node.harvestedAt!==undefined){this.release(n);return;}
    const guard=this.observedGuard(n,node),risk=this.assess(n,node,guard),def=treasureDefinition(node.itemId);
    const engaged=guard?.targetNpcId&&guard.targetNpcId!==n.id;
    const quiet=guard?.state==='sleep'||guard?.flower?.phase==='rooted';
    const noticed=guard?.targetNpcId===n.id;
    if(n.goalAction==='flee'&&!ecologist(n)){
      if(guard)this.retreat(n,job,guard);
      else this.release(n,14000);
      return;
    }
    if(risk.retreat||guard&&(!risk.canFight&&!engaged&&!quiet||noticed&&!risk.canFight)){
      if(guard&&(noticed||distance(n,guard)<82||risk.retreat)){this.retreat(n,job,guard);return;}
      if(risk.retreat){this.release(n);return;}
      job.phase='wait';this.goal(n,n,'idle',`Chờ dịp hái ${def.name}`);return;
    }
    if(guard&&risk.canFight&&!engaged&&(!quiet||noticed)&&distance(guard,node)<145){
      const weapon=weaponForNpc(n),mode=weaponAttackMode(weapon,1,false),range=Math.min(70,mode.range??38);
      this.goal(n,scene.hunterApproach(n,guard),'fight',`Đối phó yêu thú bảo hộ ${def.name}`);
      job.phase='fight';
      if(now>=job.cooldown&&distance(n,guard)<=range&&scene.monsterLine(n,guard)){
        job.cooldown=now+1250;
        n.action='fight';
        const facing=scene.facePoint(n,guard);
        scene.playWeaponPose(n,mode,facing);
        if(weapon)scene.spawnWeaponFx(weapon.kind==='dao'?'dao':'thrust',facing,(n.x+guard.x)/2,(n.y+guard.y)/2);
        scene.applyFaunaDamage(guard,n,cultivationStats(n).attack*(mode.multiplier??1),`${node.id}:guard:${node.cycle}:${n.id}:${now}`);
      }
      return;
    }
    if(this.harvest(n,node)){
      if(guard&&distance(n,guard)<130){this.retreat(n,job,guard);return;}
      this.release(n);return;
    }
    this.goal(n,node,'gather',`Tới hái ${def.name}`);job.phase='approach';
  }

  retreat(n,job,guard){
    this.scene.evadeFauna(n,guard,this.scene.faunaNow());
    if(n.goalAction!=='flee'){this.release(n,14000);return;}
    n.decisionSlot='west:treasure';job.phase='retreat';job.until=this.now+6000;
  }

  guardSpot(beast){
    const node=this.system.nodes.find(n=>n.harvestedAt===undefined&&n.guardSpecies===beast.species&&n.zoneId===beast.zoneId&&
      distance(beast.home,n)<115&&this.system.guardian(n)?.id===beast.id);
    if(!node)return undefined;
    return {x:Math.round((beast.home.x*2+node.x)/3),y:Math.round((beast.home.y*2+node.y)/3)};
  }

  visuals(force=false){
    const scene=this.scene,view=scene.cameras.main.worldView;
    if(!force&&scene.time.now<(this.nextVisual??0))return;
    this.nextVisual=scene.time.now+150;
    for(const node of this.system.nodes){
      const def=treasureDefinition(node.itemId),stage=treasureStage(node,this.now);
      let sprite=this.sprites.get(node.id);
      if(!sprite){
        const east=EAST_TREASURE_IDS.indexOf(node.itemId);
        const plant=scene.add.image(node.x,node.y,east>=0?'east-treasure':'west-treasure',east>=0?east:WEST_TREASURE_IDS.indexOf(node.itemId)).setOrigin(.5,.93);
        const spark=scene.add.rectangle(node.x+6,node.y-21,2,2,COLORS[def.element],.55);
        this.sprites.set(node.id,sprite={plant,spark});
      }
      const visible=view.x-40<node.x&&view.right+40>node.x&&view.y-40<node.y&&view.bottom+40>node.y;
      sprite.plant.setVisible(visible&&(!EAST_TREASURE_IDS.includes(node.itemId)||stage!=='harvested'));
      sprite.spark.setVisible(visible&&stage==='ready'&&def.grade>=3);
      if(!visible)continue;
      const age=(this.now-node.plantedAt)/def.growMs;
      const phase=stage==='harvested'?5:stage==='ready'?4:stage==='mature'?3:age<.17?0:age<.44?1:2;
      const east=EAST_TREASURE_IDS.indexOf(node.itemId);
      const frame=east>=0?east+10*Math.min(treasureBloomOpen(node,this.world.clock.minute)?3:1,phase):WEST_TREASURE_IDS.indexOf(node.itemId)+15*phase;
      if(Number(sprite.plant.frame.name)!==frame)sprite.plant.setFrame(frame);
      sprite.plant.setPosition(node.x,node.y).setDepth(node.y);
      const step=Math.floor(this.now/200)%5;
      sprite.spark.setPosition(node.x+7-step,node.y-19-step).setDepth(node.y+2).setAlpha(.35+step*.12);
    }
    const actor=this.scene.scheduler?.byId.get(scene.possessedNpcId)?.npc, node=actor&&this.nearby(actor,55);
    this.hint.setVisible(Boolean(node));
    if(node){
      const label=!treasureBloomOpen(node,this.world.clock.minute)?'Chờ sen nở ban đêm':treasureStage(node,this.now)==='ready'?'E · Thu hái':descriptions[treasureStage(node,this.now)];
      this.hint.setText(`${treasureDefinition(node.itemId).name} · ${label}`).setPosition(node.x,node.y-29).setScale(1/Math.max(.65,scene.cameras.main.zoom));
    }
  }

  debug(visible){
    const g=this.overlay.clear().setVisible(visible),scene=this.scene;
    if(!visible)return;
    for(const zone of scene.faunaZones.filter(z=>z.spread)){
      g.lineStyle(5,0x9ce9da,.9).strokeRect(zone.x,zone.y,zone.width,zone.height);
    }
    for(const h of scene.faunaTerritories)g.lineStyle(3,0xf4c375,.68).strokeRect(h.x,h.y,h.width,h.height);
    for(const beast of this.world.environment.fauna){
      if(!beast.alive||beast.x>=0)continue;
      g.fillStyle(beast.rank==='elite'?0xf28067:0xc6ffc2,.95).fillCircle(beast.home.x,beast.home.y,12);
      g.lineStyle(2,0x95dfa1,.55).strokeCircle(beast.home.x,beast.home.y,beast.patrolRadius??90);
    }
    for(const node of this.system.nodes){
      if(node.harvestedAt!==undefined)continue;
      g.fillStyle(COLORS[treasureDefinition(node.itemId).element],1).fillRect(node.x-8,node.y-8,16,16);
      const beast=this.system.guardian(node);
      if(beast)g.lineStyle(3,0xeb98eb,.8).lineBetween(node.x,node.y,beast.x,beast.y);
    }
  }

}
