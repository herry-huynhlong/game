import { TRIBULATIONS, beginTribulation, needsTribulation, planTribulation, stepTribulation,
  tribulationLocked, worldMinute } from '../dao/TribulationSystem.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { cultivationRequired } from '../systems/RealmConfig.ts';
import { MeditationSpots } from './MeditationSpots.js';
import { TribulationVisuals } from './TribulationVisuals.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const phases={cloud:'BreakthroughPrepare',warning:'BreakthroughPrepare',strike:'CultivationAbsorb',
  success:'BreakthroughSuccess',failure:'BreakthroughFailure'};

export class WorldCultivation {
  constructor(scene){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.visuals=scene.add.graphics().setDepth(6500);
    this.stormVisuals=new TribulationVisuals(scene);
    this.poses=new Map();
    this.aware=new Map();
    this.flashes=new Map();
    this.spots=new MeditationSpots(scene);
    this.isSeated=this.isSeated.bind(this);
    this.sites=[];
    const center=scene.markers.find(m=>m.id==='sect-yard');
    if(center)for(const [dx,dy] of [[84,-116],[-84,-116],[125,0],[-125,0],[160,-125],[-160,-125],[200,100],[-200,100],[260,0],[-260,0]]){
      const p={x:center.x+dx,y:center.y+dy,name:'Thanh Vân Tông'};
      if(this.spots.safe(p)&&scene.canReachPoint(center,p)&&[[0,0],[22,0],[-22,0],[0,16],[0,-16]].every(([x,y])=>
        scene.footprintTerrainOpen(p.x+x,p.y+y,9,6)))this.sites.push(p);
    }
    for(const p of this.spots.spots)if(this.sites.length<12&&center&&distance(p,center)<245&&
      this.sites.every(other=>distance(other,p)>58))this.sites.push({...p,name:'Thanh Vân Tông'});
  }

  request(npc){
    if(!needsTribulation(npc))return false;
    if(npc.tribulation)return true;
    const radius=TRIBULATIONS[npc.realmIndex].radius;
    const occupied=this.world.npcs.filter(n=>n.tribulation&&n.alive);
    const site=this.sites.filter(p=>this.scene.canReachPoint(npc,p)&&
      occupied.every(n=>distance(n.tribulation.site,p)>Math.max(radius,TRIBULATIONS[n.tribulation.realm]?.radius??0)+32))
      .sort((a,b)=>distance(a,npc)-distance(b,npc))[0];
    if(!site){
      npc.shortGoal='Chờ điểm độ kiếp an toàn';npc.actionCooldown=30;
      return true;
    }
    if(!planTribulation(this.world,npc,site))return true;
    this.spots.release(npc);
    npc.actionTarget={x:site.x,y:site.y};
    npc.manualMeditation=false;
    npc.goalAction='cultivate';npc.shortGoal='Tìm nơi an toàn để độ Thiên Kiếp';
    this.scene.workstations.release(npc.id);this.scene.npcRoutes.delete(npc.id);
    this.scene.scheduler.byId.get(npc.id).waitingForSlot=false;
    this.scene.requestBackgroundSave();
    return true;
  }

  interrupt(npc){
    npc.manualMeditation=false;npc.meditationBlockedUntil=worldMinute(this.world)+8;
    this.spots.release(npc);
    if(npc.tribulation?.phase==='travel')delete npc.tribulation;
    if(tribulationLocked(npc))return;
    if(npc.action==='cultivate'){npc.action='idle';npc.actionProgress=0;}
  }

  toggle(npc){
    if(!npc?.alive||npc.flight||npc.skyStep||npc.tribulation||this.scene.characterRigPreview?.mount?.attached&&this.scene.characterRigPreview.npc===npc)return false;
    if(!npc.manualMeditation&&!this.spots.reserve(npc,true)){
      this.scene.worldPopulationToast('Hãy tìm khoảng đất trống, cách lối đi và cửa ra vào.');
      return false;
    }
    npc.manualMeditation=!npc.manualMeditation;
    if(npc.manualMeditation){
      npc.action=npc.goalAction='cultivate';npc.actionTarget={x:npc.x,y:npc.y};
      this.scene.heavenActions.stopFishing();
    }else this.interrupt(npc);
    return true;
  }

