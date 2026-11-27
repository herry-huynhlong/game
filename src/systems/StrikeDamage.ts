export function damageForStrike(realmIndex:number,combo:number,skill=false,attackStat?:number,skillMultiplier=1):number {
  const attack=attackStat??19*(1+Math.max(0,realmIndex)*.08);
  if(skill)return 2*attack*skillMultiplier;
  return attack*[.95,1.2,1.55][Math.max(0,Math.min(2,combo-1))];
}
