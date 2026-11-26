import { EconomySystem as Economy } from '../dao/EconomySystem.ts';
import { faunaCombatPower } from '../dao/FaunaSystem.ts';
import { FAUNA_SPECIES, faunaName, faunaRealm } from '../dao/MonsterRegistry.ts';
import { treasureBloomOpen, treasureStage } from '../dao/WestTreasureSystem.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { weaponAttackMode, weaponForNpc } from './WeaponCombat.js';

const names={gather:'Hái Dược Đội',warrant:'Chấp Pháp Đội',hunt:'Liệp Yêu Đội',raid:'Thảo Phạt Đội',mine:'Khai Khoáng Đội',scout:'Thám Hiểm Đội',escort:'Hộ Tống Đội',patrol:'Tuần Tra Đội'};
const phases={assemble:'Tập hợp',outbound:'Xuất hành',field:'Đang thực hiện',loot:'Thu chiến lợi phẩm',returning:'Đang về giao nhiệm vụ',retreat:'Đang rút lui'};
const hunters=[
  ['forest-rim','wolf','wolf_pelt',0,9],['west-outer','wolf','wolf_pelt',0,11],['west-inner','boar','crimson_plate',1,15],
  ['west-poison','toad','toad_sac',2,15],['west-poison','centipede','centipede_sac',2,17],
  ['west-poison','flower','flower_stamen',2,17],['west-ancient','eagle','eagle_feather',2,19],
  ['west-ancient','millennial','millennial_wood',2,24,'elite'],
  ['east-rim','sand-scorpion','scorpion_venom',0,12],
  ['east-bones','bone-skeleton','bone_jade',1,17],
  ['east-canyon','flame-lizard','red_fire_crystal',1,19],
  ['east-ruins','bone-general','yin_soul_herb',2,24],
  ['sw-valley','wolf','wolf_pelt',1,17],['sw-umbral','flower','flower_stamen',2,23],
  ['south-lake','toad','toad_sac',1,16],['se-red-ridge','flame-lizard','red_fire_crystal',2,23],
  ['se-bones','bone-wolf','bone_jade',2,24],

];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=p=>({x:p.x,y:p.y});
const health=n=>n.hp/cultivationStats(n).hpMax;
const membership=['low_disciple','independent_cultivator','hunter','elder','herb_gatherer'];
const MAX_ACTIVE=3;

export class Expeditions {
  constructor(scene){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.state=this.world.expeditions??={serial:0,parties:[],retry:{},counters:{},next:0};
    this.veins=scene.sectCampus.spiritVeins;
    this.current=new Map();
    for(const party of this.state.parties){
      if(!phases[party.phase])continue;
      for(const id of party.members)this.current.set(id,party);
    }
  }

