import {ITEM_CATALOG,itemIcon} from '../dao/ItemCatalog.ts';
import {ELEMENTS,GRADES,LEGACY_GRADES,MARTIAL_TECHNIQUES,MARTIAL_WEAPONS} from '../dao/MartialRegistry.ts';
import {ensureWeaponStack,weaponTemplate} from '../dao/WeaponInstances.ts';
import {createWorldUuid} from './WorldId.ts';

const manuals=Object.fromEntries(Object.values(MARTIAL_TECHNIQUES).map(book=>[book.book,book]));
const techniquePrices=[[3,5,8],[20,40,60],[120,210,300],[800,1400,2000],[8000,14000,20000]];
const weaponPrices=[[4,8,12],[30,65,100],[180,340,500],[1200,2100,3000],[12000,21000,30000]];
const byGrade=(items,grade)=>items.filter(item=>item.grade===grade);
const armList=Object.values(MARTIAL_WEAPONS);
const bookList=Object.values(MARTIAL_TECHNIQUES);

export function commerceProduct(id){
  if(!Object.hasOwn(ITEM_CATALOG,id))return null;
  const catalog=ITEM_CATALOG[id], book=manuals[id], arm=MARTIAL_WEAPONS[id];
  const grade=(book??arm)?.grade??Math.min(4,LEGACY_GRADES[catalog.tier]??0);
  return {...catalog,book,arm,grade,gradeName:GRADES[grade].name,
    element:ELEMENTS[(book??arm)?.element]??'',kind:book?'manual':catalog.kind};
}

export const progressionOffers=Object.fromEntries([
  ...bookList.map(book=>[book.book,{divinePowerPrice:techniquePrices[book.grade][byGrade(bookList,book.grade).indexOf(book)]}]),
  ...armList.map(arm=>[arm.id,{divinePowerPrice:weaponPrices[arm.grade][byGrade(armList,arm.grade).indexOf(arm)]}]),
]);

const unknown=itemIcon('unknown');
export const ordinaryOffers=Object.fromEntries(Object.values(ITEM_CATALOG).filter(item=>
  !progressionOffers[item.id]&&item.kind!=='special'&&item.value>0&&!item.id.startsWith('spirit_stone_')&&
  itemIcon(item.id)!==unknown
).map(item=>[item.id,{divinePowerPrice:({pill:12,herb:16,material:8,treasure:28,talisman:18,weapon:20})[item.kind]*
  (1+(LEGACY_GRADES[item.tier]??0)*2)}]));

export function trackOne(stack,owner,id=createWorldUuid(),holder){
  const template=weaponTemplate(stack.itemId);
  if(template){
    const weapon=ensureWeaponStack(stack,owner,holder?.martialDurability?.[stack.itemId])
      .find(item=>item.id!==holder?.equippedWeaponInstance);
    return weapon?.id;
  }
  const existing=stack.itemInstances?.[0];
  if(existing)return existing.id;
  (stack.itemInstances??=[]).push({id,templateId:stack.itemId,ownerId:owner,history:[owner]});
  return id;
}

export const worldMinute=world=>(world.clock?.day??0)*1440+(world.clock?.minute??0);

export function commerceEvent(world,id,type,description,actorId,targetId,data){
  if(!world.clock||!world.events)return;
  const {day,minute}=world.clock;
  world.events.push({id,type,day,minute,actorId,targetId,description,data,status:'completed'});
  if(world.events.length>400)world.events.splice(0,world.events.length-400);
}
