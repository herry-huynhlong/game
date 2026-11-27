import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {AUCTION_LOT,auctionSeats,auctionSite} from '../src/world/BuildingInteriors.js';

const bundle=await build({
  stdin:{contents:`
    export {WeeklyAuction,createAuctionRoom} from './src/world/WeeklyAuction.js';
    export {EconomySystem} from './src/dao/EconomySystem.ts';
    export {caveRoute} from './src/world/UndergroundMaps.js';
    export {buyHeavenItem,giftHeavenItem,migrateHeavenVault,SHOP} from './src/world/HeavenShop.js';
    export {progressionOffers} from './src/world/CommerceCatalog.js';
  `,resolveDir:process.cwd()},
  bundle:true,write:false,platform:'node',format:'esm',loader:{'.css':'empty'},
});
const {WeeklyAuction,EconomySystem,caveRoute,createAuctionRoom,buyHeavenItem,giftHeavenItem,migrateHeavenVault,progressionOffers,SHOP}=
  await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));

assert.equal(Object.keys(progressionOffers).length,30);
assert.ok(Object.values(SHOP).every(offer=>Number.isSafeInteger(offer.divinePowerPrice)&&offer.divinePowerPrice>0));
const {floors}=createAuctionRoom();
const [floor,vip,vault]=floors;
assert.equal(new Set(floors.map(f=>f.id)).size,3);
for(const place of [...auctionSeats,vault.props.find(p=>p.name==='Sổ sách quản sự')]){
  const room=floors[place.floor??2];
  assert.ok(caveRoute(room,room.entry,place)?.length>0,place.name);
}
for(const room of [floor,vip])assert.ok(caveRoute(room,room.entry,room.down)?.length>0);

const city=JSON.parse(await readFile(new URL('../maps/world-rebuild-1b.tmj',import.meta.url),'utf8'));
const layer=name=>city.layers.find(row=>row.name===name);
const roads=layer('Roads').data;
const tiles=({x,y,width,height})=>{
  const values=[];
  for(let row=Math.floor(y/32);row<Math.ceil((y+height)/32);row++)
    for(let column=Math.floor(x/32);column<Math.ceil((x+width)/32);column++)
      values.push(roads[row*city.width+column]);
  return values;
};
// 595–601 are the paved pads of the eastern ward, shared by its courtyards.
const wardPad=new Set([0,595,597,599,601]);
for(const rect of [AUCTION_LOT.visual,AUCTION_LOT.footprint,{x:AUCTION_LOT.waiting.x-10,y:AUCTION_LOT.waiting.y-6,width:20,height:12}])
  assert.ok(tiles(rect).every(id=>wardPad.has(id)),'Hall must stay in its lot off the road network');
const intersect=(r,s)=>r.x< s.x+s.width&&r.x+r.width>s.x&&r.y<s.y+s.height&&r.y+r.height>s.y;
const collision=['Collision','SocietyCollision','RampartStairs'].flatMap(name=>layer(name).objects);
assert.ok(!collision.some(r=>intersect(r,AUCTION_LOT.visual)));
const arterial=new Set([533,535,537]);
for(const o of layer('Buildings').objects)
  assert.ok(tiles({...o,y:o.y-o.height}).every(id=>!arterial.has(id)),o.name+' must leave the main axis clear');
for(const {id,cut} of [{id:3418,cut:12},{id:3437,cut:37}]){
  const o=layer('SocietyArt').objects.find(o=>o.id===id);
  const footprint=layer('SocietyCollision').objects.find(o=>o.id===id+1);
  const visible={x:o.x+5,y:o.y-o.height+cut,width:181,height:124-cut};
  assert.ok([visible,footprint].every(rect=>tiles(rect).every(tile=>!arterial.has(tile))),o.name+' must clear the main axis');
}
const chairs=floor.props.filter(prop=>prop.kind==='seat');
assert.equal(chairs.length,24);
assert.equal(new Set(chairs.map(chair=>chair.x+':'+chair.y)).size,24);
for(const chair of chairs)assert.ok(caveRoute(floor,floor.entry,chair)?.length>0);
const npc=(id,spiritStones)=>({id,spiritStones,name:id,alive:true,inventory:[],x:0,y:0,realmIndex:2});
const world={
  clock:{day:5,minute:480},events:[],shops:[],factions:[],
  npcs:[npc('seller',20),npc('poor',99),npc('buyer',100),npc('rival',180)],
  heaven:{divinePower:700,shopLedger:[{id:'old',itemId:'book_spirit_guard',boughtAt:1,owner:'heaven',price:5}]},
};
migrateHeavenVault(world);
migrateHeavenVault(world);
assert.equal(world.heaven.shopLedger[0].instanceId,'heaven-item:old');
assert.equal(world.heaven.shopLedger[0].divinePowerPrice,5);
const [seller,poor,buyer,rival]=world.npcs;
assert.ok(buyHeavenItem(world,'purple_jian','blade').ok);
const blade=world.heaven.shopLedger.at(-1),id=blade.instanceId;
assert.equal(world.heaven.divinePower,520);
assert.ok(giftHeavenItem(world,'blade',seller).ok);
assert.equal(seller.inventory[0].instances[0].id,id);
assert.equal(seller.spiritStones,20);
assert.equal(blade.cargo,undefined);
seller.inventory[0].instances[0].durability=17;
assert.ok(buyHeavenItem(world,'manual_purple-sword','book').ok);
const book=world.heaven.shopLedger.at(-1);
assert.ok(giftHeavenItem(world,'book',seller).ok);
assert.ok(EconomySystem.transferItem(seller.inventory,rival.inventory,book.itemId,1,seller.id,rival.id));
assert.equal(seller.inventory.some(row=>row.itemId===book.itemId),false);
assert.equal(rival.inventory[0].itemInstances[0].id,book.instanceId);

