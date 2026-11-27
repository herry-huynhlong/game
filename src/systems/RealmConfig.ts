export const REALM_LEVELS = 10;
const definitions = [
  ['qi', 'Luyện Khí', 120],
  ['foundation', 'Trúc Cơ', 250],
  ['golden-core', 'Kim Đan', 500],
  ['nascent-soul', 'Nguyên Anh', 1000],
  ['divine-transformation', 'Hóa Thần', 3000],
  ['void-refinement', 'Luyện Hư', 5000],
  ['integration', 'Hợp Thể', 10000],
  ['great-vehicle', 'Đại Thừa', 30000],
  ['tribulation', 'Độ Kiếp', 100000],
] as const;

export type RealmPosition = { realmIndex?: number; realmLevel?: number };
export const REALMS = definitions.map(([id,name,lifespan],index) => ({
  id,name,lifespan,rank:index+1,maxLevel:REALM_LEVELS,absorption:4+index*3,
  breakthrough:index===definitions.length-1?'Độ Kiếp tầng 10 là giới hạn tu luyện hiện tại.':
    'Đạt tầng 10 và đủ điều kiện để xét Thiên Kiếp '+definitions[index+1][1]+'.',
}));

export function realmPosition({realmIndex,realmLevel}:RealmPosition) {
  if(realmIndex===undefined||realmLevel===undefined||!Number.isInteger(realmIndex)||!Number.isInteger(realmLevel))return null;
  const realm=REALMS[realmIndex];
  if(!realm||realmLevel<1||realmLevel>REALM_LEVELS)return null;
  const stage=realmLevel===10?'Đại viên mãn':realmLevel>=7?'Hậu kỳ':realmLevel>=4?'Trung kỳ':'Sơ kỳ';
  return {realm,index:realmIndex,rank:realm.rank,level:realmLevel,total:realmIndex*REALM_LEVELS+realmLevel,stage};
}

export function realmBase(actor:RealmPosition){
  const position=realmPosition(actor);
  const factor=position?4**position.index*(1+.25*(position.level-1)):0;
  return {position,hp:position?100*factor:72,attack:position?20*factor:8,
    defense:position?10*factor:3,qi:100*factor};
}

export function cultivationRequired(realmIndex:number,level:number):number {
  const realm=Math.max(0,Math.min(REALMS.length-1,Math.floor(realmIndex)));
  const floor=Math.max(1,Math.floor(level));
  if(realm===0)return Math.round(80+(floor-1)*35+Math.max(0,floor-4)**2*5);
  return Math.round(600+realm*280+(floor-1)*(130+realm*35));
}

export function formatRealm(save:RealmPosition):string {
  const position=realmPosition(save);
  return position?`${position.realm.name} tầng ${position.level}`:'Chưa có tu vi';
}
