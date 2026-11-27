import { ROD, SHOP, SKILLS, buyHeavenItem, buyAndGiftHeavenItem, commitHeavenChange, giftHeavenItem, itemName, learnHeavenBook, migrateHeavenVault, shopLedger } from './HeavenShop.js';
import { createWorldUuid } from '../world-rebuild-population.js';
import {GRADES,ELEMENTS,MARTIAL_TECHNIQUES} from '../dao/MartialRegistry.ts';
import {REALMS} from '../systems/RealmConfig.ts';
import {commerceProduct} from './CommerceCatalog.js';
import {opportunityForms} from './HeavenOpportunities.js';
import {makeItemIcon} from './ResidentInventory.js';

const icon = id => {
  const arm=commerceProduct(id)?.arm;
  if(!arm)return makeItemIcon(id);
  const sprite=document.createElement('span');
  sprite.className='commerce-weapon';
  sprite.style.backgroundPosition=-arm.icon*36+'px 0';
  sprite.dataset.element=arm.element;
  return sprite;
};
function selectOptions(label,entries){
  const input=document.createElement('select');
  input.setAttribute('aria-label',label);
  for(const [id,name] of entries)input.add(new Option(name,id));
  return input;
}

export function mountHeavenShop(scene) {
  const opener = document.getElementById('open-heaven-shop');
  const panel = document.getElementById('heaven-shop');
  let tab = 'goods', recipientId = null;
  const world = scene.populationWorld;
  migrateHeavenVault(world);
  const filter={grade:'',element:'',category:'',price:''};
  let lockedRecipient = false, busyUntil = 0;
  scene.openNpcGift = id => { if (scene.possessedNpcId) return; recipientId = id; lockedRecipient = true; tab = 'gift'; panel.hidden = false; panel.querySelector('[role=status]').textContent = ''; render(); };
  scene.closeNpcGift = () => { if (lockedRecipient) panel.hidden = true; };
  scene.refreshHeavenWallet = () => {
    if (!panel.hidden && panel.dataset.power !== String(world.heaven.divinePower)) render();
  };
  const render = () => {
    panel.dataset.power = String(world.heaven.divinePower);
    const recipient = world.npcs.find(n => n.id === recipientId);
    panel.querySelector('header b').textContent = tab === 'gift' ? 'Ban cơ duyên — ' + (recipient?.name ?? 'Chọn cư dân') : 'Thiên Đạo Thương Điếm';
    panel.querySelector('[data-heaven-power]').textContent = Math.floor(world.heaven.divinePower) + ' Thần Lực';
    const list = panel.querySelector('[data-heaven-list]');
    list.replaceChildren();
    for (const button of panel.querySelectorAll('[data-heaven-tab]')) {
      button.setAttribute('aria-pressed', String(button.dataset.heavenTab === tab));
    }
    const records = shopLedger(world).filter(row => row.owner === 'heaven');
    const showResult=result=>{panel.querySelector('[role=status]').textContent=result.message;render();};
    if(tab==='opportunity'){
      renderOpportunities(scene,panel,list,records,showResult);
      return;
    }
    if(['goods','skills','arms'].includes(tab)){
      const filters=document.createElement('div');
      filters.className='commerce-filters';
      for(const [key,label,values] of [
        ['grade','Phẩm cấp',GRADES.map((g,i)=>[i,g.name])],
        ['element','Thuộc tính',Object.entries(ELEMENTS).map(([,name])=>[name,name])],
        ['category','Loại',['pill','herb','material','treasure','talisman','weapon','manual'].map((id,i)=>[id,['Đan dược','Linh dược','Nguyên liệu','Pháp bảo','Phù','Vũ khí','Công pháp'][i]])],
        ['price','Giá thần lực',[[12,'≤ 12'],[100,'≤ 100'],[500,'≤ 500'],[3000,'≤ 3.000'],[30000,'≤ 30.000']]],
      ]){
        const select=selectOptions(label,[['',label],...values]);
        select.value=filter[key];select.onchange=()=>{filter[key]=select.value;render();};filters.append(select);
      }
      list.append(filters);
    }
    if (tab === 'gift') {
      if (!records.length) {const empty = document.createElement('p'); empty.textContent = 'Kho Thiên Đạo đang trống. Có thể mua và ban bên dưới.'; list.append(empty);}
      const label = document.createElement('label');
      label.textContent = 'Người nhận';
      const select = document.createElement('select');
      select.add(new Option('Chọn cư dân', ''));
      for (const npc of world.npcs.filter(n => n.alive && !n.ascended)) select.add(new Option(npc.name + ' · ' + scene.npcRoleTitle(npc), npc.id));
      select.value = recipientId ?? '';
      select.disabled = lockedRecipient;
      const back = document.createElement('button'); back.textContent = 'Quay lại hồ sơ NPC'; back.onclick = () => {panel.hidden = true; scene.renderPossessionHud();}; list.append(back);
      select.onchange = () => { recipientId = select.value; render(); };
      label.append(select);
      const search=document.createElement('input');
      search.type='search';search.placeholder='Tìm tên cư dân';search.disabled=lockedRecipient;
      search.oninput=()=>{const term=search.value.toLocaleLowerCase('vi');for(const option of select.options)option.hidden=Boolean(option.value&&!option.text.toLocaleLowerCase('vi').includes(term));};
      list.append(label,search);
      if(recipient){
        const note=document.createElement('small');
        note.textContent=[REALMS[recipient.realmIndex]?.name+' tầng '+recipient.realmLevel,'Linh căn '+recipient.spiritualRoot,
          MARTIAL_TECHNIQUES[recipient.martial?.active]?.name,itemName(recipient.equippedWeapon??'Tay không')].filter(Boolean).join(' · ');
        list.append(note);
      }
    }
    const rows = ['goods','skills','arms'].includes(tab)
      ? Object.entries(SHOP).filter(([id,item]) => {
        const product=commerceProduct(id);
        const belongs=product.book||item.skill?'skills':product.arm?'arms':'goods';
        return belongs===tab&&(!filter.grade||Number(filter.grade)===product.grade)&&(!filter.element||filter.element===product.element)&&
          (!filter.category||filter.category===product.kind)&&(!filter.price||item.divinePowerPrice<=Number(filter.price));
      }).sort(([a],[b])=>commerceProduct(a).grade-commerceProduct(b).grade).map(([itemId])=>({itemId}))
      : tab === 'gift'&&lockedRecipient ? [...records, ...Object.entries(SHOP).filter(([id,entry])=>entry.uniqueInVault&&!records.some(r=>r.itemId===id)).map(([itemId])=>({itemId}))] : records;
    let section = '';
    for (const row of rows) {
      if(row.itemId==='training_crossbow'&&!row.id&&!scene.characterRigPreview)continue;
      const entry = SHOP[row.itemId];
      if (!entry&&!row.id) continue;
      const product=commerceProduct(row.itemId);
      if(!product)continue;
      const cost=row.divinePowerPrice??entry?.divinePowerPrice??0;
      const group = row.id ? 'Kho Thiên Đạo' : 'Mua từ Thương Điếm';
      if (section !== group) {const heading = document.createElement('h3'); heading.textContent = group; list.append(heading); section = group;}
      const card = document.createElement('article');
      card.dataset.itemId=row.itemId;
      if(row.id)card.dataset.transactionId=row.id;
      const description = document.createElement('span');
      description.textContent = itemName(row.itemId);
      const count = records.filter(r => r.itemId === row.itemId).length;
      const price = document.createElement('small');
      price.textContent=[product.gradeName+' cấp',product.element,'Kho '+count,cost+' Thần lực',row.cargo?.[0]?.instances?.[0]?.durability!==undefined?'Độ bền '+row.cargo[0].instances[0].durability:null].filter(Boolean).join(' · ');
      description.append(price);
      if (row.itemId === ROD) {const hint = document.createElement('small'); hint.textContent = 'Trang bị để câu cá tại sông.'; description.append(hint);}
      const skill = SKILLS[entry?.skill];
      if(product.book){
        const details=document.createElement('small');details.textContent=product.book.skills.map(s=>s.name).join(' · ');description.append(details);
      }
      if(recipient&&(product.book||product.arm)){
        const compatible=product.book?recipient.realmIndex>=product.book.minimum&&product.book.roots.includes(recipient.spiritualRoot):
          recipient.realmIndex>=product.arm.minRealm;
        const info=document.createElement('small');info.textContent=compatible?'Phù hợp điều kiện sử dụng':'Chưa phù hợp cảnh giới hoặc linh căn';
        description.append(info);
      }
      if (skill) {
        const details = document.createElement('small');
        details.textContent = 'Luyện Khí tầng ' + skill.level + ' · ' + skill.mp + ' linh lực' + (skill.weapon ? ' · Cần ' + (skill.weapon === 'jian' ? 'kiếm' : 'đao') : '');
        description.append(details);
      }
      card.append(icon(row.itemId), description);
      if (tab !== 'vault') {
        const action = document.createElement('button');
        action.textContent = tab === 'gift' ? (row.id ? 'Ban tặng' : 'Mua và ban tặng') : 'Mua · ' + cost;
        action.disabled = tab === 'gift' ? !recipient?.alive || recipient.ascended || (!row.id && world.heaven.divinePower < cost) :
          world.heaven.divinePower < cost || Boolean(entry?.uniqueInVault&&records.some(r => r.itemId === row.itemId));
        action.onclick = () => {
          if (action.disabled || performance.now() < busyUntil) return;
          busyUntil = performance.now() + 650;
          action.disabled = true;
          const npc = tab === 'gift' ? world.npcs.find(n => n.id === recipientId) : null;
          const result = commitHeavenChange(scene, npc, () => tab === 'gift'
            ? (row.id ? giftHeavenItem(world, row.id, npc) : buyAndGiftHeavenItem(world, row.itemId, npc, createWorldUuid()))
            : buyHeavenItem(world, row.itemId, createWorldUuid()));
          panel.querySelector('[role=status]').textContent = result.message;
          if(result.ok&&npc)giftGlow(scene,npc,product.grade);
          render();
          scene.refreshHeavenWallet();
          scene.refreshPossessionHud();
        };
        card.append(action);
      }
      list.append(card);
    }
    if (!rows.length) list.append(['goods','skills','arms'].includes(tab)?'Không có mặt hàng phù hợp bộ lọc.':'Kho Thiên Đạo đang trống.');
    if(tab==='vault')showVaultJournal(scene,list);
  };
  for (const button of panel.querySelectorAll('[data-heaven-tab]')) button.onclick = () => { tab = button.dataset.heavenTab; render(); };
  opener.onclick = () => {
    if (scene.possessedNpcId) return scene.worldPopulationToast('Rời nhập thân để vào Thương Điếm.');
    if (!panel.hidden) { panel.hidden = true; return; }
    lockedRecipient = false;
    recipientId = scene.selectedNpcId;
    panel.hidden = false;
    render();
  };
  for (const type of ['pointerdown','pointerup','click','wheel','keydown']) panel.addEventListener(type, e => e.stopPropagation());
  panel.querySelector('[data-close-heaven]').onclick = () => { panel.hidden = true;scene.opportunities?.cancelPreview(); };
}

