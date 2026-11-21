import assert from 'node:assert/strict';
import { isInWeaponArc, provisionWorldWeapons, setNpcWeapon, weaponAttackMode, weaponChoices, weaponForNpc } from '../src/world/WeaponCombat.js';

const npc = (id, populationRole) => ({ id, name: id, alive: true, realmIndex: 0, populationRole, inventory: [], equippedWeapon: null });
const world = {
  clock: { day: 1, minute: 480 }, events: [],
  npcs: [npc('guard-1', 'city_guard'), npc('guard-2', 'city_guard'), npc('disciple-1', 'low_disciple'), npc('disciple-2', 'low_disciple'), npc('hunter-1', 'hunter'), npc('civilian-1', 'commoner')],
  shops: [{ id: 'city-forge', stock: [{ itemId: 'iron_sword', count: 3 }] }],
  settlement: { materials: [{ itemId: 'iron_ore', count: 4 }, { itemId: 'wood', count: 2 }] },
};

const first = provisionWorldWeapons(world);
assert.equal(first.changed, true);
assert.equal(first.issued.length, 5, 'finite forge stock issues 2 dao and 3 swords');
assert.equal(world.npcs.filter((n) => weaponForNpc(n)).length, 5);
assert.equal(world.npcs.filter((n) => !weaponForNpc(n)).length, 1, 'some residents remain unarmed');
assert.equal(world.npcs.filter((n) => n.equippedWeapon === 'iron_dao').length, 2);
assert.equal(world.npcs.filter((n) => n.equippedWeapon === 'iron_sword').length, 3);
assert.equal(world.shops[0].stock.some((s) => s.itemId === 'iron_sword'), false);
assert.equal(world.shops[0].stock.some((s) => s.itemId === 'iron_dao'), false);
assert.equal(world.settlement.materials.length, 0, 'saber forging consumes its finite city resources');
assert.equal(provisionWorldWeapons(world).changed, false, 'provisioning runs once');

const guard = world.npcs[0], unarmed = world.npcs.at(-1);
assert.equal(setNpcWeapon(guard, null), true);
assert.equal(weaponForNpc(guard), null);
assert.equal(setNpcWeapon(guard, 'iron_dao'), true, 'owned weapon can be equipped again');
assert.equal(setNpcWeapon(unarmed, 'iron_dao'), false, 'equipment cannot create ownership');
assert.equal(weaponChoices(unarmed).length, 0);
assert.equal(weaponAttackMode(weaponForNpc(guard), 1, false).hit, 'slash');
assert.equal(weaponAttackMode(weaponForNpc(world.npcs[2]), 1, false).hit, 'thrust');
assert.equal(weaponAttackMode(weaponForNpc(world.npcs[2]), 2, false).hit, 'short_slash');
assert.equal(weaponAttackMode(weaponForNpc(world.npcs[2]), 1, true).hit, 'thrust');
assert.equal(isInWeaponArc(100, 100, 150, 100, 'right', { hit: 'thrust', range: 70, width: 12 }), true);
assert.equal(isInWeaponArc(100, 100, 100, 150, 'right', { hit: 'thrust', range: 70, width: 12 }), false);
assert.equal(isInWeaponArc(100, 100, 150, 114, 'right', { hit: 'thrust', range: 70, width: 12 }), false);

const reloaded = structuredClone(world);
assert.equal(weaponForNpc(reloaded.npcs[0]).id, 'iron_dao', 'save/load preserves visual equipment from owned inventory');
assert.equal(reloaded.weaponProvisioning.issued.length, 5, 'provision log prevents duplicate issuance after reload');
console.log('WEAPON.COMBAT.1 passed: authored equipment data, finite source provisioning, unarmed residents, movesets, hit arcs, ownership, unequip and save/load.');
