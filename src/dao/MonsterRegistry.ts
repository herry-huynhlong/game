import type { FaunaSpecies, TradeItemId } from './types';

export const FAUNA_SPECIES = {
  wolf: {name:'Thanh Ảnh Lang',hp:68,defense:2,speed:86,notice:116,leash:250,retreat:.23,power:24,loot:['wolf_fang','wolf_pelt']},
  boar: {name:'Xích Giáp Sơn Trư',hp:100,defense:5,speed:55,notice:96,leash:225,retreat:.18,power:35,loot:['boar_tusk','crimson_plate']},
  toad: {name:'Bích Độc Thiềm',hp:72,defense:3,speed:63,notice:115,leash:220,retreat:.28,power:28,loot:['toad_sac','jade_venom']},
} as const satisfies Record<FaunaSpecies,{name:string;hp:number;defense:number;speed:number;notice:number;leash:number;retreat:number;power:number;loot:readonly TradeItemId[]}>;

export const MONSTER_SPAWN={eliteChance:.05,eliteCap:1,eliteCooldownMs:135000} as const;
export const MONSTER_SKILLS={
 'fang':{name:'Lang Nha Cắn',species:'wolf',mode:'contact',min:0,max:43,reach:46,radius:18,damage:10,windup:350,active:100,recover:370,cooldown:2200},
 'shadow-step':{name:'Ảnh Bộ',species:'wolf',mode:'dash',min:48,max:102,reach:102,radius:17,damage:8,windup:420,active:330,recover:500,cooldown:5500},
 'pack-roar':{name:'Lang Vương Hống',species:'wolf',mode:'roar',min:0,max:126,reach:130,radius:130,damage:0,windup:770,active:150,recover:430,cooldown:12000,elite:true},
 'phantom-pounce':{name:'Ảnh Lang Phác',species:'wolf',mode:'dash',min:56,max:146,reach:150,radius:22,damage:21,windup:640,active:340,recover:630,cooldown:9000,elite:true},
 'tusk':{name:'Thiết Nha Húc',species:'boar',mode:'contact',min:0,max:46,reach:47,radius:23,damage:15,windup:520,active:160,recover:580,cooldown:3200},
 'charge':{name:'Sơn Trư Xung Phong',species:'boar',mode:'dash',min:48,max:126,reach:137,radius:23,damage:17,windup:900,active:500,recover:800,cooldown:6800},
 'crimson-armor':{name:'Cuồng Giáp',species:'boar',mode:'armor',min:0,max:130,reach:0,radius:28,damage:0,windup:560,active:230,recover:490,cooldown:15000,elite:true},
 'quake':{name:'Chấn Địa',species:'boar',mode:'area',min:0,max:66,reach:0,radius:68,damage:24,windup:990,active:210,recover:850,cooldown:10200,elite:true},
 'tongue':{name:'Độc Thiệt',species:'toad',mode:'tongue',min:0,max:70,reach:76,radius:12,damage:10,windup:420,active:360,recover:460,cooldown:3100},
 'venom':{name:'Độc Dịch',species:'toad',mode:'projectile',min:43,max:142,reach:150,radius:11,damage:11,windup:650,active:140,recover:540,cooldown:5200},
 'poison-mist':{name:'Bích Độc Vụ',species:'toad',mode:'mist',min:38,max:115,reach:116,radius:49,damage:5,windup:920,active:220,recover:670,cooldown:12000,elite:true},
 'skyfall':{name:'Độc Thiềm Thiên Trụy',species:'toad',mode:'leap',min:56,max:136,reach:136,radius:48,damage:21,windup:900,active:620,recover:800,cooldown:15000,elite:true},
} satisfies Record<string,{name:string;species:FaunaSpecies;mode:string;min:number;max:number;reach:number;radius:number;damage:number;windup:number;active:number;recover:number;cooldown:number;elite?:boolean}>;
export type MonsterSkillId=keyof typeof MONSTER_SKILLS;
export type MonsterSkill=(typeof MONSTER_SKILLS)[MonsterSkillId];
export const monsterSkill=(id:string)=>MONSTER_SKILLS[id as MonsterSkillId] as (MonsterSkill & {elite?:boolean})|undefined;
export const FAUNA_IDS=Object.keys(FAUNA_SPECIES) as FaunaSpecies[];
export const MONSTER_SKILL_IDS=Object.keys(MONSTER_SKILLS) as MonsterSkillId[];
export const hashMonster=(value:string)=>Array.from(value).reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
