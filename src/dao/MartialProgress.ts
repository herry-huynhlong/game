import {gradePotential} from '../systems/CombatBalance';
import {realmBase} from '../systems/RealmConfig';
import {GRADES, MARTIAL_SKILLS, MARTIAL_TECHNIQUES, MARTIAL_WEAPONS, MASTERY_XP} from './MartialRegistry';
import {equippedInstance, type WeaponStack} from './WeaponInstances';

type MartialState = { learned:Record<string,number>; active:string; selected?:string; ready:Record<string,number>; next?:number; legacyKey?:boolean };
export type MartialActor = {
  id:string; realmIndex:number; realmLevel:number; spiritualRoot?:string; martial?:MartialState;
  equippedWeapon?:string|null; equippedWeaponInstance?:string|null; inventory?:WeaponStack[];
  martialDurability?:Record<string,number>; alive?:boolean; mp?:number;
};
type Skill = typeof MARTIAL_SKILLS[string];

export function martialMastery(actor:MartialActor,id:string){
  const xp=actor.martial?.learned[id];
  if(xp===undefined)return -1;
  for(let stage=MASTERY_XP.length-1;stage>=0;stage--)if(xp>=MASTERY_XP[stage])return stage;
  return -1;
}
export function learnMartial(actor:MartialActor,id:string){
  if(!actor.alive||!Object.hasOwn(MARTIAL_TECHNIQUES,id)||martialMastery(actor,id)>=0)return false;
  const state=actor.martial??={learned:{},active:id,ready:{}};
  state.learned[id]=0;
  return true;
}
export function practiceMartial(actor:MartialActor,amount:number,id=actor.martial?.active){
  if(!id||martialMastery(actor,id)<0||!Number.isFinite(amount)||amount<=0)return;
  const course=MARTIAL_TECHNIQUES[id], state=actor.martial!;
  const affinity=actor.spiritualRoot&&course.roots.includes(actor.spiritualRoot)?1.14:1;
  state.learned[id]=Math.min(MASTERY_XP.at(-1)!,state.learned[id]+amount*affinity/course.study);
}
export function activateMartial(actor:MartialActor,id:string){
  if(!actor.alive||martialMastery(actor,id)<0)return false;
  actor.martial!.active=id;
  delete actor.martial!.selected;
  return true;
}
export function martialResonance(actor:MartialActor,id=actor.martial?.active){
  if(!id||!actor.equippedWeapon)return 0;
  const weapon=MARTIAL_WEAPONS[actor.equippedWeapon];
  if(!weapon||weapon.course!==id||actor.realmIndex<weapon.minRealm||
     (equippedInstance(actor)?.durability??0)<=0)return 0;
  const mastery=martialMastery(actor,id);
  return (mastery>=4?.14:mastery>=1?.08:0)*gradePotential(actor.realmIndex,weapon.grade);
}
const requiredRealms:Record<string,number>={
  'hundred-swords':2,'sword-domain-earth':3,'myriad-unite':3,'nine-dragons':3,
  'heaven-wrath':4,'crow-descent':3,'nine-suns':4,
};
export function martialRequiredRealm(skill:Skill){
  return requiredRealms[skill.id]??MARTIAL_TECHNIQUES[skill.course].minimum;
}
export function martialQiCost(actor:MartialActor,skill:Skill){
  return Math.max(skill.mp,realmBase(actor).qi*(.035+skill.grade*.019+skill.stage*.016));
}
export function martialCastCheck(actor:MartialActor,skill:Skill,now:number){
  if(!skill||!actor.alive||actor.martial?.active!==skill.course||martialMastery(actor,skill.course)<skill.stage)return 'Chưa lĩnh ngộ chiêu này.';
  if(actor.realmIndex<martialRequiredRealm(skill)||(skill.grade>=3&&actor.realmIndex===martialRequiredRealm(skill)&&actor.realmLevel<skill.stage+1))return 'Cảnh giới chưa đủ để vận chuyển.';
  const course=MARTIAL_TECHNIQUES[skill.course];
  if(skill.grade>=3&&skill.stage===2&&!course.roots.includes(actor.spiritualRoot??''))
    return 'Linh căn không tương hợp với tuyệt kỹ này.';
  if((actor.mp??0)<martialQiCost(actor,skill))return 'Không đủ linh lực.';
  if((actor.martial!.next??0)>now||(actor.martial!.ready[skill.id]??0)>now)return 'Chiêu thức đang hồi.';
  return '';
}
export function martialPower(actor:MartialActor,skill:Skill,attack:number,resonance=martialResonance(actor)){
  const course=MARTIAL_TECHNIQUES[skill.course],grade=GRADES[skill.grade];
  const mastery=Math.max(0,martialMastery(actor,skill.course));
  const affinity=actor.spiritualRoot&&course.roots.includes(actor.spiritualRoot)?.07:0;
  const potential=gradePotential(actor.realmIndex,skill.grade);
  const power=1+(grade.power-1+mastery*.055+(affinity??0))*potential+resonance;
  return attack*skill.force*power;
}
export function martialTrainingRate(actor:MartialActor){
  const course=MARTIAL_TECHNIQUES[actor.martial?.active??''];
  return course&&actor.realmIndex>=course.minimum&&martialMastery(actor,course.id)>=0?course.rate:1;
}
export function wearMartialWeapon(actor:MartialActor){
  const id=actor.equippedWeapon;
  const item=id&&MARTIAL_WEAPONS[id];
  if(!id||!item)return;
  const wear=actor.martialDurability??={};
  const instance=equippedInstance(actor);
  if(!instance)return;
  instance.durability=Math.max(0,instance.durability-1);
  wear[id]=instance.durability;
}
