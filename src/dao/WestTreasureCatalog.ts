import type { FaunaSpecies } from './types';

type Element='lôi'|'hỏa'|'mộc'|'băng'|'độc'|'hồn'|'huyết'|'kim'|'âm';
type Medicine='qi_pill'|'healing_pill'|'detox_pill';
type TreasureDefinition={
  name:string;element:Element;grade:1|2|3|4|5;value:number;age?:number;
  growMs:number;renewMs:number;medicine:Medicine;guardian:FaunaSpecies;elite?:boolean;
  biomes:string[];
};

const outer='west-outer',inner='west-inner',poison='west-poison',ancient='west-ancient',forbidden='west-forbidden';
export const WEST_TREASURE={
  thunder_fruit:{name:'Lôi Linh Quả',element:'lôi',grade:4,value:100,growMs:105000,renewMs:220000,medicine:'qi_pill',guardian:'eagle',elite:true,biomes:[ancient,forbidden]},
  fire_spirit_fruit:{name:'Hỏa Linh Quả',element:'hỏa',grade:2,value:24,growMs:46000,renewMs:90000,medicine:'qi_pill',guardian:'boar',biomes:[inner]},
  wood_spirit_fruit:{name:'Mộc Linh Quả',element:'mộc',grade:1,value:12,growMs:22000,renewMs:42000,medicine:'healing_pill',guardian:'wood',biomes:[outer,inner]},
  frost_snow_lotus:{name:'Hàn Băng Tuyết Liên',element:'băng',grade:4,value:105,growMs:130000,renewMs:245000,medicine:'detox_pill',guardian:'millennial',biomes:[ancient,forbidden]},
  purple_venom_flower:{name:'Tử U Độc Hoa',element:'độc',grade:3,value:54,growMs:76000,renewMs:155000,medicine:'detox_pill',guardian:'centipede',biomes:[poison]},
  qingling_herb:{name:'Thanh Linh Thảo',element:'mộc',grade:1,value:8,growMs:17000,renewMs:36000,medicine:'qi_pill',guardian:'stag',biomes:[outer]},
  soul_nourishing_grass:{name:'Dưỡng Hồn Thảo',element:'hồn',grade:3,value:49,growMs:68000,renewMs:145000,medicine:'qi_pill',guardian:'vine',biomes:[poison,ancient]},
  century_spirit_ginseng:{name:'Bách Niên Linh Sâm',element:'mộc',grade:2,value:23,age:100,growMs:40000,renewMs:84000,medicine:'healing_pill',guardian:'wood',biomes:[outer,inner]},
  millennial_spirit_ginseng:{name:'Thiên Niên Linh Sâm',element:'mộc',grade:4,value:125,age:1000,growMs:145000,renewMs:275000,medicine:'healing_pill',guardian:'millennial',biomes:[ancient]},
  myriad_spirit_reishi:{name:'Vạn Niên Linh Chi',element:'hồn',grade:5,value:225,age:10000,growMs:200000,renewMs:385000,medicine:'healing_pill',guardian:'millennial',elite:true,biomes:[forbidden]},
  dragon_blood_fruit:{name:'Long Huyết Quả',element:'huyết',grade:5,value:185,growMs:175000,renewMs:330000,medicine:'healing_pill',guardian:'vine',biomes:[forbidden]},
  divine_wood_fruit:{name:'Thần Mộc Chi Quả',element:'mộc',grade:5,value:260,growMs:230000,renewMs:430000,medicine:'qi_pill',guardian:'wood-king',biomes:[forbidden]},
  qi_condensing_flower:{name:'Ngưng Linh Hoa',element:'mộc',grade:1,value:10,growMs:25000,renewMs:49000,medicine:'qi_pill',guardian:'wood',biomes:[outer,inner]},
  metal_spirit_fruit:{name:'Kim Linh Quả',element:'kim',grade:3,value:46,growMs:74000,renewMs:140000,medicine:'qi_pill',guardian:'boar',biomes:[inner]},
  dark_yin_grass:{name:'Huyền Âm Thảo',element:'âm',grade:3,value:47,growMs:76000,renewMs:165000,medicine:'detox_pill',guardian:'flower',biomes:[poison]},
} satisfies Record<string,TreasureDefinition>;
export type WestTreasureId=keyof typeof WEST_TREASURE;
export const WEST_TREASURE_IDS=Object.keys(WEST_TREASURE) as WestTreasureId[];
export const treasureDefinition=(id:WestTreasureId):TreasureDefinition=>WEST_TREASURE[id];
export const WEST_TREASURE_GUARD_CHANCE=[0,.35,.55,.65,.80,.90] as const;
export const WEST_TREASURE_RARITY=['','Phổ thông','Ít gặp','Hiếm','Cực hiếm','Thiên phẩm'] as const;
export const WEST_TREASURE_MEDICINE={qi_pill:'Tụ Khí Đan',healing_pill:'Hồi Xuân Đan',detox_pill:'Giải Độc Đan'} as const;