  get now(){const {day,minute}=this.world.clock;return day*1440+minute;}
  npc(id){return this.scene.scheduler.byId.get(id)?.npc;}
  has(n){return this.current.has(n.id);}
  of(n){return this.current.get(n.id);}
  stat(name){this.state.counters[name]=(this.state.counters[name]??0)+1;}
  treasury(q){return q.shopId?this.world.shops.find(s=>s.id===q.shopId):this.scene.sectCampus.vault;}
  fund(q,amount){
    if(q.kind==='warrant')return amount<0?this.scene.civic.assignWarrant(q):this.scene.civic.returnWarrant(q,amount);
    const owner=this.treasury(q), key=q.shopId?'cash':'wealth';
    if(!owner||owner[key]+amount<0)return false;
    owner[key]+=amount;
    return true;
  }
  allowed(n,q){
    if(n.realmIndex<q.realm)return false;
    if(q.kind==='warrant'){const c=this.scene.civic.state.cases[q.caseId];return c.actorId!==n.id&&c.victimId!==n.id&&this.scene.civic.knowsWarrant(n,q);}
    if(q.siteId&&q.kind==='mine')return this.veins.authorized(n,this.veins.sites.get(q.siteId));
    return true;
  }
  willing(n,q,leader,fromTea=false){
    const scene=this.scene,axes=n.aiProfile?.axes??{},distanceToMeet=distance(n,q.meet);
    const factionJob=/^(sect-campus:|society:|market:|env-|profession:)/.test(n.decisionSlot??'')&&
      !['sect-campus:array','sect-campus:home','sect-campus:library'].includes(n.decisionSlot)&&
      !(fromTea&&this.scene.society?.visits[n.id]?.venue==='tea');
    return membership.includes(n.populationRole)&&n.alive&&!n.underground&&!n.ascended&&!n.decisionSlot?.startsWith('civic:')&&!this.has(n)&&
      n.id!==scene.possessedNpcId&&!n.manualMeditation&&!n.tribulation&&!n.marketVisit&&!n.flight&&!n.skyStep&&!n.wallLevel&&
      !n.assignedMissionId&&!n.assignedCommissionId&&!n.faunaHuntTargetId&&!n.westTreasureTrip&&
      !scene.westWilds?.directs(n)&&!scene.westTreasures?.directs(n)&&!scene.recovery?.drives(n)&&
      !scene.sectCampus.orderFor(n)&&!n.lawResponse&&!factionJob&&!['fight','flee'].includes(n.goalAction)&&
      health(n)>=.73&&n.mp>=cultivationStats(n).mpMax*.36&&n.fatigue<78&&n.hunger<68&&
      this.allowed(n,q)&&distanceToMeet<(q.region?.startsWith('east-')?4800:3400)&&scene.canReachPoint(n,q.meet)&&
      (n.relationships?.[leader?.id]??0)>-36&&
      (n.spiritStones<78||n.populationRole==='hunter'||(axes.courage??40)>=47||q.kind==='mine');
  }
  options(){
    const scene=this.scene, active=this.state.parties.filter(p=>phases[p.phase]), proposals=scene.civic?.warrantJobs()??[];
    const marker=id=>scene.markers.find(p=>p.id===id);
    const shop=scene.merchants.shops.get('city-market');
    const meet=marker('forest-outer')??marker('gate-west');
    const desk=shop?.position??meet;
    if(shop&&meet&&shop.shop.cash>25)for(const [region,species,item,realm,reward,rank] of hunters){
      const zone=scene.faunaZones.find(z=>z.zoneId===region);
      const territory=zone?.territories?.[species]??(zone?.species===species?zone:null);
      if(!territory||Economy.count(shop.shop.stock,item)>=2)continue;
      const field=zone?.extraShanhe?marker(region):region==='forest-rim'?meet:{x:territory.x+(territory.anchorDx??territory.width*.5),y:territory.y+(territory.anchorDy??territory.height*.5)};
      const camp=region.startsWith('east-')?marker('east-camp'):null;
      const rally=camp?marker('city-center'):zone?.extraShanhe?marker('gate-south-outside'):meet;
      if(!rally||!field)continue;
      proposals.push({key:'hunt:'+region+':'+species,kind:rank?'raid':'hunt',species,rank,item,realm,reward,region,
        meet:rally,desk,field,via:camp?point(camp):undefined,shopId:shop.shop.id,label:'Tìm '+faunaName({species,rank})+' · '+(territory.name??region)});
    }
    const apothecary=scene.merchants.shops.get('city-apothecary'),camp=marker('east-camp');
    if(apothecary&&camp&&apothecary.shop.cash>23){
      const treasure=scene.westTreasures;
      const node=treasure?.system.nodes.find(n=>n.x>5700&&distance(n,camp)<1100&&
        treasureStage(n,treasure.now)==='ready'&&treasureBloomOpen(n,this.world.clock.minute)&&!treasure.system.guardian(n)&&
        Economy.count(apothecary.shop.stock,n.itemId)<2&&scene.canReachPoint(camp,n));
      if(node)proposals.push({headcount:4,key:'gather:'+node.id,kind:'gather',region:'east-gather',realm:0,reward:14,
        meet:marker('city-center')??camp,via:point(camp),desk:apothecary.position,field:point(node),item:node.itemId,nodeId:node.id,
        shopId:apothecary.shop.id,label:'Thu thập thiên tài địa bảo gần Thanh Nguyệt'});
    }
    if(apothecary&&apothecary.shop.cash>=16){
      const treasure=scene.westTreasures, rally=marker('gate-south-outside');
      // Local suppliers announce the roadside herb patch at Bách Hoa Cốc.
      const notice=marker('south-flowers');
      if(treasure&&rally&&notice)for(const node of treasure.system.nodes){
        if(node.zoneId!=='south-flowers'||distance(node,notice)>180||treasure.system.guardian(node)||
          treasureStage(node,treasure.now)!=='ready'||Economy.count(apothecary.shop.stock,node.itemId)>=2||
          !scene.canReachPoint(notice,node))continue;
        proposals.push({headcount:4,key:'gather:'+node.id,kind:'gather',region:node.zoneId,realm:0,reward:15,
          meet:rally,desk:apothecary.position,field:point(node),item:node.itemId,nodeId:node.id,
          shopId:apothecary.shop.id,label:'Thu hái dược liệu Bách Hoa Cốc'});
      }
    }
    const vault=scene.sectCampus.vault;
    const mineDesk=scene.sectCampus.site('counter')??meet;
    const mineMeet=scene.sectCampus.site('expedition-meet')??mineDesk;
    if(vault.wealth<165&&vault.wealth>=10&&mineMeet){
      const sites=[...this.veins.sites.values()].filter(s=>s.grade>=2&&s.state.amount>=2&&(!s.state.owner||s.state.owner===vault.id));
      for(const site of sites){
        const known=site.state.discovered;
        const kind=!known?'scout':this.veins.guard(site)?'raid':'mine';
        const guard=known&&this.veins.guard(site);
        const reward=kind==='mine'?site.worth*2-1:kind==='raid'?site.grade*4:2;
        const field=guard?.home??site.point;
        proposals.push({key:kind+':'+site.id,kind,siteId:site.id,region:site.region,realm:site.grade-1,reward,
          species:guard?.species,rank:guard?.rank,guardId:guard?.id,meet:mineMeet,desk:mineDesk,field,
          label:(kind==='mine'?'Khai thác ':kind==='scout'?'Thăm dò ':'Dẹp yêu thú giữ ')+site.name});
      }
    }
    const courier=scene.sectCampus.state.orders.find(q=>q.type==='city-courier'&&q.status==='active'&&!q.dispatched&&q.assignee);
    const carrier=courier&&this.npc(courier.assignee),station=marker('city-center');
    if(carrier?.alive&&station&&vault.wealth>=16){
      proposals.push({key:'escort:'+courier.id,kind:'escort',realm:0,reward:8,region:'old-road',meet:station,
        desk:mineMeet,field:mineMeet,carrierId:carrier.id,courierId:courier.id,label:'Hộ tống '+carrier.name+' vận chuyển quặng'});
    }
    const danger=this.world.events.slice(-40).reverse().find(e=>e.type==='fauna-retaliation'&&this.now-(e.day*1440+e.minute)<230&&
      this.world.environment.fauna.some(f=>f.id===e.actorId&&f.alive&&f.zoneId==='forest-rim'));
    if(danger&&meet&&vault.wealth>=32){
      const foe=this.world.environment.fauna.find(f=>f.id===danger.actorId);
      const route=[{x:meet.x,y:meet.y-128},point(meet),{x:meet.x,y:meet.y+128}]
        .filter(p=>scene.footprintTerrainOpen(p.x,p.y,12,7)&&scene.canReachPoint(meet,p));
      if(route.length>=2)proposals.push({key:'patrol:'+foe.id,kind:'patrol',realm:0,reward:6,region:'forest-rim',
        meet,desk:meet,field:route[0],route,label:'Tuần tra lối rừng sau báo cáo bị yêu thú tấn công'});
    }
    return proposals.filter(q=>this.now>=(this.state.retry[q.key]??0)&&
      !active.some(p=>p.job.region===q.region||p.job.siteId&&p.job.siteId===q.siteId||p.job.key===q.key));
  }

