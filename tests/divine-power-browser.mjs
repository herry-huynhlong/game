import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9475);
const output=resolve('art/previews/sinh-diet-luan-hoi');
const profile=await mkdtemp(join(tmpdir(),'tvk-divine-profile-'));
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
    return new Promise((ok,fail)=>{
      const request=++id, timer=setTimeout(()=>{pending.delete(request);fail(Error('Chrome timeout '+method));},60000);
      pending.set(request,{ok:value=>{clearTimeout(timer);ok(value);},fail:error=>{clearTimeout(timer);fail(error);}});
      ws.send(JSON.stringify({id:request,method,params}));
    });
  }
  async function run(expression) {
    const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);
    return r.result.value;
  }
  const scene="const s=window.__worldRebuildGame.scene.getScene('world-rebuild-1b');";
  const evalScene=code=>run(`(()=>{${scene}${code}})()`);
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    (()=>{const uuid=crypto.randomUUID?.bind(crypto);
    if(uuid){let first=true;crypto.randomUUID=()=>{if(first){first=false;return '2d36bc60-3269-4fe4-877b-0cea1df03455'}return uuid()}}})();
  `});
  const visit=async(path,expression)=>{
    await send('Page.navigate',{url:origin+path});
    for(let i=0;i<240;i++){if(await run(expression))return;await sleep(125);}
    throw Error('Failed to load '+path+' '+JSON.stringify({errors,failed}));
  };
  const shot=async name=>{
    const image=await send('Page.captureScreenshot',{format:'png'});
    await writeFile(join(output,name+'.png'),Buffer.from(image.data,'base64'));
  };
  const ready="Boolean(window.__worldRebuild?.ready())";
  await visit('/?testMode=1',ready);
  const gains=await evalScene(`
    const w=s.populationWorld;
    w.clock.paused=true;
    const initial=w.heaven.divinePower, base=w.heaven.divineLedger.earned;
    s.navigateCameraTo(5750,3600,'test',true,.95);
    const tested=[];
    for(const [index,realmLevel,xp] of [[0,3,150],[1,2,1045],[2,2,1360]]){
      const npc=w.npcs[tested.length];
      Object.assign(npc,{realmIndex:index,realmLevel,xp,actionCooldown:0,inventory:[{itemId:'qi_pill',count:1}]});
      const before=w.heaven.divinePower;
      s.populationSimulation.breakthroughIfReady(npc,w.clock.day,w.clock.minute);
      tested.push(w.heaven.divinePower-before);
    }
    const attacker=w.npcs[0],victim=w.npcs[1];
    Object.assign(victim,{realmIndex:1,realmLevel:5,hp:1});
    const beforeDeath=w.heaven.divinePower;
    const fatal=s.reportCombat(attacker.id,victim.id,500,{authorizedDuel:true});
    const duplicate=s.reportCombat(attacker.id,victim.id,500,{authorizedDuel:true});
    const npcGain=w.heaven.divinePower-beforeDeath;
    const fauna=w.environment.fauna.find(f=>f.alive&&!s.inSceneryView(f,0)&&f.species==='wolf');
    if(!fauna)throw Error('No off-camera wolf');
    Object.assign(fauna,{realmIndex:1,realmLevel:5,hp:1});
    const offscreen=!s.inSceneryView(fauna,0),beforeFauna=w.heaven.divinePower;
    s.applyFaunaDamage(fauna,attacker,500,'browser-fauna-death');
    s.applyFaunaDamage(fauna,attacker,500,'browser-fauna-duplicate');
    const result={tested,npcGain,faunaGain:w.heaven.divinePower-beforeFauna,offscreen,
      fatal:Boolean(fatal.eventId),duplicate:duplicate.ok,earned:w.heaven.divineLedger.earned-base};
    if(!s.persistPopulation())throw Error('Cannot persist gains');
    return {...result,initial,balance:w.heaven.divinePower};
  `);
  assert.deepEqual(gains.tested,[1,2,3]);
  assert.equal(gains.npcGain,20);
  assert.equal(gains.faunaGain,20);
  assert.equal(gains.offscreen,true);
  assert.equal(gains.fatal,true);
  assert.equal(gains.duplicate,false);
  assert.equal(gains.earned,46);
  assert.equal(gains.balance,gains.initial+46);
  await evalScene(`
    const wallet=document.getElementById('heaven-wallet');
    wallet.click();
    if(wallet.getAttribute('aria-expanded')!=='true')throw Error('Journal did not open');
  `);
  await sleep(800);
  assert.equal(await run("document.querySelectorAll('#divine-power-journal li').length"),5);
  assert.match(await run("document.getElementById('divine-power-notice').textContent"),/\+46/);
  await shot('01-nhat-ky-than-luc');
  const located=await evalScene(`
    document.querySelector('#divine-power-journal li button').click();
    return {hidden:document.getElementById('divine-power-journal').hidden,moving:Boolean(s.cameraTween)};
  `);
  assert.deepEqual(located,{hidden:true,moving:true});
  await sleep(500);
  await shot('02-dinh-vi-su-kien');

  const underground=await evalScene(`
    const world=s.populationWorld,u=s.underground;
    const site=[...u.sites.values()].find(site=>site.map.floors.some(floor=>floor.lair));
    const state=u.instance(site), floor=site.map.floors.findIndex(floor=>floor.lair), beast=state.beasts[floor];
    const npc=world.npcs[0],balance=world.heaven.divinePower;
    npc.underground={siteId:site.id,floor,x:beast.x,y:beast.y};
    Object.assign(beast,{phase:'ACTIVE',hp:1});
    u.hit(state,beast,npc,floor);
    u.hit(state,beast,npc,floor);
    delete npc.underground;
    const gain=world.heaven.divinePower-balance, last=world.heaven.divineLedger.recent.at(-1);
    s.persistPopulation();
    document.getElementById('heaven-wallet').click();
    document.querySelector('#divine-power-journal li button').click();
    return {gain,source:last.siteId,site:site.id,floor,located:u.view.id===site.id&&u.view.level===floor,power:world.heaven.divinePower};
  `);
  assert.ok(underground.gain>0);
  assert.equal(underground.source,underground.site);
  assert.equal(underground.located,true);
  await shot('03-dinh-vi-duoi-long-dat');

  await visit('/?testMode=1',ready);
  const reloaded=await evalScene(`
    const w=s.populationWorld,before=w.heaven.divinePower,history=w.heaven.divineLedger.recent.length;
    s.gotoRegion('east');
    s.cameras.main.centerOn(10000,3500);
    s.refreshHud();
    return {before,after:w.heaven.divinePower,history,credited:Object.keys(w.heaven.divineLedger.credited).length};
  `);
  assert.equal(reloaded.before,underground.power);
  assert.equal(reloaded.after,reloaded.before);
  assert.equal(reloaded.history,6);
  assert.equal(reloaded.credited,6);

  const clock=await evalScene(`
    const w=s.populationWorld, select=document.getElementById('world-clock-speed');
    const speed=value=>{select.value=String(value);select.dispatchEvent(new Event('change'));};
    const values=[];
    for(const rate of [0,1,2,4]){
      speed(rate);
      w.clock.minute=610;
      s.populationTick=0;
      const before=w.heaven.divinePower;
      for(let tick=0;tick<4;tick++)s.updatePopulation(s.time.now,250);
      values.push({rate,minutes:w.clock.minute-610,pauseGain:rate===0?w.heaven.divinePower-before:null});
    }
    speed(0);
    return values;
  `);
  assert.deepEqual(clock.map(row=>row.minutes),[0,1,2,4]);
  assert.equal(clock[0].pauseGain,0);

  const disguise=await evalScene(`
    const w=s.populationWorld, beast=w.environment.fauna.find(f=>f.alive&&f.species==='flower');
    if(!beast)throw Error('No living flower for camouflage test');
    const time=w.environment.faunaClockMs, balance=w.heaven.divinePower, events=w.heaven.divineLedger.recent.length;
    Object.assign(beast,{targetNpcId:undefined,flower:{phase:'mobile',at:time-1200}});
    s.monsterCombat.flowerStage(beast,undefined,time);
    return {alive:beast.alive,phase:beast.flower.phase,delta:w.heaven.divinePower-balance,entries:w.heaven.divineLedger.recent.length-events};
  `);
  assert.deepEqual(disguise,{alive:true,phase:'rooted',delta:0,entries:0});
  assert.deepEqual(errors,[]);
  assert.deepEqual(failed,[]);
  const result={gains,underground,reloaded,clock,disguise,errors,failed};
  await writeFile(join(output,'browser-report.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
} finally {
  ws?.close();
  chrome.kill();
}
