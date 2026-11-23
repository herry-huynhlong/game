const ROOT='/assets/npc-xianxia-rig/';
export function loadCharacterAssets(scene) {
  scene.load.atlas('rig-parts',ROOT+'parts.png',ROOT+'parts.json');
  scene.load.atlas('rig-variants',ROOT+'variants.png',ROOT+'variants.json');
  scene.load.json('rig-grips',ROOT+'grips.json');
  scene.load.json('rig-variants-registry',ROOT+'variants-registry.json');
}
export function rigFor(appearance) {
  if(appearance.outfit==='workwear')return appearance.bodyType==='female_slender'?'workWoman':'workMan';
  if(appearance.outfit==='civilian')return appearance.bodyType==='female_slender'?'villageWoman':'villageMan';
  if(appearance.bodyType==='male_elder') return 'elder';
  if(appearance.outfit==='taoist') return 'original';
  return appearance.outfit;
}
