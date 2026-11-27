import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
  export * from './src/systems/RealmConfig.ts';
  export * from './src/systems/CombatBalance.ts';
  export * from './src/systems/CultivationSystem.ts';
  export * from './src/dao/MartialProgress.ts';
  export * from './src/dao/MartialRegistry.ts';
  export * from './src/dao/MonsterRegistry.ts';
  export * from './src/dao/CombatBalanceMigration.ts';
  export * from './src/dao/DivinePowerLedger.ts';
`},bundle:true,write:false,platform:'node',format:'esm'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const actor=(realmIndex,realmLevel)=>({id:'test',alive:true,realmIndex,realmLevel,spiritualRoot:'none',
  technique:'qingyun',techniqueMastery:{qingyun:1},talent:50,inventory:[],hp:100,mp:60,lifespan:120});
const table=[];
for(let r=0;r<9;r++){
  for(let level=1;level<=10;level++){
    const a=actor(r,level),base=m.realmBase(a),factor=4**r*(1+.25*(level-1));
    assert.deepEqual([base.hp,base.attack,base.defense,base.qi],[100,20,10,100].map(value=>value*factor));
    assert.equal(base.position.total,r*10+level);
    table.push([base.position.total,base.position.realm.name,level,base.position.stage,base.hp,base.attack,base.defense,base.qi,base.position.realm.lifespan]);
    assert.equal(Math.ceil(base.hp/m.resolveDamage(base.attack,base.defense,a,a).damage),8);
  }
}
assert.equal(m.realmBase(actor(-1,0)).position,null);
assert.deepEqual(table.at(-1).slice(4,7),[21299200,4259840,2129920]);
const cases=[
  [0,1,0,1,8],[0,10,1,1,10],[0,10,2,1,86],[0,1,2,1,720],[2,1,0,1,1],
  [2,1,3,1,60],[3,1,4,1,60],[8,10,8,10,8],
].map(([r,l,s,k,expected])=>{
  const a=actor(r,l),b=actor(s,k),source=m.realmBase(a),target=m.realmBase(b);
  const before=m.resolveDamage(source.attack,target.defense,a,b,{suppress:false});
  const after=m.resolveDamage(source.attack,target.defense,a,b);
  const hits=x=>Math.ceil(target.hp/x.damage-1e-9);
  assert.equal(hits(before),expected);
  return {a:source.position.total,b:target.position.total,hp:target.hp,preSuppression:before.damage,
    suppression:after.realmFactor,damage:after.damage,hitsWithoutSuppression:hits(before),hits:hits(after)};
});
assert.equal(m.resolveDamage(0,100,{},{}).damage,0);
assert.equal(m.resolveDamage(NaN,100,{},{}).damage,0);
assert.equal(m.resolveDamage(20,-1,{},{}).damage,20);
assert.ok(Math.abs(m.resolveDamage(20,10,{},{},{shield:.5,resistance:.5}).damage-20/6)<1e-9);
assert.equal(m.gradePotential(0,4),.01);
assert.equal(m.gradePotential(4,4),1);
assert.equal(m.combatTalent({talent:100}).multiplier,3);
const normal=actor(0,10),gift=actor(0,10);
gift.equippedWeapon='void_jian';gift.inventory=[{itemId:gift.equippedWeapon,count:1}];
assert.ok(Math.abs(m.cultivationStats(gift).attack/m.cultivationStats(normal).attack-1.0085)<1e-8);
const upper=actor(3,5);
for(const skill of Object.values(m.MARTIAL_SKILLS)){
  const index=m.martialRequiredRealm(skill);
  const caster=actor(index,10);
  caster.spiritualRoot=m.MARTIAL_TECHNIQUES[skill.course].roots[0];
  caster.martial={active:skill.course,learned:{[skill.course]:800},ready:{}};
  caster.mp=m.cultivationStats(caster).mpMax;
  assert.equal(m.martialCastCheck(caster,skill,0),'',skill.id);
  assert.ok(m.martialCastCheck({...caster,mp:0},skill,0),skill.id);
  if(index>0)assert.ok(m.martialCastCheck({...caster,realmIndex:index-1},skill,0),skill.id);
  const budget=m.martialPower(caster,skill,m.cultivationStats(caster).attack);
  for(const count of [skill.hits,25,150]){
    const pulse=m.attackBudget(budget,count);
    assert.ok(Math.abs(pulse*count-budget)<1e-6,skill.id);
  }
}
assert.equal(m.martialRequiredRealm(m.MARTIAL_SKILLS['hundred-swords']),2);
assert.equal(m.martialRequiredRealm(m.MARTIAL_SKILLS['heaven-wrath']),4);
const normalBeast={...actor(2,1),species:'wolf',rank:'normal',maxHp:176,hp:88,qi:50};
const elite={...normalBeast,rank:'elite'},king={...normalBeast,qualityTier:5};
assert.equal(m.faunaStats(king).hpMax/m.faunaStats(normalBeast).hpMax,2.5);
assert.equal(m.faunaStats(elite).attack/m.faunaStats(normalBeast).attack,1.3);
const old=actor(2,9),oldStats=m.legacyVitals(old);
old.hp=oldStats.hpMax*.5;old.mp=oldStats.mpMax*.3;old.xp=75;
const dead={...old,id:'dead',alive:false,hp:0};
const world={npcs:[old,dead],environment:{fauna:[normalBeast]},heaven:{divinePower:543},clock:{day:1,minute:1}};
assert.equal(m.migrateCombatBalance(world),true);
assert.equal(m.migrateCombatBalance(world),false);
const next=m.cultivationStats(old);
assert.equal(old.realmLevel,9);assert.equal(old.xp,75);assert.equal(old.hp/next.hpMax,.5);
assert.ok(Math.abs(old.mp/next.mpMax-.3)<1e-8);assert.equal(dead.hp,0);
assert.equal(normalBeast.hp/normalBeast.maxHp,.5);
assert.equal(world.heaven.divinePower,543);
assert.ok(m.creditDeath(world,{...actor(8,10),name:'Độ Kiếp'},'npc-death','Fixture'));
assert.equal(world.heaven.divinePower,723);
assert.ok(m.creditBreakthrough(world,{...upper,name:'Nguyên Anh'},actor(3,4)));
assert.equal(world.heaven.divinePower,727);
if(process.argv.includes('--report')){
  const directory=resolve('art/previews/cuu-canh-thien-uy');
  await mkdir(directory,{recursive:true});
  await writeFile(resolve(directory,'90-cap.csv'),'cap,canh_gioi,tang,giai_doan,hp,attack,defense,qi,tho_nguyen\n'+table.map(row=>row.join(',')).join('\n')+'\n');
  await writeFile(resolve(directory,'combat-matrix.json'),JSON.stringify(cases,null,2)+'\n');
}
console.log('Cửu Cảnh: 90 cấp, 8 cặp đối đầu, 45 khóa kỹ năng, ngân sách impact, thiên phú, phẩm chất, migration và Thần lực.');
