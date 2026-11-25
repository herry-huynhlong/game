import { visualFlightPose } from './FlyingSword.js';
import { flightOffset } from './FlyingSwordVisuals.js';
import { MountSystem, mountedPositionAllowed } from './MountSystem.js';
import { AXES, facing } from './CharacterCombat.js';
import { weaponForNpc, isInWeaponArc } from './WeaponCombat.js';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { damageForStrike } from '../systems/CombatSystem.ts';
import { createWorldUuid } from './WorldId.ts';
import { DEFAULT_APPEARANCE, validateAppearance } from './CharacterAppearance.js';
import { visualEquipment } from './CharacterEquipment.js';
import { CharacterRenderer } from './CharacterRenderer.js';

export const CHARACTER_EDITOR_SAVE = 'tvy-xianxia-character-editor-v1';

export class WorldCharacterPreview {
  constructor(scene, npc, sprite) {
    this.scene=scene;
    this.npc=npc;
    this.sprite=sprite;
    let appearance=DEFAULT_APPEARANCE;
    try {
      const saved=localStorage.getItem(CHARACTER_EDITOR_SAVE);
      if(saved) appearance=validateAppearance(JSON.parse(saved));
    } catch { /* A malformed editor file does not interfere with world startup. */ }
    this.character=new CharacterRenderer(scene,sprite.x,sprite.y,appearance);
    this.character.root.setScale(.42).setVisible(false);
    this.position={x:sprite.x,y:sprite.y};
    this.mount=new MountSystem(scene,this.character,.76);
    this.character.onActionEvent=(event,action)=>this.handleActionEvent(event,action);
  }

  sync(delta, weapon, useLegacyPose) {
    const {npc,sprite,character}=this;
    const possessed=this.scene.possessedNpcId===npc.id;
    const visible=npc.alive&&sprite.visible&&(!useLegacyPose||this.mount.attached);
    if(!npc.alive||(!possessed&&this.mount.state!=='absent'))this.reset();
    if(sprite.alpha!==(visible?0:1)) sprite.setAlpha(visible?0:1);
    if(character.root.visible!==visible) character.root.setVisible(visible);
    const distance=Math.hypot(sprite.x-this.position.x,sprite.y-this.position.y);
    this.position.x=sprite.x;
    this.position.y=sprite.y;
    if(!visible) return false;
    const equipped=visualEquipment(weapon);
    if(character.appearance.weapon!==equipped) character.customize({...character.appearance,weapon:equipped});
    const f=npc.flight;
    const direction=f?.heading??(possessed?this.scene.playerFacing:sprite.anims.currentAnim?.key.split('_').at(-1)??'down');
    const running=this.scene.possessedNpcId===npc.id&&this.scene.keys?.SHIFT?.isDown;
    const motion=!f&&sprite.getData('moving')?(running?'run':'walk'):'idle';
    character.root.setPosition(Math.round(sprite.x),Math.round(sprite.y-flightOffset(f)-this.scene.ramparts.height(npc))).setDepth(sprite.depth+.01);
    this.mount.render(sprite.x,sprite.y,character.combat.action?.direction??direction,motion,distance);
    const hadFlight=character.flightWeapon;
    character.flightWeapon=Boolean(f);character.flightPose=visualFlightPose(f);
    character.meditation=this.mount.attached?null:this.scene.cultivation?.poseFor(npc,this.scene.time.now);
    character.advance(delta,motion,direction,Math.min(distance/character.root.scaleX,12));
    if(f||hadFlight)character.apply();
    return true;
  }
  reset(){this.mount.reset();this.character.combat.cancel();}

  canMountAt(x,y,ignoreId){return this.scene.groundPositionOpen(this.npc,x,y,true,ignoreId)&&mountedPositionAllowed(x,y,(px,py)=>this.scene.canOccupy(px,py),11);}

  moveMounted(x,y){
    for(const [px,py] of [[x,y],[x,this.sprite.y],[this.sprite.x,y]]){
      if(!this.canMountAt(px,py))continue;
      const move=this.scene.moveOnGround(this.npc,this.sprite,px,py,false);
      if(move)return move;
    }
    return null;
  }

