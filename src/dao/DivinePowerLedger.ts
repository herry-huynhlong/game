import { REALMS } from '../systems/RealmConfig';
import type { DivineWorldSave, HeavenSave } from './types';



type Rank = {realmIndex?: number; realmLevel?: number};
type CavePoint = {siteId: string; floor: number; x: number; y: number};
type Subject = Rank & {
  id: string; name: string; x: number; y: number; underground?: CavePoint;
  zoneId?: string; ascended?: boolean;
};
type Kind = 'breakthrough' | 'npc-death' | 'fauna-death' | 'other' | 'spend';
export type DivinePowerEntry = {
  day: number; minute: number; kind: Kind; points: number; cause: string;
  name?: string; realm?: string; level?: number; zoneId?: string; x?: number; y?: number;
  siteId?: string; floor?: number;
};
export type DivinePowerSave = {
  opening: number; balance: number; earned: number; spent: number;
  breakthrough: number; npcDeath: number; faunaDeath: number; day: number; today: number;
  recent: DivinePowerEntry[]; credited: Record<string, true>;
};

export function realmPower(name: string) { return REALMS.find(realm=>realm.name===name)?.rank??(name==='Chân Tiên'?10:0); }
const realmAt = (index?: number) => index === undefined ? undefined : REALMS[index];
const nameAt = (index?: number) => realmAt(index)?.name ?? 'Phàm nhân';
const levelOf = (rank: Rank) => Number.isInteger(rank.realmLevel) && rank.realmLevel! > 0 ? rank.realmLevel! : 0;
const deathPoints = (rank: Rank) => (realmAt(rank.realmIndex)?.rank??0)*Math.min(10,levelOf(rank))*2;

export function initDivinePower(heaven: HeavenSave, day: number) {
  const balance = heaven.divinePower;
  return heaven.divineLedger ??= {
    opening: balance, balance, earned: 0, spent: 0, breakthrough: 0, npcDeath: 0,
    faunaDeath: 0, day, today: 0, recent: [], credited: {},
  };
}

function append(ledger: DivinePowerSave, entry: DivinePowerEntry): DivinePowerSave {
  const earned = Math.max(0, entry.points);
  return {
    ...ledger, balance: ledger.balance + entry.points, earned: ledger.earned + earned,
    spent: ledger.spent + Math.max(0, -entry.points),
    breakthrough: ledger.breakthrough + (entry.kind === 'breakthrough' ? earned : 0),
    npcDeath: ledger.npcDeath + (entry.kind === 'npc-death' ? earned : 0),
    faunaDeath: ledger.faunaDeath + (entry.kind === 'fauna-death' ? earned : 0),
    day: entry.day, today: (ledger.day === entry.day ? ledger.today : 0) + earned,
    recent: [...ledger.recent.slice(-59), entry],
  };
}

/** Existing wallet writers remain authoritative. Record their committed balance changes. */
export function syncDivinePower(world: DivineWorldSave, cause?: string) {
  const ledger = initDivinePower(world.heaven, world.clock.day);
  const points = world.heaven.divinePower - ledger.balance;
  if (!points || !Number.isFinite(points)) return ledger;
  const {day, minute} = world.clock;
  return world.heaven.divineLedger = append(ledger, {
    day, minute, points, kind: points < 0 ? 'spend' : 'other',
    cause: cause ?? (points < 0 ? 'Tiêu hao Thần Lực' : 'Nguồn Thần Lực khác'),
  });
}

function credit(world: DivineWorldSave | undefined, keys: string[], kind: Kind, subject: Subject, points: number, cause: string) {
  if (!world?.heaven || !world.clock || !keys.length || points <= 0) return false;
  const ledger = syncDivinePower(world);
  if (keys.some(key => Object.hasOwn(ledger.credited, key))) return false;
  const {day, minute} = world.clock;
  const position = subject.underground ?? subject;
  const next = append(ledger, {day, minute, kind, points, cause, name: subject.name,
    realm: nameAt(subject.realmIndex), level: levelOf(subject), zoneId: subject.zoneId,
    x: position.x, y: position.y, siteId: subject.underground?.siteId, floor: subject.underground?.floor});
  for (const key of keys) next.credited[key] = true;
  world.heaven.divineLedger = next;
  world.heaven.divinePower = next.balance;
  world.heaven.divinePowerMax = Math.max(world.heaven.divinePowerMax, next.balance);
  return true;
}

export function creditBreakthrough(world: DivineWorldSave | undefined, subject: Subject, prior: Rank, cause = 'Đột phá thành công') {
  const to = subject.realmIndex;
  if (!world?.heaven || to === undefined || !realmAt(to) || subject.ascended) return false;
  const from = prior.realmIndex ?? -1;
  const keys: string[] = [];
  let points = 0;
  const credited = world.heaven.divineLedger?.credited ?? {};
  for (let r = Math.max(0, from); r <= to; r++) {
    const realm = REALMS[r];
    if (!realm) continue;
    const end = Math.min(realm.maxLevel, r === to ? levelOf(subject) : realm.maxLevel);
    for (let tier = r === from ? levelOf(prior) + 1 : 1; tier <= end; tier++) {
      const key = `breakthrough:${subject.id}:${realm.id}:${tier}`;
      if (Object.hasOwn(credited, key)) continue;
      keys.push(key);
      points += realm.rank;
    }
  }
  return credit(world, keys, 'breakthrough', subject, points, cause);
}

export function creditDeath(world: DivineWorldSave | undefined, subject: Subject, kind: 'npc-death' | 'fauna-death', cause: string,
  life = subject.id) {
  if (subject.ascended) return false;
  return credit(world, [`${kind}:${life}`], kind, subject, deathPoints(subject), cause);
}
