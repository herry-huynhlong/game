import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9362);
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
  const resolveStage=async name=>{
    await evalScene(`
      const m=s.markers.find(p=>p.id===${JSON.stringify(name)});
      s.setZoom(1.1);s.cameraTween?.stop();s.cameraTween=null;s.cameras.main.centerOn(m.x,m.y);s.clampCamera();
    `);
    await sleep(450);
  };
  await evalScene('s.setZoom(1.14);');
  await sleep(300);
  const plate=await evalScene(`
    const f=s.populationWorld.environment.fauna[0];
    s.cameraTween?.stop();s.cameraTween=null;s.cameras.main.centerOn(f.x,f.y);s.clampCamera();
    return f.id;
  `);
  await sleep(400);
  const initial=await evalScene(`
    const p=s.nameplates.active.get(${JSON.stringify(plate)});
    const f=s.populationWorld.environment.fauna.find(f=>f.id===${JSON.stringify(plate)});
    return {name:p?.name.text,realm:p?.realm.text,view:s.cameras.main.worldView,fauna:{x:f.x,y:f.y,alive:f.alive},
      visible:s.faunaSprites.get(f.id).visible,enabled:s.nameplates.enabled,zoom:s.cameras.main.zoom,
      active:[...s.nameplates.active.keys()],next:s.nameplates.next,time:s.time.now};
  `);
  assert.ok(initial.name&&initial.realm?.includes('tầng'),JSON.stringify({initial,errors,failed}));
  await shot('01-fauna-nameplates');
  await resolveStage('city-center');
  const npc=await evalScene(`
    s.sys.pause();
    const id=[...s.nameplates.active.keys()].find(id=>s.npcSprites.has(id));
    const n=s.scheduler.byId.get(id).npc;
    Object.assign(n,{realmIndex:1,realmLevel:3});
    s.nameplates.update(s.time.now+120);
    const updated=s.nameplates.active.get(id).realm.text;
    const button=document.getElementById('world-nameplates');
    button.click();s.nameplates.update(s.time.now+240);
    const hidden=s.nameplates.active.size===0;
    button.click();s.sys.resume();
    return {updated,hidden,crowd:s.getPopulationState().diagnostics.stuckExamples};
  `);
  assert.deepEqual([npc.updated,npc.hidden],['Trúc Cơ tầng 3',true]);
  await sleep(400);await shot('02-city-nameplates');
  await resolveStage('sect-yard');
  const walls=await evalScene(`
    const check=l=>s.map.getObjectLayer(l).objects.filter(o=>['Tường sân viện','Tường biên sân viện'].includes(o.name)).length;
    return [check('SectCampusArt'),check('SectCampusCollision'),s.map.getObjectLayer('RampartArt').objects.length];
  `);
  assert.deepEqual(walls,[0,0,158]);
  await shot('03-open-campus');
  const controls=await evalScene(`
    const s1=s.society,p=s.livingWorldPanel,w=s.populationWorld;
    if(!s1.places.size)return {legacy:true};
    p.open('venues');
    const statuses={};
    for(const n of w.npcs){const activity=s1.primary(n);statuses[activity]=(statuses[activity]??0)+1;}
    return {statuses,buildings:p.body.textContent.includes('Nhã Nhạc Lâu')&&p.body.textContent.includes('Mỏ Linh Khoáng')};
  `);
  if(!controls.legacy){
    assert.ok(controls.buildings);
    assert.equal(Object.values(controls.statuses).reduce((a,b)=>a+b,0),108);
    await shot('06-venue-dashboard');
    const profile=await evalScene(`
      const n=s.populationWorld.npcs.find(n=>n.alive);
      s.livingWorldPanel.open('inspector',n.id);
      return s.livingWorldPanel.body.textContent.includes('Cần thư giãn')&&
        s.livingWorldPanel.body.textContent.includes('Hoạt động gần đây');
    `);
    assert.equal(profile,true);
    await shot('07-resident-profile');
  }
  await writeFile(join(output,'stage-1.json'),JSON.stringify({initial,npc,walls,controls,errors,failed},null,2));
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
