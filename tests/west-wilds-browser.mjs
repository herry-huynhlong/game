import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9365);
const output=resolve('art/previews/west-wilds');
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
    return new Promise((ok,fail)=>{pending.set(++id,{ok,fail});ws.send(JSON.stringify({id,method,params}))});
  }
  async function run(expression) {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  }
  const scene="const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');";
  const evalScene=code=>run(`(()=>{${scene}${code}})()`);
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}
  `});
  const visit=async(path,expression)=>{
    await send('Page.navigate',{url:origin+path});
    for(let i=0;i<100;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };

  const ready="Boolean(window.__worldRebuild?.ready())";
  await visit('/?testMode=1',ready);

  await send('Emulation.setDeviceMetricsOverride',{width:1304,height:955,deviceScaleFactor:1,mobile:false});
  const map=await evalScene(`
    const city=s.markers.find(m=>m.id==='gate-west'), w=s.westWilds;
    const a=w.regions.map(r=>s.markers.find(m=>m.id===r.id));
    const p=s.riverFishSystem.closestFishPosition;
    return {width:s.map.width,height:s.map.height,minX:s.worldMinX,variants:s.terrainCache?.tileVariants,
      population:s.populationWorld.npcs.length,fauna:s.populationWorld.environment.fauna.filter(f=>f.alive).length,
      fish:p?{x:p.x,water:s.riverFishSystem.isWaterTile(p.x,p.y)}:null,
      sites:a.map(m=>[m.id,s.canOccupy(m.x,m.y),s.canReachPoint(city,m)]),
      pathNodes:w.nodes.map(n=>[n.id,s.canReachPoint(city,n)]),court:s.markerRegion('city')};
  `);
  assert.deepEqual([map.width,map.height,map.minX,map.population,map.fauna],[352,184,-4096,108,50]);
  assert.ok(map.sites.every(([,open,reachable])=>open&&reachable));
  assert.ok(map.pathNodes.every(([,reachable])=>reachable));
  assert.ok(map.fish?.water&&map.fish.x>5000);
  const rates=await evalScene(`
    const ui=document.getElementById('world-clock-speed');
    const rates=['0','1','2','4'].map(value=>{ui.value=value;ui.dispatchEvent(new Event('change'));
      return s.populationWorld.clock.paused?0:s.populationWorld.clock.speed;});
    return rates;
  `);
  assert.deepEqual(rates,[0,1,2,4]);
  const shots=[];
  for(const [name,minute] of [['dawn',360],['noon',720],['sunset',1080],['night',1260]]){
    const phase=await evalScene(`s.populationWorld.clock.minute=${minute};s.populationWorld.clock.paused=true;
      const p=s.markerRegion('city');s.cameraTween?.stop();s.cameras.main.setZoom(.95).centerOn(p.x,p.y);
      s.clampCamera();return true;`);
    assert.ok(phase);
    const marker=String(Math.floor(minute/60)).padStart(2,'0')+':00';
    for(let i=0;i<20;i++){
      if((await run("document.getElementById('world-clock').innerText")).includes(marker))break;
      await sleep(150);
    }
    shots.push(await evalScene("return {ui:document.getElementById('world-clock').innerText,color:s.daylight.tone.fillColor,alpha:s.daylight.tone.fillAlpha,lamps:s.daylight.lights.commandBuffer.length}"));
    assert.ok(shots.at(-1).ui.includes(marker));
    await shot('city-'+name);
  }
  assert.equal(new Set(shots.map(p=>p.color)).size,4);
  assert.ok(shots[3].lamps>shots[1].lamps);
  for(const [id] of map.sites){
    await evalScene(`const p=s.markers.find(m=>m.id===${JSON.stringify(id)});s.cameras.main.setZoom(.95).centerOn(p.x,p.y+80);s.clampCamera();s.populationWorld.clock.minute=${id==='west-poison'?1290:700};return true;`);
    await sleep(280);await shot(id);
  }
  await evalScene('return s.showWorldOverview()');await sleep(400);await shot('world-overview');
  const rare=await evalScene(`
    const p=s.westWilds.nodes.find(n=>n.id==='west-forbidden-2');s.populationWorld.clock.minute=1260;
    s.cameras.main.setZoom(1.8).centerOn(p.x,p.y);s.clampCamera();
    const f=s.populationWorld.environment.fauna.find(f=>f.zoneId==='west-forbidden');
    return {ready:s.westWilds.ready(p),beast:{x:f.x,y:f.y,realmIndex:f.realmIndex,realmLevel:f.realmLevel}};
  `);
  assert.ok(rare.ready&&rare.beast.realmIndex===3);
  await sleep(450);await shot('rare-herb');
  await evalScene(`s.cameras.main.setZoom(1.35).centerOn(${rare.beast.x},${rare.beast.y});s.clampCamera();return true;`);
  await sleep(450);await shot('forbidden-fauna');
  const benchmark=await run(`(async()=>{${scene}
    const p=s.markerRegion('city');s.cameras.main.setZoom(.95).centerOn(p.x,p.y);s.populationWorld.clock.paused=false;
    s.populationWorld.clock.minute=480;s.populationWorld.clock.speed=1;
    const times=[],end=performance.now()+7000;let last=performance.now();
    await new Promise(ok=>{const frame=now=>{times.push(now-last);last=now;if(now>=end)ok();else requestAnimationFrame(frame);};requestAnimationFrame(frame)});
    const sum=times.reduce((a,b)=>a+b,0);times.sort((a,b)=>a-b);
    return {fps:times.length*1000/sum,p95:times[Math.floor(times.length*.95)],dimensions:[innerWidth,innerHeight],zoom:s.cameras.main.zoom,frameCount:times.length,actors:s.populationWorld.npcs.length,fauna:s.populationWorld.environment.fauna.filter(f=>f.alive).length};
  })()`);
  await writeFile(join(output,'benchmark.json'),JSON.stringify(benchmark,null,2));
  console.log(JSON.stringify({map,shots,benchmark}));
  const log=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.populationRole==='herb_gatherer'),w=s.westWilds;
    const p=w.pockets[0],saved={x:n.x,y:n.y,inventory:structuredClone(n.inventory),mp:n.mp,hp:n.hp,fatigue:n.fatigue};
    Object.assign(n,{x:p.x+36,y:p.y+35,westPoison:0});
    for(let i=0;i<24;i++)w.poison(n);
    const exposure={poison:n.westPoison,hp:n.hp,mp:n.mp};
    n.inventory.push({itemId:'detox_pill',count:1});w.poison(n);
    const recovered={poison:n.westPoison,detox:n.inventory.find(i=>i.itemId==='detox_pill')?.count??0};
    Object.assign(n,saved,{westPoison:0});
    const realm=s.westWilds.regions.find(r=>r.id==='west-forbidden');
    return {exposure,recovered,lowRealmRejected:!w.allowed(n,realm)};
  `);
  assert.ok(log.exposure.poison>=70&&log.recovered.poison<log.exposure.poison&&log.recovered.detox===0&&log.lowRealmRejected);
  const trace=await evalScene(`
    const w=s.populationWorld,journeys=new Set(),harvests=new Set(),nightPatrol=new Set(),services=new Set(),orders=new Set();
    const snapshots=[],stuckIds=new Map(),dayAt=w.clock.day;
    let time=s.time.now;
    w.clock.speed=1;
    for(let i=0;i<2880;i++){
      time+=1000;s.updatePopulation(time,1000,1000);
      for(const n of w.npcs) {
        if(n.westJourney){journeys.add(n.id);if(n.westJourney.collected)harvests.add(n.id);}
        if(w.clock.minute>=1140||w.clock.minute<300){
          const entry=s.scheduler.byId.get(n.id);
          if(n.populationRole==='city_guard'&&['patrolling','observing'].includes(entry?.guardState))nightPatrol.add(n.id);
        }
      }
      for(const o of s.sectCampus.state.orders)if(o.westRegion&&o.status==='completed')orders.add(o.id);
      for(const e of s.society.state.journal)if(e.type==='society-paid'&&e.minute>=1080)services.add(e.data.place);
      if(i%360===359){
        const pop=s.getPopulationState();
        for(const d of pop.diagnostics.stuckExamples)stuckIds.set(d.id,(stuckIds.get(d.id)??0)+1);
        snapshots.push({day:w.clock.day,minute:w.clock.minute,alive:pop.alive,stuck:pop.states.stuck,west:w.npcs.filter(n=>n.x<0).length,
          exploration:Object.keys(w.westWilds.harvest).length,orders:s.sectCampus.state.orders.filter(o=>o.westRegion).map(o=>[o.type,o.status,o.progress]),services:s.society.report().map(v=>[v.id,v.served])});
      }
    }
    w.clock.paused=true;
    const before={saveDay:w.clock.day,npcs:w.npcs.map(n=>[n.id,n.x,n.y,n.westJourney??null]),resource:w.westWilds.harvest};
    s.persistPopulation();
    return {days:w.clock.day-dayAt,journeys:[...journeys],harvests:[...harvests],nightPatrol:[...nightPatrol],services:[...services],orders:[...orders],snapshots,
      deaths:w.npcs.filter(n=>!n.alive).map(n=>({id:n.id,cause:n.deathCause,x:n.x,y:n.y})),
      paired:w.npcs.filter(n=>n.westJourney?.partnerId).map(n=>[n.id,n.westJourney.partnerId]),
      repeatedStuck:[...stuckIds].filter(([,v])=>v>=2),before};
  `);
  const {before,...summarized}=trace;
  await writeFile(join(output,'simulation.json'),JSON.stringify({map,shots,log,...summarized,errors,failed},null,2));
  await visit('/?testMode=1&region=west-outer',ready);
  const after=await evalScene(`const w=s.populationWorld;return {saveDay:w.clock.day,npcs:w.npcs.map(n=>[n.id,n.x,n.y,n.westJourney??null]),resource:w.westWilds.harvest};`);
  assert.deepEqual(after,before);
  const explorer=await evalScene(`const w=s.populationWorld;const n=w.npcs.find(n=>n.x<0&&n.alive&&n.westJourney);if(!n)return null;
    s.cameraTween?.stop();s.cameras.main.setZoom(1.35).centerOn(n.x,n.y);s.clampCamera();s.selectNPC(n.id);return n.id;`);
  if(explorer){await sleep(450);await shot('npc-expedition');}
  const economy=await evalScene(`
    const w=s.populationWorld, west=s.westWilds, campus=s.sectCampus;
    const node=west.nodes.find(p=>p.id==='west-poison-0');
    const actor={...w.npcs.find(n=>n.populationRole==='elder'),x:node.x,y:node.y,realmIndex:2,inventory:[],westJourney:undefined};
    delete west.state.harvest[node.id];
    const picked=west.harvest(actor,node),duplicate=west.harvest(actor,node);
    const alchemist=w.npcs.find(n=>campus.staff.get(n.id)==='alchemy');
    const station=campus.site('alchemy');
    Object.assign(alchemist,{x:station.x,y:station.y,alive:true,ascended:false,wallLevel:0,flight:undefined,skyStep:undefined,tribulation:undefined,decisionSlot:'sect-campus:alchemy'});
    const count=(items,id)=>items.find(i=>i.itemId===id)?.count??0;
    const set=(items,id,amount)=>{const stack=items.find(i=>i.itemId===id);if(stack)stack.count=amount;else items.push({itemId:id,count:amount});};
    delete campus.state.batch;
    set(campus.vault.treasury,'detox_pill',0);
    set(campus.vault.treasury,node.itemId,1);
    campus.produce();const batch=structuredClone(campus.state.batch);
    w.clock.minute+=48;campus.produce();
    const shop=w.shops.find(sh=>sh.id==='sect-treasure-pavilion');
    return {picked,duplicate,stack:count(actor.inventory,node.itemId),batch:batch.pill,remaining:count(campus.vault.treasury,node.itemId),produced:count(campus.vault.treasury,'detox_pill')+count(shop.stock,'detox_pill')};
  `);
  assert.deepEqual([economy.picked,economy.duplicate,economy.stack,economy.batch,economy.remaining],[true,false,2,'detox_pill',0]);
  assert.ok(economy.produced>=2);
  await writeFile(join(output,'economy-check.json'),JSON.stringify(economy,null,2));
  assert.equal(trace.days,2);
  assert.ok(trace.nightPatrol.length>0);
  assert.ok(trace.harvests.length>0);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  console.log(JSON.stringify({log,...summarized},null,2));
}finally{ws?.close();chrome.kill()}
