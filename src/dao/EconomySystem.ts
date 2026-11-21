import { createWorldUuid } from '../world/WorldId';
import type { DivineWorldSave, MarketStock, ShopSave, SimNPC, TradeItemId, TradeRecord } from './types';

export interface TradeResult { ok:boolean; message:string; record?:TradeRecord; }
export class EconomySystem {
  static readonly taxRate=.05;
  static count(items:Array<{itemId:string;count:number}>,id:string){return items.find(x=>x.itemId===id)?.count??0}
  static add(items:Array<{itemId:string;count:number}>,id:string,count:number){const found=items.find(x=>x.itemId===id);if(found)found.count+=count;else items.push({itemId:id,count})}
  static remove(items:Array<{itemId:string;count:number}>,id:string,count:number){const found=items.find(x=>x.itemId===id);if(!found||count<=0||found.count<count)return false;found.count-=count;if(found.count===0)items.splice(items.indexOf(found),1);return true}
  static buyFromShop(world:DivineWorldSave,buyer:SimNPC,shopId:string,itemId:TradeItemId,count:number,day=world.clock.day,minute=world.clock.minute):TradeResult{
    const shop=world.shops.find(s=>s.id===shopId);if(!shop||!buyer.alive||!Number.isInteger(count)||count<1)return {ok:false,message:'Giao dịch không hợp lệ.'};
    const hour=Math.floor(minute/60);if(hour<shop.openHour||hour>=shop.closeHour)return {ok:false,message:'Cửa hàng đang đóng cửa.'};
    const unitPrice=shop.sellPrices[itemId];if(!unitPrice||this.count(shop.stock,itemId)<count)return {ok:false,message:'Cửa hàng không đủ hàng.'};const total=unitPrice*count;
    if(buyer.spiritStones<total)return {ok:false,message:'Không đủ linh thạch.'};
    if(!this.remove(shop.stock,itemId,count))return {ok:false,message:'Hàng đã được mua hết.'};buyer.spiritStones-=total;const tax=Math.floor(total*this.taxRate);shop.cash+=total-tax;this.collectTax(world,tax);this.add(buyer.inventory,itemId,count);
    return {ok:true,message:`Đã mua ${itemId} ×${count} với ${total} linh thạch.`,record:this.record(world,{day,minute,buyerId:buyer.id,sellerId:shop.ownerId,shopId,itemId,count,unitPrice})};
  }
  static sellToShop(world:DivineWorldSave,seller:SimNPC,shopId:string,itemId:TradeItemId,count:number,day=world.clock.day,minute=world.clock.minute):TradeResult{
    const shop=world.shops.find(s=>s.id===shopId);if(!shop||!seller.alive||!Number.isInteger(count)||count<1)return {ok:false,message:'Giao dịch không hợp lệ.'};
    const hour=Math.floor(minute/60);if(hour<shop.openHour||hour>=shop.closeHour)return {ok:false,message:'Cửa hàng đang đóng cửa.'};
    const unitPrice=shop.buyPrices[itemId];if(!unitPrice||this.count(seller.inventory,itemId)<count)return {ok:false,message:'Người bán không có đủ hàng.'};const total=unitPrice*count;
    if(shop.cash<total)return {ok:false,message:'Cửa hàng không đủ vốn.'};
    if(!this.remove(seller.inventory,itemId,count))return {ok:false,message:'Hàng không còn trong túi.'};shop.cash-=total;const tax=Math.floor(total*this.taxRate);seller.spiritStones+=total-tax;this.collectTax(world,tax);this.add(shop.stock,itemId,count);
    return {ok:true,message:`Đã bán ${itemId} ×${count}, nhận ${total} linh thạch.`,record:this.record(world,{day,minute,buyerId:shop.ownerId,sellerId:seller.id,shopId,itemId,count,unitPrice})};
  }
  static directTrade(world:DivineWorldSave,buyer:SimNPC,seller:SimNPC,itemId:TradeItemId,count:number,unitPrice:number,day=world.clock.day,minute=world.clock.minute):TradeResult{
    if(buyer.id===seller.id||!buyer.alive||!seller.alive||!Number.isInteger(count)||count<1||!Number.isFinite(unitPrice)||unitPrice<=0)return {ok:false,message:'Giao dịch không hợp lệ.'};
    const total=count*unitPrice;if(buyer.spiritStones<total||this.count(seller.inventory,itemId)<count)return {ok:false,message:'Thiếu tiền hoặc hàng hóa.'};
    this.remove(seller.inventory,itemId,count);buyer.spiritStones-=total;seller.spiritStones+=total;this.add(buyer.inventory,itemId,count);
    return {ok:true,message:'Giao dịch hoàn tất.',record:this.record(world,{day,minute,buyerId:buyer.id,sellerId:seller.id,itemId,count,unitPrice})};
  }
  static depositFaction(world:DivineWorldSave,npc:SimNPC,factionId:string,itemId:TradeItemId,count:number){const faction=world.factions.find(f=>f.id===factionId);if(!faction||!this.remove(npc.inventory,itemId,count))return false;this.add(faction.treasury,itemId,count);return true}
  static withdrawFaction(world:DivineWorldSave,npc:SimNPC,factionId:string,itemId:TradeItemId,count:number){const faction=world.factions.find(f=>f.id===factionId);if(!faction||!this.remove(faction.treasury,itemId,count))return false;this.add(npc.inventory,itemId,count);return true}
  static payWage(world:DivineWorldSave,npc:SimNPC,factionId:string,amount:number){const faction=world.factions.find(f=>f.id===factionId);if(!faction||!Number.isFinite(amount)||amount<=0||faction.wealth<amount)return false;faction.wealth-=amount;npc.spiritStones+=amount;return true}
  static payShopOwner(shop:ShopSave,npc:SimNPC,amount:number){if(shop.ownerId!==npc.id||!Number.isFinite(amount)||amount<=0||shop.cash<amount)return false;shop.cash-=amount;npc.spiritStones+=amount;return true}
  private static collectTax(world:DivineWorldSave,amount:number){if(amount>0){const city=world.factions.find(f=>f.id==='qingyun-city');if(city)city.wealth+=amount}}
  private static record(world:DivineWorldSave,transaction:Omit<TradeRecord,'id'>){const record:TradeRecord={id:createWorldUuid(),...transaction};world.economy.transactions.push(record);if(world.economy.transactions.length>500)world.economy.transactions.splice(0,world.economy.transactions.length-500);return record}
}
