import { EconomySystem } from '../dao/EconomySystem.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { cultivationRequired } from '../systems/RealmConfig.ts';
import { ITEM_CATALOG } from '../dao/ItemCatalog.ts';

const RANGE=64;
const FACILITIES={'city-food':'tavern-entrance','city-apothecary':'apothecary-entrance','city-forge':'forge-entrance','city-inn':'inn-entrance'};
const TROPHIES=['wolf_fang','wolf_pelt','demon_core','boar_tusk','crimson_plate','toad_sac','jade_venom','elite_beast_core'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(x,y)=>({x,y});
const rings=[24,40,54,74,96,120];
const offsets=[[1,0],[-1,0],[0,1],[0,-1],[.71,.71],[-.71,.71],[.71,-.71],[-.71,-.71]];
const urgent=n=>n.goalAction==='fight'||n.goalAction==='flee'||n.faunaHuntTargetId||n.lawResponse?.status==='responding'||n.decisionSlot?.startsWith('mandate:');

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
    return EconomySystem.isOpen(shop,this.world.clock.minute)&&owner.alive&&!owner.ascended&&!owner.flight&&
      owner.id!==this.scene.possessedNpcId&&owner.hunger<76&&owner.fatigue<86&&owner.safety>=28&&!urgent(owner)&&
      (venue.retryAt??0)<=this.scene.scheduler.time;
  }
  replanStation(npc){
    const venue=this.byOwner.get(npc.id);
    if(venue)venue.retryAt=this.scene.scheduler.time+12000;
    return Boolean(venue);
  }
  serving(venue){return venue&&this.onDuty(venue)&&distance(venue.owner,venue.position)<25;}
  canTrade(npc,venue){
    return Boolean(npc?.alive&&!npc.ascended&&!npc.flight&&this.serving(venue)&&
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
    return venue&&this.onDuty(venue)?venue.position:null;
  }
  quote(npc,venue,side,itemId,count){
    if(!this.canTrade(npc,venue))return {ok:false,message:'Cần đứng gần thương nhân đang mở cửa, cùng phía với lối đi.'};
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
    if(this.byOwner.has(n.id)||urgent(n)||n.marketRetryAt>this.now())return null;
    const count=id=>EconomySystem.count(n.inventory,id);
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
    const sell=(items,reserve=0)=>items.map(id=>[id,EconomySystem.sellable(this.world,n,id)-reserve]).find(([,amount])=>amount>0);
    const sale=n.populationRole==='hunter'?sell(TROPHIES):
      n.populationRole==='herb_gatherer'?sell(['spirit_herb'],1):
      n.profession==='nong_dan'?sell(['ration'],2):n.goalAction==='trade'?sell(['wood','iron_sword','qi_pill','spirit_herb']):null;
    if(sale)return {side:'sell',itemId:sale[0],count:sale[1],preferred:n.populationRole==='herb_gatherer'?'city-apothecary':'city-market'};
    if(n.hunger>=58&&!count('ration')&&!count('deer_meat'))return {side:'buy',itemId:'ration',count:1,preferred:'city-food'};
    if(n.profession==='tu_si'&&!count('qi_pill')&&(n.goalAction==='shop'||n.xp>=cultivationRequired(n.realmIndex,n.realmLevel)))
      return {side:'buy',itemId:'qi_pill',count:1,preferred:'city-apothecary'};
    return null;
  }
  start(n,intent){
    if(!intent||n.marketVisit||n.marketRetryAt>this.now()||urgent(n))return false;
    const {side,itemId,count,preferred}=intent;
    const options=[];
    for(const v of this.shops.values()){
      if(v.owner===n||!this.onDuty(v)||!this.scene.canReachPoint(n,v.position))continue;
      const price=(side==='buy'?v.shop.sellPrices:v.shop.buyPrices)[itemId];
      if(!price)continue;
      const amount=Math.min(count,side==='buy'?Math.min(EconomySystem.count(v.shop.stock,itemId),Math.floor(n.spiritStones/price)):
        Math.min(EconomySystem.sellable(this.world,n,itemId),Math.floor(v.shop.cash/price)));
      if(amount>0)options.push({v,amount,rank:(v.shop.id===preferred?-600:0)+distance(n,v.position)+(side==='buy'?price:-price)*6});
    }
    const best=options.sort((a,b)=>a.rank-b.rank)[0];
    if(!best){n.marketRetryAt=this.now()+14;return false;}
    n.marketVisit={side,itemId,count:best.amount,shopId:best.v.shop.id,expiresAt:this.now()+112};
    this.scene.workstations.release(n.id);this.scene.npcRoutes.delete(n.id);
    return true;
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
        if((side==='buy'||EconomySystem.sellable(this.world,n,itemId)>=count)&&EconomySystem.remove(source,itemId,count)){
          EconomySystem.add(side==='buy'?n.inventory:shop.stock,itemId,count);
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
    delete n.marketVisit;this.slots.delete(n.id);this.scene.npcRoutes.delete(n.id);
    n.marketRetryAt=this.now()+24;n.pathBlocked=false;n.actionProgress=0;
    if(!urgent(n)){
      n.goalAction='rest';n.decisionSlot=undefined;n.action='travel';n.shortGoal=reason;
      n.actionTarget=point(n.home?.x??n.x,n.home?.y??n.y);
    }
    const entry=this.scene.scheduler.byId.get(n.id);
    if(entry){entry.waitingForSlot=false;entry.retryAt=0;entry.thinkDue=0;}
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
    const npcs=this.world.npcs,possessed=this.scene.possessedNpcId;
    for(const [id,claim] of this.slots){
      const npc=npcs.find(n=>n.id===id);
      if(!npc?.alive||!npc.marketVisit||id===possessed||npc.marketVisit.shopId!==claim.venue.shop.id)this.slots.delete(id);
    }
    for(const [id,venue] of this.byOwner){
      const n=venue.owner;
      if(!this.onDuty(venue)||n.marketVisit){
        if(venue.assigned&&!EconomySystem.isOpen(venue.shop,this.world.clock.minute)&&!urgent(n)&&
          n.alive&&id!==possessed&&n.actionTarget&&distance(n.actionTarget,venue.position)<1){
          n.goalAction='rest';n.actionTarget=n.home;n.decisionSlot=undefined;n.actionProgress=0;
          n.shortGoal='Đã đóng cửa '+venue.shop.name+' · về nghỉ';
          this.scene.npcRoutes.delete(id);
        }
        venue.assigned=false;
        continue;
      }
      const entry=this.scene.scheduler.byId.get(id);
      const makesStock=['city-forge','city-apothecary','city-food'].includes(venue.shop.id);
      if(n.goalAction!=='trade'||!n.decisionSlot?.endsWith(':deliver'))n.goalAction=makesStock?'work':'trade';
      n.actionTarget=venue.position;
      venue.assigned=true;
      n.shortGoal=this.serving(venue)?'Đang trực '+venue.shop.name:'Đến '+venue.shop.name+' mở cửa';
      if(entry?.waitingForSlot){entry.waitingForSlot=false;this.scene.workstations.release(id);}
      const {shop}=venue,day=this.world.clock.day;
      if(shop.id==='city-apothecary'&&this.serving(venue)&&shop.healingBrewDay!==day&&
        EconomySystem.count(shop.stock,'healing_pill')<4&&EconomySystem.remove(shop.stock,'spirit_herb',2)){
        EconomySystem.add(shop.stock,'healing_pill',1);shop.healingBrewDay=day;
        this.scene.requestBackgroundSave();
      }
    }
    for(const n of npcs){
      if(!n.alive||n.ascended||n.id===possessed||n.flight||this.byOwner.has(n.id))continue;
      if(!n.marketVisit&&time>=(this.nextDecision?.get(n.id)??0)){
        (this.nextDecision??=new Map()).set(n.id,time+2500+(n.id.charCodeAt(n.id.length-1)%11)*120);
        this.start(n,this.propose(n));
      }
      const visit=n.marketVisit;
      if(!visit)continue;
      const venue=this.shops.get(visit.shopId);
      if(!venue||this.now()>=visit.expiresAt||urgent(n)||!this.onDuty(venue)){
        this.cancel(n,'Chưa thể giao dịch · trở lại lịch sinh hoạt');continue;
      }
      const entry=this.scene.scheduler.byId.get(n.id);
      entry.waitingForSlot=false;
      const near=distance(n,venue.position)<162;
      let claim=this.slots.get(n.id);
      if(near){
        if(this.serving(venue))claim=this.claim(n,venue,true)??claim;
        if(!claim)claim=this.claim(n,venue,false);
        if(!claim){this.cancel(n,'Quầy đang đầy · sẽ ghé lại sau');continue;}
      }
      n.goalAction=visit.side==='buy'?'shop':'trade';
      const approach=venue.queue.length?venue.queue:venue.counter;
      const index=[...n.id].reduce((hash,letter)=>(hash*31+letter.charCodeAt(0))>>>0,0)%approach.length;
      n.actionTarget=claim?.point??approach[index];
      n.shortGoal=claim&&!claim.counter?'Đang chờ tới lượt tại '+venue.shop.name:'Đi giao dịch tại '+venue.shop.name;
      if(!claim?.counter||distance(n,claim.point)>10||!this.canTrade(n,venue))continue;
      const result=this.execute(n,venue,visit.side,visit.itemId,visit.count);
      this.cancel(n,result.ok?'Đã giao dịch · rời quầy':result.message);
    }
  }
  report(){
    return {shops:[...this.shops.values()].map(v=>({id:v.shop.id,owner:v.owner.id,position:v.position,
      open:this.serving(v),cash:v.shop.cash,stock:v.shop.stock,counter:v.counter,queue:v.queue})),
      visits:this.world.npcs.filter(n=>n.marketVisit).map(n=>({id:n.id,visit:n.marketVisit,slot:this.slots.get(n.id)?.point}))};
  }
}