  recruit(){
    const active=this.state.parties.filter(p=>phases[p.phase]);
    if(active.length>=MAX_ACTIVE||this.world.clock.minute<380||this.world.clock.minute>950)return;
    const added=q=>/^(sw-|se-|south-)/.test(q.region??'');
    const needsShanhe=!active.some(p=>added(p.job));
    const needsEast=!active.some(p=>p.job.region?.startsWith('east-'));
    const options=this.options();
    if(needsEast||needsShanhe){
      const priority=q=>needsShanhe&&added(q)?(q.kind==='gather'?4:3):needsEast&&q.region?.startsWith('east-')?(q.kind==='gather'?2:1):0;
      options.sort((a,b)=>priority(b)-priority(a));
    }
    for(const q of options){
      const candidates=this.world.npcs.filter(n=>this.willing(n,q)).sort((a,b)=>
        distance(a,q.meet)-distance(b,q.meet)-(a.realmIndex-b.realmIndex)*100||
        a.id.localeCompare(b.id));
      const leader=candidates[0];
      if(!leader)continue;
      const team=candidates.filter(n=>n===leader||this.willing(n,q,leader))
        .sort((a,b)=>a===leader?-1:b===leader?1:
          distance(a,q.meet)-distance(b,q.meet)-((a.relationships?.[leader.id]??0)-(b.relationships?.[leader.id]??0))*3).slice(0,q.headcount??(q.realm>=2?5:3));
      if(team.length<3)continue;
      if(this.form(q,team))break;
    }
  }
  form(q,team,conversation){
    if(team.length<3||team.length>5||team.some(n=>this.has(n))||
      this.state.parties.filter(p=>phases[p.phase]).length>=MAX_ACTIVE)return null;
    const spots=this.slots(team,q.meet);
    if(!spots||!this.fund(q,-q.reward))return null;
    const id='expedition-'+(++this.state.serial);
    const party={id,name:names[q.kind]+' '+this.state.serial,job:{...q,meet:point(q.meet),field:point(q.field),desk:point(q.desk)},
      leader:team[0].id,members:team.map(n=>n.id),initialCount:team.length,created:this.now,phase:'assemble',started:this.now,escrow:q.reward,spots,hits:0};
    if(conversation){party.conversationId=conversation.id;party.source='tea';}
    this.state.parties.push(party);
    for(const n of team){
      if(conversation)this.scene.society.end(n,this.scene.society.visits[n.id],210);
      this.current.set(n.id,party);
      this.scene.cultivation.spots.release(n);this.scene.workstations.release(n.id);
    }
    this.stat('formed');if(conversation)this.stat('socialFormed');
    this.scene.requestBackgroundSave();
    return party;
  }
  teaPlan(group){
    const meet=this.scene.society?.places.get('tea')?.counter;
    if(group.length<2||!meet||this.state.parties.filter(p=>phases[p.phase]).length>=MAX_ACTIVE)return null;
    for(const job of this.options().filter(q=>['warrant','hunt','mine','scout'].includes(q.kind))){
      const q={...job,meet};
      const leader=group.find(n=>this.willing(n,q,null,true));
      if(!leader)continue;
      const team=[leader,...group.filter(n=>n!==leader&&this.willing(n,q,leader,true))].slice(0,5);
      if(team.length<2)continue;
      if(team.length===2){
        // A pair at the table can ask someone they know to meet the party in person.
        const invited=this.world.npcs.filter(n=>!group.includes(n)&&team.some(friend=>(friend.relationships[n.id]??0)>0)&&
          distance(n,meet)<620&&this.willing(n,q,leader))
          .sort((a,b)=>distance(a,meet)-distance(b,meet))[0];
        if(invited)team.push(invited);
      }
      if(team.length>=3&&team.reduce((m,n)=>m+(n.aiProfile?.axes?.courage??40),0)/team.length>=35)return {q,team};
    }
    return null;
  }
  fromConversation(group,c){
    if(!c.proposal)return null;
    const plan=this.teaPlan(group);
    if(plan?.q.key!==c.proposal.key)return null;
    return this.form(plan.q,plan.team,c);
  }

