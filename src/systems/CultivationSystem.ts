import { REALMS, cultivationRequired, formatRealm, realmBase } from './RealmConfig';
import { techniqueEffects } from './TechniqueSystem';
import type { CultivationSave, CultivationStats, SpiritualRootId, TechniqueId } from './CultivationTypes';
import {combatTalent,gradePotential} from './CombatBalance';
import {MARTIAL_WEAPONS} from '../dao/MartialRegistry';
import {equippedInstance,type WeaponStack} from '../dao/WeaponInstances';
import { weaponBonus } from '../dao/GiftItemSystem';

export type CultivationView = { realm: string; level: number; xp: number; required: number; canBreakthrough: boolean; breakthroughLabel: string };

export function cultivationView(save: Pick<CultivationSave, 'realmIndex'|'realmLevel'|'xp'>): CultivationView {
  const index = Math.max(0, Math.min(REALMS.length - 1, save.realmIndex));
  const realm = REALMS[index];
  const required = cultivationRequired(index, save.realmLevel);
  const canBreakthrough = save.realmLevel>=1&&save.realmLevel<=realm.maxLevel&&save.xp>=required&&
    (save.realmLevel<realm.maxLevel||index<REALMS.length-1);
  return { realm: realm.name, level: save.realmLevel, xp: Math.min(save.xp, required), required, canBreakthrough, breakthroughLabel: realm.breakthrough };
}

type StatActor=Pick<CultivationSave,'realmIndex'|'realmLevel'|'spiritualRoot'|'technique'|'techniqueMastery'> & {
  id?:string; equippedWeapon?:string|null; equippedWeaponInstance?:string|null; inventory?:WeaponStack[];
  talent?:number; combatTalentTier?:number;
};
const legacyRealms=[
  {hp:100,mp:60,attack:19,defense:1},{hp:180,mp:110,attack:31,defense:5},
  {hp:280,mp:175,attack:47,defense:10},{hp:410,mp:260,attack:68,defense:16},
  {hp:580,mp:380,attack:94,defense:24},
];

export function legacyVitals(save:StatActor){
  const old=legacyRealms[Math.min(4,Math.max(0,save.realmIndex))]??legacyRealms[0];
  const floor=Math.max(0,save.realmLevel-1);
  const tech=techniqueEffects(save.technique,save.techniqueMastery?.[save.technique]??1);
  const hp=old.hp+floor*7,mp=old.mp+floor*4;
  return {hpMax:Math.round((save.spiritualRoot==='wood'?Math.round(hp*1.12):hp)*tech.hpMultiplier),
    mpMax:save.spiritualRoot==='water'?Math.round(mp*1.2):mp};
}

export function cultivationBreakdown(save:StatActor){
  const base=realmBase(save),talent=base.position?combatTalent(save):{name:'Phàm nhân',multiplier:1,tier:0};
  const tech=techniqueEffects(save.technique,save.techniqueMastery?.[save.technique]??1);
  const root=save.spiritualRoot;
  const id=save.equippedWeapon??'';
  const martial=MARTIAL_WEAPONS[id];
  const hasWeapon=save.inventory?.some(stack=>stack.itemId===id&&stack.count>0);
  const usable=Boolean(hasWeapon&&(equippedInstance({...save,id:save.id??''})?.durability??1)>0);
  const grade=martial?.grade??0;
  const potential=usable?gradePotential(base.position?.index??-1,grade):0;
  const oldWeapon=weaponBonus(save)||({iron_sword:3,iron_dao:4,training_crossbow:3}[id as 'iron_sword']??0);
  const weaponBonusRate=usable?(martial?.bonus??oldWeapon/100)*potential:0;
  const afterTalent=base.attack*talent.multiplier;
  const afterTechnique=afterTalent*(root==='metal'?1.14:1)*tech.swordDamage;
  const hpMax=base.hp*talent.multiplier*(root==='wood'?1.12:1)*tech.hpMultiplier;
  const mpMax=base.qi*(root==='water'?1.2:1);
  const stats={hpMax,mpMax,attack:afterTechnique*(1+weaponBonusRate),
    defense:base.defense*talent.multiplier*(root==='earth'?1.15:1),
    absorption:base.position?.realm.absorption??0,techniqueRate:tech.cultivationRate,
    skillDamage:(root==='fire'?1.18:1)*tech.qiDamage,
    hpRegen:hpMax*((root==='wood'?.02:0)+tech.meditationHp/100),
    mpRegen:mpMax*(root==='water'?.10:.07)};
  return {base,talent,afterTalent,afterTechnique,weaponBonusRate,potential,grade,stats};
}

export function cultivationStats(save:StatActor):CultivationStats {
  return cultivationBreakdown(save).stats;
}

export function addCultivationXp(save: CultivationSave, amount: number): boolean {
  const view = cultivationView(save);
  const wasReady = view.canBreakthrough;
  save.xp = Math.min(view.required, Math.max(0, save.xp + amount));
  return !wasReady && cultivationView(save).canBreakthrough;
}

export function breakthrough(save: CultivationSave): { success: boolean; from: string; to: string; oldRealmIndex: number; oldLevel: number } {
  const view = cultivationView(save);
  const result = { success: false, from: formatRealm(save), to: '', oldRealmIndex: save.realmIndex, oldLevel: save.realmLevel };
  if (!view.canBreakthrough) return result;
  save.xp = 0;
  if (save.realmLevel < REALMS[save.realmIndex].maxLevel) save.realmLevel++;
  else { save.realmIndex++; save.realmLevel = 1; }
  result.success = true;
  result.to = formatRealm(save);
  return result;
}

export function advancesQiMinor(save: Pick<CultivationSave,'realmIndex'|'realmLevel'>) {
  return save.realmIndex===0&&save.realmLevel>=1&&save.realmLevel<REALMS[0].maxLevel;
}

export function advanceQiMinor(save: CultivationSave) {
  const attained:string[]=[];
  while(advancesQiMinor(save)){
    const cost=cultivationRequired(0,save.realmLevel);
    if(save.xp<cost)break;
    save.xp-=cost;
    save.realmLevel++;
    attained.push(formatRealm(save));
  }
  if(attained.length&&save.realmLevel===REALMS[0].maxLevel)
    save.xp=Math.min(save.xp,cultivationRequired(0,save.realmLevel));
  return attained;
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

