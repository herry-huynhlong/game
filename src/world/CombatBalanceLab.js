import {REALMS,realmBase} from '../systems/RealmConfig.ts';
import {attackBudget,gradePotential,resolveDamage,TALENTS} from '../systems/CombatBalance.ts';
import {cultivationBreakdown} from '../systems/CultivationSystem.ts';
import {FAUNA_SPECIES,FAUNA_QUALITIES,faunaStats,faunaResistance} from '../dao/MonsterRegistry.ts';
import {MARTIAL_SKILLS,MARTIAL_TECHNIQUES,MARTIAL_WEAPONS,MASTERY_XP} from '../dao/MartialRegistry.ts';
import {martialCastCheck,martialPower,martialQiCost,martialResonance} from '../dao/MartialProgress.ts';
import {martialTimeline} from './MartialTimeline.js';
import './combat-balance-lab.css';

const root=document.querySelector('#balance');
const form=root.querySelector('form'),out=root.querySelector('output');
const labels=(registry)=>Object.entries(registry).map(([key,value])=>[key,value.name]);
const number=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2});
const fmt=value=>Number.isFinite(value)?number.format(value):'∞';
function select(name,title,options){
  const label=document.createElement('label');
  label.textContent=title;
  const input=document.createElement('select');
  input.name=name;
  for(const [value,text] of options)input.add(new Option(text,value));
  label.append(input);
  return label;
}
function actorForm(name,caption,realm){
  const box=document.createElement('fieldset');
  const legend=document.createElement('legend');
  legend.textContent=caption;
  box.append(legend);
  const add=(key,title,options)=>box.append(select(name+'-'+key,title,options));
  add('kind','Sinh linh',[['npc','NPC'],['beast','Yêu thú']]);
  add('realm','Cảnh giới',[[-1,'Phàm nhân'],...REALMS.map((r,i)=>[i,r.name])]);
  box.querySelector('select[name$="-realm"]').value=String(realm);
  add('layer','Tầng',Array.from({length:10},(_,i)=>[i+1,'Tầng '+(i+1)]));
  add('talent','Thiên phú',TALENTS.map(([title,factor],i)=>[i,title+' ×'+fmt(factor)]));
  box.querySelector('select[name$="-talent"]').value='1';
  add('species','Loài yêu thú',labels(FAUNA_SPECIES));
  add('quality','Phẩm chất',FAUNA_QUALITIES.map(([title,factor],i)=>[i,title+' ×'+fmt(factor)]));
  box.querySelector('select[name$="-quality"]').value='1';
  add('root','Linh căn',[['none','Không chọn'],...['metal','wood','water','fire','earth'].map((key,i)=>[key,['Kim','Mộc','Thủy','Hỏa','Thổ'][i]])]);
  add('course','Công pháp',[['none','Không chọn'],...labels(MARTIAL_TECHNIQUES)]);
  add('weapon','Vũ khí',[['none','Tay không'],...labels(MARTIAL_WEAPONS)]);
  add('mastery','Lĩnh ngộ',MASTERY_XP.map((xp,i)=>[xp,'Bậc '+(i+1)]));
  add('move','Võ kỹ',[['basic','Đòn thường']]);
  add('health','Sinh lực hiện tại',[[1,'100%'],[.75,'75%'],[.5,'50%'],[.25,'25%']]);
  add('mana','Linh lực hiện tại',[[1,'100%'],[.75,'75%'],[.5,'50%'],[.25,'25%'],[0,'0%']]);
  const q=(key)=>box.querySelector(`[name="${name}-${key}"]`);
  q('course').onchange=()=>{
    const course=MARTIAL_TECHNIQUES[q('course').value],move=q('move');
    move.replaceChildren(new Option('Đòn thường','basic'));
    for(const skill of course?.skills??[])move.add(new Option(skill.name,skill.id));
  };
  form.querySelector('.actors').append(box);
  return q;
}
const attacker=actorForm('source','Người ra đòn',0),defender=actorForm('target','Mục tiêu',2);
defender('kind').value='beast';

