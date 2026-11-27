import {GRADES,ELEMENTS,MASTERY,MARTIAL_TECHNIQUES,MARTIAL_WEAPONS} from '../dao/MartialRegistry.ts';
import {activateMartial,martialCastCheck,martialMastery,martialPower,martialQiCost,martialResonance} from '../dao/MartialProgress.ts';
import {ITEM_CATALOG} from '../dao/ItemCatalog.ts';
import {priceMartial} from './MartialEconomy.js';
import {cultivationStats} from '../systems/CultivationSystem.ts';
import {TECHNIQUES} from '../systems/TechniqueSystem.ts';

export function renderMartialProfile(scene,panel,npc,active){
  if(!panel)return;
  const content=panel.lastElementChild;
  const timer=scene.martialCombat.clock;
  const book=MARTIAL_TECHNIQUES[npc.martial?.active];
  const arm=MARTIAL_WEAPONS[npc.equippedWeapon];
  const render=()=>{
    if(!panel.open)return;
    const library=active&&scene.sectCampus.atLibrary(npc);
    const forge=active&&scene.martialEconomy.atForge(npc);
    const auction=active&&scene.martialEconomy.atAuction(npc);
    const signature=JSON.stringify([npc.id,active,library,forge,auction,auction&&scene.martialEconomy.auctions,npc.realmIndex,npc.realmLevel,npc.martial?.active,npc.martial?.selected,npc.martial?.legacyKey,npc.martial?.learned,npc.equippedWeapon,npc.martialDurability,Math.floor(npc.mp),book?.skills.map(s=>Math.max(0,Math.ceil(((npc.martial.ready[s.id]??0)-timer)/1000)))]);
    if(content.dataset.signature===signature)return;
    content.dataset.signature=signature;
    content.replaceChildren();
    const line=(value,grade)=>{
      const text=document.createElement('p');text.textContent=value;
      if(grade!==undefined)text.style.color='#'+GRADES[grade].color.toString(16);
      content.append(text);
    };
    const button=(label,callback,disabled=false)=>{
      const node=document.createElement('button');node.type='button';node.textContent=label;node.disabled=disabled;
      node.onclick=()=>{if(scene.possessedNpcId!==npc.id)return;callback();delete content.dataset.signature;scene.requestBackgroundSave();scene.refreshPossessionHud();};
      content.append(node);
    };
    const select=(values,value,callback)=>{
      const node=document.createElement('select');
      for(const [id,label] of values)node.add(new Option(label,id));
      node.value=value;
      node.onchange=()=>{if(scene.possessedNpcId!==npc.id)return;callback(node.value);scene.requestBackgroundSave();scene.refreshPossessionHud();};
      content.append(node);
    };
    if(book){
      const progress=martialMastery(npc,book.id);
      const resonance=martialResonance(npc);
      line(`${book.name} · ${GRADES[book.grade].name} phẩm · ${ELEMENTS[book.element]} · ${MASTERY[progress]} · ${Math.floor(npc.mp)} linh lực`,book.grade);
      line('Linh căn tương hợp '+book.roots.join(', '));
      if(resonance)line('Tương hợp với vũ khí +'+Math.round(resonance*100)+'%');
      if(active)select(Object.keys(npc.martial.learned).filter(id=>MARTIAL_TECHNIQUES[id]).map(id=>[id,MARTIAL_TECHNIQUES[id].name]),book.id,id=>activateMartial(npc,id));
      for(const move of book.skills){
        const cool=Math.max(0,Math.ceil(((npc.martial.ready[move.id]??0)-timer)/1000));
        const lock=martialCastCheck(npc,move,timer);
        const offensive=!['guard','heal','dash'].includes(move.effect);
        const output=offensive&&progress>=move.stage?' · Uy lực thô '+Math.round(martialPower(npc,move,cultivationStats(npc).attack))+' mỗi lượt':'';
        line(`${move.name} · ${martialQiCost(npc,move)} linh lực · ${cool?cool+' s còn lại':lock||'Sẵn sàng'}${output} · ${move.description}`);
        if(active)button(scene.martialCombat.selected(npc)===move.id&&!npc.martial.legacyKey?'Đang gán phím K':'Gán '+move.name+' vào K',()=>{npc.martial.selected=move.id;npc.martial.legacyKey=false;},progress<move.stage);
      }
      if(active)button('Dùng võ kỹ vũ khí cũ với K',()=>{npc.martial.legacyKey=true;},npc.martial.legacyKey);
    }else{
      const legacy=TECHNIQUES[npc.technique];
      line(legacy?`${legacy.name} · Công pháp nền · Thuần thục ${npc.techniqueMastery?.[npc.technique]??0}/10`:'Đọc bí kíp trong túi đồ để học công pháp.');
    }
    if(arm){
      line(`${arm.name} · ${GRADES[arm.grade].name} phẩm · ${ELEMENTS[arm.element]} · ${npc.martialDurability?.[arm.id]??arm.durability}/${arm.durability} độ bền`,arm.grade);
      line(`Chủ sở hữu ${npc.name} · ${arm.grade>=3?'Truyền thừa hữu hạn':priceMartial(scene.populationWorld,arm.id)+' linh thạch tham chiếu'} · ${arm.source}`);
      if(arm.materials.length)line(arm.materials.map(id=>ITEM_CATALOG[id]?.name??id).join(', '));
      const source=scene.populationWorld.events.findLast?.(event=>event.data?.item===arm.id&&event.actorId===npc.id);
      if(source)line(source.description);
    }
    if(library){
      for(const id of scene.martialEconomy.lessons){
        const lesson=MARTIAL_TECHNIQUES[id], known=martialMastery(npc,id)>=0;
        button((known?'Nghiên cứu ':'Học ')+lesson.name+(known?'':' · '+(lesson.grade===2?12:4)+' cống hiến'),()=>{
          scene.worldPopulationToast(scene.martialEconomy.library(npc,id)?'Đã học hoặc nghiên cứu công pháp.':'Chưa đủ điều kiện hoặc đã nghiên cứu hôm nay.');
        });
      }
    }
    if(forge){
      for(const recipe of Object.values(MARTIAL_WEAPONS)){
        button('Rèn '+recipe.name+' · '+recipe.materials.map(id=>ITEM_CATALOG[id]?.name??id).join(', '),()=>{
          scene.worldPopulationToast(scene.martialEconomy.forge(npc,recipe.id)?'Đã rèn thành công.':'Thiếu nguyên liệu, cảnh giới hoặc tay nghề.');
        },!recipe.crafting&&!scene.martialEconomy.canForgeRare(npc,recipe));
      }
      line('Linh bảo Địa và Thiên phẩm cần cảnh giới khuyến nghị, công pháp cao cấp đạt Viên mãn và chưa xuất thế.');
    }
    if(auction&&scene.martialEconomy.auctions.length){
      line('Các lô Phường Thị đang chờ kết toán từ bản lưu cũ');
      for(const row of scene.martialEconomy.auctions){
        const price=scene.martialEconomy.auctionAsk(row);
        button((ITEM_CATALOG[row.itemId]?.name??row.itemId)+' · Trả '+price+' linh thạch',()=>{
          scene.worldPopulationToast(scene.martialEconomy.bidAuction(npc,row)?'Đã ghi giá trả. Thanh toán khi phiên kết thúc.':'Chưa thể trả giá.');
        },row.seller===npc.id||row.bids[0]?.buyer===npc.id||npc.spiritStones<price);
      }
    }
    if(active&&scene.weeklyAuction?.nearDesk(npc))button('Mở Vạn Bảo Đấu Giá Hội',()=>scene.weeklyAuction.panel.open());
  };
  panel.ontoggle=render;
  render();
}
