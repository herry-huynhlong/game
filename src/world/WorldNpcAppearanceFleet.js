import { CharacterRenderer } from './CharacterRenderer.js';
import { validateAppearance } from './CharacterAppearance.js';
import { visualEquipment } from './CharacterEquipment.js';
import { weaponForNpc } from './WeaponCombat.js';
import { rodEquipped } from './HeavenShop.js';
import { appearanceSignature, ensureWorldNpcAppearances } from './NpcAppearanceProfiles.js';

export class WorldNpcAppearanceFleet {
  constructor(scene){
    this.scene=scene;
    this.entries=new Map();
    this.visible=0;
    this.fallbacks={};
  }

  update(time,dt){
    const {scene}=this;
    if(this.rosterCount!==scene.populationWorld.npcs.length){
      ensureWorldNpcAppearances(scene.populationWorld);
      this.rosterCount=scene.populationWorld.npcs.length;
    }
    this.visible=0;
    this.fallbacks={};
    let creationBudget=8;
    for(const {npc} of scene.scheduler.byId.values()){
      if(scene.characterRigPreview?.npc===npc)continue;
      const actor=scene.npcSprites.get(npc.id);
      if(!actor)continue;
      const record=npc.modularAppearance;
      let entry=this.entries.get(npc.id);
      const attack=scene.weaponAttackStates.get(npc.id);
      const reason=!record?'missing':rodEquipped(npc)?'fishing':attack&&time<attack.until?'combat':null;
      if(!npc.alive||!actor.visible||reason){
        if(entry?.renderer.root.visible)entry.renderer.root.setVisible(false);
        if(actor.alpha!==1)actor.setAlpha(1);
        if(reason&&npc.alive&&actor.visible)this.fallbacks[reason]=(this.fallbacks[reason]??0)+1;
        continue;
      }
      const equipped=visualEquipment(weaponForNpc(npc));
      if(!entry){
        if(creationBudget--<=0)continue;
        try{
          const renderer=new CharacterRenderer(scene,actor.x,actor.y,{...validateAppearance(record.look),weapon:equipped});
          renderer.root.setScale(.40);
          entry={renderer,record,elapsed:0,x:actor.x,y:actor.y,weapon:equipped};
          this.entries.set(npc.id,entry);
        }catch{
          this.fallbacks.invalid=(this.fallbacks.invalid??0)+1;
          continue;
        }
      }
      const {renderer}=entry;
      if(entry.record!==record||entry.weapon!==equipped){
        renderer.customize({...record.look,weapon:equipped});entry.record=record;entry.weapon=equipped;
      }
      this.visible++;
      // Barely transparent keeps Phaser's existing hit area interactive.
      if(actor.alpha!==.001)actor.setAlpha(.001);
      if(!renderer.root.visible){renderer.root.setVisible(true);entry.x=actor.x;entry.y=actor.y;}
      const x=Math.round(actor.x),y=Math.round(actor.y);
      if(renderer.root.x!==x||renderer.root.y!==y)renderer.root.setPosition(x,y).setDepth(actor.depth+.01);
      const possessed=scene.possessedNpcId===npc.id;
      const moving=actor.getData('moving');
      const direction=possessed?scene.playerFacing:actor.anims.currentAnim?.key.split('_').at(-1)??'down';
      const motion=moving?(possessed&&scene.keys?.SHIFT.isDown?'run':'walk'):'idle';
      entry.elapsed+=dt;
      if(!possessed&&entry.elapsed<72&&renderer.direction===direction&&renderer.motion===motion)continue;
      const distance=Math.hypot(actor.x-entry.x,actor.y-entry.y)/renderer.root.scaleX;
      renderer.advance(Math.min(160,entry.elapsed),motion,direction,Math.min(distance,18));
      entry.x=actor.x;entry.y=actor.y;entry.elapsed=0;
    }
  }

  report(){
    const npcs=this.scene.populationWorld.npcs;
    const records=npcs.filter(n=>n.modularAppearance);
    const valid=[];
    for(const n of records){try{valid.push(n);appearanceSignature(n.modularAppearance.look);}catch{valid.pop();}}
    const unique=new Set(valid.map(n=>appearanceSignature(n.modularAppearance.look)));
    return {total:npcs.length,modular:valid.length,legacy:npcs.length-valid.length,
      locked:records.filter(n=>n.modularAppearance.locked).length,duplicates:valid.length-unique.size,
      visible:this.visible,allocated:this.entries.size,temporaryFallbacks:{...this.fallbacks}};
  }
}
