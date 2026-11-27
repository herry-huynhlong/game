import {combatTalent,healthAtNewMax} from '../systems/CombatBalance';
import {cultivationStats,legacyVitals} from '../systems/CultivationSystem';
import {REALMS,cultivationRequired,realmPosition} from '../systems/RealmConfig';
import {faunaStats,FAUNA_SPECIES} from './MonsterRegistry';
import type {DivineWorldSave} from './types';

export const COMBAT_BALANCE_VERSION=1;

export function migrateCombatBalance(world:DivineWorldSave){
  if((world.combatBalanceVersion??0)>=COMBAT_BALANCE_VERSION)return false;
  for(const npc of world.npcs){
    const before=legacyVitals(npc);
    // A trial already booked at the old cap keeps its progress and outcome.
    // All other ninth-layer saves retain both the layer and their accumulated XP.
    if(npc.alive&&npc.tribulation&&['travel','cloud','warning','strike'].includes(npc.tribulation.phase)&&npc.realmLevel===9){
      npc.realmLevel=10;
      npc.xp=Math.max(npc.xp,cultivationRequired(npc.realmIndex,10));
    }
    if(realmPosition(npc)){
      npc.combatTalentTier= combatTalent(npc).tier;
      if(npc.alive)npc.lifespan=Math.max(npc.lifespan,REALMS[npc.realmIndex].lifespan);
    }
    const after=cultivationStats(npc);
    npc.hp=npc.alive?healthAtNewMax(npc.hp,before.hpMax,after.hpMax):0;
    npc.mp=healthAtNewMax(npc.mp,before.mpMax,after.mpMax);
  }
  for(const beast of world.environment?.fauna??[]){
    if(!FAUNA_SPECIES[beast.species])continue;
    const next=faunaStats(beast);
    beast.hp=beast.alive?healthAtNewMax(beast.hp,beast.maxHp,next.hpMax):0;
    beast.maxHp=next.hpMax;
    if(beast.qi!==undefined)beast.qi=healthAtNewMax(beast.qi,100,next.qiMax);
    // Transient projectiles stored old absolute force values.
  }
  if(world.environment){
    world.environment.monsterProjectiles=[];
    world.environment.monsterHazards=[];
  }
  world.combatBalanceVersion=COMBAT_BALANCE_VERSION;
  return true;
}
