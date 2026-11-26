import { EAST_SKILLS, EAST_SPECIES, isEastSpecies } from './EastFauna';
import type { FaunaSpecies, TradeItemId } from './types';

export type FaunaBehavior='aggressive'|'neutral'|'timid'|'ambush'|'territorial'|'dormant';
export const BASE_FAUNA_IDS=['wolf','boar','toad'] as const;
export const FAUNA_QI_MAX=100;
export const FAUNA_SPECIES = {
  ...EAST_SPECIES,
  wolf: {name:'Thanh Ảnh Lang',hp:68,defense:2,speed:86,notice:116,leash:250,retreat:.23,power:24,loot:['wolf_fang','wolf_pelt']},
  boar: {name:'Xích Giáp Sơn Trư',hp:100,defense:5,speed:55,notice:96,leash:225,retreat:.18,power:35,loot:['boar_tusk','crimson_plate']},
  toad: {name:'Bích Độc Thiềm',hp:72,defense:3,speed:63,notice:115,leash:220,retreat:.28,power:28,loot:['toad_sac','jade_venom']},
  'wood': {name:'Thanh Mộc Yêu',hp:76,defense:4,speed:37,notice:86,leash:145,retreat:0.18,power:33,loot:['wood_heart'],behavior:'neutral'},
  'millennial': {name:'Thiên Niên Thụ Yêu',hp:158,defense:9,speed:29,notice:126,leash:164,retreat:0.12,power:72,loot:['millennial_wood'],behavior:'dormant'},
  'flower': {name:'Phệ Linh Yêu Hoa',hp:86,defense:4,speed:58,notice:107,leash:120,retreat:0.12,power:48,loot:['flower_stamen'],behavior:'ambush'},
  'vine': {name:'Huyết Đằng Yêu',hp:96,defense:5,speed:32,notice:116,leash:132,retreat:0.1,power:52,loot:['blood_vine'],behavior:'ambush'},
  'centipede': {name:'Hắc Giáp Ngô Công',hp:105,defense:7,speed:74,notice:110,leash:170,retreat:0.22,power:57,loot:['centipede_sac'],behavior:'aggressive'},
  eagle:{name:'Xích Diễm Kim Điêu',hp:126,defense:6,speed:92,notice:132,leash:198,retreat:.19,power:62,loot:['eagle_feather','eagle_talon','eagle_flame_feather'],behavior:'territorial'},
  'stag': {name:'Ngọc Giác Linh Lộc',hp:62,defense:2,speed:102,notice:125,leash:198,retreat:0.2,power:27,loot:['stag_antler'],behavior:'timid'},
  'wood-king': {name:'Vạn Niên Mộc Hoàng',hp:420,defense:12,speed:0,notice:156,leash:190,retreat:0.08,power:146,loot:['ancient_wood_marrow'],behavior:'dormant'},
} as const satisfies Record<FaunaSpecies,{name:string;hp:number;defense:number;speed:number;notice:number;leash:number;retreat:number;power:number;loot:readonly TradeItemId[];behavior?:FaunaBehavior}>;

