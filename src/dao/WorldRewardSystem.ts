import { creditDeath } from './DivinePowerLedger';
import type { BeastSiegeSave, DivineWorldSave, SimNPC } from './types';
import { DivineResourceSystem } from './DivineResourceSystem';
import { WorldEventSystem } from './WorldEventSystem';

export class WorldRewardSystem {
  static claimAscendantDeath(world:DivineWorldSave,events:WorldEventSystem,eventId:string,npc:SimNPC){
    const event=world.events.find(e=>e.id===eventId);
    if(npc.alive||event?.type!=='npc-death'||event.actorId!==npc.id||event.status!=='completed'||!events.claimReward(eventId))return false;
    return creditDeath(world,npc,'npc-death',npc.deathCause??'Tử vong');
  }
  static claimBeastSiege(world:DivineWorldSave,events:WorldEventSystem,siege:BeastSiegeSave){
    const event=world.events.find(e=>e.id===siege.id);
    if(siege.status!=='completed'||siege.remaining!==0||event?.type!=='beast-siege'||event.status!=='completed'||!events.claimReward(siege.id))return false;
    DivineResourceSystem.awardPower(world.heaven,20);DivineResourceSystem.awardFragments(world.heaven,5);siege.status='rewarded';return true;
  }
}
