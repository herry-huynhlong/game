import {createPopulationNPC} from '../dao/AutonomousNPCSystem.ts';
import {EconomySystem as Economy} from '../dao/EconomySystem.ts';
import {ITEM_CATALOG} from '../dao/ItemCatalog.ts';

export const POPULATION_TARGET = 180;
const MINUTES_PER_DAY = 1440;
const ADULT_AGE = 18;
const DISTANCE = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
const hash = value => [...value].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);

export const VOCATIONS = {
  citizen:['Dân thường','commoner','dan_thuong'],
  farmer:['Nông dân','commoner','nong_dan'],
  disciple:['Đệ tử ngoại môn','low_disciple','tu_si'],
  miner:['Khoáng công','commoner','dan_thuong'],
  hunter:['Thợ săn','hunter','ho_ve'],
  herbalist:['Người hái dược','herb_gatherer','duoc_su'],
  alchemist:['Luyện đan sư','commoner','dan_su'],
  smith:['Luyện khí sư','commoner','tho_re'],
  physician:['Y sư','commoner','duoc_su'],
  caravan:['Thương nhân lưu động','independent_cultivator','thuong_nhan'],
  musician:['Nhạc sư','commoner','dan_thuong'],
  wanderer:['Tu sĩ du phương','independent_cultivator','tu_si'],
  attendant:['Nhân viên quán xá','tavern_staff','dan_thuong'],
};

// Each group reuses an existing settlement, work yard, pavilion or rest point.
export const DISTRICTS = [
  {id:'city', name:'Thanh Vân Thành', home:'residence-27', work:'city-center', trades:['citizen','alchemist','smith','physician','musician','attendant']},
  {id:'village', name:'Ngoại thành Nam', home:'south-outskirts', work:'south-outskirts', trades:['citizen','farmer','farmer','herbalist','caravan']},
  {id:'village-road', name:'Xóm ven Thanh Vân Cổ Đạo', home:'old-road-north', work:'old-road-north', trades:['farmer','citizen','hunter','herbalist']},
  {id:'sect', name:'Thanh Vân Tông', home:'sect-lodging-approach', work:'sect-yard', trades:['disciple','disciple','disciple','disciple','herbalist','wanderer']},
  {id:'mine', name:'Trạm khai khoáng Thanh Vân Tông', home:'sect-veins-approach', work:'sect-veins-approach', trades:['miner','miner','miner','wanderer']},
  {id:'oasis', name:'Thanh Nguyệt Ốc Đảo', home:'east-camp', work:'east-refuge', trades:['citizen','caravan','wanderer','attendant']},
  {id:'market', name:'Phường thị Thanh Vân', home:'residence-31', work:'provisions-entrance', trades:['caravan','caravan','smith','alchemist','physician','musician']},
  {id:'pavilion', name:'Đình nghỉ Cổ Đạo', home:'old-road-pavilion', work:'old-road-pavilion', trades:['hunter','hunter','herbalist','wanderer','attendant']},
];

const ambitions = {
  cultivation:['Đột phá cảnh giới','cultivate',16], wealth:['Tích lũy linh thạch','trade',14],
  residence:['Sở hữu động phủ','work',12], vein:['Sở hữu linh mạch','mission',14],
  sect:['Gia nhập tông môn','cultivate',10], elder:['Trở thành trưởng lão','cultivate',16],
  alchemy:['Học luyện đan','work',14], smithing:['Học luyện khí','work',14],
  family:['Xây dựng gia đình','socialize',14], commerce:['Thành lập thương hội','trade',16],
  travel:['Du hành thiên hạ','gather',12], renown:['Nâng cao danh vọng','mission',12],
};
const vocationAmbitions = {
  farmer:['wealth','family','residence'], miner:['wealth','vein','residence'], hunter:['renown','wealth','travel'],
  disciple:['elder','cultivation','sect'], alchemist:['alchemy','wealth'], smith:['smithing','wealth'],
  caravan:['commerce','travel','wealth'], wanderer:['travel','vein','cultivation','sect'],
};
const motives = ['Tìm việc','Tìm cơ duyên','Gia nhập tông môn','Buôn bán','Định cư','Tìm người thân','Thám hiểm'];

export function populationState(world, target = POPULATION_TARGET) {
  return world.populationLife ??= {
    version:1, baseline:world.npcs.length, cohort:0, serial:0, target,
    households:{}, relatives:{}, birthFamilies:{}, departed:{}, recently:[], counts:{}, lastDay:0,
  };
}
function takenNames(world) {
  return new Set([...world.npcs.map(n=>n.name),...Object.values(world.populationLife?.departed??{}).map(entry=>entry.npc.name)]);
}