function giftGlow(scene,npc,grade){
  if(npc.underground||!scene.inSceneryView(npc,32))return;
  const color=GRADES[grade].color;
  const graphics=scene.add.graphics().setPosition(npc.x,npc.y).setDepth(npc.y+4);
  graphics.lineStyle(1,color,.8).strokeEllipse(0,-3,44,19);
  for(const [x,y] of [[-15,-12],[-9,-31],[-2,-9],[7,-40],[17,-19],[12,-8]]){
    graphics.fillStyle(color).fillRect(x,y,2,6).fillRect(x-2,y+2,6,2);
  }
  scene.tweens.add({targets:graphics,y:npc.y-16,alpha:0,duration:850,ease:'Sine.easeOut',onComplete:()=>graphics.destroy()});
}

function showVaultJournal(scene,list){
  const rows=shopLedger(scene.populationWorld).slice(-12).reverse();
  if(!rows.length)return;
  const title=document.createElement('h3');title.textContent='Nhật ký mua và bàn giao';list.append(title);
  const world=scene.populationWorld;
  for(const row of rows){
    const info=document.createElement('small');
    const destination=world.npcs.find(npc=>npc.id===row.owner);
    const where=row.owner==='heaven'?'Trong kho':row.owner==='consumed'?'Đã dùng':
      destination?'Đã chuyển cho '+destination.name:'Đã đặt thành cơ duyên';
    const date=row.boughtAt>=1e9?'Bản lưu cũ':'Ngày '+Math.floor(row.boughtAt/1440)+' · '+
      String(Math.floor(row.boughtAt%1440/60)).padStart(2,'0')+':'+String(row.boughtAt%60).padStart(2,'0');
    info.textContent=date+' · '+itemName(row.itemId)+' · '+row.divinePowerPrice+' Thần lực · '+where;
    const opportunity=scene.opportunities?.rows.find(discovery=>discovery.id==='opportunity:'+row.id);
    if(destination?.alive||opportunity){
      const locate=document.createElement('button');locate.type='button';locate.textContent='Định vị';
      locate.onclick=()=>{
        document.getElementById('heaven-shop').hidden=true;
        if(destination?.alive&&destination.underground)scene.underground.view.locate(destination);
        else if(destination?.alive)scene.navigateCameraTo(destination.x,destination.y,'heaven-gift',false,1);
        else scene.opportunities.locate(opportunity);
      };
      info.append(' ',locate);
    }
    list.append(info);
  }
}

