import {ensureWeaponStack,weaponTemplate} from '../dao/WeaponInstances.ts';

export function borrowSwords(scene,caster,claimed){
  const world=scene.populationWorld, candidates=[], seen=new Set();
  const mapId=caster.mapId??world.environment.mapId;
  const add=(stack,owner,point,wear)=>{
    const template=weaponTemplate(stack.itemId);
    if(template?.kind!=='jian')return;
    for(const instance of ensureWeaponStack(stack,owner,wear)){
      if(seen.has(instance.id)||claimed.has(instance.id)||instance.durability<=0)continue;
      seen.add(instance.id);
      const distance=point?Math.hypot(point.x-caster.x,point.y-caster.y):Infinity;
      candidates.push({instance,point,distance,icon:template.icon,representative:distance>420});
    }
  };
  for(const npc of world.npcs){
    if(!npc.alive||npc!==caster&&npc.realmIndex>caster.realmIndex)continue;
    const point=npc.underground||(npc.mapId??world.environment.mapId)!==mapId?undefined:{x:npc.x,y:npc.y};
    for(const stack of npc.inventory)add(stack,npc.id,point,npc.martialDurability?.[stack.itemId]);
  }
  for(const shop of world.shops){
    const point=scene.merchants?.shops.get(shop.id)?.position;
    for(const stack of shop.stock)add(stack,shop.id,point);
  }
  for(const faction of world.factions)for(const stack of faction.treasury)add(stack,faction.id);
  for(const drop of world.environment.drops)if(drop.status==='ground')add(drop,drop.id,{x:drop.x,y:drop.y});
  candidates.sort((a,b)=>a.distance-b.distance||a.instance.id.localeCompare(b.instance.id));
  const variety=new Set();
  const ranked=[...candidates.filter(x=>!variety.has(x.icon)&&variety.add(x.icon)),...candidates];
  const selected=[...new Set(ranked)].slice(0,8);
  for(const weapon of selected)claimed.add(weapon.instance.id);
  return selected;
}
