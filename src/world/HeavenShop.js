import { syncDivinePower } from '../dao/DivinePowerLedger.ts';
import { EconomySystem } from '../dao/EconomySystem.ts';
import { DivineResourceSystem } from '../dao/DivineResourceSystem.ts';
import { ITEM_CATALOG } from '../dao/ItemCatalog.ts';
import { commerceProduct, ordinaryOffers, progressionOffers, trackOne, worldMinute } from './CommerceCatalog.js';

export const ROD = 'fishing_rod_basic';
export const SKILLS = Object.freeze({
  qingyun_wave: { name: 'Thanh Vân Kiếm Khí', weapon: 'jian', level: 2, mp: 8, cooldown: 1400, range: 310, width: 13, effect: 'jian', animation: 'jian_slash', multiplier: 1.4 },
  crescent_wave: { name: 'Bán Nguyệt Đao Khí', weapon: 'dao', level: 2, mp: 10, cooldown: 1800, range: 285, width: 24, effect: 'dao', animation: 'dao_slash_2', multiplier: 1.28, hits: 3 },
  spirit_thrust: { name: 'Linh Phong Thứ', level: 2, mp: 7, cooldown: 1200, range: 360, width: 7, effect: 'thrust', animation: 'jian_thrust', multiplier: 1.22 },
  spirit_guard: { name: 'Hộ Thể Linh Cương', level: 2, mp: 9, cooldown: 6500, duration: 3000 },
});
export const SHOP = Object.freeze({
  ...ordinaryOffers,...progressionOffers,
  [ROD]: { divinePowerPrice: 4, uniqueInVault:true },
  book_qingyun_wave: { divinePowerPrice: 6, skill: 'qingyun_wave', uniqueInVault:true },
  book_crescent_wave: { divinePowerPrice: 6, skill: 'crescent_wave', uniqueInVault:true },
  book_spirit_thrust: { divinePowerPrice: 5, skill: 'spirit_thrust', uniqueInVault:true },
  book_spirit_guard: { divinePowerPrice: 5, skill: 'spirit_guard', uniqueInVault:true },
  training_crossbow: { divinePowerPrice: 7, uniqueInVault:true },
});

export const itemName = id => ITEM_CATALOG[id]?.name ?? id;
export const hasRod = npc => EconomySystem.count(npc.inventory, ROD) > 0;
export const rodEquipped = npc => npc.equippedWeapon === ROD && hasRod(npc);
export const shopLedger = world => world.heaven.shopLedger ??= [];
const failed = message => ({ ok: false, message });
const done = message => ({ ok: true, message });

export function commitHeavenChange(scene, npc, change) {
  const world = scene.populationWorld, heaven = world.heaven;
  const power = heaven.divinePower, divineLedger = heaven.divineLedger, ledger = structuredClone(shopLedger(world));
  const inventory = npc && structuredClone(npc.inventory), skills = npc?.skills?.slice();
  const active = npc?.activeHeavenSkill;
  const events = world.events?.slice(), memories = npc?.memories?.slice();
  let result;
  try {
    result = change();
    if (result.ok && npc && world.clock && events && memories) {
      const previous = new Map(ledger.map(row => [row.id,row.owner]));
      for (const row of shopLedger(world)) {
        if (row.giftedTo !== npc.id || row.owner !== npc.id || previous.get(row.id) === npc.id) continue;
        const {day,minute}=world.clock, id='living-heaven-gift:'+row.id;
        const description=npc.name+' nhận '+itemName(row.itemId)+' từ Thiên Đạo.';
        const axes=npc.aiProfile?.axes;
        const reaction=axes?.caution>=65?' Cẩn thận xem xét trước khi sử dụng.':
          axes?.ambition>=65?' Xem đây là cơ hội tiến xa hơn.':'';
        npc.memories=[...npc.memories,{day,text:description+reaction,kind:'heaven',sourceId:id,itemId:row.itemId}].slice(-12);
        world.events.push({id,day,minute,type:'heaven-shop-gift',actorId:'heaven',targetId:npc.id,description,status:'completed'});
        if(world.events.length>400)world.events.splice(0,world.events.length-400);
      }
    }
    if (result.ok) {
      if (world.clock) syncDivinePower(world, result.message);
      if (scene.persistPopulation()) return result;
    }
  } catch { result = failed("Giao dịch không thể hoàn tất."); }
  if(events)world.events.splice(0,world.events.length,...events);
  if(npc&&memories)npc.memories=memories;
  heaven.divinePower = power;
  heaven.divineLedger = divineLedger;
  heaven.shopLedger = ledger;
  if (npc) {
    npc.inventory = inventory;
    npc.skills = skills;
    npc.activeHeavenSkill = active;
  }
  return result?.ok ? failed('Không ghi được bản lưu. Hãy tải lại trò chơi trước khi thao tác.') : result;
}

