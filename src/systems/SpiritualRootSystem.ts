import type { CultivationSave, SpiritualRootId } from './CultivationTypes';

export const SPIRITUAL_ROOTS: Record<SpiritualRootId, { name: string; element: string; description: string }> = {
  metal: { name: 'Kim linh căn', element: 'Kim', description: 'Kiếm thuật gây thêm sát thương.' },
  wood: { name: 'Mộc linh căn', element: 'Mộc', description: 'Sinh lực tối đa cao hơn, đả tọa hồi phục.' },
  water: { name: 'Thủy linh căn', element: 'Thủy', description: 'Linh lực dồi dào, hồi linh lực khi tu luyện.' },
  fire: { name: 'Hỏa linh căn', element: 'Hỏa', description: 'Kiếm Khí gây thêm sát thương.' },
  earth: { name: 'Thổ linh căn', element: 'Thổ', description: 'Phòng thủ và giảm sát thương nhận vào.' },
};

const LEGACY_ROOT: SpiritualRootId = 'water';
const ROOT_IDS = Object.keys(SPIRITUAL_ROOTS) as SpiritualRootId[];

export function stableRootForLegacySave(save: Partial<CultivationSave>): SpiritualRootId {
  const candidate = save.spiritualRoot;
  if (candidate && ROOT_IDS.includes(candidate)) return candidate;
  // Fixed migration choice: existing saves do not reroll on refresh.
  return LEGACY_ROOT;
}
