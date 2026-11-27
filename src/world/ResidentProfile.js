import {familyFor,familyOfOrigin,VOCATIONS} from './PopulationLife.js';
import './resident-profile.css';
import { advancesQiMinor, cultivationBreakdown, cultivationStats, cultivationView } from '../systems/CultivationSystem.ts';
import { formatRealm, realmPosition, REALMS } from '../systems/RealmConfig.ts';
import { flightEligibility, meetsFlightRealm, FLIGHT_REASONS } from './FlyingSword.js';
import { ResidentPortraits } from './ResidentPortraits.js';
import { renderResidentInventory } from './ResidentInventory.js';
import { renderMartialProfile } from './MartialProfile.js';
import { meetsSkyStepRealm } from './SkyStep.js';

const combatNumber=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2});
const ACTIONS={
  idle:'Đang sinh hoạt',rest:'Đang nghỉ ngơi',cultivate:'Đang đả tọa tu luyện',
  gather:'Đang thu thập',eat:'Đang dùng bữa',socialize:'Đang trò chuyện',trade:'Đang giao dịch',guard:'Đang canh gác',
  flee:'Đang tránh nguy hiểm',fight:'Đang giao chiến',farm:'Đang canh tác',work:'Đang làm việc',
  patrol:'Đang tuần tra',shop:'Đang mua hàng',recruit:'Đang tuyển đồ đệ',
  mission:'Đang làm nhiệm vụ',teach:'Đang chỉ dạy',commission:'Đang làm ủy thác',
};
const JOURNEYS={
  eat:'Đang đi tìm bữa ăn',rest:'Đang tìm chỗ nghỉ',work:'Đang đến nơi làm việc',
  cultivate:'Đang tìm nơi đả tọa',gather:'Đang tới điểm thu hái',trade:'Đang đi giao dịch',
  shop:'Đang đi mua hàng',farm:'Đang ra ruộng',socialize:'Đang đi gặp người quen',
  commission:'Đang đến nơi làm ủy thác',mission:'Đang đi làm nhiệm vụ',
  patrol:'Đang tuần tra',guard:'Đang đến điểm canh gác',
};
const WORKPLACES={
  'city-hall-entrance':'Phủ Thành Chủ','sect-yard':'Thanh Vân Tông','tavern-entrance':'Tửu Quán',
  'quest-office':'Ủy Thác Các','forest-outer':'Rìa Rừng Yêu Thú','city-center':'Thanh Vân Thành',
  'forge-entrance':'Thiết Mộc Các','apothecary-entrance':'Hiệu thuốc Thanh Vân','east-camp':'Trạm nghỉ Ốc Đảo',
  'sect-veins-approach':'Trạm khai khoáng','old-road-pavilion':'Đình nghỉ Cổ Đạo','old-road-north':'Xóm ven Cổ Đạo',
  'south-outskirts':'Ngoại thành phía Nam','gate-north':'Cổng Bắc','gate-south':'Cổng Nam',
  'gate-east':'Cổng Đông','gate-west':'Cổng Tây',
};
const PROFESSIONS={tu_si:'Tu sĩ',dan_su:'Đan sư',thuong_nhan:'Thương nhân',duoc_su:'Dược sư',
  ho_ve:'Hộ vệ',dan_thuong:'Dân thường',tho_re:'Thợ thủ công',nong_dan:'Nông dân'};
const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
const integer=value=>Number.isFinite(value)?Math.max(0,Math.floor(value)):0;
export const residentName=npc=>npc.name.normalize('NFC').replace(/(\p{Ll})(\p{Lu})/gu,'$1 $2');