  tick(){
    const now=worldMinute(this.world),scene=this.scene;
    for(const n of this.world.npcs){
      const t=n.tribulation;
      if(n.id!==scene.possessedNpcId)n.manualMeditation=false;
      if(!n.alive||n.goalAction!=='cultivate'||n.flight||t)this.spots.release(n);
      if(n.manualMeditation&&!t&&n.alive&&now>=(n.meditationBlockedUntil??0)){
        // Possession suspends autonomous decisions, while meditation uses the same gain and breakthrough logic.
        scene.populationSimulation.meditateAtRest(n,this.world.clock.day,this.world.clock.minute);
      }
      if(!t)continue;
      if(t.phase==='travel'){
        if(!n.alive||now>=t.nextAt||n.goalAction==='fight'||n.goalAction==='flee'||n.hp<cultivationStats(n).hpMax*.42||
          !n.inventory.some(stack=>stack.itemId==='qi_pill'&&stack.count>0)){
          delete n.tribulation;n.manualMeditation=false;n.actionCooldown=Math.max(n.actionCooldown,25);scene.requestBackgroundSave();continue;
        }
        if(distance(n,t.site)<=9&&this.spots.open(n,n)&&beginTribulation(this.world,n)){
          n.manualMeditation=false;scene.npcRoutes.delete(n.id);scene.requestBackgroundSave();
        }
        continue;
      }
      const strikes=t.strikes;
      if(stepTribulation(this.world,n)){
        if(t.strikes>strikes)this.flashes.set(n.id,{at:scene.time.now,strike:t.strikes,id:t.id});
        if(!n.tribulation)this.flashes.delete(n.id);
        if(!tribulationLocked(n)){
          n.actionTarget=n.home??{x:n.x,y:n.y};
          scene.scheduler.byId.get(n.id).thinkDue=scene.scheduler.time+2400;
          scene.npcRoutes.delete(n.id);
        }
        scene.requestBackgroundSave();
      }
      if(tribulationLocked(n))this.warnNeighbors(n,t,now);
    }
  }

  warnNeighbors(subject,t,now){
    if(t.phase==='cloud')return;
    const scene=this.scene,radius=TRIBULATIONS[t.realm].radius,anchor=t.anchor??subject;
    for(const body of scene.groundOccupancy.near(anchor.x,anchor.y,radius+68)){
      const n=body.actor;
      if(n===subject||!n.alive||n.species||n.flight||n.tribulation||n.id===scene.possessedNpcId)continue;
      const range=distance(n,anchor);
      if(range>=radius+68)continue;
      const last=this.aware.get(n.id);
      if(last?.id===t.id&&now-last.at<5)continue;
      if(range>=radius){
        if(last?.id===t.id||n.goalAction!=='idle'&&n.goalAction!=='rest'||
          n.profession!=='tu_si'&&(n.aiProfile?.axes?.courage??0)<65||
          !scene.groundPositionOpen(n,n.x,n.y))continue;
        this.aware.set(n.id,{id:t.id,at:now,until:now+4});
        scene.npcRoutes.delete(n.id);
        n.actionTarget={x:n.x,y:n.y};n.goalAction='idle';n.action='idle';n.shortGoal='Quan sát Thiên Kiếp từ xa';
        continue;
      }
      const angle=Math.atan2(n.y-anchor.y,n.x-anchor.x);
      const target=[0,.52,-.52,1.04,-1.04,Math.PI].map(offset=>({x:Math.round(anchor.x+Math.cos(angle+offset)*(radius+34)),
        y:Math.round(anchor.y+Math.sin(angle+offset)*(radius+34))})).find(p=>
        scene.groundPositionOpen(n,p.x,p.y)&&scene.canReachPoint(n,p));
      if(!target)continue;
      this.aware.set(n.id,{id:t.id,at:now,until:now+6});
      scene.merchants?.cancel(n,'Tránh vùng Thiên Lôi');
      scene.workstations.release(n.id);scene.npcRoutes.delete(n.id);
      n.actionTarget=target;n.goalAction='flee';n.action='travel';n.shortGoal='Tránh vùng Thiên Lôi';
      if(last?.id!==t.id){
        n.memories.push({day:this.world.clock.day,text:'Tránh thiên lôi gần '+t.site.name+'.',kind:'tribulation',otherId:subject.id,sourceId:t.id});
        if(n.memories.length>12)n.memories.shift();
      }
    }
  }

  fleeing(npc){return (this.aware.get(npc.id)?.until??0)>worldMinute(this.world);}

  standingUp(npc,time){
    return this.poses.has(npc.id)&&npc.goalAction!=='fight'&&npc.goalAction!=='flee'&&
      this.poseFor(npc,time)?.name==='StandUp';
  }