function renderOpportunities(scene,panel,list,records,showResult){
  const system=scene.opportunities;
  const entries=system.sites();
  const item=selectOptions('Vật phẩm trong kho',records.map(row=>[row.id,itemName(row.itemId)]));
  const shape=selectOptions('Hình thức',Object.entries(opportunityForms));
  const site=selectOptions('Bản đồ',[['','Mặt đất · chọn trên bản đồ'],...entries.map(entry=>[entry.id,entry.name])]);
  const floor=selectOptions('Tầng',[]);
  const realm=selectOptions('Cảnh giới tối thiểu',REALMS.map((r,i)=>[i,i===0?'Không giới hạn':r.name]));
  const root=selectOptions('Linh căn',[['','Mọi linh căn'],...['metal','wood','water','fire','earth'].map((id,i)=>[id,['Kim','Mộc','Thủy','Hỏa','Thổ'][i]])]);
  const guard=document.createElement('input');guard.type='checkbox';
  const condition=document.createElement('label');condition.append(guard,' Yêu thú canh giữ đã bị hạ');
  const choose=document.createElement('button');choose.textContent='Chọn vị trí';
  const confirm=document.createElement('button');confirm.textContent='Xác nhận chuyển khỏi kho';confirm.disabled=true;
  const preview=document.createElement('small');
  let location=null;
  const refreshFloor=()=>{
    system.cancelPreview();
    const target=scene.underground.sites.get(site.value);
    floor.replaceChildren(...(target?.map.floors??[]).map((_,i)=>new Option('Tầng '+(i+1),i)));
    floor.hidden=!target;condition.hidden=!target;location=null;confirm.disabled=true;preview.textContent='';
  };
  refreshFloor();
  site.onchange=refreshFloor;
  floor.onchange=()=>{system.cancelPreview();location=null;confirm.disabled=true;preview.textContent='Chọn lại vị trí.';};
  choose.disabled=!records.length;
  choose.onclick=()=>{
    const update=point=>{
      location=point;confirm.disabled=!location;
      panel.hidden=false;
      preview.textContent=location?system.locationName(location):'Vị trí không hợp lệ. Chọn lại trên bản đồ.';
    };
    if(site.value){
      update(system.caveLocation(site.value,Number(floor.value)));
      if(location){scene.underground.view.show(location.siteId,location.floor);scene.underground.view.focus(location);}
      update.siteId=site.value;update.floor=Number(floor.value);system.preview=update;
    }else{
      scene.underground.view.hide();panel.hidden=true;
      scene.worldPopulationToast('Nhấp một điểm trên mặt đất để xem trước cơ duyên.');
      system.preview=update;
    }
  };
  confirm.onclick=()=>{
    if(!location)return;
    const result=system.place(item.value,location,shape.value,{realm:Number(realm.value),root:root.value,requireClear:guard.checked});
    system.cancelPreview();showResult(result);
  };
  const controls=document.createElement('div');controls.className='commerce-filters';
  controls.append(item,shape,site,floor,realm,root,condition,choose,confirm,preview);list.append(controls);
  const heading=document.createElement('h3');heading.textContent='Nhật ký cơ duyên';list.append(heading);
  for(const row of system.rows.slice(-30).reverse()){
    const action=document.createElement('button'),finder=scene.populationWorld.npcs.find(n=>n.id===row.owner);
    action.textContent=itemName(row.itemId)+' · '+system.locationName(row)+' · '+(row.owner?'Đã nhận · '+(finder?.name??row.owner):'Chờ người hữu duyên');
    action.onclick=()=>{panel.hidden=true;system.locate(row);};list.append(action);
  }
}