  slots(team,center,range=46){
    const occupied=[];
    for(const n of team){
      const choices=[center,...[range,range+26,range+52].flatMap(r=>Array.from({length:12},(_,i)=>({
        x:Math.round(center.x+Math.cos(i*Math.PI/6)*r),y:Math.round(center.y+Math.sin(i*Math.PI/6)*r),
      })))];
      const spot=choices.find(p=>occupied.every(s=>distance(p,s)>=24)&&this.scene.footprintTerrainOpen(p.x,p.y,10,7)&&
        !this.scene.monsterWater(p.x,p.y,8,5)&&this.scene.canReachPoint(n,p));
      if(!spot)return null;
      occupied.push(point(spot));
    }
    return Object.fromEntries(team.map((n,i)=>[n.id,occupied[i]]));
  }

  move(n,p,action,label){
    if(!p)return;
    if(n.decisionSlot!=='expedition'||!n.actionTarget||distance(n.actionTarget,p)>11){
      n.actionTarget=point(p);n.actionProgress=0;
      this.scene.resetNpcRoute(n);
      this.scene.scheduler.byId.get(n.id).waitingForSlot=false;
    }
    n.goalAction=action;n.decisionSlot='expedition';n.shortGoal=label;
  }
  change(p,phase){
    if(phase==='retreat'&&p.phase!==phase)this.stat('withdrawals');
    p.phase=phase;p.started=this.now;delete p.spots;delete p.fieldSpots;
    this.scene.requestBackgroundSave();
  }
  leave(n,p){
    this.current.delete(n.id);
    p.members=p.members.filter(id=>id!==n.id);
    if(n.decisionSlot==='expedition'){
      n.decisionSlot=undefined;n.goalAction='rest';n.actionTarget=n.home??point(n);
      this.scene.resetNpcRoute(n);
    }
    if(p.leader===n.id)p.leader=p.members[0];
    delete p.spots;delete p.fieldSpots;
  }
  finish(p,result){
    if(!phases[p.phase])return;
    this.fund(p.job,p.escrow);p.escrow=0;
    p.phase=result;p.finished=this.now;
    this.state.retry[p.job.key]=this.now+(result==='completed'?650:300);
    p.result=result;p.roster=[...p.members];
    const {day,minute}=this.world.clock;
    const event={id:p.id+':'+result,type:'expedition-'+result,day,minute,actorId:p.leader,status:'completed',
      data:{members:p.roster},description:p.name+(result==='completed'?' đã hoàn thành chuyến đi.':' đã kết thúc chuyến đi mà chưa đạt mục tiêu.')};
    this.world.events.push(event);if(this.world.events.length>400)this.world.events.shift();
    if(result==='completed')for(const id of p.roster){
      const n=this.npc(id);
      if(n)for(const other of p.roster)if(other!==id)n.relationships[other]=Math.min(100,(n.relationships[other]??0)+6);
    }
    for(const id of [...p.members]){const n=this.npc(id);if(n)this.leave(n,p);else this.current.delete(id);}
    this.stat(result);this.scene.requestBackgroundSave();
  }
  travel(p,team,target){
    p.spots??=this.slots(team,target);
    if(!p.spots)return false;
    const leader=team.find(n=>n.id===p.leader)??team[0];
    const far=team.find(n=>n!==leader&&distance(n,leader)>230);
    if(!far||p.catchUpAt===undefined)p.catchUpAt=this.now;
    for(const n of team){
      const spot=p.spots[n.id];
      const wait=n===leader&&far&&this.now-p.catchUpAt<28&&distance(n,spot)>48;
      this.move(n,wait?point(n):spot,'travel',wait?'Chờ đồng đội bắt kịp':phases[p.phase]+' · '+p.name);
    }
    return team.every(n=>p.spots[n.id]&&distance(n,p.spots[n.id])<19);
  }
  threat(n){
    return this.world.environment.fauna.find(f=>f.alive&&f.targetNpcId===n.id&&distance(f,n)<112);
  }

