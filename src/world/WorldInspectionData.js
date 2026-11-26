import {CRIME_NAMES} from './CivicSystem.js';
import { ITEM_CATALOG } from '../dao/ItemCatalog.ts';
import { FAUNA_QI_MAX, FAUNA_SPECIES, faunaName, MONSTER_SKILL_IDS, faunaBehavior, faunaCoreLoot, faunaRealm, monsterSkill } from '../dao/MonsterRegistry.ts';
import { skillPhase } from '../dao/MonsterCombat.ts';
import { formatRealm, REALMS } from '../systems/RealmConfig.ts';
import { treasureDefinition, WEST_TREASURE_RARITY, WEST_TREASURE_MEDICINE } from '../dao/WestTreasureCatalog.ts';
import { treasureBloomOpen, treasureStage } from '../dao/WestTreasureSystem.ts';
import { faunaHabitat } from './FaunaHabitat.js';
import { faunaStationaryForm } from '../dao/FaunaRecovery.ts';

const quality={low:'Hạ phẩm',middle:'Trung phẩm',high:'Thượng phẩm'};
const tier={mortal:'Phàm phẩm',artifact:'Pháp phẩm',spirit:'Linh phẩm',treasure:'Bảo phẩm','spiritual-treasure':'Linh bảo',immortal:'Tiên phẩm',divine:'Thần phẩm'};
const element={wood:'Mộc',poison:'Độc',blood:'Huyết',earth:'Thổ',wind:'Phong',fire:'Hỏa'};
const behavior={neutral:'Trung lập',timid:'Cảnh giác, ưu tiên chạy trốn',aggressive:'Chủ động tấn công',ambush:'Phục kích',territorial:'Bảo vệ lãnh địa',dormant:'Ẩn mình hoặc ngủ đông'};
const states={idle:'Đang nghỉ ngơi',patrol:'Đang tuần tra',detect:'Phát hiện mục tiêu',alert:'Đang cảnh giới',chase:'Đang truy đuổi',
  attack:'Đang chiến đấu',recover:'Đang hồi sức',retreat:'Đang bỏ chạy',return:'Đang quay về lãnh địa',hit:'Vừa trúng đòn',dead:'Đã tử vong',sleep:'Đang ngủ',awakening:'Đang thức tỉnh'};
const flowerStates={rooted:'Đang cắm rễ',alert:'Cánh hoa rung lên',waking:'Đang thức tỉnh, mọc chân rễ căn',returning:'Đang quay về cắm rễ',rooting:'Đang thu chân và cắm rễ'};
const growthStates={normal:'Đang sinh trưởng',spirit:'Đang hấp thụ linh khí',dormant:'Đang ngủ đông',waking:'Đang thức tỉnh',active:'Đã thức tỉnh'};
const plantStates={sprout:'Mới mọc',growing:'Đang sinh trưởng',mature:'Sắp đủ tuổi thu hái',ready:'Đã trưởng thành',harvested:'Đã thu hoạch'};
const conditionNames={poison:'Gây trúng độc',root:'Giữ chân mục tiêu',drain:'Hút linh lực',lifesteal:'Hồi sinh lực theo sát thương thực tế'};
const skillModes={contact:'Đòn cận chiến',dash:'Lao tới theo hướng đã nhắm',tongue:'Đánh dọc theo hướng đã nhắm',
  projectile:'Phóng đạn linh lực',mist:'Tạo vùng ảnh hưởng',leap:'Nhảy tới và đánh khi đáp xuống',area:'Tác động diện rộng',
  armor:'Tăng phòng ngự tạm thời',rage:'Tăng sức mạnh tạm thời',haste:'Tăng tốc tạm thời',heal:'Hồi phục sinh lực',
  summon:'Gọi yêu thú khi còn chỗ trong lãnh địa',cleanse:'Giải trạng thái bất lợi',burrow:'Độn thổ rồi tấn công khi trồi lên',
  roar:'Gầm gọi và cường hóa sói trong phạm vi',breath:'Phun lửa theo hướng đã nhắm',
  gust:'Đẩy lùi quanh vị trí vỗ cánh',rain:'Mưa lửa tại ba điểm'};