  guardResting(npc){
    return npc.populationRole==='city_guard'&&npc.id!==this.scene.possessedNpcId&&
      npc.decisionSlot==='guard-relief'&&npc.goalAction==='rest'&&npc.action==='rest'&&
      npc.actionTarget&&distance(npc,npc.actionTarget)<=12;
  }

  isSeated(npc){
    if(!npc.alive||npc.wallLevel||npc.flight||npc.skyStep)return false;
    if(npc.tribulation&&npc.tribulation.phase!=='travel'||this.guardResting(npc)||this.scene.society?.isSeated(npc))return true;
    return Boolean(npc.meditationSpot&&npc.action==='cultivate'&&npc.goalAction==='cultivate'&&
      worldMinute(this.world)>=(npc.meditationBlockedUntil??0)&&distance(npc,npc.meditationSpot)<=7&&
      (this.scene.groundOccupancy.bodies.get(npc.id)?.seated||this.spots.open(npc,npc)));
  }

  poseFor(npc,time){
    const preview=this.arena?.pose(npc);
    if(preview)return preview;
    const t=npc.tribulation,actor=this.scene.npcSprites.get(npc.id);
    const rest=this.guardResting(npc)||this.scene.society?.isSeated(npc);
    const seated=this.isSeated(npc)&&!actor?.getData('moving');
    let pose=this.poses.get(npc.id);
    if(!pose&&!seated)return null;
    const sim=this.scene.scheduler.time;
    if(!pose||pose.seated!==seated){pose={seated,at:time,simAt:sim};this.poses.set(npc.id,pose);}
    const elapsed=Math.max(time-pose.at,sim-pose.simAt);
    if(!seated&&elapsed>=360){this.poses.delete(npc.id);return null;}
    const name=(t&&phases[t.phase])||(seated?elapsed<100?'PrepareMeditation':elapsed<360?'SitDown':
      rest?'RestIdle':Math.floor(elapsed/1100)%3===2?'CultivationAbsorb':'MeditationIdle':'StandUp');
    const amount=t&&t.phase!=='travel'?1:seated?Math.max(0,Math.min(1,(elapsed-100)/260)):Math.max(0,1-elapsed/360);
    return {name,amount,rest,breath:Math.floor(time/420)%3===1?1:0,shocked:time-(this.flashes.get(npc.id)?.at??-10000)<125};
  }

  draw(time){
    const g=this.visuals,view=this.scene.cameras.main.worldView;
    g.clear();
    let meditators=0;
    for(const n of this.world.npcs){
      const actor=this.scene.npcSprites.get(n.id);
      if(!actor||n.x<view.x-175||n.x>view.right+175||n.y<view.y-40||n.y>view.bottom+240)continue;
      const pose=actor.visible&&n.alive?this.poseFor(n,time):null;
      if(pose?.amount>.7&&!pose.rest&&meditators++<22){
        g.fillStyle(0x83ecd0,.8);
        for(let i=0;i<4;i++){
          const a=time/1150+i*Math.PI*.5;
          g.fillRect(Math.round(n.x+Math.cos(a)*17),Math.round(n.y-13+Math.sin(a)*6),2,2);
        }
      }
    }
    if(this.arena)this.arena.draw(time);
    else this.stormVisuals.live(time,this.world,this.flashes);
    if(this.debug)this.drawTraffic(g,view);
  }

  drawTraffic(g,view){
    const scene=this.scene;
    for(const [id,entry] of scene.scheduler.byId){
      const {npc}=entry;
      if(!npc.alive||!view.contains(npc.x,npc.y))continue;
      const body=scene.groundOccupancy.bodies.get(id);
      if(body?.seated)g.lineStyle(1,0x94f7c9,.95).strokeRect(body.x-body.width/2,body.y-body.height/2,body.width,body.height);
      const renderer=scene.npcAppearanceFleet?.entries.get(id)?.renderer;
      const a=renderer?.meditationAnchors;
      if(a){
        const point=(p,color)=>{
          const x=renderer.root.x+(p[0]-32)*renderer.root.scaleX;
          const y=renderer.root.y+(p[1]-93)*renderer.root.scaleY;
          g.fillStyle(color,1).fillRect(x-1,y-1,3,3);
          return {x,y};
        };
        const neck=point(a.neck,0xf1ba56),chest=point(a.body,0x64e8e8);
        point([a.neck[0],a.neck[1]-12],0xf383af);
        g.lineStyle(1,0xf1ba56,.9).lineBetween(neck.x,neck.y,chest.x,chest.y);
      }
      if(id!==scene.selectedNpcId&&!entry.bypass)continue;
      const route=entry.bypass?.points.slice(entry.bypass.index)??scene.npcRoutes.get(id)?.points.slice(npc.routeIndex??0,16);
      if(route?.length){
        g.lineStyle(1,0xe8a751,.95);g.beginPath();g.moveTo(npc.x,npc.y);
        for(const p of route)g.lineTo(p.x,p.y);
        g.strokePath();
        for(const p of route)g.fillStyle(0xe8a751,.95).fillRect(p.x-1,p.y-1,3,3);
      }
      if(entry.velocity)g.lineStyle(1,0x67b7fd,1).lineBetween(npc.x,npc.y,npc.x+entry.velocity.x*.5,npc.y+entry.velocity.y*.5);
    }
  }

