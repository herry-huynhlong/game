import { GIFT_WEAPONS, type GiftWeaponId } from './GiftItemSystem';
import type { SimNPC } from './types';

/** Resolve the rendered weapon from persisted equipment, inventory, and realm rules. */
export function equippedWeaponVisual(npc: SimNPC): GiftWeaponId | null {
  const id = npc.equippedWeapon as GiftWeaponId | null | undefined;
  const weapon = id ? GIFT_WEAPONS[id] : undefined;
  if (!weapon || npc.realmIndex < weapon.minRealm) return null;
  return npc.inventory.some((item) => item.itemId === id && item.count > 0) ? id ?? null : null;
}

export function weaponTextureKey(id: GiftWeaponId): string {
  return `weapon-${id}`;
}

/** Character and weapon sheets share the same 8x36 frame layout. */
export function weaponFrameIndex(frameName: string | number): number {
  const index = Number(frameName);
  return Number.isInteger(index) && index >= 0 && index < 288 ? index : 0;
}
