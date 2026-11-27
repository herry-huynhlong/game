import {MARTIAL_WEAPONS} from './MartialRegistry';
import type { HeavenSave, SimNPC, TradeItemId } from './types';
import { EconomySystem } from './EconomySystem';
import { DivineResourceSystem } from './DivineResourceSystem';

export const GIFT_WEAPONS={
  iron_dao:{id:'iron_dao',name:'Thiết Diệp Đao',type:'Đao',rank:'Phàm cấp',quality:'Trung phẩm',attack:4,minRealm:0,value:16,cost:0},
  iron_sword:{id:'iron_sword',name:'Thiết Mộc Kiếm',type:'Kiếm',rank:'Phàm cấp',quality:'Trung phẩm',attack:3,minRealm:0,value:12,cost:0},
  mortal_gift_sword:{id:'mortal_gift_sword',name:'Phàm Thiết Kiếm',type:'Kiếm',rank:'Phàm cấp',quality:'Hạ phẩm',attack:3,minRealm:0,value:20,cost:8},
  qingfeng_sword:{id:'qingfeng_sword',name:'Thanh Phong Kiếm',type:'Kiếm',rank:'Pháp khí',quality:'Thượng phẩm',attack:12,minRealm:1,value:100,cost:30},
} as const;
export type GiftWeaponId=keyof typeof GIFT_WEAPONS;
export function weaponBonus(n:{equippedWeapon?:string|null;inventory?:{itemId:string;count:number}[];realmIndex:number}){const w=GIFT_WEAPONS[n.equippedWeapon as GiftWeaponId];return w&&n.realmIndex>=w.minRealm&&n.inventory?.some(i=>i.itemId===w.id&&i.count>0)?w.attack:0}
export function equipWeapon(n:SimNPC,id:GiftWeaponId|null){if(id===null){n.equippedWeapon=null;return true}const w=GIFT_WEAPONS[id];if(!w||n.realmIndex<w.minRealm||EconomySystem.count(n.inventory,id)<1)return false;n.equippedWeapon=id;return true}
export function equipBestWeapon(n:SimNPC){if(n.equippedWeapon&&MARTIAL_WEAPONS[n.equippedWeapon]&&(n.martialDurability?.[n.equippedWeapon]??1)>0)return;for(const w of Object.values(GIFT_WEAPONS))if(n.realmIndex>=w.minRealm&&EconomySystem.count(n.inventory,w.id)>0&&w.attack>weaponBonus(n))equipWeapon(n,w.id)}
export function giftWeapon(h:HeavenSave,n:SimNPC,id:GiftWeaponId,transactionId:string){const w=GIFT_WEAPONS[id];if(!w||!transactionId)return {ok:false,message:'Vật phẩm không hợp lệ.'};if(h.giftTransactions?.includes(transactionId))return {ok:false,message:'Giao dịch đã được xử lý.'};if(!h.unlocked.includes('gift-item'))return {ok:false,message:'Quyền năng chưa mở khóa.'};if(!n.alive||n.ascended||h.possession?.npcId===n.id)return {ok:false,message:'Mục tiêu không hợp lệ.'};if(!DivineResourceSystem.spendPower(h,w.cost))return {ok:false,message:'Không đủ Thần Lực.'};EconomySystem.add(n.inventory,id as TradeItemId,1);(h.giftTransactions??=[]).push(transactionId);if(n.realmIndex>=w.minRealm&&w.attack>weaponBonus(n))equipWeapon(n,id);return {ok:true,message:`${n.name} nhận ${w.name}.`}}
