import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { PNG } from 'pngjs';
import { GroundOccupancy, groundFootprint } from '../src/world/GroundOccupancy.js';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'monster-v2-'));
try{
  await build({stdin:{contents:"export * from './src/dao/FaunaSystem.ts';export * from './src/dao/MonsterRegistry.ts';export * from './src/dao/MonsterCombat.ts';export * from './src/dao/MonsterConditions.ts';export * from './src/dao/CombatRecovery.ts';export * from './src/dao/FaunaRecovery.ts';",resolveDir:process.cwd()},
    outfile:path.join(tmp,'monster.cjs'),bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
  const m=createRequire(import.meta.url)(path.join(tmp,'monster.cjs'));
  const makeWorld=(worldId='deterministic')=>({worldId,clock:{day:1,minute:600},
    npcs:[{id:'hunter',alive:true,realmIndex:4,realmLevel:1,inventory:[]}],environment:{objects:[],drops:[],processedEventIds:[],defeatedBeastIds:[]}});
  const map=JSON.parse(fs.readFileSync('maps/world-rebuild-1b.tmj','utf8'));
  const layer=name=>map.layers.find(l=>l.name===name);
  const zones=layer('FaunaZones').objects.map(o=>({...o,...Object.fromEntries(o.properties.map(p=>[p.name,p.value]))}));
  for(const raw of layer('FaunaTerritories').objects){
    const h={...raw,...Object.fromEntries(raw.properties.map(p=>[p.name,p.value]))};
    const z=zones.find(z=>z.zoneId===h.zoneId);
    (z.territories??={})[h.species]=h;
  }
  const eastSlots=zones.filter(z=>z.eastWilds).reduce((sum,z)=>sum+z.cap,0);
  assert.equal(eastSlots,41);
  const shanheSlots=zones.filter(z=>z.extraShanhe).reduce((sum,z)=>sum+z.cap,0);
  assert.equal(shanheSlots,42);
  const water=layer('Water').data,solids=layer('Collision').objects,city=layer('RegionMarkers').objects.find(o=>o.properties[0].value==='city');
  const open=(z,x,y,species,rank)=>{
    const {width,height}=groundFootprint({species,rank});
    return !water[Math.floor(y/32)*map.width+Math.floor(x/32)]&&!m.insideHabitat({x,y},city)&&
      !solids.some(r=>x+width/2>r.x&&x-width/2<r.x+r.width&&y+height/2>r.y&&y-height/2<r.y+r.height);
  };
  const world=makeWorld();
  world.environment.fauna=[{id:'fauna:old:deer',species:'deer',alive:true}];
  world.environment.drops=[{id:'already-owned',sourceId:'fauna:old:deer',itemId:'deer_meat',status:'claimed'}];
  world.npcs[0].inventory.push({itemId:'deer_meat',count:2});
  const beasts=m.ensureFauna(world,zones,open);
  assert.equal(beasts.length,77+eastSlots+shanheSlots);
  const western=beasts.filter(b=>b.zoneId.startsWith('west-'));
  assert.equal(western.length,45);
  assert.deepEqual([...new Set(western.map(b=>b.realmIndex))].sort(),[0,1,2,3]);
  assert.equal(beasts.filter(b=>b.zoneId.startsWith('old-road-')&&b.rank==='normal').length,8);
  assert.deepEqual([...new Set(beasts.map(b=>b.species))].sort(),[...m.FAUNA_IDS].sort());
  assert.ok(beasts.every(b=>zones.some(z=>z.zoneId===b.zoneId&&m.insideHabitat(b,z)&&open(z,b.x,b.y,b.species,b.rank))));
  const slotKey=f=>f.species+':'+f.rank;
  assert.ok(western.filter(f=>f.species==='flower').length>=2);
  assert.equal(western.filter(f=>f.zoneId==='west-poison'&&f.species==='flower').length,3);
  for(let seed=0;seed<8;seed++){
    const alternative=m.ensureFauna(makeWorld('west-spread:'+seed),zones,open);
    assert.equal(alternative.filter(b=>!zones.some(z=>z.zoneId===b.zoneId&&(z.eastWilds||z.extraShanhe))).length,77);
    assert.equal(alternative.filter(f=>f.zoneId==='west-poison'&&f.species==='flower').length,3);
  }
  for(const z of zones.filter(z=>z.roster&&!z.eastWilds&&!z.extraShanhe)){
    const original=western.filter(f=>f.zoneId===z.zoneId);
    assert.deepEqual(original.map(slotKey).sort(),m.faunaRoster(z).map(slotKey).sort());
    assert.ok(original.every(f=>m.insideHabitat(f,z.territories[f.species],24)));
    assert.ok(Math.max(...original.map(f=>f.y))-Math.min(...original.map(f=>f.y))>z.height*.65);
    for(const a of original)for(const b of original)
      if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>=100);
    const habitats=Object.values(z.territories);
    for(const a of habitats)for(const b of habitats)if(a!==b)assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
    const after=structuredClone(world),specimen=original[0];
    const killed=m.damageFauna(after,specimen.id,'hunter',specimen.maxHp*4,'west-kill');
    m.queueFaunaRespawn(after,killed.fauna,z.respawnMs);
    assert.equal(m.processFaunaRespawns(after,zones,z.respawnMs-1,open).spawned.length,0);
    assert.equal(slotKey(m.processFaunaRespawns(after,zones,z.respawnMs,open).spawned[0]),slotKey(specimen));
  }
  const forbidden=zones.find(z=>z.zoneId==='west-forbidden');
  const king=western.find(f=>f.species==='wood-king'),eliteTree=western.find(f=>f.zoneId==='west-forbidden'&&f.rank==='elite');
  const summoning=structuredClone(world);
  assert.equal(m.summonWesternTree(summoning,forbidden,king,()=>true),false);
  const sacrifice=m.damageFauna(summoning,eliteTree.id,'hunter',eliteTree.maxHp*4,'fallen-tree');
  m.queueFaunaRespawn(summoning,sacrifice.fauna,forbidden.respawnMs);
  assert.equal(m.summonWesternTree(summoning,forbidden,king,()=>true).species,'millennial');
  assert.equal(summoning.environment.fauna.filter(f=>f.alive).length,77+eastSlots+shanheSlots);
  assert.equal(summoning.environment.faunaRespawns.length,0);
  assert.equal(m.processFaunaRespawns(summoning,zones,forbidden.respawnMs,open).spawned.length,0);
  const oldWest=makeWorld('v0.1.13-fixture');
  const oldSpecies={'west-forbidden':'wolf','west-ancient':'boar','west-poison':'toad','west-inner':'wolf','west-outer':'boar'};
  m.ensureFauna(oldWest,zones.map(z=>z.roster?{...z,spread:false,cap:({'west-forbidden':2,'west-ancient':3,'west-poison':4,'west-inner':4,'west-outer':5})[z.zoneId],territories:undefined,roster:undefined,species:oldSpecies[z.zoneId]}:z),open);
  const idsBefore=oldWest.environment.fauna.map(f=>f.id), npcBefore=structuredClone(oldWest.npcs);
  m.ensureFauna(oldWest,zones,open);
  assert.ok(idsBefore.every(id=>oldWest.environment.fauna.some(f=>f.id===id)));
  assert.deepEqual(oldWest.npcs,npcBefore);
  for(const z of zones.filter(z=>z.roster&&!z.eastWilds&&!z.extraShanhe))assert.deepEqual(oldWest.environment.fauna.filter(f=>f.zoneId===z.zoneId).map(slotKey).sort(),m.faunaRoster(z).map(slotKey).sort());
  assert.equal(world.npcs[0].inventory[0].count,2);
  assert.equal(world.environment.drops[0].id,'already-owned');
  const copy=structuredClone(world);
  m.ensureFauna(copy,zones,open);assert.deepEqual(copy,world,'reload cannot reroll tiers or IDs');
  const pythonSave=structuredClone(world),former=pythonSave.environment.fauna.find(f=>f.species==='eagle');
  const identity={id:former.id,hp:former.hp,maxHp:former.maxHp,home:former.home,rank:former.rank};
  former.species='python';former.cast={skillId:'python-tail'};former.cooldowns={'python-tail':12500};
  pythonSave.npcs[0].inventory=[{itemId:'python_skin',count:2}];
  pythonSave.environment.westTreasures=[{id:'old-thunder',itemId:'thunder_fruit',guardSpecies:'python',zoneId:former.zoneId}];
  pythonSave.environment.monsterHazards=[{id:'old-poison',sourceId:former.id}];
  m.ensureFauna(pythonSave,zones,open);
  assert.deepEqual({id:former.id,hp:former.hp,maxHp:former.maxHp,home:former.home,rank:former.rank},identity);
  assert.equal(former.species,'eagle');assert.equal(former.cast,undefined);
  assert.deepEqual(pythonSave.environment.monsterHazards,[]);
  assert.equal(pythonSave.environment.westTreasures[0].guardSpecies,'eagle');
  assert.deepEqual(pythonSave.npcs[0].inventory,[{itemId:'python_skin',count:2}]);
  const migrated=structuredClone(pythonSave);
  m.ensureFauna(pythonSave,zones,open);
  assert.deepEqual(pythonSave,migrated);
  const legacy=makeWorld();
  const originals=m.ensureFauna(legacy,zones.filter(z=>!z.normalOnly),open).map(b=>b.id);
  m.ensureFauna(legacy,zones,open);
  assert.deepEqual(legacy.environment.fauna.slice(0,24).map(b=>b.id),originals);
  assert.equal(legacy.environment.fauna.length,77+eastSlots+shanheSlots);
  const oldRoadBeast=legacy.environment.fauna[24];
  const outer=m.damageFauna(legacy,oldRoadBeast.id,'hunter',oldRoadBeast.maxHp*4,'old-road-hunt');
  const outerZone=zones.find(z=>z.zoneId===outer.fauna.zoneId);
  m.queueFaunaRespawn(legacy,outer.fauna,outerZone.respawnMs);
  const pending=structuredClone(legacy);
  m.ensureFauna(pending,zones,open);
  assert.equal(pending.environment.fauna.length,77+eastSlots+shanheSlots,'reloading a slain beast does not fill the slot early');
  assert.equal(m.processFaunaRespawns(pending,zones,outerZone.respawnMs-1,open).spawned.length,0);
  const blocked=m.processFaunaRespawns(pending,zones,outerZone.respawnMs,()=>false);
  assert.equal(blocked.failed.length,1);
  assert.equal(m.processFaunaRespawns(pending,zones,outerZone.respawnMs+2500,open).spawned[0].rank,'normal');
  const beast=beasts[0],habitat=zones.find(z=>z.zoneId===beast.zoneId);
  const dead=m.damageFauna(world,beast.id,'hunter',beast.maxHp*4,'first');
  assert.ok(!dead.fauna.alive&&dead.drops.length>=1);
  assert.equal(m.damageFauna(world,beast.id,'hunter',200,'repeat'),null);
  assert.ok(m.claimFaunaDrop(world,dead.drops[0].id,'hunter','claim'));
  assert.equal(m.claimFaunaDrop(world,dead.drops[0].id,'hunter','claim-repeat'),null);
  m.queueFaunaRespawn(world,beast,habitat.respawnMs);
  assert.equal(m.queueFaunaRespawn(world,beast,habitat.respawnMs),null);
  const restored=structuredClone(world);
  assert.equal(m.processFaunaRespawns(restored,zones,habitat.respawnMs-1,open).spawned.length,0);
  assert.equal(m.processFaunaRespawns(restored,zones,habitat.respawnMs,open).spawned.length,1);
  assert.equal(m.processFaunaRespawns(restored,zones,habitat.respawnMs+10,open).spawned.length,0);
  assert.equal(restored.environment.drops.find(d=>d.id===dead.drops[0].id).status,'claimed');
  let elites=0;
  for(let i=0;i<300;i++){
    const sample=makeWorld('tier-sample:'+i);
    m.ensureFauna(sample,[habitat],open);
    const count=sample.environment.fauna.filter(b=>b.rank==='elite').length;assert.ok(count<=1);
    elites+=count;
    if(count){
      const f=sample.environment.fauna.find(b=>b.rank==='elite');
      m.damageFauna(sample,f.id,'hunter',f.maxHp*4,'fixture-kill');
      m.queueFaunaRespawn(sample,f,1000);
      assert.ok(sample.environment.eliteReadyAt[habitat.zoneId]>=100000);
      assert.equal(m.processFaunaRespawns(sample,[habitat],1000,open).spawned[0].rank,'normal');
    }
  }
  assert.ok(elites>=25&&elites<=140,`unexpected elite distribution ${elites}`);

  function fixture(skillId,wall=false){
    const skill=m.MONSTER_SKILLS[skillId],world=makeWorld(skillId),range=skill.mode==='contact'?skill.max-5:skill.mode==='tongue'?skill.max-12:(skill.min+skill.max)/2;
    const f={id:'monster',species:skill.species,rank:skill.elite?'elite':'normal',x:260,y:250,home:{x:260,y:250},hp:87,maxHp:100,
      zoneId:'arena',alive:true,state:'idle',attackReadyAt:0,nextThinkAt:Infinity};
    const target={id:'hunter',x:260+range,y:250,alive:true,hp:500,inventory:[]};
    const z={zoneId:'arena',x:0,y:0,width:620,height:500};
    Object.assign(world.environment,{fauna:[f],monsterProjectiles:[],monsterHazards:[]});
    const open=(x,y,hw=0)=>!wall||x+hw<=302||x-hw>=314;
    const grid=new GroundOccupancy(open);
    grid.sync([target],[f]);
    const hits=[], summons=[];
    const combat=new m.MonsterCombat(world.environment,[z],{
      targets:(p,r)=>Math.hypot(target.x-p.x,target.y-p.y)<=r?[target]:[],
      move:(actor,point,avoid)=>{const position=grid.advance(grid.bodies.get(actor.id),point.x,point.y,avoid);if(position)Object.assign(actor,position);return Boolean(position);},
      open:(actor,point)=>grid.open(grid.bodies.get(actor.id),point.x,point.y),
      line:(a,b)=>!wall||(a.x<=302&&b.x<=302)||(a.x>=314&&b.x>=314),safe:()=>false,
      damage:(_,amount,source,id)=>hits.push({amount,id,source}),avoid:()=>{},threat:()=>false,summon:f=>summons.push(f.id),
    });
    return {combat,world,f,target,skill,grid,hits,summons};
  }
  for(const id of m.MONSTER_SKILL_IDS){
    const {combat,world,f,target,skill,grid,hits,summons}=fixture(id);
    assert.ok(m.startMonsterSkill(f,id,target,0),id);
    for(let now=50;now<=skill.windup+skill.active+skill.recover+3000;now+=50){
      combat.tick(now,50);
      if(now<skill.windup)assert.equal(hits.length,0,id+' telegraph deals no damage');
      assert.equal(grid.overlaps().length,0,id+' no physical overlap');
    }
    assert.equal(f.lastSkill,id);
    if(skill.mode==='roar')assert.ok(f.buffUntil>0);
    else if(skill.mode==='armor')assert.ok(f.armorUntil>0);
    else if(skill.mode==='rage')assert.ok(f.buffUntil>0&&f.hasteUntil>0);
    else if(skill.mode==='haste')assert.ok(f.hasteUntil>0);
    else if(skill.mode==='cleanse')assert.equal(f.injuredUntil,undefined);
    else if(skill.mode==='heal')assert.ok(f.hp>87&&f.healSpent<=25);
    else if(skill.mode==='summon')assert.deepEqual(summons,[f.id]);
    else assert.ok(hits.length>=1,id+' contact/impact');
    if(!['mist','leap','rain'].includes(skill.mode))assert.ok(hits.length<=1,id+' no repeated hit');
    assert.equal(new Set(hits.map(h=>h.id)).size,hits.length);
    assert.ok(JSON.stringify(world.environment).length);
  }
  for(const id of ['charge','skyfall','venom']){
    const {combat,f,target,skill,grid}=fixture(id,true);
    assert.ok(m.startMonsterSkill(f,id,target,0));
    for(let t=50;t<skill.windup+skill.active+skill.recover+400;t+=50)combat.tick(t,50);
    assert.ok(f.x+groundFootprint(f).width/2<=302,id+' never crosses the wall');
    assert.equal(grid.overlaps().length,0);
  }
  {
    const {combat,f,target,hits,skill}=fixture('fang');
    m.startMonsterSkill(f,'fang',target,0);
    combat.tick(skill.windup,50);
    assert.equal(hits.length,1);
    Object.assign(f,JSON.parse(JSON.stringify(f)));
    combat.tick(skill.windup+50,50);
    assert.equal(hits.length,1,'serialized cast cannot apply its contact event again');
  }
  {
    const wolf=(id,x)=>({id,x,y:250,home:{x,y:250},state:'idle',zoneId:'pack',species:'wolf',rank:'normal',hp:68,maxHp:68,alive:true,nextThinkAt:0,attackReadyAt:0});
    const alpha=wolf('alpha',200),follower=wolf('follower',110);
    const visitor={id:'visitor',x:285,y:250,alive:true};
    const env={fauna:[alpha,follower],monsterHazards:[],monsterProjectiles:[]};
    const avoided=[];
    const pack=new m.MonsterCombat(env,[{zoneId:'pack',x:0,y:0,width:620,height:500}],{
      targets:(p,r)=>Math.hypot(p.x-visitor.x,p.y-visitor.y)<=r?[visitor]:[],
      move:()=>true,open:()=>true,line:()=>true,safe:()=>false,damage:()=>{},
      threat:()=>true,avoid:n=>avoided.push(n.id)
    });
    pack.tick(50,50);
    assert.equal(alpha.targetNpcId,'visitor');
    assert.equal(follower.targetNpcId,'visitor','a nearby wolf joins even beyond its own notice radius');
    assert.ok(avoided.length>0,'a vulnerable NPC gets a retreat decision on detection');
  }
  for(const species of ['wood','millennial','flower','vine','centipede','eagle','stag','wood-king']){
    const tree=species==='millennial'||species==='wood-king', rooted=species==='wood-king';
    const beast={id:species,species,rank:'normal',x:260,y:250,home:{x:260,y:250},state:'idle',zoneId:'van-linh',
      hp:200,maxHp:200,alive:true,nextThinkAt:0,attackReadyAt:0};
    if(tree)beast.growth={phase:'dormant',age:1500,qi:100,species};
    const npc={id:'explorer',x:300,y:250,alive:true,realmIndex:2};
    const env={fauna:[beast],monsterHazards:[],monsterProjectiles:[]};
    let retreats=0;
    const combat=new m.MonsterCombat(env,[{zoneId:'van-linh',x:0,y:0,width:620,height:500}],{
      targets:()=>[npc],move:(actor,to)=>{Object.assign(actor,to);return true;},open:()=>true,line:()=>true,
      safe:()=>false,damage:()=>{},threat:()=>true,avoid:()=>retreats++,
    });
    combat.tick(50,50);
    if(tree)assert.equal(beast.state,'awakening');
    if(species==='stag')assert.ok(beast.lastSkill==='stag-haste'&&!beast.targetNpcId);
    if(species==='wood')assert.equal(beast.targetNpcId,undefined,'neutral until provoked');
    for(let t=100;t<=3200;t+=50)combat.tick(t,50);
    if(tree)assert.equal(beast.growth.phase,'active');
    if(rooted)assert.equal(beast.x,260,'ambush stays on its roots');
    if(!['wood','stag'].includes(species))assert.ok(retreats>0&&beast.lastSkill,species+' reacts to a nearby NPC');
  }
  {
    const beast={id:'flower',species:'flower',rank:'normal',x:180,y:140,home:{x:180,y:140},state:'sleep',zoneId:'garden',
      hp:90,maxHp:90,alive:true,attackReadyAt:100000,nextThinkAt:0};
    const visitor={id:'visitor',x:267,y:140,alive:true,mp:60};
    const env={fauna:[beast],monsterHazards:[],monsterProjectiles:[]};
    let present=false,blocked=false,now=0;
    const z={zoneId:'garden',x:0,y:0,width:600,height:440};
    const port={targets:()=>present?[visitor]:[],move:(a,p)=>{Object.assign(a,p);return true;},open:()=>true,line:()=>true,
      safe:()=>false,damage:()=>{},threat:()=>false,avoid:()=>{},movement:{begin(){},halt(){},approach:()=>({x:232,y:140}),
        route(a,p,step,speed){if(blocked)return 'unreachable';const d=Math.hypot(p.x-a.x,p.y-a.y);if(d>0){const t=Math.min(1,step*speed/1000/d);a.x+=(p.x-a.x)*t;a.y+=(p.y-a.y)*t;}return 'moving';}}};
    let combat=new m.MonsterCombat(env,[z],port);
    const run=steps=>{for(let i=0;i<steps;i++){now+=50;combat.tick(now,50);}};
    run(24);assert.equal(beast.flower.phase,'rooted');assert.equal(beast.x,180);
    present=true;run(15);assert.equal(beast.flower.phase,'waking');assert.equal(beast.x,180);
    const saved=JSON.stringify(env);Object.assign(beast,JSON.parse(saved).fauna[0]);
    combat=new m.MonsterCombat(env,[z],port);
    assert.equal(beast.flower.phase,'waking');present=false;run(10);assert.equal(beast.flower.phase,'rooted');
    present=true;run(45);assert.equal(beast.flower.phase,'mobile');assert.ok(beast.x>180);
    present=false;run(46);assert.equal(beast.flower.phase,'rooted');assert.ok(Math.abs(beast.x-180)<8);
    present=true;run(44);blocked=true;run(18);assert.ok(['rooting','returning','rooted'].includes(beast.flower.phase));
    assert.equal(env.fauna.length,1);
    m.applyMonsterCondition(visitor,'root','flower',2000);
    assert.ok(m.monsterRooted(visitor,2100));
    m.applyMonsterCondition(visitor,'root','flower',3300);
    assert.equal(m.monsterRooted(visitor,3350),false,'root cannot chain indefinitely');
    m.applyMonsterCondition(visitor,'drain','flower',2100);assert.equal(visitor.mp,49);
    m.applyMonsterCondition(visitor,'poison','flower',2100);
    let pulses=0;m.tickMonsterConditions(visitor,2900,false,()=>pulses++);
    m.tickMonsterConditions(visitor,3800,true,()=>pulses++);assert.equal(pulses,1);
  }
  for(const species of m.FAUNA_IDS)for(const rank of m.BASE_FAUNA_IDS.includes(species)||species==='millennial'?['normal','elite']:['normal']){
    const base=m.BASE_FAUNA_IDS.includes(species),east=zones.some(z=>z.eastWilds&&z.species===species);
    const folder=base?'fauna/monster-v2':east?'east-wilds':'west-wilds';
    const png=PNG.sync.read(fs.readFileSync(`public/assets/${folder}/${species}-${rank}.png`));
    assert.deepEqual([png.width,png.height],base?[1280,576]:east?[1024,576]:[1792,896]);
    assert.ok(png.data.some((v,i)=>i%4===3&&v>0));
  }
  {
    const source={id:'attacker',alive:true,hp:40},target={id:'target',alive:true,hp:40};
    m.recordCombatDamage(source,target,500);
    assert.deepEqual(source.combatHealth,{lastDealtAt:500});
    assert.deepEqual(target.combatHealth,{lastTakenAt:500,lastAttackerId:'attacker'});
    for(const [mode,rate] of Object.entries(m.RECOVERY.rates)){
      const actor=structuredClone(target);
      m.recoverHealth(actor,100,mode,false,8499,200);
      assert.equal(actor.hp,40);
      m.recoverHealth(actor,100,mode,false,8700,400);
      assert.ok(Math.abs(actor.hp-(40+rate*20))<1e-7,'recovery starts exactly 8 seconds after combat');
      m.recoverHealth(actor,100,mode,true,10000,400);
      assert.equal(actor.combatHealth.lastEngagedAt,10000,'pursuit refreshes combat grace with no new damage');
      const stalled=actor.hp;
      m.recoverHealth(actor,100,mode,false,17999,400);
      m.recoverHealth(actor,100,mode,false,18000,400);
      assert.equal(actor.hp,stalled);
      m.recoverHealth(actor,100,mode,false,300000,282000);
      assert.equal(actor.hp,100);
      actor.alive=false;actor.hp=0;
      m.recoverHealth(actor,100,mode,false,310000,10000);
      assert.equal(actor.hp,0);
    }
  }
  {
    const z={zoneId:'grove',x:0,y:0,width:440,height:420};
    const f={id:'rooted',species:'millennial',home:{x:90,y:90},x:155,y:145,rank:'normal',zoneId:z.zoneId,hp:54,maxHp:130,
      state:'attack',alive:true,growth:{age:1782,qi:79,phase:'active'},cooldowns:{'root-burst':15500}};
    const preserve={hp:f.hp,x:f.x,y:f.y,home:{...f.home},age:f.growth.age,qi:f.growth.qi};
    m.beginFaunaReturn(f,z,125);
    m.updateFaunaReturn(f,z,126,(actor,p)=>p.x!==90,true);
    assert.equal(f.recovery.phase,'restoring');
    assert.equal(f.growth.phase,'active');
    m.updateFaunaReturn(f,z,1060,()=>true);
    assert.equal(f.recovery.phase,'resting');assert.equal(f.growth.phase,'dormant');
    assert.deepEqual({hp:f.hp,x:f.x,y:f.y,home:f.home,age:f.growth.age,qi:f.growth.qi},preserve);
    assert.equal(f.cooldowns['root-burst'],15500);
  }
  {
    const zone={zoneId:'no-sight',x:0,y:0,width:480,height:420};
    const target={id:'npc',x:265,y:160,alive:true,mp:45};
    const flower={id:'flower-los',species:'flower',x:195,y:160,home:{x:195,y:160},hp:60,maxHp:95,rank:'normal',
      alive:true,state:'chase',zoneId:zone.zoneId,targetNpcId:target.id,flower:{phase:'mobile',at:0}};
    const env={fauna:[flower],monsterHazards:[],monsterProjectiles:[]};
    const combat=new m.MonsterCombat(env,[zone],{targets:()=>[target],line:()=>false,open:()=>true,move:()=>true,safe:()=>false,
      damage:()=>assert.fail('a hidden NPC cannot take the attack'),threat:()=>false,avoid:()=>{}});
    assert.ok(m.startMonsterSkill(flower,'flower-root',target,500));
    flower.cast.targetId=target.id;
    const cooldown=flower.cooldowns['flower-root'];
    for(let now=550;now<=2000;now+=50)combat.tick(now,50);
    assert.equal(flower.cast,undefined);
    assert.equal(flower.targetNpcId,undefined);
    for(let now=2050;now<=3800;now+=50)combat.tick(now,50);
    assert.equal(flower.flower.phase,'rooted');
    assert.equal(flower.cooldowns['flower-root'],cooldown);
    assert.equal(flower.hp,60);
  }
  console.log(`Van Linh: 77 slots, West species quotas and clocks, summon cap, v0.1.13 migration, ${elites} legacy elites, ${m.MONSTER_SKILL_IDS.length} timed skills and single-claim loot.`);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
