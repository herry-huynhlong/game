import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9274);
const output=resolve('art/previews/flying-sword');
const profile=await mkdtemp(join(tmpdir(),'tvk-flying-sword-'));
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
  async function ready(){
    for(let i=0;i<100;i++){if(await run('Boolean(window.__worldRebuild?.ready())'))return;await sleep(125)}
    throw Error('WorldScene not ready: '+JSON.stringify(errors));
  }
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
  await visit('/?flightTest=1&testMode=1','Boolean(window.__worldRebuild?.ready())');
  const initial=await evalScene("return {population:s.populationWorld.npcs.length,flight:s.getFlightState(),zones:s.flyingSword.nav.zones}");
  assert.equal(initial.population,108);
  assert.ok(initial.flight.eligible>=2&&initial.flight.eligible<108);
  assert.equal(initial.zones.length,2);
  await run("document.querySelector('#flight-pair').click()");
  const start=await evalScene("s.setZoom(1.25);const state=s.getFlightState();return {...state,active:state.active.filter(x=>s.flightArena.targets.has(x.id))}");
  assert.ok(start.active.length>=2,JSON.stringify({initial,start}));
  const ids=start.active.map(a=>a.id),first=ids[0];
  await shot('01-summon');
  await sleep(900);
  await shot('02-takeoff');
  await sleep(1400);
  await shot('03-forest');
  const mid=await evalScene(`
    return {active:s.getFlightState().active,visible:s.flightVisuals.visible,renders:s.flightVisuals.entries.size,
      separation:s.getFlightState().active.every((a,i,list)=>list.slice(i+1).every(b=>Math.abs(a.flight.altitude-b.flight.altitude)>=28||Math.hypot(a.x-b.x,a.y-b.y)>=35.9)),
      airborne:s.populationWorld.npcs.filter(n=>n.flight?.altitude>25&&!s.groundOccupancy.bodies.has(n.id)).length};
  `);
  assert.ok(mid.separation&&mid.airborne>=2,JSON.stringify(mid));
  await shot('04-formation');
  const before=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(first)});
    s.persistPopulation();return {alt:n.flight.altitude,source:n.flight.sword,goal:n.flight.goal,
      gear:n.inventory,progress:n.flight.total,x:n.x,y:n.y};
  `);
  await send('Page.reload',{ignoreCache:true});await ready();
  const saved=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(first)});
    return {alt:n.flight?.altitude,source:n.flight?.sword,goal:n.flight?.goal,gear:n.inventory,progress:n.flight?.total,
      normalSave:localStorage.getItem('world-rebuild-1c-v1')};
  `);
  assert.deepEqual(saved.goal,before.goal);
  assert.deepEqual(saved.gear,before.gear);
  assert.equal(saved.source,before.source);
  assert.ok(saved.alt>25&&saved.progress>=before.progress);
  assert.equal(saved.normalSave,null);
  const landing=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(first)});
    s.flightArena.follow=n.id;s.setZoom(1.05);
    for(let i=0;i<680&&n.flight&&n.flight.phase!=='Landing';i++){
      s.syncGroundOccupancy();s.flyingSword.advance(s.populationWorld.npcs,40,()=>null);
    }
    return {phase:n.flight?.phase,goal:n.flight?.goal,pos:{x:n.x,y:n.y},ground:s.groundPositionOpen(n,n.x,n.y)};
  `);
  assert.equal(landing.phase,'Landing',JSON.stringify(landing));
  assert.equal(landing.ground,true);
  await sleep(100);await shot('05-landing-sect');
  const landed=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(first)});
    for(let i=0;i<70&&n.flight;i++){
      s.syncGroundOccupancy();s.flyingSword.advance(s.populationWorld.npcs,40,()=>null);
    }
    const floor=s.groundOccupancy.bodies.has(n.id);
    return {ground:!n.flight&&floor,goal:n.goalAction,mp:n.mp,dist:Math.hypot(n.x-n.actionTarget.x,n.y-n.actionTarget.y)};
  `);
  assert.ok(landed.ground&&landed.goal==='cultivate'&&landed.dist<120,JSON.stringify(landed));
  const work=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(first)}),clock=s.populationWorld.clock;
    const before=n.xp;
    s.populationSimulation.tickNpc(n,2,clock.day,clock.minute,2);
    return {action:n.action,xp:n.xp-before,progress:n.actionProgress};
  `);
  assert.ok(work.action==='cultivate'&&work.xp>0,JSON.stringify(work));
  await sleep(270);await shot('06-ground-work');
  const manual=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(first)}),w=s.populationWorld;
    n.flightCooldown=0; w.heaven.divinePower=10000;s.selectedNpcId=n.id;s.beginPossession();
    s.syncGroundOccupancy();
    return {id:n.id,possessed:s.possessedNpcId,started:s.toggleSwordFlight(n),x:n.x,y:n.y};
  `);
  assert.equal(manual.possessed,manual.id);
  assert.equal(manual.started,true,JSON.stringify(manual));
  const keys=async key=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:'Key'+key.toUpperCase(),windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});
    await sleep(330);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:'Key'+key.toUpperCase(),windowsVirtualKeyCode:key.toUpperCase().charCodeAt(0)});
  };
  await sleep(1550);
  const directions=[];
  for(const key of ['d','w','a','s']){
    await keys(key);
    directions.push(await evalScene("return s.flyingSword.active.get(s.possessedNpcId)?.flight.heading"));
  }
  assert.deepEqual(directions,['right','up','left','down']);
  const attack=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===s.possessedNpcId);
    const target=s.populationWorld.npcs.find(n=>n.alive&&!n.flight&&n.id!==s.possessedNpcId);
    const denied=s.reportCombat(target.id,n.id,4);
    const strike=s.performPossessedAttack(target.id);
    const actor=s.npcAppearanceFleet?.entries.get(n.id)?.renderer;
    return {denied:denied.reason,strike:strike.reason,hand:actor?.layers.weapon.visible,alt:n.flight.altitude};
  `);
  assert.deepEqual([attack.denied,attack.strike,attack.hand],['flight','land-before-combat',false]);
  await evalScene('s.endPossession();');
  const released=await evalScene(`
    const n=s.populationWorld.npcs.find(n=>n.id===${JSON.stringify(first)});
    for(let i=0;i<400&&n.flight;i++){
      s.syncGroundOccupancy();s.flyingSword.advance(s.populationWorld.npcs,40,()=>null);
    }
    return {ground:!n.flight,possessed:s.possessedNpcId};
  `);
  assert.deepEqual(released,{ground:true,possessed:null});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  await writeFile(join(output,'verification.json'),JSON.stringify({initial,start,mid,before,saved,landing,landed,work,manual,directions,attack,released,errors,failed},null,2));
  console.log(JSON.stringify({initial,launches:start.active.length,directions,attack,landing,landed,work,released}));
}finally{ws?.close();chrome.kill();}
