import { ensureWorldNpcAppearances } from './world/NpcAppearanceProfiles.js';
import { createWorldUuid } from './world/WorldId.ts';
import { HEAVEN_DEFAULTS } from './dao/HeavenlyDaoSystem.ts';
import { ensureNPCVisualStyles } from './dao/CharacterAppearance.ts';
import { ensureNPCPopulation, NPC_POPULATION_QUOTAS } from './dao/NPCPopulationRegistry.ts';
import { ensureAuthorityAndRealmProfiles } from './dao/NPCAuthoritySystem.ts';
import { createFactions, createSettlement, createShops } from './dao/SettlementSystem.ts';
import { migrateWorldLayout, worldLayout } from './world/WorldLayout.js';

export const WORLD_POPULATION_SAVE_KEY = 'world-rebuild-1c-v1';

export { createWorldUuid };

const roleSites = {
  commoner: ['city-center', 'south-outskirts'], low_disciple: ['sect-yard'], elder: ['sect-yard'],
  sect_leader: ['sect-yard'], merchant: Array.from({ length: 7 }, (_, i) => `market-stall-${String(i + 1).padStart(2, '0')}`),
  tavern_staff: ['tavern-entrance'], city_guard: ['gate-north', 'gate-east', 'gate-south', 'gate-west', 'city-hall-entrance'],
  repair_worker: ['quest-office'], hunter: ['forest-outer'], herb_gatherer: ['south-outskirts', 'forest-outer'],
  quest_clerk: ['quest-office'], independent_cultivator: ['city-center', 'south-outskirts', 'forest-outer'],
};

const hash = value => [...value].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

function findOpen(x, y, solids, occupied, worldWidth, worldHeight) {
  const clear = (px, py) => px > 12 && py > 12 && px < worldWidth - 12 && py < worldHeight - 12 &&
    !solids.some(r => px + 9 > r.x && px - 9 < r.x + r.width && py + 5 > r.y && py - 5 < r.y + r.height) &&
    !occupied.some(p => Math.hypot(p.x - px, p.y - py) < 20);
  if (clear(x, y)) return { x, y };
  for (let radius = 16; radius <= 480; radius += 16) {
    const steps = Math.max(8, Math.round(radius * Math.PI / 8));
    for (let i = 0; i < steps; i++) {
      const a = Math.PI * 2 * i / steps, px = Math.round((x + Math.cos(a) * radius) / 8) * 8, py = Math.round((y + Math.sin(a) * radius) / 8) * 8;
      if (clear(px, py)) return { x: px, y: py };
    }
  }
  throw new Error(`No collision-free population spawn near ${x},${y}`);
}