export function assignAmbition(npc, world) {
  if(npc.age<ADULT_AGE||npc.personalGoal)return;
  const axes=npc.aiProfile?.axes??{};
  const offered=vocationAmbitions[npc.vocation]??(npc.profession==='tu_si'
    ? ['cultivation','sect','elder','residence','vein','travel','renown'] : ['wealth','family','residence','commerce','renown']);
  const options=[...offered];
  if(axes.sociability>=65&&axes.generosity>=55)options.push('family','family');
  if(axes.ambition>=70)options.push(npc.profession==='tu_si'?'cultivation':'wealth');
  if(npc.authorityRole==='city_master'||npc.authorityRole==='sect_leader')options.splice(0,options.length,'renown');
  const id=options[hash(world.worldId+':goal:'+npc.id)%options.length];
  const [label,action,bonus]=ambitions[id];
  npc.personalGoal={id,label,action,bonus};
}

function record(world,npc,type,description,data={},includeWorldJournal=true) {
  const s=populationState(world),{day,minute}=world.clock;
  const entry={id:'population-life:'+type+':'+npc.id+':'+day+':'+minute,type:'resident-'+type,
    actorId:npc.id, day, minute, description, status:'completed',data};
  s.counts[type]=(s.counts[type]??0)+1;
  s.recently.push(entry);
  if(s.recently.length>100)s.recently.shift();
  if(!includeWorldJournal)return;
  world.events.push(entry);
  if(world.events.length>400)world.events.shift();
}
export function recordLivelihood(world,npc,type,description,data) { record(world,npc,type,description,data); }

function applyVocation(npc,vocation) {
  const [label,role,profession]=VOCATIONS[vocation];
  Object.assign(npc,{vocation,populationRole:role,profession,populationDuty:label});
  if(vocation==='farmer')npc.schedule=[{hour:0,action:'rest'},{hour:6,action:'farm'},
    {hour:12,action:'eat'},{hour:13,action:'farm'},{hour:17,action:'trade'},{hour:20,action:'rest'}];
  else if(['alchemist','smith','physician','musician','miner','attendant'].includes(vocation))npc.schedule=[
    {hour:0,action:'rest'},{hour:8,action:'work'},{hour:12,action:'eat'},{hour:13,action:'work'},
    {hour:18,action:'socialize'},{hour:21,action:'rest'}];
  else if(vocation==='caravan')npc.schedule=[{hour:0,action:'rest'},{hour:7,action:'trade'},
    {hour:12,action:'eat'},{hour:13,action:'trade'},{hour:20,action:'rest'}];
}

function enroll(world,npc) {
  if(npc.vocation!=='disciple')return;
  const sect=world.sects.find(s=>s.factionId==='qingyun-sect');
  const faction=world.factions.find(f=>f.id==='qingyun-sect');
  if(!sect||!faction)return;
  if(Object.keys(sect.rankByNpc).length>=sect.memberLimit)return;
  faction.memberIds.push(npc.id);
  sect.rankByNpc[npc.id]='ngoại_môn';
  npc.sectRank='ngoại_môn';
  npc.faction=faction.name;
}

function createResident(world, district, vocation, point, work, context, names) {
  const s=populationState(world), serial=++s.serial, id='living:v2:'+serial;
  const npc=createPopulationNPC(VOCATIONS[vocation][1],id,world.worldId,serial,names);
  names.add(npc.name);
  applyVocation(npc,vocation);
  const dna=hash(world.worldId+':'+id);
  const {day}=world.clock;
  Object.assign(npc,{...point,home:{...point},homeId:'resident-home:'+id,workPosition:{...work},
    workplaceId:district.work,actionTarget:{...point},spawnRegionId:district.id,residenceName:district.name,
    action:'idle',goalAction:'rest',shortGoal:'Thu xếp nơi ở'});
  npc.age=18+dna%48;
  npc.lifespan=Math.max(npc.age+10,npc.lifespan);
  // Opening assets travel with the immigrant. Subsequent work uses existing stocks and wallets.
  npc.spiritStones=context==='birth'?0:10+(dna>>>8)%29;
  npc.aiProfile.origin=context==='birth'?district.name:['Đông Lĩnh','Bắc Vực','Vân Mộng','Nam Cương'][dna%4];
  npc.aiProfile.familyCircumstance=context==='birth'?'Sinh ra trong gia đình tại '+district.name:'Đến '+district.name+' để '+motives[(dna>>>9)%motives.length].toLowerCase()+'.';
  npc.lifeOrigin={kind:context,day,district:district.id,reason:context==='birth'?'Sinh tại '+district.name:
    ({disciple:'Gia nhập tông môn',caravan:'Buôn bán',miner:'Tìm việc'})[vocation]??motives[(dna>>>9)%motives.length]};
  return npc;
}

