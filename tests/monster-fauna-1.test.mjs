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
  await build({stdin:{contents:"export * from './src/dao/FaunaSystem.ts';export * from './src/dao/MonsterRegistry.ts';export * from './src/dao/MonsterCombat.ts';",resolveDir:process.cwd()},
    outfile:path.join(tmp,'monster.cjs'),bundle:true,platform:'node',format:'cjs',logLevel:'silent'});
  const m=createRequire(import.meta.url)(path.join(tmp,'monster.cjs'));
  const makeWorld=(worldId='deterministic')=>({worldId,clock:{day:1,minute:600},
    npcs:[{id:'hunter',alive:true,inventory:[]}],environment:{objects:[],drops:[],processedEventIds:[],defeatedBeastIds:[]}});
  const map=JSON.parse(fs.readFileSync('maps/world-rebuild-1b.tmj','utf8'));
  const layer=name=>map.layers.find(l=>l.name===name);
  const zones=layer('FaunaZones').objects.map(o=>({...o,...Object.fromEntries(o.properties.map(p=>[p.name,p.value]))}));
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
  assert.equal(beasts.length,50);
  const western=beasts.filter(b=>b.zoneId.startsWith('west-'));
  assert.equal(western.length,18);
  assert.deepEqual([...new Set(western.map(b=>b.realmIndex))].sort(),[0,1,2,3]);
  assert.equal(beasts.filter(b=>b.zoneId.startsWith('old-road-')&&b.rank==='normal').length,8);
  assert.deepEqual([...new Set(beasts.map(b=>b.species))].sort(),['boar','toad','wolf']);
  assert.ok(beasts.every(b=>zones.some(z=>z.zoneId===b.zoneId&&z.species===b.species&&m.insideHabitat(b,z)&&open(z,b.x,b.y,b.species,b.rank))));
  assert.equal(world.npcs[0].inventory[0].count,2);
  assert.equal(world.environment.drops[0].id,'already-owned');
  const copy=structuredClone(world);
  m.ensureFauna(copy,zones,open);assert.deepEqual(copy,world,'reload cannot reroll tiers or IDs');
  const legacy=makeWorld();
  const originals=m.ensureFauna(legacy,zones.filter(z=>!z.normalOnly),open).map(b=>b.id);
  m.ensureFauna(legacy,zones,open);
  assert.deepEqual(legacy.environment.fauna.slice(0,24).map(b=>b.id),originals);
  assert.equal(legacy.environment.fauna.length,50);
  const outer=m.damageFauna(legacy,legacy.environment.fauna[24].id,'hunter',200,'old-road-hunt');
  const outerZone=zones.find(z=>z.zoneId===outer.fauna.zoneId);
  m.queueFaunaRespawn(legacy,outer.fauna,outerZone.respawnMs);
  const pending=structuredClone(legacy);
  m.ensureFauna(pending,zones,open);
  assert.equal(pending.environment.fauna.length,50,'reloading a slain beast does not fill the slot early');
  assert.equal(m.processFaunaRespawns(pending,zones,outerZone.respawnMs-1,open).spawned.length,0);
  const blocked=m.processFaunaRespawns(pending,zones,outerZone.respawnMs,()=>false);
  assert.equal(blocked.failed.length,1);
  assert.equal(m.processFaunaRespawns(pending,zones,outerZone.respawnMs+2500,open).spawned[0].rank,'normal');
  const beast=beasts[0],habitat=zones.find(z=>z.zoneId===beast.zoneId);
  const dead=m.damageFauna(world,beast.id,'hunter',200,'first');
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
      m.damageFauna(sample,f.id,'hunter',1000,'fixture-kill');
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
    const hits=[];
    const combat=new m.MonsterCombat(world.environment,[z],{
      targets:(p,r)=>Math.hypot(target.x-p.x,target.y-p.y)<=r?[target]:[],
      move:(actor,point,avoid)=>{const position=grid.advance(grid.bodies.get(actor.id),point.x,point.y,avoid);if(position)Object.assign(actor,position);return Boolean(position);},
      open:(actor,point)=>grid.open(grid.bodies.get(actor.id),point.x,point.y),
      line:(a,b)=>!wall||(a.x<=302&&b.x<=302)||(a.x>=314&&b.x>=314),safe:()=>false,
      damage:(_,amount,source,id)=>hits.push({amount,id,source}),avoid:()=>{},threat:()=>false,
    });
    return {combat,world,f,target,skill,grid,hits};
  }
  for(const id of m.MONSTER_SKILL_IDS){
    const {combat,world,f,target,skill,grid,hits}=fixture(id);
    assert.ok(m.startMonsterSkill(f,id,target,0),id);
    for(let now=50;now<=skill.windup+skill.active+skill.recover+3000;now+=50){
      combat.tick(now,50);
      if(now<skill.windup)assert.equal(hits.length,0,id+' telegraph deals no damage');
      assert.equal(grid.overlaps().length,0,id+' no physical overlap');
    }
    assert.equal(f.lastSkill,id);
    if(skill.mode==='roar')assert.ok(f.buffUntil>0);
    else if(skill.mode==='armor')assert.ok(f.armorUntil>0);
    else assert.ok(hits.length>=1,id+' contact/impact');
    if(!['mist','leap'].includes(skill.mode))assert.ok(hits.length<=1,id+' no repeated hit');
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
  for(const species of m.FAUNA_IDS)for(const rank of ['normal','elite']){
    const png=PNG.sync.read(fs.readFileSync(`public/assets/fauna/monster-v2/${species}-${rank}.png`));
    assert.deepEqual([png.width,png.height],[1280,576]);
    assert.ok(png.data.some((v,i)=>i%4===3&&v>0));
  }
  console.log(`Monster 2.0: 24 existing and 8 Old Road spawns, ${elites} elite slots in 300 seeded worlds, 12 timed skills, swept walls, idempotent loot and save/load.`);
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
