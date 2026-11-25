import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9358);
const output=resolve('art/previews/old-road');
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
  await visit('/?testMode=1&characterRig=1',ready);
  const results=await evalScene(`
    s.sys.pause();
    const w=s.populationWorld,rig=s.characterRigPreview,n=rig.npc;
    const set=(x,y)=>{
      s.flyingSword.end?.(n);rig.reset();
      Object.assign(n,{x,y,realmIndex:2,realmLevel:1,hp:200,mp:185,fatigue:5,safety:90,flightCooldown:0,skyStepCooldown:0,
        goalAction:'idle',action:'idle',flight:undefined,skyStep:undefined,wallLevel:0,manualMeditation:false});
      n.inventory=[{itemId:'iron_sword',count:1}];n.equippedWeapon='iron_sword';
      s.npcSprites.get(n.id).setPosition(x,y).setVisible(true);
      w.heaven.divinePower=100;s.syncGroundOccupancy();
    };
    set(3447,3930);
    if(s.possessedNpcId!==n.id){s.selectNPC(n.id);s.beginPossession();}
    for(let i=0;i<10;i++)rig.sync(50,null,false);
    const summon=rig.toggleMount(),mount=rig.toggleMount();
    for(let i=0;i<30;i++)rig.sync(50,null,false);
    s.syncGroundOccupancy();
    const y=n.y,attached=rig.mount.attached;
    s.keys.S.isDown=true;
    for(let i=0;i<65;i++)s.updatePossessedPlayer(24);
    s.keys.S.isDown=false;
    const mounted={summon,mount,attached,distance:n.y-y};
    const from={x:3440,y:3942},to={x:3552,y:4880};
    set(from.x,from.y);
    const deniedSky=s.skyStep.preview({...n,realmIndex:1},to,{manual:true}).reason;
    const start=s.skyStep.start(n,to,{manual:true});
    for(let i=0;i<70;i++)s.skyStep.advance([n],40);
    const cloud={start,deniedSky,arrived:Math.hypot(n.x-to.x,n.y-to.y),landed:!n.skyStep,stand:s.groundPositionOpen(n,n.x,n.y)};
    set(3552,4610);
    n.realmIndex=0;
    const deniedSword=s.toggleSwordFlight(n,rig);
    n.realmIndex=1;
    const didFly=s.toggleSwordFlight(n,rig),before=n.y;
    if(didFly){
      for(let i=0;i<100;i++)s.flyingSword.advance([n],50,()=>({x:0,y:1}));
      s.flyingSword.land(n);
      for(let i=0;i<150;i++)s.flyingSword.advance([n],50,()=>({x:0,y:0}));
    }
    const sword={deniedSword,didFly,before,y:n.y,landed:!n.flight,stand:s.groundPositionOpen(n,n.x,n.y)};
    return {mounted,cloud,sword};
  `);
  await writeFile(join(output,'travel.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results));
  assert.ok(results.mounted.summon&&results.mounted.mount&&results.mounted.attached&&results.mounted.distance>150);
  assert.ok(results.cloud.start.ok&&results.cloud.landed&&results.cloud.stand&&results.cloud.arrived<100);
  assert.equal(results.cloud.deniedSky,'realm');
  assert.ok(!results.sword.deniedSword&&results.sword.didFly&&results.sword.y>results.sword.before+200&&results.sword.landed&&results.sword.stand);
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
}finally{
  ws?.close();
  chrome.kill();
}
