const URL='/assets/npc-combat-mount/';
export function loadCombatMountAssets(scene){
  scene.load.atlas('combat-mount',URL+'atlas.png',URL+'atlas.json');
  scene.load.json('combat-anchors',URL+'anchors.json');
  scene.load.audio('rig-strike',URL+'strike.wav');
  scene.load.audio('rig-bolt',URL+'bolt.wav');
}