  field(p,team){
    const q=p.job,leader=team.find(n=>n.id===p.leader)??team[0];
    if(q.kind==='warrant'){
      const civic=this.scene.civic,c=civic.state.cases[q.caseId],suspect=c&&civic.npc(c.actorId);
      if(!c||!suspect){this.change(p,'retreat');return;}
      if(c.state==='resolved'||civic.confront(c,team)){this.change(p,'returning');return;}
      const below=civic.caveSite(c);
      if(below){
        if(team.some(n=>n.underground))return;
        if(this.travel(p,team,below.point))this.scene.underground.enter(team,below,{type:'warrant',id:p.id,caseId:c.id},112);
        return;
      }
      if(!p.lastKnown)p.lastKnown=point(c.point);
      if(team.some(n=>distance(n,suspect)<160&&this.scene.monsterLine(n,suspect))&&distance(p.lastKnown,suspect)>36){p.lastKnown=point(suspect);delete p.spots;}
      this.travel(p,team,p.lastKnown);
      return;
    }
    if(q.kind==='gather'){
      const treasure=this.scene.westTreasures, node=treasure.system.nodes.find(n=>n.id===q.nodeId);
      if(!node||treasureStage(node,treasure.now)!=='ready'||!treasureBloomOpen(node,this.world.clock.minute)||treasure.system.guardian(node)){this.change(p,'retreat');return;}
      if(distance(leader,node)>29){this.travel(p,team,node);return;}
      const before=Economy.count(leader.inventory,node.itemId);
      if(treasure.harvest(leader,node)){
        p.holderId=leader.id;p.item=node.itemId;p.amount=Economy.count(leader.inventory,node.itemId)-before;
        this.change(p,'returning');
      }
      return;
    }
    if(q.kind==='patrol'){
      const danger=team.map(n=>this.threat(n)).find(Boolean);
      if(danger){this.fight(p,team,danger);return;}
      const index=p.patrolIndex??0;
      if(this.travel(p,team,q.route[index])){
        if(index===q.route.length-1)this.change(p,'returning');
        else {p.patrolIndex=index+1;delete p.spots;}
      }
      return;
    }
    if(q.kind==='scout'){
      const site=this.veins.sites.get(q.siteId);
      if(p.explored||p.exploreEntered){this.change(p,p.explored?'returning':'retreat');return;}
      if(distance(leader,site.point)<=70){
        this.veins.reveal(site,leader);
        const under=this.scene.underground,mine=under.sites.get(site.id);
        if(this.veins.guard(site)||!team.every(n=>under.canEnter(n,mine))){this.change(p,'returning');return;}
        if(this.travel(p,team,site.point)&&under.enter(team,mine,{type:'explore',id:p.id},112))p.exploreEntered=true;
      }
      return;
    }
    if(q.kind==='mine'){
      const site=this.veins.sites.get(q.siteId);
      const danger=team.map(n=>this.threat(n)).find(Boolean);
      if(danger){this.fight(p,team,danger);return;}
      if(this.scene.underground){
        if(p.mineEntered){
          p.amount=p.mineWork?.collected??0;
          if(p.amount){p.holderId=leader.id;p.item=site.item;this.change(p,'returning');}
          else this.change(p,'retreat');
        }else if(!site.state.amount||this.veins.guard(site))this.change(p,'retreat');
        else if(this.travel(p,team,site.point)&&this.scene.underground.enter(team,this.scene.underground.sites.get(site.id),{type:'party',id:p.id},100))p.mineEntered=true;
        return;
      }
      if(!site.state.amount||this.veins.guard(site)){this.change(p,'retreat');return;}
      p.fieldSpots??=this.slots(team,site.point,46);
      for(const n of team)this.move(n,p.fieldSpots?.[n.id],n===leader?'work':'guard',n===leader?'Khai thác '+site.name:'Bảo vệ '+site.name);
      if(distance(leader,site.point)>24){delete p.workAt;return;}
      p.workAt??=this.now+site.minutes;
      if(this.now>=p.workAt){
        p.amount=this.veins.extract(leader,site,2);
        if(p.amount){p.holderId=leader.id;p.item=site.item;this.change(p,'returning');}
        else this.change(p,'retreat');
      }
      return;
    }
    const fauna=this.world.environment.fauna;
    let target=fauna.find(f=>f.id===p.preyId);
    if(target&&!target.alive){this.change(p,'loot');return;}
    if(!target){
      const used=new Set(this.state.parties.filter(other=>other!==p&&phases[other.phase]).map(other=>other.preyId));
      target=fauna.filter(f=>f.alive&&f.species===q.species&&f.zoneId===q.region&&(!q.rank||f.rank===q.rank)&&
        (!q.guardId||q.guardId===f.id)&&
        !used.has(f.id)&&team.some(n=>distance(n,f)<245&&this.scene.monsterLine(n,f))&&this.scene.canReachPoint(leader,f))
        .sort((a,b)=>distance(leader,a)-distance(leader,b))[0];
      if(!target){
        const index=Math.floor((this.now-p.started)/28)%6,theta=index*Math.PI/3;
        const probe={x:q.field.x+Math.cos(theta)*97,y:q.field.y+Math.sin(theta)*97};
        if(this.scene.footprintTerrainOpen(probe.x,probe.y,10,7)){
          if(p.probe!==index){p.probe=index;delete p.spots;}
          this.travel(p,team,probe);
        }
        return;
      }
      p.preyId=target.id;this.stat('encounters');
    }
    this.fight(p,team,target);
  }

