import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9458);
const output=resolve('art/previews/dong-hoang');
const profile=await mkdtemp(join(tmpdir(),'tvk-resident-profile-'));
await mkdir(output,{recursive:true});
const chrome=spawn(process.env.CHROME_EXE??'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--no-first-run',
  '--remote-debugging-port='+port,'--window-size=1600,1050','--user-data-dir='+profile,'about:blank',
],{stdio:'ignore',windowsHide:true});
let ws;
try {
  let target;
  for(let i=0;i<100&&!target;i++){
    try{target=(await (await fetch('http://127.0.0.1:'+port+'/json/list')).json()).find(page=>page.type==='page')}catch{}
    if(!target)await sleep(100);
  }
  assert.ok(target);
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=fail});
  let id=0;
  const pending=new Map(),errors=[],failed=[];
  ws.onmessage=event=>{
    const m=JSON.parse(event.data);
    if(m.id){const req=pending.get(m.id);pending.delete(m.id);if(req)m.error?req.fail(Error(m.error.message)):req.ok(m.result)}
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);
    if(m.method==='Network.responseReceived'&&m.params.response.status>=400&&!m.params.response.url.endsWith('/favicon.ico'))failed.push(m.params.response.url);
  };


  function send(method,params={}) {
    return new Promise((ok,fail)=>{
      const request=++id, timer=setTimeout(()=>{pending.delete(request);fail(Error('Chrome timeout '+method));},60000);
      pending.set(request,{ok:value=>{clearTimeout(timer);ok(value);},fail:error=>{clearTimeout(timer);fail(error);}});
      ws.send(JSON.stringify({id:request,method,params}));
    });
  }
  async function run(expression) {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  }
  const scene="const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');";
  const evalScene=code=>run(`(()=>{${scene}${code}})()`);
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    (()=>{const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}})();
  `});
  const visit=async(path,expression)=>{
    await send('Page.navigate',{url:origin+path});
    for(let i=0;i<240;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };
  const ready="Boolean(window.__worldRebuild?.ready() && window.__worldRebuildGame)";
  await visit('/?testMode=1&region=east',ready);
  await sleep(1700);
  const metrics=await evalScene(`
    const w=s.populationWorld, f=w.environment.fauna.filter(a=>a.zoneId.startsWith('east-')&&a.zoneId!=='east-wetland');
    const routes=Object.fromEntries(['rim','canyon','oasis','bones','dunes','ruins','camp'].map(id=>
      [id,s.findNavigationPath('east-bridge','east-'+id)?.length??0]));
    const species=Object.fromEntries([...new Set(f.map(a=>a.species))].map(id=>[id,f.filter(a=>a.species===id&&a.alive).length]));
    const treasures=s.westTreasures.system.nodes.filter(n=>n.x>5700);
    const camp=s.society.places.get('east-rest');
    const samples=[...s.frameSamples].sort((a,b)=>a-b);
    return {routes,species,population:w.npcs.length,treasures:[...new Set(treasures.map(n=>n.itemId))],
      camp:camp&&{staff:camp.staff.name,safe:s.monsterSafe(camp.counter),valid:s.canOccupy(camp.counter.x,camp.counter.y)},
      size:[s.worldWidth,s.worldHeight],fps:s.game.loop.actualFps,p95:samples[Math.floor(samples.length*.95)],
      zoom:s.cameras.main.zoom,atlas:s.terrainCache?.tileVariants??null};
  `);
  await shot('01-toan-canh');
  for(const [key,name] of [['oasis','02-oc-dao'],['canyon','03-xich-nham'],['bones','04-bach-cot'],['dunes','05-luu-sa'],['ruins','06-sa-thanh']]){
    await evalScene(`
      const p=s.markers.find(m=>m.id==='east-${key}');
      s.cameraTween?.stop();
      s.cameras.main.setZoom(.86).centerOn(p.x,p.y);
      s.clampCamera();s.updateSceneryVisibility();
    `);
    await sleep(360);
    await shot(name);
  }
  const benchmark={};
  for(const region of ['city','east-oasis','east-ruins']){
    await evalScene(`
      const p=s.markers.find(m=>m.id===('${region}'==='city'?'city-center':'${region}'));
      s.cameraTween?.stop();s.cameras.main.setZoom(.86).centerOn(p.x,p.y);
      s.clampCamera();s.updateSceneryVisibility();
    `);
    await sleep(650);
    benchmark[region]=await run(`
      new Promise(resolve=>{
        const values=[];let first,last;
        const loop=now=>{
          if(first===undefined)first=now;
          if(last!==undefined)values.push(now-last);
          last=now;
          if(now-first<1800)requestAnimationFrame(loop);
          else {values.sort((a,b)=>a-b);resolve({fps:Math.round(values.length*1000/(last-first)),p95:values[Math.floor(values.length*.95)]});}
        };
        requestAnimationFrame(loop);
      })
    `);
  }
  const samples=[];
  for(let part=0;part<4;part++){
    samples.push(await evalScene(`
      const w=s.populationWorld;
      s.sys.pause();
      let now=s.time.now;
      w.clock.speed=4;
      for(let i=0;i<720;i++){
        now+=250;s.time.now=now;s.updatePopulation(now,250);
      }
      return [w.clock.day,w.clock.minute];
    `));
  }
  const simulation=await evalScene(`
    const w=s.populationWorld;
    const parties=w.expeditions.parties.filter(p=>p.job.region?.startsWith('east-'));
    return {samples:${JSON.stringify(samples)},visitors:w.npcs.filter(n=>n.x>5700).map(n=>({name:n.name,x:Math.round(n.x),y:Math.round(n.y)})),
      parties:parties.map(p=>({kind:p.job.kind,count:p.initialCount??p.members.length,phase:p.phase,via:p.stoppedAtCamp??false,
        services:p.campServices??0,paid:p.paid??0,item:p.item,reason:p.failureReason})),
      receipts:w.society.venues['east-rest']?.served??0};
  `);
  const mechanics=await evalScene(`
    const w=s.populationWorld,e=w.environment;
    const npc=w.npcs.find(n=>n.alive&&!n.underground&&!n.wallLevel&&!n.flight);
    const original={x:npc.x,y:npc.y},count=item=>npc.inventory.find(i=>i.itemId===item)?.count??0;
    const step=ms=>{for(let i=0;i<ms;i+=100)s.tickFauna(100);};
    const skeleton=e.fauna.find(b=>b.species==='bone-skeleton'&&b.zoneId==='east-bones');
    const worm=e.fauna.find(b=>b.species==='sand-worm'&&b.growth.phase==='dormant');
    const report={},beforeClock=w.clock.minute;
    if(skeleton){
      w.clock.minute=720;step(4500);
      const before=skeleton.growth.phase,id=skeleton.id;
      w.clock.minute=1210;step(3200);
      const night=skeleton.growth.phase;
      w.clock.minute=720;step(13500);
      report.skeleton={id,before,night,day:skeleton.growth.phase,same:e.fauna.includes(skeleton)};
    }
    if(worm){
      const approach=[[-42,0],[42,0],[0,-42],[0,42]].map(([x,y])=>({x:worm.x+x,y:worm.y+y}))
        .find(p=>s.groundPositionOpen(npc,p.x,p.y)&&s.monsterLine(p,worm)&&!s.monsterSafe(p));
      if(approach){
        const before=worm.growth.phase;
        Object.assign(npc,approach);s.syncGroundOccupancy();step(1900);
        const near=worm.growth.phase;
        Object.assign(npc,original);s.syncGroundOccupancy();step(13500);
        report.worm={id:worm.id,before,near,away:worm.growth.phase,same:e.fauna.includes(worm)};
      }
    }
    const node=s.westTreasures.system.nodes.find(n=>n.x>5700&&n.harvestedAt===undefined&&
      s.westTreasures.now>n.plantedAt+116000&&!s.westTreasures.system.guardian(n)&&s.canOccupy(n.x,n.y));
    if(node){
      Object.assign(npc,{x:node.x,y:node.y});s.syncGroundOccupancy();
      const before=count(node.itemId);
      const first=s.westTreasures.harvest(npc,node),second=s.westTreasures.harvest(npc,node);
      report.harvest={id:node.id,owner:npc.id,item:node.itemId,first,second,quantity:count(node.itemId)-before};
      Object.assign(npc,original);s.syncGroundOccupancy();
    }
    const entry=[...s.inspector.static.values()].find(v=>v.kind==='east-site'&&s.prop(v.data,'eastChest'));
    if(entry){
      s.inspector.select({kind:entry.kind,id:entry.id});
      report.inspection={title:s.inspector.panel.querySelector('h2').textContent,open:!s.inspector.panel.hidden};
      if(s.inspector.selected){
        const around=[[-28,0],[28,0],[0,-28],[0,28]].map(([x,y])=>({x:entry.sprite.x+x,y:entry.sprite.y+y}))
          .find(p=>s.canOccupy(p.x,p.y)&&s.monsterLine(p,entry.sprite));
        if(around){
          Object.assign(npc,around);
          const before=count('bone_jade'),attempt=s.westTreasures.claimAncientChest(npc);
          report.chest={attempt,blocked:count('bone_jade')===before&&e.fauna.some(b=>b.species==='bone-king'&&b.alive)};
          Object.assign(npc,original);
        }
      }
    }
    w.clock.minute=beforeClock;
    return report;
  `);
  await shot('07-giam-dinh-ruong-co');
  const save=await evalScene(`
    const w=s.populationWorld, ids=w.environment.fauna.filter(b=>b.zoneId.startsWith('east-')).map(b=>b.id).sort();
    return {ok:s.persistPopulation(),world:w.worldId,ids};
  `);
  await visit('/?testMode=1&region=east-oasis',ready);
  const reloaded=await evalScene(`
    const w=s.populationWorld;
    return {world:w.worldId,harvested:w.environment.westTreasures.filter(n=>n.harvestedAt!==undefined).map(n=>[n.id,n.claimedBy]),ids:w.environment.fauna.filter(b=>b.zoneId.startsWith('east-')).map(b=>b.id).sort()};
  `);
  const result={metrics,benchmark,simulation,mechanics,save,reloaded,errors,failed};
  await writeFile(join(output,'verification.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  assert.equal(metrics.population,108);
  assert.equal(Object.keys(metrics.species).length,8);
  assert.equal(metrics.treasures.length,10);
  assert.ok(Object.values(metrics.routes).every(Boolean));
  assert.ok(metrics.camp?.safe&&metrics.camp.valid);
  assert.ok(save.ok);
  assert.equal(reloaded.world,save.world);
  assert.deepEqual(reloaded.ids,save.ids);
  assert.deepEqual([mechanics.skeleton?.before,mechanics.skeleton?.night,mechanics.skeleton?.day,mechanics.skeleton?.same],['dormant','active','dormant',true]);
  assert.deepEqual([mechanics.worm?.before,mechanics.worm?.near,mechanics.worm?.away,mechanics.worm?.same],['dormant','active','dormant',true]);
  assert.ok(mechanics.inspection?.open);
  assert.ok(mechanics.chest?.blocked);
  assert.ok(mechanics.harvest?.first&&!mechanics.harvest.second&&mechanics.harvest.quantity===1);
  assert.ok(reloaded.harvested.some(([id,owner])=>id===mechanics.harvest.id&&owner===mechanics.harvest.owner));
  assert.ok(simulation.parties.some(p=>p.via&&p.count>=3&&p.count<=5));
} finally {
  ws?.close();
  chrome.kill();
}
