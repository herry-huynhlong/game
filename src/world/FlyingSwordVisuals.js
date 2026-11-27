import { visualFlightPose, FLIGHT } from './FlyingSword.js';
import {MARTIAL_WEAPONS} from '../dao/MartialRegistry.ts';

const dirs=['down','left','up','right'];
const vec={down:[0,1],left:[-1,0],up:[0,-1],right:[1,0]};
export const flightOffset=f=>f?f.altitude+(f.altitude>18&&f.phase.startsWith('Flying')?Math.round(Math.sin(f.total/110)*1.5):0):0;

export class FlyingSwordVisuals {
  constructor(scene){this.scene=scene;this.entries=new Map();this.pool=[];this.visible=0;}
  create(){
    const {scene}=this;
    return {
      shadow:scene.add.ellipse(0,0,24,8,0x142b22,.4),
      blade:scene.add.image(0,0,'flying-swords').setOrigin(.5),
      wake:scene.add.image(0,0,'flying-swords',8).setOrigin(.5),
      fallback:scene.add.image(0,0,'flying-swords').setOrigin(.5,1),
    };
  }
  update(controller){
    const {scene}=this;
    this.visible=0;
    for(const [id,entry] of this.entries){
      if(controller.active.has(id))continue;
      for(const sprite of Object.values(entry))sprite.setVisible(false);
      const actor=scene.npcSprites.get(id);
      if(actor?.flightFallback){actor.flightFallback=false;actor.showingModularPose=false;actor.setAlpha(1);}
      this.entries.delete(id);this.pool.push(entry);
    }
    for(const npc of controller.active.values()){
      let entry=this.entries.get(npc.id);
      const actor=scene.npcSprites.get(npc.id),f=npc.flight;
      if(!actor?.visible||!scene.inSceneryView(npc,100)){
        if(entry)for(const sprite of Object.values(entry))sprite.setVisible(false);
        continue;
      }
      if(!entry){entry=this.pool.pop()??this.create();this.entries.set(npc.id,entry);}
      this.visible++;
      const phase=f.phase,dir=Math.max(0,dirs.indexOf(f.heading)),[dx,dy]=vec[f.heading]??vec.down;
      const summon=phase==='SummonSword',dismiss=phase==='DismissSword',offset=flightOffset(f);
      const mount=visualFlightPose(f)?.mount??0;
      const opacity=summon?Math.min(1,f.phaseMs/FLIGHT.phases.SummonSword):
        dismiss?Math.max(0,1-f.phaseMs/FLIGHT.phases.DismissSword):1;
      const x=Math.round(npc.x),y=Math.round(npc.y-offset);
      const depth=npc.y+(f.altitude>9?1000+f.altitude:0);
      const blade=entry.blade;
      const arm=MARTIAL_WEAPONS[npc.equippedWeapon], isPhysical=arm?.kind==='jian'&&f.sword!=='qi-sword';
      const frame=dir+(f.sword==='qi-sword'?4:0), texture=isPhysical?'martial-arms':'flying-swords';
      const desired=isPhysical?arm.icon:frame;
      if(blade.texture.key!==texture||Number(blade.frame.name)!==desired)blade.setTexture(texture,desired);
      blade.setVisible(true).setAlpha(opacity)
        .setPosition(x+Math.round((1-mount)*10),y-1).setDepth(depth-.04)
        .setScale(1,dir%2===0 ? .66 : 1)
        .setRotation((isPhysical?Math.atan2(dy,dx)+Math.PI/2:0)+(phase==='FlyingTurn'?(dx||dy)*Math.sin(Math.min(1,f.phaseMs/240)*Math.PI)*.12:0));
      entry.shadow.setVisible(offset>2).setPosition(x,Math.round(npc.y)).setDepth(npc.y-.08)
        .setAlpha(Math.max(.15,.45-offset*.0045)).setScale(1+offset*.007,1+offset*.003);
      const usesRig=scene.characterRigPreview?.npc===npc&&scene.characterRigPreview.character.root.visible||
        scene.npcAppearanceFleet?.entries.get(npc.id)?.renderer.root.visible;
      entry.fallback.setVisible(!usesRig);
      if(!usesRig){
        if(entry.fallback.frame!==actor.frame)entry.fallback.setFrame(actor.frame);
        entry.fallback.setPosition(x,y).setDepth(depth);
        actor.showingModularPose=true;actor.flightFallback=true;actor.setAlpha(.001);
      }else actor.flightFallback=false;
      entry.wake.setVisible(offset>18&&f.speed>175).setAlpha(f.fast ? .75 : .44)
        .setPosition(x-dx*29,y-dy*22+3).setDepth(depth-.06)
        .setRotation(dir*Math.PI/2);
    }
  }
}