const objectStates={intact:'Nguyên vẹn',damaged:'Hư hỏng',repairing:'Đang sửa chữa',destroyed:'Đã phá hủy'};
const groveTypes=['Cổ mộc','Cổ thụ','Thần mộc','Ma mộc','Khô mộc','Thần thụ'];
const number=new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1});
const n=value=>number.format(value);
const seconds=ms=>n(Math.max(0,Math.ceil(ms/100)/10))+' giây';
const minutes=value=>n(Math.max(0,value))+' phút trong game';
const itemName=id=>ITEM_CATALOG[id]?.name??id;
const gradeOf=id=>{const item=ITEM_CATALOG[id];return item?`${tier[item.tier]} · ${quality[item.quality]}`:undefined;};
const realmName=f=>REALMS[faunaRealm(f).realmIndex]?.name;
const beastRealm=f=>[realmName(f),`tầng ${faunaRealm(f).realmLevel}`].filter(Boolean).join(' ');
const rankName=f=>f.species==='wood-king'?'Yêu vương':f.rank==='elite'?'Tinh Anh':'Thường';
const npcName=(scene,id)=>id?scene.scheduler.byId.get(id)?.npc.name:undefined;
const worldMinutes=world=>world.clock.day*1440+world.clock.minute;
const userText=value=>typeof value==='number'?n(value):value;
const bar=(label,value,max,tone)=>({label,value,max,tone});
const fields=rows=>rows.filter(([,value])=>value!==undefined&&value!==null&&value!=='').map(([label,value])=>[label,userText(value)]);
const link=(kind,id,label)=>({kind,id,label});
const nowOf=scene=>scene.populationWorld.environment.faunaClockMs??0;
const titleCase=s=>s&&s[0].toLocaleUpperCase('vi')+s.slice(1);

export function recoveryFields(scene,actor){
  const status=scene.recovery?.status(actor);
  if(!status)return [];
  const treating=actor.hp<status.maximum&&(actor.convalescence?.phase==='resting'||actor.recovery?.phase==='resting');
  const tending=actor.convalescence?.phase==='escaping'?'Đang tìm nơi an toàn':treating?'Đang nghỉ chữa thương':
    status.rate>0?'Đang hồi phục tự nhiên':actor.hp<status.maximum&&actor.alive?'Đang bị thương':undefined;
  return [['Sinh lực còn',n(status.ratio*100)+'%'],['Giao tranh',status.engaged?status.activity||'Đang nguy hiểm':'Ngoài giao tranh'],
    ['Chữa thương',tending],['Hồi phục tự nhiên',status.rate>0?n(status.rate*100)+'% sinh lực tối đa/giây':
      actor.alive&&actor.hp<status.maximum?'Tạm ngừng':undefined],
    ['Chờ hồi phục',!status.engaged&&status.waitMs>0?seconds(status.waitMs):undefined]].filter(([,value])=>value!==undefined);
}

export function faunaActivity(f,now){
  if(!f.alive)return states.dead;
  if(f.cast){const skill=monsterSkill(f.cast.skillId);if(skill){
    const phase=skillPhase(f.cast.started,now,skill);
    return (phase==='windup'?'Đang chuẩn bị':phase==='recover'||phase==='done'?'Đang hồi chiêu sau':'Đang thi triển')+' '+skill.name;
  }}
  if(f.recovery?.phase==='restoring'&&f.species!=='flower')return 'Đang khôi phục hình thái ngụy trang';
  if(f.recovery?.phase==='waiting')return 'Chờ lối quay về lãnh địa';
  return flowerStates[f.flower?.phase]??(f.species==='flower'&&!f.flower?flowerStates.rooted:
    f.growth&&['dormant','waking','spirit'].includes(f.growth.phase)?growthStates[f.growth.phase]:states[f.state])??'Chưa xác định';
}

export function inspectionRegion(scene,point){
  return scene.minimap?.regionAt(point.x,point.y)?.name??scene.westWilds?.regionAt(point.x)?.name;
}

