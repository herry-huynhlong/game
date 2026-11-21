import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'thanh-van-weapon-visuals-'));
try {
  await build({
    entryPoints: {
      WeaponVisuals: 'src/dao/WeaponVisuals.ts',
      GiftItemSystem: 'src/dao/GiftItemSystem.ts',
      AutonomousNPCSystem: 'src/dao/AutonomousNPCSystem.ts',
      TreasureTrade: 'src/dao/TreasureTrade.ts',
      TreasureDuel: 'src/dao/TreasureDuel.ts',
      PossessionSystem: 'src/dao/PossessionSystem.ts',
      CultivationSystem: 'src/systems/CultivationSystem.ts',
    },
    outdir: temp, bundle: true, platform: 'node', format: 'cjs', target: 'node20',
    outExtension: { '.js': '.cjs' }, logLevel: 'silent',
  });
  const req = createRequire(import.meta.url);
  const load = (name) => req(path.join(temp, `${name}.cjs`));
  const { equippedWeaponVisual, weaponTextureKey, weaponFrameIndex } = load('WeaponVisuals');
  const { equipWeapon, equipBestWeapon } = load('GiftItemSystem');
  const { createInitialNPCs } = load('AutonomousNPCSystem');
  const { makeTreasureOffer, resolveTreasureOffer } = load('TreasureTrade');
  const { tickDuels } = load('TreasureDuel');
  const { PossessionSystem } = load('PossessionSystem');
  const { cultivationStats } = load('CultivationSystem');

  const npcs = createInitialNPCs();
  const world = {
    version: 3, worldId: 'weapon-visual-test', access: [],
    clock: { day: 1, minute: 700, speed: 1, paused: false },
    heaven: { level: 1, qi: 0, qiMax: 100, fragments: 0, unlocked: [], markedNPCs: [],
      followedNPC: null, blessingDay: 1, blessingCount: 0, introSeen: true,
      divinePower: 50, divinePowerMax: 100, resourceMigrationVersion: 1,
      possession: null, mode: 'heavenly', playerId: 'heaven', originWorldId: 'weapon-visual-test',
      ascendedCultivators: [], activeAscendedId: null },
    npcs, events: [], rewardedEventIds: [], sieges: [], lastSiegeDay: 0,
    ascendedRecords: [], factions: [], settlement: { materials: [] }, shops: [],
    economy: { remainderMinutes: 0, transactions: [] }, boardNews: [],
    treasureOffers: [], treasureDuels: [], treasureProvenance: [],
  };
  const [seller, buyer] = npcs;
  seller.realmIndex = buyer.realmIndex = 1;
  seller.x = 500; seller.y = 500; buyer.x = 510; buyer.y = 500;
  seller.inventory = [{ itemId: 'mortal_gift_sword', count: 1 }];
  seller.equippedWeapon = null;
  assert.equal(equippedWeaponVisual(seller), null, 'owned but unequipped sword is hidden');
  assert.equal(equipWeapon(seller, 'mortal_gift_sword'), true);
  assert.equal(equippedWeaponVisual(seller), 'mortal_gift_sword');
  assert.equal(weaponTextureKey(equippedWeaponVisual(seller)), 'weapon-mortal_gift_sword');
  assert.equal(equipWeapon(seller, null), true);
  assert.equal(equippedWeaponVisual(seller), null, 'unequipping hides the sword');

  seller.inventory = [{ itemId: 'qingfeng_sword', count: 1 }];
  seller.realmIndex = 0;
  assert.equal(equipWeapon(seller, 'qingfeng_sword'), false, 'realm rule rejects equipping');
  assert.equal(equippedWeaponVisual(seller), null, 'unqualified item stays visually in inventory');
  seller.realmIndex = 1;
  assert.equal(equipWeapon(seller, 'qingfeng_sword'), true);
  assert.equal(equippedWeaponVisual(seller), 'qingfeng_sword');
  assert.equal(weaponTextureKey(equippedWeaponVisual(seller)), 'weapon-qingfeng_sword');

  // Real voluntary trade API removes the seller's attached sword and equips it for the buyer.
  buyer.spiritStones = 1000;
  const news = { id: 'weapon-sale', targetId: seller.id, kind: 'treasure', itemId: 'qingfeng_sword',
    day: 1, minute: 700, createdAt: 1, knownBy: [buyer.id], reactions: {}, expiresDay: 30 };
  world.boardNews.push(news);
  const offer = makeTreasureOffer(world, news, buyer, seller);
  assert.ok(offer);
  assert.equal(resolveTreasureOffer(world, offer, true), true);
  assert.equal(equippedWeaponVisual(seller), null, 'seller loses the overlay after selling last copy');
  assert.equal(equippedWeaponVisual(buyer), 'qingfeng_sword', 'buyer receives an equipped overlay');

  // The real duel resolution transfers inventory and auto-equips for a qualified victor.
  seller.inventory = [{ itemId: 'qingfeng_sword', count: 1 }];
  seller.equippedWeapon = 'qingfeng_sword';
  seller.hp = 1;
  buyer.inventory = [];
  buyer.equippedWeapon = null;
  buyer.hp = cultivationStats(buyer).hpMax;
  buyer.x = seller.x + 5; buyer.y = seller.y;
  const duel = { id: 'weapon-theft', offerId: 'weapon-theft-offer', attackerId: buyer.id,
    defenderId: seller.id, itemId: 'qingfeng_sword', status: 'fighting', nextAction: 0,
    round: 0, looted: false };
  world.treasureDuels = [duel];
  tickDuels(world, () => true);
  assert.equal(duel.status, 'won');
  assert.equal(equippedWeaponVisual(seller), null, 'victim no longer displays stolen weapon');
  assert.equal(equippedWeaponVisual(buyer), 'qingfeng_sword', 'qualified victor displays stolen weapon');

  // Possession is a control mode only; save/load uses the same persisted NPC fields.
  assert.equal(PossessionSystem.start(world.heaven, buyer).ok, true);
  assert.equal(equippedWeaponVisual(buyer), 'qingfeng_sword');
  const reload = JSON.parse(JSON.stringify(world));
  assert.equal(equippedWeaponVisual(reload.npcs.find((npc) => npc.id === buyer.id)), 'qingfeng_sword');
  assert.equal(weaponFrameIndex(287), 287);
  assert.equal(weaponFrameIndex('116'), 116, 'weapon copies the exact actor frame');
  assert.equal(weaponFrameIndex(288), 0, 'invalid sheet frames safely fall back');

  console.log('PASS: inventory/equipment visibility, realm restriction, equip/unequip, real sale and robbery transfer, possession, save/load and shared animation frames');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}
