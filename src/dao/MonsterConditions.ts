import type { MonsterEffect, SimNPC } from './types';

export const monsterRooted=(npc:SimNPC,now:number)=>(npc.monsterAfflictions?.rootUntil??0)>now;

export function applyMonsterCondition(npc:SimNPC,effect:MonsterEffect,sourceId:string,now:number){
  if(!npc.alive)return;
  if(effect==='drain'){npc.mp=Math.max(0,npc.mp-11);return;}
  if(effect==='root'){
    const conditions=npc.monsterAfflictions??={};
    if((conditions.rootGuardUntil??0)>now)return;
    conditions.rootUntil=now+1250;
    conditions.rootGuardUntil=now+5400;
  }
  if(effect==='poison'){
    const conditions=npc.monsterAfflictions??={};
    if((conditions.poison?.until??0)>now)return;
    conditions.poison={sourceId,until:now+3600,next:now+800};
  }
}

export function tickMonsterConditions(npc:SimNPC,now:number,safe:boolean,damage:(source:string,eventId:string)=>void){
  const state=npc.monsterAfflictions;
  if(!state)return;
  if(safe||!npc.alive){delete npc.monsterAfflictions;return;}
  const poison=state.poison;
  if(poison&&now>=poison.until)delete state.poison;
  else if(poison&&now>=poison.next){
    const pulse=poison.next;poison.next+=800;damage(poison.sourceId,`fauna-poison:${npc.id}:${pulse}`);
  }
  if((state.rootGuardUntil??0)<=now){delete state.rootUntil;delete state.rootGuardUntil;}
  if(!state.poison&&!state.rootGuardUntil)delete npc.monsterAfflictions;
}
