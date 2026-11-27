import {EconomySystem as Economy} from '../dao/EconomySystem.ts';
import {martialMastery} from '../dao/MartialProgress.ts';
import {MARTIAL_TECHNIQUES,MARTIAL_WEAPONS} from '../dao/MartialRegistry.ts';
import {caveDistance,caveOpen} from './UndergroundMaps.js';
import {commerceEvent,commerceProduct,trackOne,worldMinute} from './CommerceCatalog.js';
import {priceMartial} from './MartialEconomy.js';
import {createWorldUuid} from './WorldId.ts';
import {mountAuction} from './WeeklyAuctionUI.js';

import {AUCTION_BUILDING,AUCTION_SITE,auctionSeats as seats} from './BuildingInteriors.js';
export {AUCTION_SITE,auctionSite,createAuctionRoom} from './BuildingInteriors.js';

const minimum=100, capacity=seats.length, lotMinutes=12;
const far=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const nowWeek=day=>Math.floor(Math.max(0,day-1)/7);
const weekDay=day=>1+(day-1)%7;
const readyNpc=n=>n?.alive&&!n.minor&&!n.ascended;
const idleNpc=n=>readyNpc(n)&&!n.flight&&!n.skyStep&&!n.tribulation&&!n.convalescence&&
  n.goalAction!=='fight'&&n.goalAction!=='flee'&&n.hunger<72&&n.fatigue<82;

