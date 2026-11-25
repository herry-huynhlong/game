import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9356);
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
  const start=await evalScene(`
    s.sys.pause();s.populationWorld.clock.speed=4;window.manualCampusTime=s.time.now;
    window.evidenceTick=(kind)=>{
      const campus=s.sectCampus, world=s.populationWorld;
      for(let i=0;i<1400;i++){
        window.manualCampusTime+=250;s.time.now=window.manualCampusTime;
        s.updatePopulation(s.time.now,250);
        let record;
        if(kind==='training'){
          const floor=campus.site('training');
          const trainees=campus.disciples.filter(n=>n.decisionSlot==='sect-campus:training'&&n.action==='work'&&
            Math.hypot(n.x-floor.x,n.y-floor.y)<125);
          if(trainees.length>=2)record={trainees:trainees.map(n=>n.id),clock:{...world.clock}};
        }else if(kind==='market')record=world.economy.transactions.find(t=>t.shopId==='sect-treasure-pavilion');
        else record=campus.state.logs.find(e=>e.type===kind);
        if(record)return record;
      }
      return null;
    };
    return s.sectCampus.clerk.id;
  `);
  assert.ok(start);
  const shots={};
  for(const mode of ['accepted','completed','market','training']){
    const record=await evalScene(`return window.evidenceTick(${JSON.stringify(mode)});`);
    assert.ok(record, mode+' did not occur');
    await evalScene(`
      const mode=${JSON.stringify(mode)},campus=s.sectCampus;
      const p=campus.site(mode==='market'||mode==='training'?mode:'counter');
      s.setZoom(1.54);s.cameraTween?.stop();s.cameraTween=null;
      s.cameras.main.centerOn(p.x,p.y-25);s.clampCamera();
      window.liveCampusUpdate=s.updatePopulation;s.updatePopulation=()=>{};s.sys.resume();
    `);
    await sleep(270);await shot('evidence-'+mode);
    shots[mode]=record;
    if(mode!=='training')await evalScene('s.sys.pause();s.updatePopulation=window.liveCampusUpdate;');
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  await writeFile(join(output,'evidence.json'),JSON.stringify(shots,null,2));
} finally {
  ws?.close();
  chrome.kill();
}
