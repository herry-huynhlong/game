import {martialTrainingRate} from './MartialProgress';
import { creditBreakthrough, creditDeath } from './DivinePowerLedger';
import type { TradeItemId } from './types';
import { PROFESSION_BEHAVIORS, SPECIAL_DUTIES } from './ProfessionBehaviorRegistry';
import { advanceQiMinor, advancesQiMinor, breakthrough, cultivationStats, cultivationView } from '../systems/CultivationSystem';
import { cultivationRequired, REALMS } from '../systems/RealmConfig';
import { TECHNIQUES, addTechniquePractice, techniqueEffects } from '../systems/TechniqueSystem';
import type { SpiritualRootId, TechniqueId } from '../systems/CultivationTypes';
import type { DivineWorldSave, NPCAction, NPCProfession, Personality, PopulationRole, SimNPC, WorldEvent } from './types';
import { ITEM_CATALOG } from './ItemCatalog';
import { daySchedule, factionFor, traitsFor, CITY_SITES } from './SettlementSystem';
import { EconomySystem } from './EconomySystem';
import { SectSystem } from './SectSystem';
import { equipBestWeapon } from './GiftItemSystem';
import { spreadBoard } from './HeavenlyBoard';
import { makeTreasureOffer, resolveTreasureOffer, sellerAccepts } from './TreasureTrade';
import { tickDuels } from './TreasureDuel';
import { applyCultivationMandate, syncDestinyEvents } from './DestinySystem';
import { discloseBoardSource } from './TreasureCausality';
import { createNPCAIProfile } from './NPCAIIdentity';
import { harvestHerbNode } from './EnvironmentalSystem';

const names=['Vân Du','Tống Thanh Hà','Mạc Tiểu Nhiên','Lục Trường Canh','Bạch Tố Tâm','Hàn Sơn','Diệp Linh Chi','Chu Mặc','Ninh Uyển','Phùng Đại Hải','Tần Vũ','Lâm Tiểu Ngư','Thẩm Dạ','Cố Minh Châu','Đường Kính','Liễu Như Yên','La Thất','Hứa An','Kỷ Vô Ưu','Tô Nguyệt','Trình Bá','Âu Dương Tĩnh','Mạnh Tiểu Thạch','Lý Hoài Cẩn','Yến Phi','Đào A Mộc'];
const professions:NPCProfession[]=['tu_si','tu_si','tu_si','dan_su','thuong_nhan','duoc_su','ho_ve','nong_dan','tu_si','tho_re','tu_si','duoc_su','tu_si','dan_su','thuong_nhan','tu_si','ho_ve','nong_dan','tu_si','thuong_nhan','tho_re','tu_si','dan_thuong','duoc_su','tu_si','dan_thuong'];
const personalities:Personality[]=['điềm tĩnh','tham vọng','hào sảng','cẩn trọng','hiếu kỳ','cô độc','nhân hậu','thực tế'];
const roots:SpiritualRootId[]=['metal','wood','water','fire','earth'];const techniques:TechniqueId[]=['qingyun','sword','longevity'];
const spots=[
  [580,790],[430,610],[720,720],[490,860],[840,680],[680,530],[420,780],[770,870],[340,510],[630,900],
  [1740,540],[1890,610],[2040,520],[1800,760],[2140,680],[1660,850],[1960,880],[2210,490],
  [1310,1040],[1450,1160],[1580,1280],[1780,1090],[1940,1280],[1240,760],[540,690],[1850,450],
];
const homeFor=(i:number)=>spots[i];
const homePosition=(i:number,profession:NPCProfession):[number,number]=>{const cityHomes:Record<number,[number,number]>={4:[2760,1000],6:[2385,940],7:[2605,1275],9:[3260,1165],11:[2940,735],14:[3170,750],16:[2415,940],17:[2740,1275],19:[2600,720],20:[3320,1165]};return cityHomes[i]??homeFor(i)};
function scheduleFor(profession:NPCProfession):{hour:number;action:NPCAction}[]{return daySchedule(profession)}
function makeNPC(i:number):SimNPC {const profession=professions[i],id=i===0?'van-du':`qingyun-${String(i).padStart(2,'0')}`;const citySpots:Record<number,[number,number]>={4:[2740,850],6:[2370,850],7:[2670,1195],9:[3260,1080],11:[2965,632],14:[3170,652],16:[2370,900],17:[2620,1195],19:[2590,632],20:[3270,1070]};const xy=citySpots[i]??homeFor(i);const home=homePosition(i,profession);const npc:SimNPC={id,name:names[i],age:i===0?23:18+(i*7)%68,lifespan:i===0?120:70+(i*17)%90,gender:i===0?'nam':i%3===0?'nữ':'nam',appearance:i===0||profession==='tu_si'?'cultivator':'steward',x:xy[0],y:xy[1],home:{x:home[0],y:home[1]},realmIndex:i===0?0:(i%10===0?1:0),realmLevel:i===0?1:1+(i*5)%6,xp:(i*23)%75,spiritualRoot:roots[i%roots.length],technique:techniques[i%techniques.length],techniqueMastery:{qingyun:1,sword:1,longevity:1},techniqueProgress:{qingyun:0,sword:0,longevity:0},hp:100,mp:60,personality:personalities[i%personalities.length],ambition:['Kết đan thành tiên','Bảo vệ người thân','Tìm lại di vật sư môn','Mở tiệm linh dược','Tìm kiếm linh mạch'][i%5],hunger:(i*13)%40,fatigue:(i*9)%34,mood:58+(i*11)%40,spiritStones:15+(i*19)%120,inventory:i%4===0?[{itemId:'qi_pill',count:1}]:i%4===1?[{itemId:'spirit_herb',count:2}]:i%4===2?[{itemId:'iron_sword',count:1}]:[{itemId:'protective_talisman',count:1}],profession,faction:profession==='thuong_nhan'?'Thương Hội Thanh Vân':profession==='ho_ve'?'Thanh Vân Thành':['dan_thuong','nong_dan'].includes(profession)?'Thanh Vân Thôn':'Thanh Vân Tông',relationships:{},shortGoal:'Ổn định cuộc sống',longGoal:['Đạt Trúc Cơ','Tích lũy linh thạch','Tìm được sư phụ','Mở rộng y quán'][i%4],action:'idle',goalAction:'idle',actionTarget:{x:xy[0],y:xy[1]},actionProgress:0,actionCooldown:0,schedule:scheduleFor(profession),memories:[],marked:i===0,alive:true,skills:profession==='tu_si'?['basic-attack','qi-sword','dodge','meditate','interact']:profession==='ho_ve'?['basic-attack','dodge','interact']:[],homeId:`home-${id}`,safety:68,traits:{},employerId:['thuong_nhan','ho_ve','duoc_su','tho_re'].includes(profession)?factionFor({profession} as SimNPC):undefined};npc.traits=traitsFor(npc);if(profession==='nong_dan')npc.inventory=[{itemId:'rice_seed',count:4}];if(profession==='tho_re')npc.inventory=[{itemId:'iron_ore',count:4},{itemId:'wood',count:3}];if(profession==='duoc_su')npc.inventory=[{itemId:'spirit_herb',count:5}];const {hpMax,mpMax}=cultivationStats(npc);npc.hp=hpMax;npc.mp=mpMax;return npc}
export function createInitialNPCs(legacy:Record<string,any>={},worldSeed='qingyun-world-default'):SimNPC[]{const npcs=names.map((_,i)=>makeNPC(i));for(const npc of npcs)npc.aiProfile=createNPCAIProfile(worldSeed,npc);const van=npcs[0];if(Number.isInteger(legacy.realmIndex))van.realmIndex=legacy.realmIndex;if(Number.isInteger(legacy.realmLevel))van.realmLevel=legacy.realmLevel;if(Number.isFinite(legacy.xp))van.xp=legacy.xp;if(Number.isFinite(legacy.hp))van.hp=legacy.hp;if(Number.isFinite(legacy.mp))van.mp=legacy.mp;if(Number.isFinite(legacy.stones))van.spiritStones=legacy.stones;if(legacy.spiritualRoot)van.spiritualRoot=legacy.spiritualRoot;if(legacy.technique)van.technique=legacy.technique;if(legacy.techniqueMastery)van.techniqueMastery={...van.techniqueMastery,...legacy.techniqueMastery};if(legacy.techniqueProgress)van.techniqueProgress={...van.techniqueProgress,...legacy.techniqueProgress};if(Number.isFinite(legacy.x)&&Number.isFinite(legacy.y)){van.x=legacy.x;van.y=legacy.y}van.lifespan=REALMS[van.realmIndex]?.lifespan??120;const vitals=cultivationStats(van);van.hp=Math.min(van.hp,vitals.hpMax);van.mp=Math.min(van.mp,vitals.mpMax);van.memories.push({day:1,text:'Ý thức từ một đời tu hành khác đã được lưu giữ trong Tàng Thức.',kind:'origin'});for(const npc of npcs){pickGoal(npc,360,1);npc.action='travel'}return npcs}

