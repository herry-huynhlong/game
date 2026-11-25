import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9364);
const output=resolve('art/previews/society');
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
  const sites=await evalScene(`
    s.sys.pause();s.populationWorld.clock.speed=4;
    const c=s.society,w=s.populationWorld;
    const city=s.markers.find(p=>p.id==='city-center');
    const results=[...c.places.values()].map(v=>({id:v.id,staff:v.staff.id,slots:v.seats.length,
      clear:[v.staffSlot,v.counter,...v.seats,...v.queue].every(p=>s.footprintTerrainOpen(p.x,p.y,9,5)),
      reachable:[v.staffSlot,v.counter,...v.seats,...v.queue].every(p=>s.canReachPoint(city,p))}));
    window.clockTime=s.time.now;
    window.societySteps=(steps)=>{
      for(let i=0;i<steps;i++){
        window.clockTime+=250;s.time.now=window.clockTime;s.updatePopulation(s.time.now,250);
      }
      return {at:c.now(),venues:c.report(),journal:c.state.journal,visits:c.visits,
        npcCount:w.npcs.length,stuck:s.getPopulationState().diagnostics.stuckExamples};
    };
    return results;
  `);
  assert.equal(sites.length,5);
  assert.ok(sites.every(v=>v.clear&&v.reachable),JSON.stringify(sites));
  const seen=new Set();
  let report;
  for(let i=0;i<32;i++){
    report=await evalScene('return window.societySteps(90);');
    for(const v of report.venues.filter(v=>v.using>0&&!seen.has(v.id))){
      seen.add(v.id);
      await evalScene(`
        const v=s.society.places.get(${JSON.stringify(v.id)});
        s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.52);s.cameras.main.centerOn(v.counter.x,v.counter.y);s.clampCamera();
        window.realUpdate=s.updatePopulation;s.updatePopulation=(t)=>window.realUpdate.call(s,t,0);s.sys.resume();
      `);
      await sleep(300);await shot('venue-'+v.id);
      await evalScene('s.sys.pause();s.updatePopulation=window.realUpdate;');
    }
  }
  const cases={};
  for(const id of ['inn','clinic']){
    const fixture=await evalScene(`
      const key=${JSON.stringify(id)},c=s.society,v=c.places.get(key),w=s.populationWorld;
      for(let i=0;i<1600&&!c.onDuty(v);i++)window.societySteps(1);
      const n=w.npcs.find(n=>n.alive&&!n.authorityRole&&n.populationRole==='independent_cultivator'&&!c.visits[n.id]&&!n.flight&&!n.skyStep);
      const p=[[-95,0],[-70,90],[90,45],[30,115],[64,-70]].map(([x,y])=>({x:v.counter.x+x,y:v.counter.y+y}))
        .find(p=>s.groundPositionOpen(n,p.x,p.y)&&s.canReachPoint(p,v.counter));
      Object.assign(n,p,{spiritStones:50,mp:0,hunger:15,fatigue:key==='inn'?70:19,hp:key==='clinic'?46:96,
        safety:80,goalAction:'idle',action:'idle',decisionSlot:undefined,marketVisit:undefined});
      s.npcSprites.get(n.id).setPosition(p.x,p.y);
      s.syncGroundOccupancy();
      const started=c.start(n,v);
      return {id:n.id,started,fee:v.cfg.fee,before:{fatigue:n.fatigue,hp:n.hp,stones:n.spiritStones}};
    `);
    assert.ok(fixture.started,JSON.stringify(fixture));
    const used=await evalScene(`
      const c=s.society,id=${JSON.stringify(fixture.id)};
      for(let i=0;i<400&&c.visits[id]&&c.visits[id].phase!=='using';i++)window.societySteps(1);
      return c.visits[id]?.phase==='using';
    `);
    assert.equal(used,true,id);
    await evalScene(`
      const v=s.society.places.get(${JSON.stringify(id)});
      s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.44);s.cameras.main.centerOn(v.counter.x,v.counter.y);s.clampCamera();
      window.realUpdate=s.updatePopulation;s.updatePopulation=(t)=>window.realUpdate.call(s,t,0);s.sys.resume();
    `);
    await sleep(340);await shot('venue-'+id);
    cases[id]=await evalScene(`
      s.sys.pause();s.updatePopulation=window.realUpdate;
      const c=s.society,id=${JSON.stringify(fixture.id)},n=s.scheduler.byId.get(id).npc;
      for(let i=0;i<210&&c.visits[id];i++)window.societySteps(1);
      return {...${JSON.stringify(fixture)},after:{fatigue:n.fatigue,hp:n.hp,stones:n.spiritStones},
        results:c.state.journal.filter(x=>x.actorId===id).slice(-3).map(x=>x.type)};
    `);
    const a=cases[id];
    assert.equal(a.before.stones-a.after.stones,a.fee);
    if(id==='inn')assert.ok(a.after.fatigue<a.before.fatigue&&a.results.includes('society-rested'));
    else assert.ok(a.after.hp>a.before.hp&&a.results.includes('society-finished'));
  }
  const snapshot=await evalScene(`
    const c=s.society,w=s.populationWorld;
    const stats={venues:c.report(),accounts:Object.keys(c.state.accounts).length,
      spending:Object.values(c.state.accounts).reduce((sum,a)=>sum+a.spending,0),
      income:Object.values(c.state.accounts).reduce((sum,a)=>sum+a.income,0),
      exchanges:c.state.journal.filter(e=>e.type==='society-shared').length,
      solvent:w.npcs.every(n=>n.spiritStones>=0),seated:Object.keys(c.visits).filter(id=>c.isSeated(s.scheduler.byId.get(id).npc)),
      budget:s.sectCampus.state.budget};
    const ok=s.persistPopulation();
    return {stats,ok,raw:localStorage.getItem('world-rebuild-1c-v1')};
  `);
  assert.ok(snapshot.stats.solvent&&snapshot.stats.spending>0&&snapshot.stats.income>0);
  assert.ok(snapshot.ok);
  assert.equal(snapshot.stats.accounts,report.npcCount);
  assert.ok(snapshot.stats.venues.every(v=>v.cash>=0&&v.revenue-v.costs===v.cash));
  await run('localStorage.setItem("world-rebuild-1c-v1",'+JSON.stringify(snapshot.raw)+')');
  await visit('/?testMode=1',ready);
  const reloaded=await evalScene(`
    const c=s.society;
    return {venues:c.report().map(v=>[v.id,v.revenue,v.costs,v.cash]),accounts:Object.keys(c.state.accounts).length,
      population:s.populationWorld.npcs.length};
  `);
  assert.deepEqual(reloaded.venues,snapshot.stats.venues.map(v=>[v.id,v.revenue,v.costs,v.cash]));
  assert.equal(reloaded.accounts,108);
  assert.equal(reloaded.population,108);
  await writeFile(join(output,'stage-3.json'),JSON.stringify({sites,seen:[...seen],report,cases,stats:snapshot.stats,reloaded,errors,failed},null,2));
  console.log(JSON.stringify({seen:[...seen],venues:report.venues,events:report.journal.length}));
  assert.ok(report.venues.some(v=>v.id==='tavern'&&v.served));
  assert.ok(report.venues.some(v=>v.id==='music'&&v.served));
  assert.ok(report.venues.some(v=>v.id==='tea'&&v.served));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
