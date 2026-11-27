const MOVE_INTERVAL = [0, 100, 420];
const THINK_INTERVAL = [1000, 2200, 5500];

export function npcVisibleInView(entry,view,controlled){
  const {npc}=entry;
  const horizontalPadding=controlled?92:entry.visible?46:38;
  const lowerPadding=controlled?92:entry.visible?72:62;
  return npc.alive&&!npc.underground&&npc.x>=view.x-horizontalPadding&&npc.x<=view.right+horizontalPadding&&
    npc.y>=view.y-horizontalPadding&&npc.y<=view.bottom+lowerPadding;
}

export class NpcSimulationScheduler {
  constructor(npcs) {
    this.time = 0;
    this.counts = [0, 0, 0];
    this.byId = new Map();
    this.ordinal = 0;
    for (const npc of npcs) this.register(npc);
  }

  register(npc) {
    if (this.byId.has(npc.id)) return;
    const index = this.ordinal++;
    this.byId.set(npc.id, {
      npc, index, level: 2, visible: false, lastMove: this.time, retryAt: 0,
      moveDue: this.time + 1 + index * 29 % MOVE_INTERVAL[2],
      thinkDue: this.time + 1000 + index * 137 % 1100,
      minutes: 0, workMinutes: 0, workKey: '',
    });
  }

  advance(delta, view, possessedId, urgentIds) {
    this.time += delta;
    this.counts.fill(0);
    const moving = [], thinking = [];
    for (const entry of this.byId.values()) {
      const { npc } = entry;
      const distance = Math.max(view.x - npc.x, npc.x - view.right, view.y - npc.y, npc.y - view.bottom);
      const previous = entry.level;
      const controlled = npc.id === possessedId;
      entry.visible=npcVisibleInView(entry,view,controlled);
      entry.level = controlled || urgentIds.has(npc.id) || distance <= (previous === 0 ? 132 : 84)
        ? 0 : distance <= (previous < 2 ? 610 : 490) ? 1 : 2;
      if (!npc.alive || npc.underground || npc.minor) {
        entry.lastMove=this.time;
        entry.minutes=entry.workMinutes=0;
        continue;
      }
      this.counts[entry.level]++;
      if (controlled) {
        entry.lastMove = this.time;
        entry.minutes = entry.workMinutes = 0;
        continue;
      }
      if (entry.level < previous) {
        entry.moveDue = Math.min(entry.moveDue, this.time);
        entry.thinkDue = Math.min(entry.thinkDue, this.time + entry.index * 23 % 320);
      }
      if (entry.level === 0 || entry.moveDue <= this.time) moving.push(entry);
      if (entry.minutes && entry.thinkDue <= this.time) thinking.push(entry);
    }
    moving.sort((a,b) => a.level - b.level || a.moveDue - b.moveDue);
    thinking.sort((a,b) => a.level - b.level || a.thinkDue - b.thinkDue);
    return { moving, thinking };
  }

  accrueMinute(possessedId, arrivalTolerance=()=>25) {
    for (const entry of this.byId.values()) {
      const { npc } = entry;
      if (!npc.alive || npc.underground || npc.minor || npc.id === possessedId) continue;
      entry.minutes++;
      const target = npc.actionTarget ?? npc.home ?? npc;
      const key = npc.goalAction + ':' + target.x + ':' + target.y;
      if (key !== entry.workKey) { entry.workKey = key; entry.workMinutes = 0; }
      if (npc.goalAction === 'idle' || Math.hypot(npc.x-target.x,npc.y-target.y) < arrivalTolerance(npc)) entry.workMinutes++;
    }
  }

  finishDecision(entry) {
    entry.minutes = entry.workMinutes = 0;
    entry.lastDecision = this.time;
    entry.thinkDue = this.time + THINK_INTERVAL[entry.level];
  }

  elapsedForMove(entry,maxDelta=MOVE_INTERVAL[2]+60) {
    const delta = Math.min(maxDelta, Math.max(0,this.time-entry.lastMove));
    entry.lastMove = this.time;
    entry.moveDue = this.time + MOVE_INTERVAL[entry.level];
    return delta;
  }
}