  fight(p,team,target){
    const realm=faunaRealm(target).realmIndex;
    const teamPower=team.reduce((sum,n)=>{const stats=cultivationStats(n);return sum+(stats.attack+stats.defense+n.realmIndex*12)*health(n);},0);
    if(teamPower<faunaCombatPower(target.species,target.rank)+realm*24){this.change(p,'retreat');return;}
    if(!p.combatSlots||distance(p.combatAnchor,target)>16||this.now-p.combatAt>=10){
      p.combatSlots=this.slots(team,target,30)??{};p.combatAnchor=point(target);p.combatAt=this.now;
    }
    for(const [index,n] of team.entries()){
      if(distance(n,target)>44||!this.scene.monsterLine(n,target)){
        let spot=p.combatSlots[n.id];
        if(!spot||distance(spot,target)<20||distance(spot,target)>52){
          const angle=index*2*Math.PI/team.length;
          spot={x:target.x+Math.cos(angle)*35,y:target.y+Math.sin(angle)*35};
        }
        if(this.scene.footprintTerrainOpen(spot.x,spot.y,10,7)&&this.scene.canReachPoint(n,spot))this.move(n,spot,'fight','Áp sát '+faunaName(target));
        continue;
      }
      this.move(n,point(n),'fight','Giao chiến với '+faunaName(target));
      if(this.now<(n.expeditionStrikeAt??0)||!target.alive)continue;
      n.expeditionStrikeAt=this.now+2;
      const weapon=weaponForNpc(n),mode=weaponAttackMode(weapon,1,false);
      if(this.scene.npcSprites.get(n.id)?.visible){
        const facing=this.scene.facePoint(n,target);
        this.scene.playWeaponPose(n,mode,facing);
        this.scene.spawnWeaponFx(weapon?.kind==='dao'?'dao':'thrust',facing,target.x,target.y);
      }
      const hit=this.scene.applyFaunaDamage(target,n,cultivationStats(n).attack*(mode.multiplier??1),`${p.id}:strike:${target.id}:${n.id}:${this.now}`);
      if(hit.ok)p.hits++;
      if(hit.ok&&!target.alive){this.stat('kills');break;}
    }
  }

