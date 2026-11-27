import {EconomySystem as Economy} from '../dao/EconomySystem.ts';
import {livelihoodNeed} from '../dao/AutonomousNPCSystem.ts';
import {ITEM_CATALOG} from '../dao/ItemCatalog.ts';
import {recordLivelihood} from './PopulationLife.js';
import {commerceProduct} from './CommerceCatalog.js';
import {martialStockOpen} from './MartialEconomy.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const recipes={
  alchemist:{station:'apothecary-entrance',shop:'city-apothecary',materials:[['spirit_herb',2]],output:'qi_pill',yield:2,duration:70},
  smith:{station:'forge-entrance',shop:'city-forge',materials:[['iron_ore',1],['boar_tusk',1]],output:'iron_dao',yield:2,duration:105},
};
const marketPlans={
  oasis:['east-camp','Thanh Nguyệt Ốc Đảo'], village:['south-outskirts','Ngoại thành Nam'],
  pavilion:['old-road-pavilion','Đình nghỉ Cổ Đạo'],
};
const courierCargo='ration', cargoSize=3;

export class PopulationLivelihoods {
  constructor(scene){
    this.scene=scene;
    this.world=scene.populationWorld;
    this.markers=new Map(scene.markers.map(p=>[p.id,p]));
    const source=this.world.shops.find(s=>s.id==='city-market');
    this.markets=new Map();
    for(const [id,[marker,title]] of Object.entries(marketPlans)){
      const point=this.markers.get(marker);
      if(!point||!source)continue;
      const shopId='regional:'+id;
      let shop=this.world.shops.find(s=>s.id===shopId);
      if(!shop){
        const funds=Math.min(48,Math.floor(source.cash/5));
        source.cash-=funds;
        shop={id:shopId,name:'Kho hàng · '+title,ownerId:shopId,areaId:marker,
          openHour:7,closeHour:20,cash:funds,stock:[],buyPrices:{ration:6},sellPrices:{ration:8}};
        this.world.shops.push(shop);
      }
      this.markets.set(id,{point,shop,title});
    }
    const forge=this.world.shops.find(s=>s.id==='city-forge');
    if(forge){
      forge.buyPrices.iron_dao??=16;
      forge.sellPrices.iron_dao??=24;
    }
  }

  get now(){return this.world.clock.day*1440+this.world.clock.minute;}
  directs(n){return n.decisionSlot?.startsWith('livelihood:');}

  available(n){
    return n.alive&&!n.ascended&&!n.minor&&!n.underground&&!n.flight&&!n.wallLevel&&!n.skyStep&&!n.tribulation&&
      !n.marketVisit&&!n.lawResponse&&!n.convalescence&&!n.faunaHuntTargetId&&!n.emigration&&
      n.id!==this.scene.possessedNpcId&&n.goalAction!=='fight'&&n.goalAction!=='flee'&&
      !/^(civic|society|sect-campus|mandate|duel):/.test(n.decisionSlot??'')&&
      !this.scene.expeditions?.has(n)&&!this.scene.westTreasures?.directs(n)&&!this.scene.westWilds?.directs(n);
  }

  move(n,point,slot,action,text){
    const key='livelihood:'+slot;
    if(n.decisionSlot!==key||distance(n.actionTarget??n,point)>3){
      n.decisionSlot=key;n.actionTarget={x:point.x,y:point.y};
      this.scene.resetNpcRoute(n);
    }
    n.goalAction=action;
    n.action=distance(n,point)<=30?action:'travel';
    n.shortGoal=text;
  }

  release(n){
    if(!this.directs(n))return;
    delete n.decisionSlot;
    n.goalAction=n.action='idle';
    this.scene.resetNpcRoute(n);
  }

  craft(n,recipe){
    const count=id=>Economy.count(n.inventory,id);
    const job=n.craftOrder;
    if(n.craftStock>0&&count(recipe.output)>0){
      if(this.scene.merchants.start(n,{side:'sell',itemId:recipe.output,count:Math.min(n.craftStock,count(recipe.output)),preferred:recipe.shop})){
        n.craftStock=0;
        return;
      }
      this.release(n);
      return;
    }
    if(!job){
      const missing=recipe.materials.find(([id,amount])=>count(id)<amount);
      if(missing){
        this.release(n);
        this.scene.merchants.start(n,{side:'buy',itemId:missing[0],count:missing[1]-count(missing[0]),preferred:recipe.shop});
        return;
      }
    }
    const point=n.workPosition;
    if(!point||!this.scene.canReachPoint(n,point))return;
    this.move(n,point,'craft','work',job?'Đang chế tác '+ITEM_CATALOG[recipe.output].name:'Đến xưởng chế tác');
    if(n.action!=='work')return;
    if(!job){
      for(const [id,count] of recipe.materials)Economy.remove(n.inventory,id,count);
      n.craftOrder={progress:0,at:this.now};
    }else{
      // Only time actually spent at the workshop advances production.
      job.progress+=Math.max(0,Math.min(7,this.now-job.at));
      job.at=this.now;
      if(job.progress<recipe.duration)return;
      Economy.add(n.inventory,recipe.output,recipe.yield);
      n.craftStock=(n.craftStock??0)+recipe.yield;
      delete n.craftOrder;
      recordLivelihood(this.world,n,'production',n.name+' chế tác '+ITEM_CATALOG[recipe.output].name+' ×'+recipe.yield+'.',
        {input:recipe.materials,output:recipe.output,count:recipe.yield});
    }
    this.scene.requestBackgroundSave();
  }

