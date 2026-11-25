import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9318);
const output=resolve('art/previews/sky-step');
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
  const fixture=await evalScene(`
    const w=s.populationWorld,n=w.npcs.find(n=>n.populationRole==='low_disciple'&&n.alive),p=s.markers.find(m=>m.id==='city-center');
    const points=[];
    for(let y=p.y-300;y<p.y+300;y+=35)for(let x=p.x-310;x<p.x+400;x+=35)
      if(s.groundPositionOpen(n,x,y)&&!s.monsterWater(x,y,9,5))points.push({x,y});
    const from=points.find(a=>Math.hypot(p.x-a.x,p.y-a.y)<110);
    const manual=points.find(b=>Math.hypot(b.x-from.x,b.y-from.y)>290&&
      Math.hypot(b.x-from.x,b.y-from.y)<430&&s.canReachPoint(from,b)&&s.flyingSword.nav.line(from,b,0));
    const auto=s.markers.filter(m=>s.canReachPoint(from,m)&&s.flyingSword.nav.line(from,m,0)&&
      Math.hypot(m.x-from.x,m.y-from.y)>770&&Math.hypot(m.x-from.x,m.y-from.y)<1100&&s.groundPositionOpen(n,m.x,m.y))
      .map(({x,y})=>({x,y}))[0];
    if(!manual||!auto)throw Error('No safe Sky Step fixtures');
    Object.assign(n,from,{realmIndex:2,realmLevel:1,hp:280,mp:170,hunger:4,fatigue:3,safety:97,flight:undefined,
      goalAction:'idle',action:'idle',actionTarget:from,marketVisit:undefined,skyStepCooldown:0});
    w.heaven.divinePower=300;
    s.npcSprites.get(n.id).setPosition(from.x,from.y);
    s.resetNpcRoute(n);s.syncGroundOccupancy();s.selectNPC(n.id);s.beginPossession();
    s.cameraTween?.stop();s.cameraTween=null;s.setZoom(1.10);
    const stepAdvance=s.skyStep.advance.bind(s.skyStep);
    window.pulseStep=(delta)=>stepAdvance(w.npcs,delta);
    s.skyStep.advance=()=>{};
    return {id:n.id,from,manual,auto,mp:n.mp,possessed:s.possessedNpcId===n.id};
  `);
  assert.ok(fixture.possessed);
  const find='const n=s.populationWorld.npcs.find(n=>n.id==='+JSON.stringify(fixture.id)+');';
  const actor=code=>evalScene(find+code);
  const key=async(code,key,n)=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',code,key,windowsVirtualKeyCode:n,nativeVirtualKeyCode:n});
    await sleep(50);
    await send('Input.dispatchKeyEvent',{type:'keyUp',code,key,windowsVirtualKeyCode:n,nativeVirtualKeyCode:n});
  };
  await sleep(200);
  const gates=await evalScene('return s.passageTraffic.gates.map(g=>({id:g.id,lanes:g.lanes}));');
  assert.ok(gates.some(g=>g.id==='east-river-bridge'));
  const rejected=await actor(`
    const goal=${JSON.stringify(fixture.manual)};
    const reasons=[0,1].map(realmIndex=>s.skyStep.preview({...n,realmIndex},goal,{manual:true}).reason);
    const noMp=s.skyStep.preview({...n,mp:5},goal,{manual:true}).reason;
    return {reasons,noMp};
  `);
  assert.deepEqual(rejected,{reasons:['realm','realm'],noMp:'mp'});
  await key('KeyT','t',84);
  assert.equal(await actor('return s.skyAim===n;'),true);
  const pointer=await actor(`
    const top=s.cameras.main.getWorldPoint(0,0),r=s.game.canvas.getBoundingClientRect(),z=s.cameras.main.zoom;
    const p=${JSON.stringify(fixture.manual)};
    return {x:Math.round(r.left+(p.x-top.x)*z),y:Math.round(r.top+(p.y-top.y)*z)};
  `);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...pointer});
  await shot('01-aim');
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pointer});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pointer});
  const started=await actor('return {phase:n.skyStep?.phase,landing:n.skyStep?.landing,mp:n.mp,pads:s.skyStep.pads.size};');
  assert.equal(started.phase,'cast');
  assert.equal(started.mp,fixture.mp-34);
  assert.equal(started.pads,1);
  await key('KeyV','v',86);
  assert.equal(await actor('return Boolean(n.flight);'),false);

  const recording=process.argv.includes('--video');
  if(recording)await mkdir(join(output,'frames'),{recursive:true});
  await actor(`
    s.cameraFollowSuspended=true;
    s.cameras.main.centerOn((n.skyStep.from.x+n.skyStep.landing.x)/2,(n.skyStep.from.y+n.skyStep.landing.y)/2-45);
  `);
  for(let i=0;i<18;i++){
    await actor('window.pulseStep(50);');
    if(recording)await shot('frames/'+String(i).padStart(3,'0'));
    if(i===5)await shot('02-cast');
    if(i===10)await shot('03-disappear');
    if(i===17)await shot('04-travel');
  }
  const mid=await actor(`
    return {phase:n.skyStep?.phase,mp:n.mp,position:{x:n.x,y:n.y},body:s.groundOccupancy.bodies.has(n.id),
      saved:s.persistPopulation()};
  `);
  assert.deepEqual(mid,{phase:'travel',mp:started.mp,position:fixture.from,body:false,saved:true});
  // Continue recording the real arrival once. Reload restores the snapshot
  // saved on a separate isolated tab below after a second start.
  for(let i=18;i<33;i++){
    await actor('window.pulseStep(50);');
    if(recording)await shot('frames/'+String(i).padStart(3,'0'));
    if(i===22)await shot('05-arrival');
    if(i===28)await shot('06-recovery');
  }
  const done=await actor(`
    return {phase:n.skyStep?.phase??null,mp:n.mp,position:{x:n.x,y:n.y},cooldown:n.skyStepCooldown,
      overlap:s.groundOccupancy.overlaps().some(([a,b])=>a.id===n.id||b.id===n.id)};
  `);
  assert.equal(done.phase,null);assert.deepEqual(done.position,started.landing);
  assert.equal(done.mp,started.mp);assert.ok(done.cooldown>44000);assert.equal(done.overlap,false);
  const auto=await actor(`
    s.endPossession();
    Object.assign(n,${JSON.stringify(fixture.from)},{skyStepCooldown:0,mp:170,action:'travel',goalAction:'work',
      actionTarget:${JSON.stringify(fixture.auto)}});
    s.npcSprites.get(n.id).setPosition(n.x,n.y);s.resetNpcRoute(n);s.syncGroundOccupancy();
    s.scheduler.byId.get(n.id).thinkDue=Infinity;
    const e=s.scheduler.byId.get(n.id);e.lastMove=s.scheduler.time-50;e.waitingForSlot=false;
    s.worldMoveBudget=65;
    const began=s.moveAutonomousNpc(e);
    window.pulseStep(790);
    const saved=s.persistPopulation();
    return {began,saved,step:n.skyStep,mp:n.mp,target:n.actionTarget};
  `);
  assert.ok(auto.began&&auto.saved&&auto.step?.phase==='travel',JSON.stringify(auto));
  assert.equal(auto.step.manual,false);
  await send('Page.reload');
  await sleep(650);
  for(let i=0;i<80&&!await run(ready);i++)await sleep(85);
  const resumed=await actor(`
    s.cameraTween?.stop();s.cameraTween=null;s.cameras.main.centerOn(n.x,n.y);
    s.scheduler.byId.get(n.id).thinkDue=Infinity;
    return {n:{x:n.x,y:n.y},phase:n.skyStep?.phase??null,mp:n.mp,target:n.actionTarget};
  `);
  let after;
  for(let i=0;i<28;i++){
    await sleep(130);
    after=await actor(`
    return {x:n.x,y:n.y,mp:n.mp,active:Boolean(n.skyStep),phase:n.skyStep?.phase,
      elapsed:n.skyStep?.elapsed,target:n.actionTarget,cooldown:n.skyStepCooldown,
      canStand:s.groundPositionOpen(n,n.x,n.y),pads:s.skyStep.pads.has(n.id)};
    `);
    if(!after.active)break;
  }
  assert.equal(resumed.mp,auto.mp);
  assert.equal(after.mp,auto.mp);
  assert.equal(after.active,false,JSON.stringify({after,resumed,errors}));assert.equal(after.pads,false);assert.equal(after.canStand,true);
  assert.ok(Math.hypot(after.x-auto.step.landing.x,after.y-auto.step.landing.y)<32,JSON.stringify({after,auto,resumed}));
  assert.deepEqual(after.target,auto.target);
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(join(output,'skill.json'),JSON.stringify({fixture,gates,rejected,started,mid,done,auto,resumed,after,errors,failed},null,2));
  console.log(JSON.stringify({fixture,gates,done,after}));
}finally{ws?.close();chrome.kill();}
