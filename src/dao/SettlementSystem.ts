import type { DivineWorldSave, FactionSave, MarketStock, NPCAction, SettlementSave, ShopSave, SimNPC, TradeItemId } from './types';

export const CITY_SITES:Record<string,{x:number;y:number}>={
  'city-gate':{x:2370,y:836},'city-market':{x:2740,y:824},'city-food-hall':{x:2590,y:632},
  'city-apothecary':{x:2965,y:632},'city-inn':{x:3170,y:652},'city-hall':{x:3425,y:650},
  'city-barracks':{x:3420,y:860},'city-forge':{x:3260,y:1080},'city-farm':{x:2670,y:1195},
  'city-training':{x:3095,y:1170},'city-safe-yard':{x:2500,y:1000},
};
const itemPrices:Record<TradeItemId,{buy:number;sell:number}>={ration:{buy:3,sell:5},rice_seed:{buy:2,sell:3},wood:{buy:4,sell:7},iron_ore:{buy:8,sell:12},spirit_herb:{buy:6,sell:10},wolf_pelt:{buy:9,sell:14},wolf_fang:{buy:12,sell:18},demon_core:{buy:35,sell:55},deer_meat:{buy:0,sell:0},scorpion_venom:{buy:0,sell:0},snake_skin:{buy:0,sell:0},qi_pill:{buy:15,sell:22},iron_sword:{buy:12,sell:20},iron_dao:{buy:16,sell:24},mortal_gift_sword:{buy:12,sell:20},qingfeng_sword:{buy:60,sell:100}};
const stock=(entries:Partial<Record<TradeItemId,number>>):MarketStock[]=>Object.entries(entries).map(([itemId,count])=>({itemId:itemId as TradeItemId,count:count??0}));
function shop(id:string,name:string,ownerId:string,areaId:string,cash:number,items:Partial<Record<TradeItemId,number>>):ShopSave{return {id,name,ownerId,areaId,openHour:6,closeHour:22,cash,stock:stock(items),buyPrices:Object.fromEntries(Object.entries(itemPrices).map(([k,v])=>[k,v.buy])),sellPrices:Object.fromEntries(Object.entries(itemPrices).map(([k,v])=>[k,v.sell]))}}
export function createFactions(npcs:SimNPC[]):FactionSave[]{
  const groups:[string,string,FactionSave['type'],string,string|null,number][]=[
    ['qingyun-city','Thanh Vân Thành','city','city','qingyun-16',68],['qingyun-sect','Thanh Vân Tông','sect','sect','van-du',80],
    ['qingyun-village','Thanh Vân Thôn','village','village','qingyun-07',55],['qingyun-traders','Thương Hội Thanh Vân','guild','city','qingyun-04',50],
  ];
  const relations:Record<string,Record<string,number>>={'qingyun-city':{'qingyun-sect':62,'qingyun-village':78,'qingyun-traders':70},'qingyun-sect':{'qingyun-city':62,'qingyun-village':58,'qingyun-traders':48},'qingyun-village':{'qingyun-city':78,'qingyun-sect':58,'qingyun-traders':54},'qingyun-traders':{'qingyun-city':70,'qingyun-sect':48,'qingyun-village':54}};
  return groups.map(([id,name,type,areaId,leaderId,security])=>{const members=npcs.filter(n=>type==='city'?n.profession==='ho_ve':type==='sect'?['tu_si','dan_su','duoc_su'].includes(n.profession):type==='village'?['dan_thuong','nong_dan'].includes(n.profession):n.profession==='thuong_nhan').map(n=>n.id);const sect=type==='sect';return {id,name,type,areaId,leaderId:leaderId&&npcs.some(n=>n.id===leaderId)?leaderId:null,memberIds:members,treasury:stock(type==='city'?{ration:20,wood:12,iron_ore:6}:type==='village'?{ration:12,rice_seed:12}:sect?{spirit_herb:8,qi_pill:3,iron_ore:2}:{}),wealth:type==='city'?320:type==='village'?100:sect?240:0,relations:relations[id],security,reputation:sect?58:security*.55,power:members.length*12,territory:sect?['sect','training']:type==='city'?['city']:type==='village'?['village']:['market']}});
}
export function createShops():ShopSave[]{return [
  shop('city-market','Phường Thị Thanh Vân','qingyun-04','city-market',180,{ration:28,rice_seed:12,wood:6,iron_ore:4,spirit_herb:3}),
  shop('city-food','Tửu Quán Thanh Vân','qingyun-19','city-food-hall',120,{ration:22}),
  shop('city-apothecary','Bách Thảo Đường','qingyun-11','city-apothecary',160,{spirit_herb:10,qi_pill:5}),
  shop('city-forge','Thiết Mộc Các','qingyun-09','city-forge',140,{iron_ore:8,wood:8,iron_sword:3}),
  shop('city-inn','Khách Điếm Vân Lai','qingyun-14','city-inn',100,{ration:12}),
]}
export function createSettlement():SettlementSave{return {id:'qingyun-city',name:'Thanh Vân Thành',populationLimit:180,food:40,materials:stock({wood:24,iron_ore:14,spirit_herb:18,rice_seed:36}),security:68,guardCaptainId:'qingyun-16',lastSiegeDay:0}}
export function migrateSettlement(save:DivineWorldSave){
  const s=save as DivineWorldSave&Partial<Pick<DivineWorldSave,'factions'|'settlement'|'shops'|'economy'>>;
  for(const n of save.npcs){n.traits??=traitsFor(n);n.safety??=72;n.homeId??=`home-${n.id}`;n.home??={x:n.profession==='ho_ve'?2390:n.profession==='thuong_nhan'?3170:n.profession==='tho_re'?3260:n.profession==='duoc_su'?2965:n.profession==='nong_dan'?2670:n.faction==='Thanh Vân Tông'?650:1450,y:n.profession==='ho_ve'?960:n.profession==='thuong_nhan'?740:n.profession==='tho_re'?1130:n.profession==='duoc_su'?700:n.profession==='nong_dan'?1270:n.faction==='Thanh Vân Tông'?720:900};if(!n.schedule||n.schedule.length<7)n.schedule=daySchedule(n.profession)}
  if(!s.factions?.length)s.factions=createFactions(save.npcs);if(!s.settlement?.id)s.settlement=createSettlement();if(!s.shops?.length)s.shops=createShops();s.economy??={remainderMinutes:0,transactions:[]};
  const ids=new Set(save.npcs.map(n=>n.id));for(const org of s.factions){org.memberIds=org.memberIds.filter(id=>ids.has(id));org.reputation??=org.type==='sect'?58:50;org.power??=org.memberIds.length*12;org.territory??=[org.areaId];if(!Object.keys(org.relations??{}).length)org.relations=createFactions(save.npcs).find(f=>f.id===org.id)?.relations??{}}
  return save;
}
export function traitsFor(n:SimNPC):Record<string,number>{const base:Record<string,number>={thamLam:35,canDam:40,trungThanh:55,thamVong:40,nhanTu:50,hungHan:25,hamHoc:45,giaoTiep:45};if(n.personality==='tham vọng')base.thamVong+=30;if(n.personality==='cô độc')base.giaoTiep-=24;if(n.personality==='nhân hậu')base.nhanTu+=28;if(n.personality==='cẩn trọng')base.canDam-=12;if(n.profession==='ho_ve')base.canDam+=25;if(n.profession==='thuong_nhan')base.thamLam+=18;const seed=[...n.id].reduce((a,c)=>a+c.charCodeAt(0),0);for(const k of Object.keys(base))base[k]=Math.max(0,Math.min(100,base[k]+((seed+k.length*7)%15)-7));return base}
export function daySchedule(profession:SimNPC['profession']):{hour:number;action:NPCAction}[]{const work:NPCAction=profession==='tu_si'?'cultivate':profession==='nong_dan'?'farm':profession==='ho_ve'?'patrol':profession==='thuong_nhan'?'trade':profession==='tho_re'||profession==='duoc_su'||profession==='dan_su'?'work':'socialize';const hours: {hour:number;action:NPCAction}[]=profession==='tu_si'?[{hour:0,action:'cultivate'},{hour:6,action:'eat'},{hour:7,action:'cultivate'},{hour:12,action:'rest'},{hour:13,action:'cultivate'},{hour:18,action:'socialize'},{hour:21,action:'rest'}]:profession==='ho_ve'?[{hour:0,action:'patrol'},{hour:6,action:'rest'},{hour:8,action:'patrol'},{hour:12,action:'eat'},{hour:13,action:'patrol'},{hour:20,action:'patrol'}]:[{hour:0,action:'rest'},{hour:6,action:'eat'},{hour:8,action:work},{hour:12,action:'eat'},{hour:13,action:work},{hour:18,action:'socialize'},{hour:20,action:'rest'}];return hours}
export function factionFor(n:SimNPC){return n.profession==='ho_ve'?'qingyun-city':n.profession==='thuong_nhan'?'qingyun-traders':['dan_thuong','nong_dan'].includes(n.profession)?'qingyun-village':'qingyun-sect'}
