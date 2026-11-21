import type { SimNPC } from './types';

const samples: Record<string,{id:string;profession:SimNPC['profession'];gender:SimNPC['gender']}> = {
  'qingyun-07': {id:'C01',profession:'nong_dan',gender:'nam'},
  'qingyun-01': {id:'C03',profession:'tu_si',gender:'nam'},
  'qingyun-12': {id:'C04',profession:'tu_si',gender:'nữ'},
};

/** The art review does not change persisted appearance or NPC attributes. */
export function prototypeAnimation(npc:SimNPC, action:string, enabled:boolean, possessedId:string|null):string|null {
  const sample=samples[npc.id];
  if(!enabled||!sample||sample.profession!==npc.profession||sample.gender!==npc.gender||
    npc.equippedWeapon||npc.id===possessedId||!/^(idle|walk)_(down|up|left|right)$/.test(action))return null;
  return `prototype-${sample.id}_${action}`;
}