export function mountSkillPanel(scene, panel, npc) {
  const section = document.createElement('section');
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Võ kỹ phím K');
  select.add(new Option('Chọn võ kỹ phím K', ''));
  for (const id of npc.skills ?? []) if (SKILLS[id]) select.add(new Option(SKILLS[id].name, id));
  select.value = npc.activeHeavenSkill ?? '';
  select.onchange = () => { npc.activeHeavenSkill = select.value || null; scene.persistPopulation(); };
  const status = document.createElement('small');
  status.id = 'possession-heaven-status';
  section.append(select, status);
  for (const item of npc.inventory) {
    const skillId = SHOP[item.itemId]?.skill, skill = SKILLS[skillId];
    if (!skill) continue;
    const button = document.createElement('button');
    const known = npc.skills?.includes(skillId);
    button.textContent = known ? 'Đã học ' + skill.name : 'Lĩnh ngộ ' + skill.name + ' · Luyện Khí tầng ' + skill.level;
    button.disabled = Boolean(known);
    button.onclick = () => {
      const result = commitHeavenChange(scene, npc, () => learnHeavenBook(scene.populationWorld, npc, item.itemId));
      if (result.ok) {
        scene.refreshPossessionHud();
      }
      scene.worldPopulationToast(result.message);
    };
    section.append(button);
  }
  panel.querySelector('.hud-controls').before(section);
}

