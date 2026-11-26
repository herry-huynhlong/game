import { creditDeath } from '../dao/DivinePowerLedger.ts';
import {caveDistance,caveLine,caveOpen,caveCell} from './UndergroundMaps.js';
import {CivicVeinPanel} from './CivicVeinPanel.js';
import {EconomySystem as Economy} from '../dao/EconomySystem.ts';
import {cultivationStats} from '../systems/CultivationSystem.ts';

export const CRIME_NAMES={
  seizure:'Chiếm hữu trái phép',coercion:'Cưỡng ép lao động',assault:'Tấn công dân thường',
  theft:'Trộm tài nguyên',breach:'Vi phạm hợp đồng',robbery:'Cướp tài sản',
  guardAssault:'Tấn công vệ binh',disorder:'Gây rối trật tự',
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=p=>({x:p.x,y:p.y});
const finished=new Set(['resolved','unresolved']);
const riskPower=n=>n.realmIndex*35+n.realmLevel*2;
const regular=n=>n?.alive&&!n.ascended&&!n.underground&&!n.flight&&!n.skyStep&&!n.wallLevel&&!n.tribulation;
const matches=(npc,title,world)=>npc.id===title||world.factions.some(f=>f.id===title&&(npc.faction===f.id||npc.faction===f.name));
const witnessTraits=n=>n.aiProfile?.axes??{};

export function witnessResponse(n,actor,victim,severity){
  const axes=witnessTraits(n),duty=n.populationRole==='city_guard',relation=n.relationships?.[victim?.id]??0;
  const resolve=(axes.discipline??45)*.55+(axes.generosity??45)*.35+relation*.4+(duty?38:0);
  const risk=Math.max(0,riskPower(actor)-riskPower(n))+severity*8;
  if(resolve>=48&&risk<=30&&(axes.courage??45)>=72)return 'intervene';
  if(resolve>=47&&risk<105)return duty?'report-city':n.populationRole==='low_disciple'?'report-sect':'report-city';
  if(resolve>=35&&risk<45)return 'help';
  if(risk>45)return 'leave';
  return resolve>=32?'share':'ignore';
}

export class CivicSystem {
  constructor(scene){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.veins=scene.sectCampus.spiritVeins;
    this.city=this.world.factions.find(f=>f.id==='qingyun-city');
    this.sect=scene.sectCampus.vault;
    this.state=this.world.civic??={serial:0,cases:{},contracts:{},custody:{},stats:{}};
    this.hall=scene.markers.find(m=>m.id==='city-hall-entrance')??scene.markers.find(m=>m.id==='city-center');
    this.master=this.world.npcs.find(n=>n.authorityRole==='city_master');
    this.officers=this.world.npcs.filter(n=>n.populationRole==='city_guard').slice(0,2);
    this.panel=new CivicVeinPanel(this);
  }
  get now(){return this.world.clock.day*1440+this.world.clock.minute;}
  npc(id){return this.scene.scheduler.byId.get(id)?.npc;}
  save(){this.scene.requestBackgroundSave();}
  count(key){this.state.stats[key]=(this.state.stats[key]??0)+1;}
  purse(id){
    const npc=this.npc(id);
    if(npc)return {record:npc,key:'spiritStones',items:npc.inventory};
    const faction=this.world.factions.find(f=>f.id===id);
    return faction&&{record:faction,key:'wealth',items:faction.treasury};
  }
  balance(id){const p=this.purse(id);return p?.record[p.key]??0;}
  money(id,delta){
    const p=this.purse(id);
    if(!p||!Number.isSafeInteger(delta)||p.record[p.key]+delta<0)return false;
    p.record[p.key]+=delta;
    return true;
  }
  reputation(n,key,delta,faction){
    if(!n)return;
    const r=n.reputation??={good:0,bad:0,trade:0,trust:0,relations:{}};
    r[key]=Math.max(0,Math.min(100,(r[key]??0)+delta));
    if(faction)r.relations[faction]=Math.max(-100,Math.min(100,(r.relations[faction]??0)+delta));
  }
  event(id,text,actorId,targetId,knownBy=[],verified=true){
    const world=this.world;
    if(world.events.some(e=>e.id===id))return;
    const {day,minute}=world.clock;
    const event={id,type:'civic-case',day,minute,actorId,targetId,description:text,status:'occurred',
      data:{civic:true,knownBy:[...new Set(knownBy.filter(Boolean))],verified}};
    world.events.push(event);
    if(world.events.length>400)world.events.shift();
    this.save();
  }
  mark(npc,target,tag,goal='travel',caseId=null){
    const next='civic:'+tag;
    if(npc.decisionSlot!==next||!npc.actionTarget||distance(npc.actionTarget,target)>12){
      npc.actionTarget=point(target);
      this.scene.resetNpcRoute(npc);
      this.scene.workstations.release(npc.id);
    }
    npc.decisionSlot=next;
    if(caseId)npc.civicCaseId=caseId;else delete npc.civicCaseId;
    npc.goalAction=goal;
    npc.shortGoal={report:'Đến trình báo',work:'Đi làm theo hợp đồng',delivery:'Đưa quặng đến điểm giao',investigate:'Đến xác minh vụ việc',
      arrest:'Thi hành nhiệm vụ chấp pháp',victim:'Đang chờ được giải cứu',escape:'Rời khỏi nơi nguy hiểm'}[tag];
  }
  release(n){
    if(!n?.decisionSlot?.startsWith('civic:'))return;
    delete n.decisionSlot;
    delete n.civicCaseId;
    n.actionTarget=n.home??point(n);
    n.goalAction=n.populationRole==='city_guard'?'patrol':'rest';
    this.scene.resetNpcRoute(n);
  }
  busy(n){
    return !regular(n)||n.id===this.scene.possessedNpcId||n.convalescence||n.lawResponse||n.marketVisit||n.manualMeditation||
      n.faunaHuntTargetId||n.assignedCommissionId||n.assignedMissionId||this.scene.expeditions?.has(n)||
      this.scene.sectCampus.orderFor(n)||this.scene.society?.visits[n.id]||this.scene.westWilds?.directs(n)||this.scene.westTreasures?.directs(n)||
      n.decisionSlot?.startsWith('civic:')||n.decisionSlot?.startsWith('sect-campus:');
  }
  canMine(n,site){
    if(!site||!n.alive||n.realmIndex<site.grade-1)return false;
    const s=site.state;
    const contract=n.underground?.job?.type==='contract'?this.state.contracts[n.underground.job.id]:this.activeWorker(n.id);
    if(contract?.siteId===site.id&&contract.status==='active'&&contract.workerId===n.id&&contract.employer===s.owner&&
      (!s.controller||s.controller===s.owner))return true;
    if(s.manager===n.id&&(!s.controller||s.controller===s.owner))return true;
    if(s.controller&&!matches(n,s.controller,this.world))return false;
    if(!s.owner||matches(n,s.owner,this.world))return true;
    return false;
  }
  mayRepresent(actor,id){
    const faction=this.world.factions.find(f=>f.id===id);
    return actor?.alive&&(actor.id===id||Boolean(faction&&matches(actor,id,this.world)&&
      (faction.leaderId===actor.id||actor.authorityRole==='sect_leader'&&id===this.sect.id||actor===this.master&&id===this.city?.id)));
  }
  name(id){return this.npc(id)?.name??this.world.factions.find(f=>f.id===id)?.name??'Vô chủ';}
  claim(n,site,holder=n.id){
    if(!regular(n)||!site||distance(n,site.point)>38||!this.scene.monsterLine(n,site.point)||!site.state.discovered||
      n.realmIndex<site.grade-1||this.veins.guard(site)||site.state.owner||site.state.controller)return false;
    if(!this.mayRepresent(n,holder))return false;
    if(this.world.factions.some(f=>f.id===holder&&f.type==='sect')&&
      [...this.veins.sites.values()].some(v=>v.grade===site.grade&&v.state.owner===holder))return false;
    const s=site.state;
    s.owner=holder;s.controller=holder;s.claimedAt=this.now;
    this.reputation(n,'trust',2);
    this.event('vein-title:'+site.id,n.name+' xác lập quyền sở hữu '+site.name+'.',n.id,null,[n.id]);
    return true;
  }
  manage(actor,site,manager){
    if(!actor||!site||!this.mayRepresent(actor,site.state.owner)||!manager?.alive||actor===manager||(actor.relationships?.[manager.id]??0)<8)return false;
    site.state.manager=manager.id;
    this.save();
    return true;
  }
  offer(actor,site,terms){
    if(!actor?.alive||!site||!site.state.owner||!site.state.discovered||site.state.controller!==site.state.owner||
      (!this.mayRepresent(actor,site.state.owner)&&site.state.manager!==actor.id)||
      this.activeSite(site.id)||!this.hall||!['wage','share','lease'].includes(terms.mode)||
      !Number.isSafeInteger(terms.price)||terms.price<0||!Number.isSafeInteger(terms.quantity)||terms.quantity<1||
      terms.quantity>Math.min(site.state.amount,8))return null;
    const faction=this.world.factions.find(f=>f.id===site.state.owner);
    if(faction&&actor.id!==faction.leaderId&&actor!==this.master&&actor.populationRole!=='sect_leader'&&site.state.manager!==actor.id)return null;
    const {mode,price,quantity}=terms,employer=site.state.owner;
    if(mode==='wage'&&price<=0||mode==='share'&&(price<25||price>75||quantity<2)||mode==='lease'&&price<=0)return null;
    const escrow=mode==='wage'?price:0;
    if(escrow&&!this.money(employer,-escrow))return null;
    const id='mining-contract-'+(++this.state.serial);
    const contract={id,siteId:site.id,employer,createdBy:actor.id,mode,price,quantity,item:site.item,status:'open',
      escrow,collected:0,created:this.now,expires:this.now+1080,workerId:null,receipt:point(this.hall)};
    this.state.contracts[id]=contract;
    this.count('offers');this.save();
    return contract;
  }
  owned(n){return [...this.veins.sites.values()].filter(site=>site.state.owner===n.id);}
  wanted(n){return this.cases.filter(c=>c.actorId===n.id&&['open','assigned'].includes(c.warrant?.status));}
  get contracts(){return Object.values(this.state.contracts);}
  get cases(){return Object.values(this.state.cases);}
  activeSite(id){return this.contracts.find(c=>c.siteId===id&&['open','active'].includes(c.status));}
  activeWorker(id){return this.contracts.find(c=>c.workerId===id&&c.status==='active');}
  expectedRate(c,site){return c.mode==='wage'?c.price:c.mode==='share'?Math.floor(c.quantity*c.price/100)*site.worth:c.quantity*site.worth-c.price;}
  willing(n,c,site){
    if(this.busy(n)||n.id===c.employer||n.realmIndex<site.grade-1||n.hunger>64||n.fatigue>74||
      n.hp<cultivationStats(n).hpMax*.68||distance(n,site.point)>3600||!this.scene.canReachPoint(n,site.point))return false;
    if(!['commoner','independent_cultivator','repair_worker','herb_gatherer','low_disciple','hunter'].includes(n.populationRole))return false;
    const danger=(site.grade-1)*2+(this.veins.guard(site)?5:0),axes=witnessTraits(n),rate=this.expectedRate(c,site);
    return rate>=Math.max(1,c.quantity+danger-(axes.diligence??45)/40)&&
      (danger===0||(axes.courage??40)>=44+danger*4)&&
      (c.mode!=='lease'||n.spiritStones>=c.price)&&!(n.relationships?.[c.createdBy]<-30);
  }
  accept(n,c){
    const site=this.veins.sites.get(c?.siteId);
    if(!site||c.status!=='open'||c.expires<=this.now||!this.willing(n,c,site))return false;
    if(c.mode==='lease'&&!this.money(n.id,-c.price))return false;
    c.leaseEscrow=c.mode==='lease'?c.price:0;
    c.workerId=n.id;c.status='active';c.accepted=this.now;c.expires=this.now+1560;
    this.mark(n,site.point,'work','work');
    this.count('accepted');this.save();
    return true;
  }
  settle(n,c){
    if(c.status!=='active'||c.workerId!==n.id||n.underground||distance(n,c.receipt)>34)return false;
    const qty=Math.min(c.collected,Economy.count(n.inventory,c.item));
    if(!qty||qty<c.quantity&&!c.closing)return false;
    const owner=this.purse(c.employer);
    if(!owner)return false;
    const workerShare=c.mode==='share'?Math.floor(qty*c.price/100):c.mode==='lease'?qty:0;
    const delivered=qty-workerShare;
    if(delivered&&!Economy.remove(n.inventory,c.item,delivered))return false;
    if(delivered)Economy.add(owner.items,c.item,delivered);
    const paid=c.mode==='wage'?Math.floor(c.escrow*qty/c.quantity):0;
    if(paid)this.money(n.id,paid);
    if(c.escrow>paid)this.money(c.employer,c.escrow-paid);
    if(c.leaseEscrow)this.money(c.employer,c.leaseEscrow);
    Object.assign(c,{paid,delivered,workerShare,status:'completed',finished:this.now,escrow:0,leaseEscrow:0});
    this.reputation(n,'trade',3);
    this.reputation(this.npc(c.createdBy),'trade',2);
    this.release(n);this.count('deliveries');
    this.event(c.id+':delivered',n.name+' đã giao sản lượng theo hợp đồng khai thác.',n.id,c.createdBy,[n.id,c.createdBy]);
    return true;
  }
  cancelContract(c,reason){
    if(!['open','active'].includes(c.status))return;
    if(c.escrow)this.money(c.employer,c.escrow);
    if(c.leaseEscrow)this.money(c.workerId,c.leaseEscrow);
    Object.assign(c,{status:'closed',reason,finished:this.now,escrow:0,leaseEscrow:0});
    this.release(this.npc(c.workerId));this.save();
  }
  restricted(n){return (n?.reputation?.bad??0)>=35&&this.wanted(n).length>0;}
  tickContracts(){
    for(const c of this.contracts){
      const site=this.veins.sites.get(c.siteId);
      if(c.status==='open'){
        if(c.expires<=this.now||!site||site.state.owner!==c.employer){this.cancelContract(c,'Hết hạn hoặc đổi chủ');continue;}
        const candidates=this.world.npcs.filter(n=>this.willing(n,c,site))
          .sort((a,b)=>distance(a,site.point)-distance(b,site.point));
        if(candidates[0])this.accept(candidates[0],c);
      }else if(c.status==='active'){
        const n=this.npc(c.workerId);
        if(!n?.alive||!site||this.now>c.expires+320){this.cancelContract(c,'Không thể hoàn thành');continue;}
        if(n.underground)continue;
        if(n.id===this.scene.possessedNpcId||n.civicCaseId||n.convalescence||n.flight||n.skyStep||n.tribulation)continue;
        if(c.collected>=c.quantity||c.expires<=this.now||!this.canMine(n,site)||!site.state.amount){
          if(!c.collected){this.cancelContract(c,'Không thu được sản lượng');continue;}
          c.closing=true;
          this.mark(n,c.receipt,'delivery');
          this.settle(n,c);
        }else{
          this.mark(n,site.point,'work','work');
          this.scene.underground.enter([n],this.scene.underground.sites.get(site.id),{type:'contract',id:c.id});
        }
      }
    }
  }
  unlawfulControl(actor,site){
    if(!regular(actor)||!site?.state.owner||site.state.dispute&&!site.state.dispute.resolvedAt||this.canMine(actor,site)||
      distance(actor,site.point)>35||!this.scene.monsterLine(actor,site.point))return false;
    const owner=this.npc(site.state.owner);
    const c=this.record({id:'seizure:'+site.id+':'+this.now,kind:'seizure',actorId:actor.id,victimId:owner?.id,point:site.point,siteId:site.id,severity:2});
    if(!c)return false;
    site.state.controller=actor.id;
    site.state.dispute={caseId:c.id,claimants:[site.state.owner,actor.id],opened:this.now};
    this.save();
    return true;
  }
  record(input){
    if(!Object.hasOwn(CRIME_NAMES,input.kind)||!input.id||this.state.cases[input.id])return null;
    const actor=this.npc(input.actorId),victim=this.npc(input.victimId);
    if(!actor?.alive||!input.point)return null;
    const under=actor.underground;
    if(under&&victim&&(victim.underground?.siteId!==under.siteId||victim.underground.floor!==under.floor))return null;
    const severity=Math.max(1,Math.min(3,Math.floor(input.severity??1)));
    const c={id:input.id,kind:input.kind,actorId:actor.id,victimId:victim?.id??null,
      point:point(under?input.point.underground??input.point:input.point),at:this.now,severity,siteId:under?.siteId??input.siteId??null,
      floor:under?.floor??null,state:'undetected',
      reports:[],witnesses:[],evidence:[],responders:[],known:[actor.id,...(victim?[victim.id]:[])],result:null};
    for(const n of this.world.npcs){
      if(n===actor||!this.nearCase(n,c,c.point,Number.isInteger(c.floor)?5:106))continue;
      const response=witnessResponse(n,actor,victim,severity);
      c.witnesses.push({id:n.id,response,at:this.now});
      if(!c.known.includes(n.id))c.known.push(n.id);
    }
    this.state.cases[c.id]=c;
    if(input.kind==='assault'||input.kind==='guardAssault')c.injury=Boolean(input.injury);
    if(c.kind==='coercion'&&victim?.alive&&!this.state.custody[victim.id]){
      this.state.custody[victim.id]={caseId:c.id,status:'awaiting-rescue',since:this.now};
      this.mark(victim,victim,'victim','idle',c.id);
    }
    this.event('fact:'+c.id,CRIME_NAMES[c.kind]+' · '+actor.name,actor.id,victim?.id,c.known);
    this.count('recorded');this.save();
    return c;
  }
  caveSite(c){return Number.isInteger(c?.floor)?this.scene.underground.sites.get(c.siteId):null;}
  nearCase(n,c,target,radius){
    if(!n?.alive)return false;
    const site=this.caveSite(c);
    if(!site)return regular(n)&&distance(n,target)<=radius&&this.scene.monsterLine(n,target);
    const d=n.underground;
    return d?.siteId===site.id&&d.floor===c.floor&&caveDistance(d,target)<=radius&&caveLine(site.map.floors[c.floor],d,target);
  }
  groundPoint(c){return this.caveSite(c)?.point??c.point;}
  undergroundAccess(npc,site,job){
    if(!job||!['law','warrant'].includes(job.type))return false;
    const c=this.state.cases[job.caseId];
    if(!c||this.caveSite(c)!==site)return false;
    if(job.type==='law')return ['verifying','confirmed','handling'].includes(c.state)&&!c.warrant&&c.responders.includes(npc.id);
    const party=this.scene.expeditions.of(npc);
    return c.state==='handling'&&c.warrant?.status==='assigned'&&party?.id===job.id&&party.phase==='field'&&party.members.includes(npc.id);
  }
  advanceUnderground(npc,site,job){
    const d=npc.underground,c=this.state.cases[job.caseId],u=this.scene.underground;
    if(!this.undergroundAccess(npc,site,job))return false;
    const floor=site.map.floors[d.floor];
    if(d.floor!==c.floor){
      const dir=Math.sign(c.floor-d.floor),portal=dir>0?floor.down:floor.entry;
      if(caveDistance(d,portal))u.move(npc,portal,floor);
      else u.portal(npc,site,dir);
      return true;
    }
    const suspect=this.npc(c.actorId);
    const target=c.state!=='verifying'&&suspect?.underground&&this.nearCase(npc,c,suspect.underground,8)?suspect.underground:c.point;
    if(caveDistance(d,target)<=1){npc.action='guard';return true;}
    const blocked=u.blocked(npc);
    const spots=[target,...[[1,0],[-1,0],[0,1],[0,-1]].map(([x,y])=>({x:x+target.x,y:y+target.y}))]
      .filter(p=>caveOpen(floor,p.x,p.y)&&!blocked.has(caveCell(floor,p))).sort((a,b)=>caveDistance(d,a)-caveDistance(d,b));
    for(const p of spots)if(u.move(npc,p,floor,blocked))break;
    return true;
  }
  undergroundStrike(actor,victim,lawful=false){
    const d=actor.underground,v=victim.underground;
    if(!actor.alive||!victim.alive||!d||v?.siteId!==d.siteId||v.floor!==d.floor)return false;
    const stats=cultivationStats(actor),defense=cultivationStats(victim).defense;
    const damage=Math.max(1,Math.round(stats.attack*.24-defense*.1));
    victim.hp=Math.max(0,victim.hp-damage);
    if(!lawful)this.violence({eventId:'mine-assault:'+actor.id+':'+victim.id+':'+this.now,attackerId:actor.id,victimId:victim.id,damage});
    if(!victim.hp){victim.alive=false;victim.deathCause='Giao tranh dưới lòng đất';creditDeath(this.world,victim,'npc-death',victim.deathCause);delete victim.underground;}
    this.save();
    return true;
  }
  violence(input){
    if(input.authorizedDuel)return {ok:true,reason:'authorized-duel',responders:[]};
    const actor=this.npc(input.attackerId),victim=this.npc(input.victimId);
    if(!actor||!victim)return {ok:false,reason:'invalid'};
    if(input.retaliation&&this.cases.some(c=>c.actorId===victim.id&&c.victimId===actor.id&&this.now-c.at<=30))
      return {ok:true,reason:'self-defense',responders:[]};
    const c=this.record({id:input.eventId,kind:victim.populationRole==='city_guard'?'guardAssault':'assault',
      actorId:actor.id,victimId:victim.id,point:victim,injury:input.damage>0,severity:1+Number(input.damage>=35)+Number(actor.realmIndex>=2)});
    return {ok:Boolean(c),reason:c?'recorded':'duplicate',caseId:c?.id,responders:[]};
  }
  report(c,n,source='city'){
    if(!c||!regular(n)||finished.has(c.state)||!this.hall)return false;
    const officer=this.officers.find(g=>regular(g)&&distance(n,g)<=45&&this.scene.monsterLine(n,g))??
      (distance(n,this.hall)<=42&&regular(this.master)&&distance(this.master,this.hall)<85&&this.scene.monsterLine(n,this.master)?this.master:null);
    const atSect=source==='sect'&&distance(n,this.scene.sectCampus.site('counter')??this.hall)<40&&this.scene.sectCampus.availableClerk();
    if(!officer&&!atSect)return false;
    const direct=c.witnesses.some(w=>w.id===n.id)||c.victimId===n.id;
    const rumored=(this.scene.society?.account(n).news??[]).some(row=>row.id==='fact:'+c.id);
    if(!direct&&!rumored||c.reports.some(r=>r.id===n.id))return false;
    const newState=c.state==='undetected';
    c.reports.push({id:n.id,source:atSect?'sect':'city',direct,at:this.now,receivedBy:officer?.id??this.scene.sectCampus.clerk?.id});
    if(direct)c.evidence.push({source:n.id,kind:n.id===c.victimId?'victim':'witness',at:this.now});
    if(newState){c.state='reported';c.changed=this.now;}
    this.release(n);this.count('reports');this.save();
    return true;
  }
  dispatch(c){
    const ground=this.groundPoint(c);
    const guards=this.world.npcs.filter(n=>n.populationRole==='city_guard'&&!this.busy(n)&&this.scene.canReachPoint(n,ground))
      .sort((a,b)=>distance(a,ground)-distance(b,ground)).slice(0,2);
    if(!guards.length)return;
    const spots=this.scene.expeditions.slots(guards,ground,34);
    if(!spots)return;
    c.responders=guards.map(n=>n.id);c.state='verifying';c.changed=this.now;
    for(const guard of guards)this.mark(guard,spots[guard.id],'investigate','guard',c.id);
    this.count('dispatches');this.save();
  }
  resolve(c,team,result){
    if(finished.has(c.state))return false;
    c.state='resolved';c.result=result;c.resolvedAt=this.now;
    const victim=this.npc(c.victimId),custody=victim&&this.state.custody[victim.id];
    if(custody?.caseId===c.id){
      custody.status='recovering';custody.until=this.now+45;
      if(victim.alive){this.release(victim);victim.goalAction='rest';}
    }
    const site=this.veins.sites.get(c.siteId);
    if(site&&site.state.controller===c.actorId){
      site.state.controller=site.state.owner;
      if(site.state.dispute)site.state.dispute.resolvedAt=this.now;
    }
    for(const id of c.responders)this.release(this.npc(id));
    for(const n of team){this.reputation(n,'good',c.severity*2,'qingyun-city');this.reputation(n,'trust',2);}
    if(c.warrant?.status==='open')this.closeWarrant(c,'closed');
    this.count('resolved');
    this.event('resolved:'+c.id,'Phủ Thành Chủ đã xử lý vụ '+CRIME_NAMES[c.kind].toLocaleLowerCase('vi')+'.',team[0]?.id,c.victimId,[...team.map(n=>n.id),c.victimId,this.master?.id]);
    return true;
  }
  warrant(c){
    if(c.warrant||!this.city||!this.hall)return false;
    const suspect=this.npc(c.actorId);
    if(!suspect?.alive)return false;
    const reward=8+c.severity*6+suspect.realmIndex*5;
    if(!this.money(this.city.id,-reward))return false;
    c.warrant={id:'warrant:'+c.id,issuer:this.city.id,reward,escrow:reward,status:'open',realm:Math.max(0,suspect.realmIndex-1),
      headcount:suspect.realmIndex>=2?5:3,issued:this.now,expires:this.now+1800};
    c.state='wanted';c.changed=this.now;
    for(const id of c.responders)this.release(this.npc(id));
    // Only people already on duty and present at the announcement receive it immediately.
    const known=this.world.npcs.filter(n=>regular(n)&&distance(n,this.hall)<=130&&this.scene.monsterLine(n,this.hall)).map(n=>n.id);
    this.count('warrants');
    this.event(c.warrant.id,'Lệnh truy nã '+suspect.name+' · '+CRIME_NAMES[c.kind]+' · thưởng '+reward+' linh thạch.',
      this.master?.id,null,[...known,...c.responders,this.master?.id]);
    return true;
  }
  closeWarrant(c,status){
    const w=c.warrant;
    if(!w||!['open','assigned'].includes(w.status))return;
    if(w.escrow)this.money(w.issuer,w.escrow);
    w.escrow=0;w.status=status;
    this.save();
  }
  warrantJobs(){
    return this.cases.filter(c=>c.state==='wanted'&&c.warrant?.status==='open'&&c.warrant.expires>this.now)
      .map(c=>({kind:'warrant',caseId:c.id,key:c.warrant.id,region:'law:'+c.id,realm:c.warrant.realm,reward:c.warrant.reward,
        headcount:c.warrant.headcount,meet:this.hall,desk:this.hall,field:this.groundPoint(c),label:'Truy nã '+this.npc(c.actorId)?.name}));
  }
  knowsWarrant(n,q){
    return (distance(n,this.hall)<=110&&this.scene.monsterLine(n,this.hall))||
      (this.scene.society?.account(n).news??[]).some(news=>news.id===q.key);
  }
  assignWarrant(q){
    const c=this.state.cases[q.caseId],w=c?.warrant;
    if(w?.status!=='open'||w.escrow!==q.reward)return false;
    w.escrow=0;w.status='assigned';c.state='handling';this.save();
    return true;
  }
  returnWarrant(q,escrow){
    const c=this.state.cases[q.caseId],w=c?.warrant;
    if(!w||w.status!=='assigned')return false;
    if(escrow)this.money(w.issuer,escrow);
    w.status=escrow?'failed':'paid';
    if(escrow&&!finished.has(c.state)){c.state='unresolved';c.result='Tổ đội rút lui';}
    this.save();
    return true;
  }
  confront(c,team){
    const suspect=this.npc(c.actorId),leader=team[0];
    if(!leader?.alive||!suspect)return false;
    const below=this.caveSite(c),location=below?suspect.underground:suspect;
    if(!suspect.alive)return this.resolve(c,team,'Đối tượng đã tử vong');
    if(!location||below&&(location.siteId!==below.id||location.floor!==c.floor))return false;
    const fighter=team.find(n=>this.nearCase(n,c,location,below?2:43));
    if(!fighter)return false;
    const power=team.reduce((score,n)=>score+riskPower(n)+12,0);
    if(power>=riskPower(suspect)*1.48+12){
      const prisoner=this.state.custody[suspect.id]??={caseId:c.id};
      prisoner.status='detained';prisoner.until=this.now+180;
      this.mark(suspect,suspect,'victim','idle',c.id);
      return this.resolve(c,team,'Đã bắt giữ và bảo vệ nạn nhân');
    }
    if(this.now>=(c.nextStrike??0)){
      c.nextStrike=this.now+4;
      if(below){
        this.undergroundStrike(fighter,suspect,true);
        if(suspect.alive)this.undergroundStrike(suspect,fighter,true);
        return !suspect.alive&&this.resolve(c,team,'Đã chấm dứt giao tranh');
      }
      this.scene.reportCombat(fighter.id,suspect.id,Math.max(1,Math.round(cultivationStats(fighter).attack*.2)),
        {authorizedDuel:true,eventId:c.id+':lawful:'+this.now});
      if(suspect.alive)this.scene.reportCombat(suspect.id,fighter.id,Math.max(1,Math.round(cultivationStats(suspect).attack*.18)),
        {authorizedDuel:true,eventId:c.id+':resistance:'+this.now});
      if(!suspect.alive)return this.resolve(c,team,'Đã chấm dứt giao tranh');
    }
    return false;
  }
  tickCases(){
    for(const n of this.world.npcs)if(n.decisionSlot==='civic:report'&&finished.has(this.state.cases[n.civicCaseId]?.state))this.release(n);
    for(const n of this.world.npcs)if(n.civicEscapeUntil&&this.now>=n.civicEscapeUntil){delete n.civicEscapeUntil;if(n.decisionSlot==='civic:escape')this.release(n);}
    for(const [id,hold] of Object.entries(this.state.custody)){
      const n=this.npc(id);
      if(!n?.alive||hold.until&&hold.until<=this.now){this.release(n);delete this.state.custody[id];this.save();}
    }
    for(const c of this.cases){
      if(finished.has(c.state))continue;
      const below=this.caveSite(c);
      if(below&&c.state==='undetected'){
        const witness=c.witnesses.find(w=>w.id!==c.victimId&&['report-city','report-sect','intervene','help'].includes(w.response)&&this.npc(w.id)?.underground?.siteId===below.id);
        const n=witness&&this.npc(witness.id);
        if(n&&n.id!==this.scene.possessedNpcId&&!this.state.custody[n.id])n.underground.returning=true;
      }
      if(c.state==='undetected'||c.state==='reported'||c.state==='verifying'){
        const used=c.reports.map(r=>r.id);
        for(const w of c.witnesses){
          const n=this.npc(w.id);
          if(w.acted||!regular(n)||this.busy(n))continue;
          w.acted=true;
          const victim=this.npc(c.victimId),actor=this.npc(c.actorId);
          if(w.response==='help'&&victim?.alive&&distance(n,victim)<42&&Economy.remove(n.inventory,'healing_pill',1)){
            victim.hp=Math.min(cultivationStats(victim).hpMax,victim.hp+18);this.reputation(n,'good',2);
          }else if(w.response==='leave'&&distance(n,c.point)<106){this.mark(n,n.home??this.hall,'escape','flee');n.civicEscapeUntil=this.now+45;}
          else if(w.response==='intervene'&&actor?.alive&&distance(n,actor)<36&&this.scene.monsterLine(n,actor))
            this.scene.reportCombat(n.id,actor.id,Math.max(1,cultivationStats(n).attack*.15),{authorizedDuel:true,eventId:c.id+':defense:'+n.id});
        }
        const witness=c.witnesses.find(w=>!used.includes(w.id)&&['report-city','report-sect','intervene','help'].includes(w.response)&&
          regular(this.npc(w.id))&&(!this.busy(this.npc(w.id))||this.npc(w.id).decisionSlot==='civic:report'&&this.npc(w.id).civicCaseId===c.id));
        if(witness){
          const n=this.npc(witness.id),target=witness.response==='report-sect'?this.scene.sectCampus.site('counter')??this.hall:this.hall;
          if(!this.report(c,n,witness.response==='report-sect'?'sect':'city')&&this.scene.canReachPoint(n,target))
            this.mark(n,target,'report','travel',c.id);
        }
      }
      if(c.state==='undetected'&&this.now-c.at>1800){c.state='unresolved';c.result='Chưa nhận được báo cáo';this.save();continue;}
      if(c.state==='reported'){this.dispatch(c);if(c.state==='reported'&&this.now-c.changed>180){c.state='unresolved';c.result='Không thể điều tra hiện trường';this.save();}}
      if(c.state==='verifying'){
        const guards=c.responders.map(id=>this.npc(id)).filter(n=>n?.alive&&n.decisionSlot==='civic:investigate');
        if(below&&guards.length&&guards.every(n=>!n.underground&&distance(n,below.point)<105))
          this.scene.underground.enter(guards,below,{type:'law',caseId:c.id},105);
        if(guards.some(n=>this.nearCase(n,c,c.point,below?3:68))){
          const suspect=this.npc(c.actorId),firstHand=c.evidence.some(e=>e.kind==='witness'&&e.source!==c.victimId);
          const observed=suspect?.alive&&guards.some(n=>this.nearCase(n,c,below?suspect.underground??c.point:suspect,below?4:80));
          const physical=c.injury&&this.npc(c.victimId)?.hp<cultivationStats(this.npc(c.victimId)).hpMax||c.kind==='seizure'&&this.veins.sites.get(c.siteId)?.state.dispute?.caseId===c.id||
            c.kind==='coercion'&&this.state.custody[c.victimId]?.caseId===c.id;
          if(firstHand||observed&&physical||c.evidence.length>=2){
            c.state='confirmed';c.changed=this.now;
            this.reputation(suspect,'bad',c.severity*8);
            this.reputation(suspect,'trust',-c.severity*5,'qingyun-city');
            if(suspect)suspect.notoriety=(suspect.notoriety??0)+c.severity;
            this.count('confirmed');this.save();
          }
        }
        if(c.state==='verifying'&&(!guards.length||this.now-c.changed>(below?1100:160))){
          c.state='unresolved';c.result='Chưa đủ bằng chứng hoặc không thể tiếp cận';
          for(const id of c.responders)this.release(this.npc(id));
          this.save();
        }
      }else if(c.state==='confirmed'||c.state==='handling'&&!c.warrant){
        const suspect=this.npc(c.actorId),guards=c.responders.map(id=>this.npc(id)).filter(n=>n?.alive&&n.decisionSlot?.startsWith('civic:'));
        if(!suspect?.alive){this.resolve(c,guards,'Đối tượng đã tử vong');continue;}
        if(!guards.length||guards.reduce((s,n)=>s+riskPower(n)+12,0)<riskPower(suspect)*1.48+12||this.now-c.changed>150){
          if(!this.warrant(c)&&this.now-c.changed>180){c.state='unresolved';c.result='Không đủ lực lượng hoặc ngân khố';for(const n of guards)this.release(n);this.save();}
          continue;
        }
        c.state='handling';
        if(!this.confront(c,guards)&&!below){
          const spots=this.scene.expeditions.slots(guards,suspect,32);
          if(spots)for(const n of guards)this.mark(n,spots[n.id],'arrest','guard',c.id);
        }
      }else if(c.state==='wanted'&&c.warrant.expires<=this.now){
        this.closeWarrant(c,'expired');c.state='unresolved';c.result='Lệnh truy nã hết hạn';this.save();
      }
    }
  }
  opportunities(){
    const roster=this.world.npcs;
    for(const site of this.veins.sites.values()){
      if(!site.state.discovered||site.state.owner||site.state.controller||this.veins.guard(site))continue;
      const discoverer=roster.find(n=>!this.busy(n)&&n.realmIndex>=site.grade-1&&n.profession==='tu_si'&&
        distance(n,site.point)<=38&&(n.aiProfile?.axes?.ambition??0)>=54);
      if(discoverer)this.claim(discoverer,site);
    }
    if(this.now-(this.state.lastOffense??-1440)>=1440){
      for(const site of this.veins.sites.values()){
        if(!site.state.owner||site.state.dispute&&!site.state.dispute.resolvedAt)continue;
        const trespasser=roster.find(n=>!this.busy(n)&&n.id!==site.state.owner&&n.spiritStones<28&&
          (n.traits?.thamLam??0)>=72&&(n.traits?.hungHan??0)>=60&&distance(n,site.point)<=35);
        if(trespasser&&this.unlawfulControl(trespasser,site)){this.state.lastOffense=this.now;break;}
      }
    }
    for(const site of this.veins.sites.values()){
      const owner=this.npc(site.state.owner);
      if(!owner?.alive||owner.id===this.scene.possessedNpcId||site.state.amount<3||site.grade>2||this.activeSite(site.id)||
        this.now-(site.state.lastOffer??-2000)<480)continue;
      const c=this.offer(owner,site,{mode:owner.spiritStones>=18?'wage':'share',price:owner.spiritStones>=18?6:50,quantity:4});
      if(c)site.state.lastOffer=this.now;
    }
  }
  tick(){
    if(this.now<(this.next??0))return;
    this.next=this.now+3;
    this.tickCases();this.tickContracts();
    if(Math.floor(this.now/31)!==this.lastOpportunity){
      this.lastOpportunity=Math.floor(this.now/31);
      this.opportunities();
    }
  }
}