function profile(p){
  const beast=p('kind').value==='beast';
  for(const key of ['talent','root','course','weapon','mastery','move'])p(key).parentElement.hidden=beast;
  for(const key of ['species','quality'])p(key).parentElement.hidden=!beast;
  p('layer').disabled=p('realm').value==='-1';
  const id=p('weapon').value,course=p('course').value,move=MARTIAL_SKILLS[p('move').value];
  const actor={id:'lab',alive:true,realmIndex:+p('realm').value,realmLevel:+p('layer').value,
    species:p('species').value,rank:'normal',qualityTier:+p('quality').value,combatTalentTier:+p('talent').value,
    spiritualRoot:p('root').value,technique:'qingyun',techniqueMastery:{qingyun:1},martial:{active:course,learned:{[course]:+p('mastery').value},ready:{}},
    equippedWeapon:id==='none'?null:id,inventory:id==='none'?[]:[{itemId:id,count:1,instances:[{id,templateId:id,durability:100,ownerId:'lab'}]}]};
  const result=beast?faunaStats(actor):cultivationBreakdown(actor);
  const stats=result.stats??result,base=realmBase(actor);
  actor.mp=(stats.qiMax??stats.mpMax)*Number(p('mana').value);
  actor.hp=stats.hpMax*Number(p('health').value);
  return {actor,beast,stats,base,move:beast?undefined:move,result};
}
function estimate(){
  const source=profile(attacker),target=profile(defender);
  const {actor,stats,move}=source,team=Math.max(1,Math.min(12,Math.floor(Number(form.elements.team.value)||1)));
  const denied=move&&martialCastCheck(actor,move,0);
  const timeline=move?martialTimeline(move):null;
  const force=move?martialPower(actor,move,stats.attack,martialResonance(actor)):stats.attack;
  const perImpact=attackBudget(force,timeline?.count??1);
  const burning=move?.effect==='burn',support=move&&['guard','heal','dash'].includes(move.effect);
  const resistance=target.beast?faunaResistance(target.actor.species,move?.element):0;
  const trace=resolveDamage(support||denied?0:perImpact*(burning?.84:1),target.stats.defense,actor,target.actor,{resistance});
  const burnDamage=burning&&!denied?resolveDamage(perImpact*.08,target.stats.defense,actor,target.actor,{resistance}).damage*2:0;
  const total=(trace.damage+burnDamage)*(timeline?.count??1);
  const win=total?Math.ceil(target.actor.hp/(total*team)):Infinity;
  const use=move?martialQiCost(actor,move):0;
  const interval=move?Math.max(move.cooldown,(timeline.complete+200))/1000:.42;
  const rows=[
    ['Nguồn · HP / Công / Giáp cơ bản',[source.base.hp,source.base.attack,source.base.defense].map(fmt).join(' / ')],
    ['Nguồn · HP / Công / Giáp thực tế',[stats.hpMax,stats.attack,stats.defense].map(fmt).join(' / ')],
    ['Đích · HP hiện tại / tối đa / giáp',[target.actor.hp,target.stats.hpMax,target.stats.defense].map(fmt).join(' / ')],
    ['Linh lực hiện tại',fmt(actor.mp)],
    ['Phát huy công pháp / pháp bảo',fmt(move?gradePotential(actor.realmIndex,move.grade)*100:0)+'% / '+fmt((source.result.potential??0)*100)+'%'],
    ['Ngân sách công lực mỗi lần',fmt(force)],
    ['Số impact theo timeline',timeline?.count??1],
    ['Một impact · trước giáp → sau giáp',fmt(trace.attackPower)+' → '+fmt(trace.afterArmor)],
    ['Hệ số áp chế',fmt(trace.realmFactor*100)+'%'],
    ['Sát thương một lần thi triển',fmt(total)],
    ['Số vòng cần nếu mỗi người luôn trúng',fmt(win)],
    ['Thời gian ước lượng (giây)',fmt(win*interval)],
    ['Linh lực mỗi lần / tổng mỗi người',fmt(use)+' / '+fmt(use===0?0:win*use)],
  ];
  const table=document.createElement('dl');
  for(const [key,value] of rows){
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=key;dd.textContent=value;table.append(dt,dd);
  }
  const note=document.createElement('p');
  note.textContent=denied||'Ước lượng giả định các đòn đều trúng, mục tiêu giữ nguyên giáp và không hồi sinh lực.';
  out.replaceChildren(note,table);
}
form.addEventListener('input',estimate);
form.addEventListener('change',estimate);
estimate();