export function addArrival(world,district,vocation,placement,context='immigration',names) {
  if(!placement)return null;
  const {home,work,workplaceId}=placement;
  const npc=createResident(world,district,vocation,home,work,context,names??takenNames(world));
  npc.workplaceId=workplaceId??district.work;
  enroll(world,npc);
  assignAmbition(npc,world);
  world.npcs.push(npc);
  record(world,npc,'immigration',npc.name+' đến '+district.name+' · '+npc.lifeOrigin.reason+'.',
    {district:district.id,reason:npc.lifeOrigin.reason},context!=='settlement');
  return npc;
}

export function migratePopulation(world,target,place) {
  const s=populationState(world,target), added=[];
  const planned=Math.max(0,target-s.baseline);
  const names=takenNames(world);
  // This cursor counts arrivals, never living bodies or records remaining in the roster.
  while(s.cohort<planned){
    const index=s.cohort;
    const region= DISTRICTS[index%DISTRICTS.length];
    const round=Math.floor(index/DISTRICTS.length);
    const vocation=region.trades[round%region.trades.length];
    const npc=addArrival(world,region,vocation,place(region,index),'settlement',names);
    if(!npc)break;
    added.push(npc);
    s.cohort++;
  }
  s.target=target;
  for(const npc of world.npcs)assignAmbition(npc,world);
  if(added.length){
    const {day,minute}=world.clock;
    world.events.push({id:'population-settlement:'+s.cohort,day,minute,type:'resident-settlement',
      description:added.length+' cư dân mới đã đăng ký cư trú tại '+new Set(added.map(n=>n.lifeOrigin.district)).size+' khu vực.',
      status:'completed'});
  }
  return added;
}

export function familyFor(world,id) {
  const s=world.populationLife;
  return s?.households[s.relatives[id]]??null;
}
export function familyOfOrigin(world,id) {
  const s=world.populationLife;
  return s?.households[s.birthFamilies?.[id]]??null;
}
const partnerHousehold=(world,id)=>familyFor(world,id)?.partners.includes(id);

export function formHousehold(world,a,b) {
  const s=populationState(world);
  const related=a?.parents?.includes(b?.id)||b?.parents?.includes(a?.id)||a?.parents?.some(id=>b?.parents?.includes(id));
  if(!a?.alive||!b?.alive||a===b||related||a.age<ADULT_AGE||b.age<ADULT_AGE||partnerHousehold(world,a.id)||partnerHousehold(world,b.id)||
    !a.home||!b.home||DISTANCE(a.home,b.home)>640||Math.min(a.relationships[b.id]??0,b.relationships[a.id]??0)<35)return null;
  const id='household:'+a.id+':'+b.id;
  const fund=Math.min(4,a.spiritStones)+Math.min(4,b.spiritStones);
  a.spiritStones-=Math.min(4,a.spiritStones);
  b.spiritStones-=Math.min(4,b.spiritStones);
  const home={...a.home};
  const household=s.households[id]={id,partners:[a.id,b.id],children:[],home,homeName:a.residenceName??a.homeId,
    founded:world.clock.day,fund,estate:[],inheritances:{}};
  for(const n of [a,b])s.relatives[n.id]=id;
  // They share a home address, with independent sleeping points handled by workstation slots.
  b.home={...home};b.homeId=a.homeId;b.residenceName=a.residenceName;
  record(world,a,'household',a.name+' và '+b.name+' lập gia đình.');
  return household;
}

export function haveChild(world,household,parents,placement) {
  const s=populationState(world), day=world.clock.day;
  if(!placement||parents.length!==2||parents.some(n=>!n.alive||n.age<18||n.age>46)||
    parents[0].gender===parents[1].gender||household.children.length>=2||day-(household.lastBirth??household.founded)<(household.children.length?730:45)||household.fund<6||
    world.npcs.filter(n=>n.alive).length>=s.target)return null;
  const district=DISTRICTS.find(d=>d.id===parents[0].spawnRegionId)??DISTRICTS[1];
  const npc=createResident(world,district,'citizen',placement.home,placement.work,'birth',takenNames(world));
  const roll=hash(world.worldId+':birth:'+npc.id);
  const roots=['metal','wood','water','fire','earth'];
  npc.spiritualRoot=roll%5<3?parents[roll%2].spiritualRoot:roots[(roll>>>8)%roots.length];
  npc.talent=Math.max(8,Math.min(92,Math.round((parents[0].talent+parents[1].talent)*.22+12+(roll>>>9)%50)));
  Object.assign(npc,{age:0,realmLevel:0,xp:0,minor:true,home:{...household.home},homeId:parents[0].homeId,
    residenceName:household.homeName,parents:parents.map(n=>n.id),shortGoal:'Lớn lên cùng gia đình'});
  household.fund-=6;
  // Upbringing expenses go to the village treasury.
  const village=world.factions.find(f=>f.id==='qingyun-village');
  if(village)village.wealth+=6;else household.fund+=6;
  household.children.push(npc.id);
  household.lastBirth=day;
  s.relatives[npc.id]=household.id;
  (s.birthFamilies??={})[npc.id]=household.id;
  world.npcs.push(npc);
  record(world,npc,'birth',npc.name+' chào đời tại '+district.name+'.',{parents:npc.parents});
  return npc;
}