const makeAuction=(w,state)=>{
  const a=Object.create(WeeklyAuction.prototype);
  Object.assign(a,{world:w,point:{x:0,y:0},state,scene:{
    scheduler:{byId:new Map(w.npcs.map(n=>[n.id,{npc:n}]))},clearCombatLine:()=>true,
    requestBackgroundSave(){},
  }});
  return a;
};
let auction=makeAuction(world,{lots:[],sessions:[],history:[],treasury:0});
assert.equal(auction.qualifiedForSeat(poor),false);
assert.equal(auction.qualifiedForSeat(buyer),true);
assert.equal(auction.consign(seller,'purple_jian',80),true);
assert.equal(auction.consign(seller,'purple_jian',80),false);
const lot=auction.state.lots[0];
assert.equal(lot.instanceId,id);
assert.equal(seller.inventory.length,0);
world.clock={day:7,minute:600};
auction.state.sessions.push({week:0,phase:'bidding',lots:[lot.id],index:0,seats:{buyer:0,rival:24},checked:['buyer','rival']});
buyer.underground={...chairs[0],siteId:'van-bao-auction'};
rival.underground={...auctionSeats[24],siteId:'van-bao-auction'};
assert.equal(auction.permittedFloor(rival,2),false);
assert.equal(auction.permittedFloor(rival,1),true);
const migrationActors=[{id:'old-guest',alive:true,underground:{x:10,y:11,floor:0,siteId:'van-bao-auction',auctionSeated:true}},
  ...['old-at-door','old-at-counter'].map(id=>({id,alive:true,underground:{x:2,y:8,floor:0,siteId:'van-bao-auction'}}))];
const migrated=makeAuction({...world,npcs:migrationActors},{sessions:[{week:0,seats:{'old-guest':0}}]});
migrated.site=auctionSite({x:0,y:0});
migrated.migrateInteriorGuests();
assert.equal(migrationActors[0].underground.auctionSeated,true);
assert.equal(migrationActors[0].underground.x,chairs[0].x);
const locations=migrationActors.map(n=>[n.underground.x,n.underground.y].join(':'));
assert.equal(new Set(locations).size,locations.length);
migrated.migrateInteriorGuests();
assert.deepEqual(migrationActors.map(n=>[n.underground.x,n.underground.y].join(':')),locations);
auction.startLot(auction.session);
assert.ok(auction.bid(buyer));
assert.equal(buyer.spiritStones,20);
assert.ok(auction.bid(rival));
assert.equal(buyer.spiritStones,100);
assert.equal(rival.spiritStones,99);
assert.equal(auction.bid(rival),false);
rival.spiritStones=79;
assert.equal(auction.bid(poor),false);
const saved=JSON.parse(JSON.stringify({world,state:auction.state}));
auction=makeAuction(saved.world,saved.state);
assert.ok(auction.settle(auction.activeLot));
assert.equal(auction.settle(auction.state.lots[0]),false);
assert.equal(auction.state.lots[0].result.price,81);
assert.equal(auction.state.treasury,4);
assert.equal(auction.resolve('seller').spiritStones,97);
const won=auction.resolve('rival').inventory.find(row=>row.itemId==='purple_jian').instances[0];
assert.deepEqual([won.id,won.ownerId,won.durability],[id,'rival',17]);
console.log('Vạn Bảo: 30 catalog entries, 30 reachable seats across two floors, off-road lot, vault migration, unique items, 99/100 threshold, escrow, commission and idempotent reload.');