  toggleMount(){
    const {scene,npc,sprite,mount}=this;
    if(scene.possessedNpcId!==npc.id||npc.flight||npc.wallLevel)return false;
    if(mount.state==='absent'){
      const open=[[26,0],[-26,0],[0,26],[0,-26],[36,0],[-36,0],[0,36],[0,-36]].find(([dx,dy])=>this.canMountAt(sprite.x+dx,sprite.y+dy)&&scene.clearFaunaLine(sprite,{x:sprite.x+dx,y:sprite.y+dy}));
      if(!open){scene.worldPopulationToast('Cần khoảng trống để gọi Huyền Hổ.');return false;}
      mount.summon(sprite.x+open[0],sprite.y+open[1],scene.playerFacing);
      scene.worldPopulationToast('Huyền Hổ đã đến. Nhấn M để lên yên.');return true;
    }
    if(!mount.attached&&!this.canMountAt(mount.x,mount.y,'parked-tiger'))return false;
    if(!mount.attached&&!scene.clearFaunaLine(sprite,{x:mount.x,y:mount.y}))return false;
    const canStand=(x,y)=>scene.groundPositionOpen(npc,x,y,false,mount.attached?undefined:'parked-tiger')&&scene.clearFaunaLine(sprite,{x,y});
    const ok=mount.toggle(sprite.x,sprite.y,scene.playerFacing,canStand,(x,y)=>{
      sprite.setPosition(x,y).setDepth(y);npc.x=x;npc.y=y;
    });
    if(ok)scene.heavenActions.stopFishing();
    else scene.worldPopulationToast('Chưa thể lên hoặc xuống yên tại vị trí này.');
    return ok;
  }

  attack(){
    const {scene,npc,character}=this;
    const weapon=weaponForNpc(npc);
    const kind=visualEquipment(weapon);
    if(kind==='none') return false;
    if(character.combat.weapon!==kind)character.customize({...character.appearance,weapon:kind});
    if(character.combat.action)return true;
    const [ux,uy]=scene.heavenActions.aim(npc);
    const direction=facing(ux,uy);
    if(character.combat.attack(direction,{weaponId:weapon.id})){
      scene.playerFacing=direction;
      scene.heavenActions.stopFishing();
    }
    return true;
  }

  handleActionEvent(event,action){
    this.mount.event(event);
    const {scene,npc,character}=this;
    if(!npc.alive||scene.possessedNpcId!==npc.id||!['bolt','strike'].includes(event))return;
    const weapon=weaponForNpc(npc);
    if(!weapon||weapon.id!==action.data.weaponId)return;
    const dir=action.direction;
    const [ux,uy]=AXES[dir];
    const damage=damageForStrike(npc.realmIndex,character.combat.combo||1,false,cultivationStats(npc).attack,event==='bolt'?1:.95);
    if(event==='bolt'){
      const tip=character.worldAttachment('tip');
      if(tip&&scene.heavenActions.launchBolt(npc,tip,ux,uy,damage))scene.sound.play('rig-bolt',{volume:.20});
      return;
    }
    const thrust=action.name==='swordThrust';
    const mode={hit:thrust?'thrust':'slash',range:weapon.range+(this.mount.attached?10:0),width:thrust?14:weapon.kind==='dao'?35:26};
    const targets=[...scene.populationWorld.npcs,...scene.populationWorld.environment.fauna];
    let target=null,closest=Infinity;
    for(const candidate of targets){
      if(candidate===npc||!candidate.alive||!isInWeaponArc(npc.x,npc.y,candidate.x,candidate.y,dir,mode))continue;
      const distance=Math.hypot(candidate.x-npc.x,candidate.y-npc.y);
      if(distance<closest&&scene.clearCombatLine(npc,candidate)){target=candidate;closest=distance;}
    }
    scene.sound.play('rig-strike',{volume:.18});
    scene.spawnWeaponFx(weapon.kind==='dao'?'dao':thrust?'thrust':'jian',dir,npc.x+ux*20,npc.y+uy*20-15-scene.ramparts.height(npc),scene.ramparts.depth(npc)+15);
    if(!target)return;
    const id='rig-strike:'+createWorldUuid();
    if(scene.npcSprites.has(target.id))scene.reportCombat(npc.id,target.id,Math.max(1,Math.floor(damage-scene.heavenActions.defense(target))),{eventId:id});
    else scene.applyFaunaDamage(target,npc,damage,id);
  }
}