export function buyHeavenItem(world, itemId, id) {
  const entry = Object.hasOwn(SHOP, itemId) && SHOP[itemId];
  const ledger = shopLedger(world);
  const product=commerceProduct(itemId), price=entry?.divinePowerPrice;
  if (world.heaven.possession || !product || !Number.isFinite(price) || price < 0 || !Number.isFinite(world.heaven.divinePower) || !id || ledger.some(row => row.id === id)) return failed('Giao dịch không hợp lệ hoặc đã xử lý.');
  if (entry.uniqueInVault&&ledger.some(row => row.itemId === itemId && row.owner === 'heaven')) return failed('Kho đã có mặt hàng này. Hãy ban vật phẩm trước khi mua thêm.');
  const cargo=[{itemId,count:1}], instanceId=trackOne(cargo[0],'heaven','heaven-item:'+id);
  if(!instanceId||!DivineResourceSystem.spendPower(world.heaven,price))return failed('Không đủ Thần Lực.');
  const boughtAt=worldMinute(world);
  ledger.push({ id,itemId,instanceId,divinePowerPrice:price,boughtAt,owner:'heaven',cargo,name:product.name,grade:product.grade,
    history:[{owner:'heaven',at:boughtAt,reason:'purchase'}] });
  return done('Đã mua ' + itemName(itemId) + '.');
}

export function giftHeavenItem(world, id, npc) {
  const row = shopLedger(world).find(entry => entry.id === id && entry.owner === 'heaven');
  if (world.heaven.possession || !row || !npc?.alive || npc.ascended || !world.npcs.includes(npc) || !Array.isArray(npc.inventory)) return failed('Vật phẩm hoặc cư dân không hợp lệ.');
  if(!moveVaultItem(world,row,npc.inventory,npc.id,'reward'))return failed('Không chuyển được vật phẩm.');
  row.giftedTo = npc.id;
  row.giftedAt = worldMinute(world);
  return done('Đã ban ' + itemName(row.itemId) + ' cho ' + npc.name + '.');
}

export function migrateHeavenVault(world){
  for(const row of shopLedger(world)){
    row.divinePowerPrice??=row.price??0;
    const product=commerceProduct(row.itemId);
    if(!product||row.owner!=='heaven')continue;
    row.name??=product.name;row.grade??=product.grade;
    row.cargo??=[{itemId:row.itemId,count:1}];
    if(row.cargo.length===1)row.instanceId??=trackOne(row.cargo[0],'heaven','heaven-item:'+row.id);
  }
}

export function moveVaultItem(world,row,inventory,owner,reason){
  if(row?.owner!=='heaven')return false;
  if(!row.cargo)migrateHeavenVault(world);
  if(!row.cargo||!EconomySystem.transferItem(row.cargo,inventory,row.itemId,1,'heaven',owner))return false;
  delete row.cargo;
  row.owner=owner;
  (row.history??=[]).push({owner,at:worldMinute(world),reason});
  return true;
}

export function learnHeavenBook(world, npc, itemId) {
  const skillId = Object.hasOwn(SHOP, itemId) && SHOP[itemId].skill;
  if (!skillId || !npc?.alive || world.heaven.possession?.npcId !== npc.id) return failed('Hãy nhập thân cư dân để lĩnh ngộ.');
  if (npc.skills?.includes(skillId)) return failed('Cư dân đã biết võ kỹ này.');
  if (npc.realmIndex === 0 && npc.realmLevel < SKILLS[skillId].level) return failed('Cần đạt Luyện Khí tầng 2.');
  const instance=npc.inventory.find(stack=>stack.itemId===itemId)?.itemInstances?.[0]?.id;
  if (!EconomySystem.remove(npc.inventory, itemId, 1)) return failed('Bí kíp không còn trong túi.');
  const row = shopLedger(world).find(entry => instance?entry.instanceId===instance:entry.itemId===itemId&&entry.owner===npc.id);
  if (row) {
    row.owner = 'consumed';
    row.consumedAt = worldMinute(world);
    (row.history??=[]).push({owner:'consumed',at:row.consumedAt,reason:'learned'});
  }
  (npc.skills ??= []).push(skillId);
  npc.activeHeavenSkill ??= skillId;
  return done('Đã lĩnh ngộ ' + SKILLS[skillId].name + '.');
}

/** Reuse purchase and transfer on an isolated transaction, committing both together. */
export function buyAndGiftHeavenItem(world, itemId, npc, id) {
  if (!npc?.alive || npc.ascended || !world.npcs.includes(npc) || !Array.isArray(npc.inventory)) return failed('Cư dân không thể nhận vật phẩm.');
  const stagedNpc = {...npc, inventory: structuredClone(npc.inventory)};
  const staged = {clock:world.clock,heaven: {...world.heaven, shopLedger: structuredClone(shopLedger(world))}, npcs: [stagedNpc]};
  const bought = buyHeavenItem(staged, itemId, id);
  if (!bought.ok) return bought;
  const gifted = giftHeavenItem(staged, id, stagedNpc);
  if (!gifted.ok) return gifted;
  world.heaven.divinePower = staged.heaven.divinePower;
  world.heaven.shopLedger = staged.heaven.shopLedger;
  npc.inventory = stagedNpc.inventory;
  return gifted;
}