export const MONSTER_SPAWN={eliteChance:.05,eliteCap:1,eliteCooldownMs:135000} as const;
export const MONSTER_SKILLS={
 ...EAST_SKILLS,
 'fang':{name:'Liệt Nha',species:'wolf',mode:'contact',min:0,max:43,reach:46,radius:18,damage:10,windup:350,active:100,recover:370,cooldown:2200,element:'wind'},
 'shadow-step':{name:'Thanh Ảnh Bộ',species:'wolf',mode:'dash',min:48,max:102,reach:102,radius:17,damage:8,windup:420,active:330,recover:500,cooldown:5500},
 'pack-roar':{name:'Lang Khiếu',species:'wolf',mode:'roar',min:0,max:126,reach:130,radius:130,damage:0,windup:770,active:150,recover:430,cooldown:12000},
 'phantom-pounce':{name:'Quần Lang Liệp Sát',species:'wolf',mode:'dash',min:56,max:146,reach:150,radius:22,damage:21,windup:640,active:340,recover:630,cooldown:9000,element:'wind'},
 'tusk':{name:'Thiết Nha Húc',species:'boar',mode:'contact',min:0,max:46,reach:47,radius:23,damage:15,windup:520,active:160,recover:580,cooldown:3200,element:'earth'},
 'boar-rage':{name:'Cuồng Nộ',species:'boar',mode:'rage',min:0,max:108,reach:0,radius:25,damage:0,windup:520,active:160,recover:580,cooldown:19500,element:'earth'},
 'charge':{name:'Xích Giáp Xung Phong',species:'boar',mode:'dash',min:48,max:126,reach:137,radius:23,damage:17,windup:900,active:500,recover:800,cooldown:6800},
 'crimson-armor':{name:'Thiết Bì',species:'boar',mode:'armor',min:0,max:130,reach:0,radius:28,damage:0,windup:560,active:230,recover:490,cooldown:15000},
 'quake':{name:'Liệt Địa',species:'boar',mode:'area',min:0,max:66,reach:0,radius:68,damage:24,windup:990,active:210,recover:850,cooldown:10200},
 'tongue':{name:'Thiềm Thiệt',species:'toad',mode:'tongue',min:0,max:70,reach:76,radius:12,damage:10,windup:420,active:360,recover:460,cooldown:3100},
 'venom':{name:'Độc Dịch',species:'toad',mode:'projectile',min:43,max:142,reach:150,radius:11,damage:11,windup:650,active:140,recover:540,cooldown:5200,effect:'poison',element:'poison'},
 'poison-mist':{name:'Độc Trạch',species:'toad',mode:'mist',min:38,max:115,reach:116,radius:49,damage:5,windup:920,active:220,recover:670,cooldown:12000,effect:'poison',element:'poison'},
 'skyfall':{name:'Địa Chấn',species:'toad',mode:'leap',min:56,max:136,reach:136,radius:48,damage:21,windup:900,active:620,recover:800,cooldown:15000},
 'branch':{name:'Mộc Tiên',species:'wood',mode:'contact',min:0,max:56,reach:56,radius:20,damage:15,windup:570,active:140,recover:530,cooldown:2700},
 'old-branch':{name:'Thiên Mộc Chấn',species:'millennial',mode:'contact',min:0,max:76,reach:78,radius:26,damage:20,windup:760,active:160,recover:650,cooldown:3300},
 'root-burst':{name:'Vạn Căn Trận',species:'millennial',mode:'mist',min:38,max:108,reach:110,radius:26,damage:10,windup:840,active:160,recover:630,cooldown:6700,effect:'root',element:'wood'},
 'pollen':{name:'Độc Vụ',species:'flower',mode:'mist',min:0,max:95,reach:96,radius:29,damage:8,windup:900,active:140,recover:650,cooldown:5200,effect:'poison',element:'poison'},
 'vine-lash':{name:'Huyết Đằng Triền Phược',species:'vine',mode:'tongue',min:0,max:105,reach:107,radius:14,damage:17,windup:670,active:360,recover:590,cooldown:4250,effect:'root',element:'blood'},
 'venom-pincer':{name:'Độc Nha',species:'centipede',mode:'contact',min:0,max:46,reach:48,radius:18,damage:13,windup:410,active:140,recover:475,cooldown:2350,effect:'poison',element:'poison'},
 'carapace-charge':{name:'Bách Túc Xung Kích',species:'centipede',mode:'dash',min:46,max:100,reach:104,radius:17,damage:11,windup:490,active:380,recover:445,cooldown:5200},
 'antler-deflect':{name:'Ngọc Giác Xung Kích',species:'stag',mode:'contact',min:0,max:38,reach:39,radius:16,damage:8,windup:490,active:150,recover:600,cooldown:5100},
 'king-sweep':{name:'Thần Mộc Trấn Áp',species:'wood-king',mode:'area',min:0,max:115,reach:0,radius:116,damage:29,windup:1080,active:250,recover:880,cooldown:4900},
 'king-roots':{name:'Thiên Địa Căn Lao',species:'wood-king',mode:'mist',min:33,max:148,reach:148,radius:38,damage:15,windup:1250,active:220,recover:900,cooldown:8500,effect:'root',element:'wood'},
 'king-call':{name:'Vạn Mộc Triều Tông',species:'wood-king',mode:'summon',min:0,max:160,reach:0,radius:115,damage:0,windup:1500,active:220,recover:800,cooldown:18000},
 'flower-bite':{name:'Hoa Khẩu',species:'flower',mode:'contact',min:0,max:48,reach:49,radius:18,damage:14,windup:485,active:150,recover:530,cooldown:2800,element:'wood'},
 'flower-drain':{name:'Phệ Linh',species:'flower',mode:'tongue',min:35,max:94,reach:96,radius:13,damage:8,windup:810,active:420,recover:690,cooldown:8700,element:'wood',effect:'drain'},
 'flower-root':{name:'Mộc Căn Triền Phược',species:'flower',mode:'mist',min:25,max:95,reach:102,radius:25,damage:4,windup:1030,active:170,recover:720,cooldown:11800,element:'wood',effect:'root'},
 'centipede-burrow':{name:'Địa Độn',species:'centipede',mode:'burrow',min:28,max:116,reach:102,radius:22,damage:14,windup:810,active:390,recover:720,cooldown:9800,element:'earth',effect:'poison'},
 'centipede-armor':{name:'Hắc Giáp',species:'centipede',mode:'armor',min:0,max:110,reach:0,radius:27,damage:0,windup:525,active:150,recover:570,cooldown:15000,element:'earth'},
 'wood-root':{name:'Thụ Căn Triền Phược',species:'wood',mode:'mist',min:25,max:88,reach:96,radius:24,damage:4,windup:830,active:160,recover:570,cooldown:11600,element:'wood',effect:'root'},
 'wood-armor':{name:'Mộc Giáp',species:'wood',mode:'armor',min:0,max:94,reach:0,radius:24,damage:0,windup:680,active:180,recover:580,cooldown:15700,element:'wood'},
 'wood-heal':{name:'Mộc Linh Hồi Phục',species:'wood',mode:'heal',min:0,max:100,reach:0,radius:21,damage:0,windup:720,active:180,recover:660,cooldown:19800,element:'wood'},
 'old-armor':{name:'Cổ Mộc Hộ Thể',species:'millennial',mode:'armor',min:0,max:120,reach:0,radius:30,damage:0,windup:650,active:190,recover:690,cooldown:17200,element:'wood'},
 'old-leaves':{name:'Lạc Diệp Phi Nhận',species:'millennial',mode:'projectile',min:44,max:129,reach:140,radius:11,damage:18,windup:760,active:180,recover:650,cooldown:7100,element:'wood'},
 'vine-thorn':{name:'Huyết Thứ',species:'vine',mode:'projectile',min:42,max:125,reach:130,radius:11,damage:15,windup:530,active:150,recover:630,cooldown:4800,element:'blood'},
 'vine-feed':{name:'Phệ Huyết',species:'vine',mode:'contact',min:0,max:47,reach:50,radius:18,damage:13,windup:620,active:160,recover:590,cooldown:10500,element:'blood',effect:'lifesteal'},
 'vine-spread':{name:'Đằng Mạn Lan Tràn',species:'vine',mode:'mist',min:34,max:119,reach:122,radius:35,damage:9,windup:990,active:230,recover:710,cooldown:11500,element:'blood',effect:'root'},
 'eagle-talon':{name:'Kim Điêu Liệt Trảo',species:'eagle',mode:'leap',min:22,max:107,reach:98,radius:32,damage:23,windup:650,active:320,recover:1460,cooldown:4900,element:'fire'},
 'eagle-breath':{name:'Xích Diễm Thổ Tức',species:'eagle',mode:'breath',min:0,max:83,reach:78,radius:17,damage:17,windup:825,active:220,recover:980,cooldown:6800,element:'fire'},
 'eagle-feathers':{name:'Kim Vũ Phi Nhận',species:'eagle',mode:'projectile',min:48,max:144,reach:150,radius:12,damage:16,windup:660,active:260,recover:610,cooldown:7200,element:'fire'},
 'eagle-wing':{name:'Liệt Phong Dực',species:'eagle',mode:'gust',min:0,max:60,reach:0,radius:62,damage:15,windup:705,active:180,recover:850,cooldown:8100,element:'fire'},
 'eagle-rise':{name:'Lăng Không',species:'eagle',mode:'haste',min:10,max:109,reach:0,radius:25,damage:0,windup:440,active:160,recover:515,cooldown:13600,element:'fire'},
 'eagle-rain':{name:'Phần Thiên Hỏa Vũ',species:'eagle',mode:'rain',min:0,max:155,reach:115,radius:57,damage:14,windup:1200,active:460,recover:1440,cooldown:15700,element:'fire',elite:true},
 'stag-haste':{name:'Linh Lộc Bộ',species:'stag',mode:'haste',min:0,max:125,reach:0,radius:20,damage:0,windup:280,active:140,recover:300,cooldown:6900,element:'wind'},
 'stag-heal':{name:'Tụ Linh',species:'stag',mode:'heal',min:0,max:125,reach:0,radius:25,damage:0,windup:540,active:160,recover:520,cooldown:19100,element:'wood'},
 'stag-cleanse':{name:'Thanh Linh Quang',species:'stag',mode:'cleanse',min:0,max:125,reach:0,radius:30,damage:0,windup:510,active:160,recover:450,cooldown:14700,element:'wind'},
 'king-heal':{name:'Vạn Niên Sinh Tức',species:'wood-king',mode:'heal',min:0,max:156,reach:0,radius:38,damage:0,windup:1550,active:260,recover:1000,cooldown:22500,element:'wood'},
 'king-domain':{name:'Mộc Hoàng Lĩnh Vực',species:'wood-king',mode:'mist',min:0,max:138,reach:80,radius:62,damage:11,windup:1610,active:230,recover:1150,cooldown:19200,element:'wood',effect:'root'},
} satisfies Record<string,{name:string;species:FaunaSpecies;mode:string;min:number;max:number;reach:number;radius:number;damage:number;windup:number;active:number;recover:number;cooldown:number;elite?:boolean;element?:'wood'|'poison'|'blood'|'earth'|'wind'|'fire';effect?:'poison'|'root'|'drain'|'lifesteal'}>;
export type MonsterSkillId=keyof typeof MONSTER_SKILLS;
export type MonsterSkill=(typeof MONSTER_SKILLS)[MonsterSkillId];
export const monsterSkill=(id:string)=>MONSTER_SKILLS[id as MonsterSkillId] as (MonsterSkill & {elite?:boolean;element?:'wood'|'poison'|'blood'|'earth'|'wind'|'fire';effect?:'poison'|'root'|'drain'|'lifesteal'})|undefined;
export const FAUNA_IDS=Object.keys(FAUNA_SPECIES) as FaunaSpecies[];
export const WEST_FAUNA_LOOT:readonly TradeItemId[]=[
  ...FAUNA_IDS.filter(id=>!isEastSpecies(id)&&!BASE_FAUNA_IDS.some(base=>base===id)).flatMap(id=>[...FAUNA_SPECIES[id].loot]),
  'beast_core_foundation','beast_core_gold','beast_core_nascent','eagle_fire_core','python_skin',
];
export const faunaName=(beast:{species:FaunaSpecies;rank?:string})=>beast.species==='eagle'&&beast.rank==='elite'?'Liệt Dương Kim Điêu':FAUNA_SPECIES[beast.species].name;
export const faunaBehavior=(species:FaunaSpecies):FaunaBehavior=>{
  const cfg=FAUNA_SPECIES[species];return 'behavior' in cfg?cfg.behavior:'aggressive';
};
// Ritual rank of the actual species/variant, independent of the current HP.
const faunaTiers:Partial<Record<FaunaSpecies,number>>={wolf:4,boar:6,toad:5};
export const faunaRealm=(beast:{species:FaunaSpecies;rank:string;realmIndex?:number;realmLevel?:number})=>
  ({realmIndex:beast.realmIndex??(beast.rank==='elite'?1:0),realmLevel:beast.realmLevel??(beast.rank==='elite'?2:faunaTiers[beast.species]??1)});
export function faunaCoreLoot(beast:Parameters<typeof faunaRealm>[0]):TradeItemId{
  if(beast.species==='eagle')return 'eagle_fire_core';
  const cores=['demon_core','beast_core_foundation','beast_core_gold','beast_core_nascent'] as const;
  return beast.realmIndex!==undefined?cores[Math.min(faunaRealm(beast).realmIndex,3)]??'demon_core':
    beast.rank==='elite'?'elite_beast_core':'demon_core';
}
export const MONSTER_SKILL_IDS=Object.keys(MONSTER_SKILLS) as MonsterSkillId[];
export const hashMonster=(value:string)=>Array.from(value).reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
