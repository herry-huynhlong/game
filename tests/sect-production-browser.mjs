import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9363);
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
  await evalScene(`
    s.sys.pause();s.populationWorld.clock.speed=4;
    window.minuteTime=s.time.now;
    window.capturedJobs=new Set();
    window.advanceProduction=steps=>{
      let job=null,advanced=0;
      for(let i=0;i<steps;i++){
        window.minuteTime+=250;s.time.now=window.minuteTime;s.updatePopulation(s.time.now,250);
        advanced++;
        const c=s.sectCampus;
        const practicing=c.state.orders.find(q=>q.status==='active'&&q.phase==='field'&&q.workSite&&q.workUntil&&
          (q.mining||q.type.startsWith('farm'))&&!window.capturedJobs.has(q.mining?'mine':'fields'));
        if(practicing){
          const n=s.scheduler.byId.get(practicing.assignee).npc,p=c.site(practicing.workSite);
          if(Math.hypot(n.x-p.x,n.y-p.y)<14){
            job={kind:practicing.mining?'mine':'fields',name:n.name,x:n.x,y:n.y};
            window.capturedJobs.add(job.kind);break;
          }
        }
      }
      const c=s.sectCampus;
      return {advanced,job,stats:c.production.state.totals,fields:c.production.state.fields,
        alchemy:{batches:c.state.logs.filter(l=>l.type==='brew').length,
          herbOut:c.state.outbound.spirit_herb??0,pillsIn:c.state.inbound.qi_pill??0},
        complete:c.state.orders.filter(q=>q.status==='completed').map(q=>[q.type,q.mining,q.turnedIn,q.collected]),
        orders:c.state.orders.filter(q=>q.status==='active').map(q=>[q.type,q.assignee,q.phase,q.progress]),
        safe:c.production.points.every(p=>s.footprintTerrainOpen(p.x,p.y,9,5)),
        connected:c.production.points.every(p=>s.canReachPoint(c.site('counter'),p))};
    };
  `);
  const milestone=new Set();
  let report;
  for(let elapsed=0;elapsed<2880;){
    report=await evalScene('return window.advanceProduction(120);');
    elapsed+=report.advanced;
    if(report.job){
        const {kind,x,y}=report.job;
        milestone.add(kind);
        await evalScene(`
          const p=${JSON.stringify({x,y})};
          s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.14);s.cameras.main.centerOn(p.x,p.y);s.clampCamera();
          window.realUpdate=s.updatePopulation;s.updatePopulation=(t)=>window.realUpdate.call(s,t,0);s.sys.resume();
        `);
        await sleep(350);await shot(kind==='mine'?'04-mine':'05-fields');
        await evalScene('s.sys.pause();s.updatePopulation=window.realUpdate;');
    }
  }
  await writeFile(join(output,'stage-2.json'),JSON.stringify({report,workingScreens:[...milestone],errors,failed},null,2));
  console.log(JSON.stringify(report));
  assert.ok(report.safe&&report.connected);
  assert.ok(report.stats.mined&&report.stats.planted&&report.stats.watered&&report.stats.harvested);
  assert.ok(report.complete.some(([t,m])=>t==='ore'&&m));
  assert.ok(report.complete.some(([t])=>t.startsWith('farm')));
  assert.ok(report.alchemy.batches>0&&report.alchemy.herbOut>=report.alchemy.batches*3&&report.alchemy.pillsIn>=report.alchemy.batches);
  assert.equal(milestone.size,2);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
