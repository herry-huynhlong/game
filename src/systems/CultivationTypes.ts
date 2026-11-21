export type SpiritualRootId = 'metal' | 'wood' | 'water' | 'fire' | 'earth';
export type TechniqueId = 'qingyun' | 'sword' | 'longevity';

export interface CultivationSave {
  realmIndex: number;
  realmLevel: number;
  xp: number;
  spiritualRoot: SpiritualRootId;
  technique: TechniqueId;
  techniqueMastery: Record<TechniqueId, number>;
  techniqueProgress: Record<TechniqueId, number>;
}

export type CultivationStats = {
  hpMax: number;
  mpMax: number;
  attack: number;
  defense: number;
  absorption: number;
  skillDamage: number;
  hpRegen: number;
  mpRegen: number;
  techniqueRate: number;
};