  collect(p,team){
    if(p.phase!=='loot')return;
    const q=p.job,ground=this.world.environment.drops.filter(d=>d.sourceId===p.preyId&&d.status==='ground');
    const owner=this.treasury(q);
    const drop=ground.find(d=>!q.item||d.itemId===q.item)??(q.shopId&&ground.find(d=>
      FAUNA_SPECIES[q.species].loot.includes(d.itemId)&&Economy.count(owner?.stock??[],d.itemId)<2));
    if(!drop){
      if(!q.item&&p.hits>0){this.change(p,'returning');return;}
      this.change(p,'retreat');return;
    }
    const collector=team.find(n=>distance(n,drop)<31);
    if(collector){
      const claim=this.scene.claimFaunaDropForNpc(drop.id,collector.id,p.id+':'+drop.id,false);
      if(claim){
        p.holderId=collector.id;p.amount=claim.count;p.item=claim.itemId;
        this.stat('loot');this.change(p,'returning');
      }
      return;
    }
    this.travel(p,team,drop);
  }

  deliver(p,team){
    if(p.phase!=='returning'||p.escrow<=0)return;
    const q=p.job,owner=q.kind==='warrant'?this.scene.civic.city:this.treasury(q);
    if(!owner)return;
    if(q.via&&!p.restedOnReturn&&distance(team[0],q.via)<900){
      if(!this.travel(p,team,q.via))return;
      p.campServices=(p.campServices??0)+(this.scene.society?.restExpedition(team)??0);
      p.restedOnReturn=true;delete p.spots;
    }
    if(!this.travel(p,team,q.desk))return;
    if(p.item){
      const carrier=this.npc(p.holderId);
      if(!carrier||!team.includes(carrier)||!Economy.remove(carrier.inventory,p.item,p.amount)){this.finish(p,'failed');return;}
      if(q.shopId)Economy.add(owner.stock,p.item,p.amount);
      else if(q.kind==='mine'){
        owner.wealth+=p.amount*this.veins.sites.get(q.siteId).worth;
        this.stat('shipments');
      }else Economy.add(owner.treasury,p.item,p.amount);
    }
    const pay=Math.floor(p.escrow/team.length), extra=p.escrow%team.length;
    for(const n of team)n.spiritStones+=pay+(n.id===p.leader?extra:0);
    p.paid=p.escrow;p.escrow=0;
    this.finish(p,'completed');
  }

