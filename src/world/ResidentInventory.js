import './resident-inventory.css';
import { itemIcon,ITEM_CATALOG } from '../dao/ItemCatalog.ts';
import { EconomySystem } from '../dao/EconomySystem.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { tribulationLocked } from '../dao/TribulationSystem.ts';

export const itemQualities={low:'Hạ phẩm',middle:'Trung phẩm',high:'Thượng phẩm'};
const USABLE=new Set(['healing_pill','ration']);

export function makeItemIcon(id){
  const icon=document.createElement('span');
  const [x,y]=itemIcon(id);
  icon.className='resident-item-icon';
  icon.style.backgroundPosition=`${-1.5*x}px ${-1.5*y}px`;
  icon.dataset.quality=ITEM_CATALOG[id]?.quality??'low';
  icon.setAttribute('aria-hidden','true');
  return icon;
}

export function useResidentItem(npc,id){
  if(!npc.alive||npc.ascended||npc.flight||tribulationLocked(npc)||!USABLE.has(id))return false;
  if(id==='ration'){
    if(npc.hunger<1||!EconomySystem.remove(npc.inventory,id,1))return false;
    npc.hunger=Math.max(0,npc.hunger-68);
  }else{
    const {hpMax}=cultivationStats(npc);
    if(npc.hp>=hpMax||!EconomySystem.remove(npc.inventory,id,1))return false;
    npc.hp=Math.min(hpMax,npc.hp+Math.ceil(hpMax*.35));
  }
  return true;
}

export function renderResidentInventory(scene,fields,npc,active){
  const signature=JSON.stringify([npc.spiritStones,npc.inventory,npc.equippedWeapon,active]);
  if(fields.inventory.dataset.signature===signature)return;
  fields.inventory.dataset.signature=signature;
  fields.inventory.querySelector('summary').textContent=`Túi đồ · ${npc.inventory.reduce((total,item)=>total+item.count,0)} món · ${npc.spiritStones} linh thạch`;
  const list=fields.inventory.querySelector('.resident-items');
  list.replaceChildren();
  for(const stack of npc.inventory){
    if(stack.count<=0)continue;
    const item=ITEM_CATALOG[stack.itemId];
    const row=document.createElement('div');row.className='resident-item';
    const text=document.createElement('div');
    const label=document.createElement('b'),detail=document.createElement('small'),description=document.createElement('small');
    label.textContent=(item?.name??stack.itemId)+' ×'+stack.count;
    detail.textContent=[itemQualities[item?.quality],item?.value>0?item.value+' linh thạch':null,
      npc.equippedWeapon===stack.itemId?'Đang trang bị':null].filter(Boolean).join(' · ');
    description.textContent=item?.description??'Chưa có mô tả vật phẩm.';
    text.append(label,detail,description);
    row.append(makeItemIcon(stack.itemId),text);
    if(active&&USABLE.has(stack.itemId)){
      const use=document.createElement('button');
      use.type='button';use.textContent='Dùng';use.setAttribute('aria-label','Dùng '+item.name);
      use.onclick=()=>{
        if(scene.possessedNpcId!==npc.id)return;
        const before={hp:npc.hp,hunger:npc.hunger,inventory:structuredClone(npc.inventory)};
        if(!useResidentItem(npc,stack.itemId)){scene.worldPopulationToast('Hiện chưa thể dùng '+item.name+'.');return;}
        if(!scene.persistPopulation()){
          Object.assign(npc,before);
          scene.worldPopulationToast('Bản lưu đã thay đổi. Chưa dùng vật phẩm.');
          return;
        }
        scene.worldPopulationToast('Đã dùng '+item.name+'.');
        scene.refreshPossessionHud();
      };
      row.append(use);
    }
    list.append(row);
  }
  if(!list.childElementCount)list.textContent='Túi đồ trống.';
}
