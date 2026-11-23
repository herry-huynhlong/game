import { DEFAULT_APPEARANCE, validateAppearance } from './CharacterAppearance.js';

const hash=value=>{
  let h=2166136261;
  for(const char of value)h=Math.imul(h^char.charCodeAt(0),16777619);
  return h>>>0;
};
function random(seed){
  let state=seed;
  return length=>{
    state=(state+0x6d2b79f5)|0;
    let value=Math.imul(state^(state>>>15),1|state);
    value^=value+Math.imul(value^(value>>>7),61|value);
    return ((value^(value>>>14))>>>0)%length;
  };
}

const civilian=['commoner','merchant','tavern_staff','quest_clerk','repair_worker','herb_gatherer'];
const martial=['hunter','city_guard','sword_cultivator'];
const authorityPresets={
  city_master:{bodyType:'male_strong',outfit:'demon',face:'middle',hair:'bun',hairColor:'ink',outfitColor:'moon',beard:'silver',headwear:'matching',expression:'cold'},
  sect_leader:{bodyType:'male_elder',outfit:'taoist',face:'elder',hair:'bun',hairColor:'silver',outfitColor:'jade',beard:'matching',headwear:'matching',expression:'neutral'},
};

export function profileForNpc(npc){
  if(authorityPresets[npc.authorityRole])return npc.authorityRole;
  if(npc.populationRole==='sect_leader')return 'sect_leader';
  const role=npc.populationRole??npc.profession;
  if(npc.authorityRole==='elder'||role==='elder')return 'elder';
  if(npc.faction==='qingyun-sect'||role==='low_disciple')return 'disciple';
  if(role==='monk'||npc.profession==='vo_tang')return 'monk';
  if(role==='demonic_cultivator'||npc.profession==='ma_tu')return 'demonic';
  if(martial.includes(role))return role;
  if(civilian.includes(role))return role;
  return 'wanderer';
}

export function generateNpcAppearance(npc, worldSeed, attempt=0){
  const profile=profileForNpc(npc);
  const pick=random(hash(`${worldSeed}:${npc.id}:look-v1:${attempt}`));
  const one=options=>options[pick(options.length)];
  const female=npc.gender==='nữ';
  const base={...DEFAULT_APPEARANCE,id:npc.id,headwear:'none',accessory:'none',weapon:'none'};
  if(authorityPresets[profile])return validateAppearance({...base,...authorityPresets[profile]});
  let bodyType=female?'female_slender':profile==='elder'?'male_elder':'male_slim';
  let outfit;
  if(profile==='monk'&&!female){bodyType='male_strong';outfit='monk';}
  else if(['demonic','city_guard'].includes(profile)&&!female){bodyType='male_strong';outfit='demon';}
  else if(['repair_worker','tavern_staff','herb_gatherer'].includes(profile))outfit='workwear';
  else if(profile==='commoner')outfit=one(['civilian','civilian','workwear']);
  else if(civilian.includes(profile)||(female&&martial.includes(profile)))outfit='civilian';
  else if(female)outfit='fairy';
  else if(profile==='elder')outfit='taoist';
  else if(martial.includes(profile))outfit='swordsman';
  else outfit=one(['taoist','swordsman']);
  const colors={disciple:['jade','moon'],elder:['jade','moon'],demonic:['jade','ember'],city_guard:['moon','earth'],merchant:['earth','jade','moon'],commoner:['earth','jade']};
  const face=female?one(['fair','cold']):bodyType==='male_elder'?one(['elder','middle']):one(['thanh_y','middle']);
  return validateAppearance({...base,bodyType,outfit,face,
    hair:outfit==='monk'?'short':one(profile==='disciple'?['bun','loose']:['bun','short','loose']),
    hairColor:outfit==='monk'?'ink':profile==='elder'?one(['silver','ink']):profile==='demonic'?one(['red','ink']):one(['ink','ink','chestnut']),
    eyes:one(['matching','amber','jade']),eyebrows:one(['matching','soft','stern']),
    beard:female?'none':profile==='elder'?one(['silver','matching','none']):one(['none','none','matching']),
    expression:one(['neutral','warm','cold']),shoes:one(['matching','charcoal']),pants:one(['matching','charcoal']),
    outfitColor:female&&profile==='disciple'?'moon':one(colors[profile]??(['civilian','workwear'].includes(outfit)?['earth','jade','moon']:['jade','moon','earth'])),
    headwear:outfit==='civilian'&&profile==='merchant'?one(['matching','none']):'none',
    accessory:profile==='elder'||profile==='merchant'||profile==='demonic'?'matching':'none',
  });
}

export function appearanceSignature(look){
  const {id,weapon,...visual}=validateAppearance(look);
  // Ignore switches which do not draw a new part for that particular kit.
  if(visual.outfit==='monk'){delete visual.hair;delete visual.hairColor;delete visual.headwear;}
  if(visual.hair!=='bun')delete visual.headwear;
  if(visual.beard==='matching'&&visual.face!=='elder')visual.beard='none';
  return JSON.stringify(visual);
}

export function allocateNpcAppearance(npc, seed, taken, generation=0){
  let look;
  for(let step=0;step<64;step++){
    look=generateNpcAppearance(npc,seed,generation+step);
    if(!taken.has(appearanceSignature(look)))break;
  }
  taken.add(appearanceSignature(look));
  return look;
}

export function ensureWorldNpcAppearances(world){
  const taken=new Set();
  for(const npc of world.npcs)if(npc.modularAppearance) {
    try{taken.add(appearanceSignature(npc.modularAppearance.look));}catch{ /* Keep invalid user data available for repair in the editor. */ }
  }
  const seed=world.population?.spawnSeed??world.worldId;
  let changed=0;
  const pending=world.npcs.filter(npc=>!npc.modularAppearance&&(!npc.species||['human','humanoid'].includes(npc.species))&&npc.appearanceMode!=='custom-boss').sort((a,b)=>a.id.localeCompare(b.id));
  for(const npc of pending){
    const profile=profileForNpc(npc);
    npc.modularAppearance={look:allocateNpcAppearance(npc,seed,taken),profile,locked:Boolean(authorityPresets[profile]),generation:0};
    changed++;
  }
  return changed;
}