function makeFreshWorld(seed, map, solids) {
  const worldId = `world-rebuild-1c:${seed}`;
  const world = {
    version: 1, layoutVersion: worldLayout(map).worldLayoutVersion??1,
    worldId, access: [{ playerId: 'local-player', role: 'owner' }],
    clock: { day: 1, minute: 480, speed: 1, paused: false },
    heaven: structuredClone({ ...HEAVEN_DEFAULTS, originWorldId: worldId, playerId: 'local-player', mode: 'heavenly' }),
    npcs: [], events: [], rewardedEventIds: [], sieges: [], lastSiegeDay: 0, ascendedRecords: [],
    factions: createFactions([]), settlement: createSettlement(), shops: createShops(), economy: { remainderMinutes: 0, transactions: [] },
    sects: [], invitations: [], sectMissions: [], spiritVeins: [], factionConflicts: [], commissions: [], commissionTransactions: [],
    population: undefined, authority: undefined,
  };
  world.settlement.guardCaptainId = null;
  const sectFaction = world.factions.find(f => f.id === 'qingyun-sect');
  world.sects.push({ id: 'qingyun-sect-system', factionId: 'qingyun-sect', name: 'Thanh Vân Tông', leaderId: null, elderIds: [], memberLimit: 36, rankByNpc: {}, mentors: [], ownedTechniques: ['qingyun', 'sword', 'longevity'], reputation: 58, power: 0, territory: ['sect', 'training'], recruitmentCooldownDay: 0, lastStipendDay: 0, lastMissionDay: 0, developmentGoal: 'cultivate' });
  ensureNPCPopulation(world);
  ensureAuthorityAndRealmProfiles(world, { preservePopulation: true });
  const markers = new Map((map.getObjectLayer('NavigationMarkers')?.objects ?? []).map(o => [o.properties?.find(p => p.name === 'markerId')?.value, { x: o.x, y: o.y }]));
  const occupied = [];
  const roleIndex = new Map();
  for (const npc of world.npcs) {
    const role = npc.populationRole, index = roleIndex.get(role) ?? 0;
    roleIndex.set(role, index + 1);
    const sites = roleSites[role] ?? ['city-center'];
    let siteId = sites[index % sites.length];
    if (npc.authorityRole === 'city_master') siteId = 'city-hall-entrance';
    if (role === 'commoner' && npc.profession === 'nong_dan') siteId = 'south-outskirts';
    if (role === 'independent_cultivator') {
      const caution = npc.aiProfile?.axes?.caution ?? 50;
      siteId = caution < 40 ? 'forest-outer' : sites[index % sites.length];
    }
    const base = markers.get(siteId);
    if (!base) throw new Error(`Missing spawn marker ${siteId} for ${npc.id}`);
    const spawn = findOpen(base.x + ((hash(npc.id) % 5) - 2) * 12, base.y + ((hash(npc.id + ':y') % 5) - 2) * 12, solids, occupied, map.widthInPixels, map.heightInPixels);
    npc.x = spawn.x; npc.y = spawn.y; npc.home = { ...spawn }; npc.homeId = `population-home:${npc.id}`;
    npc.actionTarget = { ...spawn }; npc.spawnRegionId = siteId === 'sect-yard' ? 'sect' : siteId.startsWith('gate-') || siteId.includes('stall') || ['city-center', 'city-hall-entrance', 'quest-office', 'inn-entrance', 'tavern-entrance'].includes(siteId) ? 'city' : siteId === 'forest-outer' ? 'forest-outer' : 'south-suburb';
    if (role === 'city_guard') npc.guardPostId = siteId;
    if (role === 'merchant') npc.stallId = siteId;
    if (role === 'merchant') { npc.workplaceId = siteId; npc.homeId = `merchant-home:${String(index + 1).padStart(2, '0')}`; }
    if (role === 'tavern_staff') npc.workplaceId = 'tavern-entrance';
    if (role === 'quest_clerk') npc.workplaceId = 'quest-office';
    if (role === 'repair_worker') npc.workplaceId = 'quest-office';
    occupied.push(spawn);
  }
  const ids = role => world.npcs.filter(n => n.populationRole === role).map(n => n.id);
  const cityMaster = world.npcs.find(n => n.id === world.authority.cityMasterId);
  const sectLeader = world.npcs.find(n => n.id === world.authority.sectLeaderId);
  const city = world.factions.find(f => f.id === 'qingyun-city'), sect = world.factions.find(f => f.id === 'qingyun-sect');
  city.leaderId = cityMaster.id; sect.leaderId = sectLeader.id;
  const sectRecord = world.sects[0]; sectRecord.leaderId = sectLeader.id;
  for (const n of world.npcs.filter(n => n.populationRole === 'elder')) { n.authorityRole = 'elder'; n.authorityScope = 'sect'; n.sectRank = 'trưởng_lão'; sectRecord.elderIds.push(n.id); sectRecord.rankByNpc[n.id] = 'trưởng_lão'; }
  for (const n of world.npcs.filter(n => n.populationRole === 'low_disciple')) { n.sectRank = 'ngoại_môn'; sectRecord.rankByNpc[n.id] = 'ngoại_môn'; }
  sectRecord.rankByNpc[sectLeader.id] = 'chưởng_môn';
  for (const [role, factionId] of [['commoner', 'qingyun-village'], ['low_disciple', 'qingyun-sect'], ['elder', 'qingyun-sect'], ['sect_leader', 'qingyun-sect'], ['merchant', 'qingyun-traders'], ['tavern_staff', 'qingyun-city'], ['city_guard', 'qingyun-city'], ['repair_worker', 'qingyun-city'], ['quest_clerk', 'qingyun-city']]) {
    const faction = world.factions.find(f => f.id === factionId);
    for (const id of ids(role)) if (!faction.memberIds.includes(id)) faction.memberIds.push(id);
  }
  const merchantIds = ids('merchant');
  for (let i = 0; i < world.shops.length; i++) world.shops[i].ownerId = merchantIds[i % merchantIds.length];
  const captain = world.npcs.find(n => n.populationRole === 'city_guard');
  world.settlement.guardCaptainId = captain?.id ?? null;
  for (const npc of world.npcs) {
    if (npc.authorityRole === 'city_master') { npc.ambition = 'Giữ bình an cho Thanh Vân Thành'; npc.longGoal = 'Quản lý và bảo hộ cư dân trong thành'; npc.shortGoal = 'Xử lý công việc tại phủ thành chủ'; npc.homeId = 'city-lord-residence'; }
    if (npc.populationRole === 'independent_cultivator' && npc.authorityRole !== 'city_master') npc.populationDuty = 'Tán tu hoạt động độc lập theo tính cách, nhu cầu và năng lực.';
  }
  ensureNPCVisualStyles(world.npcs);
  world.population = { ...world.population, target: 108, quotas: { ...NPC_POPULATION_QUOTAS }, spawnVersion: 1, spawnSeed: seed, initialized: true };
  return world;
}

export function loadWorldPopulation(storage, map) {
  const solids = ['Collision','SectCampusCollision','SocietyCollision'].flatMap(name=>map.getObjectLayer(name)?.objects??[])
    .filter(o=>!o.properties?.some(p=>p.name==='retiredSect'&&p.value));
  const raw = storage.getItem(WORLD_POPULATION_SAVE_KEY);
  if (raw) {
    try {
      const world = JSON.parse(raw);
      if (world?.population?.initialized && world.population.spawnVersion === 1 && world.npcs?.length >= 108) {
        migrateWorldLayout(world,map);
        ensureWorldNpcAppearances(world);
        return { world, fresh: false };
      }
    } catch { /* A corrupt new-world save is preserved; do not import or overwrite legacy keys. */ }
    throw new Error('Bản lưu WORLD.REBUILD.1-C không hợp lệ. Đã giữ nguyên dữ liệu để tránh ghi đè.');
  }
  const seed = `qingyun-${createWorldUuid()}`;
  const world = makeFreshWorld(seed, map, solids);
  ensureWorldNpcAppearances(world);
  storage.setItem(WORLD_POPULATION_SAVE_KEY, JSON.stringify(world));
  return { world, fresh: true };
}

export function persistWorldPopulation(storage, world) { storage.setItem(WORLD_POPULATION_SAVE_KEY, JSON.stringify(world)); }
