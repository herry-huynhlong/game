export interface RealmDefinition {
  id: string;
  name: string;
  maxLevel: number;
  hp: number;
  mp: number;
  attack: number;
  defense: number;
  absorption: number;
  breakthrough: string;
}

// Higher realms are data-only extension points in this part.
export const REALMS: RealmDefinition[] = [
  { id: 'qi', name: 'Luyện Khí', maxLevel: 9, hp: 100, mp: 60, attack: 19, defense: 1, absorption: 4, breakthrough: 'Tích lũy đủ tu vi tầng 9 để kết thành Trúc Cơ.' },
  { id: 'foundation', name: 'Trúc Cơ', maxLevel: 9, hp: 180, mp: 110, attack: 31, defense: 5, absorption: 7, breakthrough: 'Cơ chế các đại cảnh giới sau sẽ được triển khai ở phần tiếp theo.' },
  { id: 'golden-core', name: 'Kim Đan', maxLevel: 9, hp: 280, mp: 175, attack: 47, defense: 10, absorption: 10, breakthrough: 'Cơ chế các đại cảnh giới sau sẽ được triển khai ở phần tiếp theo.' },
  { id: 'nascent-soul', name: 'Nguyên Anh', maxLevel: 9, hp: 410, mp: 260, attack: 68, defense: 16, absorption: 13, breakthrough: 'Cơ chế các đại cảnh giới sau sẽ được triển khai ở phần tiếp theo.' },
  { id: 'divine-transformation', name: 'Hóa Thần', maxLevel: 9, hp: 580, mp: 380, attack: 94, defense: 24, absorption: 16, breakthrough: 'Cơ chế các đại cảnh giới sau sẽ được triển khai ở phần tiếp theo.' },
];

export function cultivationRequired(realmIndex: number, level: number): number {
  const realm = Math.max(0, Math.min(REALMS.length - 1, Math.floor(realmIndex)));
  const floor = Math.max(1, Math.floor(level));
  if (realm === 0) return Math.round(80 + (floor - 1) * 35 + Math.max(0, floor - 4) ** 2 * 5);
  return Math.round(600 + realm * 280 + (floor - 1) * (130 + realm * 35));
}
export type RealmPosition = { realmIndex?: number; realmLevel?: number };

export function realmPosition(save: RealmPosition) {
  const { realmIndex, realmLevel } = save;
  if (typeof realmIndex !== 'number' || !Number.isInteger(realmIndex) ||
      typeof realmLevel !== 'number' || !Number.isInteger(realmLevel)) return null;
  const realm = REALMS[realmIndex];
  return realm && realmLevel >= 1 && realmLevel <= realm.maxLevel
    ? { realm, level: realmLevel, index: realmIndex }
    : null;
}

export function formatRealm(save: RealmPosition): string {
  const position = realmPosition(save);
  return position ? `${position.realm.name} tầng ${position.level}` : 'Chưa có tu vi';
}
