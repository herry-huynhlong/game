import { REALMS, cultivationRequired } from './RealmConfig';
import { techniqueEffects } from './TechniqueSystem';
import type { CultivationSave, CultivationStats, SpiritualRootId, TechniqueId } from './CultivationTypes';
import { weaponBonus } from '../dao/GiftItemSystem';

export type CultivationView = { realm: string; level: number; xp: number; required: number; canBreakthrough: boolean; breakthroughLabel: string };

export function cultivationView(save: Pick<CultivationSave, 'realmIndex'|'realmLevel'|'xp'>): CultivationView {
  const index = Math.max(0, Math.min(REALMS.length - 1, save.realmIndex));
  const realm = REALMS[index];
  const required = cultivationRequired(index, save.realmLevel);
  const canBreakthrough = index < REALMS.length - 1 && save.realmLevel <= realm.maxLevel && save.xp >= required;
  return { realm: realm.name, level: save.realmLevel, xp: Math.min(save.xp, required), required, canBreakthrough, breakthroughLabel: realm.breakthrough };
}

export function cultivationStats(save: Pick<CultivationSave, 'realmIndex'|'realmLevel'|'spiritualRoot'|'technique'|'techniqueMastery'> & {equippedWeapon?:string|null;inventory?:{itemId:string;count:number}[]}): CultivationStats {
  const index = Math.max(0, Math.min(REALMS.length - 1, save.realmIndex));
  const realm = REALMS[index]; const level = Math.max(1, save.realmLevel);
  const tech = techniqueEffects(save.technique, save.techniqueMastery[save.technique] ?? 1);
  const floorHp = Math.max(0, level - 1) * 7;
  const floorMp = Math.max(0, level - 1) * 4;
  const floorAttack = Math.max(0, level - 1) * 1.5;
  const floorDefense = Math.floor(Math.max(0, level - 1) / 3);
  let hpMax = realm.hp + floorHp, mpMax = realm.mp + floorMp;
  let attack = realm.attack + floorAttack, defense = realm.defense + floorDefense;
  let hpRegen = 0, mpRegen = 5, skillDamage = 1;
  switch (save.spiritualRoot as SpiritualRootId) {
    case 'metal': attack *= 1.14; break;
    case 'wood': hpMax = Math.round(hpMax * 1.12); hpRegen += 2; break;
    case 'water': mpMax = Math.round(mpMax * 1.2); mpRegen += 3; break;
    case 'fire': skillDamage = 1.18; break;
    case 'earth': defense += 3; break;
  }
  hpMax = Math.round(hpMax * tech.hpMultiplier);
  return { hpMax, mpMax, attack: attack * tech.swordDamage + weaponBonus(save), defense, absorption: realm.absorption, skillDamage: skillDamage * tech.qiDamage, hpRegen: hpRegen + tech.meditationHp, mpRegen, techniqueRate: tech.cultivationRate };
}

export function addCultivationXp(save: CultivationSave, amount: number): boolean {
  const view = cultivationView(save);
  const wasReady = view.canBreakthrough;
  save.xp = Math.min(view.required, Math.max(0, save.xp + amount));
  return !wasReady && cultivationView(save).canBreakthrough;
}

export function breakthrough(save: CultivationSave): { success: boolean; from: string; to: string; oldRealmIndex: number; oldLevel: number } {
  const view = cultivationView(save);
  const result = { success: false, from: `${view.realm} tầng ${view.level}`, to: '', oldRealmIndex: save.realmIndex, oldLevel: save.realmLevel };
  if (!view.canBreakthrough) return result;
  save.xp = 0;
  if (save.realmLevel < REALMS[save.realmIndex].maxLevel) save.realmLevel++;
  else { save.realmIndex++; save.realmLevel = 1; }
  result.success = true;
  result.to = `${REALMS[save.realmIndex].name} tầng ${save.realmLevel}`;
  return result;
}

export function getZoneCultivation(position: { x: number; y: number }, zones: Array<{ name?: string; x?: number; y?: number; width?: number; height?: number; properties?: Array<{name:string;value:any}> }>, veins: Array<{x:number;y:number}>): { name: string; multiplier: number } {
  const contains = (z: typeof zones[number]) => position.x >= (z.x ?? 0) && position.y >= (z.y ?? 0) && position.x <= (z.x ?? 0) + (z.width ?? 0) && position.y <= (z.y ?? 0) + (z.height ?? 0);
  const zoneId = (z: typeof zones[number]) => z.properties?.find(p => p.name === 'zone')?.value;
  const training = zones.find(z => zoneId(z) === 'training' && contains(z));
  if (training) return { name: 'Sân Luyện Công', multiplier: 1.5 };
  const village = zones.find(z => zoneId(z) === 'village' && contains(z));
  if (village) return { name: 'Thanh Vân Thôn', multiplier: 1 };
  const forest = zones.find(z => zoneId(z) === 'forest' && contains(z));
  if (forest) {
    const nearVein = veins.some(v => Math.hypot(position.x - v.x, position.y - v.y) < 140);
    if (nearVein) return { name: 'Linh Mạch Ngọc Tuyền', multiplier: 2.2 };
    const variation = ((Math.floor(position.x / 192) * 7 + Math.floor(position.y / 192) * 11) % 5) * 0.1;
    return { name: 'Rừng Yêu Thú', multiplier: 0.9 + variation };
  }
  return { name: 'Thanh Vân Môn', multiplier: 1.15 };
}

export function formatRate(rate: number): string { return `${rate.toFixed(1)} tu vi/giây`; }

