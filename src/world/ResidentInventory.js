import './resident-inventory.css';
import { itemIcon,ITEM_CATALOG } from '../dao/ItemCatalog.ts';
import { EconomySystem } from '../dao/EconomySystem.ts';
import { cultivationStats } from '../systems/CultivationSystem.ts';
import { tribulationLocked } from '../dao/TribulationSystem.ts';
import { ELEMENTS, GRADES, LEGACY_GRADES, MARTIAL_TECHNIQUES, MARTIAL_WEAPONS } from '../dao/MartialRegistry.ts';
import { martialMastery } from '../dao/MartialProgress.ts';
import { priceMartial } from './MartialEconomy.js';
import {ensureWeaponStack,weaponTemplate} from '../dao/WeaponInstances.ts';

export const itemQualities={low:'Hạ phẩm',middle:'Trung phẩm',high:'Thượng phẩm'};
const USABLE=new Set(['healing_pill','ration']);
const manuals=Object.fromEntries(Object.values(MARTIAL_TECHNIQUES).map(course=>[course.book,course]));

export function makeItemIcon(id){
  const icon=document.createElement('span');
  const [x,y]=itemIcon(id);
  icon.className='resident-item-icon';
  icon.style.backgroundPosition=`${-1.5*x}px ${-1.5*y}px`;
  icon.dataset.quality=ITEM_CATALOG[id]?.quality??'low';
  const grade=(manuals[id]??MARTIAL_WEAPONS[id])?.grade;
  if(grade!==undefined)icon.style.borderColor='#'+GRADES[grade].color.toString(16);
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
    npc.hp=Math.min(hpMax,npc.hp+Math.min(85,hpMax*.35));
  }
  return true;
}

export function renderResidentInventory(scene,fields,npc,active){
  const signature=JSON.stringify([npc.id,npc.spiritStones,npc.inventory,npc.equippedWeapon,npc.equippedWeaponInstance,npc.martial?.learned,npc.martialDurability,active]);
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
    const manual=manuals[stack.itemId],spec=manual??MARTIAL_WEAPONS[stack.itemId];
    const grade=spec?.grade??(item?.kind==='weapon'?LEGACY_GRADES[item.tier]:undefined);
    detail.textContent=[grade!==undefined?GRADES[grade].name+' phẩm':itemQualities[item?.quality],
      spec?.grade>=3?'Truyền thừa hữu hạn':spec?priceMartial(scene.populationWorld,stack.itemId)+' linh thạch tham chiếu':item?.value>0?item.value+' linh thạch':null,
      npc.equippedWeapon===stack.itemId?'Đang trang bị':null].filter(Boolean).join(' · ');
    description.textContent=item?.description??'Chưa có mô tả vật phẩm.';
    text.append(label,detail,description);
    row.append(makeItemIcon(stack.itemId),text);
    if(spec){
      const details=document.createElement('details'), summary=document.createElement('summary');
      summary.textContent='Giám định';details.append(summary);
      const add=value=>{const line=document.createElement('small');line.textContent=value;details.append(line);};
      add('Thuộc tính '+ELEMENTS[spec.element]+' · Nguồn '+spec.source+' · Chủ sở hữu '+npc.name);
      if(manual){
        add('Cảnh giới vận dụng tối thiểu '+['Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần'][manual.minimum]+' · Linh căn hợp '+manual.roots.join(', '));
        for(const move of manual.skills)add(move.name+' · '+move.mp+' linh lực · '+move.description);
      }else{
        add('Độ bền '+(npc.martialDurability?.[spec.id]??spec.durability)+'/'+spec.durability+' · Tầm đòn '+spec.range+' px · Cường độ '+Math.round(spec.bonus*100)+'%');
        add('Tương hợp '+MARTIAL_TECHNIQUES[spec.course].name+' · '+spec.materials.map(id=>ITEM_CATALOG[id]?.name??id).join(', '));
      }
      const source=scene.populationWorld.events.findLast(event=>event.data?.item===stack.itemId&&event.actorId===npc.id);
      if(source)add(source.description);
      text.append(details);
      if(active&&spec.grade>=2){
        const auction=document.createElement('button');
        auction.type='button';auction.textContent='Đăng đấu giá tại Phường Thị';
        auction.onclick=()=>{
          if(scene.possessedNpcId!==npc.id)return;
          scene.worldPopulationToast(scene.martialEconomy.listAuction(npc,stack.itemId)?'Đã đăng đấu giá trong một ngày.':'Cần có thể bán món này và đứng cạnh quầy Phường Thị đang mở.');
        };
        row.append(auction);
      }
    }
    if(weaponTemplate(stack.itemId)){
      const copies=ensureWeaponStack(stack,npc.id,npc.martialDurability?.[stack.itemId]);
      const group=document.createElement('details'), heading=document.createElement('summary');
      heading.textContent='Từng bản vũ khí';
      group.append(heading);
      for(const copy of copies){
        const worn=npc.equippedWeaponInstance===copy.id;
        const line=document.createElement('small');
        const called=scene.martialCombat?.borrowed.has(copy.id);
        line.textContent=(worn?'Đang trang bị · ':'')+(called?'Đang gọi kiếm ảnh · ':'')+copy.id.slice(-8)+' · '+copy.durability+'/'+weaponTemplate(stack.itemId).durability+' độ bền';
        line.title='Chủ sở hữu '+npc.name+' · '+copy.history.join(' → ');
        group.append(line);
        if(active&&!worn&&copy.durability>0){
          const equip=document.createElement('button');equip.type='button';equip.textContent='Trang bị '+copy.id.slice(-5);
          equip.onclick=()=>scene.equipPossessedWeapon(stack.itemId,copy.id);
          group.append(equip);
        }
      }
      text.append(group);
    }
    if(active&&manual){
      const learn=document.createElement('button');
      learn.type='button';learn.textContent='Học';learn.disabled=martialMastery(npc,manual.id)>=0;
      learn.onclick=()=>{
        if(scene.possessedNpcId!==npc.id)return;
        scene.worldPopulationToast(scene.martialEconomy.learn(npc,stack.itemId)?'Đã lĩnh ngộ '+manual.name+'.':'Chưa thể học bí kíp này.');
        scene.refreshPossessionHud();
      };
      row.append(learn);
    }
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
