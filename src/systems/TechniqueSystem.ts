import type { TechniqueId } from './CultivationTypes';

export const TECHNIQUES: Record<TechniqueId, { name: string; description: string }> = {
  qingyun: { name: 'Thanh Vân Quyết', description: 'Tăng tốc độ hấp thu linh khí.' },
  sword: { name: 'Ngự Kiếm Quyết', description: 'Tăng sát thương kiếm và Kiếm Khí.' },
  longevity: { name: 'Trường Sinh Quyết', description: 'Tăng sinh lực, hồi phục khi đả tọa.' },
};

export interface TechniqueEffects {
  cultivationRate: number;
  swordDamage: number;
  qiDamage: number;
  hpMultiplier: number;
  meditationHp: number;
  mastery: number;
}

export function techniqueEffects(id: TechniqueId, mastery: number): TechniqueEffects {
  const level = Math.max(1, Math.min(10, Math.floor(mastery || 1)));
  const masteryBonus = 1 + (level - 1) * 0.025;
  if (id === 'qingyun') return { cultivationRate: 1.28 * masteryBonus, swordDamage: 1, qiDamage: 1, hpMultiplier: 1, meditationHp: 0, mastery: level };
  if (id === 'sword') return { cultivationRate: 1.05 * masteryBonus, swordDamage: 1.16 * masteryBonus, qiDamage: 1.2 * masteryBonus, hpMultiplier: 1, meditationHp: 0, mastery: level };
  return { cultivationRate: 1.06 * masteryBonus, swordDamage: 1, qiDamage: 1, hpMultiplier: 1.18 * masteryBonus, meditationHp: 2 + Math.floor((level - 1) / 3), mastery: level };
}

export function addTechniquePractice(save: { techniqueMastery: Record<TechniqueId, number>; techniqueProgress: Record<TechniqueId, number> }, id: TechniqueId, amount: number): boolean {
  const before = save.techniqueMastery[id];
  if (before >= 10) return false;
  let progress = save.techniqueProgress[id] + amount;
  while (progress >= 100 && save.techniqueMastery[id] < 10) { progress -= 100; save.techniqueMastery[id]++; }
  save.techniqueProgress[id] = save.techniqueMastery[id] >= 10 ? 0 : progress;
  return before !== save.techniqueMastery[id];
}
