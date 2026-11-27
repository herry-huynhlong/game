import { EconomySystem as Economy } from '../dao/EconomySystem.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { SocialConversations } from './SocialConversations.js';

const places={
  inn:{name:'Khách Điếm Vân Lai',activity:'sleeping',start:480,end:1440,fee:5,minutes:140,shop:'city-inn'},
  tavern:{name:'Tửu Quán Tùng Ảnh',activity:'drinking',start:660,end:1410,fee:4,minutes:55,batch:'rice_seed'},
  tea:{name:'Trà Quán Bích Trúc',activity:'socializing',start:510,end:1240,fee:2,minutes:45,batch:'spirit_herb'},
  music:{name:'Nhã Nhạc Lâu',activity:'socializing',start:870,end:1390,fee:7,minutes:65,batch:'spirit_herb'},
  clinic:{name:'Y Quán An Tâm',activity:'healing',start:460,end:1290,fee:11,minutes:55,shop:'city-apothecary'},
  'east-rest':{name:'Trại nghỉ Thanh Nguyệt',activity:'sleeping',start:390,end:1365,fee:3,minutes:55,batch:'spirit_herb'},
};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const prefix='society:';
const limit=x=>Math.max(0,Math.min(x,100));

export class WorldSociety {
  constructor(scene) {
    this.scene=scene;
    this.world=scene.populationWorld;
    this.state=this.world.society??={visits:{},venues:{},accounts:{},journal:[],sequence:0};
    this.visits=this.state.visits;
    this.counters=new Map();
    this.places=new Map();
    this.staffIds=new Set();
    this.city=this.world.factions.find(f=>f.id==='qingyun-city');
    const workers=this.world.npcs.filter(n=>n.populationRole==='tavern_staff').slice(0,2).concat(
      this.world.npcs.filter(n=>n.populationRole==='commoner'&&n.profession==='dan_thuong').slice(0,4));
    const layout=scene.map.getObjectLayer('SocietyStations')?.objects??[];
    for(const [i,[id,cfg]] of Object.entries(places).entries()){
      const slots=layout.filter(o=>scene.prop(o,'venue')===id).map(o=>({x:o.x,y:o.y,id:scene.prop(o,'id'),
        use:scene.prop(o,'use'),table:scene.prop(o,'table'),facing:scene.prop(o,'facing')??'down'}));
      const staff=workers[i];
      const staffSlot=slots.find(p=>p.use==='staff'),counter=slots.find(p=>p.use==='counter');
      if(!staff||!staffSlot||!counter)continue;
      const venue={id,cfg,staff,staffSlot,counter,seats:slots.filter(p=>p.use==='seat'),queue:slots.filter(p=>p.use==='queue'),
        landmark:(scene.map.getObjectLayer('SocietyStations')?.objects??[]).find(o=>scene.prop(o,'id')===id),
        shop:this.world.shops.find(s=>s.id===cfg.shop),ledger:this.state.venues[id]??={cash:0,stock:0,revenue:0,costs:0,served:0,produced:0}};
      venue.primary=staff;
      this.places.set(id,venue);
    }
    this.refreshStaffPools();
    for(const [id,visit] of Object.entries(this.visits))if(!scene.scheduler.byId.has(id)||!this.places.has(visit.venue))delete this.visits[id];
    for(const n of this.world.npcs)this.account(n);
    this.social=new SocialConversations(this);
  }
  refreshStaffPools(){
    this.staffIds.clear();
    for(const [id,venue] of this.places){
      const profession={tavern:'attendant',inn:'attendant',music:'musician',clinic:'physician','east-rest':'attendant'}[id];
      venue.substitutes=profession?this.world.npcs.filter(n=>n.alive&&n.vocation===profession&&
        (id==='east-rest'?n.spawnRegionId==='oasis':n.spawnRegionId!=='oasis')&&
        (id==='tavern'?n.aiProfile.seed%2===0:id==='inn'?n.aiProfile.seed%2!==0:true)):[];
      for(const member of [venue.primary,...venue.substitutes])this.staffIds.add(member.id);
    }
  }
  now(){const {day,minute}=this.world.clock;return day*1440+minute;}
  open(v){const at=this.world.clock.minute;return at>=v.cfg.start&&at<v.cfg.end;}
  available(n){
    return !this.scene.civic?.restricted(n)&&!n.decisionSlot?.startsWith('civic:')&&!this.scene.expeditions?.has(n)&&n.alive&&!n.minor&&!n.emigration&&!n.underground&&!n.ascended&&n.id!==this.scene.possessedNpcId&&!n.flight&&!n.skyStep&&!n.wallLevel&&!n.tribulation&&
      !n.marketVisit&&!n.lawResponse&&!n.manualMeditation&&!n.faunaHuntTargetId&&n.goalAction!=='fight'&&n.goalAction!=='flee';
  }
  onDuty(v){
    return this.open(v)&&this.available(v.staff)&&v.staff.decisionSlot===prefix+'staff'&&distance(v.staff,v.staffSlot)<16;
  }
  move(n,p,slot,action,text){
    const key=prefix+slot;
    if(n.decisionSlot!==key||!n.actionTarget||distance(n.actionTarget,p)>3){
      n.actionTarget={x:p.x,y:p.y};n.decisionSlot=key;n.actionProgress=0;
      this.scene.resetNpcRoute(n);
    }
    n.goalAction=action;
    n.shortGoal=text;
  }
  end(n,visit,retry=105) {
    delete this.visits[n.id];
    const account=this.account(n);
    account.retryAt=this.now()+retry;
    if(n.decisionSlot?.startsWith(prefix)){
      delete n.decisionSlot;n.goalAction='rest';n.actionTarget={...(n.home??n)};
      this.scene.resetNpcRoute(n);
    }
    if(visit?.paid)this.scene.requestBackgroundSave();
  }
  account(n){
    const account=this.state.accounts[n.id]??={income:0,spending:0,retryAt:0};
    if(!account.needs){
      const seed=n.aiProfile?.seed??11;
      account.needs={thirst:12+seed%30,leisure:20+seed%36,social:15+seed%32,at:this.now()};
    }
    return account;
  }
  refreshNeeds(n){
    const {needs}=this.account(n);
    const now=this.now(),dt=Math.min(90,Math.max(0,now-needs.at));
    const traits=n.aiProfile?.axes,social=traits?.sociability??45;
    needs.at=now;
    const using=this.visits[n.id]?.phase==='using';
    if(!using){
      needs.thirst=limit(needs.thirst+dt*.047);
      needs.leisure=limit(needs.leisure+dt*(.021+(100-n.mood)*.0004));
      needs.social=limit(needs.social+dt*(.017+social*.0006));
    }
    // Physical water is available at home. An empty purse doesn't cause
    // a paid visit to become the only way to satisfy everyday thirst.
    if(n.action==='rest'&&n.home&&distance(n,n.home)<40)needs.thirst=limit(needs.thirst-dt*.18);
    return needs;
  }
  isSeated(n) {
    const visit=this.visits[n.id];
    if(!['using','waiting-care'].includes(visit?.phase))return false;
    const v=this.places.get(visit.venue),seat=v?.seats.find(p=>p.id===visit.seat);
    return Boolean(seat&&distance(n,seat)<=12);
  }
  seatFor(n){
    const visit=this.visits[n.id],v=this.places.get(visit?.venue);
    return v?.seats.find(p=>p.id===visit.seat);
  }
  gesture(n){
    const visit=this.visits[n.id];
    if(!visit||!this.isSeated(n))return undefined;
    const c=this.social.state.active[visit.venue+':'+visit.table];
    const line=c?.lines.at(-1),age=line?this.now()-line.at:Infinity;
    if(age<4&&line.speaker===n.id)return 'talk';
    if(age===3&&c.people.includes(n.id))return this.account(n).needs.leisure>64?'smile':'nod';
    if(visit.phase==='waiting-care')return 'wait';
    const phase=(this.now()+(n.aiProfile?.seed??0))%13;
    if(['tea','tavern'].includes(visit.venue)&&phase<6)
      return phase<3?'lift':visit.venue==='tavern'&&phase===5?'eat':'sip';
    return 'sit';
  }
  record(kind,n,v,fee=0){
    const state=this.state,{day,minute}=this.world.clock;
    const event={id:'society-'+(++state.sequence),day,minute,type:'society-'+kind,
      actorId:n?.id,targetId:v.staff.id,status:'completed',data:{place:v.id,fee},
      description:kind==='paid'?n.name+' trả '+fee+' linh thạch tại '+v.cfg.name:
        kind==='wage'?n.name+' nhận '+fee+' linh thạch tiền công tại '+v.cfg.name:
        kind==='rested'?n.name+' trả phòng sau khi nghỉ tại '+v.cfg.name:
        kind==='shared'?n.name+' trò chuyện cùng khách tại '+v.cfg.name:
        (n?.name??'Nhân viên')+' · '+v.cfg.name};
    state.journal.push(event);
    if(state.journal.length>160)state.journal.shift();
    this.world.events.push(event);
    if(this.world.events.length>400)this.world.events.shift();
    this.scene.requestBackgroundSave();
  }
  supplies(v){
    if(v.cfg.batch){
      const at=this.now(),business=v.ledger;
      if(business.finishAt&&business.finishAt<=at){
        business.stock+=v.id==='tavern'?5:4;
        business.produced+=v.id==='tavern'?5:4;
        delete business.finishAt;
        this.record('batch',undefined,v);
      }
      if(business.finishAt||business.stock>=4||!this.onDuty(v))return;
      const input=v.cfg.batch;
      const apothecary=input==='spirit_herb'&&this.world.shops.find(shop=>shop.id==='city-apothecary');
      const stores=apothecary?.stock??this.world.settlement.materials;
      // Limited opening stock is transferred once. Later batches must pay the supplier.
      const cost=business.produced===0?0:2;
      if(business.cash<cost||apothecary&&Economy.count(stores,input)<3||!Economy.remove(stores,input,1))return;
      business.cash-=cost;business.costs+=cost;
      if(apothecary)apothecary.cash+=cost;else this.city.wealth+=cost;
      business.finishAt=at+(v.id==='tavern'?90:35);
      this.scene.requestBackgroundSave();
    }
  }
  stock(v){
    if(v.id==='clinic'){
      const stock=v.shop?.stock??[];
      return Economy.count(stock,'healing_pill')+Math.max(0,Economy.count(stock,'spirit_herb')-3);
    }
    return v.cfg.batch?v.ledger.stock:Infinity;
  }
  duty(v) {
    const day=this.world.clock.day;
    const staff=[v.primary,...v.substitutes];
    const scheduled=staff[(day-1+Number(staff.length>1))%staff.length];
    const ready=n=>this.available(n)&&n.hunger<=75&&n.fatigue<=80&&this.scene.canReachPoint(n,v.staffSlot);
    const next=this.open(v)&&(ready(scheduled)?scheduled:staff.find(ready));
    if(next&&next!==v.staff){
      if(v.staff.decisionSlot===prefix+'staff')this.end(v.staff);
      v.staff=next;
    }
    const npc=v.staff;
    if(!this.open(v)||!this.available(npc)||npc.hunger>82||npc.fatigue>86){
      if(npc.decisionSlot===prefix+'staff')this.end(npc);
      return;
    }
    if(this.visits[npc.id])return;
    this.move(npc,v.staffSlot,'staff','work','Trực quầy · '+v.cfg.name);
    const ledger=v.ledger;
    if(this.onDuty(v)&&ledger.revenue>0&&ledger.cash>=3&&ledger.wageDay!==day&&
       this.world.clock.minute>=v.cfg.start+120){
      ledger.cash-=3;ledger.costs+=3;ledger.wageDay=day;
      npc.spiritStones+=3;this.account(npc).income+=3;this.record('wage',npc,v,3);
    }
  }
  lookupSlot(v,id){return [...v.seats,...v.queue,v.counter].find(p=>p.id===id);}
  paid(n,v,visit){
    if(visit.paid||n.spiritStones<v.cfg.fee||this.stock(v)<=0)return false;
    if(v.id==='clinic'){
      let cost;
      if(Economy.remove(v.shop.stock,'healing_pill',1)){visit.remedy='pill';cost=5;}
      else if(Economy.count(v.shop.stock,'spirit_herb')>3&&Economy.remove(v.shop.stock,'spirit_herb',1)){visit.remedy='herb';cost=3;}
      else return false;
      v.shop.cash+=cost;v.ledger.cash-=cost;v.ledger.costs+=cost;
    }else if(v.cfg.batch)v.ledger.stock--;
    n.spiritStones-=v.cfg.fee;v.ledger.cash+=v.cfg.fee;v.ledger.revenue+=v.cfg.fee;v.ledger.served++;
    this.account(n).spending+=v.cfg.fee;
    const visits=this.account(n).places??={};
    visits[v.id]=(visits[v.id]??0)+1;
    this.social.diary(n,{kind:'service',venue:v.id,topic:v.cfg.name,fee:v.cfg.fee});
    visit.paid=true;
    this.record('paid',n,v,v.cfg.fee);
    return true;
  }
  benefit(n,v) {
    const needs=this.account(n).needs;
    if(v.id==='east-rest'){
      n.fatigue=limit(n.fatigue-45);
      needs.thirst=limit(needs.thirst-52);
      n.hp=Math.min(cultivationStats(n).hpMax,n.hp+10);
    }else if(v.id==='inn'){
      n.fatigue=limit(n.fatigue-66);
      n.hp=Math.min(cultivationStats(n).hpMax,n.hp+8);
    }else if(v.id==='clinic'){
      const {hpMax}=cultivationStats(n),herbs=this.visits[n.id]?.remedy==='herb';
      n.hp=Math.min(hpMax,n.hp+Math.min(herbs?75:160,hpMax*(herbs?.22:.38)));
      if(n.westPoison)n.westPoison=Math.max(0,n.westPoison-60);
    }else{
      if(v.id==='tavern')n.hunger=limit(n.hunger-28);
      needs.thirst=limit(needs.thirst-(v.id==='tea'?55:29));
      needs.leisure=limit(needs.leisure-(v.id==='music'?59:43));
      needs.social=limit(needs.social-28);
      n.mood=limit(n.mood+(v.id==='music'?20:13));
      n.fatigue=limit(n.fatigue-12);
    }
  }
  restExpedition(team){
    const camp=this.places.get('east-rest');
    if(!camp||!this.onDuty(camp))return 0;
    let rested=0;
    for(const n of team){
      if(distance(n,camp.counter)>92||n.spiritStones<camp.cfg.fee||n.fatigue<15&&n.hp>=cultivationStats(n).hpMax)continue;
      if(this.paid(n,camp,{})){this.benefit(n,camp);rested++;}
    }
    if(rested)this.scene.requestBackgroundSave();
    return rested;
  }
  pursue(n,visit) {
    const v=this.places.get(visit.venue),at=this.now();
    if(!v||!this.available(n)||this.scene.ramparts.wantsDuty(n)>=0||at>=visit.expires||(!visit.paid&&!this.open(v))){
      this.end(n,visit);return;
    }
    const seat=v.seats.find(p=>p.id===visit.seat);
    const hold=visit.phase==='queued'||visit.phase==='counter';
    if(hold){
      if(visit.phase==='queued'&&this.onDuty(v)&&!this.counters.has(v.id)&&distance(n,this.lookupSlot(v,visit.queue)??v.counter)<18){
        visit.phase='counter';
      }
      if(visit.phase==='counter'){
        if(this.counters.has(v.id)&&this.counters.get(v.id)!==n.id){visit.phase='queued';return;}
        this.counters.set(v.id,n.id);
        this.move(n,v.counter,'counter','travel','Đến quầy · '+v.cfg.name);
        if(distance(n,v.counter)<14&&this.onDuty(v)&&this.scene.merchants.line(n,v.staff)){
          if(this.paid(n,v,visit))visit.phase='seat';
          else this.end(n,visit);
        }
      }else{
        const queue=this.lookupSlot(v,visit.queue);
        if(queue)this.move(n,queue,'queue','travel','Xếp hàng · '+v.cfg.name);
        else this.end(n,visit);
      }
      return;
    }
    if(!seat){this.end(n,visit);return;}
    const reason=v.id==='inn'?'Nghỉ ở phòng đã thuê':v.id==='clinic'?(visit.paid?'Nghỉ dưỡng tại Y Quán':'Ngồi chờ y sư khám'):
      v.id==='tavern'?'Uống rượu và trò chuyện':v.id==='tea'?'Thưởng trà':'Nghe đàn tại Nhã Nhạc Lâu';
    this.move(n,seat,v.cfg.activity,'work',reason);
    if(distance(n,seat)>8)return;
    if(v.id==='clinic'&&!visit.paid){
      if(visit.phase!=='waiting-care'){visit.phase='waiting-care';visit.careAt=at+13;this.record('waiting-care',n,v);}
      if(at<visit.careAt||!this.onDuty(v)||at<(v.ledger.nextCareAt??0))return;
      if(!this.paid(n,v,visit)){this.end(n,visit,85);return;}
      v.ledger.nextCareAt=at+18;visit.phase='seat';
    }
    if(visit.phase==='seat'){
      if(!visit.paid&&(!this.onDuty(v)||!this.paid(n,v,visit))){this.end(n,visit,120);return;}
      visit.phase='using';visit.until=at+v.cfg.minutes;visit.expires=visit.until+60;
    }
    if(at>=visit.until){
      this.benefit(n,v);
      this.record(v.id==='inn'?'rested':'finished',n,v);
      this.end(n,visit,330+(n.aiProfile?.seed??0)%150);
    }
  }
  start(n,v){
    if(this.visits[n.id]||!this.onDuty(v)||this.stock(v)<=0||n.spiritStones<v.cfg.fee+7)return false;
    const live=Object.values(this.visits).filter(p=>p.venue===v.id);
    const crowd=v.seats.map(p=>({p,neighbors:live.filter(q=>q.table===p.table).length}));
    const preferCompany=(n.aiProfile?.axes?.sociability??45)>=36;
    crowd.sort((a,b)=>preferCompany?b.neighbors-a.neighbors:a.neighbors-b.neighbors);
    const seat=crowd.map(x=>x.p).find(p=>!live.some(q=>q.seat===p.id)&&this.scene.groundPositionOpen(n,p.x,p.y)&&this.scene.canReachPoint(n,p));
    if(!seat)return false;
    this.visits[n.id]={venue:v.id,seat:seat.id,table:seat.table,phase:'seat',
      expires:this.now()+Math.max(100,Math.ceil(distance(n,seat)/15)+60)};
    this.move(n,seat,'seat','travel','Đến '+v.cfg.name);
    return true;
  }
  choose(n,i) {
    const h=n.hp/cultivationStats(n).hpMax;
    const clinic=this.places.get('clinic');
    const camp=this.places.get('east-rest');
    const nearCamp=camp&&distance(n,camp.counter)<1000;
    const needsCare=h<.88||(n.westPoison??0)>25;
    const nearClinic=needsCare&&clinic&&distance(n,clinic.counter)<1600&&this.scene.monsterSafe(n);
    if(!this.available(n)||this.staffIds.has(n.id)||this.scene.westWilds?.directs(n)||this.scene.sectCampus.orderFor(n)||n.assignedCommissionId||
      n.decisionSlot?.startsWith('sect-campus:')||this.scene.ramparts.wantsDuty(n)>=0||!nearClinic&&!nearCamp&&(n.x<2030||n.x>4900||n.y>3270)||
      this.now()<(this.state.accounts[n.id]?.retryAt??0))return;
    const need=this.refreshNeeds(n);
    const traits=n.aiProfile?.axes;
    const sociability=traits?.sociability??45,spending=traits?.generosity??45,caution=traits?.caution??45;
    const travelHome=n.home?distance(n,n.home):600,dusk=this.world.clock.minute>=900;
    const taste=(n.aiProfile?.seed??i)%31;
    const looksForCompany=['hunter','independent_cultivator','herb_gatherer'].includes(n.populationRole)&&
      n.spiritStones>=7&&n.spiritStones<75;
    const adventurers=looksForCompany&&Object.entries(this.visits).some(([id,p])=>p.venue==='tea'&&
      ['hunter','independent_cultivator','herb_gatherer'].includes(this.scene.scheduler.byId.get(id)?.npc.populationRole));
    const ranks={
      'east-rest':nearCamp?45+n.fatigue*.6+need.thirst*.45+(1-h)*35:-1,
      clinic:needsCare?125+(1-h)*35:-1,
      inn:(travelHome>430&&dusk&&n.fatigue>=19||n.fatigue>=44)?80+n.fatigue*.5:-1,
      tea:need.thirst*.62+need.social*.32+caution*.17+(this.world.clock.minute<800?15:4)+(adventurers?18:looksForCompany?6:0),
      tavern:need.leisure*.44+need.social*.24+sociability*.20+taste*.46+n.hunger*.24,
      music:need.leisure*.52+need.social*.35+sociability*.18+spending*.18+(30-taste)*.53+(dusk?10:0),
    };
    if(!nearClinic&&(n.hunger>81&&h>=.68||n.fatigue>84&&travelHome<350))return;
    const reserve=5+Math.floor((100-spending)/18);
    const adult=!Number.isFinite(n.age)||n.age>=18;
    const choices=[...this.places.values()].filter(v=>this.open(v)&&n.spiritStones>=reserve+v.cfg.fee&&
      (n.hunger<=64||v.id==='tavern'||v.id==='clinic')&&
      (adult||!['tavern','music'].includes(v.id))).map(v=>{
      const acquaintance=Object.keys(this.visits).some(id=>this.visits[id].venue===v.id&&(n.relationships[id]??0)>12);
      return {v,score:ranks[v.id]+(acquaintance?9:0)-distance(n,v.counter)/165};
    }).filter(o=>o.score>=36).sort((a,b)=>b.score-a.score);
    for(const {v} of choices)if(this.start(n,v))break;
  }
  seekClinic(n){
    const v=this.places.get('clinic');
    return Boolean(v&&this.available(n)&&!this.staffIds.has(n.id)&&
      this.now()>=this.account(n).retryAt&&distance(n,v.counter)<1600&&this.start(n,v));
  }
  tick(){
    if(!this.places.size)return;
    this.counters.clear();
    for(const [id,visit] of Object.entries(this.visits))if(visit.phase==='counter'&&!this.counters.has(visit.venue)){
      this.counters.set(visit.venue,id);
    }
    for(const v of this.places.values()){this.duty(v);this.supplies(v);}
    for(const [id,visit] of Object.entries(this.visits)){
      const npc=this.scene.scheduler.byId.get(id)?.npc;
      if(npc)this.pursue(npc,visit);else delete this.visits[id];
    }
    const now=this.now();
    for(const [i,n] of this.world.npcs.entries())if((now+i*11)%41===0&&n.alive){
      this.refreshNeeds(n);
      if(!this.visits[n.id])this.choose(n,i);
    }
    this.social.tick();
  }
  workplace(n){return [...this.places.values()].find(v=>v.staff===n)?.cfg.name;}
  report(){
    return [...this.places.values()].map(v=>{
      const guests=Object.entries(this.visits).filter(([,p])=>p.venue===v.id);
      const queued=guests.filter(([id,p])=>p.phase==='waiting-care'||p.phase==='queued'&&this.arrivedToQueue(id,p));
      return {id:v.id,name:v.cfg.name,onDuty:this.onDuty(v),staff:v.staff.id,
        using:guests.filter(([,p])=>p.phase==='using').length,waiting:queued.length,
        approaching:guests.filter(([id,p])=>p.phase==='seat'||p.phase==='queued'&&!this.arrivedToQueue(id,p)).length,
        free:Math.max(0,v.seats.length-guests.length),capacity:v.seats.length,
        ...v.ledger,stock:Number.isFinite(this.stock(v))?this.stock(v):null};
    });
  }
  arrivedToQueue(id,visit){
    const n=this.scene.scheduler.byId.get(id)?.npc;
    const p=this.places.get(visit.venue)?.queue.find(p=>p.id===visit.queue);
    return Boolean(n&&p&&distance(n,p)<18);
  }
  secondary(n){
    const work=this.scene.sectCampus.orderFor(n);
    if(work?.mining)return 'Thợ mỏ theo ủy thác';
    if(work?.type.startsWith('farm'))return 'Canh tác Linh Điền';
    if(work?.type==='city-courier')return 'Vận chuyển hàng';
    if(n.timberSourceId)return 'Tiều phu';
    return [...this.places.values()].find(v=>v.staff.id===n.id)?.cfg.name??'';
  }
  primary(n){
    if(!n.alive||n.ascended)return 'Vắng mặt';
    if(n.id===this.scene.possessedNpcId)return 'Nhập thân';
    const e=this.scene.scheduler.byId.get(n.id),visit=this.visits[n.id],slot=n.decisionSlot;
    if(n.flight||n.skyStep)return 'Di chuyển';
    if(n.goalAction==='fight'||n.faunaHuntTargetId)return 'Săn hoặc chiến đấu';
    if(visit?.phase==='using'){
      return {inn:'Ngủ nghỉ',clinic:'Điều trị','east-rest':'Hồi sức',tavern:'Uống rượu',tea:'Giao lưu',music:'Thưởng nhạc'}[visit.venue];
    }
    if(visit?.phase==='waiting-care')return 'Chờ y sư';
    if(visit?.phase==='queued'&&this.arrivedToQueue(n.id,visit)||e?.waitingForSlot||
      slot==='sect-campus:queue'&&n.actionTarget&&distance(n,n.actionTarget)<18)return 'Chờ đến lượt';
    if(n.action==='travel'||n.goalAction==='flee')return n.actionTarget?'Di chuyển':'Thiếu mục tiêu';
    if(slot==='sect-campus:mine')return 'Khai khoáng';
    if(slot==='sect-campus:farm'||n.action==='farm')return 'Canh tác';
    if(slot==='sect-campus:training')return 'Luyện võ';
    if(n.marketVisit||['trade','shop'].includes(n.action))return 'Giao thương';
    if(['patrol','guard'].includes(n.action))return 'Tuần tra và gác';
    if(['mission','commission'].includes(n.action))return 'Nhiệm vụ';
    if(n.action==='cultivate')return 'Tu luyện';
    if(n.action==='gather')return 'Thu thập';
    if(n.action==='work')return 'Lao động';
    if(n.action==='eat')return 'Ăn uống';
    if(n.action==='socialize')return 'Giao lưu';
    if(n.action==='rest')return 'Nghỉ ngơi';
    return 'Đứng yên';
  }
}
