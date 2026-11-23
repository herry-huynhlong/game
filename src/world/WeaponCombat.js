export const WORLD_WEAPONS = Object.freeze({
  training_crossbow: Object.freeze({id:'training_crossbow',name:'Nỏ Thiết Mộc',kind:'crossbow',attack:3,minRealm:0,range:300,width:9,skillRange:0,skillWidth:0}),
  iron_dao: Object.freeze({ id: 'iron_dao', name: 'Thiết Diệp Đao', kind: 'dao', attack: 4, minRealm: 0, range: 58, width: 34, skillRange: 66, skillWidth: 38 }),
  iron_sword: Object.freeze({ id: 'iron_sword', name: 'Thiết Mộc Kiếm', kind: 'jian', attack: 3, minRealm: 0, range: 70, width: 16, skillRange: 78, skillWidth: 12 }),
  mortal_gift_sword: Object.freeze({ id: 'mortal_gift_sword', name: 'Phàm Thiết Kiếm', kind: 'jian', attack: 3, minRealm: 0, range: 70, width: 16, skillRange: 78, skillWidth: 12 }),
  qingfeng_sword: Object.freeze({ id: 'qingfeng_sword', name: 'Thanh Phong Kiếm', kind: 'jian', attack: 12, minRealm: 1, range: 70, width: 16, skillRange: 82, skillWidth: 14 }),
});

const FORWARD = Object.freeze({ down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] });

export function weaponForNpc(npc) {
  const spec = WORLD_WEAPONS[npc?.equippedWeapon];
  return spec && npc.realmIndex >= spec.minRealm && npc.inventory?.some((item) => item.itemId === spec.id && item.count > 0) ? spec : null;
}

export function weaponChoices(npc) {
  return Object.values(WORLD_WEAPONS).filter((weapon) =>
    weaponForNpc({ ...npc, equippedWeapon: weapon.id }) === weapon,
  );
}

export function setNpcWeapon(npc, itemId = null) {
  if (itemId === null) { npc.equippedWeapon = null; return true; }
  const weapon = WORLD_WEAPONS[itemId];
  if (!weapon || !npc.alive || npc.realmIndex < weapon.minRealm || !((npc.inventory ?? []).find((item) => item.itemId === itemId)?.count > 0)) return false;
  npc.equippedWeapon = itemId;
  return true;
}

export function weaponAttackMode(weapon, combo = 1, skill = false) {
  if (!weapon) return { animation: `unarmed_${combo}`, hit: skill ? 'unarmed_skill' : 'unarmed' };
  if (weapon.kind === 'crossbow') return {animation:'crossbowShoot',hit:'thrust',range:weapon.range,width:weapon.width,multiplier:1};
  if (weapon.kind === 'dao') return { animation: `dao_slash_${Math.min(3, combo)}`, hit: 'slash', range: skill ? weapon.skillRange : weapon.range, width: skill ? weapon.skillWidth : weapon.width, multiplier: skill ? 1.12 : [1, 1.06, 1.14][Math.min(2, combo - 1)] };
  if (skill) return { animation: 'jian_thrust', hit: 'thrust', range: weapon.skillRange, width: weapon.skillWidth, multiplier: 1.12 };
  if (combo === 2) return { animation: 'jian_slash', hit: 'short_slash', range: weapon.range - 8, width: 26, multiplier: 1.04 };
  return { animation: 'jian_thrust', hit: 'thrust', range: weapon.range, width: weapon.width, multiplier: [1, 1.04, 1.12][combo - 1] };
}

export function isInWeaponArc(x, y, targetX, targetY, facing, mode) {
  const direction = FORWARD[facing];
  if (!direction || !mode?.range) return false;
  const dx = targetX - x, dy = targetY - y;
  const projection = dx * direction[0] + dy * direction[1];
  const lateral = Math.abs(dx * direction[1] - dy * direction[0]);
  if (mode.hit === 'thrust') return projection > 0 && projection <= mode.range && lateral <= mode.width;
  return projection > -8 && projection <= mode.range && lateral <= mode.width;
}

function stack(items, itemId) { return items.find((item) => item.itemId === itemId); }
function take(items, itemId, count) {
  const item = stack(items, itemId);
  if (!item || item.count < count) return false;
  item.count -= count;
  if (item.count === 0) items.splice(items.indexOf(item), 1);
  return true;
}
function add(items, itemId, count) {
  const item = stack(items, itemId);
  if (item) item.count += count;
  else items.push({ itemId, count });
}

/** One-time city armory issue. Weapons come from finite forge stock; two sabers are forged from recorded city materials. */
export function provisionWorldWeapons(world) {
  if (world.weaponProvisioning?.version >= 1) return { changed: false, issued: world.weaponProvisioning.issued ?? [] };
  const forge = world.shops?.find((shop) => shop.id === 'city-forge');
  const materials = world.settlement?.materials ?? [];
  const issued = [];
  const stockCount = (itemId) => stack(forge?.stock ?? [], itemId)?.count ?? 0;
  if (forge && stockCount('iron_dao') === 0 &&
      (stack(materials, 'iron_ore')?.count ?? 0) >= 4 && (stack(materials, 'wood')?.count ?? 0) >= 2 &&
      take(materials, 'iron_ore', 4) && take(materials, 'wood', 2)) {
    add(forge.stock, 'iron_dao', 2);
    world.events.push({ id: 'weapon-forge:dao-batch-1', day: world.clock.day, minute: world.clock.minute, type: 'weapon-crafted', description: 'Thiết Mộc Các rèn hai Thiết Diệp Đao từ 4 quặng sắt và 2 gỗ của kho thành.' });
  }
  const groups = [
    ['city_guard', 'iron_dao', 2],
    ['low_disciple', 'iron_sword', 2],
    ['hunter', 'iron_sword', 1],
  ];
  for (const [role, itemId, limit] of groups) {
    const available = stockCount(itemId);
    const recipients = world.npcs.filter((npc) => npc.alive && npc.populationRole === role && !npc.equippedWeapon)
      .sort((a, b) => a.id.localeCompare(b.id)).slice(0, Math.min(limit, available));
    for (const npc of recipients) {
      if (!take(forge.stock, itemId, 1)) break;
      add(npc.inventory, itemId, 1);
      npc.equippedWeapon = itemId;
      const eventId = `weapon-provision:${npc.id}:${itemId}:v1`;
      issued.push({ eventId, npcId: npc.id, itemId, sourceShopId: forge.id });
      world.events.push({ id: eventId, day: world.clock.day, minute: world.clock.minute, type: 'weapon-issued', actorId: npc.id, description: `${npc.name} được cấp ${WORLD_WEAPONS[itemId].name} từ kho Thiết Mộc Các theo biên chế.` });
    }
  }
  world.weaponProvisioning = { version: 1, issued };
  return { changed: true, issued };
}
