import {MARTIAL_B,MARTIAL_TECHNIQUES,MARTIAL_WEAPONS} from '../dao/MartialRegistry.ts';
import {activateMartial,learnMartial,martialMastery,practiceMartial} from '../dao/MartialProgress.ts';
import {EconomySystem as Economy} from '../dao/EconomySystem.ts';
import {weaponForNpc,weaponChoices,setNpcWeapon} from './WeaponCombat.js';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const lessons=['qingyun-flight','green-life','purple-sword'];
const inheritance=[
  {species:'wood-king',courses:['myriad-sword','void-sword']},
  {species:'eagle',courses:['nine-skies','chaos-thunder']},
  {species:'bone-general',courses:['soul-eater','ice-heart']},
  {species:'sand-golem',courses:['burning-dragon','golden-crow']},
];
const manualByItem=Object.fromEntries(Object.values(MARTIAL_TECHNIQUES).map(c=>[c.book,c]));
const compatible=(n,c)=>c.roots.includes(n.spiritualRoot);
const wealthFloor=n=>n.hunger>62||n.fatigue>77?30:Economy.count(n.inventory,'ration')?6:12;
const stores={
  'city-forge':{label:'Binh Khí Phô',limit:6,accept:arm=>arm?.grade<=1},
  'city-market':{label:'Vạn Pháp Thư Các',limit:5,accept:(_arm,book)=>book?.grade<=2},
  'sect-treasure-pavilion':{label:'Linh Bảo Các',limit:4,accept:arm=>arm?.grade>=1&&arm.grade<=2},
};
export const martialShopLabel=id=>stores[id]?.label;
export function martialStockOpen(shop,id,count=1){
  const arm=MARTIAL_WEAPONS[id], book=manualByItem[id], store=stores[shop.id];
  if(!arm&&!book)return true;
  if(!store?.accept(arm,book))return false;
  const held=shop.stock.filter(row=>store.accept(MARTIAL_WEAPONS[row.itemId],manualByItem[row.itemId])).reduce((sum,row)=>sum+row.count,0);
  return held+count<=store.limit;
}

export function learnFromManual(npc,itemId){
  const course=manualByItem[itemId];
  if(!course||!npc.alive||npc.ascended||npc.minor||martialMastery(npc,course.id)>=0||
    !Economy.count(npc.inventory,itemId)||!learnMartial(npc,course.id))return false;
  Economy.remove(npc.inventory,itemId,1);
  practiceMartial(npc,8,course.id);
  return true;
}

export function priceMartial(world,itemId,stock=3){
  const item=manualByItem[itemId]??MARTIAL_WEAPONS[itemId];
  if(!item)return 0;
  const demand=stock<2?1.12:stock>5?.88:1;
  return Math.ceil(item.price*(world?.martialPriceBasis??MARTIAL_B)*demand);
}

export function craftMartial(npc,id,rareRecipe){
  const weapon=MARTIAL_WEAPONS[id];
  const ingredients=weapon?.crafting??rareRecipe;
  if(!weapon||!ingredients||!npc.alive||npc.ascended||npc.realmIndex<weapon.minRealm||npc.minor||
    weapon.grade>=2&&npc.vocation!=='smith'&&npc.profession!=='tho_re'||
    ingredients.some(({item,count})=>Economy.count(npc.inventory,item)<count))return false;
  for(const {item,count} of ingredients)Economy.remove(npc.inventory,item,count);
  Economy.add(npc.inventory,id,1);
  return true;
}