export function inspectionBrief(scene,entry){
  const {kind,id,data,sprite}=entry, now=nowOf(scene);
  if(kind==='fauna')return {title:faunaName(data),meta:`${beastRealm(data)} · ${rankName(data)}`,state:faunaActivity(data,now)};
  if(kind==='treasure')return {title:itemName(data.itemId),meta:WEST_TREASURE_RARITY[treasureDefinition(data.itemId).grade],state:plantStates[treasureStage(data,now)]};
  if(kind==='npc')return {title:data.name,meta:formatRealm(data)};
  if(kind==='east-site'){
    const frame=data.gid-1920;
    const meta=scene.prop(data,'shanhe')?'Di tích Vạn Lý':frame<=12?'Thực vật Đông Hoang':frame<=14?'Đá phong hóa':frame===15?'Xương cốt':'Di tích Đông Hoang';
    return {title:sprite.name,meta};
  }
  if(kind==='tree')return {title:sprite.name,meta:treeKind(data)};
  if(kind==='ore')return {title:sprite.name,meta:'Khoáng sản',state:data.amount?'Có thể khai thác':'Đã cạn'};
  if(kind==='spiritVein')return {title:data.name,meta:'Mạch linh thạch · '+data.quality,state:data.state.amount?'Có thể khai thác':'Đã cạn'};
  if(kind==='shop')return {title:data.shop.name,meta:'Cửa hàng',state:scene.merchants.serving(data)?'Đang phục vụ':'Chưa phục vụ'};
  if(kind==='venue')return {title:data.cfg.name,meta:'Công trình dịch vụ',state:scene.society.onDuty(data)?'Đang phục vụ':'Chưa phục vụ'};
  if(kind==='palace')return {title:'Phủ Thành Chủ',meta:'Chấp pháp và truy nã'};
  if(kind==='building')return {title:sprite.name,meta:'Công trình',state:objectStates[data.status]};
  return {title:itemName(data.itemId??id),meta:gradeOf(data.itemId),state:kind==='drop'?(data.status==='ground'?'Nằm trên mặt đất':'Đã nhặt'):undefined};
}

function treeKind(obj){
  if(obj.gid>=1795&&obj.gid<1804)return obj.name;
  if(obj.gid>=1770&&obj.gid<1776)return groveTypes[obj.gid-1770];
  if(obj.gid>=312&&obj.gid<320)return 'Trúc';
  if(obj.gid>=297&&obj.gid<312||/^Cổ mộc/.test(obj.name))return 'Cổ thụ';
  return 'Cây rừng';
}

