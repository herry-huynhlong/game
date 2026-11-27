import { EconomySystem } from '../dao/EconomySystem.ts';
import { advancesQiMinor, cultivationStats } from '../systems/CultivationSystem.ts';
import { cultivationRequired } from '../systems/RealmConfig.ts';
import { ITEM_CATALOG } from '../dao/ItemCatalog.ts';
import { WEST_FAUNA_LOOT } from '../dao/MonsterRegistry.ts';
import { ALL_TREASURE_IDS, treasureDefinition } from '../dao/WestTreasureCatalog.ts';
import { itemPrices } from '../dao/SettlementSystem.ts';
import { equipBestWeapon } from '../dao/GiftItemSystem.ts';
import { livelihoodNeed } from '../dao/AutonomousNPCSystem.ts';
import {martialStockOpen} from './MartialEconomy.js';

const RANGE=64;
const FACILITIES={'sect-dining-hall':'sect-food','sect-treasure-pavilion':'sect-market','city-food':'tavern-entrance','city-apothecary':'apothecary-entrance','city-forge':'forge-entrance','city-inn':'inn-entrance'};
const VENUE_BUILDINGS={'city-food':'tavern-pine-shadow','city-inn':'inn-cloud-arrival','sect-dining-hall':'sect-campus-food','sect-treasure-pavilion':'sect-campus-market'};
const shopAction=id=>id==='city-food'||id==='city-apothecary'||id==='city-forge'?'work':'trade';
const TROPHIES=['wolf_fang','wolf_pelt','demon_core','boar_tusk','crimson_plate','toad_sac','jade_venom','elite_beast_core',...WEST_FAUNA_LOOT];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(x,y)=>({x,y});
const rings=[24,40,54,74,96,120];
const offsets=[[1,0],[-1,0],[0,1],[0,-1],[.71,.71],[-.71,.71],[.71,-.71],[-.71,-.71]];
const urgent=n=>n.goalAction==='fight'||n.goalAction==='flee'||n.skyStep||n.tribulation||n.manualMeditation||n.faunaHuntTargetId||n.lawResponse?.status==='responding'||n.decisionSlot?.startsWith('mandate:')||n.decisionSlot==='west:treasure'||n.convalescence;

