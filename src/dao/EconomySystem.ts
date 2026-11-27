import { createWorldUuid } from '../world/WorldId';
import { ITEM_CATALOG } from './ItemCatalog';
import {adoptInstances, ensureWeaponStack, equippedInstance, reserveWeaponInstances, weaponTemplate, type WeaponStack} from './WeaponInstances';
import type { DivineWorldSave, ShopSave, SimNPC, TradeItemId, TradeRecord } from './types';

export interface TradeResult { ok:boolean; message:string; record?:TradeRecord; internal?:boolean; }
type ShopQuote = {ok:false;message:string}|{ok:true;shop:ShopSave;price:number;total:number;tax:number;net:number};
export class EconomySystem {
  static readonly taxRate=.05;
  static count(items:Array<{itemId:string;count:number}>,id:string){return items.find(x=>x.itemId===id)?.count??0}
  static add(items:Array<{itemId:string;count:number}>,id:string,count:number){const found=items.find(x=>x.itemId===id);if(found)found.count+=count;else items.push({itemId:id,count})}
  static remove(items:WeaponStack[],id:string,count:number){const found=items.find(x=>x.itemId===id);if(!found||count<=0||found.count<count)return false;found.itemInstances?.splice(0,count);found.count-=count;if(found.count===0)items.splice(items.indexOf(found),1);return true}
  static transferItem(from:WeaponStack[],to:WeaponStack[],id:string,count:number,owner:string,recipient:string,holder?:SimNPC,allowEquipped=false){
    const source=from.find(item=>item.itemId===id);
    if(from===to||!source||!Number.isSafeInteger(count)||count<=0||source.count<count)return false;
    const equipped=holder?.equippedWeapon===id?equippedInstance(holder)?.id:undefined;
    const template=weaponTemplate(id);
    const instances=template?reserveWeaponInstances(source,count,owner,
      allowEquipped&&source.count===count?undefined:equipped,holder?.martialDurability?.[id]):[];
    if(template&&instances.length!==count)return false;
    const tracked=source.itemInstances?.slice(0,count)??[];
    if(!this.remove(from,id,count))return false;
    const destination=to.find(item=>item.itemId===id);
    if(instances.length&&destination)ensureWeaponStack(destination,recipient);
    this.add(to,id,count);
    if(tracked.length){
      const stack=to.find(item=>item.itemId===id)!;
      for(const item of tracked)if(item.ownerId!==recipient){
        item.ownerId=recipient;item.history=[...item.history,recipient].slice(-12);
      }
      (stack.itemInstances??=[]).push(...tracked);
    }
    if(instances.length){
      const stack=to.find(item=>item.itemId===id)!;
      const current=stack.instances??=[];
      current.push(...adoptInstances(instances,recipient));
    }
    if(holder&&equipped&&instances.some(instance=>instance.id===equipped)){
      holder.equippedWeapon=null;holder.equippedWeaponInstance=null;
    }
    return true;
  }
  static isOpen(shop:ShopSave,minute:number){return minute>=shop.openHour*60&&minute<shop.closeHour*60}
  static sellable(world:DivineWorldSave,npc:SimNPC,itemId:string){
    const item=ITEM_CATALOG[itemId];
    if(!item||item.kind==='special')return 0;
    if(world.treasureProvenance?.some(p=>p.itemId===itemId&&p.ownerId===npc.id))return 0;
    return Math.max(0,this.count(npc.inventory,itemId)-Number(npc.equippedWeapon===itemId));
  }
  static quote(world:DivineWorldSave,npc:SimNPC,shopId:string,itemId:TradeItemId,side:'buy'|'sell',count:number,minute=world.clock.minute):ShopQuote{
    const fail=(message:string):ShopQuote=>({ok:false,message});
    const shop=world.shops.find(s=>s.id===shopId),item=ITEM_CATALOG[itemId];
    if(!shop||!item||!npc.alive||npc.ascended||npc.id===shop.ownerId||!Number.isSafeInteger(count)||count<1)return fail('Giao dịch không hợp lệ.');
    if(!this.isOpen(shop,minute))return fail('Cửa hàng đang đóng cửa.');
    const price=(side==='buy'?shop.sellPrices:shop.buyPrices)[itemId]??0,total=price*count;
    if(price<=0||!Number.isSafeInteger(total))return fail('Cửa hàng không giao dịch vật phẩm này.');
    if(side==='buy'){
      if(this.count(shop.stock,itemId)<count)return fail('Cửa hàng không đủ hàng.');
      if(npc.spiritStones<total)return fail('Không đủ linh thạch.');
    }else{
      if(this.sellable(world,npc,itemId)<count)return fail('Không đủ vật phẩm có thể bán. Vật đang dùng và bảo vật có chủ không tính.');
      if(shop.cash<total)return fail('Cửa hàng không đủ vốn.');
    }
    const tax=world.factions.some(f=>f.id==='qingyun-city')?Math.floor(total*this.taxRate):0;
    return {ok:true,shop,price,total,tax,net:side==='buy'?-total:total-tax};
  }
  static buyFromShop(world:DivineWorldSave,buyer:SimNPC,shopId:string,itemId:TradeItemId,count:number,day=world.clock.day,minute=world.clock.minute):TradeResult{
    const q=this.quote(world,buyer,shopId,itemId,'buy',count,minute);
    if(!q.ok)return q;
    const {shop,total,tax,price}=q;
    if(!this.transferItem(shop.stock,buyer.inventory,itemId,count,shop.id,buyer.id))return {ok:false,message:'Hàng đã được mua hết.'};
    buyer.spiritStones-=total;shop.cash+=total-tax;this.collectTax(world,tax);
    return {ok:true,message:`Đã mua ${ITEM_CATALOG[itemId].name} ×${count} với ${total} linh thạch.`,record:this.record(world,{day,minute,buyerId:buyer.id,sellerId:shop.ownerId,shopId,itemId,count,unitPrice:price})};
  }
  static sellToShop(world:DivineWorldSave,seller:SimNPC,shopId:string,itemId:TradeItemId,count:number,day=world.clock.day,minute=world.clock.minute):TradeResult{
    const q=this.quote(world,seller,shopId,itemId,'sell',count,minute);
    if(!q.ok)return q;
    const {shop,total,tax,price,net}=q;
    if(!this.transferItem(seller.inventory,shop.stock,itemId,count,seller.id,shop.id,seller))return {ok:false,message:'Hàng không còn trong túi.'};
    shop.cash-=total;seller.spiritStones+=net;this.collectTax(world,tax);
    return {ok:true,message:`Đã bán ${ITEM_CATALOG[itemId].name} ×${count}, nhận ${net} linh thạch.`,record:this.record(world,{day,minute,buyerId:shop.ownerId,sellerId:seller.id,shopId,itemId,count,unitPrice:price})};
  }
  static directTrade(world:DivineWorldSave,buyer:SimNPC,seller:SimNPC,itemId:TradeItemId,count:number,unitPrice:number,day=world.clock.day,minute=world.clock.minute):TradeResult{
    if(buyer.id===seller.id||!buyer.alive||!seller.alive||!Number.isInteger(count)||count<1||!Number.isFinite(unitPrice)||unitPrice<=0)return {ok:false,message:'Giao dịch không hợp lệ.'};
    const total=count*unitPrice;if(buyer.spiritStones<total||this.count(seller.inventory,itemId)<count)return {ok:false,message:'Thiếu tiền hoặc hàng hóa.'};
    if(!this.transferItem(seller.inventory,buyer.inventory,itemId,count,seller.id,buyer.id,seller,true))return {ok:false,message:'Vật phẩm đang được trang bị.'};
    buyer.spiritStones-=total;seller.spiritStones+=total;
    return {ok:true,message:'Giao dịch hoàn tất.',record:this.record(world,{day,minute,buyerId:buyer.id,sellerId:seller.id,itemId,count,unitPrice})};
  }
  static depositFaction(world:DivineWorldSave,npc:SimNPC,factionId:string,itemId:TradeItemId,count:number){
    const faction=world.factions.find(f=>f.id===factionId);
    return Boolean(faction&&this.transferItem(npc.inventory,faction.treasury,itemId,count,npc.id,factionId,npc));
  }
  static withdrawFaction(world:DivineWorldSave,npc:SimNPC,factionId:string,itemId:TradeItemId,count:number){
    const faction=world.factions.find(f=>f.id===factionId);
    return Boolean(faction&&this.transferItem(faction.treasury,npc.inventory,itemId,count,factionId,npc.id));
  }
  static payWage(world:DivineWorldSave,npc:SimNPC,factionId:string,amount:number){const faction=world.factions.find(f=>f.id===factionId);if(!faction||!Number.isFinite(amount)||amount<=0||faction.wealth<amount)return false;faction.wealth-=amount;npc.spiritStones+=amount;return true}
  static payShopOwner(shop:ShopSave,npc:SimNPC,amount:number){if(shop.ownerId!==npc.id||!Number.isFinite(amount)||amount<=0||shop.cash<amount)return false;shop.cash-=amount;npc.spiritStones+=amount;return true}
  private static collectTax(world:DivineWorldSave,amount:number){if(amount>0){const city=world.factions.find(f=>f.id==='qingyun-city');if(city)city.wealth+=amount}}
  private static record(world:DivineWorldSave,transaction:Omit<TradeRecord,'id'>){const record:TradeRecord={id:createWorldUuid(),...transaction};world.economy.transactions.push(record);if(world.economy.transactions.length>500)world.economy.transactions.splice(0,world.economy.transactions.length-500);return record}
}