const populationNamesA=['Tạ','Lục','Thẩm','Cố','Hứa','Tần','Mạnh','Đường','Diệp','Ninh','Bạch','Hàn','Lâm','Tô','Trình','Âu Dương','Kỷ','Liễu','La','Phùng','Chu','Yến','Mạc','Tống','Lý','Vệ','Từ','Văn','Tiêu','Khang','Phan','Đào','Thôi','Cao','Tôn','Dư','Lương','Tưởng','Ngụy','Hồ','Giang','Từ','Cung','Thạch','Bùi','Dương','Tề','Hoàng','Khương','Tưởng'];
const populationNamesB=['Thanh Hà','Tử Nghi','Vân Khanh','Minh Châu','Trường Canh','Tiểu Nhiên','Như Yên','Hoài Cẩn','Tử Mặc','Linh Chi','An Nhiên','Tĩnh Sơn','Phi Yến','Nguyệt Bạch','Tử Du','Hạo Nhiên','Mộc Lan','Kính Đường','Vô Ưu','Tiểu Ngư','Dạ Minh','Thanh Dao','Tố Tâm','Đại Hải','Trường Phong','Nhược Thủy','Tử Khanh','Minh Nguyệt','Vân Sinh','Bá Hải','Tùng Tuyết','Hành Chu','Tử An','Nhất Minh','Cảnh Hành','Tiểu Thạch','Dưỡng Tâm','Phi Bạch','Mặc Nhiên','Vãn Tình','Tử Huyên','Thanh Phong','Tư Viễn','Sơ Ảnh','Tử Lăng','Hoài Sơn','Tĩnh Uyển','Mạnh Đức','Bình An','Trường Lạc'];
const populationSeed=(value:string)=>[...value].reduce((h,c)=>Math.imul(h^c.charCodeAt(0),16777619)>>>0,2166136261);
const roleProfession:Record<PopulationRole,NPCProfession>={commoner:'dan_thuong',low_disciple:'tu_si',elder:'tu_si',sect_leader:'tu_si',merchant:'thuong_nhan',tavern_staff:'dan_thuong',city_guard:'ho_ve',repair_worker:'tho_re',hunter:'ho_ve',herb_gatherer:'duoc_su',quest_clerk:'dan_thuong',independent_cultivator:'tu_si'};
const roleFaction:Record<PopulationRole,string>={commoner:'Thanh Vân Thôn',low_disciple:'Thanh Vân Tông',elder:'Thanh Vân Tông',sect_leader:'Thanh Vân Tông',merchant:'Thương Hội Thanh Vân',tavern_staff:'Thanh Vân Thành',city_guard:'Thanh Vân Thành',repair_worker:'Thanh Vân Thành',hunter:'Thanh Vân Thành',herb_gatherer:'Thanh Vân Thôn',quest_clerk:'Thanh Vân Thành',independent_cultivator:'Tán tu'};
const roleDuty:Record<PopulationRole,string>={commoner:'Sinh kế dân sinh; hành vi theo nghề hiện có',low_disciple:'Tu luyện và sinh hoạt ngoại môn',elder:'Cố vấn tông môn; hiện dùng hành vi tu sĩ sẵn có',sect_leader:'Tông chủ Thanh Vân Tông; hiện dùng hành vi tu sĩ sẵn có',merchant:'Buôn bán qua hệ thống cửa hàng hiện có',tavern_staff:'Nhân viên tửu quán; chưa có nghề dịch vụ riêng',city_guard:'Tuần tra theo hành vi hộ vệ hiện có',repair_worker:'Thợ sửa chữa theo commission/environment hiện có',hunter:'Thợ săn tự chủ; săn con mồi trong vùng rồi thu nhặt chiến lợi phẩm',herb_gatherer:'Hái dược theo nguồn tài nguyên hữu hạn hiện có',quest_clerk:'Nhân viên trạm nhiệm vụ; giao nhận quest riêng chưa có',independent_cultivator:'Tán tu ngoài Thanh Vân Tông'};
const roleRegion:Record<PopulationRole,{x:number;y:number}>={commoner:{x:2670,y:1195},low_disciple:{x:700,y:650},elder:{x:700,y:650},sect_leader:{x:700,y:650},merchant:{x:2740,y:824},tavern_staff:{x:2590,y:632},city_guard:{x:2370,y:836},repair_worker:{x:3260,y:1080},hunter:{x:1450,y:1160},herb_gatherer:{x:1580,y:1280},quest_clerk:{x:2500,y:1000},independent_cultivator:{x:1850,y:450}};
export function createPopulationNPC(role:PopulationRole,id:string,worldSeed:string,serial:number,usedNames:ReadonlySet<string>):SimNPC{
 const profession=role==='commoner'&&serial%5===0?'nong_dan':roleProfession[role],faction=roleFaction[role],template=makeNPC((serial+1)%names.length),seed=populationSeed(`${worldSeed}:${id}`),surnameCount=populationNamesA.length,givenCount=populationNamesB.length;
 let name='';for(let attempt=0;attempt<populationNamesA.length*givenCount;attempt++){const a=(seed+serial+attempt)%surnameCount,b=(Math.imul(seed>>>8,17)+serial*7+attempt)%givenCount;const candidate=populationNamesA[a]+populationNamesB[b];if(!usedNames.has(candidate)){name=candidate;break}}if(!name)name=`Tán tu ${id}`;
 const anchor=roleRegion[role],col=(serial-1)%6,row=Math.floor((serial-1)/6),x=anchor.x+(col-2.5)*88,y=anchor.y+(row-2)*78,gender=(seed%2?'nam':'nữ') as SimNPC['gender'];
 const npc:SimNPC={...template,id,name,age:18+seed%58,lifespan:72+(seed>>>4)%75,gender,appearance:'cultivator',x,y,home:{x,y},realmIndex:0,realmLevel:1+(seed>>>9)%5,xp:(seed>>>13)%75,spiritualRoot:(['metal','wood','water','fire','earth'] as const)[(seed>>>17)%5],technique:(['qingyun','sword','longevity'] as const)[(seed>>>21)%3],techniqueMastery:{qingyun:1,sword:1,longevity:1},techniqueProgress:{qingyun:0,sword:0,longevity:0},hp:100,mp:60,personality:personalities[(seed>>>2)%personalities.length],ambition:['Kết Đan để tự lập','Bảo vệ người thân','Tìm lại di vật thất lạc','Mở một gian hàng nhỏ','Khám phá linh mạch'][seed%5],hunger:(seed>>>5)%35,fatigue:(seed>>>11)%35,mood:48+(seed>>>15)%50,spiritStones:0,inventory:[],profession,faction,relationships:{},shortGoal:'Ổn định cuộc sống',longGoal:['Tu luyện theo căn cốt','Tích lũy bằng lao động','Giữ lời hứa với gia đình','Tìm nơi an cư'][seed%4],action:'idle',goalAction:profession==='tu_si'?'cultivate':profession==='ho_ve'?'patrol':'socialize',actionTarget:{x,y},actionProgress:0,actionCooldown:0,schedule:scheduleFor(profession),memories:[],marked:false,alive:true,skills:profession==='tu_si'?['basic-attack','qi-sword','dodge','meditate','interact']:profession==='ho_ve'?['basic-attack','dodge','interact']:[],homeId:`home-${id}`,safety:60+(seed>>>6)%36,traits:{},populationRole:role,populationDuty:roleDuty[role]};
 npc.traits=traitsFor(npc);npc.aiProfile=createNPCAIProfile(worldSeed,npc);npc.talent=25+(seed>>>12)%70;const {hpMax,mpMax}=cultivationStats(npc);npc.hp=hpMax;npc.mp=mpMax;npc.lifespan=Math.max(npc.lifespan,REALMS[0].lifespan);return npc;
}

