import type { FaunaSpecies } from './types';

type Element='thủy'|'lôi'|'hỏa'|'mộc'|'băng'|'độc'|'hồn'|'huyết'|'kim'|'âm';
type Medicine='qi_pill'|'healing_pill'|'detox_pill';
type TreasureDefinition={
  name:string;element:Element;grade:1|2|3|4|5;value:number;age?:number;
  growMs:number;renewMs:number;medicine:Medicine;guardian:FaunaSpecies;elite?:boolean;
  biomes:string[];material?:boolean;
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
export const EAST_TREASURE={
 solar_fruit:{name:'Thái Dương Linh Quả',element:'hỏa',grade:4,value:104,growMs:116000,renewMs:241000,medicine:'qi_pill',guardian:'flame-lizard',biomes:['east-canyon','east-dunes']},
 scorch_flower:{name:'Liệt Dương Hoa',element:'hỏa',grade:2,value:22,growMs:37000,renewMs:82000,medicine:'qi_pill',guardian:'sand-scorpion',biomes:['east-rim']},
 amber_dune_grass:{name:'Hoàng Sa Linh Thảo',element:'mộc',grade:1,value:9,growMs:22000,renewMs:49000,medicine:'healing_pill',guardian:'sand-scorpion',biomes:['east-rim']},
 ember_reishi:{name:'Địa Hỏa Linh Chi',element:'hỏa',grade:3,value:56,growMs:68000,renewMs:155000,medicine:'detox_pill',guardian:'flame-lizard',biomes:['east-canyon']},
 moon_lotus:{name:'Thanh Nguyệt Linh Liên',element:'thủy',grade:3,value:50,growMs:62000,renewMs:153000,medicine:'healing_pill',guardian:'sand-worm',biomes:['east-oasis']},
 poplar_heartwood:{name:'Thiên Niên Hồ Dương Mộc',element:'mộc',grade:3,value:69,age:1000,growMs:95000,renewMs:193000,medicine:'healing_pill',guardian:'sand-golem',biomes:['east-oasis'],material:true},
 phantom_sand_crystal:{name:'Huyền Sa Tinh',element:'kim',grade:4,value:91,growMs:92000,renewMs:216000,medicine:'qi_pill',guardian:'sand-worm',biomes:['east-dunes'],material:true},
 red_fire_crystal:{name:'Xích Hỏa Linh Thạch',element:'hỏa',grade:3,value:57,growMs:80000,renewMs:192000,medicine:'qi_pill',guardian:'flame-lizard',biomes:['east-canyon'],material:true},
 bone_jade:{name:'Bạch Cốt Linh Ngọc',element:'âm',grade:4,value:90,growMs:104000,renewMs:219000,medicine:'detox_pill',guardian:'bone-skeleton',biomes:['east-bones','east-ruins'],material:true},
 yin_soul_herb:{name:'Âm Hồn Thảo',element:'hồn',grade:4,value:110,growMs:114000,renewMs:227000,medicine:'detox_pill',guardian:'bone-general',biomes:['east-ruins','east-bones']},
} satisfies Record<string,TreasureDefinition>;
export type EastTreasureId=keyof typeof EAST_TREASURE;
export const EAST_TREASURE_IDS=Object.keys(EAST_TREASURE) as EastTreasureId[];
export type WestTreasureId=keyof typeof WEST_TREASURE|EastTreasureId;
export const WEST_TREASURE_IDS=Object.keys(WEST_TREASURE) as WestTreasureId[];
export const ALL_TREASURE_IDS=[...WEST_TREASURE_IDS,...EAST_TREASURE_IDS];
const treasures={...WEST_TREASURE,...EAST_TREASURE};
export const treasureDefinition=(id:WestTreasureId):TreasureDefinition=>treasures[id];
export const WEST_TREASURE_GUARD_CHANCE=[0,.35,.55,.65,.80,.90] as const;
export const WEST_TREASURE_RARITY=['','Phổ thông','Ít gặp','Hiếm','Cực hiếm','Thiên phẩm'] as const;
export const WEST_TREASURE_MEDICINE={qi_pill:'Tụ Khí Đan',healing_pill:'Hồi Xuân Đan',detox_pill:'Giải Độc Đan'} as const;
