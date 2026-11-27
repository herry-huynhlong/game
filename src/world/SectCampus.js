import { EconomySystem as Economy } from '../dao/EconomySystem.ts';
import { ITEM_CATALOG as ITEMS } from '../dao/ItemCatalog.ts';
import { harvestHerbNode, releaseHerbNode } from '../dao/EnvironmentalSystem.ts';
import { livelihoodNeed } from '../dao/AutonomousNPCSystem.ts';
import { TECHNIQUES, addTechniquePractice } from '../systems/TechniqueSystem.ts';
import { addCultivationXp, cultivationStats } from '../systems/CultivationSystem.ts';
import { SectProduction } from './SectProduction.js';
import { SpiritVeins } from './SpiritVeins.js';
import { GRADES, MARTIAL_TECHNIQUES } from '../dao/MartialRegistry.ts';
import { martialMastery } from '../dao/MartialProgress.ts';

export const SECT_SHOP='sect-treasure-pavilion';
export const SECT_FOOD='sect-dining-hall';
const FACTION='qingyun-sect';
const PREFIX='sect-campus:';
const OUTER='old-road-';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const count=(items,key)=>Economy.count(items,key);
const openHours=minute=>minute>=420&&minute<1170;
const member=n=>['low_disciple','elder','sect_leader'].includes(n.populationRole);
const rankSeat=n=>n.sectRank==='chân_truyền'?'true-seat-':n.sectRank==='nội_môn'?'inner-seat-':'seat-';
const catalog=[
  {type:'herbs',name:'Linh thảo cho Đan Dược Đường',item:'spirit_herb',quantity:2,demand:9,reward:12,merit:3,realm:0,difficulty:'Thấp',zone:'Linh Dược Viên và ngoại thành'},
  {type:'hunt',name:'Săn Thanh Lang, nộp chiến lợi phẩm',item:'wolf_pelt',species:'wolf',alternates:['wolf_fang'],quantity:1,demand:4,reward:22,merit:5,realm:0,difficulty:'Vừa',zone:'Rừng yêu thú'},
  {type:'supply',name:'Gỗ tu sửa sân viện',item:'wood',quantity:2,demand:6,reward:15,merit:3,realm:0,difficulty:'Thấp',zone:'Bãi gỗ / chợ'},
  {type:'ore',name:'Quặng cho Luyện Khí Đường',item:'iron_ore',quantity:2,demand:4,reward:18,merit:4,realm:0,difficulty:'Vừa',zone:'Khu tài nguyên / chợ'},
  {type:'delivery',name:'Chuyển đan dược về bảo khố',item:'qi_pill',quantity:1,demand:2,reward:13,merit:3,realm:0,difficulty:'Thấp',zone:'Đan Dược Đường / chợ'},
];

export class SectCampus {
  constructor(scene){
    this.scene=scene;this.world=scene.populationWorld;
    this.points=new Map((scene.map.getObjectLayer('SectCampusStations')?.objects??[]).map(o=>[scene.prop(o,'station'),o]));
    for(const o of scene.map.getObjectLayer('SocietyStations')?.objects??[]){
      if(['farm','mine','landmark'].includes(scene.prop(o,'site')))this.points.set(scene.prop(o,'id'),o);
    }
    this.staff=new Map();this.reservations=new Map();this.intents=new Map();this.queue=new Map();
    this.activityClaims=new Map();
    this.queuePlaces=[...this.points.keys()].filter(id=>/^queue-\d+$/.test(id)).length;
    this.activities=Object.fromEntries(['lesson','reading','training'].map(kind=>[
      kind,[...this.points].filter(([id])=>id.startsWith(kind+'-')&&/\d$/.test(id)).map(([,p])=>p),
    ]));
    this.routeBackoff=new Map();
    this.gateDuty=new Map();
    this.vault=this.world.factions.find(f=>f.id===FACTION);
    if(!this.vault||!this.points.size)return;
    this.state=this.world.sectCampus??={version:1,serial:0,orders:[],logs:[],credits:{},nextOffer:{},inbound:{},outbound:{}};
    const residents=role=>this.world.npcs.filter(n=>n.populationRole===role);
    this.disciples=residents('low_disciple');this.hunters=residents('hunter');
    this.couriers=residents('commoner').filter(n=>n.profession==='dan_thuong');
    this.traders=residents('merchant').slice(0,2);
    this.participants=[...this.disciples,...residents('independent_cultivator').slice(0,8),...this.hunters,...this.couriers,...this.traders];
    this.outerForest=Boolean(scene.oldRoadLayer);
    this.cityVault=this.world.factions.find(f=>f.id==='qingyun-city');
    this.clerk=residents('quest_clerk')[0];
    this.state.ore??=Array.from({length:3},(_,i)=>({id:'ore-'+i,amount:5,renewAt:0}));
    this.production=new SectProduction(this);
    this.spiritVeins=new SpiritVeins(this);
    const elders=residents('elder');
    this.staff.set(this.clerk.id,'quests');
    for(const [i,role] of ['elders','alchemy','market','library','forge'].entries())if(elders[i])this.staff.set(elders[i].id,role);
    const cook=residents('tavern_staff')[2];
    if(cook)this.staff.set(cook.id,'food');
    const leader=residents('sect_leader')[0];
    if(leader)this.staff.set(leader.id,'leader');
    this.leader=leader;
    this.titles=new Map(elders.map((n,i)=>[n.id,['Trưởng lão truyền công','Trưởng lão đan dược',
      'Trưởng lão quản lý tài nguyên','Trưởng lão chấp sự','Trưởng lão luyện khí'][i]]));
    const marketOwner=elders[2];
    if(marketOwner&&!this.world.shops.some(s=>s.id===SECT_SHOP)){
      const items=Object.values(ITEMS).filter(i=>i.value>0&&i.kind!=='special');
      const cash=Math.min(60,this.vault.wealth);
      this.vault.wealth-=cash;
      this.world.shops.push({id:SECT_SHOP,name:'Vạn Bảo Các',ownerId:marketOwner.id,areaId:'sect-market',
        openHour:7,closeHour:19,cash,stock:[],buyPrices:Object.fromEntries(items.map(i=>[i.id,Math.max(1,Math.floor(i.value*.72))])),
        sellPrices:Object.fromEntries(items.map(i=>[i.id,Math.ceil(i.value*1.15)]))});
    }
    if(cook&&!this.world.shops.some(s=>s.id===SECT_FOOD)){
      const cash=Math.min(15,this.vault.wealth);this.vault.wealth-=cash;
      this.world.shops.push({id:SECT_FOOD,name:'Linh Thực Đường',ownerId:cook.id,areaId:'sect-food',
        openHour:6,closeHour:20,cash,stock:[],buyPrices:{ration:3},sellPrices:{ration:5}});
    }
    for(let i=0;i<6;i++){
      const id='sect-plot-'+i,p=this.points.get('plot-'+i);
      if(p&&!this.world.environment.resourceNodes.some(n=>n.id===id))this.world.environment.resourceNodes.push({
        id,kind:'herb',itemId:'spirit_herb',x:p.x,y:p.y,amount:4,maxAmount:4,danger:0,
      });
    }
    this.disciples.forEach((n,i)=>{
      const prefix=rankSeat(n);
      const home=this.site((prefix==='true-seat-'?'true-home-':prefix==='inner-seat-'?'inner-home-':'home-')+i)??this.site('home-'+i);
      if(home&&scene.footprintTerrainOpen(home.x,home.y,9,5)){
        n.home={x:home.x,y:home.y};
        n.homeId??='sect-home-'+n.id;
      }
    });
  }

