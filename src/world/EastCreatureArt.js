import { isEastSpecies } from '../dao/EastFauna.ts';

export const EAST_CREATURE_SIZE=112;
export const EAST_CREATURE_ANCHOR=84/112;

export const EAST_CREATURE_SCALE={
  'sand-scorpion':.84,'bone-wolf':.92,'bone-skeleton':.93,'bone-general':.98,
  'wetland-toad':.87,'sand-worm':.94,'sand-golem':.96,'flame-lizard':.94,'bone-king':1.14,
};

export function eastCreatureKey(beast){
  if(beast.species==='toad'&&(beast.zoneId==='east-wetland'||beast.zoneId==='south-wetland'))return 'wetland-toad';
  if(isEastSpecies(beast.species))return beast.species;
  return null;
}

const secondary=new Set(['sand-dive','ghost-step','fire-tail','worm-burrow','general-gust','stone-storm','yin-mist','king-ghost-land']);
const special=new Set(['sand-sting','bone-howl','fire-breath','stone-skin','bone-guard','war-soul','quicksand','king-bones']);
export function eastSkillPose(id){
  return secondary.has(id)?'secondary':special.has(id)?'special':'active';
}

export const EAST_POSE_ROWS={
  idle:0,move:1,windup:2,active:3,recover:4,hurt:5,death:6,skill:7,
  disguise:8,run:9,secondary:10,special:11,
};
