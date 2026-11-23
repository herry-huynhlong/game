import './resident-profile.css';
import { cultivationStats, cultivationView } from '../systems/CultivationSystem.ts';
import { formatRealm, realmPosition, REALMS } from '../systems/RealmConfig.ts';
import { flightEligibility, meetsFlightRealm, FLIGHT_REASONS } from './FlyingSword.js';
import { ResidentPortraits } from './ResidentPortraits.js';

const ACTIONS={
  idle:'Đang sinh hoạt',travel:'Đang di chuyển',rest:'Đang nghỉ ngơi',cultivate:'Đang tu luyện',
  gather:'Đang thu thập',eat:'Đang ăn',socialize:'Đang giao lưu',trade:'Đang giao dịch',guard:'Đang canh gác',
  flee:'Đang tránh nguy hiểm',fight:'Đang giao chiến',farm:'Đang canh tác',work:'Đang làm việc',
  patrol:'Đang tuần tra',shop:'Đang mua hàng',recruit:'Đang tuyển đồ đệ',
  mission:'Đang làm nhiệm vụ',teach:'Đang chỉ dạy',commission:'Đang làm ủy thác',
};
const PROFESSIONS={tu_si:'Tu sĩ',dan_su:'Đan sư',thuong_nhan:'Thương nhân',duoc_su:'Dược sư',
  ho_ve:'Hộ vệ',dan_thuong:'Dân thường',tho_re:'Thợ thủ công',nong_dan:'Nông dân'};
const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
const integer=value=>Number.isFinite(value)?Math.max(0,Math.floor(value)):0;

export function residentCultivation(npc){
  const position=realmPosition(npc);
  if(!position||!Number.isFinite(npc.xp))return null;
  const view=cultivationView(npc);
  const atLimit=position.index===REALMS.length-1&&position.level===position.realm.maxLevel;
  const hasPill=npc.inventory?.some(item=>item.itemId==='qi_pill'&&item.count>0);
  let note='';
  if(atLimit)note='Đã tới giới hạn tầng hiện tại của hệ thống.';
  else if(view.xp<view.required)note=position.level===position.realm.maxLevel
    ? 'Tích đủ tu vi và cần Tụ Khí Đan để thử vượt đại cảnh giới.'
    : 'Tích đủ tu vi và cần Tụ Khí Đan để tiến tầng.';
  else if(!view.canBreakthrough)note=position.realm.breakthrough;
  else if(npc.populationRole&&npc.actionCooldown>0)note='Tu vi viên mãn · Chờ hồi đột phá.';
  else note=hasPill?'Tu vi viên mãn · Đã có Tụ Khí Đan.':'Tu vi viên mãn · Cần Tụ Khí Đan.';
  return {view,atLimit,note};
}