  now(){return this.world.clock.day*1440+this.world.clock.minute;}
  site(key){return this.points.get(key);}
  orderFor(n){return this.state?.orders.find(q=>q.assignee===n.id&&q.status==='active');}
  civilian(n){return n?.alive&&!n.underground&&!n.ascended&&!n.wallLevel&&!n.flight&&!n.skyStep&&!n.tribulation;}
  availableClerk(){
    const clerk=this.clerk,desk=this.site('counter');
    return this.civilian(clerk)&&clerk.id!==this.scene.possessedNpcId&&openHours(this.world.clock.minute)&&
      !livelihoodNeed(clerk,this.world)&&clerk.decisionSlot===PREFIX+'quests'&&distance(clerk,desk)<=15;
  }
  canMeet(n){
    return this.civilian(n)&&this.availableClerk()&&n!==this.clerk&&distance(n,this.clerk)<56&&
      this.scene.merchants.line(n,this.clerk);
  }
  suitable(n,q){
    if(q.veinId)return this.civilian(n)&&this.spiritVeins.authorized(n,this.spiritVeins.sites.get(q.veinId));
    return this.civilian(n)&&n.realmIndex>=q.realm&&
      (member(n)||['independent_cultivator','hunter','herb_gatherer','repair_worker'].includes(n.populationRole)||
        ((['city-courier','ore'].includes(q.type)||q.type.startsWith('farm'))&&n.populationRole==='commoner'||
        q.type==='city-courier'&&n.populationRole==='merchant'))&&
      (q.type!=='hunt'||n.realmIndex>=1||n.populationRole==='hunter');
  }
  offers(n){return this.state.orders.filter(q=>q.status==='open'&&q.expires>this.now()&&this.suitable(n,q));}
  reviewBudget(){
    const n=this.leader,{day}=this.world.clock;
    if(!n?.alive||n.decisionSlot!==PREFIX+'leader'||this.state.budget?.day===day||distance(n,this.site('leader'))>=18)return;
    const treasury=this.vault.treasury;
    const supply=[['spirit_herb',12],['iron_ore',5],['ration',8]].map(([item,min])=>({item,need:min-count(treasury,item)}))
      .sort((a,b)=>b.need-a.need)[0];
    this.state.budget={day,priority:supply.item,reserve:Math.min(14,Math.floor(this.vault.wealth*.15))};
    this.note('budget',n,null,n.name+' duyệt kho · ưu tiên '+ITEMS[supply.item].name+
      ', dự phòng '+this.state.budget.reserve+' linh thạch.');
    this.scene.requestBackgroundSave();
  }
  demand(){
    const at=this.now(),orders=this.state.orders;
    let reserved=orders.filter(q=>q.status==='open'||q.status==='active'&&!q.escrow).reduce((a,q)=>a+q.reward,0);
    const rules=this.outerForest?[
      ...catalog.map(rule=>['herbs','supply','hunt'].includes(rule.type)?
        {...rule,outside:true,zone:'Thanh Vân Ngoại Lâm'}:rule),
      {type:'city-courier',name:'Hộ tống quặng từ Thanh Vân Thành',item:'iron_ore',quantity:1,demand:5,
        reward:19,merit:3,realm:0,difficulty:'Thấp',zone:'Thanh Vân Thành → Thanh Vân Cổ Đạo → Thanh Vân Tông'},
    ]:[...catalog];
    if(this.production.points.length){
      rules.push({type:'farm',name:'Canh tác linh thảo',item:'spirit_herb',quantity:3,demand:16,
        reward:17,merit:4,realm:0,difficulty:'Thấp',zone:'Linh Điền'});
      rules.push({type:'farm-food',name:'Canh tác lương thực',item:'ration',quantity:4,demand:6,
        reward:11,merit:3,realm:0,difficulty:'Thấp',zone:'Linh Điền'});
    }
    rules.unshift(...this.spiritVeins.rules(),...(this.scene.westWilds?.missionRules()??[]));
    const budget=this.state.budget;
    if(budget)rules.sort((a,b)=>Number(b.item===budget.priority)-Number(a.item===budget.priority));
    for(const rule of rules){
      if(count(this.vault.treasury,rule.item)>=rule.demand||reserved+rule.reward>this.vault.wealth-(budget?.reserve??0)||
        rule.type==='city-courier'&&(!this.cityVault||count(this.cityVault.treasury,rule.item)<rule.quantity)||
        (this.state.nextOffer[rule.type]??0)>at||orders.some(q=>(q.type===rule.type||q.westRegion&&rule.westRegion)&&(q.status==='open'||q.status==='active')))continue;
      const mining=rule.type==='ore'&&Object.keys(this.production.state.veins).length>0;
      orders.push({...rule,...(mining?{name:'Khai thác tại Mỏ Quặng Sắt',zone:'Mỏ Quặng Sắt',mining:true}:{}),
        id:'tv-sect-'+(++this.state.serial),issuer:FACTION,description:'Nộp '+[rule.item,...(rule.alternates??[])].map(id=>ITEMS[id].name).join(' hoặc ')+' ×'+rule.quantity+' về bảo khố.',
        capacity:1,status:'open',created:at,expires:at+(rule.outside||rule.type==='city-courier'||rule.type.startsWith('farm')?3600:1920),assignee:null,progress:0});
      this.state.nextOffer[rule.type]=at+210;reserved+=rule.reward;
    }
    if(orders.length>90)this.state.orders=orders.filter(q=>q.status==='active'||q.status==='open').concat(orders.filter(q=>q.status!=='active'&&q.status!=='open').slice(-65));
  }
  note(type,n,q,description){
    const log={at:this.now(),type,npcId:n?.id??null,orderId:q?.id??null,description};
    this.state.logs.push(log);
    if(this.state.logs.length>75)this.state.logs.shift();
    if(q&&n){
      this.world.events.push({id:'sect-event:'+q.id+':'+type,day:this.world.clock.day,minute:this.world.clock.minute,
        type:'sect-campus-'+type,actorId:n.id,targetId:this.clerk.id,status:'completed',description});
      if(this.world.events.length>400)this.world.events.shift();
      this.bubble={text:description,x:this.clerk.x,y:this.clerk.y-54,until:this.scene.time.now+4500};
    }
  }
  transfer(flow,item,quantity){this.state[flow][item]=(this.state[flow][item]??0)+quantity;}
  retire(n){
    if(n?.assignedResourceNodeId){releaseHerbNode(this.world,n.assignedResourceNodeId,n.id);delete n.assignedResourceNodeId;}
    if(n?.decisionSlot===PREFIX+'timber')delete n.timberSourceId;
    if(n?.decisionSlot===PREFIX+'hunt'||n?.decisionSlot===PREFIX+'loot')delete n.faunaHuntTargetId;
    if(n?.decisionSlot?.startsWith(PREFIX)){npcReset(n);this.scene.resetNpcRoute(n);}
    if(n){this.intents.delete(n.id);this.queue.delete(n.id);this.releaseActivity(n);}
  }
  deferStation(n){
    if(!n.decisionSlot?.startsWith(PREFIX))return false;
    this.retire(n);
    this.routeBackoff.set(n.id,this.now()+16+(n.aiProfile?.seed??0)%13);
    n.goalAction='rest';n.actionTarget={...(n.home??{x:n.x,y:n.y})};
    n.shortGoal='Đường tới trạm bị cản · nghỉ rồi quay lại';
    return true;
  }
  accept(n,id){
    const q=this.state.orders.find(row=>row.id===id);
    if(!this.canMeet(n)||this.orderFor(n)||!q||!this.offers(n).includes(q)||this.vault.wealth<q.reward)return false;
    this.vault.wealth-=q.reward;q.escrow=q.reward;
    q.assignee=n.id;q.status='active';q.accepted=this.now();q.phase='field';
    q.startCount=count(n.inventory,q.item);
    q.startCounts=Object.fromEntries([q.item,...(q.alternates??[])].map(id=>[id,count(n.inventory,id)]));
    this.queue.delete(n.id);
    this.note('accepted',n,q,n.name+' nhận ủy thác: '+q.name+'.');
    this.scene.requestBackgroundSave();
    return true;
  }
  progress(n,q){
    if(q.type==='hunt'){
      return Math.min(q.quantity,Math.max(0,...[q.item,...(q.alternates??[])].map(id=>
        Economy.sellable(this.world,n,id)-(q.startCounts?.[id]??(id===q.item?q.startCount??0:0)))));
    }
    const items=Economy.sellable(this.world,n,q.item);
    if(q.type==='city-courier')return q.dispatched?Math.min(q.quantity,Math.max(0,items-q.dispatchBaseline)):0;
    return Math.min(q.quantity,q.veinId||q.type==='herbs'||q.mining||q.type.startsWith('farm')||q.outside&&q.type==='supply'?Math.min(items,q.collected??0):items);
  }
  deliver(n,id){
    const q=this.orderFor(n);
    if(!q||q.id!==id||!this.canMeet(n)||this.progress(n,q)<q.quantity||(!q.escrow&&this.vault.wealth<q.reward))return false;
    const item=q.type==='hunt'?[q.item,...(q.alternates??[])].find(id=>
      Economy.sellable(this.world,n,id)-(q.startCounts?.[id]??(id===q.item?q.startCount??0:0))>=q.quantity):q.item;
    if(!item||!Economy.depositFaction(this.world,n,FACTION,item,q.quantity))return false;
    if(q.veinId)this.spiritVeins.settle(q);
    q.turnedIn=item;
    if(q.escrow){n.spiritStones+=q.escrow;q.escrow=0;}
    else Economy.payWage(this.world,n,FACTION,q.reward);
    this.state.credits[n.id]=(this.state.credits[n.id]??0)+q.merit;
    this.transfer('inbound',item,q.quantity);this.transfer('outbound','spiritStones',q.reward);
    q.status='completed';q.finished=this.now();q.progress=q.quantity;q.phase='settled';
    n.sectMerit=(n.sectMerit??0)+q.merit;
    this.note('completed',n,q,n.name+' nộp '+ITEMS[item].name+' ×'+q.quantity+', nhận '+q.reward+' linh thạch.');
    this.scene.martialEconomy?.missionReward(n,q);
    this.retire(n);this.scene.requestBackgroundSave();
    return true;
  }
  cancel(n,id){
    const q=this.orderFor(n);
    if(!q||q.id!==id||!this.canMeet(n))return false;
    this.refund(q);q.status='cancelled';q.finished=this.now();this.note('cancelled',n,q,n.name+' trả ủy thác '+q.name+'.');
    this.retire(n);this.scene.requestBackgroundSave();return true;
  }
  refund(q){
    this.vault.wealth+=q.escrow??0;q.escrow=0;
    if(q.type!=='city-courier'||!q.dispatched)return;
    const n=this.scene.scheduler.byId.get(q.assignee)?.npc;
    const amount=n?this.progress(n,q):0;
    if(amount&&Economy.remove(n.inventory,q.item,amount))Economy.add(this.cityVault.treasury,q.item,amount);
    q.dispatched=false;
  }
  move(n,p,kind,goal='travel'){
    if(!p)return;
    const next=PREFIX+kind;
    if(n.decisionSlot!==next||distance(n.actionTarget??n,p)>12){
      n.actionTarget={x:p.x,y:p.y};n.actionProgress=0;
      if(n.decisionSlot!==next){
        this.scene.resetNpcRoute(n);
        this.scene.workstations.release(n.id);
        if(n.meditationSpot&&goal==='cultivate')this.scene.cultivation?.spots.release(n);
        this.scene.scheduler.byId.get(n.id).waitingForSlot=false;
      }
    }
    n.goalAction=goal;n.decisionSlot=next;
  }
  waitAtDesk(n,q,service){
    if(!this.queue.has(n.id)&&this.queue.size<this.queuePlaces){
      const used=new Set(this.queue.values());
      const choices=Array.from({length:this.queuePlaces},(_,i)=>[i,this.site('queue-'+i)])
        .filter(([i,p])=>p&&!used.has(i)&&this.scene.groundPositionOpen(n,p.x,p.y))
        .sort((a,b)=>distance(n,a[1])-distance(n,b[1]));
      if(choices.length){
        this.queue.set(n.id,choices[0][0]);
      }
    }
    if(!this.queue.has(n.id))return;
    const at=this.site('queue-'+this.queue.get(n.id));
    const now=this.now(),ticket=this.serviceTicket;
    if(ticket&&(!this.queue.has(ticket.id)||ticket.until<=now)){
      this.queue.delete(ticket.id);this.serviceTicket=null;
    }
    if(!this.serviceTicket&&this.availableClerk()&&now>=(this.counterReady??0)){
      for(const [id,slot] of this.queue){
        const visitor=this.scene.scheduler.byId.get(id)?.npc;
        if(visitor&&distance(visitor,this.site('queue-'+slot))<18){
          this.serviceTicket={id,until:now+35};
          break;
        }
      }
    }
    const served=this.serviceTicket?.id===n.id&&this.availableClerk();
    if(served){
      const desk=this.site('counter'),approach={x:desk.x-26,y:desk.y+15};
      this.move(n,approach,'counter');
      if(this.canMeet(n)&&distance(n,approach)<13){
        const ok=service==='submit'?this.deliver(n,q.id):this.accept(n,q.id);
        if(ok)this.counterReady=now+4;
        else this.queue.delete(n.id);
        this.serviceTicket=null;
      }
    }else this.move(n,at,'queue');
  }
  herb(n,q){
    const env=this.world.environment;
    let node=env.resourceNodes.find(r=>r.id===n.assignedResourceNodeId&&r.reservedBy===n.id&&r.amount>0);
    if(!node){
      node=env.resourceNodes.filter(r=>r.amount>0&&!r.reservedBy&&r.danger<=24&&
        (!q.outside||r.id.startsWith(OUTER))&&this.scene.canReachPoint(n,r))
        .sort((a,b)=>distance(n,a)-distance(n,b))[0];
      if(!node)return;
      n.assignedResourceNodeId=node.id;node.reservedBy=n.id;q.workUntil=null;
    }
    const pos={x:node.x,y:node.y};
    this.move(n,pos,'herbs','gather');
    if(distance(n,node)>18){q.workUntil=null;return;}
    q.workUntil??=this.now()+7;
    if(this.now()<q.workUntil)return;
    const harvested=harvestHerbNode(this.world,node.id,n.id,q.id+':harvest:'+node.id+':'+(node.harvestCount??0));
    delete n.assignedResourceNodeId;q.workUntil=null;
    if(harvested){q.collected=(q.collected??0)+1;q.progress=this.progress(n,q);this.scene.requestBackgroundSave();}
  }
  huntCandidate(){
    const counter=this.site('counter');
    let best=null,score=-Infinity;
    for(const n of this.hunters){
      if(!this.civilian(n)||n.marketVisit||n.id===this.scene.possessedNpcId||livelihoodNeed(n,this.world)||n.goalAction==='flee')continue;
      const stats=cultivationStats(n);
      if(n.hp<stats.hpMax*.48||n.safety<28)continue;
      const value=stats.attack+stats.defense*.65+n.hp/stats.hpMax*12-distance(n,counter)/380;
      if(value>score){best=n;score=value;}
    }
    return best;
  }
  hunt(n,q){
    const env=this.world.environment;
    const stats=cultivationStats(n);
    if(n.hp<stats.hpMax*.36||n.safety<22){
      if(n.decisionSlot?.startsWith(PREFIX))this.retire(n);
      n.goalAction='rest';n.actionTarget=n.home??{x:n.x,y:n.y};n.decisionSlot='need:rest';
      return;
    }
    const drop=env.drops.find(d=>d.sourceId===q.prey&&d.status==='ground'&&[q.item,...(q.alternates??[])].includes(d.itemId));
    if(drop){
      this.move(n,drop,'loot','gather');
      if(distance(n,drop)<29)this.scene.claimFaunaDropForNpc(drop.id,n.id,q.id+':loot:'+drop.id);
      return;
    }
    let prey=env.fauna.find(f=>f.id===q.prey&&f.alive);
    if(!prey){
      prey=env.fauna.filter(f=>f.species===(q.species??'boar')&&f.alive&&f.rank!=='elite'&&
        (!q.outside||f.zoneId.startsWith(OUTER))&&this.scene.canReachPoint(n,f))
        .sort((a,b)=>distance(n,a)-distance(n,b))[0];
      q.prey=prey?.id;
    }
    if(!prey)return;
    n.faunaHuntTargetId=prey.id;
    const range=distance(n,prey);
    const approach=range>240?prey.home:this.scene.hunterApproach(n,prey);
    this.move(n,approach,'hunt','fight');
    if(range>48||!this.scene.monsterLine(n,prey)||this.now()<(q.strikeAt??0))return;
    q.strikeAt=this.now()+2;
    this.scene.playWeaponPose(n,{animation:'jian_slash'},this.scene.facePoint(n,prey));
    const result=this.scene.applyFaunaDamage(prey,n,cultivationStats(n).attack,q.id+':strike:'+this.now());
    if(result.ok&&!result.fauna.alive)q.defeated=(q.defeated??0)+1;
  }
  timber(n,q){
    const sources=this.world.environment.timberSources??[];
    const eligible=r=>r.renewAt===undefined&&(!q.outside||r.region==='outer-wood');
    const chosen=sources.find(r=>r.id===n.timberSourceId&&eligible(r));
    const source=chosen??sources.filter(r=>eligible(r)&&this.scene.canReachPoint(n,r)&&
      !this.world.npcs.some(other=>other!==n&&other.timberSourceId===r.id)).sort((a,b)=>distance(n,a)-distance(n,b))[0];
    if(!source){if(!q.outside)this.supply(n,q);return;}
    if(source.id!==n.timberSourceId){n.timberSourceId=source.id;q.workUntil=null;}
    this.move(n,source,'timber','work');
    if(distance(n,source)>20){q.workUntil=null;return;}
    q.workUntil??=this.now()+23;
    if(this.now()<q.workUntil)return;
    if(this.cutWood(n,source)){q.collected=(q.collected??0)+2;delete n.timberSourceId;q.workUntil=null;}
  }
  cityCourier(n,q){
    const depot=this.scene.markers.find(m=>m.id==='quest-office');
    if(!depot||q.dispatched)return;
    this.move(n,depot,'city-depot','gather');
    if(distance(n,depot)>25||!this.scene.merchants.line(n,depot))return;
    if(!Economy.remove(this.cityVault.treasury,q.item,q.quantity))return;
    q.dispatchBaseline=Economy.sellable(this.world,n,q.item);
    q.dispatched=true;
    Economy.add(n.inventory,q.item,q.quantity);
    this.note('dispatched',n,q,n.name+' nhận hàng tại Thanh Vân Thành.');
    this.scene.requestBackgroundSave();
  }
  mine(n,q){
    const rows=this.state.ore, now=this.now();
    for(const row of rows)if(row.amount===0&&row.renewAt<=now)row.amount=5;
    const row=rows.filter(o=>o.amount>0&&this.scene.canReachPoint(n,this.site(o.id)))
      .sort((a,b)=>distance(n,this.site(a.id))-distance(n,this.site(b.id)))[0];
    if(!row)return this.supply(n,q);
    const point=this.site(row.id);
    if(q.oreSite!==row.id){q.oreSite=row.id;q.workUntil=null;}
    this.move(n,point,'mine','gather');
    if(distance(n,point)>17){q.workUntil=null;return;}
    q.workUntil??=now+16;
    if(now<q.workUntil)return;
    this.takeOre(n,row);q.workUntil=null;
  }
  cutWood(n,source){
    if(source.renewAt!==undefined)return false;
    source.renewAt=this.now()+4320;source.cuts=(source.cuts??0)+1;
    Economy.add(n.inventory,'wood',2);this.scene.requestBackgroundSave();
    return true;
  }
  takeOre(n,row){
    if(row.amount<=0)return false;
    if(--row.amount===0)row.renewAt=this.now()+2880;
    Economy.add(n.inventory,'iron_ore',1);this.scene.requestBackgroundSave();
    return true;
  }
  supply(n,q){
    const venue=[...this.scene.merchants.shops.values()].filter(v=>count(v.shop.stock,q.item)>=q.quantity-this.progress(n,q))
      .sort((a,b)=>distance(n,a.position)-distance(n,b.position))[0];
    if(!venue||n.marketVisit)return;
    if(this.scene.merchants.start(n,{side:'buy',itemId:q.item,count:q.quantity-this.progress(n,q),preferred:venue.shop.id})){
      delete n.decisionSlot;
    }
  }
  service(n,key){
    if(this.routeBackoff.get(n.id)>this.now())return;
    if(!this.civilian(n)||livelihoodNeed(n,this.world)||n.marketVisit||n.id===this.scene.possessedNpcId){
      if(n.decisionSlot?.startsWith(PREFIX))this.retire(n);
      return;
    }
    const hour=this.world.clock.minute;
    if(!openHours(hour)){
      if(n.decisionSlot?.startsWith(PREFIX))this.retire(n);
      return;
    }
    if(key==='market'||key==='food')return;
    if(key==='leader'&&hour>=740&&hour<820&&this.site('council')){
      this.move(n,this.site('council'),'council','work');
      return;
    }
    if((key==='elders'||key==='library')&&hour>=890&&hour<1050&&this.site('elder-cave')){
      const seat=this.site('retreat-seat-'+(key==='elders'?0:5));
      this.move(n,seat,'retreat','cultivate');
      return;
    }
    if((key==='alchemy'||key==='forge')&&hour>=430&&hour<520&&this.site('materials')){
      const offset=key==='alchemy'?-28:28;
      this.move(n,{x:this.site('materials').x+offset,y:this.site('materials').y},key+'-supplies','work');
      return;
    }
    if(key==='elders'&&hour>=550&&hour<748&&this.site('teaching')){
      this.move(n,this.site('teaching'),'teaching','work');
      return;
    }
    const spot=key==='quests'?this.site('counter'):this.site(key);
    this.move(n,spot,key,'work');
  }
  releaseActivity(n){
    const claim=this.activityClaims.get(n.id);
    if(!claim)return;
    this.activityClaims.delete(n.id);
    this.reservations.delete(claim.point.id);
  }
  reserveActivity(n,key,points,index){
    const current=this.activityClaims.get(n.id);
    const retry=current?.key===key;
    if(retry){
      const scheduler=this.scene.scheduler,entry=scheduler.byId.get(n.id),watch=entry?.travelWatch;
      const stale=n.pathBlocked&&watch&&scheduler.time-watch.since>=5000&&
        distance(watch.goal,current.point)<24&&distance(n,current.point)>18;
      if(!stale||scheduler.time<(current.retryAfter??0))return current.point;
      current.retryAfter=scheduler.time+7500;
    }
    this.releaseActivity(n);
    const capacity=points.length;
    for(let i=0;i<capacity;i++){
      const p=points[(index+i)%capacity];
      if(!p||retry&&p.id===current.point.id||this.reservations.has(p.id)||
        !this.scene.groundPositionOpen(n,p.x,p.y)||!this.scene.canReachPoint(n,p))continue;
      this.reservations.set(p.id,n.id);
      this.activityClaims.set(n.id,{key,point:p,retryAfter:retry?current.retryAfter:0});
      if(retry)this.scene.resetNpcRoute(n);
      return p;
    }
    if(retry){
      this.activityClaims.set(n.id,current);
      this.reservations.set(current.point.id,n.id);
      return current.point;
    }
    return null;
  }
  guardGate(n,index){
    const hour=this.world.clock.minute,shift=Math.floor((hour-390)/160);
    if(!this.site('guard-post')||shift<0||shift>=5||index>=this.disciples.length)return false;
    const first=(this.world.clock.day*3+shift*2)%this.disciples.length;
    const duty=(index-first+this.disciples.length)%this.disciples.length;
    if(duty>1)return false;
    const prior=this.gateDuty.get(n.id);
    const patrol=prior?.shift===shift&&prior.day===this.world.clock.day?prior:
      {shift,day:this.world.clock.day,waypoint:duty,until:null};
    this.gateDuty.set(n.id,patrol);
    let point=this.site('circuit-'+patrol.waypoint);
    if(distance(n,point)<14){
      patrol.until??=this.now()+9+(n.aiProfile?.seed??0)%12;
      if(this.now()>=patrol.until){
        patrol.waypoint=(patrol.waypoint+2)%4;
        patrol.until=null;
        point=this.site('circuit-'+patrol.waypoint);
      }
    }
    this.move(n,point,'gate-duty','work');
    n.shortGoal=patrol.until?'Đứng gác Sơn Môn':'Tuần tra Sơn Môn';
    return true;
  }
  guardCourts(n,index){
    const hour=this.world.clock.minute;
    if(!this.site('vault-watch')||hour<780||hour>=1050||index>=this.disciples.length)return false;
    const first=(this.world.clock.day*3+11)%this.disciples.length;
    const duty=(index-first+this.disciples.length)%this.disciples.length;
    if(duty>1)return false;
    if(duty===0){
      this.move(n,this.site('vault-watch'),'vault-duty','work');
      return true;
    }
    const patrol=this.gateDuty.get(n.id);
    const route=patrol?.courtDay===this.world.clock.day?patrol:{courtDay:this.world.clock.day,waypoint:0,until:null};
    this.gateDuty.set(n.id,route);
    let p=this.site('law-patrol-'+route.waypoint);
    if(distance(n,p)<14){
      route.until??=this.now()+12+index%7;
      if(this.now()>=route.until){
        route.waypoint=(route.waypoint+1)%4;route.until=null;
        p=this.site('law-patrol-'+route.waypoint);
      }
    }
    this.move(n,p,'law-duty','work');
    return true;
  }
  activity(n,index){
    const minute=(this.world.clock.minute+index*13+(n.aiProfile?.axes?.discipline??50)%29)%1440;
    const active=minute>=380&&minute<1280;
    if(!active){this.releaseActivity(n);this.move(n,n.home,'home','rest');return;}
    const cycle=(index+(n.aiProfile?.seed??0)%3)%3;
    const hour=this.world.clock.minute;
    const lessonStart=550+Math.floor(index%3)*62;
    let key=hour>=lessonStart&&hour<lessonStart+59?'lesson':
      minute<570?'training':minute<850?(cycle===0?'array':'training'):
      minute<1120?(cycle===1?'array':'library'):(cycle===2?'array':'social');
    if(key==='array'&&n.meditationBreakUntil>this.now())key='library';
    const rows=(prefix,count)=>Array.from({length:count},(_,i)=>this.site(prefix+i));
    const points={
      training:this.activities.training.length?this.activities.training:[...rows('dummy-',6),this.site('sword-court')],
      array:rows(rankSeat(n),8),library:this.activities.reading,
      lesson:this.activities.lesson,social:rows('social-',4),
    }[key];
    const spot=this.reserveActivity(n,key,points,index);
    if(!spot){this.move(n,n.home,'home','rest');return;}
    this.move(n,spot,key,key==='array'?'cultivate':key==='social'?'rest':'work');
    if(distance(n,spot)<13&&(this.now()+index)%13===0){
      if(key==='training'&&n.realmIndex<2){
        addCultivationXp(n,1);
        if(this.scene.npcSprites.get(n.id)?.visible){
          this.scene.playWeaponPose(n,{animation:'jian_slash'},'up');
          this.scene.spawnWeaponFx('jian','up',n.x,n.y-20);
        }
      }
      if(key==='array'&&n.realmIndex<2&&this.scene.cultivation.isSeated(n))addCultivationXp(n,1);
      const teacher=this.site('teaching');
      const taught=key==='lesson'&&teacher&&this.world.npcs.some(t=>t.decisionSlot===PREFIX+'teaching'&&distance(t,teacher)<15);
      if((key==='library'||taught)&&n.technique&&n.techniqueProgress){
        const known=this.world.sects.find(s=>s.factionId===FACTION)?.ownedTechniques??[];
        if(known.includes(n.technique))addTechniquePractice(n,n.technique,1);
      }
    }
  }
  produce(){
    const alchemist=this.world.npcs.find(n=>this.staff.get(n.id)==='alchemy');
    const canBrew=alchemist&&this.civilian(alchemist)&&alchemist.decisionSlot===PREFIX+'alchemy'&&distance(alchemist,this.site('alchemy'))<=15;
    const at=this.now(),shop=this.world.shops.find(s=>s.id===SECT_SHOP);
    if(shop&&shop.cash>75&&this.state.lastRemittance!==this.world.clock.day){
      const surplus=shop.cash-65;shop.cash-=surplus;this.vault.wealth+=surplus;
      this.state.lastRemittance=this.world.clock.day;this.transfer('inbound','spiritStones',surplus);
    }
    if(canBrew&&!this.state.batch){
      const recipe=[['violet_mist_flower',1,'detox_pill',2],['ancient_blood_lotus',1,'qi_pill',7],
        ['moon_lotus',1,'healing_pill',2],['ember_reishi',1,'qi_pill',3],['scorch_flower',2,'qi_pill',1],
        ['thunder_fruit',1,'qi_pill',4],['purple_jade_fungus',1,'qi_pill',2],
        ['qingling_herb',2,'qi_pill',1],['spirit_herb',3,'qi_pill',1]]
        .find(([ingredient,quantity,pill])=>count(this.vault.treasury,ingredient)>=quantity&&
          (pill!=='detox_pill'||count(this.vault.treasury,pill)<4));
      if(recipe){
        const [ingredient,quantity,pill,yieldCount]=recipe;
        Economy.remove(this.vault.treasury,ingredient,quantity);this.transfer('outbound',ingredient,quantity);
        this.state.batch={finish:at+42,actorId:alchemist.id,pill,yieldCount};
      }
    }
    if(canBrew&&this.state.batch&&this.state.batch.finish<=at){
      const {pill='qi_pill',yieldCount=1}=this.state.batch;
      Economy.add(this.vault.treasury,pill,yieldCount);this.transfer('inbound',pill,yieldCount);
      delete this.state.batch;this.note('brew',alchemist,null,`Đan Dược Đường luyện thành ${ITEMS[pill].name} ×${yieldCount}.`);
    }
    if(shop&&count(this.vault.treasury,'detox_pill')>1&&count(shop.stock,'detox_pill')<4){
      Economy.remove(this.vault.treasury,'detox_pill',1);Economy.add(shop.stock,'detox_pill',1);
      this.transfer('outbound','detox_pill',1);
    }
    const forge=this.world.npcs.find(n=>this.staff.get(n.id)==='forge');
    const flux=count(this.vault.treasury,'phantom_sand_crystal')?'phantom_sand_crystal':'iron_ore';
    const timber=count(this.vault.treasury,'poplar_heartwood')?'poplar_heartwood':'wood';
    if(forge?.decisionSlot===PREFIX+'forge'&&distance(forge,this.site('forge'))<=15){
      if(this.state.forge&&this.state.forge.finish<=at){
        Economy.add(this.vault.treasury,'iron_sword',1);this.transfer('inbound','iron_sword',1);
        delete this.state.forge;
        this.note('forge',forge,null,'Luyện Khí Đường hoàn thành một Thiết Mộc Kiếm.');
      }else if(!this.state.forge&&count(this.vault.treasury,'iron_ore')>=(flux==='iron_ore'?2:1)&&count(this.vault.treasury,timber)>=1&&count(this.vault.treasury,'iron_sword')<3){
        for(const ingredient of ['iron_ore',flux,timber]){
          Economy.remove(this.vault.treasury,ingredient,1);this.transfer('outbound',ingredient,1);
        }
        this.state.forge={finish:at+55,actorId:forge.id};
      }
    }
    for(const [destination,item,reserve,cap] of [
      [shop,'qi_pill',2,4],[shop,'iron_sword',1,2],[shop,'spirit_herb',10,6],
      [this.world.shops.find(s=>s.id===SECT_FOOD),'ration',3,6],
    ]){
      if(destination&&count(this.vault.treasury,item)>reserve&&count(destination.stock,item)<cap){
        Economy.remove(this.vault.treasury,item,1);Economy.add(destination.stock,item,1);this.transfer('outbound',item,1);
      }
    }
    for(const item of ['spirit_herb','wood','iron_ore','wolf_pelt','boar_tusk']){
      if(shop&&count(shop.stock,item)>2&&count(this.vault.treasury,item)<5){
        Economy.remove(shop.stock,item,1);Economy.add(this.vault.treasury,item,1);this.transfer('inbound',item,1);
      }
    }
  }
  tick(){
    if(!this.state)return;
    const at=this.now(),minute=this.world.clock.minute;
    for(const [id,claim] of this.activityClaims){
      const n=this.scene.scheduler.byId.get(id)?.npc;
      if(!this.civilian(n)||n.decisionSlot!==PREFIX+claim.key||n.id===this.scene.possessedNpcId||
        n.marketVisit||livelihoodNeed(n,this.world))this.releaseActivity({id});
    }
    if(!openHours(minute)){this.queue.clear();this.serviceTicket=null;}
    for(const q of this.state.orders){
      const assignee=q.assignee&&this.scene.scheduler.byId.get(q.assignee)?.npc;
      if((q.status==='open'||q.status==='active')&&(q.expires<=at||assignee&&(!assignee.alive||assignee.ascended))){
        this.refund(q);q.status='failed';q.finished=at;
        this.retire(this.scene.scheduler.byId.get(q.assignee)?.npc);
      }
    }
    if(at%12===0||!this.state.orders.length){this.demand();this.produce();}
    this.production.update();
    this.spiritVeins.update();
    for(const [id,key] of this.staff){const n=this.scene.scheduler.byId.get(id)?.npc;if(n)this.service(n,key);}
    this.reviewBudget();
    const selectedHunter=openHours(minute)&&this.state.orders.some(q=>q.type==='hunt'&&q.status==='open')?
      this.hunters.find(n=>this.queue.has(n.id))??this.huntCandidate():null;
    for(const [index,n] of this.participants.entries()){
      if(n.underground||n.decisionSlot?.startsWith('civic:'))continue;
      if(this.scene.expeditions?.has(n)||this.scene.recovery?.drives(n)||n.decisionSlot?.startsWith('society:')||this.scene.westWilds?.directs(n)||this.scene.westTreasures?.directs(n))continue;
      if(this.routeBackoff.get(n.id)>at)continue;
      if(this.scene.scheduler.byId.get(n.id)?.routeFailure==='outside-world'){
        this.retire(n);continue;
      }
      if(n.id===this.scene.possessedNpcId||n.marketVisit){this.queue.delete(n.id);continue;}
      if(!this.civilian(n)||livelihoodNeed(n,this.world)||n.lawResponse||n.goalAction==='flee'){
        if(n.decisionSlot?.startsWith(PREFIX))this.retire(n);continue;
      }
      const q=this.orderFor(n);
      if(q){
        q.progress=this.progress(n,q);
        if(q.progress>=q.quantity){
          q.phase='return';
          if(n.faunaHuntTargetId===q.prey)delete n.faunaHuntTargetId;
          if(openHours(minute))this.waitAtDesk(n,q,'submit');
          else if(member(n))this.activity(n,index);
        }else{
          q.phase='field';
          if(q.westRegion)this.scene.westWilds?.pursueOrder(n,q,this);
          else if(q.type==='herbs')this.herb(n,q);
          else if(q.type==='hunt')this.hunt(n,q);
          else if(q.type==='supply')this.timber(n,q);
          else if(q.veinId)this.spiritVeins.mine(n,q);
          else if(q.type==='ore')q.mining?this.production.mine(n,q):this.mine(n,q);
          else if(q.type.startsWith('farm'))this.production.farm(n,q);
          else if(q.type==='city-courier')this.cityCourier(n,q);
          else this.supply(n,q);
        }
        continue;
      }
      if(this.guardCourts(n,index)||this.guardGate(n,index)){this.queue.delete(n.id);this.releaseActivity(n);continue;}
      const offers=this.offers(n).filter(q=>q.type==='hunt'?n===selectedHunter||this.queue.has(n.id)&&n.populationRole==='hunter':
        n.populationRole!=='hunter'&&(q.type==='city-courier'||this.couriers.includes(n)&&(q.type==='ore'||q.type.startsWith('farm'))||
          !this.couriers.includes(n)&&!this.traders.includes(n)));
      const seeking=openHours(minute)&&offers.length&&(n===selectedHunter||
        (!n.marketRetryAt||n.marketRetryAt<=at)&&(n.spiritStones<120||member(n)&&((this.state.credits[n.id]??0)<24))&&
        ((at+index*19)%180<52||this.queue.has(n.id)));
      if(seeking){
        const prior=this.intents.get(n.id),choice=offers.find(q=>q.id===prior)??offers[(index+this.world.clock.day)%offers.length];
        this.intents.set(n.id,choice.id);
        this.waitAtDesk(n,choice,'accept');
        if(this.queue.has(n.id)){
          if(n.populationRole==='hunter')delete n.faunaHuntTargetId;
          continue;
        }
      }else{this.queue.delete(n.id);this.intents.delete(n.id);}
      if(this.traders.includes(n)&&minute>=440&&minute<845&&(at+index)%31===0){
        const item=['qi_pill','spirit_herb','wolf_fang'].find(id=>count(n.inventory,id)===0&&
          count(this.scene.merchants.shops.get(SECT_SHOP)?.shop.stock??[],id)>0);
        if(item&&this.scene.merchants.start(n,{side:'buy',itemId:item,count:1,preferred:SECT_SHOP,onlyPreferred:true}))continue;
      }
      if((at+index)%43===0&&!n.marketVisit){
        const item=n.inventory.find(i=>['wolf_pelt','boar_tusk','spirit_herb','wood','iron_ore'].includes(i.itemId)&&i.count>=2);
        if(item&&this.scene.merchants.start(n,{side:'sell',itemId:item.itemId,count:1,preferred:SECT_SHOP}))continue;
        if(member(n)&&livelihoodNeed(n,this.world)!=='rest'&&n.realmIndex===0&&n.spiritStones>=22&&
          !count(n.inventory,'qi_pill')&&this.scene.merchants.start(n,{side:'buy',itemId:'qi_pill',count:1,preferred:SECT_SHOP}))continue;
      }
      if(member(n))this.activity(n,index);
      else if(n.decisionSlot?.startsWith(PREFIX))this.retire(n);
    }
    this.updatePanel();
  }
  snapshot(){
    const s=this.state,orders=s.orders;
    const population=this.scene.getPopulationState(),queued=[...this.queue.keys()];
    return {clerk:this.clerk.id,onDuty:this.availableClerk(),queue:queued,
      receiving:queued.filter(id=>!orders.some(q=>q.assignee===id&&q.status==='active')).length,contribution:{...s.credits},
      open:orders.filter(q=>q.status==='open').length,field:orders.filter(q=>q.phase==='field'&&q.status==='active').length,
      returning:orders.filter(q=>q.phase==='return'&&q.status==='active').length,complete:orders.filter(q=>q.status==='completed').length,
      failed:orders.filter(q=>q.status==='failed').length,treasury:this.vault.treasury,wealth:this.vault.wealth,
      inbound:s.inbound,outbound:s.outbound,training:this.disciples.filter(n=>n.decisionSlot===PREFIX+'training'&&n.action==='work').length,
      cultivating:this.disciples.filter(n=>n.decisionSlot===PREFIX+'array'&&this.scene.cultivation.isSeated(n)).length,
      brewing:s.batch??null,forging:s.forge??null,trading:this.world.npcs.filter(n=>n.marketVisit?.shopId===SECT_SHOP&&n.action==='trade').length,
      tradeWaiting:this.world.npcs.filter(n=>n.marketVisit?.shopId===SECT_SHOP&&n.action!=='trade').length,
      orders,logs:s.logs,budget:s.budget,production:this.production.state.totals,stuck:population.states.stuck,
      navigationFailures:population.diagnostics.stuckExamples.filter(row=>
        this.scene.scheduler.byId.get(row.id)?.npc.decisionSlot?.startsWith(PREFIX))};
  }
  mount(){
    this.panel=document.createElement('dialog');
    this.panel.className='sect-campus-panel';
    this.panel.addEventListener('close',()=>{this.viewer=null;});
    document.body.append(this.panel);
    this.scene.events.once('shutdown',()=>{this.panel.remove();this.bubbleText?.destroy();});
    const menu=document.getElementById('world-dev-menu');
    if(menu){const btn=document.createElement('button');btn.textContent='Thanh Vân Tông';btn.onclick=()=>{menu.hidden=true;this.show(null);};menu.append(btn);}
  }
  show(n,mode='quests'){
    this.viewer=n;this.panelMode=mode;this.panelFilter='open';this.panelKey=null;
    if(!this.panel.open)this.panel.showModal();this.updatePanel();
  }
  atLibrary(n){
    if(this.scene.buildingOpen?.('sect-campus-library')===false)return false;
    const keeper=this.world.npcs.find(p=>this.staff.get(p.id)==='library');
    return member(n)&&this.civilian(n)&&this.civilian(keeper)&&keeper.decisionSlot===PREFIX+'library'&&
      distance(keeper,this.site('library'))<15&&distance(keeper,n)<45&&this.scene.merchants.line(keeper,n);
  }
  interact(n){
    if(this.canMeet(n)){this.show(n);return true;}
    const board=this.site('quest-board');
    if(board&&this.civilian(n)&&distance(n,board)<26){this.show(n);return true;}
    if(this.atLibrary(n)){this.show(n,'library');return true;}
    const q=this.orderFor(n);
    if(!q||!this.civilian(n)||this.progress(n,q)>=q.quantity)return false;
    if(q.type==='ore'||q.type==='supply'){
      const ore=q.type==='ore',now=this.now();
      const resource=ore?this.state.ore.find(o=>(o.amount>0||o.renewAt<=now)&&distance(n,this.site(o.id))<26):
        (this.world.environment.timberSources??[]).find(o=>o.renewAt===undefined&&distance(n,o)<26&&
          !this.world.npcs.some(other=>other!==n&&other.timberSourceId===o.id));
      if(!resource)return false;
      if((q.manualHarvestAt??0)>now)return true;
      if(ore&&resource.amount===0)resource.amount=5;
      const collected=ore?this.takeOre(n,resource):this.cutWood(n,resource);
      if(collected){
        q.manualHarvestAt=now+(ore?16:23);q.progress=this.progress(n,q);
        this.scene.worldPopulationToast('Đã thu '+ITEMS[q.item].name+' · '+q.progress+'/'+q.quantity);
      }
      return true;
    }
    if(q.type!=='herbs')return false;
    const node=this.world.environment.resourceNodes.find(r=>r.amount>0&&r.danger<=24&&
      (!r.reservedBy||r.reservedBy===n.id)&&distance(n,r)<26&&this.scene.merchants.line(n,r));
    if(!node)return false;
    if((q.manualHarvestAt??0)>this.now())return true;
    node.reservedBy=n.id;
    const result=harvestHerbNode(this.world,node.id,n.id,q.id+':direct:'+node.id+':'+(node.harvestCount??0));
    if(result){q.collected=(q.collected??0)+1;q.manualHarvestAt=this.now()+7;q.progress=this.progress(n,q);this.scene.requestBackgroundSave();
      this.scene.worldPopulationToast('Đã hái một Ngưng Lộ Thảo · '+q.progress+'/'+q.quantity);}
    return true;
  }
  redeem(n){
    const s=this.state,cost=5;
    if(!member(n)||!this.canMeet(n)||(s.credits[n.id]??0)<cost||!Economy.remove(this.vault.treasury,'qi_pill',1))return false;
    s.credits[n.id]-=cost;Economy.add(n.inventory,'qi_pill',1);
    this.transfer('outbound','qi_pill',1);
    this.note('redeem',n,null,n.name+' đổi 5 cống hiến lấy một Tụ Khí Đan.');
    this.scene.requestBackgroundSave();return true;
  }
  updatePanel(){
    if(!this.panel?.open)return;
    const n=this.viewer,s=this.snapshot(),state=this.state;
    const key=JSON.stringify([this.panelMode,this.panelFilter,n?.id,n?.technique,n?.martial?.learned,n?.spiritStones,n?.inventory,s.wealth,s.treasury,s.orders,s.logs.length]);
    if(this.panelKey===key)return;
    this.panelKey=key;
    const add=(tag,value,parent=this.panel)=>{const e=document.createElement(tag);e.textContent=value;parent.append(e);return e;};
    const button=(name,fn,parent=this.panel)=>{const e=add('button',name,parent);e.onclick=fn;return e;};
    this.panel.replaceChildren();
    if(this.panelMode==='library'&&n){
      add('h2','Tàng Kinh Các');
      button('Đóng',()=>this.panel.close());
      const owned=this.world.sects.find(f=>f.factionId===FACTION)?.ownedTechniques??[];
      for(const id of owned){
        if(!TECHNIQUES[id])continue;
        const rule=id==='sword'?n.realmIndex>=1||n.realmLevel>=4:true;
        add('p',TECHNIQUES[id].name+' · '+TECHNIQUES[id].description+(rule?'':' · Cần Luyện Khí tầng 4.'));
        const b=button(n.technique===id?'Đang tu':'Chọn công pháp',()=>{
          if(!rule||!this.atLibrary(n))return;
          n.technique=id;this.scene.requestBackgroundSave();this.updatePanel();
        });
        b.disabled=!rule||n.technique===id;
      }
      for(const id of this.scene.martialEconomy?.lessons??[]){
        const book=MARTIAL_TECHNIQUES[id], known=martialMastery(n,id)>=0;
        const credits=book.grade===2?12:4;
        add('p',book.name+' · '+GRADES[book.grade].name+' phẩm · '+book.skills.map(move=>move.name).join(', '));
        const learn=button(known?'Nghiên cứu công pháp':'Học · '+credits+' cống hiến',()=>{
          this.scene.worldPopulationToast(this.scene.martialEconomy.library(n,id)?'Đã học hoặc nghiên cứu công pháp.':'Chưa đủ điều kiện hoặc đã nghiên cứu hôm nay.');
          this.updatePanel();
        });
        learn.disabled=n.realmIndex<book.minimum||!known&&(state.credits[n.id]??0)<credits;
      }
      return;
    }
    add('h2','Nhiệm Vụ Điện');
    button('Đóng',()=>this.panel.close());
    add('p','Đang mở '+s.open+' · Đến nhận '+s.receiving+' · Đang làm '+s.field+' · Về nộp '+s.returning+' · Hoàn thành '+s.complete+' · Thất bại '+s.failed);
    if(n){
      add('p','Cống hiến '+(state.credits[n.id]??0)+' · Linh thạch '+n.spiritStones);
      if(member(n))button('Đổi 5 cống hiến lấy Tụ Khí Đan',()=>{
        if(!this.redeem(n))this.scene.worldPopulationToast('Cần đủ điểm, còn đan trong kho và quản sự đang trực.');
        this.updatePanel();
      });
    }
    let rows=s.orders.slice(-20).reverse();
    if(n){
      const filters=[['open','Có thể nhận'],['active','Đang thực hiện'],['ready','Có thể nộp'],['history','Lịch sử']];
      const nav=add('nav','');
      for(const [id,label] of filters)button(label,()=>{this.panelFilter=id;this.updatePanel();},nav)
        .setAttribute('aria-pressed',String(this.panelFilter===id));
      const own=s.orders.filter(q=>q.assignee===n.id);
      rows=this.panelFilter==='open'?this.offers(n):
        own.filter(q=>this.panelFilter==='history'?q.status!=='active':q.status==='active'&&
          (this.panelFilter!=='ready'||this.progress(n,q)>=q.quantity));
    }
    if(!rows.length)add('p','Chưa có nhiệm vụ ở mục này.');
    for(const q of rows){
      const line=add('article',q.name+' · '+q.status);
      add('p',q.description+' '+q.zone+' · '+q.difficulty+' · '+(n&&q.assignee===n.id?this.progress(n,q):q.progress)+'/'+q.quantity+
        ' · '+q.reward+' linh thạch + '+q.merit+' cống hiến · hạn ngày '+Math.floor(q.expires/1440),line);
      if(!n&&q.assignee)add('p',this.scene.scheduler.byId.get(q.assignee)?.npc.name??q.assignee,line);
      if(n&&q.status==='open'&&!this.orderFor(n))button('Nhận',()=>{if(!this.accept(n,q.id))this.scene.worldPopulationToast('Quản sự chưa thể giao nhiệm vụ này.');this.updatePanel();},line);
      if(n&&q.assignee===n.id&&q.status==='active'){
        button('Nộp vật phẩm',()=>{if(!this.deliver(n,q.id))this.scene.worldPopulationToast('Chưa đủ vật phẩm hoặc chưa đến lượt.');this.updatePanel();},line);
        button('Hủy nhiệm vụ',()=>{this.cancel(n,q.id);this.updatePanel();},line);
      }
    }
    add('h3','Bảo khố');
    add('p',s.wealth+' linh thạch · '+s.treasury.map(i=>(ITEMS[i.itemId]?.name??i.itemId)+' ×'+i.count).join(' · '));
    add('h3','Nhật ký gần đây');
    for(const log of state.logs.slice(-8).reverse())add('p',log.description);
  }
  update(){
    const c=this.bubble;
    if(!c||this.scene.time.now>=c.until){this.bubbleText?.setVisible(false);return;}
    if(!this.scene.inSceneryView(c,40))return;
    this.bubbleText??=this.scene.add.text(0,0,'',{fontSize:'12px',color:'#f2ddb0',backgroundColor:'#172922',
      padding:{x:6,y:4},wordWrap:{width:220}}).setOrigin(.5,1).setDepth(4900);
    if(this.bubbleText.text!==c.text)this.bubbleText.setText(c.text).setPosition(c.x,c.y);
    this.bubbleText.setVisible(true);
  }
}
function npcReset(n){delete n.decisionSlot;n.goalAction='idle';n.action='idle';n.actionTarget={x:n.x,y:n.y};}