export function targetFor(npc:SimNPC,action:NPCAction,day:number,minute:number){
  if(npc.faction==='Hắc Phong Hội'){if(action==='cultivate'||action==='rest'||action==='work'||action==='socialize'||action==='patrol'||action==='guard'||action==='eat')return npc.home??{x:1900,y:1320};if(action==='gather')return {x:2215,y:735};if(action==='trade'||action==='shop')return npc.relationships['qingyun-traders']&&npc.relationships['qingyun-traders']>35?CITY_SITES['city-market']:{x:1900,y:1320};}
  if(action==='eat')return CITY_SITES['city-food-hall'];if(action==='rest')return npc.home??{x:npc.x,y:npc.y};
  if(action==='cultivate')return npc.populationRole&&npc.home?npc.home:{x:650,y:685};if(action==='gather')return {x:1450,y:1150};if(action==='farm')return EconomySystem.count(npc.inventory,'rice_seed')>0?CITY_SITES['city-farm']:CITY_SITES['city-market'];
  if(action==='work')return npc.profession==='tho_re'?CITY_SITES['city-forge']:npc.profession==='dan_thuong'?CITY_SITES['city-market']:CITY_SITES['city-apothecary'];
  if(action==='trade'||action==='shop')return CITY_SITES['city-market'];if(action==='patrol'||action==='guard')return CITY_SITES['city-gate'];
  if(action==='socialize')return CITY_SITES['city-inn'];if(action==='flee')return CITY_SITES['city-safe-yard'];
  if(action==='recruit')return {x:690,y:520};if(action==='mission'||action==='commission')return npc.actionTarget;
  return npc.home??{x:npc.x,y:npc.y};
}
function actionLabel(action:NPCAction){return ({farm:'Làm việc ngoài ruộng',work:'Chế tác tại cửa tiệm',trade:'Đang bán hàng',patrol:'Tuần tra thành môn',cultivate:'Đang đả tọa',eat:'Tìm bữa ăn',rest:'Nghỉ ngơi hồi sức',socialize:'Gặp gỡ đồng đạo',flee:'Rút lui đến nơi an toàn',gather:'Tìm tài nguyên',shop:'Mua vật phẩm',commission:'Tìm hiểu Ủy Thác Các'} as Record<string,string>)[action]??action}
export function chooseLivelihoodGoal(npc:SimNPC,scheduled:NPCAction,world?:DivineWorldSave){
 const profile=npc.aiProfile,axes=profile?.axes??{diligence:npc.traits?.hamHoc??45,courage:npc.traits?.canDam??40,ambition:npc.traits?.thamVong??40,generosity:npc.traits?.nhanTu??50,sociability:npc.traits?.giaoTiep??45,caution:50,discipline:50};
 const hpMax=cultivationStats(npc).hpMax, lowHp=npc.hp<hpMax*.45;
 const scores:Array<{action:NPCAction;score:number;reason:string}>=[];
 const add=(action:NPCAction,score:number,reason:string)=>scores.push({action,score,reason});
 add('eat',canSeekFood(npc,world)?npc.hunger*.78+(scheduled==='eat'?25:0):-100,npc.hunger>=55?'đang đói, cần tìm lương thực':'nhu cầu ăn uống chưa cấp bách');
  add('rest',npc.fatigue*.7+(lowHp?42:0)+(scheduled==='rest'?16:0),lowHp?'sinh lực thấp nên ưu tiên hồi phục':npc.fatigue>=55?'mệt mỏi sau thời gian hoạt động':'chưa cần nghỉ gấp');
 if(npc.profession==='nong_dan'){
  const seeds=EconomySystem.count(npc.inventory,'rice_seed'),poor=npc.spiritStones<5;
  add('farm',38+axes.diligence*.25+(scheduled==='farm'?20:0)+(profile?.socialClass==='bần hàn'?7:profile?.socialClass==='khá giả'?-4:0)+(seeds?12:poor?-24:0)-npc.fatigue*.3-(lowHp?35:0),seeds?'có thóc giống và đủ sức làm vụ mùa':poor?'cần thu nhập, nhưng còn phải có giống hợp lệ':'đang đến giờ lao động nông nghiệp');
  if(EconomySystem.count(npc.inventory,'ration')>0)add('trade',12+EconomySystem.count(npc.inventory,'ration')*8+(scheduled==='trade'?28:0)+axes.ambition*.08,'đang mang nông sản thực trong túi, có thể bán lấy tiền');
  const friendship=Math.max(0,...Object.values(npc.relationships??{}));add('socialize',8+axes.sociability*.28+axes.generosity*.05+(100-npc.mood)*.12+friendship*.1+(scheduled==='socialize'?15:0),'muốn gặp người trong thôn khi công việc và nhu cầu thiết yếu đã ổn');
 }else if(npc.profession==='tu_si'){
  if(npc.populationRole&&(npc.socialNeed??0)>65)add('socialize',35+(npc.socialNeed??0)*.3+axes.sociability*.15,'Thiếu giao tiếp, muốn gặp đồng môn.');
  const required=cultivationRequired(npc.realmIndex,npc.realmLevel),progress=Math.min(1,npc.xp/Math.max(1,required));
  if(!world||!npc.meditationBreakUntil||npc.meditationBreakUntil<=world.clock.day*1440+world.clock.minute)add('cultivate',(npc.populationRole?(scheduled==='cultivate'?24:9):33)+axes.ambition*.24+axes.discipline*.18+(npc.talent??50)*.04+(profile?.socialClass==='bần hàn'?-3:0)+(scheduled==='cultivate'?19:0)+(1-progress)*10-npc.fatigue*.18-(lowHp?38:0),lowHp?'thân thể chưa phù hợp để tiếp tục tu luyện':axes.ambition>68?'khát vọng tăng tu vi đang thúc đẩy tu luyện':'địa điểm tu luyện phù hợp với con đường tu sĩ');
  const available=EconomySystem.count(world?.settlement?.materials??[],'spirit_herb');
  if(available>0&&!lowHp)add('gather',16+axes.ambition*.16+axes.caution*.08+(scheduled==='gather'?18:0),`có ${available} linh thảo trong kho tài nguyên hữu hạn để thu thập`);
  if(npc.populationRole&&scheduled==='rest')add('rest',57,'Hết ca hoạt động, trở về nhà nghỉ.');
  if(npc.populationRole&&npc.spiritStones<16&&!lowHp&&available>0&&scheduled!=='rest')add('gather',61,'Thiếu linh thạch và có nguồn linh thảo để kiếm thu nhập.');
  const pillStock=world?.shops?.find(s=>s.id==='city-apothecary');
  const wantsPill=npc.populationRole&&!advancesQiMinor(npc)&&progress>=1&&!EconomySystem.count(npc.inventory,'qi_pill')&&npc.actionCooldown<=0&&pillStock&&EconomySystem.count(pillStock.stock,'qi_pill')>0;
  if(wantsPill&&!lowHp&&scheduled!=='rest'&&npc.spiritStones>=(pillStock.sellPrices.qi_pill??Infinity))add('shop',85,'Đã tới bình cảnh; đến hiệu thuốc mua Tụ Khí Đan từ tồn kho.');
  else if(wantsPill&&!lowHp&&scheduled==='cultivate'&&npc.spiritStones<(pillStock.sellPrices.qi_pill??Infinity))add('work',66,'Thiếu linh thạch để mua đan, tìm việc có trả công.');
  const mission=world?.sectMissions?.find(m=>m.assigneeId===npc.id&&m.status==='active');
  const recentCombatMemory=npc.memories.slice(-5).some(m=>m.kind==='combat'||m.kind==='mission-failed');
  if(mission&&!lowHp)add('mission',40+axes.ambition*.18+axes.courage*.12-(recentCombatMemory?22:0),recentCombatMemory?`đã có nhiệm vụ thật, nhưng ký ức giao chiến gần đây khiến NPC dè chừng hơn`: `đã được giao nhiệm vụ tông môn hợp lệ: ${mission.title}`);
  const friendship=Math.max(0,...Object.values(npc.relationships??{}));add('socialize',8+axes.sociability*.3+axes.generosity*.05+friendship*.1+(scheduled==='socialize'?18:0),'giao tiếp với đồng môn là ưu tiên cá nhân sau tu luyện và nhu cầu thiết yếu');
 }else{
  if(!['eat','rest','socialize'].includes(scheduled))add(scheduled,50+axes.diligence*.12,'Đến ca theo lịch nghề nghiệp.');
  if(scheduled==='rest')add('rest',62,'Hết ca, trở về nơi cư trú.');
  if(scheduled==='socialize'||(npc.socialNeed??0)>65)add('socialize',20+axes.sociability*.2+(npc.socialNeed??0)*.25,'Muốn gặp cư dân khác.');
  if(npc.profession==='dan_thuong'&&npc.spiritStones<10&&scheduled!=='rest')add('work',69,'Cần thu nhập để mua lương thực.');
  if(npc.populationRole==='commoner'&&npc.profession==='dan_thuong'&&scheduled!=='rest'&&EconomySystem.count(npc.inventory,'wood')>0)add('trade',65+axes.diligence*.15,'Đang mang gỗ đã đốn; đưa tới chợ để bán khi quầy còn tiền.');
 }
 const personal=npc.personalGoal;
 if(personal){
   for(const option of scores)if(option.action===personal.action&&option.score>0){
     option.score+=personal.bonus;
     option.reason+=' · mục tiêu: '+personal.label.toLowerCase();
   }
 }
 scores.sort((a,b)=>b.score-a.score);let selected=scores[0];const current=scores.find(x=>x.action===npc.goalAction);
 // Hysteresis: the current plan remains until another valid choice is meaningfully better.
 if(current&&!lowHp&&selected.action!==current.action&&selected.score<current.score+10)selected=current;
 return {action:selected.action,reason:selected.reason,scores:scores.slice(0,5).map(({action,score})=>({action,score:Math.round(score)}))};
}
function canSeekFood(npc:SimNPC,world?:DivineWorldSave){
 if(!world?.clock||EconomySystem.count(npc.inventory,'ration')+EconomySystem.count(npc.inventory,'deer_meat')>0)return true;
 if(world.clock.day*1440+world.clock.minute<(npc.foodSearchAfter??0))return false;
 if(!npc.populationRole)return true;
 const store=world.factions?.some(f=>(f.name===npc.faction||f.id==='qingyun-village')&&EconomySystem.count(f.treasury,'ration')>0);
 const merchant=world.shops?.some(s=>(s.id==='city-food'||s.id==='city-market')&&EconomySystem.count(s.stock,'ration')>0&&npc.spiritStones>=(s.sellPrices.ration??Infinity));
 return Boolean(store||merchant);
}
type GuardRoutine={action:'rest'|'patrol'|'guard';position:{x:number;y:number};name:string;slot:string};