function estate(world,household,members) {
  for(const n of members){
    if(n.alive||n.ascended||familyFor(world,n.id)!==household||household.inheritances[n.id])continue;
    const heir=members.filter(other=>other.alive&&!other.ascended&&other.id!==n.id)
      .sort((a,b)=>Number(b.parents?.includes(n.id)??false)-Number(a.parents?.includes(n.id)??false)||b.age-a.age)[0];
    const amount=n.spiritStones, items=[];
    for(const stack of [...n.inventory]){
      const item=ITEM_CATALOG[stack.itemId];
      if(!item||!['material','herb','pill'].includes(item.kind)||Economy.sellable(world,n,stack.itemId)<stack.count)continue;
      const {itemId,count}=stack;
      if(Economy.remove(n.inventory,itemId,count))items.push({itemId,count});
    }
    n.spiritStones=0;
    if(heir){
      heir.spiritStones+=amount;
      for(const item of items)Economy.add(heir.inventory,item.itemId,item.count);
    }else{
      household.fund+=amount;
      for(const item of items)Economy.add(household.estate,item.itemId,item.count);
    }
    household.inheritances[n.id]={day:world.clock.day,heirId:heir?.id??null,amount,items};
    record(world,n,'inheritance','Di sản của '+n.name+(heir?' thuộc về '+heir.name: ' được giữ trong gia sản')+'.',{amount,heirId:heir?.id});
  }
}

export function tickPopulationFamilies(world,placeChild,canShareHome=()=>true) {
  const s=populationState(world),day=world.clock.day;
  const byId=new Map(world.npcs.map(n=>[n.id,n]));
  const added=[], grown=[];
  for(const household of Object.values(s.households)){
    const parents=household.partners.map(id=>byId.get(id)).filter(Boolean);
    const children=household.children.map(id=>byId.get(id)).filter(Boolean);
    estate(world,household,[...parents,...children]);
    if(day%30===0)for(const n of parents){
      if(n.alive&&n.spiritStones>=18&&household.fund<20){n.spiritStones-=2;household.fund+=2;}
    }
    if(day%15===0&&household.children.length<2&&household.fund>=6&&parents.length===2&&parents.every(n=>n.alive)&&
      day-(household.lastBirth??household.founded)>=(household.children.length?730:45)){
      const child=haveChild(world,household,parents,placeChild(household));
      if(child)added.push(child);
    }
    for(const n of children){
      if(!n.alive||!n.minor||n.age<18)continue;
      const roll=hash(world.worldId+':adult:'+n.id);
      const options=[parents[0]?.vocation,parents[1]?.vocation,'farmer','citizen','herbalist','wanderer'].filter(Boolean);
      applyVocation(n,options[roll%options.length]);
      enroll(world,n);
      n.minor=false;n.realmLevel=1;
      n.modularAppearance=undefined;
      assignAmbition(n,world);
      grown.push(n);
      record(world,n,'adulthood',n.name+' trưởng thành, chọn nghề '+VOCATIONS[n.vocation][0].toLowerCase()+'.',{vocation:n.vocation});
    }
  }
  if(day%7===0)for(const n of world.npcs){
    if(!n.alive||n.ascended||n.age<18||n.age>55||partnerHousehold(world,n.id)||n.underground||n.authorityRole||
      n.personalGoal?.id!=='family'&&(n.aiProfile?.axes?.sociability??0)<70)continue;
    const partner=Object.entries(n.relationships).filter(([,value])=>value>=35).sort((a,b)=>b[1]-a[1])
      .map(([id])=>byId.get(id)).find(p=>p?.alive&&!p.authorityRole&&!p.underground&&p.age<=55&&p.home&&n.home&&
        !partnerHousehold(world,p.id)&&canShareHome(n.home,p.home));
    if(partner)formHousehold(world,n,partner);
  }
  return {added,grown};
}

export function settleDeparture(world,npc) {
  const s=populationState(world),index=world.npcs.indexOf(npc);
  if(index<0||!npc.alive||!npc.emigration||familyFor(world,npc.id))return false;
  const reason=npc.emigration.reason;
  record(world,npc,'emigration',npc.name+' rời Thanh Vân · '+reason+'.',{reason});
  s.departed[npc.id]={day:world.clock.day,reason,npc};
  world.npcs.splice(index,1);
  return true;
}
