export function professionMarker(npc,scene){
  const role=npc.populationRole,profession=npc.profession,duty=npc.populationDuty??'';
  if(role==='city_guard')return 0;
  const job=npc.decisionSlot??'',specialty=scene.sectCampus?.staff.get(npc.id);
  if(npc.underground?.nodeId||job==='sect-campus:mine'||job==='sect-campus:spirit-vein')return 2;
  if(job==='sect-campus:farm')return 1;
  if(scene.society?.places.get('music')?.staff.id===npc.id)return 8;
  if(scene.society?.places.get('clinic')?.staff.id===npc.id)return 6;
  if(specialty==='alchemy')return 4;
  if(specialty==='forge')return 5;
  if(/tông chủ|trưởng lão/i.test(duty)||['sect_leader','sect_elder'].includes(role))return 10;
  if(['farmer','spirit_farmer'].includes(role)||profession==='nong_dan')return 1;
  if(role==='miner'||profession==='khoang_cong')return 2;
  if(profession==='thuong_nhan'||role==='merchant')return 3;
  if(profession==='dan_su'||role==='alchemist')return 4;
  if(['forge_master','blacksmith'].includes(role)||profession==='tho_re')return 5;
  if(role==='doctor'||profession==='duoc_su')return 6;
  if(role==='hunter')return 7;
  if(role==='musician'||profession==='nhac_su')return 8;
  if(profession==='tu_si')return 9;
  return null;
}

export function applyProfession(renderer,npc,tool){
  const root=renderer.root,scene=root.scene,mark=professionMarker(npc,scene);
  if(!scene.textures.exists('di-mach-profession'))return;
  if(mark===null&&tool===null&&!renderer.professionMark)return;
  if(!renderer.professionMark){
    renderer.professionMark=scene.add.image(0,0,'di-mach-profession',0).setOrigin(.5);
    root.add(renderer.professionMark);
  }
  const marker=renderer.professionMark;
  const hand=renderer.attachments?.hand,along=renderer.direction==='left'?-1:1;
  let image=renderer.professionTool;
  if(mark!==null){
    const torso=renderer.layers.outerCloth;
    const y=renderer.seated?.visible?-28:torso.y+60;
    if(marker.frame.name!==mark)marker.setFrame(mark);
    marker.setPosition(along*(renderer.direction==='up'?7:11),y).setVisible(true);
    root.bringToTop(marker);
  }else marker.setVisible(false);
  if(hand&&tool!==null&&!renderer.seated?.visible&&!renderer.combat.action&&!renderer.flightWeapon){
    if(!image){image=renderer.professionTool=scene.add.image(0,0,'di-mach-profession',tool).setOrigin(.5);root.add(image);}
    if(image.frame.name!==tool)image.setFrame(tool);
    image.setPosition(hand.x,hand.y-5).setVisible(true);
    root.bringToTop(image);
  }else image?.setVisible(false);
}