export function updateSkillStatus(scene, npc) {
  const node = document.getElementById('possession-heaven-status');
  if (!node) return;
  const cooldown = Math.max(0, (npc.heavenSkillReadyAt ?? 0) - Date.now());
  const phase = scene.heavenActions.fishing?.phase;
  const value = 'Linh lực ' + Math.floor(npc.mp) + (cooldown ? ' · K hồi ' + (Math.ceil(cooldown / 100) / 10).toFixed(1) + 's' : '') +
    (phase ? ' · ' + ({ cast: 'Thả câu', wait: 'Chờ cá', bite: 'Cá cắn! Nhấn F', reel: 'Kéo cần' }[phase]) : '');
  if (node.textContent !== value) node.textContent = value;
}

const directions = ['down','up','left','right'];
const tips = [[[51,34],[48,58],[46,55],[53,29]],[[44,15],[37,4],[42,13],[52,14]],[[13,19],[4,34],[5,31],[19,12]],[[51,19],[60,34],[59,31],[45,12]]];
function rodPose(scene, npc, direction) {
  const session = scene.heavenActions?.fishing;
  const phase = session?.npc === npc ? {cast:1,wait:2,bite:2,reel:3}[session.phase] : 0;
  return { phase, index: Math.max(0,directions.indexOf(direction)) };
}

export function rodTip(scene, npc, direction) {
  const {phase,index} = rodPose(scene,npc,direction);
  const [x,y] = tips[index][phase];
  return {x:npc.x+x-32,y:npc.y+y-64};
}

export function syncRodVisual(scene,npc,actor,overlay) {
  if (overlay && overlay.getData('weaponId') !== ROD) {
    overlay.destroy();
    overlay = null;
  }
  if (!overlay) {
    overlay = scene.add.sprite(actor.x,actor.y,'heaven-rod-grip').setOrigin(.5,1);
    overlay.setData('weaponId',ROD);
    scene.weaponSprites.set(npc.id,overlay);
  }
  const session = scene.heavenActions?.fishing;
  const direction = (session?.npc === npc ? session.direction : actor.anims.currentAnim?.key?.split('_').at(-1)) ?? 'down';
  const {phase,index} = rodPose(scene,npc,direction);
  overlay.setPosition(actor.x,actor.y).setDepth(actor.depth+.25).setFrame(index*4+phase).setVisible(actor.visible&&npc.alive);
}