type ShopDuty={id:string;name:string;position:{x:number;y:number};action:'work'|'trade';open:boolean;reachable:boolean};

export function livelihoodNeed(n:SimNPC,world?:DivineWorldSave,mealTime=false):'eat'|'rest'|null{
  const health=n.hp/cultivationStats(n).hpMax;
  if(health<.33||n.decisionSlot==='need:rest'&&(health<.45||n.fatigue>57))return 'rest';
  if((n.goalAction==='eat'&&n.hunger>44||n.hunger>=70||mealTime&&n.hunger>=55)&&canSeekFood(n,world))return 'eat';
  return n.fatigue>=86?'rest':null;
}

export function professionInterrupted(n:SimNPC,world:DivineWorldSave){
  return Boolean(n.marketVisit||n.skyStep||n.tribulation||n.manualMeditation||n.goalAction==='fight'||n.goalAction==='flee'||
    n.decisionSlot?.startsWith('mandate:')||livelihoodNeed(n,world));
}

function setRoutine(n:SimNPC,action:NPCAction,slot:string,target:{x:number;y:number},label:string,force:boolean,at:number){
  if(!force&&n.goalAction===action&&n.decisionSlot===slot)return;
  n.goalAction=action;n.decisionSlot=slot;n.shortGoal=label;n.actionTarget=target;n.actionProgress=0;
  n.action=Math.hypot(n.x-target.x,n.y-target.y)<25?action:'travel';
  n.aiDecision={at,action,reason:label,scores:[]};
}

function pickGoal(npc:SimNPC,minute:number,day:number,force=false,world?:DivineWorldSave,duty?:ShopDuty,guard?:GuardRoutine){
  const at=day*1440+minute;
  if(world&&(npc.lawResponse?.status==='responding'||npc.lawResponse?.status==='at-scene')){
    const target=world.npcs.find(n=>n.id===npc.lawResponse?.targetId&&n.alive);
    if(target){
      setRoutine(npc,'guard','city-law:'+npc.lawResponse.incidentId,{x:target.x,y:target.y},
        'Ứng phó bạo lực trong thành',force,at);
      return;
    }
  }
  if(npc.marketVisit||npc.decisionSlot?.startsWith('sect-campus:')||npc.decisionSlot?.startsWith('society:'))return;
  if(npc.goalAction==='flee'&&at<(npc.faunaEvadeUntil??0))return;
  if(duty&&(npc.goalAction==='fight'||npc.goalAction==='flee')&&
    (npc.faunaHuntTargetId||npc.lawResponse||npc.decisionSlot?.startsWith('duel:')))return;
  const specialPlan=npc.decisionSlot?.startsWith('duel:')||npc.decisionSlot?.startsWith('mandate:');
  if(npc.populationRole&&!specialPlan&&!npc.faunaHuntTargetId&&!npc.lawResponse){
    const mealTime=duty&&[...npc.schedule].reverse().find(item=>item.hour<=Math.floor(minute/60))?.action==='eat';
    const need=livelihoodNeed(npc,world,Boolean(mealTime));
    const unsafe=npc.safety<35&&Boolean(duty||npc.profession!=='ho_ve'&&(npc.traits?.canDam??40)<65);
    if(unsafe||need){
      const action=unsafe?'flee':need!;
      const target=action==='eat'&&(EconomySystem.count(npc.inventory,'ration')||EconomySystem.count(npc.inventory,'deer_meat'))
        ?{x:npc.x,y:npc.y}:targetFor(npc,action,day,minute);
      setRoutine(npc,action,'need:'+action,target,actionLabel(action),force,at);
      return;
    }
  }
  if(duty&&!specialPlan){
    if(duty.open&&duty.reachable){
      setRoutine(npc,duty.action,'shop-shift:'+duty.id,duty.position,'Đến '+duty.name,force,at);
    }else{
      const target=duty.open?{x:npc.x,y:npc.y}:npc.home??npc;
      setRoutine(npc,'rest',duty.open?'shop-wait:'+duty.id:'shop-closed:'+duty.id,target,
        duty.open?'Chờ lối tới cửa hàng':'Đã đóng cửa '+duty.name,force,at);
    }
    return;
  }
  if(!force&&npc.decisionSlot?.endsWith(':herb-craft')&&npc.hunger<68&&npc.fatigue<78&&npc.safety>=40&&npc.hp>=cultivationStats(npc).hpMax*.45)return;
  if(!force&&npc.timberSourceId&&npc.goalAction==='work')return;
  if(npc.professionTask?.kind==='herb-gather'&&npc.assignedResourceNodeId&&npc.goalAction==='gather')return;
  if(npc.decisionSlot?.startsWith('commission:')&&npc.assignedCommissionId&&npc.goalAction==='commission')return;
  if(npc.decisionSlot==='commission-board'&&npc.goalAction==='commission')return;
  if(npc.decisionSlot==='commission-clerk'&&npc.goalAction==='commission')return;
  if(npc.decisionSlot===`${day}:farm-field`&&npc.goalAction==='farm'&&npc.fatigue<90&&npc.safety>=35&&npc.hp>=cultivationStats(npc).hpMax*.33)return;
  if(!force&&(npc.decisionSlot?.startsWith('env-repair:')&&npc.goalAction==='work'||npc.decisionSlot?.startsWith('env-loot:')&&npc.goalAction==='gather'))return;
  if(!force&&npc.decisionSlot?.startsWith('mandate:')&&npc.hunger<60&&npc.fatigue<75&&npc.safety>=45&&npc.hp>=cultivationStats(npc).hpMax*.4)return;
  if(npc.decisionSlot?.startsWith('duel:'))return;
  if(!force&&npc.decisionSlot?.startsWith('duel-retreat:')&&npc.actionProgress<45)return;
  if(!force&&npc.decisionSlot==='hunt-sale'&&npc.hunger<75&&npc.fatigue<81)return;
  if(!force&&npc.faunaHuntTargetId&&npc.hp>=cultivationStats(npc).hpMax*.36&&npc.fatigue<82&&npc.safety>=30)return;
  if(!force&&npc.decisionSlot?.startsWith('board:')&&npc.hunger<60&&npc.fatigue<78&&npc.safety>=35)return;
  if(!force&&npc.decisionSlot?.startsWith('sect-recruit:')&&npc.goalAction==='recruit')return;
  if(!force&&npc.decisionSlot?.startsWith('sect-mission:')&&npc.goalAction==='mission')return;
  if(!force&&npc.decisionSlot===`${day}:deliver`&&npc.goalAction==='trade'&&(npc.hunger<60||!canSeekFood(npc,world))&&npc.fatigue<78)return;
  if(!force&&world&&npc.populationRole&&npc.profession==='nong_dan'&&minute>=420&&minute<1020&&(npc.hunger<67||!canSeekFood(npc,world))&&npc.fatigue<78&&npc.safety>=40&&npc.hp>=cultivationStats(npc).hpMax*.45&&EconomySystem.count(npc.inventory,'ration')<4&&!npc.decisionSlot?.endsWith(':deliver')){
    if(npc.goalAction!=='farm'||!npc.decisionSlot?.includes(':farm')){
      npc.goalAction='farm';npc.actionTarget=targetFor(npc,'farm',day,minute);npc.actionProgress=0;
      npc.decisionSlot=day+':farm-plan';npc.shortGoal='Chuẩn bị giống và canh tác';
      npc.aiDecision={at:day*1440+minute,action:'farm',reason:'Đang trong ca và cần bổ sung khẩu phần từ vụ mùa.',scores:[]};
    }
    return;
  }
  if(guard&&!specialPlan&&!npc.lawResponse&&npc.goalAction!=='flee'){
    setRoutine(npc,guard.action,guard.slot,guard.position,guard.name,force,at);
    return;
  }
  const stagger=npc.populationRole&&npc.populationRole!=='city_guard'?((npc.aiProfile?.seed??17)%43)-21:0;
  const hour=Math.floor(((minute+stagger+1440)%1440)/60);let action:NPCAction,reason='Lịch sinh hoạt phù hợp với nghề nghiệp.';
  if(npc.hp<cultivationStats(npc).hpMax*.33){action='rest';reason='Bị thương nặng, trở về nơi trú để hồi phục.'}else if(npc.hunger>=75&&canSeekFood(npc,world)){action='eat';reason='Đói nghiêm trọng, ưu tiên tìm lương thực.'}else if(npc.fatigue>=90){action='rest';reason='Kiệt sức, cần nghỉ trước khi tiếp tục.'}else if(npc.safety<35&&npc.profession!=='ho_ve'&&(npc.traits?.canDam??40)<65){action='flee';reason='Khu vực nguy hiểm hơn mức NPC sẵn sàng chấp nhận.'}else if(!npc.populationRole&&npc.profession==='dan_thuong'&&npc.spiritStones<10){action='work';reason='Cần kiếm tiền trang trải sinh hoạt.'}else{const scheduled=[...npc.schedule].reverse().find(item=>item.hour<=hour);action=scheduled?.action??'rest';
  const shift=npc.populationRole&&SPECIAL_DUTIES[npc.populationRole];if(shift&&hour>=8&&hour<18&&action==='socialize')action=shift.action;if(npc.profession==='dan_thuong'&&action==='socialize'&&npc.personality==='cô độc')action='rest';if(world&&npc.populationRole&&(hour<5||hour>=21)&&!(npc.profession==='tu_si'&&(npc.aiProfile?.axes.discipline??0)>=68&&npc.fatigue<55&&npc.safety>=60)&&!(npc.populationRole==='city_guard'&&(npc.aiProfile?.seed??0)%3===0)){action='rest';reason='Đêm xuống, về nơi cư trú để ngủ.'}else if(npc.profession==='nong_dan'||npc.profession==='tu_si'||npc.populationRole){const choice=chooseLivelihoodGoal(npc,action,world);action=choice.action;reason=choice.reason;npc.aiDecision={at:day*1440+minute,action,reason,scores:choice.scores}}}
  const slot=`${day}:${action}`;if(!force&&npc.goalAction===action&&npc.decisionSlot===slot)return;
  npc.aiDecision={at:day*1440+minute,action,reason,scores:npc.aiDecision?.action===action?npc.aiDecision.scores:[]};
  npc.goalAction=action;npc.decisionSlot=slot;npc.shortGoal=actionLabel(action);npc.actionTarget=action==='mission'&&npc.assignedMissionId?(world?.sectMissions.find(m=>m.id===npc.assignedMissionId)?.target??targetFor(npc,action,day,minute)):targetFor(npc,action,day,minute);npc.actionProgress=0;
  if(npc.populationRole&&action==='eat'&&(EconomySystem.count(npc.inventory,'ration')>0||EconomySystem.count(npc.inventory,'deer_meat')>0))npc.actionTarget={x:npc.x,y:npc.y};
}

