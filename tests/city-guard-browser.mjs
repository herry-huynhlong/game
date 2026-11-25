import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9336);
const output=resolve('art/previews/city-guard');
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
  const start=await evalScene(`
    s.sys.pause();
    const world=s.populationWorld;
    world.clock.speed=4;
    const keys=['trading','mission','patrolling','guarding','resting','toDuty','gathering'];
    const initialClock=world.clock.day*1440+world.clock.minute;
    window.guardRun={initialClock,now:s.time.now,minutes:0,peaks:Object.fromEntries(keys.map(k=>[k,0])),
      sides:new Set(),gates:new Set(),observers:new Set(),street:new Set(),descended:new Set(),rested:new Set(),
      failures:new Map(),shifts:new Set(),rows:[],maxInvalid:0,maxWallJump:0,ratePeaks:{ai:0,path:0,collision:0},
      jobSamples:[],tradeStart:new Set(world.economy.transactions.map(t=>t.id)),newTrades:new Set()};
    window.guardChunk=(minutes)=>{
      const d=window.guardRun;
      const from=d.minutes;let rows=s.guardDebug.snapshot().rows;
      while(d.minutes<from+minutes){
        const prior=rows;
        d.now+=250;s.time.now=d.now;
        s.updatePopulation(d.now,250);
        d.minutes++;
        const guards=s.guardDebug.snapshot();rows=guards.rows;d.rows=rows;
        d.shifts.add(guards.shift);
        for(const [i,n] of rows.entries()){
          const dx=n.x-prior[i].x,dy=n.y-prior[i].y;
          if(n.floor==='Wall'||n.floor==='Stair'){
            const body=s.groundOccupancy.bodies.get(n.id);
            if(body&&!s.ramparts.open(n.x,n.y,body.width/2,body.height/2))d.maxInvalid++;
            if(prior[i].floor!=='Ground')d.maxWallJump=Math.max(d.maxWallJump,Math.hypot(dx,dy));
          }
          if(prior[i].floor!=='Ground'&&n.floor==='Ground')d.descended.add(n.id);
          if(n.floor==='Wall'&&['patrolling','observing'].includes(n.state))d.sides.add(n.area);
          if(n.state==='guarding')d.gates.add(n.area);
          if(n.state==='observing')d.observers.add(n.id);
          if(n.area==='Nội thành'&&['patrolling','observing'].includes(n.state))d.street.add(n.id);
          if(n.state==='resting'&&n.action==='rest')d.rested.add(n.id);
        }
        if(d.minutes%5===0){
          const pop=s.getPopulationState();
          for(const tx of world.economy.transactions)if(!d.tradeStart.has(tx.id))d.newTrades.add(tx.id);
          for(const key of keys)d.peaks[key]=Math.max(d.peaks[key],pop.states[key]??0);
          d.ratePeaks.ai=Math.max(d.ratePeaks.ai,pop.goalEvaluations);
          d.ratePeaks.path=Math.max(d.ratePeaks.path,pop.pathfindingCalls);
          d.ratePeaks.collision=Math.max(d.ratePeaks.collision,pop.collisionChecks);
          for(const stuck of pop.diagnostics.stuckExamples){
            const old=d.failures.get(stuck.id);
            if(!old||stuck.noProgressMs>old.noProgressMs)d.failures.set(stuck.id,{...stuck,at:d.minutes});
          }
        }
        if(d.minutes%120===0){
          const {repairers,herbGatherers}=s.getProfessionState();
          d.jobSamples.push({at:d.minutes,repair:repairers.map(n=>({id:n.id,status:n.status,reason:n.reason})),
            herbs:herbGatherers.map(n=>({id:n.id,status:n.status,reason:n.reason,node:n.nodeId})),
            availableRepairs:world.commissions.filter(c=>c.status==='open').length});
        }
      }
      return {minutes:d.minutes,sides:[...d.sides],gates:[...d.gates],rested:[...d.rested],rows};
    };
    return {initialClock,population:world.npcs.length,guards:s.guardDebug.snapshot().rows.length,postsSafe:s.ramparts.groundPosts.every(p=>s.footprintTerrainOpen(p.x,p.y,9,5))};
  `);
  assert.equal(start.population,108);
  assert.equal(start.guards,10);
  assert.equal(start.postsSafe,true);
  for(let i=0;i<24;i++){
    const progress=await evalScene('return window.guardChunk(60);');
    if(i===3){
      await evalScene(`
        window.realPopulationUpdate=s.updatePopulation;s.updatePopulation=()=>{};
        s.sys.resume();
        s.setZoom(.48);s.cameraTween?.stop();s.cameraTween=null;
        s.cameras.main.centerOn(3472,2140);s.clampCamera();
      `);
      await sleep(250);
      await shot('01-canh-gac-va-tuan-tra');
      await evalScene(`
        s.populationDebug.hidden=false;
        s.populationDebug.querySelector('section').hidden=false;
        s.guardDebug.expanded=true;s.guardDebug.navigation=true;
        s.renderPopulationDebug();
        const guard=s.guardDebug.snapshot().rows.find(n=>n.floor==='Wall'&&n.area==='Tường Bắc');
        if(guard){s.setZoom(1.10);s.cameras.main.centerOn(guard.x,guard.y-50);s.clampCamera();}
        s.guardDebug.drawAt=-Infinity;s.guardDebug.update(s.time.now);
      `);
      await sleep(300);
      await shot('02-city-guard-navigation');
      await evalScene('s.sys.pause();s.updatePopulation=window.realPopulationUpdate;s.guardDebug.navigation=false;s.guardDebug.graphics.clear();s.populationDebug.hidden=true;');
    }
    if(i%4===3)console.log(progress.minutes,progress.sides,progress.gates,progress.rested.length);
  }
  const result=await evalScene(`
    const d=window.guardRun,world=s.populationWorld,{states,diagnostics}=s.getPopulationState();
    return {population:world.npcs.length,guards:s.guardDebug.snapshot().rows.length,
      simulated:world.clock.day*1440+world.clock.minute-d.initialClock,
      peaks:d.peaks,sides:[...d.sides],gates:[...d.gates],street:[...d.street],descended:[...d.descended],
      rested:[...d.rested],observers:[...d.observers],shifts:[...d.shifts],maxInvalid:d.maxInvalid,
      maxWallJump:d.maxWallJump,rates:d.ratePeaks,finalStates:states,finalStuck:diagnostics.stuckExamples,
      failedTravel:[...d.failures.values()].sort((a,b)=>b.noProgressMs-a.noProgressMs),
      tradeTransactions:d.newTrades.size,missions:world.sectMissions.map(m=>({status:m.status,id:m.id})),jobs:d.jobSamples};
  `);
  await writeFile(join(output,'full-day.json'),JSON.stringify(result,null,2));
  const incident=await evalScene(`
    const position=s.markers.find(m=>m.id==='city-center');
    const candidates=s.populationWorld.npcs.filter(n=>n.alive&&!n.wallLevel&&!n.flight&&!n.skyStep&&
      n.populationRole==='commoner'&&n.hp>18).sort((a,b)=>
      Math.hypot(position.x-a.x,position.y-a.y)-Math.hypot(position.x-b.x,position.y-b.y));
    const [suspect,victim]=candidates;
    const move=s.moveAutonomousNpc.bind(s);
    s.moveAutonomousNpc=entry=>entry.npc===suspect?false:move(entry);
    const result=s.reportCombat(suspect.id,victim.id,8,{eventId:'city-guard-relief-test'});
    return result.incident;
  `);
  assert.ok(incident?.responderIds.length>=2);
  const responders=JSON.stringify(incident.responderIds);
  const current=()=>evalScene(`
    const incident=s.populationWorld.cityLaw.incidents.find(i=>i.id===${JSON.stringify(incident.id)});
    const suspect=s.populationWorld.npcs.find(n=>n.id===incident.suspectId);
    return {status:incident.status,suspect:{x:suspect.x,y:suspect.y,flight:Boolean(suspect.flight)},
      rows:s.guardDebug.snapshot().rows.filter(r=>${responders}.includes(r.id)).map(r=>({
        ...r,law:s.scheduler.byId.get(r.id).npc.lawResponse,
        target:s.scheduler.byId.get(r.id).npc.actionTarget
      }))};
  `);
  const responding=await current();
  assert.ok(responding.rows.every(n=>n.state==='responding'));
  let contained=responding;
  for(let i=0;i<8&&contained.status==='responding';i++){
    await evalScene('return window.guardChunk(20);');
    contained=await current();
  }
  assert.equal(contained.status,'contained',JSON.stringify(contained));
  await sleep(1850);
  await evalScene('s.tickCityLaw();return window.guardChunk(8);');
  const returned=await current();
  assert.equal(returned.status,'cleared');
  assert.ok(returned.rows.every(n=>n.state!=='responding'));
  result.cityLaw={responding,contained,returned};
  await writeFile(join(output,'full-day.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({...result,jobs:undefined,failedTravel:result.failedTravel.slice(0,12)}));
  assert.equal(result.simulated,1440);
  assert.equal(result.population,108);
  assert.equal(result.guards,10);
  assert.equal(result.sides.length,4);
  assert.equal(result.gates.length,4);
  assert.ok(result.street.length>=1&&result.rested.length>=1&&result.descended.length>=1);
  assert.equal(result.maxInvalid,0);
  assert.ok(result.failedTravel.every(n=>n.noProgressMs<45000),JSON.stringify(result.failedTravel.slice(0,5)));
  assert.ok(result.rates.ai>0&&result.rates.path>0&&result.rates.collision>0);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
} finally {
  ws?.close();
  chrome.kill();
}
