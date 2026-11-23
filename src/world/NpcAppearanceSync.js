/** Only editor writes that change NPC appearance may be adopted by a running world. */
export function appearanceEdits(previousRaw,nextRaw){
  if(!previousRaw||!nextRaw)return null;
  try{
    const previous=JSON.parse(previousRaw),next=JSON.parse(nextRaw);
    if(previous.worldId!==next.worldId||previous.npcs.length!==next.npcs.length)return null;
    const updates=new Map();
    for(const [i,npc] of next.npcs.entries()){
      const before=previous.npcs[i];
      if(before.id!==npc.id)return null;
      if(JSON.stringify(before.modularAppearance)!==JSON.stringify(npc.modularAppearance))
        updates.set(npc.id,npc.modularAppearance);
      delete before.modularAppearance;
      delete npc.modularAppearance;
    }
    return updates.size&&JSON.stringify(previous)===JSON.stringify(next)?updates:null;
  }catch{return null;}
}