const daysPerYear = 365;

/** Advance the existing age and lifespan fields only when simulation time runs. */
export function advanceNpcLifespans(world: DivineWorldSave) {
  const day = world.clock.day, year = Math.floor((day - 1) / daysPerYear);
  const elapsedYears = Math.max(0, year - (world.lifespanYear ?? year));
  world.lifespanYear = year;
  if (!elapsedYears) return false;
  for (const npc of world.npcs) {
    if (!npc.alive || npc.ascended || !Number.isFinite(npc.age) || !(npc.lifespan > 0)) continue;
    npc.age += elapsedYears;
    if (npc.age < npc.lifespan) continue;
    npc.alive = false;
    npc.hp = 0;
    npc.deathCause = 'Hết thọ nguyên';
    creditDeath(world, npc, 'npc-death', npc.deathCause);
    world.events.push({id:'npc-death:lifespan:'+npc.id,type:'npc-death',day,minute:world.clock.minute,
      actorId:npc.id,description:npc.name+' hết thọ nguyên.',status:'completed'});
    if(world.events.length>400)world.events.shift();
  }
  return true;
}

export class AutonomousNPCSystem {
  constructor(readonly npcs:SimNPC[],private readonly emit:(event:Omit<WorldEvent,'id'>)=>void,private readonly world?:DivineWorldSave,private readonly clearStrike?:(a:SimNPC,b:SimNPC)=>boolean,
    private readonly market?:(n:SimNPC,side:'buy'|'sell',shopId:string,itemId:TradeItemId,count:number)=>ReturnType<typeof EconomySystem.buyFromShop>,
    private readonly majorBreakthrough?:(npc:SimNPC)=>boolean,
    private readonly shopDuty?:(npc:SimNPC)=>ShopDuty|undefined,
    private readonly guardRoutine?:(n:SimNPC)=>GuardRoutine|undefined){}
  private shopTrade(n:SimNPC,side:'buy'|'sell',shop:string,item:TradeItemId,count:number,day:number,minute:number){
    if(this.market)return this.market(n,side,shop,item,count);
    return side==='buy'?EconomySystem.buyFromShop(this.world!,n,shop,item,count,day,minute):
      EconomySystem.sellToShop(this.world!,n,shop,item,count,day,minute);
  }
  tick(minutes:number,day:number,minute:number,suspendedNpcId?:string|null){
    if(minutes<=0)return;
    this.tickShared(suspendedNpcId);
    for(const npc of this.npcs)if(npc.id!==suspendedNpcId)this.tickNpc(npc,minutes,day,minute);
  }
  tickShared(suspendedNpcId?:string|null){if(this.world){tickDuels(this.world,this.clearStrike);spreadBoard(this.world);for(const command of this.world.cultivationMandates??[]){const subject=this.npcs.find(x=>x.id===command.npcId);if(subject&&(!subject.alive||subject.ascended||subject.id===suspendedNpcId))applyCultivationMandate(this.world,subject,0,this.clearStrike)}syncDestinyEvents(this.world);for(const offer of this.world.treasureOffers??[]){if(offer.status==='pending'&&offer.sellerId!==suspendedNpcId){const seller=this.npcs.find(x=>x.id===offer.sellerId);if(seller)resolveTreasureOffer(this.world,offer,sellerAccepts(seller,offer))}}}}
  tickNpc(n:SimNPC,minutes:number,day:number,minute:number,activityMinutes?:number){
    if(!n.alive||n.minor||n.age<18||('underground' in n&&n.underground)||minutes<=0)return;
    this.advanceMinor(n,day,minute);
    if(n.decisionSlot?.startsWith('board:')&&this.world){const news=this.world.boardNews?.find(x=>`board:${x.id}`===n.decisionSlot),target=this.npcs.find(x=>x.id===news?.targetId&&x.alive&&!x.ascended);if(target&&news&&day<=news.expiresDay&&n.hunger<60&&n.fatigue<78&&n.safety>=35){n.actionTarget={x:target.x,y:target.y};if(Math.hypot(n.x-target.x,n.y-target.y)<50){news.reactions[n.id]='đã tiếp xúc';if(news.sourceEventId)discloseBoardSource(this.world,n,target,news.id);const offer=makeTreasureOffer(this.world,news,n,target);if(offer&&this.world.heaven.possession?.npcId!==target.id)resolveTreasureOffer(this.world,offer,sellerAccepts(target,offer));n.memories.push({day,text:`Tìm gặp ${target.name} để hỏi về bảo vật.`,kind:'news',sourceId:news.id,knownThrough:'witnessed',otherId:target.id,itemId:news.itemId});this.emit({day,minute,type:'board-visit',actorId:n.id,targetId:target.id,description:`${n.name} đã gặp ${target.name} để tìm hiểu bảo vật.`,data:{sourceId:news.id,itemId:news.itemId}});n.decisionSlot=undefined;n.goalAction='rest';n.actionProgress=0}}else{if(news)news.reactions[n.id]='gián đoạn';n.decisionSlot=undefined}}n.hunger=Math.min(100,n.hunger+minutes*.027);if(n.populationRole)n.socialNeed=Math.min(100,(n.socialNeed??20)+minutes*.03);n.fatigue=Math.min(100,n.fatigue+minutes*(n.goalAction==='cultivate'||n.goalAction==='gather'?0.018:.008));n.actionCooldown=Math.max(0,n.actionCooldown-minutes);n.mood=Math.max(0,Math.min(100,n.mood+(n.hunger<55&&n.fatigue<65?.015:-.02)*minutes));n.safety=Math.min(100,n.safety+Math.max(0,minutes*.005));const previousGoal=n.goalAction,previousTarget=n.actionTarget;const duty=this.shopDuty?.(n),guard=this.guardRoutine?.(n);pickGoal(n,minute,day,false,this.world,duty,guard);if(this.world)applyCultivationMandate(this.world,n,minutes,this.clearStrike);
      const target=n.actionTarget??={...(n.home??{x:n.x,y:n.y})};
      const d=Math.hypot(n.x-target.x,n.y-target.y);if(n.goalAction==='idle'||d<25){n.action=n.goalAction==='travel'?'idle':n.goalAction;const worked=activityMinutes===undefined?minutes:n.goalAction===previousGoal&&n.actionTarget===previousTarget?activityMinutes:0;n.actionProgress+=worked;if(worked>0)this.perform(n,worked,day,minute)}else n.action='travel';
      if(this.world?.cultivationMandates?.some(c=>c.npcId===n.id&&c.kind==='gather'&&c.status==='active'&&(c.progress??0)>0&&n.decisionSlot==='mandate:'+c.id))n.action='gather';
      if(n.actionProgress>=this.duration(n)){const queued=this.finish(n,day,minute);if(!queued)pickGoal(n,minute,day,true,this.world,duty,guard)}
      }
  private duration(npc:SimNPC){const action=npc.goalAction,profession=PROFESSION_BEHAVIORS[npc.profession];
  const duty=npc.populationRole&&SPECIAL_DUTIES[npc.populationRole];
  if(duty&&duty.action===action)return duty.minutes;
  if(profession.action===action&&action!=='socialize')return profession.minutes;
  return action==='commission'?Infinity:action==='rest'?90:action==='cultivate'?60:action==='gather'?45:action==='farm'?90:action==='work'?75:action==='trade'?25:action==='eat'?10:action==='patrol'||action==='guard'?60:action==='socialize'?40:45}
  meditateAtRest(n:SimNPC,day:number,minute:number){
    if(n.hp<cultivationStats(n).hpMax*.4||n.fatigue>=90||n.hunger>=85)return;
    n.actionCooldown=Math.max(0,n.actionCooldown-1);
    n.fatigue=Math.min(100,n.fatigue+.018);n.hunger=Math.min(100,n.hunger+.027);
    n.actionProgress++;
    this.perform(n,1,day,minute);
    if(n.actionProgress>=this.duration(n)){this.breakthroughIfReady(n,day,minute);n.actionProgress=0;}
  }
  private perform(n:SimNPC,minutes:number,day:number,minute:number){if(n.action==='cultivate'){
    if(day*1440+minute<(n.meditationBlockedUntil??0))return;
    const stats=cultivationStats(n);
    n.mp=Math.min(stats.mpMax,n.mp+stats.mpRegen*minutes/40);
    const rootRate=({metal:1.02,wood:1.08,water:1.05,fire:1.12,earth:0.96} as Record<string,number>)[n.spiritualRoot]??1;const ambitious=1+(n.traits?.thamVong??35)/500;const talentRate=.72+(n.talent??50)/180;const diligence=.8+(n.traits?.hamHoc??45)/250;const rate=4*rootRate*ambitious*talentRate*diligence*techniqueEffects(n.technique,n.techniqueMastery[n.technique]).cultivationRate;const required=cultivationRequired(n.realmIndex,n.realmLevel);n.xp+=rate*martialTrainingRate(n)*minutes/10*((n.westPoison??0)>=45?.75:1);
    if(advancesQiMinor(n)&&n.populationRole)this.advanceMinor(n,day,minute);
    else n.xp=Math.min(required,n.xp);
      if(n.populationRole&&addTechniquePractice(n,n.technique,minutes*.25)){
        const detail=TECHNIQUES[n.technique].name+' cấp '+n.techniqueMastery[n.technique];
        this.remember(n,day,'Rèn luyện '+detail,'cultivation');
        this.emit({day,minute,type:'npc-technique-mastery',actorId:n.id,description:n.name+' nâng '+detail+'.'});
      }}
    if(n.action==='cultivate'&&n.populationRole==='low_disciple'&&n.livingMentorDay!==day&&minute>=480&&minute<1080&&this.world){
      const teacher=this.npcs.find(other=>other.alive&&['elder','sect_leader'].includes(other.populationRole??'')&&other.action==='cultivate'&&other.fatigue<82&&Math.hypot(other.x-n.x,other.y-n.y)<96&&(!n.mentorId||n.mentorId===other.id));
      const sect=this.world.sects.find(s=>s.rankByNpc[n.id]),faction=this.world.factions.find(f=>f.id===sect?.factionId);
      if(teacher&&sect?.ownedTechniques.includes(teacher.technique)&&faction&&EconomySystem.remove(faction.treasury,'spirit_herb',1)){
        n.livingMentorDay=day;n.mentorId=teacher.id;n.technique=teacher.technique;
        addTechniquePractice(n,n.technique,16);
        n.relationships[teacher.id]=Math.min(100,(n.relationships[teacher.id]??0)+5);
        teacher.relationships[n.id]=Math.min(100,(teacher.relationships[n.id]??0)+2);
        const detail='Được '+teacher.name+' chỉ dạy '+TECHNIQUES[n.technique].name+'.';
        n.memories.push({day,text:detail,kind:'mentorship',otherId:teacher.id});n.memories=n.memories.slice(-12);
        this.emit({day,minute,type:'npc-mentorship',actorId:teacher.id,targetId:n.id,description:n.name+' được '+teacher.name+' chỉ dạy, tiêu hao 1 linh thảo.'});
      }
    }
    if(n.action==='rest'){const stats=cultivationStats(n);n.fatigue=Math.max(0,n.fatigue-minutes*.45);if(!this.world?.population)n.hp=Math.min(stats.hpMax,n.hp+minutes*.08);n.mp=Math.min(stats.mpMax,n.mp+minutes*.1);n.safety=Math.min(100,n.safety+minutes*.03)}
    if(n.action==='socialize'){n.mood=Math.min(100,n.mood+minutes*.12);const nearby=this.npcs.find(other=>other.id!==n.id&&other.alive&&Math.hypot(other.x-n.x,other.y-n.y)<50);if(nearby){n.socialNeed=Math.max(0,(n.socialNeed??20)-minutes*.4);const social=(n.traits?.giaoTiep??40)/100;const gain=minutes*.08*social;n.relationships[nearby.id]=Math.min(100,(n.relationships[nearby.id]??0)+gain);nearby.relationships[n.id]=Math.min(100,(nearby.relationships[n.id]??0)+gain);if(!n.memories.some(m=>m.day===day&&m.kind==='social'&&m.otherId===nearby.id)){n.memories.push({day,text:`Trò chuyện cùng ${nearby.name}, đôi bên thêm thân thiết.`,kind:'social',otherId:nearby.id});if(n.memories.length>12)n.memories.shift()}}}
  }
  private finish(n:SimNPC,day:number,minute:number):boolean{switch(n.goalAction){case 'eat':{if(EconomySystem.remove(n.inventory,'deer_meat',1)){n.hunger=Math.max(0,n.hunger-60);this.remember(n,day,'Dùng một phần thịt từ chuyến săn.','need');break}
      let ration=n.inventory.find(i=>i.itemId==='ration'&&i.count>0);if(!ration&&this.world){const homeFaction=this.world.factions.find(f=>f.name===n.faction);if(homeFaction&&EconomySystem.remove(homeFaction.treasury,'ration',1)){n.hunger=Math.max(0,n.hunger-55);this.remember(n,day,`Dùng lương thực từ kho ${homeFaction.name}.`,'need');break}if(n.faction!=='Hắc Phong Hội')for(const id of ['city-food','city-market']){const result=this.shopTrade(n,'buy',id,'ration',1,day,minute);if(result.ok){this.emit({day,minute,type:'npc-purchase',actorId:n.id,description:`${n.name} mua 1 lương thực tại ${id==='city-food'?'Tửu Quán':'Phường Thị'}.`});ration=n.inventory.find(i=>i.itemId==='ration');break}}}if(n.marketVisit)return true;if(ration&&EconomySystem.remove(n.inventory,'ration',1)){n.hunger=Math.max(0,n.hunger-68);this.remember(n,day,'Dùng bữa bằng lương thực đã mua hoặc mang theo.','need')}else{const guild=n.populationRole||n.faction==='Thanh Vân Thôn'?this.world?.factions.find(f=>f.id==='qingyun-village'):undefined;if(guild&&EconomySystem.remove(guild.treasury,'ration',1)){n.hunger=Math.max(0,n.hunger-55);this.remember(n,day,'Nhận một phần lương thực cứu tế hữu hạn của thôn.','need')}else{n.mood=Math.max(0,n.mood-8);n.foodSearchAfter=day*1440+minute+90;
      this.remember(n,day,'Không tìm được khẩu phần; sẽ tìm lại sau.','food-shortage')}}break}
      case 'rest':n.fatigue=Math.max(0,n.fatigue-45);this.remember(n,day,'Đã nghỉ ngơi hồi phục tại nơi cư trú.','need');break;
      case 'cultivate':this.breakthroughIfReady(n,day,minute);if(n.tribulation){n.actionProgress=0;return true;}break;
      case 'farm':{if(!this.world)break;if(EconomySystem.count(n.inventory,'rice_seed')<1){const seeded=n.populationRole&&EconomySystem.withdrawFaction(this.world,n,'qingyun-village','rice_seed',1);const seedPurchase=seeded||this.shopTrade(n,'buy','city-market','rice_seed',1,day,minute).ok;if(!seedPurchase){this.remember(n,day,'Chưa mua được thóc giống; vụ mùa chưa bắt đầu.','farm-blocked');break}n.actionTarget=CITY_SITES['city-farm'];n.shortGoal='Mang giống tới ruộng';n.actionProgress=0;n.decisionSlot=`${day}:farm-field`;this.remember(n,day,seeded?'Đã nhận giống hữu hạn từ kho làng.':'Đã mua thóc giống bằng tiền thật.','farm');return true}if(EconomySystem.remove(n.inventory,'rice_seed',1)){const yieldCount=n.populationRole?8:4;AutonomousNPCSystem.addItem(n,'ration',yieldCount);if(n.populationRole)AutonomousNPCSystem.addItem(n,'rice_seed',1);this.remember(n,day,'Thu hoạch '+yieldCount+' phần lương thực sau khi gieo thóc giống.','production');this.emit({day,minute,type:'farm-harvest',actorId:n.id,description:`${n.name} thu hoạch ${yieldCount} lương thực từ một chu kỳ canh tác.`});n.goalAction='trade';n.shortGoal='Mang nông sản tới chợ';n.actionTarget=CITY_SITES['city-market'];n.actionProgress=0;n.decisionSlot=`${day}:deliver`;return true}break}
      case 'work':if(n.vocation&&['miner','alchemist','smith','musician','physician','attendant'].includes(n.vocation))break;
    if(this.world&&n.populationRole==='tavern_staff'){
      const shop=this.world.shops.find(s=>s.id==='city-food'),pantry=this.world.factions.find(f=>f.id==='qingyun-village');
      const count=shop?Math.min(4,Math.max(0,20-EconomySystem.count(shop.stock,'ration'))):0;
      if(shop&&pantry&&count>0&&EconomySystem.remove(pantry.treasury,'ration',count)){
        EconomySystem.add(shop.stock,'ration',count);EconomySystem.payWage(this.world,n,'qingyun-city',2);
        this.remember(n,day,'Chuyển '+count+' khẩu phần từ kho làng về tửu quán.','service');
        this.emit({day,minute,type:'npc-tavern-stock',actorId:n.id,description:n.name+' bổ sung '+count+' khẩu phần cho tửu quán.'});
      }
      break;
    }
    if(this.world&&n.populationRole==='quest_clerk'){
      const commission=this.world.commissions?.find(c=>c.status==='posted'&&!c.reviewedBy);
      if(commission){
        commission.reviewedBy=n.id;commission.reviewedAt=day*1440+minute;
        EconomySystem.payWage(this.world,n,'qingyun-city',2);
        this.remember(n,day,'Đã kiểm tra hồ sơ '+commission.title+'.','commission');
        this.emit({day,minute,type:'npc-commission-review',actorId:n.id,targetId:commission.commissionId,description:n.name+' kiểm tra hồ sơ '+commission.title+'.'});
      }
      break;
    }
    if(n.timberSourceId&&this.world){
      const source=this.world.environment?.timberSources?.find(t=>t.id===n.timberSourceId);
      n.timberSourceId=undefined;
      if(!source||source.renewAt!==undefined||Math.hypot(n.x-source.x,n.y-source.y)>=25)break;
      source.renewAt=(day+3)*1440+minute;source.cuts=(source.cuts??0)+1;
      AutonomousNPCSystem.addItem(n,'wood',2);
      this.remember(n,day,'Đốn cây lấy 2 gỗ; cây cần ba ngày để mọc lại.','timber');
      this.emit({day,minute,type:'npc-timber-cut',actorId:n.id,targetId:source.id,description:n.name+' đốn cây và nhặt 2 gỗ.'});
      n.goalAction='trade';n.shortGoal='Mang gỗ ra Phường Thị';n.actionProgress=0;n.decisionSlot=day+':deliver';return true;
    }if(n.profession==='dan_thuong'||n.populationRole&&n.profession==='tu_si'){const factionId=n.faction==='Thanh Vân Thôn'?'qingyun-village':n.faction==='Thanh Vân Tông'?'qingyun-sect':'qingyun-city';if(this.world&&EconomySystem.payWage(this.world,n,factionId,5))this.emit({day,minute,type:'npc-wage',actorId:n.id,description:`${n.name} nhận 5 linh thạch tiền công từ ${n.faction}.`})}else this.produce(n,day,minute);
      const duty=this.shopDuty?.(n),product=duty?.id==='city-forge'?'iron_sword':duty?.id==='city-apothecary'?'qi_pill':null;
      if(product&&duty&&n.decisionSlot==='shop-shift:'+duty.id){
        const count=EconomySystem.sellable(this.world!,n,product);
        if(count>0)this.shopTrade(n,'sell',duty.id,product,count,day,minute);
        break;
      }
      if(n.inventory.some(i=>i.itemId==='iron_sword'||i.itemId==='qi_pill')){n.goalAction='trade';n.shortGoal='Đưa sản phẩm tới cửa hàng';n.actionTarget=n.profession==='tho_re'?CITY_SITES['city-forge']:CITY_SITES['city-apothecary'];n.actionProgress=0;n.decisionSlot=`${day}:deliver`;return true}break;
      case 'shop':{
        if(!this.world||!n.populationRole||n.profession!=='tu_si')break;
        const outcome=this.shopTrade(n,'buy','city-apothecary','qi_pill',1,day,minute);
        if(outcome.ok){this.remember(n,day,'Mua Tụ Khí Đan để chuẩn bị đột phá.','cultivation');
          this.emit({day,minute,type:'npc-purchase',actorId:n.id,targetId:outcome.record?.sellerId,description:n.name+' mua Tụ Khí Đan tại hiệu thuốc.'});}
        else n.actionCooldown=90;
        break;
      }
      case 'trade':{const shopId=n.profession==='nong_dan'?'city-market':n.profession==='tho_re'?'city-forge':n.profession==='duoc_su'||n.profession==='dan_su'?'city-apothecary':'city-market';const shop=this.world?.shops.find(s=>s.id===shopId);let moved=0;
      if(this.world&&n.populationRole&&n.profession==='nong_dan'){
        const surplus=Math.max(0,EconomySystem.count(n.inventory,'ration')-1);
        if(surplus&&EconomySystem.depositFaction(this.world,n,'qingyun-village','ration',surplus))this.emit({day,minute,type:'npc-provisions',actorId:n.id,description:n.name+' nhập '+surplus+' khẩu phần vào kho lương cộng đồng.'});
        break;
      }if(shop&&this.world){for(const item of ['ration','iron_sword','qi_pill','spirit_herb','wood','wolf_fang','wolf_pelt','boar_tusk','crimson_plate','toad_sac','jade_venom','demon_core','elite_beast_core'] as const){const count=Math.max(0,EconomySystem.count(n.inventory,item)-(n.populationRole&&item==='ration'?1:0));if(count>0){const sold=this.shopTrade(n,'sell',shop.id,item,count,day,minute);if(sold.ok&&!sold.internal){moved+=count;this.emit({day,minute,type:'npc-sale',actorId:n.id,description:`${n.name} bán ${count} ${item} cho ${shop.name}.`})}}}const now=day*1440+minute;const newShopTrade=this.world.economy.transactions.some(t=>t.shopId===shop.id&&t.day*1440+t.minute>(n.lastTradeAt??-1));if(n.profession==='thuong_nhan'&&newShopTrade&&EconomySystem.payShopOwner(shop,n,4))n.lastTradeAt=now}if(moved)this.remember(n,day,`Bán ${moved} sản phẩm; tiền được cộng vào túi thật.`,'trade');else if(n.profession==='thuong_nhan')this.remember(n,day,'Trực quầy tại chợ; cửa hàng chỉ bán từ lượng tồn hiện có.','trade');break}
      case 'gather':{if(this.world){if(n.populationRole==='herb_gatherer'){const nodeId=n.assignedResourceNodeId,node=nodeId?this.world.environment?.resourceNodes?.find(x=>x.id===nodeId):undefined,eventId=node?`herb-harvest:regrowth:${this.world.worldId}:${node.id}:${(node.harvestCount??0)+1}`:'';const harvested=nodeId?harvestHerbNode(this.world,nodeId,n.id,eventId):null;if(harvested){this.remember(n,day,'Hái 1 linh thảo từ node hữu hạn; lượng node đã giảm và vật phẩm được thêm vào túi.','gather');this.emit({day,minute,type:'herb-node-harvest',actorId:n.id,targetId:nodeId,description:`${n.name} hái 1 linh thảo tại ${nodeId}; còn ${harvested.after}.`})}else this.remember(n,day,'Không thu hoạch được: node cạn, bị người khác giữ hoặc reservation không còn hợp lệ.','gather');n.assignedResourceNodeId=undefined;n.professionTask=undefined;n.decisionSlot=undefined;
      if(harvested&&EconomySystem.count(n.inventory,'spirit_herb')>=2){
        n.goalAction='work';n.actionProgress=0;n.shortGoal='Mang linh thảo về hiệu thuốc luyện đan';n.decisionSlot=day+':herb-craft';return true;
      }
      n.goalAction='rest';n.actionTarget={...(n.home??{x:n.x,y:n.y})};n.shortGoal='Đã hoàn tất lượt hái thuốc';break}const source=this.world.settlement.materials;const available=EconomySystem.count(source,'spirit_herb');if(available>0&&EconomySystem.remove(source,'spirit_herb',1)){AutonomousNPCSystem.addItem(n,'spirit_herb',1);this.remember(n,day,'Thu thập 1 linh thảo từ kho tài nguyên hữu hạn.','gather')}else this.remember(n,day,'Khu vực thu hái tạm hết linh thảo.','gather')}break}
      case 'mission':if(this.world)SectSystem.completeMission(this.world,n,day,minute);break;
      case 'recruit':n.actionProgress=0;return true;
      case 'patrol':case 'guard':n.safety=Math.min(100,n.safety+12);n.mood=Math.min(100,n.mood+1);break;
      case 'socialize':break;
    }
    n.actionProgress=0;return false;
  }
  private produce(n:SimNPC,day:number,minute:number){if(!this.world)return;if(n.profession==='tho_re'){if(EconomySystem.count(n.inventory,'iron_ore')<2)this.shopTrade(n,'buy','city-forge','iron_ore',2,day,minute);if(EconomySystem.count(n.inventory,'wood')<1)this.shopTrade(n,'buy','city-forge','wood',1,day,minute);if(EconomySystem.count(n.inventory,'iron_ore')>=2&&EconomySystem.count(n.inventory,'wood')>=1){EconomySystem.remove(n.inventory,'iron_ore',2);EconomySystem.remove(n.inventory,'wood',1);AutonomousNPCSystem.addItem(n,'iron_sword',1);this.emit({day,minute,type:'smith-production',actorId:n.id,description:`${n.name} rèn 1 phàm kiếm từ 2 quặng và 1 gỗ.`})}}
    if(n.profession==='duoc_su'||n.profession==='dan_su'){if(EconomySystem.count(n.inventory,'spirit_herb')<2)this.shopTrade(n,'buy','city-apothecary','spirit_herb',2,day,minute);if(EconomySystem.remove(n.inventory,'spirit_herb',2)){AutonomousNPCSystem.addItem(n,'qi_pill',1);this.emit({day,minute,type:'alchemist-production',actorId:n.id,description:`${n.name} luyện 1 Tụ Khí Đan từ 2 linh thảo.`})}}
  }
  private advanceMinor(n:SimNPC,day:number,minute:number){
    if(!n.populationRole||!advancesQiMinor(n)||n.xp<cultivationRequired(0,n.realmLevel))return;
    const old=cultivationStats(n);
    const prior={realmIndex:n.realmIndex,realmLevel:n.realmLevel};
    const attained=advanceQiMinor(n);
    creditBreakthrough(this.world,n,prior);
    const next=cultivationStats(n);
    n.hp=Math.min(next.hpMax,n.hp+next.hpMax-old.hpMax);
    n.mp=Math.min(next.mpMax,n.mp+next.mpMax-old.mpMax);
    const level=attained[attained.length-1];
    this.emit({day,minute,type:'npc-minor-advance',actorId:n.id,description:n.name+' tự tu lên '+level+'.',
      data:{realm:0,level:n.realmLevel,levels:attained.length}});
  }
  private breakthroughIfReady(n:SimNPC,day:number,minute:number){if(n.populationRole&&advancesQiMinor(n)){this.advanceMinor(n,day,minute);return;}if(n.populationRole&&n.actionCooldown>0)return;const required=cultivationRequired(n.realmIndex,n.realmLevel);if(n.xp<required||!cultivationView(n).canBreakthrough)return;let pill=n.inventory.find(i=>i.itemId==='qi_pill'&&i.count>0);if(!pill&&this.world&&n.populationRole&&n.faction==='Thanh Vân Tông'&&EconomySystem.withdrawFaction(this.world,n,'qingyun-sect','qi_pill',1))pill=n.inventory.find(i=>i.itemId==='qi_pill');
    if(!pill&&this.world&&!n.populationRole){const buy=this.shopTrade(n,'buy','city-apothecary','qi_pill',1,day,minute);if(buy.ok)pill=n.inventory.find(i=>i.itemId==='qi_pill')}
    if(!pill){this.remember(n,day,'Đủ tu vi nhưng thiếu Tụ Khí Đan để ổn định đột phá.','cultivation');if(n.populationRole)n.actionCooldown=120;return}
    if(this.majorBreakthrough&&n.populationRole&&n.realmLevel===REALMS[n.realmIndex].maxLevel){
      this.majorBreakthrough(n);return;
    }
    const c={realmIndex:n.realmIndex,realmLevel:n.realmLevel,xp:n.xp,spiritualRoot:n.spiritualRoot,technique:n.technique,techniqueMastery:n.techniqueMastery,techniqueProgress:n.techniqueProgress};const old=cultivationStats(n);const result=breakthrough(c);if(!result.success||!EconomySystem.remove(n.inventory,'qi_pill',1))return;
    if(n.populationRole&&c.realmIndex>n.realmIndex){
      const health=n.hp/Math.max(1,old.hpMax);
      const chance=Math.max(.2,Math.min(.92,.35+(n.talent??50)*.004+(n.techniqueMastery[n.technique]??1)*.022+health*.13-n.fatigue*.003));
      const roll=populationSeed(n.id+':'+day+':'+minute+':'+n.realmIndex)/4294967296;
      if(roll>=chance){
        n.xp=Math.floor(required*.85);n.fatigue=Math.min(100,n.fatigue+18);n.actionCooldown=240;
        this.remember(n,day,'Vượt đại cảnh giới thất bại; đã dùng Tụ Khí Đan và mất một phần tu vi.','cultivation');
        this.emit({day,minute,type:'npc-breakthrough-failed',actorId:n.id,status:'failed',description:n.name+' thất bại khi vượt đại cảnh giới.'});
        return;
      }
    }
    const prior={realmIndex:n.realmIndex,realmLevel:n.realmLevel};
    n.realmIndex=c.realmIndex;n.realmLevel=c.realmLevel;n.xp=c.xp;n.lifespan=Math.max(n.lifespan,REALMS[n.realmIndex].lifespan);creditBreakthrough(this.world,n,prior);equipBestWeapon(n);const next=cultivationStats(n);n.hp=Math.min(next.hpMax,n.hp+next.hpMax-old.hpMax);n.mp=Math.min(next.mpMax,n.mp+next.mpMax-old.mpMax);this.remember(n,day,`Đột phá thành công: ${result.to}.`,'cultivation');this.emit({day,minute,type:'npc-breakthrough',actorId:n.id,description:`${n.name} đột phá ${result.to}, tiêu hao 1 Tụ Khí Đan.`})
  }
  private remember(n:SimNPC,day:number,text:string,kind:string){n.memories.push({day,text,kind});if(n.memories.length>12)n.memories.shift()}
  setPositions(positions:Record<string,{x:number;y:number}>){for(const n of this.npcs){const p=positions[n.id];if(p){n.x=p.x;n.y=p.y}}}
  getNPC(id:string){return this.npcs.find(n=>n.id===id)}
  static addItem(n:SimNPC,itemId:string,count=1){if(!ITEM_CATALOG[itemId]&&itemId!=='ration')return;const stack=n.inventory.find(s=>s.itemId===itemId);if(stack)stack.count+=count;else n.inventory.push({itemId,count})}
}