export function inspectionSnapshot(scene,entry){
  const {kind,data,sprite}=entry,{populationWorld:world}=scene, now=nowOf(scene);
  const brief=inspectionBrief(scene,entry),region=inspectionRegion(scene,data.x!==undefined?data:sprite);
  const shape={...brief,fields:[],bars:[],links:[],skills:[],description:'',tone:''};
  let rows=[];
  if(kind==='east-site'){
    const namSa=data.name==='Rương Nam Sa',chest=namSa||scene.prop(data,'eastChest');
    const opened=world.environment.processedEventIds.includes(namSa?'shanhe:nam-sa-chest':'east-ruins-chest');
    rows=[['Sinh cảnh',region],['Phân loại',brief.meta],['Trạng thái',chest?(opened?'Đã mở':'Còn niêm phong'):undefined]];
    if(namSa)shape.description='Tiến sát và nhấn E khi nhập thân. Yêu thú ở di tích có thể canh giữ rương.';
    else if(chest)shape.description='Tiến sát và nhấn E khi nhập thân. Rương nằm sau khu vực Vạn Cốt Quỷ Vương trấn giữ.';
  }else if(kind==='fauna'){
    const f=data,cfg=FAUNA_SPECIES[f.species],zone=scene.faunaZones.find(z=>z.zoneId===f.zoneId),habitat=faunaHabitat(zone,f.species);
    const effects=[['armorUntil','Tăng phòng ngự'],['buffUntil','Được cường hóa'],['hasteUntil','Tăng tốc'],['rageUntil','Kích động'],['injuredUntil','Bị thương']]
      .filter(([key])=>(f[key]??0)>now).map(([key,name])=>name+' · '+seconds(f[key]-now));
    const skills=MONSTER_SKILL_IDS.map(id=>[id,monsterSkill(id)]).filter(([,skill])=>skill.species===f.species&&(!skill.elite||f.rank==='elite'));
    const elements=[...new Set(skills.map(([,s])=>element[s.element]).filter(Boolean))];
    const loot=cfg.loot.map(itemName);
    loot.push(itemName(faunaCoreLoot(f)));
    rows=[['Chủng loài',cfg.name],['Sinh cảnh',zone?.name??region],['Lãnh địa',habitat!==zone?habitat?.name:undefined],
      ['Tuổi đời',f.growth?.age===undefined?undefined:n(f.growth.age)+' năm'],['Cảnh giới',beastRealm(f)],['Phẩm chất',rankName(f)],
      ['Tập tính',behavior[faunaBehavior(f.species)]],['Thuộc tính kỹ năng',elements.join(', ')],
      ['Độ cao',f.species==='eagle'?`${Math.round(f.altitude??0)} px`:undefined],
      ['Phòng ngự cơ bản',cfg.defense+(f.rank==='elite'?3:0)],['Tốc độ cơ bản',n(cfg.speed)+' px/giây'],
      ['Linh khí tích lũy',f.growth?.qi],['Mục tiêu',npcName(scene,f.targetNpcId)],['Hiệu ứng',effects.join(' · ')],
      ['Hình thái',f.species==='sand-golem'?(Number(sprite?.frame.name)>=128&&Number(sprite?.frame.name)<144?'Ngụy trang thành cụm đá':'Thạch yêu đã hiện hình'):f.species==='flower'?faunaStationaryForm(f)?'Bông hoa ngụy trang':f.flower?.phase==='rooting'?'Đang thu chân rễ':'Yêu hoa chân rễ':
        ['bone-skeleton','bone-general','sand-worm'].includes(f.species)?faunaStationaryForm(f)?(f.species==='sand-worm'?'Ẩn dưới cát':'Hài cốt bất động'):'Đã hiện hình':
        f.growth||f.species==='vine'?faunaStationaryForm(f)?f.species==='vine'?'Dây leo ngụy trang':'Hình cây ngụy trang':'Hình thái yêu thú':undefined],
      ...recoveryFields(scene,f),
      ['Có thể rơi',loot.join(', ')]];
    shape.bars=[bar('Sinh lực',f.hp,f.maxHp,'health'),bar('Linh lực',f.qi??FAUNA_QI_MAX,FAUNA_QI_MAX,'qi')];
    shape.skills=skills.map(([id,s])=>({name:s.name,description:[s.effect&&conditionNames[s.effect],skillModes[s.mode],s.damage>0?`Sát thương cơ bản ${s.damage}`:null].filter(Boolean).join(' · '),
      timing:(f.cooldowns?.[id]??0)>now?`Hồi sau ${seconds(f.cooldowns[id]-now)}`:'Sẵn sàng'}));
    shape.links=(scene.westTreasures?.system.nodes??[]).filter(node=>node.harvestedAt===undefined&&node.guardSpecies===f.species&&node.zoneId===f.zoneId&&
      scene.westTreasures.system.guardian(node)?.id===f.id).map(node=>link('treasure',node.id,itemName(node.itemId)));
    shape.tone=f.species==='wood-king'?5:f.rank==='elite'?4:0;
  }else if(kind==='treasure'){
    const d=treasureDefinition(data.itemId),stage=treasureStage(data,now),guard=scene.westTreasures.system.guardian(data);
    rows=[['Phân loại','Thiên tài địa bảo'],['Phẩm cấp',gradeOf(data.itemId)],['Độ hiếm',WEST_TREASURE_RARITY[d.grade]],
      ['Thuộc tính',titleCase(d.element)],['Tuổi dược tính',d.age!==undefined?n(d.age)+' năm':undefined],['Sinh cảnh',region],
      ['Có thể thu hái',treasureBloomOpen(data,world.clock.minute)?(stage==='ready'?1:0):'Chờ nở ban đêm'],['Công dụng',d.material?'Nguyên liệu luyện khí hoặc giao thương':'Dược liệu luyện '+WEST_TREASURE_MEDICINE[d.medicine]],
      ['Bảo hộ',guard?beastRealm(guard)+' · '+rankName(guard):data.guardSpecies?
        `${FAUNA_SPECIES[data.guardSpecies].name} · hiện vắng mặt`:'Mọc tự nhiên – Không có yêu thú bảo hộ'],
      ['Trạng thái bảo hộ',guard?faunaActivity(guard,now):undefined],
      ['Người đã hái',stage==='harvested'?npcName(scene,data.claimedBy):undefined],
      ['Mọc lại sau',stage==='harvested'?seconds(data.harvestedAt+d.renewMs-now):undefined],
      ['Thu hái sau',stage!=='ready'&&stage!=='harvested'?seconds(data.plantedAt+d.growMs-now):undefined]];
    if(stage!=='harvested')shape.bars=[bar('Sinh trưởng',Math.max(0,Math.min(100,Math.floor((now-data.plantedAt)/d.growMs*100))),100,'growth')];
    if(guard)shape.links=[link('fauna',guard.id,FAUNA_SPECIES[guard.species].name)];
    shape.tone=d.grade;
  }else if(kind==='westHerb'){
    const west=scene.westWilds,due=west.state.harvest[data.id]??0,ready=west.ready(data);
    const biome=west.regions.find(r=>r.id===data.zone);
    shape.state=due>west.now?'Đã thu hoạch':ready?'Đã trưởng thành':'Chờ nở ban đêm';
    rows=[['Phân loại','Linh dược'],['Phẩm cấp',gradeOf(data.itemId)],['Sinh cảnh',biome?.name??region],
      ['Có thể thu hái',ready?(data.grade>2?1:2):0],['Mọc lại sau',due>west.now?minutes(due-west.now):undefined],
      ['Điều kiện thu hái',biome?.realm],['Giờ nở',data.nightOnly?'Ban đêm':undefined]];
    shape.description=ITEM_CATALOG[data.itemId]?.description;
  }else if(kind==='herb'){
    shape.state=data.amount>0?'Có thể thu hái':'Đã thu hoạch';
    rows=[['Phân loại','Linh thảo'],['Phẩm cấp',gradeOf(data.itemId)],['Sinh cảnh',region],['Trữ lượng',`${data.amount}/${data.maxAmount}`],
      ['Lượt đã hái',data.harvestCount],['Lượt mọc tiếp',data.nextGrowthAt!==undefined?minutes(data.nextGrowthAt-worldMinutes(world)):undefined]];
    shape.description=ITEM_CATALOG[data.itemId]?.description;
  }else if(kind==='drop'){
    rows=[['Phẩm cấp',gradeOf(data.itemId)],['Số lượng',data.count],['Sinh cảnh',region],['Ngày xuất hiện',data.createdDay],['Người đã nhặt',npcName(scene,data.claimedBy)]];
    shape.description=ITEM_CATALOG[data.itemId]?.description;
  }else if(kind==='ore'){
    const mine=scene.underground?.describe(id);
    rows=[['Phân loại','Mỏ quặng kim loại'],['Tài nguyên',itemName('iron_ore')],['Cấp quặng',data.grade],['Trữ lượng',`${data.amount}/${data.max}`],
      ['Tái sinh sau',data.amount===0?minutes(data.renewAt-worldMinutes(world)):undefined],['Sinh cảnh',region],
      ['Số tầng',mine?.floors],['Điểm khai thác',mine?.nodes],['Điểm đã cạn',mine?.empty],['Tổ đội dưới mỏ',mine?.parties],['An toàn dưới mỏ',mine?.danger?'Có yêu thú':'Chưa ghi nhận yêu thú'],['Cư dân dưới mỏ',mine?.active.map(n=>n.name).join(', ')||'Chưa có']];
  }else if(kind==='spiritVein'){
    const veins=scene.sectCampus.spiritVeins,guardian=veins.guard(data);
    const mine=scene.underground?.describe(data.id);
    const civic=scene.civic,contract=civic?.activeSite(data.id),title=data.state;
    const workers=mine?.active.filter(n=>n.action==='work'&&n.underground.nodeId).map(n=>n.name)??[];
    const mission=scene.sectCampus.state.orders.find(q=>q.veinId===data.id&&['open','active'].includes(q.status));
    const party=scene.expeditions?.state.parties.find(p=>p.job.siteId===data.id&&p.escrow>0);
    rows=[['Tài nguyên',itemName(data.item)],['Phẩm cấp',data.quality],['Sinh cảnh',region],
      ['Chủ sở hữu hợp pháp',civic?.name(title.owner)??'Vô chủ'],['Kiểm soát thực tế',civic?.name(title.controller)??'Vô chủ'],
      ['Người quản lý',title.manager&&civic?.name(title.manager)],
      ['Tranh chấp',title.dispute&&!title.dispute.resolvedAt?title.dispute.claimants.map(id=>civic.name(id)).join(' ↔ '):'Không'],
      ['Hình thức lao động',contract?{wage:'Tiền công mỗi chuyến',share:'Chia sản lượng',lease:'Thuê quyền khai thác'}[contract.mode]:undefined],
      ['Điều khoản',contract&&(contract.mode==='share'?contract.price+'% cho thợ':contract.price+' linh thạch')],
      ['Hợp đồng',contract?.id],['Khoáng công',contract?.workerId&&civic.name(contract.workerId)],
      ['Độ nguy hiểm',['Thấp','Cao','Rất cao','Cực hiểm'][data.grade-1]],
      ['Trữ lượng ban đầu',data.state.initial],['Trữ lượng tối đa',data.max],['Tổng đã khai thác theo sổ',data.state.mined],
      ['Tỷ lệ còn lại',Math.round(data.state.amount/data.max*100)+'%'],
      ['Khám phá của cư dân',data.state.discovered?'Đã biết':'Chưa phát hiện'],
      ['Nhịp khai thác mỗi lượt',minutes(data.minutes)],['Nhịp phục hồi mỗi đơn vị',minutes(data.recovery)],
      ['Số tầng',mine?.floors],['Điểm khai thác',mine?.nodes],['Điểm đã cạn',mine?.empty],['Tổ đội dưới mỏ',mine?.parties],['An toàn dưới mỏ',mine?.danger?'Có yêu thú':'Chưa ghi nhận yêu thú'],['Cư dân dưới mỏ',mine?.active.length],
      ['Số NPC đang khai thác',workers.length],['NPC đang khai thác',workers.join(', ')||'Chưa có'],
      ['Tổ đội',party?.name],['Nhiệm vụ',party?.job.label??mission?.name],
      ['Yêu thú bảo hộ',guardian?FAUNA_SPECIES[guardian.species].name:'Chưa ghi nhận']];
    shape.bars=[bar('Trữ lượng',data.state.amount,data.max,'health')];
    if(guardian)shape.links=[link('fauna',guardian.id,faunaName(guardian))];
  }else if(kind==='venue'){
    const society=scene.society,guests=Object.entries(society.visits).filter(([,visit])=>visit.venue===data.id);
    const seated=guests.filter(([id])=>{const n=scene.scheduler.byId.get(id)?.npc;return n&&society.isSeated(n);});
    const groups=[...new Set(data.seats.map(s=>s.table))];
    const services={'east-rest':'Nghỉ chân, uống trà và hồi sức',tea:'Trà, nghỉ chân, trò chuyện',music:'Thưởng nhạc và giao lưu',clinic:'Khám và dùng thuốc chữa thương',tavern:'Rượu và bữa nhẹ',inn:'Thuê chỗ nghỉ'};
    const hour=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
    rows=[['Đơn vị quản lý',society.city?.name],['Nhân viên',data.staff.name],
      ['Giờ hoạt động',hour(data.cfg.start)+'–'+hour(data.cfg.end)],['Dịch vụ',services[data.id]],['Giá',data.cfg.fee+' linh thạch'],
      ['Khách tại chỗ',seated.length],['Khách đã giữ chỗ',guests.length],['Sức chứa',data.seats.length],
      [data.id==='inn'?'Chỗ nghỉ':data.id==='clinic'?'Nhóm ghế':'Bàn',groups.length],['Ghế trống',data.seats.length-guests.length],
      ['Doanh thu',data.ledger.revenue+' linh thạch'],['Hội thoại đang diễn ra',society.social.current(data.id).length]];
    shape.tables=groups.map(table=>{
      const active=society.social.current(data.id).find(c=>String(c.table)===String(table));
      const recent=society.social.state.history.findLast(c=>c.venue===data.id&&String(c.table)===String(table));
      const members=seated.filter(([,v])=>v.table===table);
      return {id:table,name:(data.id==='clinic'?'Nhóm ghế ':data.id==='inn'?'Chỗ nghỉ ':'Bàn ')+(Number(table)+1)+' · '+members.length+' khách',
        guests:members.map(([id])=>link('npc',id,npcName(scene,id))),
        lines:(active??recent)?.lines.map(l=>npcName(scene,l.speaker)+' · '+l.text)??[]};
    });
    shape.description=society.state.journal.filter(e=>e.data?.place===data.id).slice(-3).map(e=>e.description).join(' · ');
  }else if(kind==='shop'){
    const {shop,owner}=data,items=new Set([...Object.keys(shop.buyPrices),...shop.stock.map(row=>row.itemId)]);
    rows=[['Chủ cửa hàng',owner.name],['Vốn',shop.cash+' linh thạch'],['Sinh cảnh',region],
      ...[...items].map(id=>{const amount=shop.stock.find(row=>row.itemId===id)?.count??0;
        return [itemName(id),[`Tồn ${amount}`,shop.sellPrices[id]&&`bán ${shop.sellPrices[id]}`,
          shop.buyPrices[id]&&`thu mua ${shop.buyPrices[id]}`,amount<2&&shop.buyPrices[id]&&shop.cash>=shop.buyPrices[id]&&'đang thiếu hàng'].filter(Boolean).join(' · ')];})];
  }else if(kind==='palace'){
    const active=data.cases.filter(c=>!['undetected','resolved','unresolved'].includes(c.state));
    const warrants=active.filter(c=>['open','assigned'].includes(c.warrant?.status));
    const guards=world.npcs.filter(n=>n.alive&&n.populationRole==='city_guard');
    rows=[['Thành chủ',data.master?.name],['Đội trưởng vệ binh',data.officers[0]?.name],['Quan chấp pháp',data.officers[1]?.name],
      ['Vệ binh',guards.length],['Ngân khố',data.city?.wealth],['Vụ đang xử lý',active.length],
      ['Lệnh đang hiệu lực',warrants.length],['Tiền thưởng cam kết',warrants.reduce((total,c)=>total+c.warrant.reward,0)]];
    for(const c of warrants){const n=data.npc(c.actorId);rows.push([n?.name??c.actorId,CRIME_NAMES[c.kind]+' · '+(n?formatRealm(n):'Không rõ')+' · nguy hiểm '+c.severity+' · thưởng '+c.warrant.reward+' · đề nghị '+c.warrant.headcount+' người, '+(REALMS[c.warrant.realm]?.name??'cảnh giới tương ứng')]);}
  }else if(kind==='building'){
    rows=[['Phân loại','Công trình'],['Sinh cảnh',region],['Phòng ngự',data.defense],['Tiến độ tu sửa',data.status==='repairing'?minutes(data.repairProgress):undefined]];
    shape.bars=[bar('Độ bền',data.hp,data.maxHp,'health')];
  }else if(kind==='tree'){
    const timber=world.environment.timberSources?.find(t=>t.id==='timber:'+data.id);
    shape.state=timber?(timber.renewAt!==undefined?'Đã đốn · đang mọc lại':'Có thể đốn gỗ'):undefined;
    rows=[['Chủng loại',treeKind(data)],['Sinh cảnh',inspectionRegion(scene,{x:sprite.x,y:data.y})],
      ['Tuổi cây',scene.prop(data,'age')],['Thuộc tính',scene.prop(data,'element')],
      ['Kích thước sprite',`${n(sprite.displayWidth)} × ${n(sprite.displayHeight)} px`],
      ['Thu hoạch',timber?itemName('wood'):undefined],['Số lần đốn',timber?.cuts],
      ['Mọc lại sau',timber?.renewAt!==undefined?minutes(timber.renewAt-worldMinutes(world)):undefined]];
  }
  shape.fields=fields(rows);
  return shape;
}