export class MartialEconomy {
  constructor(scene){
    this.scene=scene;this.world=scene.populationWorld;
    this.lessons=lessons;
    this.sources=this.world.martialSources??={issued:{},forgeDay:{},study:{},seeded:false};
    this.auctions=this.sources.auctions??=[];
    if(!this.sources.seeded){
      this.seedVendors();
      this.sources.seeded=true;
      scene.requestBackgroundSave();
    }
    this.stockHour=-1;
  }
  seedVendors(){
    const shops=this.world.shops;
    for(const spec of Object.values(MARTIAL_TECHNIQUES).filter(c=>c.grade<=1)){
      const shopId=spec.source==='Tàng Kinh Các'?'sect-treasure-pavilion':spec.source==='Thiết Mộc Các'?'city-forge':'city-market';
      const shop=shops.find(s=>s.id===shopId)??shops.find(s=>s.id==='city-market');
      if(shop)Economy.add(shop.stock,spec.book,spec.grade===0?4:2);
    }
    const forge=shops.find(s=>s.id==='city-forge');
    if(forge)for(const w of Object.values(MARTIAL_WEAPONS).filter(w=>w.grade===0))Economy.add(forge.stock,w.id,1);
    this.updatePrices();
  }
  updatePrices(){
    for(const shop of this.world.shops){
      const store=stores[shop.id];
      if(!store)continue;
      const current=shop.stock.map(row=>row.itemId).filter(id=>(manualByItem[id]??MARTIAL_WEAPONS[id])?.grade<=2);
      const incoming=[...Object.values(MARTIAL_TECHNIQUES).filter(book=>store.accept(null,book)).map(book=>book.book),
        ...Object.values(MARTIAL_WEAPONS).filter(arm=>store.accept(arm)).map(arm=>arm.id)];
      const items=new Set([...current,...incoming]);
      for(const id of items){
        const ask=priceMartial(this.world,id,Economy.count(shop.stock,id));
        shop.sellPrices[id]=ask;
        if(incoming.includes(id))shop.buyPrices[id]=Math.max(1,Math.floor(ask*.62));
      }
    }
  }
  note(n,type,text,data){
    const {day,minute}=this.world.clock;
    this.world.events.push({id:`martial-${type}:${n.id}:${day}:${minute}:${data?.item??''}`,type:'martial-'+type,actorId:n.id,
      day,minute,description:text,status:'completed',data});
    if(this.world.events.length>400)this.world.events.shift();
    this.scene.requestBackgroundSave();
  }
  learn(n,itemId){
    const instance=n.inventory.find(stack=>stack.itemId===itemId)?.itemInstances?.[0]?.id;
    if(!learnFromManual(n,itemId))return false;
    const row=instance&&this.world.heaven.shopLedger?.find(item=>item.instanceId===instance);
    if(row){
      const at=this.world.clock.day*1440+this.world.clock.minute;
      row.owner='consumed';row.consumedAt=at;
      (row.history??=[]).push({owner:'consumed',at,reason:'learned'});
    }
    this.note(n,'learn',n.name+' lĩnh ngộ '+manualByItem[itemId].name+'.',{item:itemId});
    return true;
  }
  courseScore(n,c){
    const ambition=n.aiProfile?.axes?.ambition??50,caution=n.aiProfile?.axes?.caution??50;
    return c.grade*11+Number(compatible(n,c))*23+Number(weaponForNpc(n)?.course===c.id)*28+
      (ambition-caution)*.08*c.grade+Number(n.populationRole==='hunter'&&c.skills.some(s=>s.effect==='interrupt'))*8+
      (n.personalGoal?.id==='cultivation'?c.rate*10:0)+(c.category==='Hồi phục'&&n.vocation==='physician'?25:0);
  }
  intent(n){
    if(n.minor||n.ascended||n.underground||n.hunger>62||n.fatigue>74||
      !['tu_si','ho_ve'].includes(n.profession)&&!['physician','smith'].includes(n.vocation))return null;
    const have=n.martial&&Object.keys(n.martial.learned).length;
    const balance=n.spiritStones-wealthFloor(n);
    const current=MARTIAL_TECHNIQUES[n.martial?.active];
    if(n.vocation!=='smith'&&(!have||balance>=32)){
      const options=[];
      for(const venue of this.scene.merchants.shops.values()){
        for(const stock of venue.shop.stock){
          const c=manualByItem[stock.itemId], price=venue.shop.sellPrices[stock.itemId];
          if(!c||stock.count<=0||!(price>0)||price>balance||martialMastery(n,c.id)>=0||
            Economy.count(n.inventory,c.book)||n.realmIndex<c.minimum)continue;
          if(current&&this.courseScore(n,c)<this.courseScore(n,current)+10)continue;
          options.push({c,shop:venue.shop.id,score:this.courseScore(n,c)-price*.12});
        }
      }
      const offer=options.sort((a,b)=>b.score-a.score)[0];
      if(offer)return {side:'buy',itemId:offer.c.book,count:1,preferred:offer.shop,onlyPreferred:true};
    }
    const weapon=weaponForNpc(n);
    for(const id of ['city-forge','sect-treasure-pavilion']){
      const shop=this.scene.merchants.shops.get(id)?.shop;
      if(!shop||shop.ownerId===n.id)continue;
      const wanted=current&&Object.values(MARTIAL_WEAPONS).find(w=>w.course===current.id&&w.id!==weapon?.id&&
        n.realmIndex>=w.minRealm&&shop.sellPrices[w.id]<=balance&&Economy.count(shop.stock,w.id)>0&&!Economy.count(n.inventory,w.id));
      if(wanted)return {side:'buy',itemId:wanted.id,count:1,preferred:id,onlyPreferred:true};
      const surplus=Object.values(MARTIAL_WEAPONS).find(w=>w.grade<=2&&w.id!==weapon?.id&&
        w.course!==current?.id&&Economy.sellable(this.world,n,w.id)>0&&shop.cash>=shop.buyPrices[w.id]&&martialStockOpen(shop,w.id));
      if(surplus)return {side:'sell',itemId:surplus.id,count:1,preferred:id,onlyPreferred:true};
    }
    return null;
  }
  library(n,id){
    const campus=this.scene.sectCampus, course=MARTIAL_TECHNIQUES[id];
    if(!lessons.includes(id)||!campus.atLibrary(n)||n.realmIndex<course.minimum)return false;
    const cost=course.grade===2?12:4, credits=campus.state.credits;
    if(martialMastery(n,id)<0){
      if((credits[n.id]??0)<cost||!learnMartial(n,id))return false;
      credits[n.id]-=cost;
      this.note(n,'library',n.name+' học '+course.name+' tại Tàng Kinh Các.',{item:course.book});
    }else{
      const key=n.id+':'+id, day=this.world.clock.day;
      if(this.sources.study[key]===day)return false;
      this.sources.study[key]=day;
      practiceMartial(n,38,id);
      this.scene.requestBackgroundSave();
    }
    return true;
  }
  atForge(n){
    const scene=this.scene, market=scene.markers.find(m=>m.id==='forge-entrance');
    const campus=scene.sectCampus.site('forge');
    return [market,campus].some(p=>p&&distance(n,p)<=75&&scene.clearCombatLine(n,p));
  }
  canForgeRare(n,weapon){
    return weapon.grade>=3&&!this.sources.issued[weapon.id]&&!this.sources.issued[weapon.course]&&
      n.realmIndex>=weapon.recommended&&Object.keys(n.martial?.learned??{}).some(id=>
        MARTIAL_TECHNIQUES[id]?.grade>=weapon.grade-1&&martialMastery(n,id)>=3);
  }
  forge(n,id,automatic=false){
    const w=MARTIAL_WEAPONS[id];
    const day=this.world.clock.day;
    const rare=w&&this.canForgeRare(n,w)?w.materials.map(item=>({item,count:1})):undefined;
    if(!this.atForge(n)||!w||n.action!=='work'&&automatic||
      automatic&&this.sources.forgeDay[n.id]===day||!craftMartial(n,id,rare))return false;
    this.sources.forgeDay[n.id]=day;
    if(w.grade>=3)this.sources.issued[id]={recipient:n.id,day,source:'forge'};
    const shop=automatic&&w.grade<3&&this.world.shops.find(s=>s.ownerId===n.id&&martialStockOpen(s,id));
    if(shop&&Economy.transferItem(n.inventory,shop.stock,id,1,n.id,shop.id,n))this.updatePrices();
    this.note(n,'forged',n.name+' dùng nguyên liệu thật để rèn '+w.name+'.',{item:id});
    return true;
  }
  reward(beast,recipient){
    const encounter=inheritance.find(group=>group.species===beast.species);
    if(!encounter||!recipient?.alive||beast.rank!=='elite'&&beast.species!=='wood-king'&&beast.species!=='bone-general')return;
    for(const id of encounter.courses){
      const c=MARTIAL_TECHNIQUES[id];
      if(this.sources.issued[id]||recipient.realmIndex<c.minimum)continue;
      const weapon=Object.values(MARTIAL_WEAPONS).find(w=>w.course===id&&w.grade>=2);
      this.sources.issued[id]={recipient:recipient.id,beast:beast.id,day:this.world.clock.day};
      Economy.add(recipient.inventory,c.book,1);
      if(weapon&&!this.sources.issued[weapon.id]){
        Economy.add(recipient.inventory,weapon.id,1);
        this.sources.issued[weapon.id]={recipient:recipient.id,beast:beast.id,day:this.world.clock.day};
        this.note(recipient,'inheritance',recipient.name+' nhận '+weapon.name+' sau khi hạ yêu thú trấn giữ.',{item:weapon.id});
      }
      this.note(recipient,'inheritance',recipient.name+' nhận truyền thừa '+c.name+' sau khi hạ yêu thú trấn giữ.',{item:c.book});
      break;
    }
  }
  missionReward(npc,order){
    const book=MARTIAL_TECHNIQUES['eight-spear'];
    const key='sect-hunt:'+npc.id;
    if(order.type!=='hunt'||order.merit<5||this.sources.issued[key]||
      martialMastery(npc,book.id)>=0||Economy.count(npc.inventory,book.book))return;
    this.sources.issued[key]={recipient:npc.id,day:this.world.clock.day,order:order.id};
    Economy.add(npc.inventory,book.book,1);
    this.note(npc,'mission',npc.name+' nhận '+book.name+' sau ủy thác săn yêu thú.',{item:book.book});
  }
  mentorLesson(npc){
    if(!npc.mentorId||npc.action!=='socialize'&&npc.action!=='cultivate')return;
    const teacher=this.scene.scheduler.byId.get(npc.mentorId)?.npc;
    if(!teacher?.alive||teacher.tribulation||teacher.flight||distance(teacher,npc)>80||
      !this.scene.clearCombatLine(teacher,npc))return;
    const course=Object.keys(teacher.martial?.learned??{}).map(id=>MARTIAL_TECHNIQUES[id]).find(c=>c&&c.grade<=2&&
      npc.realmIndex>=c.minimum&&compatible(npc,c)&&martialMastery(teacher,c.id)>=2&&martialMastery(npc,c.id)<0&&
      (c.grade===0||(npc.relationships[teacher.id]??0)>=40));
    if(course&&learnMartial(npc,course.id))this.note(npc,'mentor',npc.name+' được '+teacher.name+' truyền dạy '+course.name+'.',{item:course.book,teacher:teacher.id});
  }
  atAuction(npc){
    const venue=this.scene.merchants.shops.get('city-market');
    return this.scene.merchants.canTrade(npc,venue);
  }
  canListAuction(npc,itemId){
    const product=MARTIAL_WEAPONS[itemId]??manualByItem[itemId];
    return product?.grade>=2&&this.auctions.length<6&&!this.auctions.some(row=>row.seller===npc.id)&&
      Economy.sellable(this.world,npc,itemId)>0&&this.atAuction(npc);
  }
  listAuction(npc,itemId){
    if(!this.canListAuction(npc,itemId))return false;
    const opened=this.world.clock.day*1440+this.world.clock.minute;
    this.auctions.push({id:'auction:'+npc.id+':'+opened,seller:npc.id,itemId,expires:opened+1440,
      ask:priceMartial(this.world,itemId,3),bids:[]});
    this.note(npc,'auction-list',npc.name+' đăng một món để đấu giá ở Phường Thị.',{item:itemId});
    return true;
  }
  auctionAsk(row){
    return row.bids[0]?row.bids[0].price+Math.max(1,Math.floor(row.ask*.02)):row.ask;
  }
  bidAuction(npc,row){
    const price=this.auctionAsk(row);
    if(!this.auctions.includes(row)||row.seller===npc.id||row.bids[0]?.buyer===npc.id||
      npc.spiritStones-wealthFloor(npc)<price||!this.atAuction(npc)||
      row.expires<=this.world.clock.day*1440+this.world.clock.minute)return false;
    row.bids=[{buyer:npc.id,price},...row.bids.filter(bid=>bid.buyer!==npc.id)].slice(0,8);
    this.scene.requestBackgroundSave();
    return true;
  }
  auctionTick(now){
    for(let index=this.auctions.length-1;index>=0;index--){
      const row=this.auctions[index],seller=this.scene.scheduler.byId.get(row.seller)?.npc;
      const saleable=seller?.alive&&Economy.sellable(this.world,seller,row.itemId)>0;
      if(saleable&&now<row.expires)continue;
      this.auctions.splice(index,1);
      if(!saleable)continue;
      for(const bid of row.bids){
        const buyer=this.scene.scheduler.byId.get(bid.buyer)?.npc;
        if(!buyer?.alive||buyer.ascended||buyer.spiritStones-wealthFloor(buyer)<bid.price)continue;
        const result=Economy.directTrade(this.world,buyer,seller,row.itemId,1,bid.price);
        if(result.ok){
          this.note(buyer,'auction-sale',buyer.name+' thắng đấu giá với '+bid.price+' linh thạch.',{item:row.itemId,seller:row.seller});
          break;
        }
      }
      this.scene.requestBackgroundSave();
    }
  }
  tick(){
    const year=this.world.clock.day*1440+this.world.clock.minute;
    if(this.auctions.length)this.auctionTick(year);
    if(Math.floor(year/60)!==this.stockHour){this.stockHour=Math.floor(year/60);this.updatePrices();}
    for(const [i,n] of this.world.npcs.entries()){
      if((year+i*3)%19||!n.alive||n.minor||n.underground||n.flight||n.tribulation||n.id===this.scene.possessedNpcId)continue;
      for(const stack of n.inventory)if(manualByItem[stack.itemId]&&
        !this.auctions.some(row=>row.seller===n.id&&row.itemId===stack.itemId)&&this.learn(n,stack.itemId))break;
      this.mentorLesson(n);
      if(this.auctions.length&&n.profession==='tu_si'&&n.spiritStones>=this.auctions[0].ask){
        const offer=this.auctions.find(row=>{
          const book=manualByItem[row.itemId], arm=MARTIAL_WEAPONS[row.itemId];
          return row.seller!==n.id&&!Economy.count(n.inventory,row.itemId)&&(book?
            n.realmIndex>=book.minimum&&compatible(n,book)&&martialMastery(n,book.id)<0:
            n.realmIndex>=arm.minRealm&&n.martial?.active===arm.course);
        });
        if(offer)this.bidAuction(n,offer);
      }
      if(n.decisionSlot?.endsWith(':library')&&n.action!=='travel'){
        const next=lessons.find(id=>martialMastery(n,id)<0&&compatible(n,MARTIAL_TECHNIQUES[id]));
        if(next)this.library(n,next);
        else if(n.martial)this.library(n,n.martial.active);
      }
      if(n.martial&&!this.scene.martialCombat.casts.has(n.id)&&n.action!=='fight'){
        const current=MARTIAL_TECHNIQUES[n.martial.active];
        const options=Object.keys(n.martial.learned).map(id=>MARTIAL_TECHNIQUES[id]).filter(c=>c&&c.minimum<=n.realmIndex);
        const best=options.sort((a,b)=>this.courseScore(n,b)-this.courseScore(n,a))[0];
        if(best&&best!==current&&(!current||this.courseScore(n,best)>=this.courseScore(n,current)+8))activateMartial(n,best.id);
        const scored=w=>Number(w.course===n.martial.active)*12+(w.grade??0)*4+(w.attack??0)*.3;
        const equipped=weaponForNpc(n), preferred=weaponChoices(n).sort((a,b)=>scored(b)-scored(a))[0];
        if(preferred&&preferred.id!==equipped?.id&&(!equipped||scored(preferred)>scored(equipped))){
          setNpcWeapon(n,preferred.id);this.scene.requestBackgroundSave();
        }
        if(n.action==='cultivate')practiceMartial(n,7);
        if(n.action==='socialize'&&Object.keys(n.relationships).some(id=>(n.relationships[id]??0)>=30))practiceMartial(n,1.5);
      }
      if(n.vocation==='smith'&&n.action==='work'){
        const items=Object.values(MARTIAL_WEAPONS);
        const item=items.find(w=>this.canForgeRare(n,w)&&w.materials.every(id=>Economy.count(n.inventory,id)>0))??
          items.find(w=>w.crafting?.every(({item,count})=>Economy.count(n.inventory,item)>=count));
        if(item)this.forge(n,item.id,true);
      }
    }
  }
}
