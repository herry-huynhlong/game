export const RECOVERY = {
  quietMs: 8000,
  rates: { travel: .005, idle: .01, meditation: .02, territory: .02, rooted: .025, safeSleep: .03 },
  careful: .8,
  seekShelter: .5,
  critical: .25,
  resume: .8,
  restBeast: .7,
  resumeBeast: .9,
} as const;

export type RecoveryMode = keyof typeof RECOVERY.rates;
export interface CombatHealthSave {
  lastDealtAt?: number;
  lastTakenAt?: number;
  lastAttackerId?: string;
  lastEngagedAt?: number;
}
export interface Recoverable {
  id?: string;
  alive: boolean;
  hp: number;
  combatHealth?: CombatHealthSave;
}

export function recordCombatDamage(source:Recoverable|undefined,target:Recoverable,now:number){
  if(source)(source.combatHealth??={}).lastDealtAt=now;
  const combat=target.combatHealth??={};
  combat.lastTakenAt=now;
  combat.lastAttackerId=source?.id;
}

export interface RecoveryStatus {
  engaged: boolean;
  waitMs: number;
  quietMs?: number;
  rate: number;
  mode: RecoveryMode;
}

export function recoverHealth(actor:Recoverable,maxHp:number,mode:RecoveryMode,engaged:boolean,now:number,delta:number):RecoveryStatus{
  const status=recoveryStatus(actor,maxHp,mode,engaged,now);
  if(engaged)(actor.combatHealth??={}).lastEngagedAt=now;
  if(status.rate>0&&delta>0){
    const readyAt=lastCombatAt(actor)+RECOVERY.quietMs;
    const elapsed=Math.max(0,Math.min(delta,now-readyAt));
    actor.hp=Math.min(maxHp,actor.hp+maxHp*status.rate*elapsed/1000);
  }
  return status;
}

const lastCombatAt=(actor:Recoverable)=>Math.max(actor.combatHealth?.lastDealtAt??-Infinity,
  actor.combatHealth?.lastTakenAt??-Infinity,actor.combatHealth?.lastEngagedAt??-Infinity);

export function recoveryStatus(actor:Recoverable,maxHp:number,mode:RecoveryMode,engaged:boolean,now:number):RecoveryStatus{
  const alive=actor.alive&&actor.hp>0;
  const last=lastCombatAt(actor);
  const waitMs=alive?engaged?RECOVERY.quietMs:Math.max(0,last+RECOVERY.quietMs-now):0;
  const quietMs=alive&&Number.isFinite(last)?engaged?0:Math.max(0,now-last):undefined;
  return {engaged:alive&&engaged,waitMs,quietMs,rate:alive&&actor.hp<maxHp&&!engaged&&waitMs===0?RECOVERY.rates[mode]:0,mode};
}

export function npcRecoveryThresholds(caution=50,courage=50){
  const temperament=(caution-courage)*.001;
  return {seek:RECOVERY.seekShelter+temperament,critical:RECOVERY.critical+temperament/2,
    resume:Math.max(.72,Math.min(.91,RECOVERY.resume+temperament)),careful:RECOVERY.careful+temperament/2};
}
