import { createWorldUuid } from '../world/WorldId.ts';
import { MARTIAL_WEAPONS } from './MartialRegistry.ts';

export type WeaponInstance = {
  id:string; templateId:string; grade:number; durability:number; ownerId:string;
  history:string[];
};
export type ItemInstance = {id:string; templateId:string; ownerId:string; history:string[]};
export type WeaponStack = {itemId:string; count:number; instances?:WeaponInstance[]; itemInstances?:ItemInstance[]};
type Holder = {
  id:string; inventory?:WeaponStack[]; equippedWeapon?:string|null; equippedWeaponInstance?:string|null;
  martialDurability?:Record<string,number>;
};

const LEGACY:Record<string,{grade:number;icon:number;kind:string}> = {
  iron_sword:{grade:0,icon:0,kind:'jian'},mortal_gift_sword:{grade:0,icon:0,kind:'jian'},qingfeng_sword:{grade:1,icon:3,kind:'jian'},
  iron_dao:{grade:0,icon:1,kind:'dao'},training_crossbow:{grade:0,icon:0,kind:'crossbow'},
};

export function weaponTemplate(id:string){
  return MARTIAL_WEAPONS[id]??(Object.hasOwn(LEGACY,id)?{...LEGACY[id],durability:100}:undefined);
}

export function adoptInstances(instances:WeaponInstance[],ownerId:string){
  for(const instance of instances){
    if(instance.ownerId===ownerId)continue;
    instance.ownerId=ownerId;
    instance.history=[...instance.history,ownerId].slice(-12);
  }
  return instances;
}

export function ensureWeaponStack(stack:WeaponStack,ownerId:string,legacyWear?:number){
  const template=weaponTemplate(stack.itemId);
  if(!template)return [];
  const instances=stack.instances??=[];
  if(instances.length>stack.count)instances.length=stack.count;
  while(instances.length<stack.count){
    const durability=instances.length===0&&legacyWear!==undefined?
      Math.max(0,Math.min(template.durability,legacyWear)):template.durability;
    instances.push({id:'weapon:'+createWorldUuid(),templateId:stack.itemId,grade:template.grade,durability,ownerId,history:[ownerId]});
  }
  return adoptInstances(instances,ownerId);
}

export function equippedInstance(holder:Holder){
  const key=holder.equippedWeapon;
  const stack=key&&holder.inventory?.find(item=>item.itemId===key&&item.count>0);
  if(!stack||!weaponTemplate(stack.itemId))return undefined;
  const instances=ensureWeaponStack(stack,holder.id,holder.martialDurability?.[stack.itemId]);
  const next=instances.find(item=>item.id===holder.equippedWeaponInstance)??instances[0];
  if(next)holder.equippedWeaponInstance=next.id;
  return next;
}

export function reserveWeaponInstances(stack:WeaponStack,count:number,ownerId:string,equippedId?:string|null,legacyWear?:number){
  const instances=ensureWeaponStack(stack,ownerId,legacyWear);
  const selected=instances.filter(item=>item.id!==equippedId).slice(0,count);
  if(selected.length!==count)return [];
  stack.instances=instances.filter(item=>!selected.includes(item));
  return selected;
}

export function ensureWorldWeaponInstances(world:{
  npcs:Holder[];
  shops:{id:string;stock:WeaponStack[]}[];
  factions:{id:string;treasury:WeaponStack[]}[];
  environment?:{drops:(WeaponStack&{id:string;status:string})[]};
}){
  for(const holder of world.npcs){
    for(const stack of holder.inventory??[])ensureWeaponStack(stack,holder.id,holder.martialDurability?.[stack.itemId]);
    equippedInstance(holder);
  }
  for(const shop of world.shops)for(const stack of shop.stock)ensureWeaponStack(stack,shop.id);
  for(const faction of world.factions)for(const stack of faction.treasury)ensureWeaponStack(stack,faction.id);
  for(const drop of world.environment?.drops??[])if(drop.status==='ground')ensureWeaponStack(drop,drop.id);
}