  diagnostics(){
    const scene=this.scene;
    return [...scene.scheduler.byId.values()].filter(e=>e.npc.alive).map(e=>{
      const t=scene.npcRoutes.get(e.npc.id),b=scene.groundOccupancy.bodies.get(e.npc.id),time=scene.scheduler.time;
      return {id:e.npc.id,spot:e.npc.meditationSpot??null,seated:b?.seated??false,footprint:b?[b.width,b.height]:null,
        waypoint:e.bypass?.points[e.bypass.index]??t?.points[e.npc.routeIndex]??null,
        velocity:e.velocity??{x:0,y:0},repaths:e.seatedRepaths??0,stuckMs:e.blockedSince?time-e.blockedSince:0,
        wait:e.seatedWaitUntil>time?'meditation-obstacle':e.waitingForSlot?'reserved-position':e.passageWait??null};
    });
  }

  mountDemo(){
    const scene=this.scene;
    const panel=document.createElement('aside');
    panel.className='drawer';
    panel.id='cultivation-demo';
    panel.style.cssText='left:16px;right:auto;top:auto;bottom:66px;width:min(330px,calc(100vw - 32px));z-index:23';
    panel.innerHTML='<header><b>Sân thử Thiên Kiếp</b></header><p>Bản lưu thử riêng</p><div class="drawer-row">'+
      '<button type="button" data-rank="0">Trúc Cơ</button><button type="button" data-rank="2">Nguyên Anh</button>'+
      '<button type="button" data-rank="3" data-injured>Hóa Thần · trọng thương</button></div><p role="status"></p>';
    const status=panel.querySelector('[role=status]');
    for(const button of panel.querySelectorAll('[data-rank]'))button.onclick=()=>{
      const rank=Number(button.dataset.rank);
      const choice=this.world.npcs.find(n=>n.alive&&!n.tribulation&&!n.flight&&
        n.populationRole===(rank===0?'low_disciple':'elder'));
      const site=this.sites.find(p=>choice&&scene.groundPositionOpen(choice,p.x,p.y)&&
        this.world.npcs.every(n=>!n.tribulation||distance(n.tribulation.site,p)>(TRIBULATIONS[rank].radius+40)));
      if(!site){status.textContent='Chưa có điểm trống. Chờ lượt đang diễn ra kết thúc.';return;}
      Object.assign(choice,{x:site.x,y:site.y,realmIndex:rank,realmLevel:9,xp:cultivationRequired(rank,9),fatigue:0,hunger:10,talent:85,
        action:'cultivate',goalAction:'cultivate',actionCooldown:0,marketVisit:undefined});
      const stats=cultivationStats(choice),low=button.hasAttribute('data-injured');
      choice.hp=Math.ceil(stats.hpMax*(low?.51:1));choice.mp=stats.mpMax;
      choice.inventory=[...choice.inventory.filter(stack=>stack.itemId!=='qi_pill'),{itemId:'qi_pill',count:1}];
      scene.npcSprites.get(choice.id).setPosition(choice.x,choice.y).setDepth(choice.y).setData('moving',false);
      this.request(choice);
      this.tick();
      scene.cameraTween?.stop();scene.cameraTween=null;scene.setZoom(1.65);
      scene.cameras.main.centerOn(choice.x,choice.y-68);
      status.textContent=choice.tribulation?choice.name+' · '+choice.shortGoal:'Chưa vào lượt thử.';
    };
    document.body.append(panel);
    scene.events.once('shutdown',()=>panel.remove());
  }
}