  step(p){
    for(const id of [...p.members]){
      const n=this.npc(id);
      if(n&&(!n.alive||n.ascended||n.id===this.scene.possessedNpcId||n.wallLevel||n.flight||n.tribulation||this.scene.recovery?.drives(n)))this.leave(n,p);
    }
    const team=p.members.map(id=>this.npc(id)).filter(Boolean);
    if(!team.length){this.finish(p,'failed');return;}
    for(const n of team){
      n.hunger=Math.min(100,n.hunger+.14);
      n.fatigue=Math.min(100,n.fatigue+(p.phase==='field'?.18:.1));
      if(n.hunger>=64&&Economy.remove(n.inventory,'ration',1))n.hunger-=42;
    }
    const deepWarrant=p.job.kind==='warrant'&&this.scene.civic.caveSite(this.scene.civic.state.cases[p.job.caseId]);
    const limit=deepWarrant||p.exploreEntered?2400:/^(east-|sw-|se-|south-)/.test(p.job.region??'')?1680:p.phase==='returning'&&(p.item||p.job.kind==='warrant')?960:680;
    if(p.phase!=='retreat'&&(team.length<3||team.some(n=>health(n)<.48||n.fatigue>=94||n.hunger>=90)||this.now-p.created>limit)){
      p.failureReason=team.length<3?'Không đủ thành viên':this.now-p.created>limit?'Hết thời gian nhiệm vụ':'Sinh lực hoặc nhu cầu không bảo đảm';
      this.change(p,'retreat');
    }
    if(team.some(n=>n.underground)){
      if(p.phase==='field'&&deepWarrant)this.field(p,team);
      return;
    }
    if(p.phase==='outbound'||p.phase==='field'){
      p.furthestWest=Math.min(p.furthestWest??Infinity,...team.map(n=>n.x));
    }
    if(p.phase==='retreat'){
      if(this.travel(p,team,p.job.meet)||this.now-p.started>160)this.finish(p,'failed');
    }else if(p.phase==='assemble'){
      if(this.travel(p,team,p.job.meet)){
        this.stat('departed');if(p.conversationId)this.stat('socialDeparted');
        this.change(p,'outbound');
      }
      else if(this.now-p.started>135){p.failureReason='Quá giờ tập hợp';this.finish(p,'failed');}
    }else if(p.phase==='outbound'){
      if(p.job.via&&!p.stoppedAtCamp){
        if(this.travel(p,team,p.job.via)){
          p.campServices=this.scene.society?.restExpedition(team)??0;
          p.stoppedAtCamp=true;delete p.spots;
        }
        return;
      }
      if(p.job.kind==='escort'){
        const carrier=this.npc(p.job.carrierId),order=this.scene.sectCampus.state.orders.find(q=>q.id===p.job.courierId);
        if(carrier?.alive&&team.filter(n=>distance(n,carrier)<145).length>=2){
          const traveled=p.lastEscorted?distance(carrier,p.lastEscorted):0;
          if(traveled<155)p.escortedDistance=(p.escortedDistance??0)+traveled;
          p.lastEscorted=point(carrier);
        }else delete p.lastEscorted;
        if(order?.status==='completed'){
          if((p.escortedDistance??0)>=180)this.change(p,'returning');
          else {p.failureReason='Chưa đi đủ tuyến cạnh người vận chuyển';this.change(p,'retreat');}
          return;
        }
        if(!carrier?.alive||order?.status!=='active'){this.change(p,'retreat');return;}
        if(!p.escortPoint||distance(p.escortPoint,carrier)>64){p.escortPoint=point(carrier);delete p.spots;}
        const threat=this.threat(carrier);
        if(threat){this.fight(p,team,threat);return;}
        this.travel(p,team,p.escortPoint);
      }else if(this.travel(p,team,p.job.field)){this.change(p,'field');}
      else if(this.now-p.started>(/^(sw-|se-|south-)/.test(p.job.region??'')?750:255)){p.failureReason='Không tới được thực địa đúng hạn';this.change(p,'retreat');}
    }else if(p.phase==='field')this.field(p,team);
    else if(p.phase==='loot')this.collect(p,team);
    else if(p.phase==='returning')this.deliver(p,team);
  }

  tick(){
    if(this.now<(this.nextTick??0))return;
    this.nextTick=this.now+3;
    for(const p of this.state.parties)if(phases[p.phase])this.step(p);
    if(this.now>=this.state.next){
      this.state.next=this.now+25;this.recruit();
      if(this.state.parties.length>72)this.state.parties=this.state.parties.filter(p=>phases[p.phase]||this.now-p.finished<2400);
    }
  }
  role(p,n){return n.id===p.leader?'Đội trưởng'+(p.job.kind==='mine'?' · Khai thác':''):p.job.kind==='mine'||p.job.kind==='escort'?'Hộ vệ':'Đồng đội';}
  status(p){return phases[p.phase]??(p.phase==='completed'?'Hoàn thành':'Thất bại');}
}