export class WeeklyAuction {
  constructor(scene,point){
    this.scene=scene;this.world=scene.populationWorld;this.point=point;
    this.state=this.world.weeklyAuction??={lots:[],sessions:[],treasury:0,history:[]};
    this.people=new Map();
    this.consignmentRoutes=new Map();
    this.lastMinute=-1;
    this.site=scene.underground.sites.get(AUCTION_SITE);
    this.panel=mountAuction(this);
    if(this.site)this.migrateInteriorGuests();
  }
  migrateInteriorGuests(){
    const old=this.occupants.filter(npc=>npc.underground.auctionLayout!==2);
    if(!old.length)return;
    const floor=this.site.map.floors[0];
    const used=new Set(this.occupants.filter(npc=>npc.underground.auctionLayout===2).map(npc=>{
      const {floor,x,y}=npc.underground;
      return floor+':'+x+':'+y;
    }));
    const entryCells=this.site.entrySlots.map(point=>({...point,floor:0}));
    for(let y=floor.entry.y-1;y>=1;y--)for(let x=floor.entry.x-6;x<=floor.entry.x+6;x++){
      if(caveOpen(floor,x,y)&&!seats.some(seat=>seat.floor===0&&seat.x===x&&seat.y===y))
        entryCells.push({x,y,floor:0});
    }
    for(const npc of old){
      const d=npc.underground,seat=seats[this.session?.seats[npc.id]];
      const candidates=d.auctionSeated&&seat?[seat,...entryCells]:entryCells;
      const location=candidates.find(p=>!used.has(p.floor+':'+p.x+':'+p.y));
      if(!location)continue;
      const {x,y,floor}=location;
      used.add(floor+':'+x+':'+y);
      Object.assign(d,{x,y,floor,auctionLayout:2});
      if(location!==seat)delete d.auctionSeated;
    }
  }
  get now(){return worldMinute(this.world);}
  get week(){return nowWeek(this.world.clock.day);}
  get session(){return this.state.sessions.find(row=>row.week===this.week);}
  get activeLot(){return this.state.lots.find(lot=>lot.id===this.session?.lots[this.session.index]&&lot.status==='open');}
  get auctioneer(){return this.world.npcs.find(n=>n.id===this.session?.auctioneer);}
  resolve(id){return this.scene.scheduler.byId.get(id)?.npc??this.world.npcs.find(n=>n.id===id);}
  get building(){return this.world.environment?.objects?.find(object=>object.id===AUCTION_BUILDING);}
  get occupants(){return this.world.npcs.filter(n=>n.alive&&n.underground?.siteId===AUCTION_SITE);}
  get vaultLots(){return this.state.lots.filter(lot=>lot.status!=='open'&&lot.cargo?.length);}
  get steward(){return this.auctioneer??this.resolve(this.state.steward);}
  openForVisitors(){return this.building?.hp!==0;}
  permittedFloor(npc,level){
    if(level===0)return true;
    if(level===2)return this.steward?.id===npc.id;
    return this.steward?.id===npc.id||seats[this.session?.seats[npc.id]]?.floor===1;
  }
  get publicHours(){
    return weekDay(this.world.clock.day)<=6&&this.world.clock.minute>=480&&this.world.clock.minute<1030;
  }
  access(npc,job){
    if(!this.openForVisitors()||!readyNpc(npc)||npc.flight||npc.tribulation||this.scene.civic?.restricted(npc))return false;
    if(job?.type==='auction-visitor'&&npc.id===this.scene.possessedNpcId&&this.publicHours)return true;
    if(job?.type==='auction-staff'&&this.steward?.id===npc.id)return true;
    if(this.session?.auctioneer===npc.id&&['reception','inspection','bidding'].includes(this.session.phase))return true;
    return npc.spiritStones>=minimum&&['reception','inspection','bidding'].includes(this.session?.phase)&&
      this.session?.seats[npc.id]!==undefined;
  }
  nearDesk(npc){
    if(npc.underground?.siteId===AUCTION_SITE){
      const desk=this.site.map.floors[0].props.find(p=>p.name==='Quầy ký gửi và giao nhận');
      return npc.underground.floor===0&&caveDistance(npc.underground,desk)<=2;
    }
    return this.point&&!npc.underground&&!npc.wallLevel&&!npc.flight&&far(npc,this.point)<84&&this.scene.clearCombatLine(npc,this.point);
  }
  qualifiedForSeat(npc){return readyNpc(npc)&&Number.isSafeInteger(npc.spiritStones)&&npc.spiritStones>=minimum&&!this.scene.civic?.restricted(npc);}
  eligibleItem(id){
    const p=commerceProduct(id);
    return p?.grade>=2&&p.grade<=3&&p.value>0&&
      (Boolean(p.book||p.arm)||p.kind==='herb'||p.kind==='treasure'||p.kind==='material'&&!id.startsWith('spirit_stone_'));
  }
  consign(npc,id,reserve=null,sourceId=npc?.id){
    const day=weekDay(this.world.clock.day);
    const source=this.source(sourceId);
    const actor=npc?.id===source?.agentId;
    if(!this.openForVisitors()||!readyNpc(npc)||!actor||!this.nearDesk(npc)||day>5||!this.eligibleItem(id)||
      this.state.lots.filter(lot=>lot.week===this.week&&lot.status==='queued').length>=8||
      sourceId===npc.id&&Economy.sellable(this.world,npc,id)<1)return false;
    const ask=reserve??(priceMartial(this.world,id,3)||commerceProduct(id).value);
    const stack=source.goods.find(item=>item.itemId===id&&item.count>0);
    if(!stack||!Number.isSafeInteger(ask)||ask<1||ask>1000000)return false;
    const lot={id:'van-bao:'+createWorldUuid(),itemId:id,seller:sourceId,week:this.week,ask,feeRate:.05,
      status:'queued',listedAt:this.now,bids:[],cargo:[]};
    if(!trackOne(stack,sourceId,undefined,source.holder)||
      !Economy.transferItem(source.goods,lot.cargo,id,1,sourceId,lot.id,source.holder))return false;
    const parcel=lot.cargo[0];
    lot.instanceId=(parcel.instances??parcel.itemInstances)[0].id;
    this.state.lots.push(lot);
    this.event(lot,'listed',npc.name+' đã ký gửi '+commerceProduct(id).name+'.',npc.id);
    return true;
  }
  source(id){
    const person=this.resolve(id);
    if(person)return {agentId:id,holder:person,goods:person.inventory,pay:value=>person.spiritStones+=value};
    const merchant=this.world.shops.find(shop=>shop.id===id);
    if(merchant)return {agentId:merchant.ownerId,goods:merchant.stock,pay:value=>merchant.cash+=value};
    const faction=this.world.factions.find(org=>org.id===id);
    const leader=faction&&(this.resolve(faction.leaderId)??this.world.npcs.find(n=>n.alive&&n.faction===faction.name&&
      ['sect_leader','city_master'].includes(n.authorityRole??n.populationRole)));
    if(faction&&leader)return {agentId:leader.id,goods:faction.treasury,pay:value=>faction.wealth+=value};
    return null;
  }
  nextAsk(lot){return lot.escrow?lot.escrow.price+Math.max(1,Math.floor(lot.ask*.02)):lot.ask;}
  seated(npc){
    const index=this.session?.seats[npc.id];
    return this.session?.checked?.includes(npc.id)&&index!==undefined&&npc.underground?.siteId===AUCTION_SITE&&(npc.underground.floor??0)===seats[index]?.floor&&!caveDistance(npc.underground,seats[index]);
  }
  bid(npc,lot=this.activeLot){
    if(!lot||lot!==this.activeLot||this.now>=lot.endsAt||!this.seated(npc)||!readyNpc(npc)||
      lot.seller===npc.id||this.source(lot.seller)?.agentId===npc.id||
      lot.escrow?.buyer===npc.id||this.scene.civic?.restricted(npc))return false;
    const price=this.nextAsk(lot);
    if(npc.spiritStones<price)return false;
    if(lot.escrow)this.refund(lot);
    npc.spiritStones-=price;
    lot.escrow={buyer:npc.id,price};
    lot.bids.push({buyer:npc.id,price,at:this.now});
    this.say(npc,price+' linh thạch!');
    this.event(lot,'bid',npc.name+' trả '+price+' linh thạch.',npc.id);
    return true;
  }
  say(npc,text){if(npc?.underground)npc.underground.auctionSpeech={text,until:this.now+2};}
  refund(lot){
    if(!lot.escrow)return;
    const buyer=this.resolve(lot.escrow.buyer);
    if(buyer)buyer.spiritStones+=lot.escrow.price;
    else this.state.treasury+=lot.escrow.price;
    delete lot.escrow;
  }
  settle(lot){
    if(!['open','queued'].includes(lot.status))return false;
    const seller=this.source(lot.seller),buyer=lot.escrow&&this.resolve(lot.escrow.buyer);
    const item=commerceProduct(lot.itemId).name;
    if(seller&&readyNpc(buyer)&&Economy.transferItem(lot.cargo,buyer.inventory,lot.itemId,1,lot.id,buyer.id)){
      const fee=Math.floor(lot.escrow.price*lot.feeRate);
      seller.pay(lot.escrow.price-fee);
      this.state.treasury+=fee;
      lot.result={winner:buyer.id,price:lot.escrow.price,net:lot.escrow.price-fee,fee};
      delete lot.escrow;
      lot.status='sold';
      this.say(this.auctioneer,buyer.name+' thắng · '+lot.result.price);
      this.event(lot,'sold',buyer.name+' thắng '+item+'.',buyer.id);
    }else{
      this.refund(lot);
      const returned=seller&&Economy.transferItem(lot.cargo,seller.goods,lot.itemId,1,lot.id,lot.seller);
      lot.status=returned?'returned':'unclaimed';
      this.say(this.auctioneer,'Lô không bán.');
      this.event(lot,'returned',(returned?'Đã hoàn trả ':'Chờ chủ cũ nhận ')+item+'.',lot.seller);
    }
    lot.closedAt=this.now;
    return true;
  }
  event(lot,stage,text,actorId){
    const entry={at:this.now,lotId:lot.id,stage,text,actorId};
    this.state.history.push(entry);
    if(this.state.history.length>160)this.state.history.shift();
    commerceEvent(this.world,lot.id+':'+stage+':'+lot.bids.length,'weekly-auction-'+stage,text,actorId,lot.id,{item:lot.itemId});
    this.scene.requestBackgroundSave();
  }
  valuation(npc,lot){
    const item=commerceProduct(lot.itemId), heart=npc.aiProfile?.axes??{};
    let utility=0;
    if(item.book&&npc.realmIndex>=item.book.minimum&&martialMastery(npc,item.book.id)<0&&!Economy.count(npc.inventory,lot.itemId)){
      utility=item.book.roots.includes(npc.spiritualRoot)?1.34:.88;
    }else if(item.arm&&npc.realmIndex>=item.arm.minRealm&&!Economy.count(npc.inventory,lot.itemId)){
      const previous=MARTIAL_WEAPONS[npc.equippedWeapon]?.grade??0;
      utility=item.arm.course===npc.martial?.active?1.6:previous<item.grade?1.05:.62;
    }else if(!item.book&&!item.arm)utility=item.kind==='herb'&&['dan_su','duoc_su'].includes(npc.profession)||
      item.kind==='material'&&npc.vocation==='smith'?1.35:npc.profession==='tu_si'?1:.57;
    const mood=1+((heart.ambition??50)-(heart.caution??50))*.005;
    const cash=npc.spiritStones+(lot.escrow?.buyer===npc.id?lot.escrow.price:0);
    return Math.max(0,Math.min(cash-12,Math.floor(lot.ask*utility*mood)));
  }
  reserveSeats(session){
    const catalog=this.state.lots.filter(lot=>session.lots.includes(lot.id));
    const staff=this.world.npcs.filter(n=>idleNpc(n)&&!n.underground&&!n.wallLevel&&
      n.id!==this.scene.possessedNpcId&&!this.scene.expeditions?.has(n)&&['merchant','quest_clerk'].includes(n.populationRole))
      .sort((a,b)=>far(a,this.point)-far(b,this.point)||a.id.localeCompare(b.id))[0];
    session.auctioneer=staff?.id??null;
    const candidates=this.world.npcs.filter(n=>n!==staff&&this.qualifiedForSeat(n)&&!n.underground&&!n.wallLevel&&
      (n.id===this.scene.possessedNpcId||this.canTravel(n))&&
      this.scene.canReachPoint(n,this.point)).map(n=>{
        const value=Math.max(0,...catalog.map(lot=>this.valuation(n,lot)-lot.ask));
        return {n,value,rank:value-far(n,this.point)*.01};
      }).filter(({n,value})=>value>0||n.id===this.scene.possessedNpcId).sort((a,b)=>b.rank-a.rank||a.n.id.localeCompare(b.n.id));
    for(const {n} of candidates.slice(0,capacity)){
      const used=Object.values(session.seats);
      const vip=n.spiritStones>=220&&(n.realmIndex>=2||Boolean(n.authorityRole));
      const free=(floor)=>seats.findIndex((seat,index)=>seat.floor===floor&&!used.includes(index));
      const privileged=vip?free(1):-1;
      const index=privileged>=0?privileged:free(0);
      if(index>=0)session.seats[n.id]=index;
    }
  }
  reserveManual(npc){
    const s=this.session;
    if(!s||s.phase!=='reception'||!this.qualifiedForSeat(npc))return false;
    if(s.seats[npc.id]!==undefined)return true;
    const used=Object.values(s.seats);
    const index=seats.findIndex((seat,i)=>seat.floor===0&&!used.includes(i));
    if(index<0)return false;
    s.seats[npc.id]=index;
    return true;
  }
  directives(npc){return this.people.get(npc.id);}
  canTravel(npc){
    return idleNpc(npc)&&!npc.wallLevel&&!npc.emigration&&npc.populationRole!=='city_guard'&&
      !this.scene.expeditions?.has(npc)&&!this.scene.recovery?.drives(npc)&&!npc.decisionSlot?.startsWith('civic:');
  }
  routeToDesk(npc){
    this.people.set(npc.id,this.point);
    if(npc.marketVisit)this.scene.merchants?.cancel(npc,'Tới phiên đấu giá');
    if(npc.decisionSlot!=='weekly-auction'){
      this.scene.resetNpcRoute(npc);
      this.scene.workstations?.release(npc.id);
      this.scene.cultivation?.interrupt(npc);
    }
    const scheduled=this.scene.scheduler.byId.get(npc.id);
    if(scheduled)scheduled.waitingForSlot=false;
    Object.assign(npc,{decisionSlot:'weekly-auction',goalAction:'travel',actionTarget:this.point,shortGoal:'Đi tới Vạn Bảo Các'});
  }
  travel(npc,job='auction'){
    if(npc.underground||npc.id===this.scene.possessedNpcId||!this.canTravel(npc))return;
    if(far(npc,this.point)<=34&&this.nearDesk(npc)){
      this.scene.underground.enter([npc],this.site,{type:job,id:AUCTION_SITE});
      return;
    }
    this.routeToDesk(npc);
  }
  clearRoute(npc){
    if(!npc)return;
    this.people.delete(npc.id);
    if(npc.decisionSlot==='weekly-auction'&&!npc.underground){
      npc.goalAction='idle';npc.decisionSlot='';npc.actionTarget={x:npc.home?.x??npc.x,y:npc.home?.y??npc.y};this.scene.resetNpcRoute(npc);
    }
  }
  inside(npc){
    const s=this.session,d=npc.underground,floor=this.site.map.floors[d.floor],staff=s?.auctioneer===npc.id;
    if(d.job?.type==='auction-staff'&&weekDay(this.world.clock.day)<=6&&this.world.clock.minute<1030&&this.openForVisitors()){
      const destination=this.vaultLots.length?{x:25,y:20,floor:2}:{x:8,y:29,floor:0};
      if(this.walkToFloor(npc,destination)){npc.action='work';npc.shortGoal=destination.floor?'Kiểm kê kho ký gửi':'Trực quầy Vạn Bảo Các';}
      return;
    }
    const seat=s&&seats[s.seats[npc.id]];
    if(!this.openForVisitors()||!s||s.phase==='ended'||!staff&&!seat||!staff&&!s.checked?.includes(npc.id)&&s.phase!=='reception'){
      delete d.auctionSeated;
      if(d.floor){this.walkToFloor(npc,{...this.site.map.floors[0].entry,floor:0});return;}
      if(caveDistance(d,floor.entry)>1)this.scene.underground.move(npc,floor.entry,floor);
      else this.scene.underground.exit(npc,this.site);
      return;
    }
    const destination=staff?{...this.site.map.floors[0].props.find(prop=>prop.kind==='podium'),floor:0}:seat;
    if(!this.walkToFloor(npc,destination)){
      delete d.auctionSeated;
    }else{
      d.auctionSeated=!staff;
      d.facing=staff?'down':'up';
      npc.action=staff?'trade':'rest';
      npc.shortGoal=staff?'Điều hành đấu giá':'Đang ngồi dự đấu giá';
    }
  }
  walkToFloor(npc,destination){
    const d=npc.underground,floor=this.site.map.floors[d.floor],below=destination.floor>d.floor;
    if(d.floor!==destination.floor){
      const portal=below?floor.down:floor.entry;
      if(caveDistance(d,portal)>1)this.scene.underground.move(npc,portal,floor);
      else this.scene.underground.portal(npc,this.site,below?1:-1);
      return false;
    }
    if(!caveDistance(d,destination))return true;
    this.scene.underground.move(npc,destination,floor);
    return !caveDistance(d,destination);
  }
  interactInterior(npc,floor){
    const ug=this.scene.underground,d=npc.underground;
    if(floor.down&&caveDistance(d,floor.down)<=1){
      if(this.permittedFloor(npc,d.floor+1))return ug.portal(npc,this.site,1);
      this.scene.worldPopulationToast('Tầng này yêu cầu quyền vào của Vạn Bảo Các.');
      return true;
    }
    if(floor.props.some(p=>['seat','desk','podium'].includes(p.kind)&&caveDistance(d,p)<=2))this.panel.open();
    return true;
  }
  interactSurface(npc){
    if(!this.nearDesk(npc))return false;
    const job=this.reserveManual(npc)?'auction':this.publicHours?'auction-visitor':null;
    if(job&&far(npc,this.point)<=34&&this.scene.underground.enter([npc],this.site,{type:job,id:AUCTION_SITE})){
      this.scene.underground.view.show(AUCTION_SITE,0,true);
      return true;
    }
    if(this.openForVisitors())this.panel.open();
    else this.scene.worldPopulationToast('Vạn Bảo Các đang đóng vì công trình bị phá hủy.');
    return true;
  }
  observe(level=0){
    if(this.site&&!this.scene.possessedNpcId){this.scene.underground.view.show(AUCTION_SITE,level);this.scene.underground.view.fit();}
  }
  moveToEntrance(){
    if(this.point)this.scene.navigateCameraTo(this.scene.auctionLot.center.x,this.scene.auctionLot.center.y-40,'auction',false,1);
  }
  startLot(session){
    const lot=this.state.lots.find(row=>row.id===session.lots[session.index]&&row.status==='queued');
    if(!lot){session.phase='ended';session.endedAt=this.now;return;}
    Object.assign(lot,{status:'open',openedAt:this.now,endsAt:this.now+lotMinutes});
    this.say(this.auctioneer,commerceProduct(lot.itemId).name+' · '+lot.ask+' linh thạch');
  }
  tick(){
    const now=this.now;
    if(!this.site||now===this.lastMinute)return;
    this.lastMinute=now;
    const {day,minute}=this.world.clock,weekday=weekDay(day);
    let session=this.session;
    for(const expired of this.state.lots.filter(lot=>lot.week<this.week&&['queued','open'].includes(lot.status)))this.settle(expired);
    for(const previous of this.state.sessions)if(previous.week<this.week&&previous.phase!=='ended'){
      previous.phase='ended';previous.endedAt=now;
    }
    if(!session&&weekday>=6){
      const lots=this.state.lots.filter(lot=>lot.week===this.week&&lot.status==='queued');
      session={week:this.week,phase:'announced',lots:lots.map(lot=>lot.id),seats:{},checked:[],index:0};
      this.state.sessions.push(session);
      if(this.state.sessions.length>20)this.state.sessions.shift();
      this.scene.requestBackgroundSave();
    }
    if(weekday<=6)this.dailyOperations(minute);
    if(weekday<=5&&this.openForVisitors())this.automaticConsignment(minute%45===0);
    else if(this.consignmentRoutes.size){
      for(const id of this.consignmentRoutes.keys())this.clearRoute(this.resolve(id));
      this.consignmentRoutes.clear();
    }
    if(!session||weekday!==7){this.panel.update();return;}
    if(session.phase==='announced'&&minute>=480){
      session.phase='reception';
      this.reserveSeats(session);
      this.scene.requestBackgroundSave();
    }
    const travelling=new Set(['reception','inspection','bidding']);
    if(travelling.has(session.phase)){
      for(const id of [...Object.keys(session.seats),session.auctioneer]){
        const npc=this.resolve(id);
        if(npc&&(id===session.auctioneer||session.phase==='reception'||session.checked.includes(id)))this.travel(npc);
      }
    }
    if(session.phase==='reception'&&minute>=540){
      session.phase='inspection';
      session.checked=Object.keys(session.seats).filter(id=>{
        const npc=this.resolve(id);return this.qualifiedForSeat(npc)&&npc.underground?.siteId===AUCTION_SITE;
      });
      this.scene.requestBackgroundSave();
    }
    if(session.phase==='inspection'&&minute>=600){
      session.phase='bidding';this.startLot(session);this.scene.requestBackgroundSave();
    }
    const lot=this.activeLot;
    if(lot&&now>=lot.endsAt){
      this.settle(lot);session.index++;this.startLot(session);this.scene.requestBackgroundSave();
    }else if(lot){
      const candidates=session.checked.map(id=>this.resolve(id)).filter(n=>n&&n.id!==this.scene.possessedNpcId&&
        this.seated(n)&&this.valuation(n,lot)>=this.nextAsk(lot));
      const candidate=candidates[(now+session.index)%Math.max(1,candidates.length)];
      if(candidate)this.bid(candidate,lot);
    }
    for(const [id] of this.people){
      const npc=this.resolve(id);
      if(!travelling.has(session.phase)||!npc?.alive||npc.underground||session.phase!=='reception'&&id!==session.auctioneer&&!session.checked.includes(id)){
        this.people.delete(id);this.clearRoute(npc);
      }
    }
    this.panel.update();
  }
  dailyOperations(minute){
    if(minute>=480&&minute<1000&&this.openForVisitors()){
      let staff=this.resolve(this.state.steward);
      if(!staff?.underground&&!this.canTravel(staff)){
        staff=this.world.npcs.filter(n=>['merchant','quest_clerk'].includes(n.populationRole)&&!n.underground&&
          n.id!==this.scene.possessedNpcId&&this.canTravel(n)&&this.scene.canReachPoint(n,this.point))
          .sort((a,b)=>far(a,this.point)-far(b,this.point))[0];
        this.state.steward=staff?.id;
      }
      if(staff)this.travel(staff,'auction-staff');
    }else if(this.state.steward)this.clearRoute(this.resolve(this.state.steward));
  }
  automaticConsignment(search){
    for(const [id,plan] of this.consignmentRoutes){
      const npc=this.resolve(id);
      if(!idleNpc(npc)||npc.underground||npc.wallLevel||this.now>=plan.until||npc.id===this.scene.possessedNpcId||
        !this.source(plan.source)?.goods.some(item=>item.itemId===plan.item&&item.count>0)){
        this.consignmentRoutes.delete(id);this.clearRoute(npc);continue;
      }
      if(this.nearDesk(npc)){
        this.consign(npc,plan.item,null,plan.source);
        this.consignmentRoutes.delete(id);this.clearRoute(npc);
      }else this.routeToDesk(npc);
    }
    if(!search||this.consignmentRoutes.size>=2||this.state.lots.filter(lot=>lot.week===this.week&&lot.status==='queued').length>=8)return;
    for(const npc of this.world.npcs){
      if(!idleNpc(npc)||npc.underground||npc.wallLevel||npc.id===this.scene.possessedNpcId||this.consignmentRoutes.has(npc.id)||
        this.scene.expeditions?.has(npc)||this.scene.civic?.restricted(npc)||far(npc,this.point)>2600)continue;
      const sourceIds=[npc.id,...this.world.shops.filter(shop=>shop.ownerId===npc.id).map(shop=>shop.id),
        ...(npc.authorityRole==='sect_leader'?this.world.factions.filter(org=>org.leaderId===npc.id).map(org=>org.id):[])];
      for(const source of sourceIds){
        const stock=this.source(source)?.goods.find(row=>this.eligibleItem(row.itemId)&&row.itemId!==npc.equippedWeapon&&
          (source!==npc.id?row.count>1:npc.spiritStones<200&&(row.count>1||
            (MARTIAL_WEAPONS[row.itemId]?.course??commerceProduct(row.itemId)?.book?.id)!==npc.martial?.active&&
            !this.world.treasureProvenance?.some(p=>p.itemId===row.itemId&&p.ownerId===npc.id))));
        if(!stock||!this.scene.canReachPoint(npc,this.point))continue;
        if(this.nearDesk(npc))this.consign(npc,stock.itemId,null,source);
        else this.consignmentRoutes.set(npc.id,{source,item:stock.itemId,until:this.now+150});
        return;
      }
    }
  }
}
