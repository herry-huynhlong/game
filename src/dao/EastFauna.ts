import type { EastFaunaSpecies, TradeItemId } from './types';

export const EAST_SPECIES={
 'bone-skeleton':{name:'Bạch Cốt Khô Lâu',hp:68,defense:4,speed:58,notice:125,leash:181,retreat:.18,power:42,loot:['bone_jade'],behavior:'dormant'},
 'bone-general':{name:'Bạch Cốt Chiến Tướng',hp:158,defense:8,speed:53,notice:143,leash:195,retreat:.12,power:92,loot:['bone_jade','yin_soul_herb'],behavior:'dormant'},
 'sand-scorpion':{name:'Hoàng Sa Độc Hạt',hp:57,defense:5,speed:73,notice:107,leash:168,retreat:.24,power:30,loot:['scorpion_venom','amber_dune_grass'],behavior:'aggressive'},
 'sand-worm':{name:'Phệ Sa Yêu Trùng',hp:122,defense:7,speed:49,notice:121,leash:185,retreat:.17,power:77,loot:['phantom_sand_crystal'],behavior:'ambush'},
 'sand-golem':{name:'Hoàng Sa Thạch Yêu',hp:123,defense:12,speed:33,notice:103,leash:158,retreat:.15,power:61,loot:['phantom_sand_crystal'],behavior:'territorial'},
 'bone-wolf':{name:'Bạch Cốt Yêu Lang',hp:91,defense:5,speed:86,notice:133,leash:199,retreat:.2,power:61,loot:['bone_jade','wolf_fang'],behavior:'aggressive'},
 'flame-lizard':{name:'Xích Diễm Địa Tích',hp:114,defense:7,speed:61,notice:125,leash:171,retreat:.19,power:63,loot:['red_fire_crystal'],behavior:'territorial'},
 'bone-king':{name:'Vạn Cốt Quỷ Vương',hp:385,defense:15,speed:38,notice:171,leash:235,retreat:.07,power:164,loot:['yin_soul_herb','bone_jade'],behavior:'territorial'},
} as const satisfies Record<EastFaunaSpecies,{name:string;hp:number;defense:number;speed:number;notice:number;leash:number;retreat:number;power:number;loot:readonly TradeItemId[];behavior:string}>;

export const EAST_SPECIES_IDS=Object.keys(EAST_SPECIES) as EastFaunaSpecies[];
export const isEastSpecies=(id:string):id is EastFaunaSpecies=>Object.hasOwn(EAST_SPECIES,id);
export const eastDisguise=(id:string)=>id==='bone-skeleton'||id==='bone-general'||id==='sand-worm';
export const eastUndead=(id:string)=>id==='bone-skeleton'||id==='bone-general';

type Mode='contact'|'mist'|'armor'|'projectile'|'rage'|'burrow'|'dash'|'area'|'roar'|'breath'|'summon';
type Element='earth'|'poison'|'wind'|'fire';
function strike(name:string,species:EastFaunaSpecies,mode:Mode,damage:number,reach:number,
  windup:number,cooldown:number,element:Element='earth',effect?:'poison'|'root'|'drain'){
  const ranged=['projectile','burrow','dash'].includes(mode);
  return {name,species,mode,damage,min:ranged?26:0,max:reach+6,reach,radius:mode==='mist'||mode==='area'?Math.round(reach*.62):mode==='summon'?88:20,
    windup,cooldown,active:mode==='burrow'||mode==='dash'?360:170,recover:420+Math.round(windup*.32),element,effect};
}
export const EAST_SKILLS={
 'bone-cut':strike('Cốt Trảm','bone-skeleton','contact',13,39,430,2400),
 'yin-mist':strike('Âm Khí','bone-skeleton','mist',6,66,900,8100,'wind','drain'),
 'bone-guard':strike('Bạch Cốt Hộ Thể','bone-skeleton','armor',0,97,600,13000),
 'general-cut':strike('Huyền Cốt Trảm','bone-general','contact',24,54,590,3200),
 'general-gust':strike('Âm Phong','bone-general','projectile',16,128,780,7400,'wind','root'),
 'war-soul':strike('Chiến Hồn','bone-general','rage',0,115,690,14200),
 'sand-sting':strike('Độc Vĩ','sand-scorpion','contact',11,42,490,2600,'poison','poison'),
 'sand-shell':strike('Kim Giáp','sand-scorpion','armor',0,88,650,11600),
 'sand-dive':strike('Sa Độn','sand-scorpion','burrow',10,93,810,9500),
 'worm-burrow':strike('Địa Độn','sand-worm','burrow',20,117,970,7900),
 'quicksand':strike('Lưu Sa','sand-worm','mist',9,88,1220,12800,'earth','root'),
 'worm-drain':strike('Phệ Linh','sand-worm','contact',19,47,740,8700,'earth','drain'),
 'stone-fist':strike('Thạch Quyền','sand-golem','contact',20,53,760,3300),
 'stone-storm':strike('Sa Bạo','sand-golem','area',12,68,1120,9400),
 'stone-skin':strike('Nham Giáp','sand-golem','armor',0,102,650,17000),
 'bone-fang':strike('Cốt Nha','bone-wolf','contact',16,42,370,2250),
 'bone-howl':strike('Âm Lang Khiếu','bone-wolf','area',8,60,800,9000,'wind','drain'),
 'ghost-step':strike('Quỷ Ảnh Bộ','bone-wolf','dash',18,116,620,6500,'wind'),
 'fire-breath':strike('Hỏa Tức','flame-lizard','breath',19,104,930,7900,'fire'),
 'fire-tail':strike('Liệt Diễm Vĩ','flame-lizard','area',17,63,760,6700,'fire'),
 'fire-armor':strike('Hỏa Giáp','flame-lizard','armor',0,107,650,14800,'fire'),
 'king-bones':strike('Vạn Cốt Triệu Hồi','bone-king','summon',0,158,1550,21000),
 'king-ghost-land':strike('Quỷ Vực','bone-king','mist',17,124,1310,14600,'wind','drain'),
 'king-suppression':strike('Âm Hồn Trấn Áp','bone-king','area',33,92,1280,8800,'wind','root'),
};
