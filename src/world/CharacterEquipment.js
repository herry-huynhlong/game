export function visualEquipment(weapon) {
  if (weapon?.kind==='spear') return 'sword';
  if (weapon?.kind==='hammer'||weapon?.kind==='scythe') return 'saber';
  if (weapon?.kind==='jian') return 'sword';
  if (weapon?.kind==='crossbow') return 'crossbow';
  if (weapon?.kind==='dao') return 'saber';
  return 'none';
}

export function weaponPlacement(direction, weapon, hands, grips, armX, armY) {
  const key=`weapon/${weapon}`;
  const [gripX,gripY]=grips[`${direction}/${key}`];
  const [handX,handY]=hands[direction];
  const sign=direction==='up'?-1:1;
  return {key,x:handX-gripX+armX*sign,y:handY-gripY+armY*sign};
}