export function residentActivity(npc,scene,possessed=false){
  const venue=scene.merchants?.byOwner.get(npc.id),duty=scene.merchants?.dutyFor(npc);
  const workplace=venue?.shop.name??scene.society?.workplace(npc)??(npc.stallId?'Phường Thị Thanh Vân':WORKPLACES[npc.workplaceId])??'';
  const {action,goalAction:goal,actionTarget:target}=npc;
  const confirmedShift=Boolean(duty&&npc.decisionSlot==='shop-shift:'+duty.id);
  const entry=scene.scheduler?.byId.get(npc.id);
  const claim=scene.workstations?.claims.get(npc.id);
  const home=npc.home;
  const restTarget=claim?.action==='rest'&&!claim.refuge?{x:claim.anchorX,y:claim.anchorY}:target;
  const towardHome=home&&restTarget&&Math.hypot(home.x-restTarget.x,home.y-restTarget.y)<=20;
  let activity;
  if(!npc.alive)activity='Đã mất';
  else if(npc.ascended)activity='Đã phi thăng';
  else if(npc.minor)activity='Đang lớn lên cùng gia đình';
  else if(npc.emigration||npc.decisionSlot?.startsWith('livelihood:'))activity=npc.shortGoal;
  else if(npc.tribulation&&npc.tribulation.phase!=='travel')activity=({
    cloud:'Đang tụ khí độ kiếp',warning:'Đang chuẩn bị đón thiên lôi',strike:'Đang chịu thiên lôi',
    success:'Vừa vượt qua thiên kiếp',failure:'Đang hồi sức sau thiên kiếp',
  })[npc.tribulation.phase]??'Đang độ kiếp';
  else if(npc.skyStep)activity=npc.skyStep.phase==='cast'?'Đang tụ gió để lướt mây':
    npc.skyStep.phase==='arrive'||npc.skyStep.phase==='recover'?'Đang hạ xuống từ mây':'Đang Đạp Gió Lướt Mây';
  else if(npc.flight)activity=/^(Landing|DismountSword|DismissSword)$/.test(npc.flight.phase)
    ?'Đang hạ kiếm':/^(SummonSword|MountSword|TakeOff)$/.test(npc.flight.phase)?'Đang cất cánh':'Đang ngự kiếm';
  else if(npc.manualMeditation)activity=ACTIONS.cultivate;
  else if(possessed)activity=scene.heavenActions?.fishing?.npc===npc?'Đang câu cá':'Đang nhập thân';
  else if(goal==='flee')activity=ACTIONS.flee;
  else if(npc.faunaHuntTargetId)activity=npc.action==='fight'?'Đang giao chiến với yêu thú':'Đang săn yêu thú';
  else if(goal==='fight')activity=ACTIONS.fight;
  else if(entry?.waitingForSlot||entry?.passageWait||
    npc.pathBlocked&&scene.scheduler.time-(entry?.blockedSince??entry?.travelWatch?.since??scene.scheduler.time)>2500){
    activity=goal==='cultivate'?'Đang chờ chỗ đả tọa':entry?.passageWait?'Đang chờ qua lối hẹp':'Đang chờ đường thông';
  }else if(npc.tribulation?.phase==='travel')activity='Đang đến nơi độ kiếp';
  else if(npc.marketVisit){
    const slot=scene.merchants?.slots.get(npc.id);
    activity=slot&&!slot.counter&&Math.hypot(npc.x-slot.point.x,npc.y-slot.point.y)<12?'Đang chờ tới lượt':
      goal==='eat'?JOURNEYS.eat:action==='travel'?JOURNEYS[goal]:ACTIONS[goal];
  }else if(confirmedShift){
    activity=action==='travel'?'Đang đến '+workplace:scene.merchants.serving(venue)
      ?goal==='trade'?'Đang bán hàng tại '+workplace:'Đang làm việc tại '+workplace:'Đang chuẩn bị mở quầy';
  }else if(!venue&&npc.stallId&&goal==='trade'){
    activity=action==='travel'?'Đang đến '+workplace:'Đang trông quầy tại '+workplace;
  }else if(action==='travel')activity=goal==='rest'&&towardHome?'Đang trên đường về nhà':JOURNEYS[goal]??'Đang trên đường';
  else if(npc.professionTask?.kind==='repair'&&goal==='commission'&&action==='work')activity='Đang tu sửa công trình';
  else activity=ACTIONS[action]??ACTIONS.idle;
  const awayForMeal=duty?.open&&duty.reachable&&goal==='eat'&&!possessed&&
    npc.alive&&!npc.ascended&&!npc.tribulation&&!npc.flight;
  return {activity:activity??ACTIONS.idle,workplace,note:awayForMeal?'Tạm rời quầy để ăn uống.':''};
}