export class ResidentProfile {
  constructor(scene){
    this.scene=scene;
    this.portraits=new ResidentPortraits(scene);
    this.panel=document.createElement('aside');
    this.panel.id='possession-panel';
    this.panel.setAttribute('aria-label','Hồ sơ cư dân');
    this.panel.hidden=true;
    document.body.append(this.panel);
    scene.events.once('shutdown',()=>{this.portraits.destroy();this.panel.remove();});
  }
  mount(npc,active){
    const {scene,panel}=this;
    this.key=npc.id+':'+Boolean(active);
    panel.classList.toggle('is-possessed',Boolean(active));
    panel.innerHTML=`
      <header class="resident-header"><h2>${active?'Nhập thân':'Hồ sơ cư dân'}</h2>
        <button class="resident-close" id="${active?'possess-end':'npc-card-close'}" aria-label="${active?'Rời nhập thân':'Đóng hồ sơ'}">×</button>
      </header>
      <div class="resident-body">
        <div class="resident-identity">
          <div class="resident-portrait"><img width="96" height="120" alt=""></div>
          <div class="resident-nameplate">
            <h3 data-profile="name"></h3>
            <p data-profile="role"></p><p data-profile="faction"></p>
            <p class="resident-realm" data-profile="realm"></p>
            <p class="resident-flight" data-profile="flight"></p>
          </div>
        </div>
        <p class="resident-flight-detail" data-profile="flightDetail"></p>
        <p class="resident-activity" data-profile="activity"></p>
        <div class="resident-stats">
          ${[['hp','Sinh lực'],['mp','Linh lực'],['xp','Tu vi']].map(([id,label])=>`
            <div class="resident-meter ${id}" data-meter="${id}">
              <span>${label}</span><b data-profile="${id}"></b>
              <progress data-progress="${id}" aria-label="${label}" max="1" value="0"></progress>
            </div>`).join('')}
          <p class="resident-cultivation" data-profile="cultivation"></p>
        </div>
        ${active?'<div data-profile="controls"></div>':`<div class="resident-actions">
          <button id="npc-gift" class="gold-button">Ban tặng</button>
          <button id="possess-start" class="gold-button"></button>
          <button id="npc-life">Sinh hoạt</button>
          <a id="npc-look">Ngoại hình cư dân</a>
        </div>`}
      </div>`;
    this.fields=Object.fromEntries([...panel.querySelectorAll('[data-profile]')].map(node=>[node.dataset.profile,node]));
    this.meters=Object.fromEntries([...panel.querySelectorAll('progress')].map(node=>[node.dataset.progress,node]));
    this.image=panel.querySelector('.resident-portrait img');
    this.look=null;this.portraitInitialized=false;
    if(active)panel.querySelector('#possess-end').onclick=()=>scene.endPossession();
    else{
      panel.querySelector('#npc-card-close').onclick=()=>scene.closeNpcCard();
      panel.querySelector('#npc-gift').onclick=()=>scene.openNpcGift(npc.id);
      panel.querySelector('#possess-start').onclick=()=>scene.beginPossession();
      panel.querySelector('#npc-life').onclick=()=>scene.livingWorldPanel.open('inspector',npc.id);
      panel.querySelector('#npc-look').href='/npc-xianxia-editor.html?npc='+encodeURIComponent(npc.id);
    }
  }
  show(npc,active){
    if(!npc){this.panel.hidden=true;return;}
    if(this.key!==npc.id+':'+Boolean(active))this.mount(npc,active);
    this.panel.hidden=false;
    const {scene,fields}=this;
    const rig=scene.characterRigPreview?.npc===npc?scene.characterRigPreview:null;
    const look=rig?.character.appearance??npc.modularAppearance?.look;
    if(!this.portraitInitialized||look!==this.look){
      this.portraitInitialized=true;
      this.look=look;
      const url=this.portraits.get(npc,look);
      if(url&&this.image.getAttribute('src')!==url)this.image.src=url;
      else if(!url)this.image.removeAttribute('src');
    }
    const alt='Chân dung '+npc.name;
    if(this.image.alt!==alt)this.image.alt=alt;
    setText(fields.name,npc.name);
    const role=scene.npcRoleTitle(npc),job=PROFESSIONS[npc.profession];
    setText(fields.role,job&&job!==role?role+' · '+job:role);
    setText(fields.faction,scene.populationWorld.factions?.find(f=>f.id===npc.faction)?.name??(npc.faction||'Tán tu'));
    const label=formatRealm(npc);
    setText(fields.realm,label);fields.realm.title=label;
    const check=flightEligibility(npc,scene.swordFlightOptions(npc,rig)),qualified=meetsFlightRealm(npc);
    setText(fields.flight,qualified?'Đủ cảnh giới ngự kiếm':'Chưa thể ngự kiếm');
    fields.flight.dataset.qualified=String(qualified);
    const phase=npc.flight?.phase;
    const flightText=phase==='Landing'||phase==='DismountSword'||phase==='DismissSword'?'Đang hạ kiếm':
      phase==='SummonSword'||phase==='MountSword'||phase==='TakeOff'?'Đang cất cánh':'Đang ngự kiếm';
    setText(fields.flightDetail,npc.flight?flightText:
      !check.ok?FLIGHT_REASONS[check.reason]:scene.flyingSword?.canLaunch(npc)?'Có thể cất cánh.':FLIGHT_REASONS.pad);
    const action=!npc.alive?'Đã mất':npc.ascended?'Đã phi thăng':ACTIONS[npc.action]??ACTIONS.idle;
    setText(fields.activity,npc.shortGoal&&npc.shortGoal!==action?action+' · '+npc.shortGoal:action);
    const stats=realmPosition(npc)&&npc.techniqueMastery?cultivationStats(npc):null;
    this.meter('hp',npc.hp,stats?.hpMax);
    this.meter('mp',npc.mp,stats?.mpMax);
    const cultivation=residentCultivation(npc);
    if(cultivation){
      const {view,note,atLimit}=cultivation;
      const ratio=Math.min(100,Math.max(0,Math.floor(view.xp/view.required*100)));
      this.meter('xp',npc.xp,view.required,atLimit?`${integer(npc.xp)} · Tối đa`:`${integer(npc.xp)} / ${view.required} · ${ratio}%`);
      if(atLimit)this.meters.xp.hidden=true;
      setText(fields.cultivation,note);
    }else{
      this.meter('xp',undefined,undefined);
      setText(fields.cultivation,'Chưa có tiến độ tu luyện.');
    }
    if(!active){
      const available=npc.alive&&!npc.ascended,heaven=scene.populationWorld.heaven,cost=scene.possessionCost(npc);
      const button=this.panel.querySelector('#possess-start');
      button.disabled=!available||Boolean(heaven.possession)||heaven.divinePower<cost;
      setText(button,'Nhập thân · '+cost+' Thần Lực');
      this.panel.querySelector('#npc-gift').disabled=!available;
    }
  }
  meter(id,value,max,status){
    const input=Number.isFinite(value)&&Number.isFinite(max)&&max>0;
    setText(this.fields[id],status??(input?`${integer(value)} / ${integer(max)}`:Number.isFinite(value)?String(integer(value)):'—'));
    const meter=this.meters[id];
    meter.hidden=!input;
    if(input){
      const current=Math.max(0,Math.min(max,value));
      if(meter.max!==max)meter.max=max;
      if(meter.value!==current)meter.value=current;
    }
  }
}
