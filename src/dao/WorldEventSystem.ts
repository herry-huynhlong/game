import type { DivineWorldSave, WorldEvent, WorldEventStatus } from './types';
import { applyDivineEvent } from './HeavenlyDisposition';
export class WorldEventSystem {
  constructor(private readonly events:WorldEvent[],private readonly world?:Pick<DivineWorldSave,'rewardedEventIds'> & Partial<Pick<DivineWorldSave,'npcs'>>){}
  publish(event:WorldEvent){if(this.events.some(e=>e.id===event.id))return;event.status??='occurred';this.events.push(event);if(this.world?.npcs)for(const consequence of applyDivineEvent(this.world as DivineWorldSave,event))this.publish(consequence);if(this.events.length>240)this.events.splice(0,this.events.length-240)}
  recent(limit=8){return this.events.slice(-limit).reverse()}
  on(type:string,listener:(event:WorldEvent)=>void){const handler=(event:Event)=>listener((event as CustomEvent<WorldEvent>).detail);window.addEventListener(`world:${type}`,handler);return()=>window.removeEventListener(`world:${type}`,handler)}
  emit(event:WorldEvent){if(this.events.some(e=>e.id===event.id))return;this.publish(event);window.dispatchEvent(new CustomEvent(`world:${event.type}`,{detail:event}))}
  setStatus(id:string,status:WorldEventStatus){const event=this.events.find(e=>e.id===id);if(!event)return false;event.status=status;return true}
  claimReward(id:string){if(!this.world||this.world.rewardedEventIds.includes(id))return false;const event=this.events.find(e=>e.id===id);if(!event||event.status!=='completed')return false;this.world.rewardedEventIds.push(id);event.status='rewarded';return true}
}
