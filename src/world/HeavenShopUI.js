import { ROD, SHOP, SKILLS, buyHeavenItem, buyAndGiftHeavenItem, commitHeavenChange, giftHeavenItem, itemName, learnHeavenBook, shopLedger } from './HeavenShop.js';
import { createWorldUuid } from '../world-rebuild-population.js';

const icon = id => { const img = document.createElement('img'); img.src = '/assets/heaven/' + id + '.png'; img.alt = ''; return img; };

export function mountHeavenShop(scene) {
  const opener = document.getElementById('open-heaven-shop');
  const panel = document.getElementById('heaven-shop');
  let tab = 'goods', recipientId = null;
  const world = scene.populationWorld;
  let lockedRecipient = false, busyUntil = 0;
  scene.openNpcGift = id => { if (scene.possessedNpcId) return; recipientId = id; lockedRecipient = true; tab = 'gift'; panel.hidden = false; panel.querySelector('[role=status]').textContent = ''; render(); };
  scene.closeNpcGift = () => { if (lockedRecipient) panel.hidden = true; };
  scene.refreshHeavenWallet = () => {
    const power = Math.floor(world.heaven.divinePower);
    const hud = document.getElementById('heaven-wallet');
    if (hud && hud.textContent !== power + ' Thần lực') hud.textContent = power + ' Thần lực';
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
      list.append(label);
    }
    const rows = tab === 'goods' || tab === 'skills'
      ? Object.entries(SHOP).filter(([, item]) => Boolean(item.skill) === (tab === 'skills')).map(([itemId]) => ({ itemId }))
      : tab === 'gift' ? [...records, ...Object.keys(SHOP).filter(itemId => !records.some(r => r.itemId === itemId)).map(itemId => ({itemId}))] : records;
    let section = '';
    for (const row of rows) {
      if(row.itemId==='training_crossbow'&&!row.id&&!scene.characterRigPreview)continue;
      const entry = SHOP[row.itemId];
      if (!entry) continue;
      const group = row.id ? 'Kho Thiên Đạo' : 'Mua từ Thương Điếm';
      if (section !== group) {const heading = document.createElement('h3'); heading.textContent = group; list.append(heading); section = group;}
      const card = document.createElement('article');
      const description = document.createElement('span');
      description.textContent = itemName(row.itemId);
      const count = records.filter(r => r.itemId === row.itemId).length;
      const price = document.createElement('small'); price.textContent = 'Trong kho: ' + count + ' · ' + (row.id ? 'Ban 1 món · không thu Thần lực' : entry.price + ' Thần lực' + (world.heaven.divinePower < entry.price ? ' · Thiếu ' + Math.ceil(entry.price-world.heaven.divinePower) : '')); description.append(price);
      if (row.itemId === ROD) {const hint = document.createElement('small'); hint.textContent = 'Trang bị để câu cá tại sông.'; description.append(hint);}
      const skill = SKILLS[entry.skill];
      if (skill) {
        const details = document.createElement('small');
        details.textContent = 'Luyện Khí tầng ' + skill.level + ' · ' + skill.mp + ' linh lực' + (skill.weapon ? ' · Cần ' + (skill.weapon === 'jian' ? 'kiếm' : 'đao') : '');
        description.append(details);
      }
      card.append(icon(row.itemId), description);
      if (tab !== 'vault') {
        const action = document.createElement('button');
        action.textContent = tab === 'gift' ? (row.id ? 'Ban tặng' : 'Mua và ban tặng') : 'Mua · ' + entry.price;
        action.disabled = tab === 'gift' ? !recipient?.alive || recipient.ascended || (!row.id && world.heaven.divinePower < entry.price) : world.heaven.divinePower < entry.price || records.some(r => r.itemId === row.itemId);
        action.onclick = () => {
          if (action.disabled || performance.now() < busyUntil) return;
          busyUntil = performance.now() + 650;
          action.disabled = true;
          const npc = tab === 'gift' ? world.npcs.find(n => n.id === recipientId) : null;
          const result = commitHeavenChange(scene, npc, () => tab === 'gift'
            ? (row.id ? giftHeavenItem(world, row.id, npc) : buyAndGiftHeavenItem(world, row.itemId, npc, createWorldUuid()))
            : buyHeavenItem(world, row.itemId, createWorldUuid()));
          panel.querySelector('[role=status]').textContent = result.message;
          render();
          scene.refreshHeavenWallet();
          scene.refreshPossessionHud();
        };
        card.append(action);
      }
      list.append(card);
    }
    if (!rows.length) list.append('Kho Thiên Đạo đang trống.');
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
  panel.querySelector('[data-close-heaven]').onclick = () => { panel.hidden = true; };
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