export function residentCultivation(npc){
  const position=realmPosition(npc);
  if(!position||!Number.isFinite(npc.xp))return null;
  const view=cultivationView(npc);
  const atLimit=position.index===REALMS.length-1&&position.level===position.realm.maxLevel;
  const hasPill=npc.inventory?.some(item=>item.itemId==='qi_pill'&&item.count>0);
  let note='';
  if(atLimit)note='Đã tới giới hạn tầng hiện tại của hệ thống.';
  else if(advancesQiMinor(npc))note='Đủ tu vi sẽ tự thăng tầng.';
  else if(view.xp<view.required)note=position.level===position.realm.maxLevel
    ? 'Tích đủ tu vi và cần Tụ Khí Đan để thử vượt đại cảnh giới.'
    : 'Tích đủ tu vi và cần Tụ Khí Đan để tiến tầng.';
  else if(!view.canBreakthrough)note=position.realm.breakthrough;
  else if(npc.populationRole&&npc.actionCooldown>0)note='Tu vi viên mãn · Chờ hồi đột phá.';
  else note=hasPill?'Tu vi viên mãn · Đã có Tụ Khí Đan.':'Tu vi viên mãn · Cần Tụ Khí Đan.';
  return {view,atLimit,note};
}

import { recoveryFields } from './WorldInspectionData.js';

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
          </div>
        </div>
        <nav class="resident-tabs" aria-label="Thông tin cư dân">
          <button type="button" data-page="overview" aria-pressed="true">Tổng quan</button>
          <button type="button" data-page="cultivation" aria-pressed="false">Tu luyện</button>
          <button type="button" data-page="inventory" aria-pressed="false">Túi đồ</button>
        </nav>
        <div class="resident-overview" data-sheet="overview">
          <p class="resident-workplace" data-profile="workplace"></p>
          <p class="resident-activity" data-profile="activity"></p>
          <p class="resident-note" data-profile="recovery" hidden></p>
          <p class="resident-note" data-profile="note"></p><p class="resident-note" data-profile="sectOrder" hidden></p><p class="resident-note" data-profile="westJourney" hidden></p>
          <p class="resident-note" data-profile="lifeDetails"></p>
          <section class="resident-party" data-profile="party" hidden></section>
          <details data-profile="genealogy"><summary>Gia đình và gia phả</summary><p></p></details>
          <details data-profile="biography"><summary>Lịch sử đời người và di sản</summary><p></p></details>
          <details data-profile="civic"><summary>Thiện ác và pháp lý</summary><p></p></details>
          <details data-profile="social"><summary>Sinh hoạt và bằng hữu</summary><div></div></details>
        </div>
        <div class="resident-stats" data-sheet="cultivation" hidden>
          ${[['hp','Sinh lực'],['mp','Linh lực'],['xp','Tu vi']].map(([id,label])=>`
            <div class="resident-meter ${id}" data-meter="${id}">
              <span>${label}</span><b data-profile="${id}"></b>
              <progress data-progress="${id}" aria-label="${label}" max="1" value="0"></progress>
            </div>`).join('')}
          <p class="resident-cultivation" data-profile="cultivation"></p>
          <details data-profile="combatSources"><summary>Nguồn chỉ số chiến đấu</summary><p></p></details>
          <details data-profile="martial"><summary>Công pháp, võ kỹ và linh bảo</summary><div></div></details>
          <p class="resident-flight" data-profile="flight"></p>
          <p class="resident-flight-detail" data-profile="flightDetail"></p>
        </div>
        <div data-sheet="inventory" hidden><details data-profile="inventory" open><summary></summary><div class="resident-items"></div></details></div>
        ${active?'<button type="button" class="gold-button" data-profile="meditate"></button><button type="button" class="gold-button" data-profile="vein" hidden>Quản lý linh mạch</button><div data-profile="controls"></div>':`<div class="resident-actions">
          <button id="npc-gift" class="gold-button">Ban tặng</button>
          <button id="possess-start" class="gold-button"></button>
          <button id="npc-life">Sinh hoạt</button>
          <a id="npc-look">Ngoại hình cư dân</a>
        </div>`}
      </div>`;
    this.fields=Object.fromEntries([...panel.querySelectorAll('[data-profile]')].map(node=>[node.dataset.profile,node]));
    this.meters=Object.fromEntries([...panel.querySelectorAll('progress')].map(node=>[node.dataset.progress,node]));
    this.image=panel.querySelector('.resident-portrait img');
    for(const button of panel.querySelectorAll('[data-page]'))button.onclick=()=>{
      for(const tab of panel.querySelectorAll('[data-page]'))tab.setAttribute('aria-pressed',String(tab===button));
      for(const page of panel.querySelectorAll('[data-sheet]'))page.hidden=page.dataset.sheet!==button.dataset.page;
    };
    this.look=null;this.portraitInitialized=false;
    if(active){
      panel.querySelector('#possess-end').onclick=()=>scene.endPossession();
      this.fields.meditate.onclick=()=>{
        if(scene.cultivation.toggle(npc)){scene.requestBackgroundSave();this.show(npc,true);}
      };
    }
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
    renderResidentInventory(scene,fields,npc,active);
    if(scene.martialEconomy)renderMartialProfile(scene,fields.martial,npc,active);
    const rig=scene.characterRigPreview?.npc===npc?scene.characterRigPreview:null;
    const look=rig?.character.appearance??npc.modularAppearance?.look;
    if(!this.portraitInitialized||look!==this.look){
      this.portraitInitialized=true;
      this.look=look;
      const url=this.portraits.get(npc,look);
      if(url&&this.image.getAttribute('src')!==url)this.image.src=url;
      else if(!url)this.image.removeAttribute('src');
    }
    const name=residentName(npc),alt='Chân dung '+name;
    if(this.image.alt!==alt)this.image.alt=alt;
    setText(fields.name,name);
    const role=scene.npcRoleTitle(npc),job=PROFESSIONS[npc.profession];
    setText(fields.role,npc.minor?'Trẻ nhỏ':VOCATIONS[npc.vocation]?.[0]??(npc.populationRole==='commoner'?job??role:role??job??'Cư dân'));
    setText(fields.faction,scene.populationWorld.factions?.find(f=>f.id===npc.faction)?.name??(npc.faction||'Tán tu'));
    const label=npc.minor?'Phàm nhân':formatRealm(npc);
    const expedition=npc.westJourney, region=this.scene.westWilds?.regions.find(r=>r.id===expedition?.zone);
    fields.westJourney.hidden=!expedition&&!(npc.westPoison>0);
    if(!fields.westJourney.hidden)setText(fields.westJourney,[region?.name,...(expedition?.log??[]).slice(-3),npc.westPoison>0?`Nhiễm độc ${Math.round(npc.westPoison)}%`:null].filter(Boolean).join(" · "));
    setText(fields.realm,label);fields.realm.title=label;
    const check=flightEligibility(npc,scene.swordFlightOptions(npc,rig)),qualified=meetsFlightRealm(npc);
    setText(fields.flight,meetsSkyStepRealm(npc)?'Đủ cảnh giới Đạp Gió Lướt Mây':qualified?'Đủ cảnh giới ngự kiếm':'Chưa thể ngự kiếm');
    fields.flight.dataset.qualified=String(qualified);
    const phase=npc.flight?.phase;
    const flightText=phase==='Landing'||phase==='DismountSword'||phase==='DismissSword'?'Đang hạ kiếm':
      phase==='SummonSword'||phase==='MountSword'||phase==='TakeOff'?'Đang cất cánh':'Đang ngự kiếm';
    setText(fields.flightDetail,npc.flight?flightText:
      !check.ok?FLIGHT_REASONS[check.reason]:scene.flyingSword?.canLaunch(npc)?'Có thể cất cánh.':FLIGHT_REASONS.pad);
    const {activity,workplace,note}=residentActivity(npc,scene,active);
    setText(fields.activity,activity);
    setText(fields.workplace,workplace?'Nơi làm việc · '+workplace:'');fields.workplace.hidden=!workplace;
    setText(fields.note,note);fields.note.hidden=!note;
    const campus=scene.sectCampus,order=campus?.orderFor(npc),credits=campus?.state?.credits[npc.id]??0;
    const contract=order?order.name+' · '+campus.progress(npc,order)+'/'+order.quantity+' · '+credits+' cống hiến':
      credits?credits+' điểm cống hiến Thanh Vân Tông':'';
    setText(fields.sectOrder,contract);fields.sectOrder.hidden=!contract;
    const target=npc.actionTarget;
    const reason=npc.aiDecision?.action===npc.goalAction&&!npc.decisionSlot?.includes(':')?npc.aiDecision.reason:
      npc.aiDecision?.action===npc.goalAction&&/^\d+:/.test(npc.decisionSlot??'')?npc.aiDecision.reason:'';
    const needs=[['Đói',npc.hunger],['Mệt',npc.fatigue],['Thiếu giao tiếp',npc.socialNeed??0]].sort((a,b)=>b[1]-a[1]);
    const coords=point=>point?`${Math.round(point.x)}, ${Math.round(point.y)}`:'';
    setText(fields.lifeDetails,[npc.shortGoal,target&&'Đích '+coords(target),npc.home&&'Nơi ở '+coords(npc.home),
      needs[0][1]>=45&&needs[0][0]+' '+Math.round(needs[0][1])+'%',reason].filter(Boolean).join(' · '));
    const world=scene.populationWorld, family=familyFor(world,npc.id);
    const nameOf=id=>{
      const member=world.npcs.find(n=>n.id===id)??world.populationLife?.departed[id]?.npc;
      return member?residentName(member):id;
    };
    const joined=(ids,title)=>ids?.length?title+' '+ids.map(nameOf).join(', '):null;
    const childhood=familyOfOrigin(world,npc.id);
    const roots=npc.parents??[];
    const grandparents=roots?.flatMap(id=>world.npcs.find(n=>n.id===id)?.parents??[]);
    const spouse=family?.partners.includes(npc.id)?family.partners.filter(id=>id!==npc.id):[];
    const heirs=spouse.length?family.children:[];
    const siblings=childhood?.children.filter(id=>id!==npc.id)??[];
    const inherited=[...new Set([family,childhood])].flatMap(h=>Object.values(h?.inheritances??{})).filter(row=>row.heirId===npc.id);
    if(fields.genealogy.open||fields.genealogy.dataset.npc!==npc.id){
      fields.genealogy.dataset.npc=npc.id;
      setText(fields.genealogy.querySelector('p'),family?[
        joined(grandparents,'Ông bà'),joined(roots,'Cha mẹ'),joined(siblings,'Anh chị em'),
        joined(spouse,'Bạn đời'),joined(heirs,'Con'), 'Nơi ở chung '+family.homeName,
        'Quỹ nhà '+family.fund+' linh thạch',
      ].filter(Boolean).join(' · '):'Chưa ghi nhận quan hệ gia đình.');
    }
    if(fields.biography.open||fields.biography.dataset.npc!==npc.id){
      fields.biography.dataset.npc=npc.id;
      const milestones=world.events.filter(e=>e.actorId===npc.id&&/breakthrough|birth|immigration|adulthood|household|caravan|production|mission|inheritance/.test(e.type))
        .slice(-4).map(e=>e.description);
      setText(fields.biography.querySelector('p'),[
        'Tuổi '+npc.age+' · Còn '+Math.max(0,npc.lifespan-npc.age)+' năm thọ nguyên',
        npc.aiProfile?.origin&&'Xuất thân '+npc.aiProfile.origin,npc.residenceName&&'Cư trú '+npc.residenceName,
        npc.personalGoal?.label&&'Tham vọng '+npc.personalGoal.label,npc.lifeOrigin?.reason,
        'Tài sản '+Math.floor(npc.spiritStones)+' linh thạch',
        npc.deathCause,
        inherited.length&&'Đã nhận di sản '+inherited.reduce((sum,entry)=>sum+entry.amount,0)+' linh thạch',
        ...milestones,
      ].filter(Boolean).join(' · '));
    }
    this.renderParty(fields.party,npc,coords);
    this.renderSocial(fields.social,npc);
    const civic=scene.civic,r=npc.reputation;
    const cases=civic?.cases.filter(c=>c.actorId===npc.id||c.victimId===npc.id).slice(-4)??[];
    const holdings=civic?.owned(npc).map(site=>site.name).join(', ');
    fields.civic.querySelector('p').textContent='Thiện danh '+(r?.good??0)+' · Ác danh '+(r?.bad??0)+' · Uy tín '+(r?.trade??0)+' · Tín nhiệm '+(r?.trust??0)+' · Tài sản '+npc.spiritStones+' linh thạch. '+
      (holdings?'Sở hữu '+holdings+'. ':'')+
      (r?Object.entries(r.relations).map(([id,value])=>civic.name(id)+' '+value).join(' · '):'')+
      (civic?.wanted(npc).length?' · Đang bị truy nã':'')+(cases.length?' · Nhật ký '+cases.map(c=>c.result??c.id).join(' · '):'');
    if(fields.vein){fields.vein.hidden=!active||!civic?.panel.closest(npc);fields.vein.onclick=()=>civic?.panel.show(npc);}
    const breakdown=realmPosition(npc)&&npc.techniqueMastery?cultivationBreakdown(npc):null;
    const stats=breakdown?.stats;
    fields.combatSources.hidden=!breakdown;
    if(breakdown){
      const {base,talent,afterTalent,afterTechnique,weaponBonusRate,potential}=breakdown;
      setText(fields.combatSources.querySelector('p'),[
        'Cấp '+base.position.total+' / 90 · '+base.position.stage,
        'Thiên phú '+talent.name+' ×'+combatNumber.format(talent.multiplier),
        'Sinh lực '+combatNumber.format(base.hp)+' → '+combatNumber.format(stats.hpMax),
        'Công kích '+[base.attack,afterTalent,afterTechnique,stats.attack].map(value=>combatNumber.format(value)).join(' → '),
        'Giáp '+combatNumber.format(base.defense)+' → '+combatNumber.format(stats.defense),
        'Uy lực pháp bảo '+combatNumber.format(potential*100)+'% · Thưởng vũ khí '+combatNumber.format(weaponBonusRate*100)+'%',
        'Thọ nguyên gốc '+base.position.realm.lifespan+' năm',
      ].join(' · '));
    }
    const health=!active&&stats?[
      `Sinh lực ${Math.round(npc.hp)}/${stats.hpMax}`,
      ...recoveryFields(scene,npc).map(([label,value])=>label+' '+value),
    ].join(' · '):'';
    setText(fields.recovery,health);fields.recovery.hidden=!health;
    this.meter('hp',npc.hp,stats?.hpMax);
    this.meter('mp',npc.mp,stats?.mpMax);
    const cultivation=residentCultivation(npc);
    if(active){
      const available=!npc.tribulation&&!npc.flight&&!npc.skyStep&&!(rig?.mount.attached||rig?.mount.locked);
      fields.meditate.disabled=!available;
      setText(fields.meditate,npc.manualMeditation?'Dừng đả tọa':'Đả tọa');
    }
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
      const available=npc.alive&&!npc.ascended&&!npc.minor,heaven=scene.populationWorld.heaven,cost=scene.possessionCost(npc);
      const button=this.panel.querySelector('#possess-start');
      button.disabled=!available||Boolean(heaven.possession)||heaven.divinePower<cost;
      setText(button,'Nhập thân · '+cost+' Thần Lực');
      this.panel.querySelector('#npc-gift').disabled=!available;
    }
  }
  renderSocial(panel,npc){
    const society=this.scene.society;
    if(!society||!panel)return;
    const draw=()=>{
      if(!panel.open)return;
      const account=society.account(npc), part=panel.querySelector('div');
      const friends=Object.entries(npc.relationships??{}).filter(([,v])=>v!==0).sort((a,b)=>b[1]-a[1]).slice(0,10);
      const view=[Math.round(account.needs.social),friends,account.socialJournal,account.places,account.contacts];
      const signature=JSON.stringify(view);
      if(panel.dataset.signature===signature)return;
      panel.dataset.signature=signature;part.replaceChildren();
      const add=text=>{const p=document.createElement('p');p.textContent=text;part.append(p);};
      add('Nhu cầu giao tiếp '+view[0]+'%');
      for(const [id,value] of friends){
        const n=this.scene.scheduler.byId.get(id)?.npc;
        if(!n)continue;
        const type=value>=55?'Tri kỷ':value>=18?'Bằng hữu':value>=0?'Người quen':value<=-35?'Cừu nhân':'Đối thủ';
        const button=document.createElement('button');button.type='button';button.textContent=n.name+' · '+type;
        button.onclick=()=>this.scene.selectNPC(id);part.append(button);
      }
      for(const [id,visits] of Object.entries(account.places??{}))add((society.places.get(id)?.cfg.name??id)+' · '+visits+' lượt');
      for(const entry of (account.socialJournal??[]).slice(-6).reverse())add(entry.topic+(entry.fee?' · '+entry.fee+' linh thạch':''));
    };
    panel.ontoggle=draw;
    draw();
  }

  renderParty(panel,npc,coords){
    const scene=this.scene,system=scene.expeditions,party=system?.of(npc);
    panel.hidden=!party;
    if(!party){if(panel.childElementCount)panel.replaceChildren();return;}
    const roster=party.members.map(id=>system.npc(id)).filter(Boolean);
    const fingerprint=JSON.stringify([party.id,party.phase,party.hits,party.amount,npc.actionTarget,
      ...roster.map(n=>[n.id,n.hp,n.realmIndex,n.realmLevel])]);
    if(panel.dataset.current===fingerprint&&panel.childElementCount)return;
    panel.dataset.current=fingerprint;
    panel.replaceChildren();
    const detail=document.createElement('p');
    detail.textContent=[party.name,system.role(party,npc),system.status(party),party.job.label,
      'Đích '+coords(npc.actionTarget??party.job.field),'Thưởng cả đội '+party.escrow+' linh thạch',
      party.amount?'Đang giữ '+party.amount+' vật phẩm':party.hits?'Đòn trúng '+party.hits:null].filter(Boolean).join(' · ');
    panel.append(detail);
    for(const n of roster){
      const button=document.createElement('button');
      button.type='button';
      button.textContent=n.name+' · '+system.role(party,n)+' · '+formatRealm(n)+' · '+Math.round(n.hp)+' HP';
      button.onclick=()=>scene.selectNPC(n.id);
      panel.append(button);
    }
    const locate=document.createElement('button');locate.type='button';locate.textContent='Định vị đội trưởng';
    locate.onclick=()=>{const n=system.npc(party.leader);if(n)scene.navigateCameraTo(n.x,n.y,'party',false,.9);};
    panel.append(locate);
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