export class WorldMerchants {
  constructor(scene){
    this.scene=scene;this.world=scene.populationWorld;this.slots=new Map();this.shops=new Map();this.byOwner=new Map();
    for(const shop of this.world.shops){
      const owner=this.world.npcs.find(n=>n.id===shop.ownerId);
      if(!owner)continue;
      const marker=id=>scene.markers.find(m=>m.id===id);
      const anchor=marker(FACILITIES[shop.id]??owner.stallId)??marker(shop.areaId);
      if(!anchor)continue;
      const terrain=p=>scene.footprintTerrainOpen(p.x,p.y,10,6)&&scene.canReachPoint(anchor,p);
      const position=[point(anchor.x-26,anchor.y),point(anchor.x+26,anchor.y),point(anchor.x,anchor.y-28),anchor].find(terrain);
      if(!position)continue;
      const spots=[];
      for(const radius of rings)for(const [dx,dy] of offsets){
        const p=point(position.x+dx*radius,position.y+dy*radius);
        if(!terrain(p)||spots.some(q=>distance(p,q)<23))continue;
        const counter=radius<=54&&this.line(position,p);
        spots.push({...p,counter});
      }
      const counter=spots.filter(p=>p.counter).slice(0,3);
      if(!counter.length)continue;
      const venue={shop,owner,position,counter,queue:spots.filter(p=>distance(p,position)>64&&counter.every(q=>distance(p,q)>=23)).slice(0,8)};
      if(shop.id==='city-apothecary'){
        shop.sellPrices.healing_pill??=16;
        shop.buyPrices.healing_pill??=10;
      }
      if(shop.id==='city-apothecary'||shop.id==='sect-treasure-pavilion')for(const id of ALL_TREASURE_IDS){
        shop.buyPrices[id]??=itemPrices[id].buy;shop.sellPrices[id]??=itemPrices[id].sell;
      }
      this.shops.set(shop.id,venue);this.byOwner.set(owner.id,venue);
    }
  }
  now(){return this.world.clock.day*1440+this.world.clock.minute;}
  line(a,b){
    const steps=Math.max(1,Math.ceil(distance(a,b)/3));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      if(!this.scene.footprintTerrainOpen(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,1,1))return false;
    }
    return true;
  }
  onDuty(venue){
    const {owner,shop}=venue;
    return (this.scene.buildingOpen?.(VENUE_BUILDINGS[shop.id])??true)&&EconomySystem.isOpen(shop,this.world.clock.minute)&&(venue.retryAt??0)<=this.scene.scheduler.time&&
      owner.alive&&!owner.ascended&&!owner.flight&&!owner.marketVisit&&
      owner.id!==this.scene.possessedNpcId&&owner.safety>=35&&!urgent(owner)&&!livelihoodNeed(owner,this.world)&&
      owner.decisionSlot==='shop-shift:'+shop.id&&owner.goalAction===shopAction(shop.id);
  }
  dutyFor(npc){
    const venue=this.byOwner.get(npc.id);
    if(!venue)return;
    const {shop,position}=venue;
    return {id:shop.id,name:shop.name,position,open:EconomySystem.isOpen(shop,this.world.clock.minute),
      action:shopAction(shop.id),
      reachable:(venue.retryAt??0)<=this.scene.scheduler.time};
  }
  replanStation(npc){
    const venue=this.byOwner.get(npc.id);
    if(venue)venue.retryAt=this.scene.scheduler.time+12000;
    return Boolean(venue);
  }
  serving(venue){return venue&&this.onDuty(venue)&&venue.owner.action===venue.owner.goalAction&&distance(venue.owner,venue.position)<=12.01;}
  canTrade(npc,venue){
    const banned=this.scene.civic?.restricted(npc)&&!['city-food','city-apothecary'].includes(venue?.shop.id);
    return Boolean(npc?.alive&&!banned&&!npc.underground&&!npc.ascended&&!npc.flight&&!npc.wallLevel&&this.serving(venue)&&
      venue.owner.id!==npc.id&&distance(venue.owner,npc)<=RANGE&&this.line(npc,venue.owner));
  }
  nearest(npc,preferredId,facing){
    const vector={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[facing]??[0,0];
    const score=place=>{
      const owner=place.owner,length=distance(npc,owner);
      const towards=length>0?((owner.x-npc.x)*vector[0]+(owner.y-npc.y)*vector[1])/length:0;
      return length-(owner.id===preferredId?18:0)-(towards>.58?9:0);
    };
    return [...this.shops.values()].filter(v=>this.canTrade(npc,v)).sort((a,b)=>score(a)-score(b))[0]??null;
  }
  station(npc){
    const venue=this.byOwner.get(npc.id);
    return venue&&npc.decisionSlot==='shop-shift:'+venue.shop.id&&
      npc.goalAction===shopAction(venue.shop.id)?venue.position:null;
  }
  quote(npc,venue,side,itemId,count){
    if(!this.canTrade(npc,venue))return {ok:false,message:'Cần đứng gần thương nhân đang mở cửa, cùng phía với lối đi.'};
    if(side==='sell'&&!martialStockOpen(venue.shop,itemId,count))return {ok:false,message:'Quầy không nhận mặt hàng này hoặc đã đầy.'};
    return EconomySystem.quote(this.world,npc,venue.shop.id,itemId,side,count);
  }
  execute(npc,venue,side,itemId,count,save=false){
    const q=this.quote(npc,venue,side,itemId,count);
    if(!q.ok)return q;
    const world=this.world,shop=venue.shop,city=world.factions.find(f=>f.id==='qingyun-city');
    const before=save?{
      stock:structuredClone(shop.stock),cash:shop.cash,inventory:structuredClone(npc.inventory),
      stones:npc.spiritStones,wealth:city?.wealth,records:[...world.economy.transactions],events:[...world.events],
    }:null;
    const result=side==='buy'?EconomySystem.buyFromShop(world,npc,shop.id,itemId,count):
      EconomySystem.sellToShop(world,npc,shop.id,itemId,count);
    if(!result.ok)return result;
    this.log(npc,venue,side,itemId,count,result.record);
    if(save&&!this.scene.persistPopulation()){
      shop.stock=before.stock;shop.cash=before.cash;npc.inventory=before.inventory;npc.spiritStones=before.stones;
      if(city)city.wealth=before.wealth;
      world.economy.transactions=before.records;world.events=before.events;
      return {ok:false,message:'Bản lưu đã thay đổi. Giao dịch đã được hoàn tác.'};
    }
    if(!save)this.scene.requestBackgroundSave();
    return result;
  }
  log(npc,venue,side,id,count,record){
    if(this.world.events.slice(-25).some(e=>e.type==='market-trade'&&e.actorId===npc.id&&e.targetId===venue.owner.id&&
      e.data?.itemId===id&&e.data?.side===side&&e.day===record.day&&record.minute-e.minute<6))return;
    this.world.events.push({id:'market:'+record.id,type:'market-trade',actorId:npc.id,targetId:venue.owner.id,
      day:record.day,minute:record.minute,description:`${npc.name} ${side==='buy'?'mua':'bán'} ${ITEM_CATALOG[id].name} ×${count} tại ${venue.shop.name}.`,
      status:'completed',data:{itemId:id,side,transactionId:record.id}});
    if(this.world.events.length>400)this.world.events.splice(0,this.world.events.length-400);
  }
  propose(n){
    if(this.scene.weeklyAuction?.directives(n)||this.scene.expeditions?.has(n)||this.byOwner.has(n.id)||urgent(n)||n.decisionSlot?.startsWith('sect-campus:')||
      n.decisionSlot?.startsWith('society:')||n.marketRetryAt>this.now())return null;
    const count=id=>EconomySystem.count(n.inventory,id);
    const need=livelihoodNeed(n,this.world);
    if(need==='eat'||n.goalAction==='eat'){
      return count('ration')||count('deer_meat')?null:{side:'buy',itemId:'ration',count:1,preferred:n.faction==='Thanh Vân Tông'?'sect-dining-hall':'city-food'};
    }
    if(n.hp<cultivationStats(n).hpMax*.55){
      if(EconomySystem.remove(n.inventory,'healing_pill',1)){
        n.hp=Math.min(cultivationStats(n).hpMax,n.hp+Math.ceil(cultivationStats(n).hpMax*.35));
        this.scene.requestBackgroundSave();
      }else{
        const pharmacy=this.shops.get('city-apothecary');
        const price=pharmacy?.shop.sellPrices.healing_pill;
        if(price&&n.spiritStones>=price&&this.onDuty(pharmacy)&&EconomySystem.count(pharmacy.shop.stock,'healing_pill'))
          return {side:'buy',itemId:'healing_pill',count:1,preferred:'city-apothecary'};
      }
    }
    if(need==='rest'||n.goalAction==='rest')return null;
    const martial=this.scene.martialEconomy?.intent(n);
    if(martial)return martial;
    const sell=(items,reserve=0)=>items.map(id=>[id,EconomySystem.sellable(this.world,n,id)-reserve]).find(([,amount])=>amount>0);
    const surplus=n.x>=0?sell(ALL_TREASURE_IDS,1):null;
    if(surplus)return {side:'sell',itemId:surplus[0],count:surplus[1],preferred:'city-apothecary',onlyPreferred:true};
    const sale=n.populationRole==='hunter'?sell(TROPHIES):
      n.populationRole==='herb_gatherer'?sell(['spirit_herb'],1):
      n.profession==='nong_dan'?sell(['ration'],2):n.goalAction==='trade'?sell(['wood','iron_sword','qi_pill','spirit_herb']):null;
    if(sale)return {side:'sell',itemId:sale[0],count:sale[1],preferred:n.populationRole==='herb_gatherer'?'city-apothecary':'city-market'};
    if(n.populationRole==='hunter'&&!n.equippedWeapon&&!count('iron_sword')&&!count('iron_dao'))
      return {side:'buy',itemId:'iron_sword',count:1,preferred:'city-forge'};
    if(n.profession==='tu_si'&&!advancesQiMinor(n)&&!count('qi_pill')&&(n.goalAction==='shop'||n.xp>=cultivationRequired(n.realmIndex,n.realmLevel)))
      return {side:'buy',itemId:'qi_pill',count:1,preferred:'city-apothecary'};
    return null;
  }
  start(n,intent){
    if(!intent||n.minor||n.emigration||n.marketVisit||n.marketRetryAt>this.now()||urgent(n))return false;
    const {side,itemId,count,preferred,onlyPreferred=false}=intent;
    const meal=side==='buy'&&itemId==='ration'&&n.goalAction==='eat';
    const need=livelihoodNeed(n,this.world);
    if(!meal&&(need==='eat'||need==='rest'&&itemId!=='healing_pill'))return false;
    const options=[];
    for(const v of this.shops.values()){
      if(v.owner===n||onlyPreferred&&v.shop.id!==preferred||!this.onDuty(v)||!this.scene.canReachPoint(n,v.position))continue;
      if(side==='sell'&&!martialStockOpen(v.shop,itemId,count))continue;
      const price=(side==='buy'?v.shop.sellPrices:v.shop.buyPrices)[itemId];
      if(!price)continue;
      const amount=Math.min(count,side==='buy'?Math.min(EconomySystem.count(v.shop.stock,itemId),Math.floor(n.spiritStones/price)):
        Math.min(EconomySystem.sellable(this.world,n,itemId),Math.floor(v.shop.cash/price)));
      if(amount>0)options.push({v,amount,rank:(v.shop.id===preferred?-600:0)+distance(n,v.position)+(side==='buy'?price:-price)*6});
    }
    const best=options.sort((a,b)=>a.rank-b.rank)[0];
    if(!best){n.marketRetryAt=this.now()+14;return false;}
    const journey=distance(n,best.v.position);
    n.marketVisit={side,itemId,count:best.amount,shopId:best.v.shop.id,
      expiresAt:this.now()+112+(journey>950?Math.ceil(journey/18):0),longJourney:journey>950};
    this.assignVisitPlan(n,best.v,meal);
    return true;
  }
  assignVisitPlan(n,venue,meal){
    n.goalAction=meal?'eat':n.marketVisit.side==='buy'?'shop':'trade';
    n.action='travel';n.actionProgress=0;n.decisionSlot='market:'+venue.shop.id;
    n.actionTarget=venue.queue[0]??venue.counter[0];
    this.scene.resetNpcRoute(n);
    this.scene.scheduler.byId.get(n.id).waitingForSlot=false;
  }
  redirect(n,side,shopId,itemId,count){
    const venue=this.shops.get(shopId);
    if(venue?.owner===n&&this.serving(venue)){
      const shop=venue.shop;
      // A producer can move materials and finished goods between their own
      // inventory and the shop without passing coins through the city tax.
      const recipe=n.profession==='tho_re'?{materials:['iron_ore','wood'],product:'iron_sword'}:
        ['duoc_su','dan_su'].includes(n.profession)?{materials:['spirit_herb'],product:'qi_pill'}:null;
      if(recipe&&(side==='buy'?recipe.materials.includes(itemId):recipe.product===itemId)){
        const source=side==='buy'?shop.stock:n.inventory;
        const destination=side==='buy'?n.inventory:shop.stock;
        if((side==='buy'||EconomySystem.sellable(this.world,n,itemId)>=count)&&EconomySystem.transferItem(source,destination,itemId,count,
          side==='buy'?shop.id:n.id,side==='buy'?n.id:shop.id,side==='sell'?n:undefined)){
          this.scene.requestBackgroundSave();
          return {ok:true,internal:true,message:'Đã chuyển hàng trong cửa tiệm.'};
        }
      }
    }
    if(this.canTrade(n,venue))return this.execute(n,venue,side,itemId,count);
    this.start(n,{side,itemId,count,preferred:shopId});
    return {ok:false,message:'Cần tới quầy khi thương nhân trực cửa hàng.'};
  }
  cancel(n,reason){
    if(!n.marketVisit)return false;
    const meal=n.goalAction==='eat'&&n.marketVisit.itemId==='ration';
    delete n.marketVisit;this.slots.delete(n.id);
    n.marketRetryAt=this.now()+24;
    if(!urgent(n)&&n.decisionSlot?.startsWith('market:')){
      const hasFood=meal&&n.inventory.some(i=>i.count>0&&(i.itemId==='ration'||i.itemId==='deer_meat'));
      n.goalAction=meal?'eat':'rest';
      n.decisionSlot=hasFood?'need:eat':undefined;n.action=hasFood?'eat':'travel';n.shortGoal=reason;
      n.actionTarget=meal?point(n.x,n.y):point(n.home?.x??n.x,n.home?.y??n.y);n.actionProgress=0;
    }
    this.scene.resetNpcRoute(n);
    const entry=this.scene.scheduler.byId.get(n.id);
    if(entry){entry.waitingForSlot=false;entry.thinkDue=0;}
    return true;
  }
  reroute(n){
    const visit=n.marketVisit,slot=this.slots.get(n.id);
    if(!visit||!slot||(visit.repaths??0)>=2)return false;
    visit.repaths=(visit.repaths??0)+1;
    visit.avoidSlot={x:slot.point.x,y:slot.point.y};
    this.slots.delete(n.id);
    n.pathBlocked=false;
    return true;
  }
  claim(n,venue,counter){
    const current=this.slots.get(n.id);
    if(current?.venue===venue&&(current.counter||!counter))return current;
    const avoided=n.marketVisit.avoidSlot;
    const point=(counter?venue.counter:venue.queue).find(p=>(!avoided||distance(avoided,p)>8)&&
      !Array.from(this.slots.values()).some(q=>distance(q.point,p)<22)&&
      this.scene.groundPositionOpen(n,p.x,p.y)&&this.scene.canReachPoint(n,p));
    if(!point)return current;
    const claim={venue,point,counter};
    this.slots.set(n.id,claim);
    return claim;
  }
  tick(time){
    if(time<(this.next??0))return;
    this.next=time+450;
    this.refreshPrices();
    const npcs=this.world.npcs,possessed=this.scene.possessedNpcId;
    for(const [id,claim] of this.slots){
      const npc=npcs.find(n=>n.id===id);
      if(!npc?.alive||!npc.marketVisit||id===possessed||npc.marketVisit.shopId!==claim.venue.shop.id)this.slots.delete(id);
    }
    for(const venue of this.byOwner.values()){
      if(!this.serving(venue))continue;
      const {shop}=venue,day=this.world.clock.day;
      if((shop.id==='city-apothecary'||shop.id==='sect-treasure-pavilion')&&this.now()>=(shop.nextTreasureBrewAt??0)){
        const ingredient=ALL_TREASURE_IDS.find(id=>EconomySystem.count(shop.stock,id)&&
          shop.sellPrices[treasureDefinition(id).medicine]>0&&EconomySystem.count(shop.stock,treasureDefinition(id).medicine)<2);
        if(ingredient&&EconomySystem.remove(shop.stock,ingredient,1)){
          const def=treasureDefinition(ingredient);
          EconomySystem.add(shop.stock,def.medicine,Math.ceil(def.grade/2));
          shop.nextTreasureBrewAt=this.now()+100;
          this.scene.requestBackgroundSave();
        }
      }
      if(shop.id==='city-apothecary'&&this.serving(venue)&&shop.healingBrewDay!==day&&
        EconomySystem.count(shop.stock,'healing_pill')<4&&EconomySystem.remove(shop.stock,'spirit_herb',2)){
        EconomySystem.add(shop.stock,'healing_pill',1);shop.healingBrewDay=day;
        this.scene.requestBackgroundSave();
      }
      if(shop.id==='city-apothecary'&&this.serving(venue)&&this.now()>=(shop.nextQiBrewAt??0)&&
        EconomySystem.count(shop.stock,'qi_pill')<3&&EconomySystem.count(shop.stock,'spirit_herb')>=4){
        EconomySystem.remove(shop.stock,'spirit_herb',2);
        EconomySystem.add(shop.stock,'qi_pill',1);shop.nextQiBrewAt=this.now()+90;
        this.scene.requestBackgroundSave();
      }
    }
    for(const n of npcs){
      if(!n.alive||n.underground||n.decisionSlot?.startsWith('civic:')||n.ascended||n.id===possessed||n.flight)continue;
      if(!n.marketVisit&&time>=(this.nextDecision?.get(n.id)??0)){
        (this.nextDecision??=new Map()).set(n.id,time+2500+(n.id.charCodeAt(n.id.length-1)%11)*120);
        this.start(n,this.propose(n));
      }
      const visit=n.marketVisit;
      if(!visit)continue;
      const venue=this.shops.get(visit.shopId);
      const need=livelihoodNeed(n,this.world);
      if(need==='eat'&&visit.itemId!=='ration'||need==='rest'&&visit.itemId!=='healing_pill'){
        this.cancel(n,'Tạm hoãn giao dịch để nghỉ hoặc tìm thức ăn');continue;
      }
      const keepVisit=visit.longJourney&&venue&&(distance(n,venue.position)>162||
        EconomySystem.isOpen(venue.shop,this.world.clock.minute));
      if(!venue||this.now()>=visit.expiresAt||urgent(n)||!keepVisit&&!this.onDuty(venue)){
        this.cancel(n,'Chưa thể giao dịch · trở lại lịch sinh hoạt');continue;
      }
      if(!n.decisionSlot?.startsWith('market:'))this.assignVisitPlan(n,venue,visit.itemId==='ration'&&need==='eat');
      const entry=this.scene.scheduler.byId.get(n.id);
      entry.waitingForSlot=false;
      const near=distance(n,venue.position)<162;
      let claim=this.slots.get(n.id);
      if(near){
        if(this.serving(venue))claim=this.claim(n,venue,true)??claim;
        if(!claim)claim=this.claim(n,venue,false);
        if(!claim){this.cancel(n,'Quầy đang đầy · sẽ ghé lại sau');continue;}
      }
      const approach=venue.queue.length?venue.queue:venue.counter;
      const index=[...n.id].reduce((hash,letter)=>(hash*31+letter.charCodeAt(0))>>>0,0)%approach.length;
      const target=claim?.point??approach[index];
      if(distance(target,n.actionTarget)>4){
        n.actionTarget=target;
        this.scene.resetNpcRoute(n);
      }
      n.shortGoal=claim&&!claim.counter?'Đang chờ tới lượt tại '+venue.shop.name:'Đi giao dịch tại '+venue.shop.name;
      if(!claim?.counter||distance(n,claim.point)>10||!this.canTrade(n,venue))continue;
      const result=this.execute(n,venue,visit.side,visit.itemId,visit.count);
      if(result.ok&&visit.side==='buy'&&ITEM_CATALOG[visit.itemId]?.kind==='weapon')equipBestWeapon(n);
      this.cancel(n,result.ok?'Đã giao dịch · rời quầy':result.message);
    }
  }
  report(){
    return {shops:[...this.shops.values()].map(v=>({id:v.shop.id,owner:v.owner.id,position:v.position,
      open:this.serving(v),cash:v.shop.cash,stock:v.shop.stock,counter:v.counter,queue:v.queue})),
      visits:this.world.npcs.filter(n=>n.marketVisit).map(n=>({id:n.id,visit:n.marketVisit,slot:this.slots.get(n.id)?.point}))};
  }

  refreshPrices(){
    const hour=Math.floor(this.now()/60);
    if(this.priceHour===hour)return;
    this.priceHour=hour;
    const groups={
      'city-market':['wood','spirit_herb',...TROPHIES],
      'city-apothecary':['spirit_herb','qi_pill','healing_pill'],
      'city-food':['ration'],
      'city-forge':['iron_ore','wood','iron_sword'],
    };
    for(const [id,items] of Object.entries(groups)){
      const venue=this.shops.get(id),shop=venue?.shop;
      if(!shop)continue;
      let change;
      for(const item of items){
        const base=item==='healing_pill'?{buy:10,sell:16}:itemPrices[item];
        if(!base?.buy||!shop.buyPrices[item]||!shop.sellPrices[item])continue;
        const stock=EconomySystem.count(shop.stock,item);
        const multiple=stock<2?1.2:stock>=8?.82:1;
        // Use one rate for the city and enough spread to cover handling.
        shop.buyPrices[item]=Math.max(1,Math.round(base.buy*multiple));
        const price=Math.max(Math.ceil(base.buy*1.2)+1,Math.round(base.sell*multiple),shop.buyPrices[item]+1);
        if(price!==shop.sellPrices[item]&&!change&&['spirit_herb','healing_pill','ration','iron_ore'].includes(item))
          change={item,price,previous:shop.sellPrices[item]};
        shop.sellPrices[item]=price;
      }
      if(change){
        const {day,minute}=this.world.clock;
        this.world.events.push({id:'market-price:'+id+':'+hour,type:'market-price',day,minute,actorId:venue.owner.id,status:'completed',
          description:shop.name+' đổi giá '+ITEM_CATALOG[change.item].name+' từ '+change.previous+' thành '+change.price+' linh thạch.'});
        if(this.world.events.length>400)this.world.events.shift();
      }
    }
  }
}
