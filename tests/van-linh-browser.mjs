import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const origin=process.env.GAME_TEST_ORIGIN ?? 'http://127.0.0.1:5183';
const port=Number(process.env.PERF_DEBUG_PORT??9369);
const output=resolve('art/previews/van-linh');
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

  const oldOrigin=process.env.V13_ORIGIN;
  let previous,seedScript;
  if(oldOrigin){
    await send('Page.navigate',{url:oldOrigin+'/?testMode=1'});
    for(let i=0;i<100&&!(await run(ready));i++)await sleep(125);
    assert.ok(await run(ready),'v0.1.13 booted');
    previous=await evalScene(`const w=s.populationWorld;w.clock.paused=true;s.persistPopulation();
      return {raw:localStorage.getItem('world-rebuild-1c-v1'), ids:w.environment.fauna.map(f=>f.id).sort(),
        npcs:w.npcs.map(n=>[n.id,n.x,n.y,n.inventory]), minute:w.clock.minute};`);
    await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin===${JSON.stringify(origin)})
      localStorage.setItem('world-rebuild-1c-v1',${JSON.stringify(previous.raw)});`}).then(r=>seedScript=r.identifier);
  }
  await visit('/?testMode=1&region=west-outer',ready);
  if(seedScript)await send('Page.removeScriptToEvaluateOnNewDocument',{identifier:seedScript});
  const census=await evalScene(`const w=s.populationWorld;w.clock.paused=true;const f=w.environment.fauna.filter(f=>f.alive);
    return {ids:f.map(f=>f.id).sort(), npcs:w.npcs.map(n=>[n.id,n.x,n.y,n.inventory]), minute:w.clock.minute,
      forest:f.filter(f=>f.x<0).map(f=>({id:f.id,zone:f.zoneId,species:f.species,rank:f.rank,growth:f.growth?.phase??null,realm:f.realmIndex})),
      count:f.length,canopies:s.canopySprites.length, nav:s.findNavigationPath('gate-west','west-forbidden')?.length,
      textures:[...s.faunaSprites.values()].map(a=>a.texture.key)};
  `);
  assert.equal(census.count,77);
  assert.equal(census.forest.length,45);
  assert.equal(new Set(census.forest.map(f=>f.species)).size,11);
  assert.ok(census.nav>0&&census.canopies>15);
  assert.ok(!census.textures.some(k=>k==='__MISSING'));
  if(previous){assert.ok(previous.ids.every(id=>census.ids.includes(id)));assert.deepEqual(census.npcs,previous.npcs);assert.equal(census.minute,previous.minute);}
  const speeds=await evalScene(`const w=s.populationWorld,ui=document.querySelector('#world-clock-speed');
    return ['0','1','2','4'].map(value=>{
      ui.value=value;ui.dispatchEvent(new Event('change'));const old=w.environment.faunaClockMs;
      s.updatePopulation(s.time.now,100);return w.environment.faunaClockMs-old;
    });
  `);
  assert.deepEqual(speeds,[0,100,200,400]);
  await evalScene(`const w=s.populationWorld;w.clock.paused=true;w.clock.minute=690;
    const f=w.environment.fauna.find(f=>f.species==='wood-king');s.cameraTween?.stop();s.cameras.main.setZoom(1.45).centerOn(f.x,f.y-30);s.clampCamera();return true;`);
  await sleep(540);await shot('wood-king-dormant');
  const boss=await evalScene(`const w=s.populationWorld, f=w.environment.fauna.find(f=>f.species==='wood-king');
    const actor=w.npcs.find(n=>n.equippedWeapon==='iron_dao')??w.npcs.find(n=>n.equippedWeapon==='iron_sword');
    const setup=window.__worldRebuild.prepareWeaponCombatTest(actor.id,f.id);
    const sprite=s.faunaSprites.get(f.id);return {setup,phase:f.growth.phase,texture:sprite.texture.key};`);
  assert.ok(boss.setup.ok,JSON.stringify(boss));
  assert.ok(['dormant','waking'].includes(boss.phase));
  const hit=await evalScene(`const w=s.populationWorld,f=w.environment.fauna.find(f=>f.species==='wood-king'),h=w.npcs.find(n=>n.id===s.possessedNpcId);
    w.clock.speed=1;const start=f.hp;const hit=s.performPossessedAttack(f.id);
    s.syncGroundOccupancy();s.tickFauna(550);
    return {hit:hit.ok,before:start,after:f.hp,growth:f.growth.phase,entity:s.faunaSprites.has(f.id),ground:s.groundOccupancy.bodies.has(f.id),observer:h.id};`);
  assert.ok(hit.hit&&hit.after<hit.before&&hit.growth==='waking'&&hit.entity&&hit.ground);
  await sleep(400);await shot('wood-king-awakening');
  const active=await evalScene(`const f=s.populationWorld.environment.fauna.find(f=>f.species==='wood-king');s.tickFauna(2100);
    return {phase:f.growth.phase,state:f.state,position:f.x===f.home.x&&f.y===f.home.y};`);
  assert.equal(active.phase,'active');assert.ok(active.position);
  await sleep(360);await shot('wood-king-awake');
  const kill=await evalScene(`const w=s.populationWorld,f=w.environment.fauna.find(f=>f.species==='wood-king'),n=w.npcs.find(n=>n.id===s.possessedNpcId);
    f.hp=1;window.__worldRebuild.resetWeaponCooldownForTest();const result=s.performPossessedAttack(f.id);
    return {killed:result.ok&&!f.alive,loot:w.environment.drops.filter(d=>d.sourceId===f.id).map(d=>d.itemId),id:f.id,npcId:n.id,
      position:{x:n.x,y:n.y},tree:{x:f.x,y:f.y}};
  `);
  assert.ok(kill.killed);assert.deepEqual(kill.loot,['ancient_wood_marrow','beast_core_nascent']);
  await evalScene(`const w=s.populationWorld,n=w.npcs.find(n=>n.id===s.possessedNpcId),p=${JSON.stringify(kill.tree)};
    const point=[[-27,0],[27,0],[0,-27],[0,27]].map(([dx,dy])=>({x:p.x+dx,y:p.y+dy})).find(q=>s.canOccupy(q.x,q.y));
    Object.assign(n,point);s.npcSprites.get(n.id).setPosition(n.x,n.y);return true;`);
  const tapE=async()=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'e',code:'KeyE',windowsVirtualKeyCode:69});
    await sleep(140);
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'e',code:'KeyE',windowsVirtualKeyCode:69});
  };
  await tapE();await tapE();await tapE();
  const loot=await evalScene(`const w=s.populationWorld,n=w.npcs.find(n=>n.id===s.possessedNpcId);
    const out={items:n.inventory.filter(i=>['ancient_wood_marrow','beast_core_nascent'].includes(i.itemId)),
      drops:w.environment.drops.filter(d=>d.sourceId===${JSON.stringify(kill.id)}).map(d=>d.status),
      pending:w.environment.faunaRespawns.filter(r=>r.sourceDeathId===${JSON.stringify(kill.id)}).length};
    s.persistPopulation();return out;`);
  assert.equal(loot.pending,1);
  assert.deepEqual(loot.drops,['claimed','claimed']);
  assert.ok(loot.items.length===2&&loot.items.every(i=>i.count===1));
  await shot('loot-in-bag');
  await visit('/?region=west-forbidden',ready);
  const saved=await evalScene(`const w=s.populationWorld;return {version:w.environment.westernEcologyVersion,
    loot:w.environment.drops.filter(d=>d.sourceId===${JSON.stringify(kill.id)}).map(d=>d.status),
    pending:w.environment.faunaRespawns.some(q=>q.sourceDeathId===${JSON.stringify(kill.id)}),
    active:w.environment.fauna.filter(f=>f.alive).length};`);
  assert.deepEqual(saved,{version:1,loot:['claimed','claimed'],pending:true,active:76});
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const result={migration:Boolean(previous),census:census.forest,counts:{fauna:census.count,canopies:census.canopies,route:census.nav},
    speeds,boss:{dormant:boss.phase,waking:hit.growth,active:active.phase,hp:[hit.before,hit.after]},loot,saved};
  await writeFile(join(output,'world-test.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
}finally{ws?.close();chrome.kill()}
