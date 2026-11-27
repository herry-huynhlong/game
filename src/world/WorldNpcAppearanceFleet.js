import {applyProfession} from './ProfessionAppearance.js';
import { visualFlightPose } from './FlyingSword.js';
import { flightOffset } from './FlyingSwordVisuals.js';
import { skyStepPose } from './SkyStep.js';
import { CharacterRenderer } from './CharacterRenderer.js';
import { validateAppearance } from './CharacterAppearance.js';
import { visualEquipment } from './CharacterEquipment.js';
import { weaponForNpc } from './WeaponCombat.js';
import { rodEquipped } from './HeavenShop.js';
import { appearanceSignature, ensureWorldNpcAppearances } from './NpcAppearanceProfiles.js';

const farmStrokes=[[0,0,0],[1,2,-3],[3,4,-4],[4,3,3],[3,2,4],[1,0,2]].map(([bend,x,y])=>({bend,x,y}));

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
    const zoom=scene.cameras.main.zoom;
    this.distant=zoom<(this.distant ? .68 : .60);
    const poseInterval=this.distant?144:72;
    let creationBudget=8;
    for(const {npc} of scene.scheduler.byId.values()){
      if(scene.characterRigPreview?.npc===npc)continue;
      const actor=scene.npcSprites.get(npc.id);
      if(!actor)continue;
      const record=npc.modularAppearance;
      let entry=this.entries.get(npc.id);
      if(!npc.alive||!actor.visible){
        if(entry?.renderer.root.visible)entry.renderer.root.setVisible(false);
        actor.showingModularPose=false;
        if(actor.alpha!==1)actor.setAlpha(1);
        continue;
      }
      const meditation=scene.cultivation?.poseFor(npc,time);
      const reason=!record?'missing':!meditation&&rodEquipped(npc)?'fishing':null;
      if(reason){
        if(entry?.renderer.root.visible)entry.renderer.root.setVisible(false);
        actor.showingModularPose=false;
        if(actor.alpha!==1)actor.setAlpha(1);
        if(reason&&npc.alive&&actor.visible)this.fallbacks[reason]=(this.fallbacks[reason]??0)+1;
        continue;
      }
      const attack=scene.weaponAttackStates.get(npc.id);
      const flight=npc.flight,step=npc.skyStep,skyPose=skyStepPose(step);
      const arm=weaponForNpc(npc),equipped=visualEquipment(arm);
      if(!entry){
        if(creationBudget--<=0){actor.showingModularPose=false;continue;}
        try{
          const renderer=new CharacterRenderer(scene,actor.x,actor.y,{...validateAppearance(record.look),weapon:equipped});
          renderer.root.setScale(npc.minor?.32:.40);
          entry={renderer,record,elapsed:0,x:actor.x,y:actor.y,weapon:equipped};
          this.entries.set(npc.id,entry);
        }catch{
          actor.showingModularPose=false;
          this.fallbacks.invalid=(this.fallbacks.invalid??0)+1;
          continue;
        }
      }
      const {renderer}=entry;
      renderer.martialWeapon=arm?.grade!==undefined?arm:null;
      if(renderer.root.scaleX!==(npc.minor?.32:.40))renderer.root.setScale(npc.minor?.32:.40);
      if(entry.record!==record||entry.weapon!==equipped){
        renderer.customize({...record.look,weapon:equipped});entry.record=record;entry.weapon=equipped;
      }
      this.visible++;
      // Barely transparent keeps Phaser's existing hit area interactive.
      actor.showingModularPose=true;
      if(actor.alpha!==.001)actor.setAlpha(.001);
      if(!renderer.root.visible){renderer.root.setVisible(true);entry.x=actor.x;entry.y=actor.y;}
      const cast=scene.martialCombat?.casts.get(npc.id);
      const x=Math.round(actor.x),y=Math.round(actor.y-flightOffset(flight)-(skyPose?.height??0)-(scene.ramparts?.visualHeight(npc)??0));
      if(renderer.root.alpha!==(skyPose?.alpha??1))renderer.root.setAlpha(skyPose?.alpha??1);
      if(renderer.root.x!==x||renderer.root.y!==y)renderer.root.setPosition(x,y);
      if(renderer.root.depth!==actor.depth+.01)renderer.root.setDepth(actor.depth+.01);
      const possessed=scene.possessedNpcId===npc.id;
      const moving=actor.getData('moving');
      const key=actor.anims.currentAnim?.key;
      if(entry.animKey!==key){entry.animKey=key;entry.facing=key?.slice(key.lastIndexOf('_')+1);}
      const socialDirection=scene.society?.isSeated(npc)&&scene.society.seatFor(npc)?.facing;
      const direction=cast?.direction??(socialDirection||(step?.heading??flight?.heading??(possessed?scene.playerFacing:entry.facing??'down')));
      const motion=!flight&&!step&&moving?(possessed&&scene.keys?.SHIFT.isDown?'run':'walk'):'idle';
      const fighting=attack&&time<attack.until;
      if(fighting&&entry.combatStarted!==attack.started){
        const move={12:'saberSweep',16:'swordThrust',20:'swordSlash'}[attack.row];
        if(move){renderer.combat.cancel();renderer.combat.start(move,['down','up','left','right'][attack.dirIndex]??direction);}
        entry.combatStarted=attack.started;
      }
      const hadFlight=Boolean(renderer.flightWeapon);
      renderer.flightWeapon=Boolean(flight||step);
      renderer.flightPose=skyPose??visualFlightPose(flight);
      renderer.meditation=cast?null:meditation;
      renderer.martialPose=cast&&{pose:cast.skill.delivery,phase:cast.phase,age:scene.martialCombat.clock-cast.at,
        cinema:scene.martialCombat.cinematicPose(cast)};
      const farming=npc.action==='work'&&npc.decisionSlot?.includes('farm')&&!moving;
      const rhythm=Math.floor(time/135+npc.id.length)%6;
      const previousWork=renderer.workPose;
      renderer.workPose=farming?farmStrokes[rhythm]:null;
      entry.elapsed+=dt;
      if(!possessed&&!step&&!cast&&!entry.hadCast&&!renderer.combat.action&&hadFlight===Boolean(flight)&&entry.elapsed<(flight?52:poseInterval)&&renderer.direction===direction&&renderer.motion===motion)continue;
      const distance=Math.hypot(actor.x-entry.x,actor.y-entry.y)/renderer.root.scaleX;
      renderer.advance(Math.min(160,entry.elapsed),motion,direction,Math.min(distance,18));
      if(flight||step||hadFlight||cast||entry.hadCast||previousWork&&!renderer.workPose)renderer.apply();
      entry.hadCast=Boolean(cast);
      applyProfession(renderer,npc,farming?(npc.farmPose==='harvest'?13:npc.farmPose==='water'?14:11):null);
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
