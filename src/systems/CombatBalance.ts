import {realmPosition,type RealmPosition} from './RealmConfig';

const suppression=[1,.8,.35,.1,.03] as const;
const grades=[
  [1,.70,.25,.05,.01],
  [1,1,.60,.20,.05],
  [1,1,1,.60,.20],
  [1,1,1,1,.60],
  [1,1,1,1,1],
] as const;
export const TALENTS=[
  ['Thiên tư thấp',.8],['Tu sĩ phổ thông',1],['Thiên tài',1.2],['Tuyệt thế thiên tài',1.5],
  ['Yêu nghiệt',1.8],['Thánh tử / Thánh nữ',2],['Thiên mệnh chi tử',2.5],['Nghịch thiên chi tư',3],
] as const;
export function combatTalent({talent,combatTalentTier}: {talent?:number;combatTalentTier?:number}){
  const score=talent??50;
  const tier=Number.isInteger(combatTalentTier)&&TALENTS[combatTalentTier!]?combatTalentTier!:
    score>=100?7:score>=97?6:score>=94?5:score>=90?4:score>=85?3:score>=74?2:score>=35?1:0;
  const [name,multiplier]=TALENTS[tier];
  return {name,multiplier,tier};
}

export function gradePotential(realmIndex:number,grade:number){
  if(realmIndex<0)return grade===0?1:0;
  return grades[Math.min(4,Math.max(0,Math.floor(realmIndex))) ]?.[grade]??0;
}

function nonnegative(value:number){return Number.isFinite(value)&&value>0?value:0;}
function unit(value:number){return Math.min(1,nonnegative(value));}

export function resolveDamage(attackPower:number,effectiveDefense:number,attacker:RealmPosition,target:RealmPosition,
  options:{suppress?:boolean;resistance?:number;shield?:number;outgoing?:number;critical?:number}={}){
  const critical=Math.min(3,nonnegative(options.critical??1));
  attackPower=Math.min(Number.MAX_VALUE,nonnegative(attackPower)*critical);
  effectiveDefense=nonnegative(effectiveDefense);
  const a=realmPosition(attacker),b=realmPosition(target);
  const gap=Math.max(0,(b?.rank??0)-(a?.rank??0));
  const baseSuppression=suppression[Math.min(4,gap)];
  const boundary=gap===1?Math.max(0,((a?.level??0)-(b?.level??1))/9)*.12:0;
  const realmFactor=options.suppress===false?1:baseSuppression+boundary;
  // Equivalent to A²/(A+D), written to avoid squaring large inputs.
  const afterArmor=attackPower===0?0:attackPower*(1/(1+effectiveDefense/attackPower));
  const resistance=unit(options.resistance??0),shield=unit(options.shield??0),outgoing=unit(options.outgoing??1);
  const damage=afterArmor*realmFactor*(1-resistance)*(1-shield)*outgoing;
  return {attackPower,critical,effectiveDefense,afterArmor,realmFactor,resistance,shield,outgoing,damage};
}

export function healthAtNewMax(value:number,oldMax:number,newMax:number){
  return unit(value/Math.max(1,oldMax))*newMax;
}

export function attackBudget(total:number,count:number){
  return nonnegative(total)/Math.max(1,Math.floor(nonnegative(count)));
}
