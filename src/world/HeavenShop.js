import { EconomySystem } from '../dao/EconomySystem.ts';
import { DivineResourceSystem } from '../dao/DivineResourceSystem.ts';
import { ITEM_CATALOG } from '../dao/ItemCatalog.ts';

export const ROD = 'fishing_rod_basic';
export const SKILLS = Object.freeze({
  qingyun_wave: { name: 'Thanh Vân Kiếm Khí', weapon: 'jian', level: 2, mp: 8, cooldown: 1400, range: 310, width: 13, effect: 'jian', animation: 'jian_slash', multiplier: 1.4 },
  crescent_wave: { name: 'Bán Nguyệt Đao Khí', weapon: 'dao', level: 2, mp: 10, cooldown: 1800, range: 285, width: 24, effect: 'dao', animation: 'dao_slash_2', multiplier: 1.28, hits: 3 },
  spirit_thrust: { name: 'Linh Phong Thứ', level: 2, mp: 7, cooldown: 1200, range: 360, width: 7, effect: 'thrust', animation: 'jian_thrust', multiplier: 1.22 },
  spirit_guard: { name: 'Hộ Thể Linh Cương', level: 2, mp: 9, cooldown: 6500, duration: 3000 },
});
export const SHOP = Object.freeze({
  [ROD]: { price: 4 },
  book_qingyun_wave: { price: 6, skill: 'qingyun_wave' },
  book_crescent_wave: { price: 6, skill: 'crescent_wave' },
  book_spirit_thrust: { price: 5, skill: 'spirit_thrust' },
  book_spirit_guard: { price: 5, skill: 'spirit_guard' },
});

export const itemName = id => ITEM_CATALOG[id]?.name ?? id;
export const hasRod = npc => EconomySystem.count(npc.inventory, ROD) > 0;
export const rodEquipped = npc => npc.equippedWeapon === ROD && hasRod(npc);
export const shopLedger = world => world.heaven.shopLedger ??= [];
const failed = message => ({ ok: false, message });
const done = message => ({ ok: true, message });

export function commitHeavenChange(scene, npc, change) {
  const world = scene.populationWorld, heaven = world.heaven;
  const power = heaven.divinePower, ledger = structuredClone(shopLedger(world));
  const inventory = npc && structuredClone(npc.inventory), skills = npc?.skills?.slice();
  const active = npc?.activeHeavenSkill;
  let result;
  try {
    result = change();
    if (result.ok && scene.persistPopulation()) return result;
  } catch { result = failed("Giao dịch không thể hoàn tất."); }
  heaven.divinePower = power;
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
  if (world.heaven.possession || !entry || !Number.isFinite(entry.price) || entry.price < 0 || !Number.isFinite(world.heaven.divinePower) || !id || ledger.some(row => row.id === id)) return failed('Giao dịch không hợp lệ hoặc đã xử lý.');
  if (ledger.some(row => row.itemId === itemId && row.owner === 'heaven')) return failed('Kho đã có mặt hàng này. Hãy ban vật phẩm trước khi mua thêm.');
  if (!DivineResourceSystem.spendPower(world.heaven, entry.price)) return failed('Không đủ Thần Lực.');
  ledger.push({ id, itemId, price: entry.price, boughtAt: Date.now(), owner: 'heaven' });
  return done('Đã mua ' + itemName(itemId) + '.');
}

export function giftHeavenItem(world, id, npc) {
  const row = shopLedger(world).find(entry => entry.id === id && entry.owner === 'heaven');
  if (world.heaven.possession || !row || !npc?.alive || npc.ascended || !world.npcs.includes(npc) || !Array.isArray(npc.inventory)) return failed('Vật phẩm hoặc cư dân không hợp lệ.');
  EconomySystem.add(npc.inventory, row.itemId, 1);
  row.owner = npc.id;
  row.giftedTo = npc.id;
  row.giftedAt = Date.now();
  return done('Đã ban ' + itemName(row.itemId) + ' cho ' + npc.name + '.');
}

export function learnHeavenBook(world, npc, itemId) {
  const skillId = Object.hasOwn(SHOP, itemId) && SHOP[itemId].skill;
  if (!skillId || !npc?.alive || world.heaven.possession?.npcId !== npc.id) return failed('Hãy nhập thân cư dân để lĩnh ngộ.');
  if (npc.skills?.includes(skillId)) return failed('Cư dân đã biết võ kỹ này.');
  if (npc.realmIndex === 0 && npc.realmLevel < SKILLS[skillId].level) return failed('Cần đạt Luyện Khí tầng 2.');
  if (!EconomySystem.remove(npc.inventory, itemId, 1)) return failed('Bí kíp không còn trong túi.');
  const row = shopLedger(world).find(entry => entry.itemId === itemId && entry.owner === npc.id);
  if (row) {
    row.owner = 'consumed';
    row.consumedAt = Date.now();
  }
  (npc.skills ??= []).push(skillId);
  npc.activeHeavenSkill ??= skillId;
  return done('Đã lĩnh ngộ ' + SKILLS[skillId].name + '.');
}

/** Reuse purchase and transfer on an isolated transaction, committing both together. */
export function buyAndGiftHeavenItem(world, itemId, npc, id) {
  if (!npc?.alive || npc.ascended || !world.npcs.includes(npc) || !Array.isArray(npc.inventory)) return failed('Cư dân không thể nhận vật phẩm.');
  const stagedNpc = {...npc, inventory: structuredClone(npc.inventory)};
  const staged = {heaven: {...world.heaven, shopLedger: structuredClone(shopLedger(world))}, npcs: [stagedNpc]};
  const bought = buyHeavenItem(staged, itemId, id);
  if (!bought.ok) return bought;
  const gifted = giftHeavenItem(staged, id, stagedNpc);
  if (!gifted.ok) return gifted;
  world.heaven.divinePower = staged.heaven.divinePower;
  world.heaven.shopLedger = staged.heaven.shopLedger;
  npc.inventory = stagedNpc.inventory;
  return gifted;
}
