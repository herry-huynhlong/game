import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9354);
const output=resolve('art/previews/sect-campus');
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
  const frame=async(name,x,y,zoom)=>{
    await evalScene(`s.setZoom(${zoom});s.cameraTween?.stop();s.cameraTween=null;
      s.cameras.main.centerOn(${x},${y});s.clampCamera();s.updateSceneryVisibility();`);
    await sleep(200);
    await shot(name);
  };
  await frame('01-toan-canh',3652,4315,.78);
  const layout=await evalScene(`
    const p=s.sectCampus, body=s.populationWorld.npcs.find(n=>n.populationRole==='low_disciple');
    const gate=p.site('gate');
    return {population:s.populationWorld.npcs.length,clock:s.populationWorld.clock,
      sites:[...p.points].filter(([id])=>!/(home|queue|seat|dummy|plot|counter|reading)-?/.test(id))
        .map(([id,o])=>({id,name:o.name,x:o.x,y:o.y,reachable:s.canReachPoint(gate,o),
           walkable:s.footprintTerrainOpen(o.x,o.y,9,5)})),
      regions:['city-center','forest-outer','south-outskirts'].map(id=>({id,connected:s.canReachPoint(gate,s.markers.find(m=>m.id===id))})),
      wealth:p.vault.wealth,sitesExtra:[...p.points].filter(([id])=>/^(home|queue|seat|dummy|plot|counter)/.test(id))
        .map(([id,o])=>({id,clear:s.footprintTerrainOpen(o.x,o.y,9,5)}))};
  `);
  console.log('layout',JSON.stringify(layout));
  for(const site of layout.sites)await frame('site-'+site.id,site.x,site.y-90,1.3);
  await evalScene(`
    s.sys.pause();
    s.populationWorld.clock.speed=4;
    window.campusTest={clock:s.populationWorld.clock.day*1440+s.populationWorld.clock.minute, time:s.time.now,
      queuePeak:0,trainingPeak:0,fieldPeak:0,stuck:0};
    window.runCampus=(minutes)=>{
      const test=window.campusTest;
      for(let i=0;i<minutes;i++){
        test.time+=250;s.time.now=test.time;
        s.updatePopulation(test.time,250);
        if(i%10===0){
          const c=s.sectCampus.snapshot();
          test.queuePeak=Math.max(test.queuePeak,c.queue.length);
          test.trainingPeak=Math.max(test.trainingPeak,c.training);
          test.fieldPeak=Math.max(test.fieldPeak,c.field);
          test.stuck=Math.max(test.stuck,c.stuck);
        }
      }
      const {orders,onDuty,open,field,returning,complete,failed,wealth}=s.sectCampus.snapshot();
      return {clock:{...s.populationWorld.clock},onDuty,open,field,returning,complete,failed,wealth,orders:orders.map(q=>[q.id,q.type,q.status,q.progress,q.assignee])};
    }
  `);
  let status,saved;
  for(let i=0;i<24;i++){
    status=await evalScene('return window.runCampus(120);');
    if(i%3===2)console.log('day',JSON.stringify(status));
    if(i>=1&&!saved)saved=await evalScene(`
      const c=s.sectCampus,w=s.populationWorld,q=c.state.orders.find(q=>q.status==='active');
      if(!q||!s.persistPopulation())return null;
      const n=w.npcs.find(n=>n.id===q.assignee);
      return {id:q.id,npcId:n.id,progress:q.progress,x:n.x,y:n.y,raw:localStorage.getItem('world-rebuild-1c-v1')};
    `);
    if([1,4,12].includes(i)){
      const mode=i===1?'training':i===4?'array':'quests';
      await evalScene(`
        window.previousUpdate=s.updatePopulation;s.updatePopulation=()=>{};s.sys.resume();
        const p=s.sectCampus.site(${JSON.stringify(mode)});
        s.setZoom(1.25);s.cameraTween?.stop();s.cameraTween=null;
        s.cameras.main.centerOn(p.x,p.y-42);s.clampCamera();
      `);
      await sleep(240);
      await shot('active-'+mode);
      await evalScene('s.sys.pause();s.updatePopulation=window.previousUpdate;');
    }
  }
  const report=await evalScene(`
    const a=s.sectCampus.snapshot(),w=s.populationWorld;
    return {...window.campusTest,...a,elapsed:w.clock.day*1440+w.clock.minute-window.campusTest.clock,
      population:w.npcs.length,plots:w.environment.resourceNodes.filter(n=>n.id.startsWith('sect-plot-')),
      trades:w.economy.transactions.filter(t=>t.shopId==='sect-treasure-pavilion'),clock:w.clock,
      activeHunts:a.orders.filter(q=>q.type==='hunt'&&q.assignee).map(q=>{
        const n=w.npcs.find(o=>o.id===q.assignee),f=w.environment.fauna.find(f=>f.id===q.prey);
        return {id:q.id,progress:q.progress,prey:q.prey,fauna:f&&{x:f.x,y:f.y,hp:f.hp},
          actor:n&&{x:n.x,y:n.y,hp:n.hp,goal:n.goalAction,target:n.actionTarget,slot:n.decisionSlot},defeated:q.defeated};
      })};
  `);
  await writeFile(join(output,'campus-report.json'),JSON.stringify({layout,report,errors,failed},null,2));
  console.log('test',JSON.stringify({elapsed:report.elapsed,queue:report.queuePeak,training:report.trainingPeak,
    complete:report.complete,field:report.fieldPeak,affected:report.orders.map(x=>[x.type,x.status,x.progress])}));
  assert.ok(saved);
  const {raw,...persisted}=saved;
  await run('localStorage.setItem("world-rebuild-1c-v1",'+JSON.stringify(raw)+')');
  await visit('/?testMode=1',ready);
  const loaded=await evalScene(`
    const p=${JSON.stringify(persisted)},c=s.sectCampus,w=s.populationWorld,n=w.npcs.find(n=>n.id===p.npcId);
    const q=c.orderFor(n);
    return {id:q?.id,progress:q?.progress,x:n.x,y:n.y};
  `);
  assert.equal(loaded.id,persisted.id);
  assert.equal(loaded.progress,persisted.progress);
  assert.ok(Math.hypot(loaded.x-persisted.x,loaded.y-persisted.y)<15);
  const continuation=await evalScene(`
    s.sys.pause();let now=s.time.now;
    s.populationWorld.clock.speed=4;
    for(let i=0;i<65;i++){now+=250;s.time.now=now;s.updatePopulation(now,250);}
    const id=${JSON.stringify(persisted.id)},npcId=${JSON.stringify(persisted.npcId)};
    const q=s.sectCampus.state.orders.find(q=>q.id===id);
    const n=s.scheduler.byId.get(npcId).npc;
    return {id,status:q?.status,progress:q?.progress,x:n.x,y:n.y};
  `);
  assert.ok(continuation.status!=='active'||continuation.progress!==loaded.progress||
    Math.hypot(continuation.x-loaded.x,continuation.y-loaded.y)>6);
  const protections=await evalScene(`
    s.sys.pause();
    const c=s.sectCampus,w=s.populationWorld;
    const q=c.state.orders.find(q=>q.status==='completed');
    const n=w.npcs.find(n=>n.id===q.assignee);
    const funds=n.spiritStones,wealth=c.vault.wealth;
    const duplicate=c.deliver(n,q.id);
    const sameBalance=wealth===c.vault.wealth&&funds===n.spiritStones;
    w.clock.minute=680;
    const clerk=c.clerk,desk=c.site('counter');
    clerk.hunger=3;clerk.fatigue=3;clerk.hp=150;clerk.decisionSlot='sect-campus:quests';
    clerk.x=desk.x;clerk.y=desk.y;s.npcSprites.get(clerk.id).setPosition(clerk.x,clerk.y);
    const open=c.state.orders.find(q=>q.status==='open')??c.state.orders.find(q=>q.status==='active');
    let tester=null;
    if(open?.status==='active')tester=w.npcs.find(n=>n.id===open.assignee);
    else if(open)tester=c.disciples.find(n=>n.alive&&!c.orderFor(n)&&c.suitable(n,open));
    if(!tester)return {duplicate,sameBalance};
    tester.x=desk.x-29;tester.y=desk.y+10;tester.flight=undefined;tester.skyStep=undefined;
    s.npcSprites.get(tester.id).setPosition(tester.x,tester.y);s.syncGroundOccupancy();
    if(open.status==='open')c.accept(tester,open.id);
    const inventory=tester.inventory;
    tester.inventory=inventory.filter(i=>i.itemId!==open.item&&!(open.alternates??[]).includes(i.itemId));
    const near=c.canMeet(tester),missing=c.deliver(tester,open.id);
    tester.inventory=inventory;
    s.populationWorld.heaven.divinePower=90;
    s.selectNPC(tester.id);s.beginPossession();
    s.updatePopulation=(time,delta)=>s.updatePossessedPlayer(delta);s.sys.resume();
    return {duplicate,sameBalance,near,missing,possessed:s.possessedNpcId===tester.id};
  `);
  assert.equal(protections.possessed,true);
  await send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyE',key:'e',windowsVirtualKeyCode:69,nativeVirtualKeyCode:69});
  await sleep(180);
  await send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyE',key:'e',windowsVirtualKeyCode:69,nativeVirtualKeyCode:69});
  protections.shown=await evalScene('return s.sectCampus.panel.open;');
  if(protections.shown)await shot('mission-panel');
  assert.equal(protections.duplicate,false);
  assert.equal(protections.sameBalance,true);
  assert.equal(protections.near,true);
  assert.equal(protections.missing,false);
  assert.equal(protections.shown,true);
  await writeFile(join(output,'campus-report.json'),JSON.stringify({layout,report,reload:{persisted,loaded,continuation},protections,errors,failed},null,2));
  assert.equal(layout.population,108);
  assert.ok(layout.sites.every(p=>p.reachable&&p.walkable));
  assert.ok(layout.regions.every(p=>p.connected));
  assert.ok(report.logs.some(e=>e.type==='accepted'));
  assert.ok(report.orders.some(q=>q.type==='herbs'&&q.status==='completed'));
  assert.ok(report.orders.some(q=>q.type==='hunt'&&q.status==='completed'),JSON.stringify(report.activeHunts));
  assert.ok(report.trades.length>0);
  assert.ok(report.queuePeak<=6&&report.trainingPeak>0);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
} finally {
  ws?.close();
  chrome.kill();
}
