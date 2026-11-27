import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {build} from 'esbuild';
import {PNG} from 'pngjs';

const {outputFiles}=await build({
  stdin:{resolveDir:process.cwd(),contents:`
    export * from './src/dao/MartialRegistry.ts';
    export * from './src/dao/MartialProgress.ts';
    export * from './src/dao/ItemCatalog.ts';
    export * from './src/dao/WeaponInstances.ts';
    export * from './src/dao/EconomySystem.ts';
    export {craftMartial,learnFromManual,priceMartial} from './src/world/MartialEconomy.js';
  `},
  bundle:true,write:false,platform:'node',format:'esm',
});
const {
  GRADES,MASTERY_XP,MARTIAL_TECHNIQUES,MARTIAL_SKILLS,MARTIAL_WEAPONS,MARTIAL_B,ITEM_CATALOG,
  itemIcon,learnFromManual,martialMastery,martialCastCheck,martialResonance,martialPower,
  activateMartial,wearMartialWeapon,craftMartial,priceMartial,ensureWeaponStack,equippedInstance,EconomySystem,
}=await import('data:text/javascript;base64,'+Buffer.from(outputFiles[0].contents).toString('base64'));
const books=Object.values(MARTIAL_TECHNIQUES),weapons=Object.values(MARTIAL_WEAPONS);
assert.equal(books.length,15);
assert.equal(weapons.length,15);
assert.equal(Object.keys(MARTIAL_SKILLS).length,45);
assert.equal(new Set(Object.values(MARTIAL_SKILLS).map(skill=>skill.vfx)).size,45);
const frames=PNG.sync.read(readFileSync('public/assets/items/martial-arms.png'));
const icons=PNG.sync.read(readFileSync('public/assets/items/inventory-icons.png'));
assert.equal(frames.width,15*24);
assert.equal(frames.height,32);
const armPixels=new Set(),inventoryPixels=new Set();
function pixels(png,x,y,w,h){
  const result=[];
  for(let row=0;row<h;row++)for(let column=0;column<w;column++)result.push(png.data[(png.width*(row+y)+column+x)*4+3]);
  assert.ok(result.includes(0)&&result.includes(255));
  return result.join(',');
}
for(const spec of [...books,...weapons]){
  const id=spec.book??spec.id;
  assert.ok(ITEM_CATALOG[id],id);
  const [x,y]=itemIcon(id);
  inventoryPixels.add(pixels(icons,x,y,16,16));
  const [min,max]=(spec.book?[[1,3],[5,12],[20,50],[100,300],[600,1500]]:[[2,5],[8,20],[30,80],[150,450],[1000,3000]])[spec.grade];
  assert.ok(spec.price>=min&&spec.price<=max);
  assert.equal(priceMartial({},id,3),spec.price*MARTIAL_B);
  if(spec.book)assert.equal(spec.skills.length,3);
  else{
    armPixels.add(pixels(frames,spec.icon*24,0,24,32));
    assert.ok(spec.materials.every(material=>ITEM_CATALOG[material]),JSON.stringify(spec.materials.filter(material=>!ITEM_CATALOG[material])));
    assert.equal(Boolean(spec.crafting),spec.grade<3);
  }
}
assert.equal(armPixels.size,15);
// Books may share a cover silhouette. Color and the drawn design must be distinct.
const crops=[...books,...weapons].map(spec=>{
  const [x,y]=itemIcon(spec.book??spec.id);
  const rows=Array.from({length:16},(_,r)=>icons.data.subarray(((y+r)*icons.width+x)*4,((y+r)*icons.width+x+16)*4));
  return Buffer.concat(rows).toString('base64');
});
assert.equal(new Set(crops).size,30);
assert.ok(inventoryPixels.size>=15);
assert.equal(GRADES.length,5);
const npc={id:'fixture',alive:true,realmIndex:0,realmLevel:9,spiritualRoot:'metal',mp:1000,
  inventory:[{itemId:'manual_breeze',count:2},{itemId:'iron_ore',count:1},{itemId:'wood',count:1}]};
assert.equal(learnFromManual(npc,'manual_breeze'),true);
assert.equal(learnFromManual(npc,'manual_breeze'),false);
assert.equal(npc.inventory[0].count,1);
assert.equal(martialMastery(npc,'breeze'),0);
assert.ok(martialCastCheck(npc,MARTIAL_SKILLS['breeze-return'],0));
assert.equal(craftMartial(npc,'steel_jian'),true);
assert.equal(craftMartial(npc,'steel_jian'),false);
npc.equippedWeapon='steel_jian';
npc.martial.learned.breeze=MASTERY_XP[4];
assert.equal(activateMartial(npc,'breeze'),true);
assert.equal(martialResonance(npc),.14);
const move=MARTIAL_SKILLS['breeze-cut'];
assert.equal(martialCastCheck(npc,move,0),'');
assert.ok(martialPower(npc,move,40)>martialPower(npc,move,40,0));
for(let i=0;i<160;i++)wearMartialWeapon(npc);
assert.equal(npc.martialDurability.steel_jian,0);
assert.equal(martialResonance(npc),0);
npc.martial.ready[move.id]=500;
assert.ok(martialCastCheck(npc,move,49));
assert.equal(martialCastCheck(npc,move,500),'');
const loaded=JSON.parse(JSON.stringify(npc));
assert.deepEqual(loaded,npc);
assert.equal(MARTIAL_TECHNIQUES['myriad-sword'].grade,4);
assert.equal(MARTIAL_TECHNIQUES['void-sword'].grade,3);
for(const [grade] of GRADES.entries())assert.equal(books.filter(book=>book.grade===grade).length,3);
const owner={id:'owner',alive:true,equippedWeapon:'steel_jian',inventory:[{itemId:'steel_jian',count:2}],martialDurability:{steel_jian:39},spiritStones:0};
const [worn,spare]=ensureWeaponStack(owner.inventory[0],owner.id,39);
assert.equal(equippedInstance(owner).id,worn.id);
wearMartialWeapon(owner);
assert.equal(worn.durability,38);
assert.equal(spare.durability,100);
const customer={id:'customer',alive:true,inventory:[],spiritStones:50};
const ledger={clock:{day:1,minute:720},economy:{transactions:[]}};
assert.equal(EconomySystem.directTrade(ledger,customer,owner,'steel_jian',1,6).ok,true);
assert.equal(owner.inventory[0].instances[0].id,worn.id);
assert.equal(customer.inventory[0].instances[0].id,spare.id);
assert.deepEqual(customer.inventory[0].instances[0].history,[owner.id,customer.id]);
assert.equal(owner.spiritStones+customer.spiritStones,50);
assert.equal(equippedInstance(JSON.parse(JSON.stringify(owner))).durability,38);
console.log('PASS: 15 martial schools, 45 attack/support profiles, 30 unique inventory icons, 15 hand sprites, valid material and price ranges, irreversible ingredient consumption, mastery, resonance, cooldown and durability.');