  route(n){
    const marketId=n.spawnRegionId==='market'?(n.aiProfile.seed%2?'oasis':'pavilion'):n.spawnRegionId;
    const market=this.markets.get(marketId);
    const source=this.scene.merchants.shops.get('city-market');
    if(!market||!source||!this.scene.canReachPoint(source.position,market.point))return;
    const stock=Economy.count(n.inventory,courierCargo);
    if(!n.cargoOrder&&!n.cargoPurchase&&!n.marketVisit&&this.now%45<7){
      const offer=n.inventory.find(row=>{
        const item=commerceProduct(row.itemId);
        return item?.grade===2&&(item.arm||item.book)&&Economy.sellable(this.world,n,row.itemId)>0;
      });
      const item=offer&&commerceProduct(offer.itemId);
      const destination=item?.arm?'sect-treasure-pavilion':'city-market';
      const shop=this.scene.merchants.shops.get(destination)?.shop;
      if(offer&&shop&&martialStockOpen(shop,offer.itemId)&&this.scene.merchants.start(n,{
        side:'sell',itemId:offer.itemId,count:1,preferred:destination,onlyPreferred:true,
      }))return;
    }
    if(n.cargoOrder){
      n.cargoOrder.count=Math.min(n.cargoOrder.count,stock);
      if(n.cargoOrder.count<=0){delete n.cargoOrder;this.release(n);return;}
      const {shop,point,title}=market;
      this.move(n,point,'cargo','trade','Chở lương thực đến '+title);
      if(n.action!=='trade'||!Economy.isOpen(shop,this.world.clock.minute))return;
      const count=Math.min(n.cargoOrder.count,Math.floor(shop.cash/shop.buyPrices[courierCargo]));
      if(count<=0){this.release(n);return;}
      if(!Economy.sellToShop(this.world,n,shop.id,courierCargo,count).ok)return;
      n.cargoOrder.count-=count;
      if(n.cargoOrder.count<=0)delete n.cargoOrder;
      recordLivelihood(this.world,n,'caravan',n.name+' giao lương thực ×'+count+' tại '+title+'.',{item:courierCargo,count,destination:shop.id});
      this.release(n);
      this.scene.requestBackgroundSave();
      return;
    }
    if(n.cargoPurchase){
      const loaded=Math.max(0,Math.min(cargoSize,stock-n.cargoPurchase.before));
      delete n.cargoPurchase;
      if(loaded){n.cargoOrder={count:loaded};return;}
    }
    if(market.shop.cash<market.shop.buyPrices.ration||Economy.count(market.shop.stock,courierCargo)>=12)return;
    this.release(n);
    if(this.scene.merchants.start(n,{side:'buy',itemId:courierCargo,count:cargoSize,preferred:'city-market',onlyPreferred:true})){
      n.cargoPurchase={before:stock};
      this.scene.requestBackgroundSave();
    }
  }

  buyMeal(n,market){
    if(n.hunger<55||Economy.count(n.inventory,'ration')||!Economy.count(market.shop.stock,'ration')||
      n.spiritStones<market.shop.sellPrices.ration||!Economy.isOpen(market.shop,this.world.clock.minute)||
      !this.scene.canReachPoint(n,market.point))return false;
    this.move(n,market.point,'regional-meal','eat','Tìm lương thực tại '+market.title);
    if(n.action==='eat'&&Economy.buyFromShop(this.world,n,market.shop.id,'ration',1).ok){
      if(Economy.remove(n.inventory,'ration',1))n.hunger=Math.max(0,n.hunger-45);
      this.release(n);
      this.scene.requestBackgroundSave();
    }
    return true;
  }

  tick(){
    const {minute}=this.world.clock;
    for(const [i,n] of this.world.npcs.entries()){
      if(!n.vocation||(this.now+i)%7!==0)continue;
      if(!this.available(n)){this.release(n);continue;}
      const market=this.markets.get(n.spawnRegionId);
      if(market&&this.buyMeal(n,market))continue;
      const recipe=recipes[n.vocation];
      const needs=livelihoodNeed(n,this.world);
      if(needs||minute<430||minute>=1210){this.release(n);continue;}
      if(recipe){this.craft(n,recipe);continue;}
      if(n.vocation==='caravan'){this.route(n);continue;}
      if(n.vocation==='miner'&&n.workPosition&&!this.scene.civic?.activeWorker(n.id)){
        this.move(n,n.workPosition,'mine-queue','idle','Chờ hợp đồng khai thác');
      }
    }
  }
}
